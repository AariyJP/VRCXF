import { isSameOriginRequest } from './_shared';

const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke';

export async function onRequestPost({ request }: EventContext<unknown, string, unknown>): Promise<Response> {
    if (!isSameOriginRequest(request)) {
        return new Response(null, { status: 403 });
    }

    let token: unknown;
    try {
        token = ((await request.json()) as Record<string, unknown>).token;
    } catch {
        token = null;
    }

    if (typeof token !== 'string' || token.length === 0) {
        return new Response(null, { status: 400 });
    }

    const response = await fetch(GOOGLE_REVOKE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token })
    });

    return new Response(null, { status: response.ok ? 204 : 502 });
}
