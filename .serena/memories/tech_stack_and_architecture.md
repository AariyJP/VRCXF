# Tech Stack and Architecture

## Directory Structure

```
VRCX/
├── src/                    # Frontend (Vue 3)
│   ├── app.js              # Entry point
│   ├── App.vue             # Root component
│   ├── index.html          # Main HTML
│   ├── vr.html             # VR overlay HTML
│   ├── vite.config.js      # Vite config
│   ├── api/                # VRChat API Wrappers
│   ├── components/         # UI Components
│   │   ├── ui/             # shadcn-vue UI primitives 
│   │   └── dialogs/        # Dialogs 
│   ├── composables/        # Vue Composables
│   ├── lib/                # Utilities
│   ├── localization/       # i18n JSON 
│   ├── plugin/             # Vue plugin initialization
│   │   ├── router.js       # Route definitions
│   │   ├── i18n.js         # vue-i18n config
│   │   ├── interopApi.js   # .NET binding initialization
│   │   ├── sentry.js       # Sentry initialization
│   │   └── components.js   # Global component registration
│   ├── service/            # Service layer
│   │   ├── websocket.js    # VRChat WebSocket
│   │   ├── request.js      # HTTP
│   │   ├── webapi.js       # WebApiService
│   │   ├── database.js     # DB operation centralization
│   │   ├── database/       # DB schemas
│   │   ├── config.js       # ConfigRepository
│   │   ├── sqlite.js       # SQLite service
│   │   └── appConfig.js    # AppDebug
│   ├── shared/
│   │   ├── constants/      # Constants
│   │   └── utils/          # Utilities
│   ├── stores/             # Pinia stores
│   │   ├── index.js        # createGlobalStores()
│   │   ├── auth.js         # Authentication
│   │   ├── user.js         # User
│   │   ├── friend.js       # Friend management
│   │   ├── notification.js # Notifications
│   │   └── settings/       # Settings stores
│   ├── styles/             # Styles
│   │   ├── globals.css     # TailwindCSS + CSS variables
│   │   └── themes/         # Theme CSS 
│   ├── types/              # TypeScript type definitions
│   │   ├── globals.d.ts    # Global types
│   │   └── api/            # API type definitions
│   ├── views/              # Pages
│   └── vr/                 # VR overlay UI
├── src-electron/           # Electron Main (macOS/Linux only)
│   ├── main.js             # Main process 
│   ├── preload.js          # Preload
│   ├── InteropApi.js       # .NET Interop
│   └── offscreen.html      # VR overlay offscreen window
├── Dotnet/                 # .NET Backend
│   ├── Program.cs          # Entry point
│   ├── AppApi/
│   │   ├── Common/         # Cross-platform shared API 
│   │   ├── Cef/            # CEF-specific API 
│   │   └── Electron/       # Electron-specific API 
│   ├── LogWatcher.cs       # VRChat log monitoring 
│   ├── WebApi.cs           # Web API client
│   ├── SQLite.cs           # Database
│   ├── Discord.cs          # Discord Rich Presence
│   ├── ProcessMonitor.cs   # VRChat process monitoring
│   ├── ImageCache.cs       # Image cache
│   ├── VRCXStorage.cs      # KV settings storage
│   ├── Update.cs           # Auto-update
│   ├── AssetBundleManager.cs # VRChat cache management
│   ├── AutoAppLaunchManager.cs # Auto startup
│   ├── StartupArgs.cs      # Startup argument parser
│   ├── Overlay/            # VR overlay
│   ├── ScreenshotMetadata/ # Screenshot metadata
│   ├── IPC/                # IPC 
│   ├── Cef/                # CEF browser 
│   ├── DBMerger/           # DB merge tool
│   ├── VRCX-Cef.csproj     # Windows CEF build (.NET 10, MUST be --self-contained)
│   ├── VRCX-Electron.csproj # Electron x64 build (.NET 9)
│   └── VRCX-Electron-arm64.csproj
├── Installer/              # NSIS (installer.nsi)
├── build-scripts/          # Build scripts
└── .github/workflows/      # CI/CD
```

## Routing (`src/plugin/router.js`)

- `/login` → Login (public)
- `/` → MainLayout (requiresAuth)
  - `/feed` (default)
  - `/friends-locations`
  - `/game-log`
  - `/player-list`
  - `/search`
  - `/favorites/friends|worlds|avatars`
  - `/social/friend-log|moderation|friend-list`
  - `/notification`
  - `/charts/instance|mutual` (lazy import)
  - `/tools`
  - `/tools/gallery|screenshot-metadata`
  - `/settings`

Authentication Guard: Checks `watchState.isLoggedIn`, redirects to `/login` if unauthenticated.

## Global Objects (window)

Bound via `CefSharp.BindObjectAsync` on Windows (CEF) and via `InteropApi` Proxy on Linux (Electron).

Exposed Objects:
- `AppApi`: App operations (DevTools, VR, zoom, notifications, clipboard, game launch/exit, registry, images, screenshots, updates, folder operations)
- `VRCXStorage`: KV storage (Get/Set/Remove/GetAll/Flush/Save/Load/GetArray/SetArray/GetObject/SetObject)
- `SQLite`: DB operations (Execute/ExecuteJson/ExecuteNonQuery)
- `LogWatcher`: VRChat log (Get/SetDateTill/GetLogLines/Reset)
- `Discord`: Rich Presence (SetAssets/SetActive)
- `WebApi`: HTTP (ClearCookies/GetCookies/SetCookies/Execute/ExecuteJson)
- `webApiService`: JS wrapper for WebApi (LINUX → ExecuteJson, WINDOWS → Execute)

Type definitions: `src/types/globals.d.ts`

## Persistence of Settings

### ConfigRepository (`src/service/config.js`)
- KV storage in SQLite `configs` table.
- Keys use the `config:` prefix.
- Examples: `VRCX_appLanguage`, `VRCX_ThemeMode`, `VRCX_lastDarkTheme`, `VRCX_fontFamily`, `VRCX_tablePageSize`, `VRCX_navPanelWidth`, etc.

### VRCXStorage
- .NET-side KV (file-based).

## Database Schema (`src/service/database/`)

Tables:
- feed
- gameLog
- notifications
- moderation
- friendLogHistory
- friendLogCurrent
- memos
- avatarFavorites
- avatarTags
- friendFavorites
- worldFavorites
- tableAlter (Migration)
- tableFixes
- tableSize
- mutualGraph

## Themes

Themes: blue, green, midnight, orange, red, rednight, rose, violet, yellow.
Theme modes: light / dark / system + color themes.
CSS: `src/styles/themes/`.

## Vue App Initialization Order

1. `initPlugins` → `initPiniaPlugins`
2. `createApp`
3. `pinia`, `i18n`
4. `initComponents`
5. `initRouter`
6. `initSentry`
7. `mount('#root')`

## Store Initialization

1. All stores created in `createGlobalStores()`.
2. Saved in `window.$pinia`.
3. `updateLoop` starts in `onBeforeMount`.
4. `gameLog/auth/vrcx/game` initialized in `onMounted`.

## .NET Interop Pattern

The Electron version uses the Proxy pattern via `window.interopApi.callDotNetMethod(className, methodName, args)`.

## Preconnect Targets

- api.vrchat.cloud
- files.vrchat.cloud
- d348imysud55la.cloudfront.net

## i18n

- Dynamic loading (Vite chunk splitting by language code).
- Fonts are also chunk-split by language.

## components.json

shadcn-vue CLI configuration file.
