import { GoogleOAuthEnv } from './_shared';

export function onRequestGet({ env }: EventContext<GoogleOAuthEnv, string, unknown>): Response {
    return new Response(JSON.stringify({ clientId: env.GOOGLE_OAUTH_CLIENT_ID ?? '' }), {
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
    });
}
