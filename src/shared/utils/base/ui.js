import { ref } from 'vue';
import { toast } from 'vue-sonner';

import {
    APP_CJK_FONT_PACK_CONFIG,
    APP_CJK_FONT_PACK_DEFAULT_KEY,
    APP_FONT_CONFIG,
    APP_FONT_DEFAULT_KEY,
    THEME_COLORS,
    THEME_CONFIG
} from '../../constants';
import { i18n } from '../../../plugins/i18n';
import { router } from '../../../plugins/router';
import { textToHex } from './string';

import configRepository from '../../../services/config.js';

const THEME_COLOR_STORAGE_KEY = 'VRCX_themeColor';
const THEME_COLOR_STYLE_ID = 'app-theme-color-style';
const THEME_MODE_STYLE_ID = 'app-theme-mode-style';
const DEFAULT_THEME_COLOR_KEY = 'default';

const APP_FONT_LINK_ATTR = 'data-app-font';
const APP_CJK_FONT_PACK_LINK_ATTR = 'data-app-cjk-font-pack';

const BACKGROUND_IMAGE_CLASS = 'x-has-bg';
const BACKGROUND_IMAGE_MAX_EDGE = 2560;
const BACKGROUND_IMAGE_MAX_SOURCE_BYTES = 32 * 1024 * 1024;
const BACKGROUND_IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'];
const BACKGROUND_IMAGE_STYLE_ID = 'app-background-image-style';
const BACKGROUND_IMAGE_MIME = 'image/webp';

const themeColors = THEME_COLORS.map((theme) => ({
    ...theme,
    href: theme.file
        ? new URL(`../../../styles/themes/${theme.file}`, import.meta.url).href
        : null
}));

const currentThemeColor = ref(DEFAULT_THEME_COLOR_KEY);
const isApplyingThemeColor = ref(false);

function resolveThemeColor(themeKey) {
    const normalized = String(themeKey).trim().toLowerCase();
    return (
        themeColors.find((theme) => theme.key === normalized) ||
        themeColors.find((theme) => theme.key === DEFAULT_THEME_COLOR_KEY)
    );
}

function applyThemeColorStyle(theme) {
    const root = document.documentElement;
    root.setAttribute('data-theme-color', theme.key);

    let styleEl = document.getElementById(THEME_COLOR_STYLE_ID);
    if (!theme.href) {
        styleEl?.remove();
        return;
    }

    if (!styleEl) {
        styleEl = document.createElement('link');
        styleEl.id = THEME_COLOR_STYLE_ID;
        styleEl.rel = 'stylesheet';
        document.head.appendChild(styleEl);
    }

    if (styleEl.getAttribute('href') !== theme.href) {
        styleEl.setAttribute('href', theme.href);
    }
}

async function applyThemeColor(themeKey, { persist = true } = {}) {
    const resolved = resolveThemeColor(themeKey);
    isApplyingThemeColor.value = true;
    applyThemeColorStyle(resolved);
    currentThemeColor.value = resolved.key;
    if (persist) {
        try {
            await configRepository.setString(
                THEME_COLOR_STORAGE_KEY,
                resolved.key
            );
        } catch (error) {
            console.warn('Failed to persist theme color', error);
        }
    }
    isApplyingThemeColor.value = false;
    return resolved;
}

async function initThemeColor() {
    const storedKey = await configRepository.getString(THEME_COLOR_STORAGE_KEY);
    const resolved = resolveThemeColor(storedKey || DEFAULT_THEME_COLOR_KEY);
    applyThemeColorStyle(resolved);
    currentThemeColor.value = resolved.key;
}

function useThemeColor() {
    return {
        themeColors,
        currentThemeColor,
        isApplyingThemeColor,
        applyThemeColor,
        initThemeColor
    };
}

/**
 *
 * @returns {boolean}
 */
function systemIsDarkMode() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyThemeFonts(themeKey, fontLinks = []) {
    document
        .querySelectorAll('link[data-theme-font]')
        .forEach((linkEl) => linkEl.remove());

    if (!fontLinks?.length) {
        return;
    }

    const head = document.head;
    fontLinks.forEach((href) => {
        if (!href) {
            return;
        }
        const fontLink = document.createElement('link');
        fontLink.rel = 'stylesheet';
        fontLink.href = href;
        fontLink.dataset.themeFont = themeKey;
        head.appendChild(fontLink);
    });
}

function applyThemeModeStyle(themeMode) {
    const themeConfig = THEME_CONFIG[themeMode];
    const themeFile = themeConfig?.file;
    let styleEl = document.getElementById(THEME_MODE_STYLE_ID);

    if (!themeFile) {
        styleEl?.remove();
        return;
    }

    const themeHref = new URL(
        `../../../styles/themes/${themeFile}`,
        import.meta.url
    ).href;

    if (!styleEl) {
        styleEl = document.createElement('link');
        styleEl.id = THEME_MODE_STYLE_ID;
        styleEl.rel = 'stylesheet';
        document.head.appendChild(styleEl);
    }

    if (styleEl.getAttribute('href') !== themeHref) {
        styleEl.setAttribute('href', themeHref);
    }
}

function resolveAppFontFamily(fontKey) {
    const normalized = String(fontKey || '')
        .trim()
        .toLowerCase();
    if (APP_FONT_CONFIG[normalized]) {
        return { key: normalized, ...APP_FONT_CONFIG[normalized] };
    }
    return {
        key: APP_FONT_DEFAULT_KEY,
        ...APP_FONT_CONFIG[APP_FONT_DEFAULT_KEY]
    };
}

function ensureDynamicFontStyle(attrName, styleKey, cssImport) {
    const head = document.head;
    if (!head) {
        return;
    }

    document.querySelectorAll(`style[${attrName}]`).forEach((styleEl) => {
        if (styleEl.getAttribute(attrName) !== styleKey) {
            styleEl.remove();
        }
    });

    if (!cssImport) {
        return;
    }

    const existing = document.querySelector(`style[${attrName}="${styleKey}"]`);
    if (existing) {
        return;
    }

    const styleEl = document.createElement('style');
    styleEl.setAttribute(attrName, styleKey);
    styleEl.textContent = cssImport;
    head.appendChild(styleEl);
}

function resolveAppCjkFontPack(packKey) {
    const normalized = String(packKey || '')
        .trim()
        .toLowerCase();
    if (APP_CJK_FONT_PACK_CONFIG[normalized]) {
        return { key: normalized, ...APP_CJK_FONT_PACK_CONFIG[normalized] };
    }
    return {
        key: APP_CJK_FONT_PACK_DEFAULT_KEY,
        ...APP_CJK_FONT_PACK_CONFIG[APP_CJK_FONT_PACK_DEFAULT_KEY]
    };
}

function ensureAppCjkFontPackLinks(packKey) {
    const config = APP_CJK_FONT_PACK_CONFIG[packKey];
    ensureDynamicFontStyle(
        APP_CJK_FONT_PACK_LINK_ATTR,
        packKey,
        config?.cssImport
    );
}

function applyAppFontFamily(fontKey, customCssName) {
    if (fontKey === 'custom') {
        const cssName = String(customCssName || '').trim() || 'system-ui';
        const root = document.documentElement;
        root.style.setProperty('--font-western-primary', cssName);
        ensureDynamicFontStyle(APP_FONT_LINK_ATTR, 'custom', null);
        return {
            key: 'custom',
            ...APP_FONT_CONFIG.custom,
            cssName
        };
    }

    const resolved = resolveAppFontFamily(fontKey);
    const root = document.documentElement;
    root.style.setProperty('--font-western-primary', resolved.cssName);
    ensureDynamicFontStyle(
        APP_FONT_LINK_ATTR,
        resolved.key,
        resolved.cssImport
    );

    return resolved;
}

function applyAppCjkFontPack(packKey) {
    const resolved = resolveAppCjkFontPack(packKey);
    const root = document.documentElement;
    root.style.setProperty('--font-cjk-jp-primary', resolved.cssName.jp);
    root.style.setProperty('--font-cjk-sc-primary', resolved.cssName.sc);
    root.style.setProperty('--font-cjk-kr-primary', resolved.cssName.kr);
    root.style.setProperty('--font-cjk-tc-primary', resolved.cssName.tc);

    ensureAppCjkFontPackLinks(resolved.key);

    return resolved;
}

function changeAppThemeStyle(themeMode) {
    if (themeMode === 'system') {
        themeMode = systemIsDarkMode() ? 'dark' : 'light';
    }

    let themeConfig = THEME_CONFIG[themeMode];
    if (!themeConfig) {
        // fallback to system
        console.error('Invalid theme mode:', themeMode);
        configRepository.setString('VRCX_ThemeMode', 'system');
        themeMode = systemIsDarkMode() ? 'dark' : 'light';
        themeConfig = THEME_CONFIG[themeMode];
    }

    applyThemeFonts(themeMode, themeConfig.fontLinks);
    applyThemeModeStyle(themeMode);

    document.documentElement.setAttribute('data-theme', themeMode);

    const shouldUseDarkClass = Boolean(themeConfig.isDark);
    if (shouldUseDarkClass) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    if (themeConfig.name === 'Rednight') {
        AppApi.ChangeTheme(3);
    } else if (themeConfig.name === 'Midnight') {
        AppApi.ChangeTheme(2);
    } else if (themeConfig.isDark) {
        AppApi.ChangeTheme(1);
    } else {
        AppApi.ChangeTheme(0);
    }

    return { isDark: themeConfig.isDark };

    // let $appThemeDarkStyle = document.getElementById('app-theme-dark-style');
    // const darkThemeCssPath = `${filePathPrefix}theme.dark.css`;
    // const shouldApplyDarkBase = themeConfig.isDark;
    // if (shouldApplyDarkBase) {
    //     if (!$appThemeDarkStyle) {
    //         $appThemeDarkStyle = document.createElement('link');
    //         $appThemeDarkStyle.setAttribute('id', 'app-theme-dark-style');
    //         $appThemeDarkStyle.rel = 'stylesheet';
    //         $appThemeDarkStyle.href = darkThemeCssPath;
    //         document.head.insertBefore($appThemeDarkStyle, $appThemeStyle);
    //     } else if ($appThemeDarkStyle.href !== darkThemeCssPath) {
    //         $appThemeDarkStyle.href = darkThemeCssPath;
    //     }
    // } else {
    //     $appThemeDarkStyle && $appThemeDarkStyle.remove();
    // }
}

/**
 *
 * @param {object} trustColor
 */
function updateTrustColorClasses(trustColor) {
    if (document.getElementById('trustColor') !== null) {
        document.getElementById('trustColor').outerHTML = '';
    }
    const style = document.createElement('style');
    style.id = 'trustColor';
    style.type = 'text/css';
    let newCSS = '';
    for (const rank in trustColor) {
        newCSS += `.x-tag-${rank} { color: ${trustColor[rank]} !important; border-color: ${trustColor[rank]} !important; } `;
    }
    style.innerHTML = newCSS;
    document.getElementsByTagName('head')[0].appendChild(style);
}

async function refreshCustomCss() {
    if (document.contains(document.getElementById('app-custom-style'))) {
        document.getElementById('app-custom-style').remove();
    }
    const customCss = await AppApi.CustomCss();
    if (customCss) {
        const head = document.head;
        const $appCustomStyle = document.createElement('link');
        $appCustomStyle.setAttribute('id', 'app-custom-style');
        $appCustomStyle.rel = 'stylesheet';
        $appCustomStyle.type = 'text/css';
        $appCustomStyle.href = URL.createObjectURL(
            new Blob([customCss], { type: 'text/css' })
        );
        head.appendChild($appCustomStyle);
    }
}

async function refreshCustomScript() {
    if (document.contains(document.getElementById('app-custom-script'))) {
        document.getElementById('app-custom-script').remove();
    }
    const customScript = await AppApi.CustomScript();
    if (customScript) {
        const head = document.head;
        const $appCustomScript = document.createElement('script');
        $appCustomScript.setAttribute('id', 'app-custom-script');
        $appCustomScript.type = 'text/javascript';
        $appCustomScript.textContent = customScript;
        head.appendChild($appCustomScript);
    }
}

/**
 *
 * @param {number} hue
 * @param isDarkMode
 * @returns {string}
 */
function HueToHex(hue, isDarkMode) {
    // this.HSVtoRGB(hue / 65535, .8, .8);
    if (isDarkMode) {
        return HSVtoRGB(hue / 65535, 0.6, 1);
    }
    return HSVtoRGB(hue / 65535, 1, 0.7);
}

/**
 *
 * @param {number} h
 * @param {number} s
 * @param {number} v
 * @returns {string}
 */
function HSVtoRGB(h, s, v) {
    let r = 0;
    let g = 0;
    let b = 0;
    if (arguments.length === 1) {
        // @ts-ignore
        s = h.s;
        // @ts-ignore
        v = h.v;
        // @ts-ignore
        h = h.h;
    }
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0:
            r = v;
            g = t;
            b = p;
            break;
        case 1:
            r = q;
            g = v;
            b = p;
            break;
        case 2:
            r = p;
            g = v;
            b = t;
            break;
        case 3:
            r = p;
            g = q;
            b = v;
            break;
        case 4:
            r = t;
            g = p;
            b = v;
            break;
        case 5:
            r = v;
            g = p;
            b = q;
            break;
    }
    const red = Math.round(r * 255);
    const green = Math.round(g * 255);
    const blue = Math.round(b * 255);
    const decColor = 0x1000000 + blue + 0x100 * green + 0x10000 * red;
    return `#${decColor.toString(16).substr(1)}`;
}

function formatJsonVars(ref) {
    // remove all object keys that start with $
    const newRef = { ...ref };
    for (const key in newRef) {
        if (key.startsWith('$')) {
            delete newRef[key];
        }
    }
    // sort keys alphabetically
    const sortedKeys = Object.keys(newRef).sort();
    const sortedRef = {};
    sortedKeys.forEach((key) => {
        sortedRef[key] = newRef[key];
    });
    if ('displayName' in sortedRef) {
        // add _hexDisplayName to top
        return {
            // @ts-ignore
            _hexDisplayName: textToHex(sortedRef.displayName),
            ...sortedRef
        };
    }
    if (sortedRef.user?.displayName) {
        // add _hexDisplayName to top
        return {
            // @ts-ignore
            _hexDisplayName: textToHex(sortedRef.user.displayName),
            ...sortedRef
        };
    }
    if ('name' in sortedRef) {
        // add _hexName to top
        return {
            // @ts-ignore
            _hexName: textToHex(sortedRef.name),
            ...sortedRef
        };
    }
    return sortedRef;
}

function changeHtmlLangAttribute(language) {
    const htmlElement = document.documentElement;
    htmlElement.setAttribute('lang', language);
}

async function getThemeMode(configRepository) {
    const initThemeMode = await configRepository.getString(
        'VRCX_ThemeMode',
        'system'
    );

    let isDarkMode;
    if (initThemeMode === 'light') {
        isDarkMode = false;
    } else if (initThemeMode === 'system') {
        isDarkMode = systemIsDarkMode();
    } else {
        isDarkMode = true;
    }

    return { initThemeMode, isDarkMode };
}

function decodeBackgroundImageBase64(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

function encodeBackgroundImageBase64(bytes) {
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
}

function pickImageFileBytes() {
    return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.oncancel = () => resolve(null);
        input.onchange = () => {
            const file = input.files?.[0];
            if (!file) {
                resolve(null);
                return;
            }
            file.arrayBuffer()
                .then((buffer) => resolve(new Uint8Array(buffer)))
                .catch(() => resolve(null));
        };
        input.click();
    });
}

function pickBackgroundImageBytes() {
    if (BROWSER) {
        return pickImageFileBytes();
    }
    const patterns = BACKGROUND_IMAGE_EXTENSIONS.map((ext) => `*.${ext}`).join(';');
    const dialog = LINUX
        ? window.electron.openFileDialog([{ name: 'Images', extensions: BACKGROUND_IMAGE_EXTENSIONS }])
        : AppApi.OpenFileSelectorDialog('', '.png', `Images (${patterns})|${patterns}`);
    return dialog
        .then((path) => (path ? AppApi.GetFileBase64(path) : null))
        .then((base64) => (base64 ? decodeBackgroundImageBase64(base64) : null));
}

async function normalizeBackgroundImage(bytes) {
    if (bytes.length > BACKGROUND_IMAGE_MAX_SOURCE_BYTES) {
        throw new Error('Background image is too large');
    }
    const bitmap = await createImageBitmap(new Blob([bytes]));
    const scale = Math.min(1, BACKGROUND_IMAGE_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = new OffscreenCanvas(width, height);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await canvas.convertToBlob({ type: BACKGROUND_IMAGE_MIME, quality: 0.85 });
    return new Uint8Array(await blob.arrayBuffer());
}

async function pickBackgroundImage() {
    const bytes = await pickBackgroundImageBytes();
    if (!bytes?.length) {
        return '';
    }
    return encodeBackgroundImageBase64(await normalizeBackgroundImage(bytes));
}

function applyBackgroundImage(base64) {
    const root = document.documentElement;
    const existing = document.getElementById(BACKGROUND_IMAGE_STYLE_ID);
    if (!base64) {
        existing?.remove();
        root.classList.remove(BACKGROUND_IMAGE_CLASS);
        return;
    }
    const style = existing || document.createElement('style');
    style.id = BACKGROUND_IMAGE_STYLE_ID;
    style.textContent = `:root{--x-bg-image:url("data:${BACKGROUND_IMAGE_MIME};base64,${base64}")}`;
    if (!existing) {
        document.head.appendChild(style);
    }
    root.classList.add(BACKGROUND_IMAGE_CLASS);
}

function applyBackgroundImageOpacity(opacity) {
    const clamped = Math.min(1, Math.max(0, Number(opacity) || 0));
    document.documentElement.style.setProperty('--x-bg-alpha', `${Math.round((1 - clamped) * 100)}%`);
}

function redirectToToolsTab() {
    router.push({ name: 'tools' });
    toast(i18n.global.t('view.tools.redirect_message'), { duration: 3000 });
}

export {
    systemIsDarkMode,
    changeAppThemeStyle,
    useThemeColor,
    applyThemeColor,
    initThemeColor,
    updateTrustColorClasses,
    refreshCustomCss,
    refreshCustomScript,
    applyAppFontFamily,
    applyAppCjkFontPack,
    pickBackgroundImage,
    applyBackgroundImage,
    applyBackgroundImageOpacity,
    HueToHex,
    HSVtoRGB,
    formatJsonVars,
    changeHtmlLangAttribute,
    getThemeMode,
    redirectToToolsTab
};
