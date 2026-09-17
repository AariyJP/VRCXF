import { getFocusedWindow } from './activeWindowTracker';

function requireClipboard() {
    const clipboard = getFocusedWindow()?.navigator?.clipboard;
    if (!clipboard) {
        throw new Error('Clipboard API is unavailable');
    }
    return clipboard;
}

export async function writeClipboardText(text) {
    return requireClipboard().writeText(text);
}

export async function readClipboardText() {
    return requireClipboard().readText();
}

export async function writeClipboardImage(blob, type = 'image/png') {
    const targetWindow = getFocusedWindow();
    const ClipboardItemCtor = targetWindow?.ClipboardItem ?? globalThis.ClipboardItem;
    return requireClipboard().write([new ClipboardItemCtor({ [type]: blob })]);
}
