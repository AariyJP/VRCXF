import webApiService from '../services/webapi';
import { userRequest } from '../api';
import { useFriendStore } from '../stores/friend';
import { applyUser } from './userCoordinator';

import configRepository from '../services/config';

const LOCATE_ME_URLS_KEY = 'VRCX_locateMeUrls';
const MIN_FETCH_INTERVAL = 60 * 1000;
const LOCATE_ME_ORIGIN = 'https://locate-me.tapioka-systems.org';
const LOCATE_ME_PROXY_PREFIX = '/locate-me-api/1';

const locateMeUrls = new Map();
const inFlight = new Set();
const lastFetchAt = new Map();

/**
 * 共有 URL を正規化する。
 * LocateMe の origin と /s/{shareKey} 形式のみ受け付け、クエリとハッシュは落とす。
 * 形式が不正なら空文字を返す。
 * @param {string} url
 * @returns {string}
 */
function normalizeLocateMeUrl(url) {
    const trimmed = String(url || '')
        .replace(/[\r\n]/g, '')
        .trim();
    if (!trimmed) {
        return '';
    }
    let parsed;
    try {
        parsed = new URL(trimmed);
    } catch {
        return '';
    }
    if (parsed.origin !== LOCATE_ME_ORIGIN) {
        return '';
    }
    const shareKey = /^\/s\/([^/]+)\/*$/.exec(parsed.pathname)?.[1];
    return shareKey ? `${LOCATE_ME_ORIGIN}/s/${shareKey}` : '';
}

/**
 * 指定ユーザーに登録された URL を返す。
 * @param {string} userId
 * @returns {string}
 */
function getLocateMeUrl(userId) {
    return locateMeUrls.get(userId) || '';
}

/**
 * 登録済み URL を config へ保存する。
 * @returns {Promise<void>}
 */
async function persistLocateMeUrls() {
    await configRepository.setObject(LOCATE_ME_URLS_KEY, Object.fromEntries(locateMeUrls));
}

/**
 * config から URL を読み込む。
 * @returns {Promise<void>}
 */
async function loadLocateMeUrls() {
    locateMeUrls.clear();
    inFlight.clear();
    lastFetchAt.clear();
    try {
        const stored = await configRepository.getObject(LOCATE_ME_URLS_KEY, {});
        for (const userId in stored) {
            const url = normalizeLocateMeUrl(stored[userId]);
            if (url) {
                locateMeUrls.set(userId, url);
            }
        }
    } catch (err) {
        console.error('[LocateMe] failed to load urls:', err);
    }
}

/**
 * URL を保存する。空文字なら登録を解除する。
 * 形式が不正な場合は何も変更せず null を返す。
 * @param {string} userId
 * @param {string} url
 * @returns {Promise<string | null>} 保存した URL、解除時は空文字、不正な入力なら null
 */
async function saveLocateMeUrl(userId, url) {
    const entered = String(url || '')
        .replace(/[\r\n]/g, '')
        .trim();
    const normalized = normalizeLocateMeUrl(entered);
    if (entered && !normalized) {
        return null;
    }
    if (getLocateMeUrl(userId) === normalized) {
        return normalized;
    }
    const previousUrl = locateMeUrls.get(userId);
    const previousFetchAt = lastFetchAt.get(userId);
    if (normalized) {
        locateMeUrls.set(userId, normalized);
    } else {
        locateMeUrls.delete(userId);
    }
    lastFetchAt.delete(userId);
    try {
        await persistLocateMeUrls();
    } catch (err) {
        if (previousUrl === undefined) {
            locateMeUrls.delete(userId);
        } else {
            locateMeUrls.set(userId, previousUrl);
        }
        if (previousFetchAt !== undefined) {
            lastFetchAt.set(userId, previousFetchAt);
        }
        throw err;
    }
    const friendCtx = useFriendStore().friends.get(userId);
    if (!friendCtx?.ref) {
        return normalized;
    }
    if (normalized) {
        runLocateMeFallbackFlow(friendCtx.ref);
    } else if (friendCtx.ref.$isExternalLocation) {
        clearExternalLocation(friendCtx.ref, { retryOnFailure: false });
    }
    return normalized;
}

/**
 * 外部位置を解除して公式 API から取り直す。
 * retryOnFailure が true なら、取得に失敗し位置が変わっていなければ外部位置へ戻して次の巡回に回す。
 * false なら表示を private へ戻したうえで取得し、失敗時はログのみとする。
 * @param {object} ref
 * @param {{retryOnFailure: boolean}} options
 * @returns {void}
 */
function clearExternalLocation(ref, options) {
    const staleLocation = ref.location;
    ref.$isExternalLocation = false;
    if (!options.retryOnFailure) {
        applyUser({
            id: ref.id,
            location: 'private',
            worldId: '',
            instanceId: '',
            travelingToInstance: '',
            travelingToLocation: '',
            travelingToWorld: ''
        });
    }
    userRequest.getUser({ userId: ref.id }).catch((err) => {
        console.error(`[LocateMe] ${ref.displayName || ref.id}:`, err);
        if (options.retryOnFailure && ref.location === staleLocation && getLocateMeUrl(ref.id)) {
            ref.$isExternalLocation = true;
        }
    });
}

/**
 * 公式 API の位置情報から LocateMe を参照すべきか判定する。
 * @param {object} ref
 * @returns {boolean}
 */
function shouldUseLocateMe(ref) {
    return Boolean(
        ref?.id &&
        getLocateMeUrl(ref.id) &&
        ref.state === 'online' &&
        (ref.location === 'private' || ref.$isExternalLocation)
    );
}

/**
 * Browser では CORS 回避のため Pages Function を経由させる。
 * @param {string} url
 * @returns {string}
 */
function resolveRequestUrl(url) {
    if (!BROWSER) {
        return url;
    }
    const parsed = new URL(url);
    if (parsed.origin !== LOCATE_ME_ORIGIN) {
        return url;
    }
    return `${LOCATE_ME_PROXY_PREFIX}${parsed.pathname}${parsed.search}`;
}

/**
 * LocateMe から現在地を取得する。
 * 終了済みのレコードと offline は現在地なしとして null を返す。
 * @param {object} ref
 * @param {string} url
 * @returns {Promise<object | null>}
 */
async function requestLocateMeLocation(ref, url) {
    const response = await webApiService.execute({
        url: resolveRequestUrl(`${url}/locations`),
        method: 'GET'
    });
    if (response.status !== 200) {
        throw new Error(`${response.status} ${response.data}`);
    }
    const currentData = JSON.parse(response.data)?.data?.[0];
    const target = currentData?.friends?.find((f) => f.is_owner);
    const location = String(currentData?.location || '');
    if (!target || !location || location.toLowerCase() === 'offline' || currentData.end_at) {
        return null;
    }
    const instanceSeparator = location.indexOf(':');
    return {
        id: ref.id,
        location,
        worldId: currentData.world_api_id || '',
        instanceId: instanceSeparator === -1 ? '' : location.slice(instanceSeparator + 1),
        travelingToInstance: '',
        travelingToLocation: '',
        travelingToWorld: '',
        $location_at: currentData.start_at ? new Date(currentData.start_at).getTime() : Date.now(),
        $isExternalLocation: true
    };
}

/**
 * 公式 API が位置を隠しているときに LocateMe で補完する。
 * 応答時に URL と補完条件を再確認し、現在地が無ければ外部位置を解除する。
 * @param {object} ref
 * @returns {void}
 */
function runLocateMeFallbackFlow(ref) {
    if (!shouldUseLocateMe(ref) || inFlight.has(ref.id)) {
        return;
    }
    if (Date.now() - (lastFetchAt.get(ref.id) || 0) < MIN_FETCH_INTERVAL) {
        return;
    }
    const requestedUrl = getLocateMeUrl(ref.id);
    inFlight.add(ref.id);
    lastFetchAt.set(ref.id, Date.now());
    requestLocateMeLocation(ref, requestedUrl)
        .then((update) => {
            if (getLocateMeUrl(ref.id) !== requestedUrl || !shouldUseLocateMe(ref)) {
                return;
            }
            if (update) {
                applyUser(update);
            } else if (ref.$isExternalLocation) {
                clearExternalLocation(ref, { retryOnFailure: true });
            }
        })
        .catch((err) => {
            console.error(`[LocateMe] ${ref.displayName || ref.id}:`, err);
        })
        .finally(() => {
            inFlight.delete(ref.id);
        });
}

/**
 * private のままのフレンドを公式 API の更新を待たずに追従させる。
 * @returns {void}
 */
function runLocateMeSweepFlow() {
    const friendStore = useFriendStore();
    for (const friend of friendStore.friends.values()) {
        runLocateMeFallbackFlow(friend.ref);
    }
}

export { getLocateMeUrl, loadLocateMeUrls, runLocateMeFallbackFlow, runLocateMeSweepFlow, saveLocateMeUrl };
