# 技術スタックとアーキテクチャ

> **具体的なバージョン値はここに書かない。** ドリフトを避けるため正本を読むこと。
> JS/Electron の依存: `package.json` / .NET の TargetFramework: `Dotnet/VRCX-*.csproj` /
> Vite の dev port・build target・outDir: `src/vite.config.js` / DB スキーマバージョン: `src/stores/vrcx.js`

## フロントエンド

Vue 3、Pinia、Vue Router (hash history)、Vite、TailwindCSS、shadcn-vue / reka-ui、LightningCSS、vue-i18n、Vitest、@tanstack/vue-query、ECharts、Graphology + Sigma、vue-sonner、@vueuse/core

## バックエンド / デスクトップ

- C# / .NET: Cef / Electron / Electron-arm64 の 3 csproj。**現在は 3 つとも同じ TargetFramework**（かつて Electron 側だけ古い世代だったが解消済み）
- Windows: CEF/CefSharp、macOS/Linux: Electron + node-api-dotnet
- SQLite
- Windows CEF 版は **framework-dependent** ビルド。.NET ランタイムを同梱しない

## 4 つのターゲット

- **Windows**: CEF (CefSharp)。`Dotnet/Cef/`、`Dotnet/AppApi/Cef/`、`Dotnet/Overlay/Cef/`
- **macOS/Linux**: Electron + node-api-dotnet。`src-electron/`、`Dotnet/AppApi/Electron/`、`Dotnet/Overlay/Electron/`
- **Browser**: .NET ランタイムなしでフロントエンドのみを一般ブラウザで動かす。`src/ipc-browser/`、`functions/`、`BROWSER` フラグ（`index.html` のランタイム判定）。
  **配布対象外ではない** — リリース CI が `VRCXF_bundle.zip` としてリリースアセットに含める（`.github/workflows/release.yml` の `build_bundle` ジョブ）
- **VR オーバーレイ**: Windows CEF と Electron/共有メモリの 2 系統に分かれたまま

## 主要ディレクトリ

- `src/api/`: VRChat API ラッパー
- `src/components/`: 共通コンポーネントとダイアログ（`ui/window-teleport/` を含む）
- `src/composables/`: Vue composables（ポップアウト用 `usePortalDocument` / `useDialogPopoutModal` を含む）
- `src/coordinators/`: auth/friend/game/user のフロー調整層
- `src/ipc-electron/`: レンダラ向け Electron IPC ヘルパー
- `src/ipc-browser/`: Browser 向けネイティブ API モック（`index.js`、`md5.js`）
- `src/lib/`: 共通ライブラリヘルパー。`activeWindowTracker.js` / `clipboard.js` / `modalPortalLayers.js` / `utils.js` / `table/`
- `src/plugins/`: ブートストラッププラグイン
- `src/public/`: Vite がコピーする静的アセット
- `src/queries/`: Vue Query クライアント、key、cache、エンティティクエリ
- `src/services/`: request、websocket、webapi、database、config、security、`browserConsoleLog.js` 等
- `src/shared/`: 定数と共通ユーティリティ
- `src/stores/`: `gameLog/`、`notification/`、`settings/` のサブモジュール
- `src/workers/`: Activity の重い計算をレンダラから分離する Web Worker
- `src/styles/globals.css` + `src/app.css`: スタイリングの分割
- `src-electron/`: Electron メイン/プリロード/interop
- `functions/api/1/[[path]].ts`: Browser 版の VRChat REST 中継 (Cloudflare Pages Functions)
- `build-scripts/`: ランタイム取得、パッチ、リネーム、ライセンス生成、`build-all.ps1`
- `Dotnet/AppApi/Common|Cef|Electron/`: ネイティブ API レイヤ

## アプリ起動順序

`src/app.js`:

1. `initPlugins()`
2. `initPiniaPlugins()`
3. `createApp(App)`
4. `pinia`、`i18n`、`VueQueryPlugin` を install
5. `initComponents(app)`
6. `initRouter(app)`
7. `initSentry(app)`
8. `app.mount('#root')`

`src/services/browserConsoleLog.js` を無条件 import している（Diagnostics の DevTools Console は全プラットフォーム共通、メモリ内最大 500 件、永続化なし）。

## ルート

`src/plugins/router.js` が正本。公開は `/login`、認証済みシェルは `/`。`/social` 自体はブロックし、未認証は `/login` へリダイレクト（`redirect` クエリを保持）。ガードは return ベース。

## グローバル

`src/types/globals.d.ts`: `AppApi`、`AppApiVr`、`WebApi`、`VRCXStorage`、`SQLite`、`LogWatcher`、`Discord`、`AssetBundleManager`、`webApiService`、`window.interopApi`、`window.electron`、`window.$pinia`

## 永続化 / データ

- 設定: `src/services/config.js`（`config:` プレフィックスの SQLite ベース repository）
- ネイティブ KV ストレージ: `VRCXStorage`
- DB バージョンは `VRCX_databaseVersion` config キー、`src/stores/vrcx.js` で管理（**現在値は同ファイルを読むこと**）
- DB モジュール (`src/services/database/`): `feed`、`gameLog`、`notifications`、`moderation`、`friendLogHistory`、`friendLogCurrent`、`memos`、`avatarFavorites`、`avatarTags`、`friendFavorites`、`worldFavorites`、`mutualGraph`、`activityV2`、`printFavorites`、`tableAlter`、`tableFixes`、`tableSize`
- Browser では `VRCXStorage` をブラウザストレージ、SQLite 本体と Cookie jar を IndexedDB で代替。DML/DDL 変更のみ検出して短間隔でまとめ保存、トランザクション中は保存せず COMMIT 後のみ

## スタイリング

TailwindCSS + CSS 変数。テーマは `src/styles/themes/`（`blue`、`green`、`midnight`、`orange`、`red`、`rednight`、`rose`、`violet`、`yellow`。`rednight` はフォーク独自）。
