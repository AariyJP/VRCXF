# 技術スタックとアーキテクチャ

## ディレクトリ構造

```
VRCX/
├── src/                    # フロントエンド (Vue 3)
│   ├── app.js              # エントリーポイント
│   ├── App.vue             # ルートコンポーネント
│   ├── index.html          # メインHTML
│   ├── vr.html             # VRオーバーレイHTML
│   ├── vite.config.js      # Vite設定
│   ├── api/                # VRChat API ラッパー
│   ├── components/         # UIコンポーネント
│   │   ├── ui/             # shadcn-vue UI primitives (304 files)
│   │   └── dialogs/        # ダイアログ (48 files)
│   ├── composables/        # Vue Composables
│   ├── lib/                # ユーティリティ
│   ├── localization/       # i18n JSON (14言語)
│   ├── plugin/             # Vue plugin初期化
│   │   ├── router.js       # ルート定義
│   │   ├── i18n.js         # vue-i18n設定
│   │   ├── interopApi.js   # .NETバインディング初期化
│   │   ├── sentry.js       # Sentry初期化
│   │   └── components.js   # グローバルコンポーネント登録
│   ├── service/            # サービス層
│   │   ├── websocket.js    # VRChat WebSocket
│   │   ├── request.js      # HTTP
│   │   ├── webapi.js       # WebApiService
│   │   ├── database.js     # DB操作集約
│   │   ├── database/       # DBスキーマ
│   │   ├── config.js       # ConfigRepository
│   │   ├── sqlite.js       # SQLiteサービス
│   │   └── appConfig.js    # AppDebug
│   ├── shared/
│   │   ├── constants/      # 定数
│   │   └── utils/          # ユーティリティ
│   ├── stores/             # Pinia stores
│   │   ├── index.js        # createGlobalStores()
│   │   ├── auth.js         # 認証
│   │   ├── user.js         # ユーザー
│   │   ├── friend.js       # フレンド管理
│   │   ├── notification.js # 通知
│   │   └── settings/       # 設定stores
│   ├── styles/             # スタイル
│   │   ├── globals.css     # TailwindCSS + CSS変数
│   │   └── themes/         # テーマCSS (9テーマ)
│   ├── types/              # TypeScript型定義
│   │   ├── globals.d.ts    # グローバル型
│   │   └── api/            # API型定義
│   ├── views/              # ページ
│   └── vr/                 # VRオーバーレイUI
├── src-electron/           # Electron Main
│   ├── main.js             # メインプロセス (916行)
│   ├── preload.js          # Preload
│   ├── InteropApi.js       # .NET interop
│   └── offscreen.html      # VRオーバーレイoffscreenウィンドウ
├── Dotnet/                 # .NETバックエンド
│   ├── Program.cs          # エントリーポイント
│   ├── AppApi/
│   │   ├── Common/         # クロスプラットフォーム共通API (10 files)
│   │   ├── Cef/            # CEF専用API (6 files)
│   │   └── Electron/       # Electron専用API (5 files)
│   ├── LogWatcher.cs       # VRChatログ監視 (58KB)
│   ├── WebApi.cs           # Web APIクライアント
│   ├── SQLite.cs           # データベース
│   ├── Discord.cs          # Discord Rich Presence
│   ├── ProcessMonitor.cs   # VRChatプロセス監視
│   ├── ImageCache.cs       # 画像キャッシュ
│   ├── VRCXStorage.cs      # KV設定ストレージ
│   ├── Update.cs           # 自動更新
│   ├── AssetBundleManager.cs # VRChatキャッシュ管理
│   ├── AutoAppLaunchManager.cs # 自動起動
│   ├── StartupArgs.cs      # 起動引数パーサー
│   ├── Overlay/            # VRオーバーレイ
│   ├── ScreenshotMetadata/ # スクリーンショットメタデータ
│   ├── IPC/                # IPC (4 files)
│   ├── Cef/                # CEFブラウザ (14 files)
│   ├── DBMerger/           # DBマージツール
│   ├── VRCX-Cef.csproj     # Windows CEFビルド
│   ├── VRCX-Electron.csproj # Electron x64ビルド
│   └── VRCX-Electron-arm64.csproj
├── Installer/              # NSIS (installer.nsi)
├── build-scripts/          # ビルドスクリプト
└── .github/workflows/      # CI/CD

```

## ルーティング (`src/plugin/router.js`)

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

認証ガード: `watchState.isLoggedIn` をチェック、未認証時は `/login` へリダイレクト

## グローバルオブジェクト (window)

Windows (CEF)では `CefSharp.BindObjectAsync` でバインド、Linux (Electron)では `InteropApi` Proxyでバインド。

公開オブジェクト:
- `AppApi`: アプリ操作 (DevTools, VR, zoom, 通知, クリップボード, ゲーム起動/終了, レジストリ, 画像, スクリーンショット, 更新, フォルダ操作)
- `VRCXStorage`: KVストレージ (Get/Set/Remove/GetAll/Flush/Save/Load/GetArray/SetArray/GetObject/SetObject)
- `SQLite`: DB操作 (Execute/ExecuteJson/ExecuteNonQuery)
- `LogWatcher`: VRChatログ (Get/SetDateTill/GetLogLines/Reset)
- `Discord`: Rich Presence (SetAssets/SetActive)
- `WebApi`: HTTP (ClearCookies/GetCookies/SetCookies/Execute/ExecuteJson)
- `webApiService`: WebApiのJSラッパー (LINUX → ExecuteJson, WINDOWS → Execute)

型定義: `src/types/globals.d.ts`

## 設定の永続化

### ConfigRepository (`src/service/config.js`)
- SQLite `configs` テーブルにKV保存
- キーは `config:` プレフィックス
- 例: `VRCX_appLanguage`, `VRCX_ThemeMode`, `VRCX_lastDarkTheme`, `VRCX_fontFamily`, `VRCX_tablePageSize`, `VRCX_navPanelWidth`, etc.

### VRCXStorage
- .NET側のKV (ファイルベース)

## データベーススキーマ (`src/service/database/`)

テーブル:
- feed
- gameLog
- notifications
- moderation
- friendLogHistory
- friendLogCurrent
- memos
- avatarFavorites
- worldFavorites
- tableAlter (マイグレーション)
- tableFixes
- tableSize
- mutualGraph

## テーマ

9つのテーマ: blue, green, midnight, orange, red, rednight, rose, violet, yellow
テーマモード: light / dark / system + カラーテーマ
CSS: `src/styles/themes/`

## Vueアプリ初期化順序

1. `initPlugins` → `initPiniaPlugins`
2. `createApp`
3. `pinia`, `i18n`
4. `initComponents`
5. `initRouter`
6. `initSentry`
7. `mount('#root')`

## Store初期化

1. `createGlobalStores()` で全storeを作成
2. `window.$pinia` に保存
3. `onBeforeMount` で `updateLoop` 開始
4. `onMounted` で `gameLog/auth/vrcx/game` 初期化

## .NET Interop パターン

Electron版では `window.interopApi.callDotNetMethod(className, methodName, args)` のProxyパターンを使用

## Preconnect ターゲット

- api.vrchat.cloud
- files.vrchat.cloud
- d348imysud55la.cloudfront.net

## i18n

- 動的ロード (Viteチャンク分割、言語コードごと)
- フォントも言語ごとにチャンク分割

## components.json

shadcn-vue CLI設定ファイル
