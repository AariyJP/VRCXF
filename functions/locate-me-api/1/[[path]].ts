const LOCATE_ME_BASE = 'https://locate-me.tapioka-systems.org';
const PROXY_PREFIX = '/locate-me-api/1';

function shouldForwardHeader(name: string): boolean {
    const normalized = name.toLowerCase();
    return (
        normalized === 'accept' ||
        normalized === 'accept-language' ||
        normalized === 'if-none-match' ||
        normalized === 'user-agent'
    );
}

function cloneHeaders(request: Request): Headers {
    const headers = new Headers();
    for (const [key, value] of request.headers.entries()) {
        if (shouldForwardHeader(key)) {
            headers.set(key, value);
        }
    }
    return headers;
}

export async function onRequest({ request }: EventContext<unknown, string, unknown>): Promise<Response> {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    const url = new URL(request.url);
    if (!url.pathname.startsWith(`${PROXY_PREFIX}/`)) {
        return new Response('Not Found', { status: 404 });
    }

    const targetUrl = new URL(`${url.pathname.slice(PROXY_PREFIX.length)}${url.search}`, LOCATE_ME_BASE);
    if (targetUrl.origin !== LOCATE_ME_BASE) {
        return new Response('Forbidden', { status: 403 });
    }

    const reqHeaders = cloneHeaders(request);
    reqHeaders.set('host', targetUrl.host);

    const upstream = await fetch(targetUrl.toString(), {
        method: request.method,
        headers: reqHeaders,
        redirect: 'manual'
    });

    const resHeaders = new Headers(upstream.headers);
    resHeaders.delete('set-cookie');

    return new Response(upstream.body, {
        status: upstream.status,
        headers: resHeaders
    });
}
