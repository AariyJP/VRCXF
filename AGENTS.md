# VRCXF

> [!NOTE]
> This project uses `AGENTS.md` as the single source of truth for agent instructions.
> `CLAUDE.md`, `.clinerules/CLINE.md`, and `.gemini/GEMINI.md` are symbolic links to this file.

**All responses to the user MUST be in Japanese (日本語).**

VRChat friend management desktop app. Fork of [vrcx-team/VRCX](https://github.com/vrcx-team/VRCX) maintained as VRCXF by AariyJP. MIT license.

## 🔧 Serena MCP Integration

**When Serena MCP server is available, you MUST maximize its usage for all code-related tasks.**

Always prefer Serena tools over manual file reads when possible:

- **Code structure**: `mcp_serena_get_symbols_overview`, `mcp_serena_find_symbol`
- **Search**: `mcp_serena_search_for_pattern`, `mcp_serena_find_referencing_symbols`
- **Edits**: `mcp_serena_replace_symbol_body`, `mcp_serena_replace_content`, `mcp_serena_insert_before_symbol`, `mcp_serena_insert_after_symbol`
- **Refactors**: `mcp_serena_rename_symbol`
- **Context**: `mcp_serena_list_memories`, `mcp_serena_read_memory`

Before starting a code task:

1. Check `mcp_serena_check_onboarding_performed`
2. Review relevant memories with `mcp_serena_list_memories`
3. Use symbol-aware exploration/editing whenever feasible

## ⚠ Required: Cross-Platform Implementation

**All tasks MUST be implemented with cross-platform compatibility in mind.**

Platform configuration:

- **Windows**: CEF (CefSharp) — `Dotnet/Cef/`, `Dotnet/AppApi/Cef/`, `Dotnet/Overlay/Cef/`, `Dotnet/VRCX-Cef.csproj`
- **macOS/Linux**: Electron + node-api-dotnet — `src-electron/`, `Dotnet/AppApi/Electron/`, `Dotnet/Overlay/Electron/`, `Dotnet/VRCX-Electron.csproj`

Branching patterns:

- **Frontend JS**: branch with `WINDOWS` / `LINUX`
- **Native API calls**: Windows = direct globals via `CefSharp.BindObjectAsync`, macOS/Linux = proxy via `window.interopApi.callDotNetMethod`
- **Interop bootstrap**: `src/plugins/interopApi.js` initializes globals, `src/ipc-electron/interopApi.js` exposes the Electron-side proxy helper
- **WebApi execution**: `src/services/webapi.js` branches to `WebApi.Execute()` on Windows and `WebApi.ExecuteJson()` on macOS/Linux
- **.NET side**: shared logic in `Dotnet/AppApi/Common/`, platform-specific code in `Dotnet/AppApi/Cef/` and `Dotnet/AppApi/Electron/`
- **Electron-only APIs**: `window.electron.*` exists only on macOS/Linux

Implementation checklist:

1. When adding a new native API used by the frontend, implement it in a shared surface or in both platform backends
2. For frontend platform branching, follow existing patterns in `src/plugins/interopApi.js` and `src/services/webapi.js`
3. If using `window.electron.*`, provide a Windows-compatible path when required
4. When modifying .NET code, keep both `Dotnet/VRCX-Cef.csproj` and `Dotnet/VRCX-Electron.csproj` buildable

## Stack

- **Frontend**: Vue 3, Pinia, Vue Router, Vite 7, TailwindCSS 4, shadcn-vue, reka-ui, LightningCSS, vue-i18n, Vitest, Vue Query, ECharts, Graphology + Sigma, vue-sonner
- **Backend**: C# / .NET 10 (Windows) / .NET 9 (macOS/Linux), SQLite, OpenVR, node-api-dotnet
- **Desktop**: Electron 39 (macOS/Linux), CEF/CefSharp 144 (Windows), electron-builder
- **Platform**: Windows / Linux / macOS, x64 + arm64

## Architecture

Renderer (`src/`) → native bridge (`src/plugins/interopApi.js`, `src/ipc-electron/interopApi.js`) → .NET runtime (`Dotnet/`) → VRChat REST/WebSocket, SQLite, OS integration

Current frontend shape:

- Vue SPA with Pinia stores and Vue Query
- Plugin bootstrap in `src/plugins/`
- API wrappers in `src/api/`
- request / websocket / database / config services in `src/services/`
- shared utilities/constants in `src/shared/`
- route views in `src/views/`

Recent structural patterns now in active use:

- **Coordinator pattern** in `src/coordinators/`
- **Query layer** in `src/queries/`
- **Electron IPC helper surface** in `src/ipc-electron/`
- **Public static assets** in `src/public/`
- **App shell CSS split** across `src/styles/globals.css` and `src/app.css`

## Directory Structure

```text
src/
  app.js                  # initPlugins -> initPiniaPlugins -> createApp -> pinia/i18n/VueQuery -> initComponents -> initRouter -> initSentry -> mount
  App.vue                 # Root shell: TooltipProvider, MacOSTitleBar, RouterView, Toaster, dialog modals, updater dialog
  app.css                 # Layout/app-shell CSS
  index.html              # Main entry
  vr.html                 # VR overlay entry
  vite.config.js          # Vite config (port 9000, outDir ../build/html, target chrome144)
  api/                    # VRChat API wrappers
  components/             # Shared components and dialogs
  composables/            # Vue composables
  ipc-electron/           # Electron interop helpers for renderer
  lib/                    # Shared library helpers
  localization/           # i18n JSON files
  plugins/                # Bootstrap plugins (components, dayjs, i18n, interopApi, noty, router, sentry, ui)
  public/                 # Static assets copied by Vite
  queries/                # Vue Query client, keys, cache helpers, entity query utilities
  services/               # Services (request, websocket, webapi, database, config, sqlite, appConfig, jsonStorage, watchState, confusables)
  shared/
    constants/            # Shared constants
    utils/                # Shared utility modules and tests
  coordinators/           # Coordinator layer for auth/friend/game/user flows
  stores/
    gameLog/              # Game log submodules
    notification/         # Notification submodules
    settings/             # Settings stores
    __tests__/            # Store tests
    index.js              # createGlobalStores() + pinia plugin registration
    activity.js           # Activity store
    quickSearch.js        # Quick search store
  styles/
    globals.css           # Tailwind/base CSS variables
    themes/               # Theme CSS
  types/                  # Type definitions
  views/
    MyAvatars/            # My Avatars page
    Sidebar/              # Sidebar UI and tests
    ...                   # Feed, FriendsLocations, GameLog, Search, Favorites, Charts, Notifications, Tools, Settings, etc.
  vr/                     # VR overlay UI
src-electron/
  main.js                 # Electron main process
  preload.js              # preload bridge
  InteropApi.js           # .NET interop entry
  download-dotnet-runtime.js
  patch-node-api-dotnet.js
  patch-package-version.js
  rename-builds.js
Dotnet/
  AppApi/Common/          # Shared native API surface
  AppApi/Cef/             # Windows-only API layer
  AppApi/Electron/        # Electron/macOS/Linux API layer
  Overlay/                # VR overlay implementations
  IPC/                    # IPC infrastructure
  ScreenshotMetadata/     # Screenshot metadata support
  VRCX-Cef.csproj         # Windows build (.NET 10)
  VRCX-Electron.csproj    # Electron x64 build (.NET 9)
  VRCX-Electron-arm64.csproj
```

## Routes

Defined in `src/plugins/router.js`.

- Public: `/login`
- Authenticated shell: `/`
- Children:
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

Router notes:

- Auth guard uses return-based navigation in `router.beforeEach`
- `/social` itself is blocked
- Unauthenticated access redirects to `/login`, preserving `redirect` query when relevant

## Global Objects

Window globals are typed in `src/types/globals.d.ts`.

Primary globals:

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

## Query / Data Fetching

- Vue Query client lives in `src/queries/client.js`
- App bootstrap installs `VueQueryPlugin` in `src/app.js`
- Default query options: retry once, no refetch on window focus, refetch on reconnect
- `request()` in `src/service/request.js` still handles direct REST access and request deduplication

## Store Patterns

- Stores are still created in `createGlobalStores()`
- Cross-store workflow orchestration lives in `src/coordinators/`
- Tests for coordinators live under `src/coordinators/__tests__/`
- ESLint now enforces a **store boundary rule** that disallows direct `xxxStore.foo = ...` and `xxxStore.foo++/--` mutations across store boundaries

## Settings Persistence

- `src/services/config.js`: SQLite-backed config repository using `config:`-prefixed keys
- `VRCXStorage`: file-backed native storage

Representative config keys:

- `VRCX_appLanguage`
- `VRCX_ThemeMode`
- `VRCX_lastDarkTheme`
- `VRCX_fontFamily`
- `VRCX_tablePageSize`
- `VRCX_navPanelWidth`
- `VRCX_tableDensity`

## VRChat API

- REST endpoint base: `https://api.vrchat.cloud/api/1`
- WebSocket base: `wss://pipeline.vrchat.cloud`
- Request path: `src/services/request.js` → `src/services/webapi.js` → native `WebApi`
- GET dedup window: 10s
- 404/403 suppression window: 15min

## DB Schema

Current database version: **15** (stored as `VRCX_databaseVersion` config key, managed in `src/stores/vrcx.js`)

`src/services/database/` currently includes:

- `feed`
- `gameLog`
- `notifications`
- `moderation`
- `friendLogHistory`
- `friendLogCurrent`
- `memos`
- `avatarFavorites`
- `avatarTags`
- `friendFavorites`
- `worldFavorites`
- `mutualGraph`
- `activityCache`
- `tableAlter`
- `tableFixes`
- `tableSize`

## Styling

- TailwindCSS 4 + CSS variables
- Base theme/styles in `src/styles/globals.css`
- Layout shell rules in `src/app.css`
- Theme files in `src/styles/themes/`
- Current theme set: `blue`, `green`, `midnight`, `orange`, `red`, `rednight`, `rose`, `violet`, `yellow`

## Dev Commands

```bash
npm run dev
npm run dev-linux
npm test
npm run test:coverage
npm run prod
npm run prod-linux
npm run build-electron
npm run build-electron-arm64
npm run start-electron
npm run localization
npm run dotnet-win
npm run dotnet-arm64
npm run lint
npm run lint:eslint
npm run lint:oxlint
npm run typecheck:js
```

## .NET Build

```bash
dotnet build Dotnet\VRCX-Cef.csproj -p:Configuration=Release -p:Platform=x64 --self-contained
dotnet build Dotnet\VRCX-Electron.csproj -p:Configuration=Release -p:Platform=x64
dotnet build Dotnet\VRCX-Electron-arm64.csproj -p:Configuration=Release -p:Platform=ARM64
```

## Tooling / Conventions

- **Prettier**: `printWidth: 80`, `tabWidth: 4`, `semi: true`, `singleQuote: true`, `trailingComma: none`, Vue `printWidth: 120`
- **ESLint**: flat config, `vue/essential`, `eslint-plugin-prettier`, `eslint-plugin-jsdoc`, `pretty-import`
- **oxlint**: `.oxlintrc.json`, run via `npm run lint:oxlint`
- **TypeScript config**: `allowJs`, `checkJs`, `strict: false`, `moduleResolution: bundler`, `noEmit`
- **Vitest**: `jsdom`, `src/**/*.{test,spec}.js`, setup via `vitest.setup.js`
- **Path alias**: `@/*` → `./src/*`
- **Do not modify i18n JSON files unless explicitly instructed**
- **No generated code comments**: do not add new explanatory comments in code changes

## Key Notes

- `src/vite.config.js` uses `chrome144` targets and LightningCSS
- `src/public/` is copied into build output by Vite
- `NIGHTLY` is true in development or when version suffix is a 7-char hash
- `window.electron` is macOS/Linux only
- VR overlay remains split between Windows CEF and Electron/shared-memory flows
- `build-scripts/build-all.ps1` must be run **from the `build-scripts/` directory** (it starts with `cd ..` to navigate to the repo root); invoke via `Set-Location build-scripts; .\build-all.ps1` or equivalent
- `build-scripts/build-all.ps1` may terminate when invoking `7z` (e.g. if 7-Zip is not in PATH); treat that as acceptable if .NET build, frontend build, license generation, and junction creation already completed successfully — the `7z` failure can be ignored
- Recent project direction includes coordinator extraction, Vue Query adoption, CSS tokenization, and upstream sync merges

## GitHub情報取得

- GitHubから情報を取得する際は、CLI (`gh` コマンド)、API (`curl`) の優先順位で使用すること

## 🚨 Git Operation Restrictions

- **Commit and Push**: `git commit` and `git push` are generally performed by the user. Agents MUST NOT perform these operations without explicit permission.
