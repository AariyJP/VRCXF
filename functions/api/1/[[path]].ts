const VRCHAT_API_BASE = 'https://api.vrchat.cloud';

function decodeHeaderValue(value: string | null): string | null {
    if (!value) {
        return null;
    }
    try {
        return atob(value);
    } catch {
        return null;
    }
}

function encodeHeaderValue(value: string): string {
    return btoa(value);
}

function shouldForwardHeader(name: string): boolean {
    const normalized = name.toLowerCase();
    if (normalized === 'x-vrcx-cookie') {
        return false;
    }
    if (
        normalized === 'accept' ||
        normalized === 'accept-language' ||
        normalized === 'authorization' ||
        normalized === 'content-type' ||
        normalized === 'if-none-match' ||
        normalized === 'if-match' ||
        normalized === 'user-agent' ||
        normalized === 'vrcx-id' ||
        normalized.startsWith('x-')
    ) {
        return true;
    }
    return false;
}

function cloneHeaders(request: Request, skipHeaders: string[]): Headers {
    const headers = new Headers();
    for (const [key, value] of request.headers.entries()) {
        const normalized = key.toLowerCase();
        if (
            !skipHeaders.includes(normalized) &&
            shouldForwardHeader(normalized)
        ) {
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
    const requestCookieHeader =
        decodeHeaderValue(request.headers.get('x-vrcx-cookie')) ?? '';
    const targetUrl = `${VRCHAT_API_BASE}${url.pathname}${url.search}`;

    const reqHeaders = cloneHeaders(request, ['origin', 'referer']);
    reqHeaders.set('host', 'api.vrchat.cloud');
    if (requestCookieHeader) {
        reqHeaders.set('cookie', requestCookieHeader);
    }

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
        resHeaders.set(
            'x-vrcx-set-cookies',
            encodeHeaderValue(JSON.stringify(rewritten))
        );
    }

    return new Response(upstream.body, {
        status: upstream.status,
        headers: resHeaders
    });
}
