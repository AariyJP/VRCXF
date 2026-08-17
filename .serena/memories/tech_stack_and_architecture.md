# 技術スタックとアーキテクチャ

## フロントエンド

- Vue 3
- Pinia
- Vue Router (hash history)
- Vite 8
- TailwindCSS 4
- shadcn-vue / reka-ui
- vue-i18n
- Vitest
- @tanstack/vue-query
- ECharts
- Graphology + Sigma
- vue-sonner

## バックエンド / デスクトップ

- C# / .NET 10: `Dotnet/VRCX-Cef.csproj`
- C# / .NET 9: `Dotnet/VRCX-Electron.csproj` および `Dotnet/VRCX-Electron-arm64.csproj`
- macOS/Linux で Electron 40
- Windows で CEF/CefSharp 148
- SQLite
- node-api-dotnet
- Browser: `BROWSER` フラグ（`index.html` のランタイム判定）。.NET ランタイムなしでフロントエンドのみを一般ブラウザで動かす。`npm run dev` で Vite を起動し、Cloudflare Wrangler Pages(port 8788)は別プロセスで動かす

## 主要ディレクトリ

- `src/api/`: VRChat API ラッパー
- `src/components/`: 共通コンポーネントとダイアログ
- `src/composables/`: Vue composables
- `src/ipc-electron/`: レンダラ向け Electron IPC ヘルパー
- `src/ipc-browser/`: Browser 検証ターゲット向けネイティブ API モック (`index.js` のみ。fetch+Cookie中継の `WebApi`、sql.js on IndexedDB の `SQLite` 等。`LogWatcher`/`Discord`/ゲーム起動/レジストリ/スクショ等はスタブ)
- `src/plugins/`: ブートストラッププラグイン (`dayjs`、`i18n`、`interopApi`、`noty`、`router`、`sentry`、`ui`)
- `src/public/`: Vite がコピーする静的アセット
- `src/queries/`: Vue Query クライアント、key、cache、query ヘルパー
- `src/services/`: request、websocket、webapi、database、config、sqlite、appConfig、jsonStorage、watchState
- `src/shared/`: 定数と共通ユーティリティ
- `src/coordinators/`: フロー調整層
- `src/stores/gameLog/`、`src/stores/notification/`: ストアのサブモジュール
- `src/views/MyAvatars/`: My Avatars ルート
- `src/styles/globals.css` + `src/app.css`: スタイリングの分割
- `src-electron/`: Electron メイン/プリロード/ビルドヘルパー
- `Dotnet/AppApi/Common|Cef|Electron/`: ネイティブ API レイヤ

## アプリ起動順序

`src/app.js` の現状の初期化順:

1. `initPlugins()`
2. `initPiniaPlugins()`
3. `createApp(App)`
4. `pinia`、`i18n`、`VueQueryPlugin` を install
5. `initComponents(app)`
6. `initRouter(app)`
7. `initSentry(app)`
8. `app.mount('#root')`

## ルートアプリシェル

`src/App.vue` に含まれる要素:

- `TooltipProvider`
- `MacOSTitleBar`
- `RouterView`
- `Toaster`
- `AlertDialogModal`
- `PromptDialogModal`
- `OtpDialogModal`
- `VRCXUpdateDialog`
- `#x-dialog-portal`

## ルート一覧

主な認証済みルート:

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
- `/dashboard/:id`
- `/charts/instance`
- `/charts/mutual`
- `/charts/hot-worlds`
- `/tools`
- `/tools/gallery`
- `/tools/screenshot-metadata`
- `/settings`

ルーターは return ベースガードで、`/social` 自体をブロックする。

## グローバル

`src/types/globals.d.ts` で型定義されているグローバル:

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

## 永続化 / データ

- 設定: `src/services/config.js`
- ネイティブ KV ストレージ: `VRCXStorage`
- 現在の DB バージョン: **16** (`VRCX_databaseVersion` config キー、`src/stores/vrcx.js` で管理)
- DB スキーマモジュール: `feed`、`gameLog`、`notifications`、`moderation`、`friendLogHistory`、`friendLogCurrent`、`memos`、`avatarFavorites`、`avatarTags`、`friendFavorites`、`worldFavorites`、`mutualGraph`、`activityV2`、`tableAlter`、`tableFixes`、`tableSize`

## スタイリング / アセット

- TailwindCSS 4 + CSS 変数
- テーマは `src/styles/themes/`
- 静的アセットは `src/public/`
- Vite ビルドターゲットは現状 `chrome145`
