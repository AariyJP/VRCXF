import { GoogleOAuthEnv, isSameOriginRequest, jsonResponse } from './_shared';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

const ALLOWED_FIELDS = ['grant_type', 'code', 'code_verifier', 'redirect_uri', 'refresh_token'];
const ALLOWED_GRANT_TYPES = ['authorization_code', 'refresh_token'];

export async function onRequestPost({
    request,
    env
}: EventContext<GoogleOAuthEnv, string, unknown>): Promise<Response> {
    if (!isSameOriginRequest(request)) {
        return jsonResponse({ error: 'forbidden', error_description: '許可されていない呼び出し元です。' }, 403);
    }

    const clientId = env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = env.GOOGLE_OAUTH_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
        return jsonResponse(
            { error: 'unconfigured', error_description: 'Google Drive 連携が設定されていません。' },
            503
        );
    }

    let payload: Record<string, unknown>;
    try {
        payload = (await request.json()) as Record<string, unknown>;
    } catch {
        return jsonResponse({ error: 'invalid_request', error_description: 'リクエストの形式が不正です。' }, 400);
    }

    if (typeof payload.grant_type !== 'string' || !ALLOWED_GRANT_TYPES.includes(payload.grant_type)) {
        return jsonResponse(
            { error: 'unsupported_grant_type', error_description: '許可されていない grant_type です。' },
            400
        );
    }

    const selfOrigin = new URL(request.url).origin;
    if (payload.redirect_uri !== undefined && !String(payload.redirect_uri).startsWith(`${selfOrigin}/`)) {
        return jsonResponse(
            { error: 'invalid_request', error_description: '許可されていない redirect_uri です。' },
            400
        );
    }

    const form = new URLSearchParams({ client_id: clientId, client_secret: clientSecret });
    for (const field of ALLOWED_FIELDS) {
        const value = payload[field];
        if (typeof value === 'string' && value.length > 0) {
            form.set(field, value);
        }
    }

    const response = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form
    });

    return new Response(await response.text(), {
        status: response.status,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
    });
}
