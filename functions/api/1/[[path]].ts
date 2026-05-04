const VRCHAT_API_BASE = 'https://api.vrchat.cloud';

function parseCookieNames(cookieHeader: string | null): string[] {
    if (!cookieHeader) {
        return [];
    }
    return cookieHeader
        .split(';')
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry) => {
            const separatorIndex = entry.indexOf('=');
            return separatorIndex === -1
                ? entry
                : entry.slice(0, separatorIndex).trim();
        })
        .filter(Boolean);
}

function cloneHeaders(request: Request, skipHeaders: string[]): Headers {
    const headers = new Headers();
    for (const [key, value] of request.headers.entries()) {
        if (!skipHeaders.includes(key.toLowerCase())) {
            headers.set(key, value);
        }
    }
    return headers;
}

function rewriteSetCookies(headers: Headers): string[] {
    const raw = headers.getSetCookie ? headers.getSetCookie() : [];
    return raw.map((cookie) =>
        cookie
            .replace(/;\s*domain=[^;]*/gi, '')
            .replace(/;\s*samesite=none/gi, '; SameSite=Lax')
    );
}

export async function onRequest({
    request
}: EventContext<unknown, string, unknown>): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === 'POST' && url.pathname === '/api/1/auth/logout') {
        const headers = new Headers({
            'content-type': 'application/json'
        });
        for (const cookieName of parseCookieNames(request.headers.get('cookie'))) {
            headers.append(
                'set-cookie',
                `${cookieName}=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; HttpOnly; SameSite=Lax`
            );
            headers.append(
                'set-cookie',
                `${cookieName}=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; Secure; HttpOnly; SameSite=Lax`
            );
        }
        return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers
        });
    }
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
