import SparkMD5 from 'spark-md5';
import initSqlJs from 'sql.js';
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

const storagePrefix = 'vrcxf-browser:storage:';
const metaKey = 'vrcxf-browser:storage:keys';
const indexedDbName = 'vrcxf-browser';
const indexedDbStore = 'runtime';
const sqliteKey = 'sqlite-db';
const overlayQueue = new Map();

let indexedDbPromise;

function getBrowserLanguage() {
    if (typeof navigator === 'undefined') {
        return 'en-US';
    }
    return navigator.languages?.[0] || navigator.language || 'en-US';
}

function openIndexedDb() {
    if (!indexedDbPromise) {
        indexedDbPromise = new Promise((resolve, reject) => {
            if (typeof indexedDB === 'undefined') {
                reject(new Error('IndexedDB is not available'));
                return;
            }
            const request = indexedDB.open(indexedDbName, 1);
            request.onupgradeneeded = () => {
                if (!request.result.objectStoreNames.contains(indexedDbStore)) {
                    request.result.createObjectStore(indexedDbStore);
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    return indexedDbPromise;
}

async function getIndexedDbValue(key) {
    const db = await openIndexedDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(indexedDbStore, 'readonly');
        const store = tx.objectStore(indexedDbStore);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function setIndexedDbValue(key, value) {
    const db = await openIndexedDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(indexedDbStore, 'readwrite');
        const store = tx.objectStore(indexedDbStore);
        const request = store.put(value, key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

function decodeBase64(base64) {
    if (!base64) {
        return new Uint8Array();
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

function toBase64(bytes) {
    let binary = '';
    bytes.forEach((value) => {
        binary += String.fromCharCode(value);
    });
    return btoa(binary);
}

function rawStringToBase64(value) {
    let bytes = [];
    for (let i = 0; i < value.length; i += 1) {
        bytes.push(value.charCodeAt(i));
    }
    return toBase64(bytes);
}

function normalizeSqlArgs(args) {
    if (!args) {
        return undefined;
    }
    if (args instanceof Map) {
        return Object.fromEntries(args.entries());
    }
    return args;
}

function hashColor(input) {
    let hash = 0;
    for (let i = 0; i < input.length; i += 1) {
        hash = (hash << 5) - hash + input.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash % 360);
}

class BrowserSQLiteRuntime {
    constructor() {
        this.db = null;
        this.SQL = null;
        this.inTransaction = false;
        this.persistTimer = null;
        this.queue = Promise.resolve();
        this.ready = this.init();
    }

    enqueue(callback) {
        this.queue = this.queue.then(callback, callback);
        return this.queue;
    }

    async init() {
        this.SQL = await initSqlJs({
            locateFile: () => sqlWasmUrl
        });
        const stored = await getIndexedDbValue(sqliteKey).catch(() => null);
        const bytes =
            stored instanceof Uint8Array
                ? stored
                : stored instanceof ArrayBuffer
                  ? new Uint8Array(stored)
                  : null;
        this.db = bytes ? new this.SQL.Database(bytes) : new this.SQL.Database();
    }

    async persistNow() {
        clearTimeout(this.persistTimer);
        this.persistTimer = null;
        const bytes = this.db.export();
        const payload = bytes.buffer.slice(0);
        await setIndexedDbValue(sqliteKey, payload).catch(() => {});
    }

    schedulePersist() {
        if (this.inTransaction) {
            return;
        }
        clearTimeout(this.persistTimer);
        this.persistTimer = setTimeout(() => {
            this.persistNow();
        }, 50);
    }

    async execute(sql, args) {
        await this.ready;
        return this.enqueue(async () => {
            const rows = [];
            const stmt = this.db.prepare(sql);
            const normalizedArgs = normalizeSqlArgs(args);
            if (normalizedArgs) {
                stmt.bind(normalizedArgs);
            }
            while (stmt.step()) {
                rows.push(stmt.get());
            }
            stmt.free();
            return rows;
        });
    }

    async executeNonQuery(sql, args) {
        await this.ready;
        return this.enqueue(async () => {
            const normalizedSql = sql.trim().toUpperCase();
            if (normalizedSql === 'BEGIN') {
                this.inTransaction = true;
            }
            this.db.run(sql, normalizeSqlArgs(args));
            if (normalizedSql === 'COMMIT' || normalizedSql === 'ROLLBACK') {
                this.inTransaction = false;
                await this.persistNow();
            } else if (
                normalizedSql !== 'BEGIN' &&
                normalizedSql !== 'PRAGMA OPTIMIZE'
            ) {
                this.schedulePersist();
            }
            return this.db.getRowsModified();
        });
    }
}

const browserSQLiteRuntime = new BrowserSQLiteRuntime();

function getStorageKeys() {
    try {
        return JSON.parse(localStorage.getItem(metaKey) || '[]');
    } catch {
        return [];
    }
}

function setStorageKeys(keys) {
    localStorage.setItem(metaKey, JSON.stringify([...new Set(keys)]));
}

function rememberStorageKey(key) {
    const keys = getStorageKeys();
    keys.push(key);
    setStorageKeys(keys);
}

const BrowserVRCXStorage = {
    async Load() {},
    async Save() {},
    async Clear() {
        const keys = getStorageKeys();
        keys.forEach((key) => {
            localStorage.removeItem(`${storagePrefix}${key}`);
        });
        setStorageKeys([]);
    },
    async Remove(key) {
        localStorage.removeItem(`${storagePrefix}${key}`);
        setStorageKeys(getStorageKeys().filter((item) => item !== key));
    },
    async Get(key) {
        const value = localStorage.getItem(`${storagePrefix}${key}`);
        return value ?? '';
    },
    async Set(key, value) {
        rememberStorageKey(key);
        localStorage.setItem(`${storagePrefix}${key}`, String(value));
    },
    async GetAll() {
        const result = {};
        getStorageKeys().forEach((key) => {
            result[key] = localStorage.getItem(`${storagePrefix}${key}`) ?? '';
        });
        return JSON.stringify(result);
    }
};

async function notificationPermission() {
    if (typeof Notification === 'undefined') {
        return 'denied';
    }
    if (Notification.permission === 'default') {
        try {
            return await Notification.requestPermission();
        } catch {
            return Notification.permission;
        }
    }
    return Notification.permission;
}

async function showDesktopNotification(title, body, image) {
    if ((await notificationPermission()) !== 'granted') {
        return;
    }
    const notification = new Notification(title, {
        body,
        icon: image || undefined
    });
    notification.onclick = () => window.focus();
}

function parseJsonSafe(value, fallback) {
    if (!value) {
        return fallback;
    }
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

function decodeImageBase64(base64, mime = 'image/png') {
    return new Blob([decodeBase64(base64)], { type: mime });
}

function encodeJsonBase64(value) {
    return toBase64(new TextEncoder().encode(JSON.stringify(value)));
}

function decodeJsonBase64(value) {
    return JSON.parse(new TextDecoder().decode(decodeBase64(value)));
}

function parseCookieHeader(cookieHeader) {
    if (!cookieHeader) {
        return [];
    }
    return cookieHeader
        .split(';')
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry) => {
            const separatorIndex = entry.indexOf('=');
            const name =
                separatorIndex === -1
                    ? entry
                    : entry.slice(0, separatorIndex).trim();
            const value =
                separatorIndex === -1 ? '' : entry.slice(separatorIndex + 1);
            return {
                Name: name,
                Value: value,
                Path: '/',
                Expires: '9999-12-31T23:59:59.9999999Z',
                Secure: location.protocol === 'https:'
            };
        })
        .filter((cookie) => cookie.Name);
}

function normalizeCookieList(cookies) {
    if (!cookies) {
        return [];
    }
    if (Array.isArray(cookies)) {
        return cookies;
    }
    if (typeof cookies === 'string') {
        try {
            const decoded = decodeJsonBase64(cookies);
            if (Array.isArray(decoded)) {
                return decoded;
            }
        } catch (error) {
            void error;
        }
        return parseCookieHeader(cookies);
    }
    return [];
}

function clearBrowserCookie(name, path = '/') {
    const expires = 'Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = `${name}=; expires=${expires}; path=${path}`;
    document.cookie = `${name}=; expires=${expires}; path=${path}; domain=${location.hostname}`;
}

function applyBrowserCookie(cookie) {
    const name = cookie?.Name ?? cookie?.name;
    if (!name) {
        return;
    }
    const value = cookie?.Value ?? cookie?.value ?? '';
    const path = cookie?.Path ?? cookie?.path ?? '/';
    const expiresSource = cookie?.Expires ?? cookie?.expires;
    const expires = expiresSource ? new Date(expiresSource) : null;
    const parts = [`${name}=${value}`, `path=${path}`];
    if (expires && !Number.isNaN(expires.getTime())) {
        parts.push(`expires=${expires.toUTCString()}`);
    }
    if (
        (cookie?.Secure ?? cookie?.secure ?? false) &&
        location.protocol === 'https:'
    ) {
        parts.push('secure');
    }
    parts.push('SameSite=Lax');
    document.cookie = parts.join('; ');
}

async function buildRequest(options) {
    const headers = new Headers(options.headers || {});
    let method = options.method || 'GET';
    let body;
    const requestUrl = new URL(options.url, window.location.origin);
    const isLocalApi =
        requestUrl.origin === window.location.origin &&
        requestUrl.pathname.startsWith('/api/1');
    const isVrchatApi = requestUrl.origin === 'https://api.vrchat.cloud';

    if (options.uploadFilePUT) {
        method = 'PUT';
        body = decodeBase64(options.fileData);
        if (options.fileMIME) {
            headers.set('Content-Type', options.fileMIME);
        }
        if (options.fileMD5) {
            headers.set('Content-MD5', options.fileMD5);
        }
    } else if (
        options.uploadImage ||
        options.uploadImageLegacy ||
        options.uploadImagePrint
    ) {
        method = 'POST';
        const formData = new FormData();
        if (options.postData) {
            if (options.uploadImageLegacy) {
                formData.append('data', options.postData);
            } else {
                Object.entries(parseJsonSafe(options.postData, {})).forEach(
                    ([key, value]) => {
                        formData.append(key, value ?? '');
                    }
                );
            }
        }
        formData.append(
            'image',
            decodeImageBase64(options.imageData),
            'image.png'
        );
        body = formData;
        headers.delete('Content-Type');
    } else if (options.body) {
        body = options.body;
    }

    return {
        body,
        credentials: isLocalApi || isVrchatApi ? 'include' : 'omit',
        headers,
        method,
        mode: 'cors'
    };
}

async function executeFetch(options) {
    const requestInit = await buildRequest(options);
    const response = await fetch(options.url, requestInit);
    const data = await response.text();
    return {
        data,
        status: response.status
    };
}

const BrowserWebApi = {
    async ClearCookies() {
        parseCookieHeader(document.cookie).forEach((cookie) => {
            clearBrowserCookie(cookie.Name, cookie.Path);
        });
    },
    async GetCookies() {
        return encodeJsonBase64(parseCookieHeader(document.cookie));
    },
    async SetCookies(cookies) {
        normalizeCookieList(cookies).forEach((cookie) => {
            applyBrowserCookie(cookie);
        });
    },
    async ExecuteJson(options) {
        const response = await executeFetch(options);
        return JSON.stringify({
            message: response.data,
            status: response.status
        });
    },
    async Execute(options) {
        const response = await executeFetch(options);
        return {
            Item1: response.status,
            Item2: response.data
        };
    }
};

const BrowserSQLite = {
    async ExecuteJson(sql, args) {
        const rows = await browserSQLiteRuntime.execute(sql, args);
        return JSON.stringify(rows);
    },
    async Execute(sql, args) {
        return browserSQLiteRuntime.execute(sql, args);
    },
    async ExecuteNonQuery(sql, args) {
        return browserSQLiteRuntime.executeNonQuery(sql, args);
    }
};

const BrowserLogWatcher = {
    async Get() {
        return [];
    },
    async SetDateTill() {},
    async Reset() {},
    async GetLogLines() {
        return [];
    }
};

const BrowserDiscord = {
    async SetAssets() {},
    async SetActive() {
        return false;
    }
};

const BrowserAssetBundleManager = {
    async DeleteCache() {},
    async CheckVRChatCache() {
        return false;
    },
    async SweepCache() {
        return '';
    },
    async GetVRChatCacheFullLocation() {
        return '';
    },
    async GetCacheSize() {
        return 0;
    },
    async DeleteAllCache() {}
};

const BrowserAppApi = new Proxy(
    {
        async ShowDevTools() {},
        async SetVR() {},
        async SetZoom(value) {
            await BrowserVRCXStorage.Set('browserZoomLevel', value);
        },
        async GetZoom() {
            const value = await BrowserVRCXStorage.Get('browserZoomLevel');
            return parseInt(value || '0', 10) || 0;
        },
        async DesktopNotification(title, text, image) {
            await showDesktopNotification(title, text, image);
        },
        async RestartApplication() {
            window.location.reload();
        },
        async CheckForUpdateExe() {
            return false;
        },
        async ExecuteVrOverlayFunction(key, json) {
            overlayQueue.set(key, json);
        },
        async FocusWindow() {
            window.focus();
        },
        async ChangeTheme() {},
        async DoFunny() {},
        async GetClipboard() {
            try {
                return await navigator.clipboard.readText();
            } catch {
                return '';
            }
        },
        async SetStartup() {},
        async CopyImageToClipboard() {},
        async FlashWindow() {
            window.focus();
        },
        async SetUserAgent() {},
        async SetTrayIconNotification() {},
        async OpenCalendarFile(icsContent) {
            const url = URL.createObjectURL(
                new Blob([icsContent], { type: 'text/calendar' })
            );
            window.open(url, '_blank', 'noopener');
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        },
        async GetColourFromUserID(userId) {
            return hashColor(userId || '');
        },
        async OpenLink(url) {
            window.open(url, '_blank', 'noopener');
        },
        async OpenDiscordProfile(discordId) {
            window.open(
                `https://discord.com/users/${discordId}`,
                '_blank',
                'noopener'
            );
        },
        async GetLaunchCommand() {
            return '';
        },
        async IPCAnnounceStart() {},
        async SendIpc() {},
        async CustomCss() {
            return '';
        },
        async CustomScript() {
            return '';
        },
        async CurrentCulture() {
            return getBrowserLanguage();
        },
        async CurrentLanguage() {
            return getBrowserLanguage();
        },
        async GetVersion() {
            return VERSION;
        },
        async VrcClosedGracefully() {
            return true;
        },
        async GetColourBulk(userIds) {
            return Object.fromEntries(
                (userIds || []).map((userId) => [userId, hashColor(userId)])
            );
        },
        async SetAppLauncherSettings() {},
        async GetFileBase64() {
            return null;
        },
        async TryOpenInstanceInVrc(launchUrl) {
            window.open(launchUrl, '_blank', 'noopener');
            return true;
        },
        async MD5File(blob) {
            const bytes = decodeBase64(blob);
            return rawStringToBase64(
                SparkMD5.ArrayBuffer.hash(bytes.buffer, true)
            );
        },
        async SignFile(blob) {
            return blob;
        },
        async FileLength(blob) {
            return String(decodeBase64(blob).length);
        },
        async GetVRChatAppDataLocation() {
            return '';
        },
        async GetVRChatPhotosLocation() {
            return '';
        },
        async GetUGCPhotoLocation() {
            return '';
        },
        async GetVRChatScreenshotsLocation() {
            return '';
        },
        async GetVRChatCacheLocation() {
            return '';
        },
        async OpenVrcxAppDataFolder() {
            return false;
        },
        async OpenVrcAppDataFolder() {
            return false;
        },
        async OpenVrcPhotosFolder() {
            return false;
        },
        async OpenUGCPhotosFolder() {
            return false;
        },
        async OpenVrcScreenshotsFolder() {
            return false;
        },
        async OpenCrashVrcCrashDumps() {
            return false;
        },
        async OpenShortcutFolder() {},
        async OpenFolderAndSelectItem() {},
        async OpenFolderSelectorDialog() {
            return '';
        },
        async OpenFileSelectorDialog() {
            return '';
        },
        async OnProcessStateChanged() {},
        async CheckGameRunning() {},
        async IsGameRunning() {
            return false;
        },
        async IsSteamVRRunning() {
            return false;
        },
        async QuitGame() {
            return 0;
        },
        async StartGame() {
            return false;
        },
        async StartGameFromPath() {
            return false;
        },
        async GetVRChatRegistryKey() {
            return null;
        },
        async GetVRChatRegistryKeyString() {
            return '';
        },
        async SetVRChatRegistryKey() {
            return false;
        },
        async GetVRChatRegistry() {
            return {};
        },
        async SetVRChatRegistry() {},
        async HasVRChatRegistryFolder() {
            return false;
        },
        async DeleteVRChatRegistryFolder() {},
        async ReadVrcRegJsonFile() {
            return '{}';
        },
        async GetVRChatRegistryJson() {
            return '{}';
        },
        async PopulateImageHosts() {},
        async GetImage(url) {
            return url;
        },
        async ResizeImageToFitLimits(base64data) {
            return base64data;
        },
        async CropAllPrints() {},
        async CropPrintImage() {
            return false;
        },
        async SavePrintToFile() {
            return '';
        },
        async SaveStickerToFile() {
            return '';
        },
        async SaveEmojiToFile() {
            return '';
        },
        async AddScreenshotMetadata(path) {
            return path;
        },
        async GetExtraScreenshotData() {
            return '{}';
        },
        async GetScreenshotMetadata() {
            return '{}';
        },
        async FindScreenshotsBySearch() {
            return '[]';
        },
        async GetLastScreenshot() {
            return '';
        },
        async DeleteScreenshotMetadata() {
            return false;
        },
        async DeleteAllScreenshotMetadata() {},
        async GetVRChatModerations() {
            return {};
        },
        async GetVRChatUserModeration() {
            return 0;
        },
        async SetVRChatUserModeration() {
            return false;
        },
        async ReadConfigFile() {
            return '{}';
        },
        async ReadConfigFileSafe() {
            return '{}';
        },
        async WriteConfigFile() {},
        async DownloadUpdate() {},
        async CancelUpdate() {},
        async CheckUpdateProgress() {
            return 0;
        },
        async XSNotification(title, content, timeout, opacity, image) {
            await showDesktopNotification(title, content, image);
        },
        async OVRTNotification(
            hudNotification,
            wristNotification,
            title,
            body,
            timeout,
            opacity,
            image
        ) {
            await showDesktopNotification(title, body, image);
        }
    },
    {
        get(target, prop) {
            if (prop in target) {
                return target[prop];
            }
            return async () => undefined;
        }
    }
);

const BrowserAppApiVr = {
    async Init() {},
    async VrInit() {},
    async ToggleSystemMonitor() {},
    async CpuUsage() {
        return 0;
    },
    async GetVRDevices() {
        return [];
    },
    async GetUptime() {
        return 0;
    },
    async CurrentCulture() {
        return getBrowserLanguage();
    },
    async CustomVrScript() {
        return '';
    },
    async GetExecuteVrOverlayFunctionQueue() {
        const result = new Map(overlayQueue.entries());
        overlayQueue.clear();
        return result;
    }
};

export default {
    AppApi: BrowserAppApi,
    AppApiVr: BrowserAppApiVr,
    AssetBundleManager: BrowserAssetBundleManager,
    Discord: BrowserDiscord,
    LogWatcher: BrowserLogWatcher,
    SQLite: BrowserSQLite,
    VRCXStorage: BrowserVRCXStorage,
    WebApi: BrowserWebApi
};
