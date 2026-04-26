const VRCHAT_API = 'https://api.vrchat.cloud';
const VRCHAT_WS = 'https://pipeline.vrchat.cloud';

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const upgradeHeader = request.headers.get('Upgrade');

        if (url.pathname === '/_worker-check') {
            return new Response('_worker.js active', { status: 200 });
        }

        if (upgradeHeader === 'websocket' && url.pathname.startsWith('/ws')) {
            return handleWebSocket(request, url);
        }

        if (url.pathname.startsWith('/api/1')) {
            return handleApi(request, url);
        }

        const resp = await env.ASSETS.fetch(request);
        if (resp.status === 404) {
            return env.ASSETS.fetch(
                new Request(new URL('/index.html', url), request)
            );
        }
        return resp;
    }
};

async function handleWebSocket(request, url) {
    const auth = url.searchParams.get('auth') ?? '';

    const upstreamReq = new Request(
        `${VRCHAT_WS}/?auth=${encodeURIComponent(auth)}`,
        { headers: request.headers }
    );

    return fetch(upstreamReq);
}

async function handleApi(request, url) {
    const targetUrl = `${VRCHAT_API}${url.pathname}${url.search}`;

    const reqHeaders = new Headers(request.headers);
    reqHeaders.set('host', 'api.vrchat.cloud');
    reqHeaders.delete('origin');
    reqHeaders.delete('referer');

    const upstream = await fetch(targetUrl, {
        method: request.method,
        headers: reqHeaders,
        body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
        redirect: 'manual'
    });

    const resHeaders = new Headers(upstream.headers);
    const cookies = upstream.headers.getSetCookie?.() ?? [];
    if (cookies.length > 0) {
        resHeaders.delete('set-cookie');
        for (const cookie of cookies) {
            const rewritten = cookie
                .replace(/;\s*domain=[^;]*/gi, '')
                .replace(/;\s*samesite=none/gi, '; SameSite=Lax');
            resHeaders.append('set-cookie', rewritten);
        }
    }

    return new Response(upstream.body, {
        status: upstream.status,
        headers: resHeaders
    });
}
