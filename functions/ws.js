export async function onRequest({ request }) {
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader !== 'websocket') {
        return new Response('Expected WebSocket upgrade', { status: 426 });
    }

    const url = new URL(request.url);
    const auth = url.searchParams.get('auth') ?? '';

    const [client, server] = Object.values(new WebSocketPair());
    server.accept();

    const upstream = new WebSocket(
        `wss://pipeline.vrchat.cloud/?auth=${encodeURIComponent(auth)}`
    );

    upstream.addEventListener('open', () => {
        server.addEventListener('message', (event) =>
            upstream.send(event.data)
        );
        server.addEventListener('close', (event) =>
            upstream.close(event.code, event.reason)
        );
    });

    upstream.addEventListener('message', (event) => server.send(event.data));
    upstream.addEventListener('close', (event) =>
        server.close(event.code, event.reason)
    );
    upstream.addEventListener('error', () =>
        server.close(1011, 'upstream error')
    );

    server.addEventListener('error', () =>
        upstream.close(1011, 'client error')
    );

    return new Response(null, {
        status: 101,
        webSocket: client
    });
}
