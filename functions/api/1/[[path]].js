const VRCHAT_API_BASE = 'https://api.vrchat.cloud';

/**
 * @param {Request} request
 * @param {string[]} skipHeaders
 */
function cloneHeaders(request, skipHeaders) {
    const headers = new Headers();
    for (const [key, value] of request.headers.entries()) {
        if (!skipHeaders.includes(key.toLowerCase())) {
            headers.set(key, value);
        }
    }
    return headers;
}

/**
 * @param {Headers} headers
 * @returns {string[]}
 */
function rewriteSetCookies(headers) {
    const raw = headers.getSetCookie ? headers.getSetCookie() : [];
    return raw.map((cookie) =>
        cookie
            .replace(/;\s*domain=[^;]*/gi, '')
            .replace(/;\s*samesite=none/gi, '; SameSite=Lax')
    );
}

export async function onRequest({ request }) {
    const url = new URL(request.url);
    const targetUrl = `${VRCHAT_API_BASE}${url.pathname}${url.search}`;

    const reqHeaders = cloneHeaders(request, ['origin', 'referer']);
    reqHeaders.set('host', 'api.vrchat.cloud');

    const upstream = await fetch(targetUrl, {
        method: request.method,
        headers: reqHeaders,
        body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
        redirect: 'manual'
    });

    const resHeaders = new Headers(upstream.headers);

    const rewritten = rewriteSetCookies(upstream.headers);
    if (rewritten.length > 0) {
        resHeaders.delete('set-cookie');
        for (const cookie of rewritten) {
            resHeaders.append('set-cookie', cookie);
        }
    }

    return new Response(upstream.body, {
        status: upstream.status,
        headers: resHeaders
    });
}
