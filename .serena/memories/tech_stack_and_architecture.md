# Tech Stack and Architecture

## Frontend

- Vue 3
- Pinia
- Vue Router (hash history)
- Vite 7
- TailwindCSS 4
- shadcn-vue / reka-ui
- vue-i18n
- Vitest
- @tanstack/vue-query
- ECharts
- Graphology + Sigma
- vue-sonner

## Backend / Desktop

- C# / .NET 10 for `Dotnet/VRCX-Cef.csproj`
- C# / .NET 9 for `Dotnet/VRCX-Electron.csproj` and `Dotnet/VRCX-Electron-arm64.csproj`
- Electron 39 on macOS/Linux
- CEF/CefSharp 144 on Windows
- SQLite
- node-api-dotnet

## Key Directories

- `src/api/`: VRChat API wrappers
- `src/components/`: shared components and dialogs
- `src/composables/`: Vue composables
- `src/ipc-electron/`: Electron IPC helpers for renderer
- `src/plugin/`: bootstrap plugins (`dayjs`, `i18n`, `interopApi`, `noty`, `router`, `sentry`, `ui`)
- `src/public/`: static assets copied by Vite
- `src/query/`: Vue Query client, keys, cache, query helpers
- `src/service/`: request, websocket, webapi, database, config, sqlite, appConfig, jsonStorage, watchState
- `src/shared/`: constants and shared utilities
- `src/stores/coordinators/`: flow orchestration layer
- `src/stores/gameLog/`, `src/stores/notification/`: store submodules
- `src/views/MyAvatars/`: My Avatars route
- `src/styles/globals.css` + `src/app.css`: styling split
- `src-electron/`: Electron main/preload/build helpers
- `Dotnet/AppApi/Common|Cef|Electron/`: native API layers

## App Bootstrap

`src/app.js` currently initializes in this order:

1. `initPlugins()`
2. `initPiniaPlugins()`
3. `createApp(App)`
4. install `pinia`, `i18n`, `VueQueryPlugin`
5. `initComponents(app)`
6. `initRouter(app)`
7. `initSentry(app)`
8. `app.mount('#root')`

## Root App Shell

`src/App.vue` includes:

- `TooltipProvider`
- `MacOSTitleBar`
- `RouterView`
- `Toaster`
- `AlertDialogModal`
- `PromptDialogModal`
- `OtpDialogModal`
- `VRCXUpdateDialog`
- `#x-dialog-portal`

## Routes

Main authenticated routes currently include:

- `/feed`
- `/friends-locations`
- `/game-log`
- `/player-list`
- `/search`
- `/favorites/friends`
- `/favorites/worlds`
- `/favorites/avatars`
- `/social/friend-log`
- `/social/moderation`
- `/social/friend-list`
- `/my-avatars`
- `/notification`
- `/charts/instance`
- `/charts/mutual`
- `/tools`
- `/tools/gallery`
- `/tools/screenshot-metadata`
- `/settings`

Router uses return-based guards and blocks `/social` itself.

## Globals

Typed in `src/types/globals.d.ts`:

- `AppApi`
- `AppApiVr`
- `WebApi`
- `VRCXStorage`
- `SQLite`
- `LogWatcher`
- `Discord`
- `AssetBundleManager`
- `webApiService`
- `window.interopApi`
- `window.electron`
- `window.$pinia`

## Persistence / Data

- Configs: `src/service/config.js`
- Native KV storage: `VRCXStorage`
- DB schema modules: `feed`, `gameLog`, `notifications`, `moderation`, `friendLogHistory`, `friendLogCurrent`, `memos`, `avatarFavorites`, `avatarTags`, `friendFavorites`, `worldFavorites`, `mutualGraph`, `tableAlter`, `tableFixes`, `tableSize`

## Styling / Assets

- TailwindCSS 4 + CSS variables
- Themes in `src/styles/themes/`
- Static assets in `src/public/`
- Vite build target currently `chrome144`
