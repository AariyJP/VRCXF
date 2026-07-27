# VRCXF

> [!NOTE]
> このプロジェクトでは `AGENTS.md` をエージェント向け指示の単一の正本として扱う。
> `CLAUDE.md` は本ファイルへの symbolic link。

**ユーザーへの回答はすべて日本語で行うこと。**

VRChat のフレンド管理デスクトップアプリ。[vrcx-team/VRCX](https://github.com/vrcx-team/VRCX) のフォークで、AariyJP が VRCXF として保守している。MIT ライセンス。

## 🔧 Serena MCP 連携

**Serena MCP サーバーが利用可能なときは、コード関連タスクで必ず最大限活用すること。**

可能なかぎり手動のファイル読込より Serena ツールを優先する:

- **コード構造**: `mcp_serena_get_symbols_overview`、`mcp_serena_find_symbol`
- **検索**: `mcp_serena_search_for_pattern`、`mcp_serena_find_referencing_symbols`
- **編集**: `mcp_serena_replace_symbol_body`、`mcp_serena_replace_content`、`mcp_serena_insert_before_symbol`、`mcp_serena_insert_after_symbol`
- **リファクタ**: `mcp_serena_rename_symbol`
- **コンテキスト**: `mcp_serena_list_memories`、`mcp_serena_read_memory`

コードタスクを始める前に:

1. `mcp_serena_check_onboarding_performed` を確認
2. `mcp_serena_list_memories` で関連メモリを確認
3. 可能なときは常にシンボル単位の探索/編集を使う

## ⚠ 必須: クロスプラットフォーム実装

**全タスクはクロスプラットフォーム互換を意識して実装すること。**

プラットフォーム構成:

- **Windows**: CEF (CefSharp) — `Dotnet/Cef/`、`Dotnet/AppApi/Cef/`、`Dotnet/Overlay/Cef/`、`Dotnet/VRCX-Cef.csproj`
- **macOS/Linux**: Electron + node-api-dotnet — `src-electron/`、`Dotnet/AppApi/Electron/`、`Dotnet/Overlay/Electron/`、`Dotnet/VRCX-Electron.csproj`

分岐パターン:

- **Frontend JS**: `WINDOWS` / `LINUX` で分岐
- **ネイティブ API 呼び出し**: Windows は `CefSharp.BindObjectAsync` 経由のグローバル直接呼び出し、macOS/Linux は `window.interopApi.callDotNetMethod` 経由のプロキシ
- **Interop ブートストラップ**: `src/plugins/interopApi.js` がグローバルを初期化、`src/ipc-electron/interopApi.js` が Electron 側プロキシヘルパーを公開
- **WebApi 実行**: `src/services/webapi.js` が Windows では `WebApi.Execute()`、macOS/Linux では `WebApi.ExecuteJson()` に分岐
- **.NET 側**: 共通ロジックは `Dotnet/AppApi/Common/`、プラットフォーム固有コードは `Dotnet/AppApi/Cef/` と `Dotnet/AppApi/Electron/`
- **Electron 専用 API**: `window.electron.*` は macOS/Linux のみ存在

実装チェックリスト:

1. フロントエンドが使う新規ネイティブ API を追加する場合は、共通サーフェスまたは両プラットフォームバックエンドで実装する
2. フロントエンドのプラットフォーム分岐は `src/plugins/interopApi.js` と `src/services/webapi.js` の既存パターンに従う
3. `window.electron.*` を使う場合は、必要に応じて Windows 互換パスを提供する
4. .NET コードを変更したら `Dotnet/VRCX-Cef.csproj` と `Dotnet/VRCX-Electron.csproj` の両方がビルド可能な状態を保つ

## 技術スタック

- **Frontend**: Vue 3、Pinia、Vue Router、Vite 8、TailwindCSS 4、shadcn-vue、reka-ui、LightningCSS、vue-i18n、Vitest、Vue Query、ECharts、Graphology + Sigma、vue-sonner
- **Backend**: C# / .NET 10 (Windows) / .NET 9 (macOS/Linux)、SQLite、OpenVR、node-api-dotnet
- **Desktop**: Electron 40 (macOS/Linux)、CEF/CefSharp 148 (Windows)、electron-builder
- **対応プラットフォーム**: Windows / Linux / macOS、x64 + arm64

## アーキテクチャ

レンダラ (`src/`) → ネイティブブリッジ (`src/plugins/interopApi.js`、`src/ipc-electron/interopApi.js`) → .NET ランタイム (`Dotnet/`) → VRChat REST/WebSocket、SQLite、OS 連携

現在のフロントエンド構成:

- Pinia ストアと Vue Query を使う Vue SPA
- プラグインブートストラップは `src/plugins/`
- API ラッパーは `src/api/`
- request / websocket / database / config サービスは `src/services/`
- 共通ユーティリティ・定数は `src/shared/`
- ルートビューは `src/views/`

最近積極的に採用されている構造パターン:

- **Coordinator パターン** (`src/coordinators/`)
- **Query レイヤ** (`src/queries/`)
- **Electron IPC ヘルパー** (`src/ipc-electron/`)
- **公開静的アセット** (`src/public/`)
- **アプリシェル CSS の分割**: `src/styles/globals.css` と `src/app.css`

## ディレクトリ構成

```text
src/
  app.js                  # initPlugins -> initPiniaPlugins -> createApp -> pinia/i18n/VueQuery -> initComponents -> initRouter -> initSentry -> mount
  App.vue                 # ルートシェル: TooltipProvider, MacOSTitleBar, RouterView, Toaster, ダイアログモーダル, アップデータ
  app.css                 # レイアウト/アプリシェル用 CSS
  index.html              # メインエントリ
  vr.html                 # VR オーバーレイエントリ
  vite.config.js          # Vite 設定 (port 9000、outDir ../build/html、target chrome145)
  api/                    # VRChat API ラッパー
  components/             # 共通コンポーネントとダイアログ
  composables/            # Vue composables
  ipc-electron/           # レンダラ向け Electron interop ヘルパー
  lib/                    # 共通ライブラリヘルパー
  localization/           # i18n JSON ファイル
  plugins/                # ブートストラッププラグイン (components, dayjs, i18n, interopApi, noty, router, sentry, ui)
  public/                 # Vite がコピーする静的アセット
  queries/                # Vue Query クライアント、key、キャッシュヘルパー、エンティティクエリ
  services/               # サービス類 (request, websocket, webapi, database, config, sqlite, appConfig, jsonStorage, watchState, confusables)
  shared/
    constants/            # 共通定数
    utils/                # 共通ユーティリティとそのテスト
  coordinators/           # auth/friend/game/user フロー用 coordinator レイヤ
  stores/
    gameLog/              # Game log サブモジュール
    notification/         # Notification サブモジュール
    settings/             # Settings ストア
    __tests__/            # ストアテスト
    index.js              # createGlobalStores() + Pinia プラグイン登録
    activity.js           # Activity ストア
    quickSearch.js        # Quick search ストア
  styles/
    globals.css           # Tailwind / ベース CSS 変数
    themes/               # テーマ用 CSS
  types/                  # 型定義
  views/
    MyAvatars/            # My Avatars ページ
    Sidebar/              # サイドバー UI とテスト
    ...                   # Feed, FriendsLocations, GameLog, Search, Favorites, Charts, Notifications, Tools, Settings 他
  vr/                     # VR オーバーレイ UI
src-electron/
  main.js                 # Electron メインプロセス
  preload.js              # preload ブリッジ
  InteropApi.js           # .NET interop エントリ
  download-dotnet-runtime.js
  patch-node-api-dotnet.js
  patch-package-version.js
  rename-builds.js
Dotnet/
  AppApi/Common/          # 共通ネイティブ API サーフェス
  AppApi/Cef/             # Windows 専用 API レイヤ
  AppApi/Electron/        # Electron/macOS/Linux API レイヤ
  Overlay/                # VR オーバーレイ実装
  IPC/                    # IPC 基盤
  ScreenshotMetadata/     # スクリーンショットメタデータ対応
  VRCX-Cef.csproj         # Windows ビルド (.NET 10)
  VRCX-Electron.csproj    # Electron x64 ビルド (.NET 9)
  VRCX-Electron-arm64.csproj
```

## ルート

`src/plugins/router.js` で定義。

- 公開: `/login`
- 認証済みシェル: `/`
- 子ルート:
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

ルーター仕様:

- 認証ガードは `router.beforeEach` で return ベースのナビゲーションを使用
- `/social` 自体はブロック
- 未認証アクセスは `/login` にリダイレクト、必要に応じて `redirect` クエリを保持

## グローバルオブジェクト

`src/types/globals.d.ts` で型定義されている `window` グローバル:

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

## Query / データ取得

- Vue Query クライアントは `src/queries/client.js`
- アプリ起動時に `src/app.js` で `VueQueryPlugin` を install
- デフォルトオプション: retry 1 回、ウィンドウフォーカスでは refetch しない、reconnect 時は refetch
- 直接 REST アクセスとリクエスト重複排除は引き続き `src/service/request.js` の `request()` が担当

## ストアパターン

- ストアは引き続き `createGlobalStores()` で生成
- ストア横断のワークフロー調整は `src/coordinators/`
- coordinator のテストは `src/coordinators/__tests__/`
- ESLint が **ストア境界ルール**を強制: 他ストア境界を越えた `xxxStore.foo = ...` および `xxxStore.foo++/--` を禁止

## 設定の永続化

- `src/services/config.js`: `config:` プレフィックスキーの SQLite ベース config repository
- `VRCXStorage`: ファイル基盤のネイティブストレージ

代表的な config キー:

- `VRCX_appLanguage`
- `VRCX_ThemeMode`
- `VRCX_lastDarkTheme`
- `VRCX_fontFamily`
- `VRCX_tablePageSize`
- `VRCX_navPanelWidth`
- `VRCX_tableDensity`

## VRChat API

- REST エンドポイントベース: `https://api.vrchat.cloud/api/1`
- WebSocket ベース: `wss://pipeline.vrchat.cloud`
- リクエスト経路: `src/services/request.js` → `src/services/webapi.js` → ネイティブ `WebApi`
- GET 重複排除ウィンドウ: 10 秒
- 404/403 抑制ウィンドウ: 15 分

## DB スキーマ

現在のデータベースバージョン: **16** (`VRCX_databaseVersion` config キーに保存、`src/stores/vrcx.js` で管理)

`src/services/database/` に含まれる現行モジュール:

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
- `activityV2`
- `tableAlter`
- `tableFixes`
- `tableSize`

## スタイリング

- TailwindCSS 4 + CSS 変数
- ベーステーマ/スタイルは `src/styles/globals.css`
- レイアウトシェル規則は `src/app.css`
- テーマファイルは `src/styles/themes/`
- 現行テーマ一覧: `blue`、`green`、`midnight`、`orange`、`red`、`rednight`、`rose`、`violet`、`yellow`

## 開発コマンド

ローカル開発では `pnpm`、CI では `npm` を使用する。

```bash
pnpm dev
pnpm dev-linux
pnpm test
pnpm test:coverage
pnpm prod
pnpm prod-linux
pnpm build-electron
pnpm build-electron-arm64
pnpm start-electron
pnpm localization
pnpm dotnet-win
pnpm dotnet-arm64
pnpm lint
pnpm lint:eslint
pnpm lint:oxlint
pnpm typecheck:js
```

## .NET ビルド

```bash
dotnet build Dotnet\VRCX-Cef.csproj -p:Configuration=Release -p:Platform=x64
dotnet build Dotnet\VRCX-Electron.csproj -p:Configuration=Release -p:Platform=x64
dotnet build Dotnet\VRCX-Electron-arm64.csproj -p:Configuration=Release -p:Platform=ARM64
```

## ツール / 規約

- **Prettier**: `printWidth: 80`、`tabWidth: 4`、`semi: true`、`singleQuote: true`、`trailingComma: none`、Vue は `printWidth: 120`
- **ESLint**: flat config、`vue/essential`、`eslint-plugin-prettier`、`eslint-plugin-jsdoc`、`pretty-import`
- **oxlint**: `.oxlintrc.json`、`npm run lint:oxlint` で実行
- **TypeScript 設定**: `allowJs`、`checkJs`、`strict: false`、`moduleResolution: bundler`、`noEmit`
- **Vitest**: `jsdom`、`src/**/*.{test,spec}.js`、setup は `vitest.setup.js`
- **パスエイリアス**: `@/*` → `./src/*`
- **i18n JSON ファイルは明示的に指示されない限り変更しない**
- **生成コードへのコメント禁止**: コード変更で新規の説明コメントを追加しない

## 🧪 テストポリシー

- **テストはエージェントのスコープ外**。ユーザーが明示的に依頼しない限り、テストファイル (`**/__tests__/**`、`**/*.test.js`、`**/*.spec.js`) は実行・作成・編集しない。
- 検証ステップにテスト実行を含めない。型チェック、Lint、ビルドで十分。
- リファクタの副作用で既存テストが壊れた場合、自分で直そうとせずそのまま残し、事実だけユーザーに報告する。

## 🔍 コードレビューポリシー

- **upstream 由来のコードは指摘しない**。レビュー対象は fork（VRCXF）が書いたコードのみ。upstream ([vrcx-team/VRCX](https://github.com/vrcx-team/VRCX)) から引き継いだままのコードは、たとえ問題があっても指摘対象外とする。
- ファイル単位ではなく**変更行単位で判定する**。upstream に存在するファイルでも、fork が書き足した部分は指摘対象。逆にファイル内の upstream 由来部分は対象外。
- 判定方法:

  ```bash
  git ls-tree --name-only upstream/master <path>   # upstream に存在するか
  git diff upstream/master HEAD -- <path>          # fork が変更した行はどこか
  ```

- upstream リモート未登録の場合は `git remote add upstream https://github.com/vrcx-team/VRCX.git && git fetch upstream` で追加する。

## 重要な注意点

- `src/vite.config.js` は `chrome145` ターゲットと LightningCSS を使用
- `src/public/` は Vite によってビルド出力にコピーされる
- `NIGHTLY` は development 時または version suffix が 7 文字の hash のとき true
- `window.electron` は macOS/Linux のみ
- VR オーバーレイは Windows CEF と Electron/共有メモリの 2 系統に分かれたまま
- Windows CEF 版は framework-dependent としてビルドし、.NET ランタイムを配布物へ同梱しない。`--self-contained` を付けないこと。
- `build-scripts/build-all.ps1` は **`build-scripts/` ディレクトリから**実行する必要がある（スクリプトの先頭が `cd ..` でリポジトリルートに移動する）。`Set-Location build-scripts; .\build-all.ps1` のように呼び出す。
- framework-dependent への切り替え後などに古い成果物が混在して.NETランタイム要求ダイアログが表示される場合は、リポジトリ直下の `build/` を全削除してから `build-scripts/build-all.ps1` を再実行する。
- `build-scripts/build-all.ps1` は `7z` 実行時に失敗することがある（例: 7-Zip が PATH にない場合）。.NET ビルド、フロントエンドビルド、ライセンス生成、ジャンクション作成がすでに成功していれば、`7z` の失敗は無視して成功扱いにしてよい。
- 最近のプロジェクトの方向性: coordinator 抽出、Vue Query 導入、CSS のトークン化、upstream 同期マージ

## GitHub 情報取得

- GitHub から情報を取得する際は、CLI (`gh` コマンド)、API (`curl`) の優先順位で使用すること

## 🚨 Git 操作の制限

- **commit と push**: `git commit` と `git push` は基本的にユーザーが行う。エージェントはユーザーの明示的な許可なくこれらの操作を行ってはならない。
- **`.serena/project.yml`**: 常にコミットに含めてよい。Serena による設定の自動移行で差分が出ても stash 退避や除外はせず、そのままステージする。
