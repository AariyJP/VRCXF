export async function onRequest({ request }) {
    const upgradeHeader = request.headers.get('Upgrade');
    if (!upgradeHeader || upgradeHeader !== 'websocket') {
        return new Response('Expected WebSocket upgrade', { status: 426 });
    }

    const url = new URL(request.url);
    const auth = url.searchParams.get('auth') ?? '';

    const upstreamResp = await fetch(
        `https://pipeline.vrchat.cloud/?auth=${encodeURIComponent(auth)}`,
        { headers: { Upgrade: 'websocket' } }
    );

    const upstream = upstreamResp.webSocket;
    if (!upstream) {
        return new Response('Failed to connect to upstream', { status: 502 });
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
    upstream.addEventListener('error', () => server.close(1011, 'upstream error'));

    return new Response(null, { status: 101, webSocket: client });
}
