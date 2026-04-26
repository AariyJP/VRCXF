const VRCHAT_API = 'https://api.vrchat.cloud';
const VRCHAT_WS = 'https://pipeline.vrchat.cloud';

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const upgradeHeader = request.headers.get('Upgrade');

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

    const upstreamResp = await fetch(
        `${VRCHAT_WS}/?auth=${encodeURIComponent(auth)}`,
        { headers: { Upgrade: 'websocket' } }
    );

    const upstream = upstreamResp.webSocket;
    if (!upstream) {
        return new Response('Upstream WebSocket failed', { status: 502 });
    }
    upstream.accept();

    const [client, server] = Object.values(new WebSocketPair());
    server.accept();

    server.addEventListener('message', ({ data }) => upstream.send(data));
    server.addEventListener('close', ({ code, reason }) =>
        upstream.close(code, reason)
    );

    upstream.addEventListener('message', ({ data }) => server.send(data));
    upstream.addEventListener('close', ({ code, reason }) =>
        server.close(code, reason)
    );
    upstream.addEventListener('error', () =>
        server.close(1011, 'upstream error')
    );

    return new Response(null, { status: 101, webSocket: client });
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
