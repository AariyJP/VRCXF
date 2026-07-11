import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { arch } from '@tauri-apps/plugin-os';

function callNative(namespace, method, args) {
    return invoke('call_native', { namespace, method, args });
}

function createNamespaceProxy(namespace) {
    return new Proxy(
        {},
        {
            get(_, methodName) {
                if (typeof methodName !== 'string') {
                    return undefined;
                }
                if (methodName === 'then') {
                    return undefined;
                }
                return (...args) => callNative(namespace, methodName, args);
            }
        }
    );
}

const namespaces = [
    'AppApi',
    'WebApi',
    'VRCXStorage',
    'SQLite',
    'LogWatcher',
    'Discord',
    'AssetBundleManager',
    'AppApiVr'
];

const interopApi = {};
for (const namespace of namespaces) {
    interopApi[namespace] = createNamespaceProxy(namespace);
}

function toUnsubscribe(unlistenPromise) {
    return () => {
        unlistenPromise
            .then((unlisten) => unlisten())
            .catch((err) => console.error(err));
    };
}

export function createElectronShim() {
    const appWindow = getCurrentWindow();
    return {
        getArch: async () => arch(),
        getClipboardText: () => callNative('AppApi', 'GetClipboard', []),
        getNoUpdater: async () => true,
        setTrayIconNotification: (notify) =>
            callNative('AppApi', 'SetTrayIconNotification', [notify]),
        openFileDialog: () =>
            callNative('AppApi', 'OpenFileSelectorDialog', []),
        openDirectoryDialog: () =>
            callNative('AppApi', 'OpenFolderSelectorDialog', []),
        desktopNotification: (displayName, body, image) =>
            callNative('AppApi', 'DesktopNotification', [
                displayName,
                body ?? '',
                image ?? ''
            ]),
        onWindowPositionChanged: (callback) =>
            toUnsubscribe(
                appWindow.onMoved(({ payload }) => {
                    callback(null, { x: payload.x, y: payload.y });
                })
            ),
        onWindowSizeChanged: (callback) =>
            toUnsubscribe(
                appWindow.onResized(({ payload }) => {
                    callback(null, {
                        width: payload.width,
                        height: payload.height
                    });
                })
            ),
        onWindowStateChange: () => () => {},
        onBrowserFocus: (callback) =>
            toUnsubscribe(
                appWindow.onFocusChanged(({ payload }) => {
                    if (payload) {
                        callback(null);
                    }
                })
            ),
        restartApp: () => callNative('AppApi', 'RestartApplication', [false]),
        getOverlayWindow: async () => false,
        updateVr: async () => {},
        ipcRenderer: {
            on: () => () => {}
        }
    };
}

export default interopApi;
