import { reactive } from 'vue';
import * as workerTimers from 'worker-timers';

import configRepository from './config';

const API_BASE = 'https://discord.com/api/v10';
const CLIENT_ID = '838237077602566166';
const GATEWAY_URL = 'wss://gateway.discord.gg/?v=10&encoding=json';
const SCOPES = 'openid sdk.social_layer_presence';
const TOKEN_CONFIG_KEY = 'discordRemoteToken';
const RECONNECT_DELAY = 15000;
const IMAGE_RETRY_DELAY = 60000;
const VRCX_URL = 'https://hello.vrchat.com';

const encoder = new TextEncoder();

function limitByteLength(value, maxBytes) {
    if (!value) {
        return undefined;
    }
    const { read } = encoder.encodeInto(value, new Uint8Array(maxBytes));
    return value.slice(0, read);
}

async function postForm(path, params) {
    const response = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: CLIENT_ID, ...params })
    });
    const json = await response.json().catch(() => ({}));
    return { ok: response.ok, json };
}

function toToken(json, userName = '') {
    return {
        accessToken: json.access_token,
        refreshToken: json.refresh_token,
        expiresAt: Date.now() + json.expires_in * 1000,
        userName
    };
}

function toError(json) {
    return new Error(json.error_description || json.error || json.message || 'Discord OAuth2 request failed');
}

async function pollDeviceToken(device, isCancelled) {
    let interval = (device.interval || 5) * 1000;
    const deadline = Date.now() + device.expires_in * 1000;
    while (Date.now() < deadline) {
        await new Promise((resolve) => workerTimers.setTimeout(resolve, interval));
        if (isCancelled()) {
            return null;
        }
        const { ok, json } = await postForm('/oauth2/token', {
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
            device_code: device.device_code
        });
        if (ok) {
            return toToken(json);
        }
        if (json.error === 'slow_down') {
            interval += 5000;
        } else if (json.error !== 'authorization_pending') {
            throw toError(json);
        }
    }
    throw new Error('Device code expired');
}

class DiscordRemotePresence {
    state = reactive({ linked: false, userName: '', userCode: '' });
    token = null;
    linkId = 0;
    active = false;
    generation = 0;
    accessToken = '';
    forceRefresh = false;
    socket = null;
    sequence = null;
    heartbeatTimer = null;
    reconnectTimer = null;
    ready = false;
    activity = null;
    sentPayload = '';
    imageCache = new Map();
    assetLists = new Map();

    async init() {
        this.saveToken(await configRepository.getObject(TOKEN_CONFIG_KEY, null), false);
    }

    saveToken(token, persist = true) {
        this.token = token;
        this.state.linked = Boolean(token);
        this.state.userName = token?.userName || '';
        if (!persist) {
            return;
        }
        if (token) {
            configRepository.setObject(TOKEN_CONFIG_KEY, token);
        } else {
            configRepository.remove(TOKEN_CONFIG_KEY);
        }
    }

    /**
     * @param {(url: string) => void} openUrl
     * @returns {Promise<boolean>}
     */
    async link(openUrl) {
        const linkId = ++this.linkId;
        try {
            const { ok, json: device } = await postForm('/oauth2/device/authorize', { scope: SCOPES });
            if (!ok) {
                throw toError(device);
            }
            this.state.userCode = device.user_code;
            openUrl(device.verification_uri_complete || device.verification_uri);
            const token = await pollDeviceToken(device, () => linkId !== this.linkId);
            if (!token) {
                return false;
            }
            this.saveToken(token);
            return true;
        } finally {
            if (linkId === this.linkId) {
                this.state.userCode = '';
            }
        }
    }

    unlink() {
        this.linkId++;
        this.state.userCode = '';
        this.SetActive(false);
        this.saveToken(null);
    }

    async getAccessToken(force) {
        if (force || this.token.expiresAt - Date.now() < 60000) {
            const { ok, json } = await postForm('/oauth2/token', {
                grant_type: 'refresh_token',
                refresh_token: this.token.refreshToken
            });
            if (!ok) {
                throw toError(json);
            }
            this.saveToken(toToken(json, this.token.userName));
        }
        return this.token.accessToken;
    }

    /**
     * @param {boolean} active
     * @returns {boolean}
     */
    SetActive(active) {
        const next = active && this.state.linked;
        if (next === this.active) {
            return next;
        }
        this.active = next;
        this.generation++;
        if (next) {
            this.connect();
        } else {
            this.activity = null;
            if (this.reconnectTimer !== null) {
                workerTimers.clearTimeout(this.reconnectTimer);
                this.reconnectTimer = null;
            }
            this.closeSocket();
        }
        return next;
    }

    SetAssets(
        details,
        state,
        detailsUrl,
        largeKey,
        largeText,
        smallKey,
        smallText,
        start,
        end,
        partyId,
        partySize,
        partyMax,
        buttonText,
        buttonUrl,
        appId,
        activityType,
        statusDisplayType
    ) {
        this.activity = {
            details,
            state,
            detailsUrl,
            largeKey,
            largeText,
            smallKey,
            smallText,
            start,
            end,
            partyId,
            buttonText,
            buttonUrl,
            appId,
            activityType,
            statusDisplayType
        };
        this.flush();
    }

    closeSocket() {
        if (this.heartbeatTimer !== null) {
            workerTimers.clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
        this.ready = false;
        this.sentPayload = '';
        this.sequence = null;
        if (this.socket) {
            this.socket.onclose = null;
            this.socket.onmessage = null;
            this.socket.close();
            this.socket = null;
        }
    }

    scheduleReconnect(generation) {
        if (generation !== this.generation) {
            return;
        }
        this.reconnectTimer = workerTimers.setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
        }, RECONNECT_DELAY);
    }

    async connect() {
        const generation = this.generation;
        try {
            this.accessToken = await this.getAccessToken(this.forceRefresh);
            this.forceRefresh = false;
        } catch (err) {
            console.error('Discord remote presence auth failed', err);
            this.scheduleReconnect(generation);
            return;
        }
        if (generation !== this.generation) {
            return;
        }
        const socket = new WebSocket(GATEWAY_URL);
        this.socket = socket;
        socket.onmessage = (event) => this.handleMessage(JSON.parse(event.data));
        socket.onclose = (event) => {
            console.warn('Discord remote presence closed', event.code, event.reason);
            this.socket = null;
            this.closeSocket();
            if (event.code === 4004) {
                this.forceRefresh = true;
            }
            this.scheduleReconnect(generation);
        };
    }

    send(payload) {
        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(payload));
        }
    }

    heartbeat() {
        this.send({ op: 1, d: this.sequence });
    }

    handleMessage(message) {
        if (typeof message.s === 'number') {
            this.sequence = message.s;
        }
        switch (message.op) {
            case 10:
                if (this.heartbeatTimer !== null) {
                    workerTimers.clearInterval(this.heartbeatTimer);
                }
                this.heartbeatTimer = workerTimers.setInterval(() => this.heartbeat(), message.d.heartbeat_interval);
                this.send({
                    op: 2,
                    d: {
                        token: `Bearer ${this.accessToken}`,
                        intents: 0,
                        properties: { os: 'VRCX', browser: 'VRCX', device: 'VRCX' }
                    }
                });
                break;
            case 1:
                this.heartbeat();
                break;
            case 7:
            case 9:
                this.socket?.close(4000);
                break;
            case 0:
                if (message.t === 'READY') {
                    this.handleReady(message.d?.user);
                }
                break;
        }
    }

    handleReady(user) {
        console.log('Discord remote presence ready', user?.username);
        this.ready = true;
        const userName = user?.global_name || user?.username;
        if (userName && this.token && userName !== this.token.userName) {
            this.saveToken({ ...this.token, userName });
        }
        this.flush();
    }

    async flush() {
        if (!this.ready) {
            return;
        }
        const presence = await this.buildPresence(this.activity);
        const json = JSON.stringify(presence);
        if (!this.ready || json === this.sentPayload) {
            return;
        }
        this.sentPayload = json;
        console.log('Discord remote presence update', presence);
        this.send({ op: 3, d: presence });
    }

    async buildPresence(source) {
        const presence = { since: null, activities: [], status: 'online', afk: false };
        if (!source) {
            return presence;
        }
        const activity = {
            name: 'VRChat',
            type: source.activityType,
            status_display_type: source.statusDisplayType,
            details: limitByteLength(source.details, 127),
            details_url: source.detailsUrl || undefined,
            state: limitByteLength(source.state, 127)
        };
        presence.activities.push(activity);
        if (!source.largeKey && !source.smallKey) {
            return presence;
        }
        const [largeImage, smallImage] = await Promise.all([
            this.resolveImage(source.largeKey, source.appId),
            this.resolveImage(source.smallKey, source.appId)
        ]);
        activity.assets = {
            large_image: largeImage,
            large_text: source.largeText || undefined,
            large_url: VRCX_URL,
            small_image: smallImage,
            small_text: source.smallText || undefined
        };
        if (source.start) {
            activity.timestamps = {
                start: Math.floor(source.start),
                end: source.end ? Math.floor(source.end) : undefined
            };
        }
        if (source.partyId) {
            activity.party = { id: source.partyId };
        }
        if (source.buttonUrl) {
            activity.buttons = [source.buttonText];
            activity.metadata = { button_urls: [source.buttonUrl] };
        }
        return presence;
    }

    resolveImage(image, appId) {
        if (!image) {
            return undefined;
        }
        const key = `${appId}:${image}`;
        let resolved = this.imageCache.get(key);
        if (!resolved) {
            resolved = this.fetchImage(image, appId);
            this.imageCache.set(key, resolved);
            resolved.then((value) => {
                if (!value) {
                    workerTimers.setTimeout(() => this.imageCache.delete(key), IMAGE_RETRY_DELAY);
                }
            });
        }
        return resolved;
    }

    async fetchImage(image, appId) {
        try {
            const url = /^https?:\/\//.test(image) ? image : await this.getAppAssetUrl(image, appId);
            if (!url) {
                return undefined;
            }
            const response = await fetch(`${API_BASE}/applications/${CLIENT_ID}/external-assets`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ urls: [url] })
            });
            if (!response.ok) {
                throw new Error(`${response.status} ${await response.text()}`);
            }
            const [asset] = await response.json();
            return asset?.external_asset_path ? `mp:${asset.external_asset_path}` : undefined;
        } catch (err) {
            console.warn('Discord external asset failed', err);
            return undefined;
        }
    }

    async getAppAssetUrl(key, appId) {
        let assets = this.assetLists.get(appId);
        if (!assets) {
            assets = fetch(`${API_BASE}/oauth2/applications/${appId}/assets`).then((response) =>
                response.ok ? response.json() : Promise.reject(new Error(`${response.status}`))
            );
            this.assetLists.set(appId, assets);
            assets.catch(() => this.assetLists.delete(appId));
        }
        const asset = (await assets).find((item) => item.name === key);
        return asset ? `https://cdn.discordapp.com/app-assets/${appId}/${asset.id}.png` : undefined;
    }
}

export const discordRemotePresence = new DiscordRemotePresence();
