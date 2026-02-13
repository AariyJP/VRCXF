# VRCXF

> **📝 Documentation Sync Rule**: This project has 4 agent instruction files: `AGENTS.md`, `CLAUDE.md`, `.clinerules/CLINE.md`, and `.gemini/GEMINI.md`. **When updating any of these files, you MUST update all 4 files simultaneously** to keep them in sync.

**All responses to the user MUST be in Japanese (日本語).**

VRChat friend management desktop app. Fork of [vrcx-team/VRCX](https://github.com/vrcx-team/VRCX) (by AariyJP). MIT license.

## 🔧 Serena MCP Integration

**When Serena MCP server is available, you MUST maximize its usage for all code-related tasks.**

Serena MCP provides powerful tools for code exploration, analysis, and editing. Always prefer Serena tools over standard file operations when:

- **Exploring code structure**: Use `mcp_serena_get_symbols_overview` and `mcp_serena_find_symbol` instead of manual file reading
- **Searching code**: Use `mcp_serena_search_for_pattern` for pattern matching and `mcp_serena_find_referencing_symbols` for reference tracking
- **Editing code**: Use symbol-level editing tools (`mcp_serena_replace_symbol_body`, `mcp_serena_insert_before_symbol`, `mcp_serena_insert_after_symbol`) for precise modifications
- **Refactoring**: Use `mcp_serena_rename_symbol` for safe, project-wide symbol renaming
- **Understanding project context**: Read relevant memories from `mcp_serena_list_memories` and `mcp_serena_read_memory`

Before starting any code task:

1. Check `mcp_serena_check_onboarding_performed` to verify project setup
2. Review available memories with `mcp_serena_list_memories` for relevant context
3. Use Serena's symbol-aware tools for all code exploration and modification

## ⚠ Required: Cross-Platform Implementation

**All tasks MUST be implemented with cross-platform compatibility in mind.**

Platform configuration:

- **Windows**: CEF (CefSharp) — `Dotnet/Cef/`, `Dotnet/AppApi/Cef/`, `VRCX-Cef.csproj`
- **macOS/Linux**: Electron + node-api-dotnet — `src-electron/`, `Dotnet/AppApi/Electron/`, `VRCX-Electron.csproj`

Branching patterns:

- **Frontend JS**: Branch using global constants `WINDOWS`/`LINUX` (`if (WINDOWS) {...} else {...}`)
- **Native API calls**: Windows = direct binding via `CefSharp.BindObjectAsync`, macOS/Linux = `InteropApi` Proxy (`window.interopApi.callDotNetMethod`)
- **WebApi execution**: Branching inside `webApiService.execute()` — WINDOWS = `WebApi.Execute()` (returns `{Item1, Item2}`), LINUX = `WebApi.ExecuteJson()` (JSON string)
- **.NET side**: `AppApi/Common/` = shared, `AppApi/Cef/` = Windows only, `AppApi/Electron/` = macOS/Linux only. Conditional compilation via `#if LINUX` / `#if !LINUX` in csproj
- **Electron-specific**: `window.electron` (exposed via preload) exists only on macOS/Linux. File dialogs, desktop notifications, window operations, etc.

Implementation checklist:

1. When calling a new native API from the frontend → add a shared method in `AppApi/Common/`, or implement in both `Cef/` and `Electron/`
2. For `WINDOWS`/`LINUX` branching logic, refer to existing patterns (`src/plugin/interopApi.js`, `src/service/webapi.js`)
3. When using Electron-only APIs (`window.electron.*`), consider fallback implementations for Windows (CEF)
4. When modifying .NET code, ensure it builds successfully with both `VRCX-Cef.csproj` and `VRCX-Electron.csproj`

## Stack

- **Frontend**: Vue 3 (Composition API / `<script setup>`), Pinia, Vue Router (hash mode), Vite 7, TailwindCSS 4, shadcn-vue (reka-ui, new-york style), LightningCSS, ECharts, Graphology + Sigma, vue-i18n (14 languages), Jest, Sentry
- **Backend**: C# / .NET 9, SQLite, OpenVR, node-api-dotnet (JS ⇄ .NET interop)
- **Desktop**: Electron 39, electron-builder, CEF (Windows only)
- **Platform**: Windows / Linux (AppImage) / macOS (dmg), x64 + arm64

## Architecture

Electron Main (`src-electron/main.js`) → .NET Runtime (`Dotnet/`) via node-api-dotnet → VRChat API / WebSocket

- Frontend (Renderer): Vue 3 SPA → VRChat REST API (`src/service/request.js`) + WebSocket (`src/service/websocket.js`)
- .NET side: Log parsing (`LogWatcher.cs`), DB (`SQLite.cs`), VR overlay (`Overlay/`), Discord RP (`Discord.cs`), Process monitoring (`ProcessMonitor.cs`)
- IPC: `src-electron/InteropApi.js` ⇄ `Dotnet/AppApi/`

## Directory Structure

```
src/                    # Frontend (Vue 3)
  app.js                # Entry: createApp → pinia, i18n, router, sentry → mount('#root')
  App.vue               # Root: TooltipProvider, RouterView, Toaster, AlertDialog, VRCXUpdateDialog
  index.html            # Main HTML (root=#root, preconnect: api.vrchat.cloud, files.vrchat.cloud)
  vr.html               # VR overlay HTML
  vite.config.js        # Vite config (base:'', port:9000, outDir:../build/html, target:chrome140)
  api/                  # VRChat API wrappers (auth, avatar, avatarModeration, favorite, friend, group, image, instance, inventory, inviteMessages, misc, notification, playerModeration, prop, user, vrcPlusIcon, vrcPlusImage, world)
  components/           # UI components
    ui/                 #   shadcn-vue UI primitives (304 files)
    dialogs/            #   Dialogs (48 files)
    NavMenu.vue         #   Main navigation
  composables/          # Vue Composables
  lib/                  # Utilities (includes utils, shadcn-vue alias @/lib/utils)
  localization/         # i18n JSON (cs, en, es, fr, hu, ja, ko, pl, pt, ru, th, vi, zh-CN, zh-TW)
  plugin/               # Vue plugin initialization
    router.js           #   Route definitions + nav guards (auth check)
    i18n.js             #   vue-i18n configuration
    interopApi.js       #   .NET binding init (WINDOWS → CefSharp.BindObjectAsync, LINUX → InteropApi proxy)
    sentry.js           #   Sentry initialization
    components.js       #   Global component registration
  service/              # Service layer
    websocket.js        #   VRChat WebSocket (wss://pipeline.vrchat.cloud, auto-reconnect 5s)
    request.js          #   HTTP (GET dedup 10s, 404/403 cache 15min, processBulk pagination)
    webapi.js           #   WebApiService: LINUX → ExecuteJson, WINDOWS → Execute (Item1, Item2)
    database.js         #   DB operations aggregation (initTables, initUserTables, begin/commit/vacuum/optimize)
    database/           #   DB schemas (feed, gameLog, notifications, moderation, friendLogHistory, friendLogCurrent, memos, avatarFavorites, worldFavorites, tableAlter, tableFixes, tableSize, mutualGraph)
    config.js           #   ConfigRepository: SQLite configs table (getString/setString/getBool/getInt/getObject/getArray)
    sqlite.js           #   SQLite service wrapper
    appConfig.js        #   AppDebug: endpointDomain (api.vrchat.cloud/api/1), websocketDomain (wss://pipeline.vrchat.cloud), debug flags
    confusables.js      #   Unicode confusable character handling
    jsonStorage.js      #   VRCXStorage JSON wrapper
    gamelog.js          #   Game log service
    watchState.js       #   Reactive state (isLoggedIn, isFriendsLoaded)
  shared/
    constants/          # Constants (accessType, api, discord, emoji, feedFilters, fonts, group, instance, language, link, moderation, ossLicenses, photon, settings, themes, ui, user, world + remixIconTags.json)
    utils/              # Utilities (avatar, chart, common, compare, friend, gallery, group, imageUpload, instance, invite, location, memos, retry, setting, throttle, user, world + base/ = 9 files + __tests__/)
  stores/               # Pinia stores
    index.js            #   createGlobalStores(): creates all stores and stores them in window.$pinia
    auth.js             #   Authentication (login/logout/2FA/migrateStoredUsers/autoLogin)
    user.js             #   User (cachedUsers: Map, currentUser, applyUser, applyCurrentUser)
    friend.js           #   Friend management
    notification.js     #   Notifications
    instance.js         #   Instance (includes queue management)
    favorite.js         #   Favorites
    gameLog.js          #   Game log
    photon.js           #   Photon network
    gallery.js          #   Gallery / VRC+ images
    group.js            #   Groups
    search.js           #   Search
    location.js         #   Current location
    modal.js            #   Modal / dialog state
    updateLoop.js       #   Periodic update loop
    vrcx.js             #   VRCX-specific features
    vrcxUpdater.js      #   App auto-updater
    vrcStatus.js        #   VRChat status
    ui.js               #   UI state (notifyMenu, etc.)
    feed.js             #   Feed
    sharedFeed.js       #   Shared feed
    avatar.js           #   Avatar
    avatarProvider.js   #   Avatar provider
    world.js            #   World
    charts.js           #   Charts
    moderation.js       #   Moderation
    invite.js           #   Invite
    launch.js           #   App launch
    game.js             #   VRChat game state
    vr.js               #   VR overlay
    settings/           #   Settings stores
      appearance.js     #     Theme (9 themes) / language / font / table density / trust color / sidebar sort / nav width
      advanced.js       #     Advanced settings
      general.js        #     General settings
      notifications.js  #     Notification settings
      discordPresence.js #    Discord RP settings
      wristOverlay.js   #     Wrist overlay settings
  styles/
    globals.css         #   TailwindCSS + CSS variables (theme colors)
    fonts.css           #   Font settings
    noty.css            #   Notification toast
    flags.css           #   Country flag icons
    animated-emoji.css  #   Animated emoji
    themes/             #   Theme CSS (blue, green, midnight, orange, red, rednight, rose, violet, yellow)
  types/                # TypeScript type definitions
    globals.d.ts        #   Global types (AppApi, VRCXStorage, SQLite, LogWatcher, Discord, WebApi, AppApiVr, AssetBundleManager, webApiService, window.electron)
    api/                #   API type definitions (9 files)
    common.d.ts         #   Common types
  views/                # Pages
    Login/              #   Login (2FA support)
    Layout/MainLayout   #   Main layout (requires auth)
    Feed/               #   Feed (default page)
    FriendsLocations/   #   Friend locations
    GameLog/            #   Game log
    PlayerList/         #   Player list (5 files)
    Search/             #   Search
    Favorites/          #   Favorites (Friend/World/Avatar, 20 files)
    Charts/             #   Charts (InstanceActivity, MutualFriends, 11 files)
    Notifications/      #   Notifications (8 files)
    FriendLog/          #   Friend log
    FriendList/         #   Friend list
    Moderation/         #   Moderation
    Settings/           #   Settings (22 files)
    Tools/              #   Tools (Gallery, ScreenshotMetadata, etc., 19 files)
    Sidebar/            #   Sidebar (4 files)
  vr/                   # VR overlay UI (4 files)
src-electron/           # Electron Main
  main.js               # Main process (916 lines): window mgmt, tray, IPC, VR overlay (shared memory), single instance lock
  preload.js            # Preload: exposes ipcRenderer via contextBridge
  InteropApi.js         # .NET interop (getDotNetObject → Proxy pattern)
  offscreen.html        # VR overlay offscreen window
Dotnet/                 # .NET Backend
  Program.cs            # Entry point (Program: CEF version, ProgramElectron: Electron version)
  AppApi/
    Common/             #   Cross-platform shared API (10 files)
    Cef/                #   CEF-specific API (6 files)
    Electron/           #   Electron-specific API (5 files)
  LogWatcher.cs         # VRChat log monitoring (58KB)
  WebApi.cs             # Web API client (cookie management, HTTP execution)
  SQLite.cs             # DB (Execute/ExecuteJson/ExecuteNonQuery)
  Discord.cs            # Discord Rich Presence (SetAssets/SetActive)
  ProcessMonitor.cs     # VRChat process monitoring
  ImageCache.cs         # Image cache
  VRCXStorage.cs        # Key-value settings storage (Get/Set/Remove/Save/Load)
  Update.cs             # Auto-update (DownloadUpdate/CheckUpdateProgress)
  AssetBundleManager.cs # VRChat cache management
  AutoAppLaunchManager.cs # Auto app launch on VRChat start
  StartupArgs.cs        # Startup argument parser
  Overlay/              # VR overlay (OpenVR, CEF/Electron branching)
  ScreenshotMetadata/   # Screenshot metadata (PNG XMP tag read/write)
  IPC/                  # Inter-process communication (4 files)
  Cef/                  # CEF browser (14 files)
  DBMerger/             # DB merge tool
  VRCX-Cef.csproj       # Windows CEF build
  VRCX-Electron.csproj  # Electron x64 build
  VRCX-Electron-arm64.csproj
Installer/              # NSIS (installer.nsi)
build-scripts/          # Build scripts (build-all.ps1, etc.)
.github/workflows/      # CI/CD (build.yml, github_actions.yml, release.yml)
```

## Routes (`src/plugin/router.js`)

`/login` → Login (public), `/` → MainLayout (requiresAuth) children: `/feed` (default), `/friends-locations`, `/game-log`, `/player-list`, `/search`, `/favorites/friends|worlds|avatars`, `/social/friend-log|moderation|friend-list`, `/notification`, `/charts/instance|mutual` (lazy import), `/tools`, `/tools/gallery|screenshot-metadata`, `/settings`

Auth guard: checks `watchState.isLoggedIn`, redirects to `/login` when unauthenticated

## Global Objects (window)

On WINDOWS (CEF), bound via `CefSharp.BindObjectAsync`. On LINUX (Electron), bound via `InteropApi` Proxy. Exposed objects:
`AppApi`, `WebApi`, `VRCXStorage`, `SQLite`, `LogWatcher`, `Discord`, `AssetBundleManager`
Type definitions: see `src/types/globals.d.ts`.

Key APIs:

- `AppApi`: App operations (DevTools, VR, zoom, notifications, clipboard, game launch/quit, registry, images, screenshots, updates, folder operations)
- `VRCXStorage`: KV storage (Get/Set/Remove/GetAll/Flush/Save/Load/GetArray/SetArray/GetObject/SetObject)
- `SQLite`: DB operations (Execute/ExecuteJson/ExecuteNonQuery)
- `LogWatcher`: VRChat log (Get/SetDateTill/GetLogLines/Reset)
- `Discord`: Rich Presence (SetAssets/SetActive)
- `WebApi`: HTTP (ClearCookies/GetCookies/SetCookies/Execute/ExecuteJson)
- `webApiService`: JS wrapper for WebApi (LINUX → ExecuteJson, WINDOWS → Execute)

## Settings Persistence

`ConfigRepository` (`src/service/config.js`): KV storage in SQLite `configs` table. Keys prefixed with `config:`.
`VRCXStorage`: .NET-side KV (file-based).

Config key examples (configRepository): `VRCX_appLanguage`, `VRCX_ThemeMode`, `VRCX_lastDarkTheme`, `VRCX_fontFamily`, `VRCX_tablePageSize`, `VRCX_navPanelWidth`, `VRCX_sidebarGroupByInstance`, `VRCX_hideNicknames`, `VRCX_randomUserColours`, `VRCX_trustColor`, `VRCX_tableDensity`, etc.

## VRChat API

- REST: `https://api.vrchat.cloud/api/1` (`AppDebug.endpointDomain`)
- WebSocket: `wss://pipeline.vrchat.cloud` (`AppDebug.websocketDomain`)
- HTTP: `request(endpoint, options)` in `src/service/request.js` → `webApiService.execute()` → .NET `WebApi.Execute`
- GET request dedup (10s), 404/403 retry suppression (15min)
- WebSocket events: notification, notification-v2, see-notification, hide-notification, friend-add/delete/online/active/offline/update/location, user-update/location, group-joined/left/role-updated/member-updated, instance-queue-\*, content-refresh, instance-closed

## DB Schema (`src/service/database/`)

Tables: feed, gameLog, notifications, moderation, friendLogHistory, friendLogCurrent, memos, avatarFavorites, worldFavorites + tableAlter (migration), tableFixes, tableSize, mutualGraph

## Themes

9 themes: blue, green, midnight, orange, red, rednight, rose, violet, yellow (CSS files in `src/styles/themes/`)
Theme modes: light / dark / system + color themes

## Dev Commands

```
npm run dev              # Vite dev (PLATFORM=windows, port 9000)
npm run dev-linux        # Vite dev (PLATFORM=linux)
npm test                 # Jest
npm run test:coverage    # Jest coverage
npm run prod             # Production build (PLATFORM=windows)
npm run prod-linux       # Production build (PLATFORM=linux)
npm run build-electron   # Electron build x64
npm run build-electron-arm64
npm run start-electron   # Start Electron (--hot-reload)
npm run localization     # i18n helper CLI
```

## Code Style

- Prettier: printWidth: 80 (JS) / 120 (Vue), tabWidth: 4, singleQuote, trailingComma: none, parser: meriyah (JS), bracketSameLine + vueIndentScriptAndStyle (Vue)
- ESLint: flat config, vue/essential, prettier plugin, pretty-import plugin (import sorting)
- Global variables: CefSharp, VRCXStorage, SQLite, LogWatcher, Discord, AppApi, AppApiVr, WebApi, AssetBundleManager, WINDOWS, LINUX, VERSION, NIGHTLY
- TypeScript: allowJs + checkJs, strict: false, noEmit, moduleResolution: bundler
- Files are primarily JS (.js / .vue), type definitions only in .d.ts
- **No code comments**: Do not insert explanatory comments in code changes. Code should be self-explanatory through clear variable/function names and structure

## Key Notes

- `PLATFORM` env var (`windows` / `linux`) for platform branching. Vite define creates `LINUX` / `WINDOWS` / `VERSION` / `NIGHTLY` global constants
- `NIGHTLY`: true in development mode or when version ends with a 7-char commit hash
- WebSocket auto-reconnect (5s interval), uses `worker-timers` (works even in background tabs)
- VR overlay: Linux = shared memory (`/dev/shm/vrcx_overlay`), Windows = CEF offscreen
- .NET projects: VRCX-Cef (Win), VRCX-Electron (x64), VRCX-Electron-arm64, DBMerger
- Path alias: `@` → `src/` (vite.config.js + tsconfig)
- Version: managed in `./Version` file (current: 0.0.0-develop)
- Vue app init order: initPlugins → initPiniaPlugins → createApp → pinia, i18n → initComponents → initRouter → initSentry → mount
- Store init: `createGlobalStores()` creates all stores → stored in `window.$pinia` → `onBeforeMount` starts updateLoop → `onMounted` initializes gameLog/auth/vrcx/game
- `.NET interop` pattern: Electron version uses Proxy via `window.interopApi.callDotNetMethod(className, methodName, args)`
- Preconnect targets: api.vrchat.cloud, files.vrchat.cloud, d348imysud55la.cloudfront.net
- i18n: dynamic loading (Vite chunk splitting per language code), fonts also chunked per language
- components.json: shadcn-vue CLI configuration
