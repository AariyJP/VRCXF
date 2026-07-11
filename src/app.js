import { VueQueryPlugin } from '@tanstack/vue-query';
import { createApp } from 'vue';

import {
    i18n,
    initComponents,
    initPlugins,
    initRouter,
    initSentry
} from './plugins';
import { loadWebSocketAutoConnectPreference } from './services/websocket';
import { initPiniaPlugins, pinia } from './stores';
import { queryClient } from './queries';

import App from './App.vue';

await initPlugins();
await initPiniaPlugins();
await loadWebSocketAutoConnectPreference();

// #region | Hey look it's most of VRCX!

const app = createApp(App);

app.config.globalProperties.BROWSER = BROWSER;
app.config.globalProperties.WINDOWS = WINDOWS;
app.config.globalProperties.LINUX = LINUX;
app.config.globalProperties.TAURI = TAURI;

app.use(pinia).use(i18n).use(VueQueryPlugin, { queryClient });
initComponents(app);
initRouter(app);
await initSentry(app);

app.mount('#root');
