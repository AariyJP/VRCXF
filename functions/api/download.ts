const STORE_WEB_URL = 'https://apps.microsoft.com/detail/9NRR9B5Q60Z7';

type Platform = 'windows' | 'macos' | 'ios' | 'android' | 'unknown';

function detectPlatform(request: Request): Platform {
    const hint = request.headers
        .get('sec-ch-ua-platform')
        ?.replace(/"/g, '')
        .toLowerCase();

    if (hint === 'windows') {
        return 'windows';
    }
    if (hint === 'android') {
        return 'android';
    }
    if (hint === 'ios') {
        return 'ios';
    }
    if (hint === 'macos') {
        const isMobile = request.headers.get('sec-ch-ua-mobile') === '?1';
        return isMobile ? 'ios' : 'macos';
    }

    const userAgent = request.headers.get('user-agent') ?? '';

    if (/windows/i.test(userAgent)) {
        return 'windows';
    }
    if (/android/i.test(userAgent)) {
        return 'android';
    }
    if (/iphone|ipad|ipod/i.test(userAgent)) {
        return 'ios';
    }
    if (/macintosh|mac os x/i.test(userAgent)) {
        return /mobile/i.test(userAgent) ? 'ios' : 'macos';
    }

    return 'unknown';
}

function getTargetUrl(platform: Platform): string {
    switch (platform) {
        case 'windows':
            return STORE_WEB_URL;
        case 'macos':
            return STORE_WEB_URL;
        case 'ios':
            return STORE_WEB_URL;
        case 'android':
            return STORE_WEB_URL;
        default:
            return STORE_WEB_URL;
    }
}

export async function onRequest({
    request
}: {
    request: Request;
}): Promise<Response> {
    const platform = detectPlatform(request);

    return Response.redirect(getTargetUrl(platform), 302);
}
