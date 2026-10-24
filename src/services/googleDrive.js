const SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const BACKUP_FILE_NAME = 'VRCX.sqlite3';
const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_ABOUT_URL = 'https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)';

const SHA256_K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98,
    0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
    0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8,
    0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819,
    0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
    0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7,
    0xc67178f2
];

let clientId = '';
let refreshToken = null;
let email = null;
let accessToken = null;
let accessTokenExpiry = 0;
let loadPromise = null;
let signInCancelled = false;

function rotr(value, shift) {
    return (value >>> shift) | (value << (32 - shift));
}

function sha256(bytes) {
    const hash = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    const paddedLength = ((bytes.length + 9 + 63) >> 6) << 6;
    const padded = new Uint8Array(paddedLength);
    padded.set(bytes);
    padded[bytes.length] = 0x80;

    const view = new DataView(padded.buffer);
    const bitLength = bytes.length * 8;
    view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000));
    view.setUint32(paddedLength - 4, bitLength >>> 0);

    const w = new Uint32Array(64);
    for (let offset = 0; offset < paddedLength; offset += 64) {
        for (let i = 0; i < 16; i += 1) {
            w[i] = view.getUint32(offset + i * 4);
        }
        for (let i = 16; i < 64; i += 1) {
            const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
            const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
            w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
        }

        let [a, b, c, d, e, f, g, h] = hash;
        for (let i = 0; i < 64; i += 1) {
            const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
            const ch = (e & f) ^ (~e & g);
            const temp1 = (h + S1 + ch + SHA256_K[i] + w[i]) >>> 0;
            const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
            const maj = (a & b) ^ (a & c) ^ (b & c);
            const temp2 = (S0 + maj) >>> 0;
            h = g;
            g = f;
            f = e;
            e = (d + temp1) >>> 0;
            d = c;
            c = b;
            b = a;
            a = (temp1 + temp2) >>> 0;
        }

        const round = [a, b, c, d, e, f, g, h];
        for (let i = 0; i < 8; i += 1) {
            hash[i] = (hash[i] + round[i]) >>> 0;
        }
    }

    const digest = new Uint8Array(32);
    const digestView = new DataView(digest.buffer);
    for (let i = 0; i < 8; i += 1) {
        digestView.setUint32(i * 4, hash[i]);
    }
    return digest;
}

function toBase64Url(bytes) {
    let binary = '';
    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomBase64Url(length) {
    return toBase64Url(crypto.getRandomValues(new Uint8Array(length)));
}

function asciiBytes(value) {
    const bytes = new Uint8Array(value.length);
    for (let i = 0; i < value.length; i += 1) {
        bytes[i] = value.charCodeAt(i) & 0xff;
    }
    return bytes;
}

function applyAccessToken(token) {
    accessToken = token.access_token;
    accessTokenExpiry = Date.now() + ((token.expires_in ?? 3600) - 60) * 1000;
}

function saveCredentials() {
    return AppApi.GoogleDriveSaveCredentials(JSON.stringify({ refreshToken, email }));
}

async function clearCredentials() {
    accessToken = null;
    accessTokenExpiry = 0;
    refreshToken = null;
    email = null;
    await saveCredentials();
}

async function doLoad() {
    const config = JSON.parse(await AppApi.GoogleDriveGetOAuthConfig());
    clientId = config.clientId ?? '';

    const credentials = JSON.parse(await AppApi.GoogleDriveLoadCredentials());
    refreshToken = credentials.refreshToken || null;
    email = credentials.email || null;
}

function ensureLoaded() {
    loadPromise ??= doLoad();
    return loadPromise;
}

async function exchangeToken(form) {
    const token = JSON.parse(await AppApi.GoogleDriveExchangeToken(JSON.stringify(form)));
    if (token.error) {
        if (token.error === 'invalid_grant') {
            await clearCredentials();
        }
        throw new Error(`Google 認証エラー: ${token.error_description || token.error}`);
    }
    return token;
}

async function getAccessToken() {
    if (accessToken && Date.now() < accessTokenExpiry) {
        return accessToken;
    }
    if (!refreshToken) {
        throw new Error('Google Drive にログインしていません。');
    }
    applyAccessToken(await exchangeToken({ grant_type: 'refresh_token', refresh_token: refreshToken }));
    return accessToken;
}

async function driveFetch(url, init = {}) {
    const token = await getAccessToken();
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(url, { ...init, headers });
    if (!response.ok) {
        if (response.status === 401) {
            accessToken = null;
            accessTokenExpiry = 0;
        }
        throw new Error(`Google Drive API エラー (${response.status}): ${await response.text()}`);
    }
    return response;
}

async function listBackupFiles() {
    const query = new URLSearchParams({
        spaces: 'appDataFolder',
        q: `name = '${BACKUP_FILE_NAME}' and trashed = false`,
        fields: 'files(id,size,modifiedTime)',
        orderBy: 'modifiedTime desc',
        pageSize: '100'
    });
    const result = await (await driveFetch(`${DRIVE_FILES_URL}?${query}`)).json();
    return result.files ?? [];
}

async function findBackupFile() {
    const files = await listBackupFiles();
    return files.length > 0 ? files[0] : null;
}

export async function getLocalStatus() {
    await ensureLoaded();
    return {
        configured: Boolean(clientId),
        signedIn: Boolean(refreshToken),
        email: refreshToken ? email : null,
        backup: null,
        error: null
    };
}

export async function getStatus() {
    const status = await getLocalStatus();
    if (!status.signedIn) {
        return status;
    }

    try {
        const file = await findBackupFile();
        if (file) {
            status.backup = { modifiedTime: file.modifiedTime, size: file.size };
        }
    } catch (err) {
        status.error = err?.message ?? String(err);
        if (!refreshToken) {
            status.signedIn = false;
        }
    }
    return status;
}

export async function signIn() {
    await ensureLoaded();
    if (!clientId) {
        throw new Error('Google Drive 連携が設定されていません。');
    }

    signInCancelled = false;
    const verifier = randomBase64Url(32);
    const challenge = toBase64Url(sha256(asciiBytes(verifier)));
    const state = randomBase64Url(16);

    let authorization;
    try {
        authorization = JSON.parse(
            await AppApi.GoogleDriveRequestAuthorizationCode(
                JSON.stringify({ clientId, scope: SCOPE, codeChallenge: challenge, state })
            )
        );
    } catch (err) {
        if (signInCancelled) {
            throw Object.assign(new Error('Google の認証がキャンセルされました。'), { cancelled: true });
        }
        throw err;
    }

    const token = await exchangeToken({
        grant_type: 'authorization_code',
        code: authorization.code,
        code_verifier: verifier,
        redirect_uri: authorization.redirectUri
    });
    if (!token.refresh_token) {
        throw new Error('Google からリフレッシュトークンを取得できませんでした。');
    }

    applyAccessToken(token);
    refreshToken = token.refresh_token;

    try {
        const about = await (await driveFetch(DRIVE_ABOUT_URL)).json();
        email = about?.user?.emailAddress ?? '';
    } catch (err) {
        email = null;
        console.warn('Failed to get Google Drive account email', err);
    }
    await saveCredentials();
}

export function cancelSignIn() {
    signInCancelled = true;
    return AppApi.GoogleDriveCancelSignIn();
}

export async function signOut() {
    await ensureLoaded();
    const token = refreshToken;
    await clearCredentials();
    if (!token) {
        return;
    }
    try {
        await AppApi.GoogleDriveRevokeToken(token);
    } catch (err) {
        console.warn('Failed to revoke Google Drive token', err);
    }
}

export async function backup(onPhase) {
    await ensureLoaded();
    const token = await getAccessToken();
    onPhase?.('compress');
    await AppApi.GoogleDriveCompressDatabase();
    onPhase?.('upload');
    const uploadedId = await AppApi.GoogleDriveUploadDatabase(token);
    if (!uploadedId) {
        throw new Error('Google Drive へのアップロードに失敗しました。');
    }

    const stale = (await listBackupFiles()).filter((file) => file.id !== uploadedId);
    await Promise.all(stale.map((file) => driveFetch(`${DRIVE_FILES_URL}/${file.id}`, { method: 'DELETE' })));
}

export async function restore(onPhase) {
    await ensureLoaded();
    const file = await findBackupFile();
    if (!file) {
        throw new Error('Google Drive にバックアップがありません。');
    }
    onPhase?.('download');
    await AppApi.GoogleDriveDownloadDatabase(file.id, await getAccessToken());
    onPhase?.('extract');
    return AppApi.GoogleDriveImportDatabase();
}
