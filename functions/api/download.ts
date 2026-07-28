const STORE_WEB_URL =
    'https://apps.microsoft.com/detail/9nrr9b5q60z7?mode=full';

export function onRequest(): Response {
    return Response.redirect(STORE_WEB_URL, 302);
}
