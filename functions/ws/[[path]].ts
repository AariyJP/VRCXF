export async function onRequest({
    request
}: EventContext<unknown, string, unknown>): Promise<Response> {
    const upgradeHeader = request.headers.get('Upgrade');
    if (!upgradeHeader || upgradeHeader !== 'websocket') {
        return new Response('Expected WebSocket upgrade', { status: 426 });
    }

    const url = new URL(request.url);
    const auth = url.searchParams.get('auth') ?? '';

    const upstreamHeaders: Record<string, string> = { Upgrade: 'websocket' };
    const cookie = request.headers.get('cookie');
    if (cookie) {
        upstreamHeaders.cookie = cookie;
    }
    const userAgent = request.headers.get('user-agent');
    if (userAgent) {
        upstreamHeaders['user-agent'] = userAgent;
    }

    const upstreamResp = await fetch(
        `https://pipeline.vrchat.cloud/?auth=${encodeURIComponent(auth)}`,
        { headers: upstreamHeaders }
    );

    const upstream = (upstreamResp as unknown as { webSocket: WebSocket | null })
        .webSocket;
    if (!upstream) {
        return new Response('Failed to connect to upstream', { status: 502 });
    }
    (upstream as unknown as { accept(): void }).accept();

    const [client, server] = Object.values(new WebSocketPair());
    (server as unknown as { accept(): void }).accept();

    server.addEventListener('message', ({ data }) => upstream.send(data));
    server.addEventListener('close', ({ code, reason }) =>
        upstream.close(code, reason)
    );

    upstream.addEventListener('message', ({ data }) => server.send(data));
    upstream.addEventListener('close', ({ code, reason }) =>
        server.close(code, reason)
    );
    upstream.addEventListener('error', () => server.close(1011, 'upstream error'));

    return new Response(null, {
        status: 101,
        webSocket: client
    } as ResponseInit & { webSocket: WebSocket });
}
