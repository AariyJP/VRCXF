// @ts-nocheck
import InteropApi from '../ipc-electron/interopApi.js';
import configRepository from '../services/config.js';
import vrcxJsonStorage from '../services/jsonStorage.js';

export async function initInteropApi(isVrOverlay = false) {
    if (BROWSER) {
        const { default: BrowserInterop } = await import('../ipc-browser/index.js');
        if (isVrOverlay) {
            window.AppApiVr = BrowserInterop.AppApiVr;
            return;
        }

        window.AppApi = BrowserInterop.AppApi;
        window.WebApi = BrowserInterop.WebApi;
        window.VRCXStorage = BrowserInterop.VRCXStorage;
        window.SQLite = BrowserInterop.SQLite;
        window.LogWatcher = BrowserInterop.LogWatcher;
        window.Discord = BrowserInterop.Discord;
        window.AssetBundleManager = BrowserInterop.AssetBundleManager;
        window.AppApiVr = BrowserInterop.AppApiVr;

        await configRepository.init();
        new vrcxJsonStorage(VRCXStorage);

        AppApi.SetUserAgent();
        return;
    }

    if (TAURI) {
        const { default: TauriInterop, createElectronShim } = await import(
            '../ipc-tauri/interopApi.js'
        );
        if (isVrOverlay) {
            window.AppApiVr = TauriInterop.AppApiVr;
            return;
        }

        window.AppApi = TauriInterop.AppApi;
        window.WebApi = TauriInterop.WebApi;
        window.VRCXStorage = TauriInterop.VRCXStorage;
        window.SQLite = TauriInterop.SQLite;
        window.LogWatcher = TauriInterop.LogWatcher;
        window.Discord = TauriInterop.Discord;
        window.AssetBundleManager = TauriInterop.AssetBundleManager;
        window.AppApiVr = TauriInterop.AppApiVr;
        window.electron = createElectronShim();

        await configRepository.init();
        new vrcxJsonStorage(VRCXStorage);

        AppApi.SetUserAgent();
        return;
    }

    if (isVrOverlay) {
        if (WINDOWS) {
            await CefSharp.BindObjectAsync('AppApiVr');
        } else {
            // @ts-ignore
            window.AppApiVr = InteropApi.AppApiVrElectron;
        }
    } else {
        // #region | Init Cef C# bindings
        if (WINDOWS) {
            await CefSharp.BindObjectAsync(
                'AppApi',
                'WebApi',
                'VRCXStorage',
                'SQLite',
                'LogWatcher',
                'Discord',
                'AssetBundleManager'
            );
        } else {
            window.AppApi = InteropApi.AppApiElectron;
            window.WebApi = InteropApi.WebApi;
            window.VRCXStorage = InteropApi.VRCXStorage;
            window.SQLite = InteropApi.SQLite;
            window.LogWatcher = InteropApi.LogWatcher;
            window.Discord = InteropApi.Discord;
            window.AssetBundleManager = InteropApi.AssetBundleManager;
            window.AppApiVrElectron = InteropApi.AppApiVrElectron;
        }

        await configRepository.init();
        new vrcxJsonStorage(VRCXStorage);

        AppApi.SetUserAgent();
    }
}
