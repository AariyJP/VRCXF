# VRCXF

> [!NOTE]
> このプロジェクトでは `AGENTS.md` をエージェント向け指示の単一の正本として扱う。
> `CLAUDE.md` は本ファイルへの symbolic link。

**ユーザーへの回答はすべて日本語で行うこと。**

VRChat のフレンド管理デスクトップアプリ。[vrcx-team/VRCX](https://github.com/vrcx-team/VRCX) のフォークで、AariyJP が VRCXF として保守している。

## 🔧 Serena MCP 連携

**Serena MCP サーバーが利用可能なときは、コード関連タスクで必ず最大限活用すること。**

可能なかぎり手動のファイル読込より Serena ツールを優先する:

- **コード構造**: `mcp_serena_get_symbols_overview`、`mcp_serena_find_symbol`
- **検索**: `mcp_serena_search_for_pattern`、`mcp_serena_find_referencing_symbols`
- **編集**: `mcp_serena_replace_symbol_body`、`mcp_serena_replace_content`、`mcp_serena_insert_before_symbol`、`mcp_serena_insert_after_symbol`
- **リファクタ**: `mcp_serena_rename_symbol`
- **コンテキスト**: `mcp_serena_list_memories`、`mcp_serena_read_memory`

コードタスクを始める前に:

1. `mcp__serena__initial_instructions` を未読なら読む
2. `mcp__serena__activate_project` で `VRCXF` を有効化する
3. `mcp__serena__list_memories` で関連メモリを確認する
4. 可能なときは常にシンボル単位の探索/編集を使う

## ⚠ 必須: クロスプラットフォーム実装

**全タスクはクロスプラットフォーム互換を意識して実装すること。**

プラットフォーム構成:

- **Windows**: CEF (CefSharp) — `Dotnet/Cef/`、`Dotnet/AppApi/Cef/`、`Dotnet/Overlay/Cef/`、`Dotnet/VRCX-Cef.csproj`
- **macOS/Linux**: Electron + node-api-dotnet — `src-electron/`、`Dotnet/AppApi/Electron/`、`Dotnet/Overlay/Electron/`、`Dotnet/VRCX-Electron.csproj`
- **Browser**: .NET ランタイムを介さずフロントエンドのみを一般的な Web ブラウザで動かすターゲット — `src/ipc-browser/`、`functions/`、`BROWSER` フラグ（`index.html` のランタイム判定）。`pnpm dev` は Vite のみを起動し、REST 中継用 Cloudflare Pages Functions は別プロセスで動かす。リリースアセットにも含める

分岐パターン:

- **Frontend JS**: `WINDOWS` / `LINUX` / `BROWSER` で分岐
- **ネイティブ API 呼び出し**: Windows は `CefSharp.BindObjectAsync` 経由のグローバル直接呼び出し、macOS/Linux は `window.interopApi.callDotNetMethod` 経由のプロキシ、Browser は `src/ipc-browser/index.js` のブラウザ内モック実装（fetch + Cookie 中継、sql.js + IndexedDB、ブラウザストレージ等）
- **Interop ブートストラップ**: `src/plugins/interopApi.js` がグローバルを初期化。macOS/Linux は `src/ipc-electron/interopApi.js` が Electron 側プロキシヘルパーを公開、Browser は `src/ipc-browser/index.js` を動的 import して同名グローバルにモックを割り当てる
- **WebApi 実行**: `src/services/webapi.js` は `LINUX` のときのみ `WebApi.ExecuteJson()`、それ以外（Windows/Browser）は `WebApi.Execute()`（`{Item1, Item2}` 形式）に分岐。Browser のモックもこの形式で応答を返す
- **.NET 側**: 共通ロジックは `Dotnet/AppApi/Common/`、プラットフォーム固有コードは `Dotnet/AppApi/Cef/` と `Dotnet/AppApi/Electron/`（Browser は .NET 側の実装を持たない）
- **Electron 専用 API**: `window.electron.*` は macOS/Linux のみ存在

実装チェックリスト:

1. フロントエンドが使う新規ネイティブ API を追加する場合は、共通サーフェスまたは両プラットフォームバックエンドで実装する
2. フロントエンドのプラットフォーム分岐は `src/plugins/interopApi.js` と `src/services/webapi.js` の既存パターンに従う
3. `window.electron.*` を使う場合は、必要に応じて Windows 互換パスを提供する
4. .NET コードを変更したら `Dotnet/VRCX-Cef.csproj` と `Dotnet/VRCX-Electron.csproj` の両方がビルド可能な状態を保つ
5. Browser ターゲットに影響するネイティブ API を追加/変更する場合は `src/ipc-browser/index.js` のモックも合わせて更新する（ネイティブ依存機能はスタブのままで構わない）
6. Browser の REST 中継を変更する場合は `functions/api/1/[[path]].ts` も確認する。WebSocket は CORS の対象外なので中継を持たず、全ターゲットが `wss://pipeline.vrchat.cloud` へ直接接続する

## 技術スタック

> [!IMPORTANT]
> このファイルにバージョン番号やビルドターゲットなどの**具体値は書かない**。更新のたびに書き換える手間とドリフトを避けるため、必要なときは正本のファイルを読むこと。
>
> - JS / Electron の依存バージョン: `package.json`
> - .NET の TargetFramework: `Dotnet/VRCX-*.csproj`
> - Vite の dev port / build target / outDir: `src/vite.config.js`
> - フォーマッタ / Linter の設定値: `oxfmt.config.mts`、`oxlint.config.mts`（インデント幅・改行コード・printWidth などの基本値は `.editorconfig`）
> - DB スキーマバージョン: `src/stores/vrcx.js`

- **Frontend**: Vue、Pinia、Vue Router、Vite、TailwindCSS、shadcn-vue、reka-ui、LightningCSS、vue-i18n、Vitest、Vue Query、ECharts、Graphology + Sigma、vue-sonner
- **Backend**: C# / .NET、SQLite、OpenVR、node-api-dotnet
- **Desktop**: Electron (macOS/Linux)、CEF/CefSharp (Windows)、electron-builder
- **対応プラットフォーム**: Windows / Linux / macOS（x64 + arm64）、Browser

## アーキテクチャ

レンダラ (`src/`) → ネイティブブリッジ (`src/plugins/interopApi.js`、`src/ipc-electron/interopApi.js`、`src/ipc-browser/index.js`) → .NET ランタイム (`Dotnet/`) → VRChat REST/WebSocket、SQLite、OS 連携（Browser ターゲットのみ .NET ランタイムを介さずブラウザ API で代替）

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
- **Browser IPC ヘルパー** (`src/ipc-browser/`) — Browser ターゲットのネイティブ API モック
- **公開静的アセット** (`src/public/`)
- **アプリシェル CSS の分割**: `src/styles/globals.css` と `src/app.css`
- **Web Worker** (`src/workers/`) — Activity の重い計算をレンダラから分離
- **Cloudflare Pages Functions** (`functions/`) — Browser 版の VRChat REST 中継

## ディレクトリ構成

```text
src/
  app.js                  # Console捕捉 -> plugins/Pinia/WebSocket設定 -> Vue作成 -> router/Sentry -> mount
  App.vue                 # ルートシェル: TooltipProvider, MacOSTitleBar, RouterView, Toaster, ダイアログモーダル, アップデータ
  app.css                 # レイアウト/アプリシェル用 CSS
  index.html              # メインエントリ
  vr.html                 # VR オーバーレイエントリ
  vite.config.js          # Vite 設定 (outDir ../build/html)
  api/                    # VRChat API ラッパー
  components/             # 共通コンポーネントとダイアログ
  composables/            # Vue composables
  ipc-electron/           # レンダラ向け Electron interop ヘルパー
  ipc-browser/            # Browser 向け API モック、sql.js/IndexedDB、Cookie、MD5
  lib/                    # 共通ライブラリヘルパー
    activeWindowTracker.js  # ポップアウト: 複数 document の追跡と横断クエリ
    clipboard.js            # ポップアウト: フォーカス中ウィンドウの clipboard を使う
    modalPortalLayers.js    # ポップアウト: document ごとのモーダルポータル層
  localization/           # i18n JSON ファイル
  plugins/                # ブートストラッププラグイン (components, dayjs, i18n, interopApi, noty, router, sentry, ui)
  public/                 # Vite がコピーする静的アセット
  queries/                # Vue Query クライアント、key、キャッシュヘルパー、エンティティクエリ
  services/               # request/websocket/database/config/security/DevTools Console 等
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
  workers/                # Activity 計算用 Web Worker とランナー
src-electron/
  main.js                 # Electron メインプロセス
  preload.js              # preload ブリッジ
  InteropApi.js           # .NET interop エントリ
build-scripts/
  download-dotnet-runtime.js
  patch-node-api-dotnet.js
  patch-package-version.js
  rename-builds.js
  generate-third-party-licenses.js
functions/
  api/1/[[path]].ts       # Browser 版 VRChat REST プロキシ
Dotnet/
  AppApi/Common/          # 共通ネイティブ API サーフェス
  AppApi/Cef/             # Windows 専用 API レイヤ
  AppApi/Electron/        # Electron/macOS/Linux API レイヤ
  Overlay/                # VR オーバーレイ実装
  IPC/                    # IPC 基盤
  ScreenshotMetadata/     # スクリーンショットメタデータ対応
  VRCX-Cef.csproj         # Windows ビルド
  VRCX-Electron.csproj    # Electron x64 ビルド
  VRCX-Electron-arm64.csproj
electron-builder.config.js # Electron パッケージ設定
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
- 直接 REST アクセスとリクエスト重複排除は引き続き `src/services/request.js` の `request()` が担当

## ストアパターン

- ストアは引き続き `createGlobalStores()` で生成
- ストア横断のワークフロー調整は `src/coordinators/`
- coordinator のテストは `src/coordinators/__tests__/`
- oxlint が **ストア境界ルール**を強制: 他ストア境界を越えた `xxxStore.foo = ...` および `xxxStore.foo++/--` を禁止

## 設定の永続化

- `src/services/config.js`: `config:` プレフィックスキーの SQLite ベース config repository
- `VRCXStorage`: ファイル基盤のネイティブストレージ
- Browser では `VRCXStorage` をブラウザストレージで代替し、SQLite 本体と Cookie jar は IndexedDB に保存する
- Browser SQLite は実際の DML / DDL 変更だけを検出し、`persistIntervalMs` の短い間隔でまとめて保存する。トランザクション中は保存せず、COMMIT 後に変更がある場合だけ保存対象にする
- Browser のページ非表示・離脱時と `AppApi.RestartApplication()` 実行時は待機中の DB 保存を即時 flush する。IndexedDB への保存成功時は DevTools Console に `IndexedDBに保存しました。` と表示する

代表的な config キー:

- `VRCX_appLanguage`
- `VRCX_ThemeMode`
- `VRCX_lastDarkTheme`
- `VRCX_fontFamily`
- `VRCX_tablePageSize`
- `VRCX_navPanelWidth`
- `VRCX_tableDensity`

## 通知 / 共有フィードのフィルタ

入退室などの gamelog イベントは 3 つの出力面に分岐し、それぞれ独立したフィルタを持つ。

- **noty**: デスクトップ通知 / VR オーバーレイ通知 / TTS。`sharedFeedFilters.noty`
- **wrist**: VR オーバーレイの共有フィード。`sharedFeedFilters.wrist`
- **GameLog ページ**: 上記フィルタの影響を受けない。DB への記録は無条件で、表示はページ独自の種別フィルタと VIP 絞り込みのみ

選択肢の定義は `src/shared/constants/feedFilters.js`。noty と wrist は `baseOptions` を共有し、保存値は option の `label` 文字列そのもの（i18n キーではない）。

`Everyone w/o Public` は **fork 独自の選択肢**で、`OnPlayerJoined` / `OnPlayerLeft` にのみ提示する。Public および Group Public インスタンスではフレンドのみ、それ以外のインスタンスでは全員を通す。public 判定は `src/stores/sharedFeed.js` の `isPublicLocation()` に集約してあり、`accessType === 'public'`、または `accessType === 'group'` かつ `groupAccessType === 'public'` を public とみなす。

この値を扱う箇所は 3 つあり、選択肢を増減するときは揃えること。

1. `src/shared/constants/feedFilters.js` — 選択肢の提示
2. `src/stores/notification/index.js` の `queueGameLogNoty()` — noty 側の判定
3. `src/stores/sharedFeed.js` — wrist 側の逐次判定と、`loadSharedFeed()` のバケット振り分け + 後段フィルタ

注意点:

- `loadSharedFeed()` は DB を `LIMIT` 付きで引いてから JS 側で絞るため、Public の履歴が多いとオーバーレイに残る履歴が薄くなる
- 保存値の文字列を変更してもマイグレーションは無いため、既存設定に旧値が残るとどの分岐にも一致せず無言で通知が止まる
- 復元時の通知再発火は `playNoty()` が作成 1 分より古いイベントを捨てることで防いでいる

## 🪟 ポップアウトウィンドウ（フォーク独自）

ダイアログを `window.open()` した別ウィンドウへ Teleport して表示できる。**upstream には存在しないフォーク独自のサブシステム**で、upstream をマージするたびに壊れやすい箇所。

構成要素:

- `src/components/ui/window-teleport/WindowTeleport.vue` — 子ウィンドウを開き、スタイルを複製して Vue のツリーを Teleport する
- `src/lib/activeWindowTracker.js` — 開いている全 document を追跡し、`activeDocument` を保持する。`queryAcrossWindows()` / `queryAllAcrossWindows()` / `getFocusedWindow()` を提供
- `src/composables/usePortalDocument.js` — provide/inject で「自分が属する document」を配下へ伝える。`usePortalTarget()`、クロスウィンドウの誤 dismiss を防ぐ `useCrossWindowDismissGuard()` を含む
- `src/composables/useDialogPopoutModal.js` — ポップアウト内のダイアログでは `modal` を強制的に false にし、メインウィンドウが暗転して操作不能になるのを防ぐ
- `src/lib/modalPortalLayers.js` — document ごとにモーダルポータル層を確保・解放する
- `src/lib/clipboard.js` — `navigator.clipboard` をフォーカス中のウィンドウから取る。子ウィンドウでコピーが無反応になるのを防ぐ
- 組み込み箇所: `src/App.vue`、`src/views/Layout/MainLayout.vue`、`src/components/dialogs/MainDialogContainer.vue`

守るべき規約:

- **`document` / `window` のグローバルを直接使わない。** モジュールスコープの `document` は常にメインウィンドウを指すため、ポップアウト内の要素には当たらない
  - 要素探索は `document.getElementById()` / `querySelector()` ではなく `queryAcrossWindows()`
  - ポータル先は `document.body` ではなく `usePortalTarget()` / `usePortalDocument()`
  - クリップボードは `navigator.clipboard` ではなく `src/lib/clipboard.js`
  - ウィンドウ参照は `window` ではなく `getFocusedWindow()`
- upstream が新しく `document.*` を使うコードを入れてきたら、ポップアウト内で使われ得るコンポーネントかを確認する

既知の未対応:

- `src/components/ui/tabs/TabsUnderline.vue` の `getComputedStyle(document.documentElement).fontSize` は upstream 由来で、ポップアウト内ではメインウィンドウのルートを読む。両ウィンドウとも既定 16px のため現状は無害だが、ルートの font-size を可変にする場合は `usePortalDocument()` 経由に直す必要がある

## 改行コード

`.gitattributes` は **LF 既定**（2026-09-17 に upstream が CRLF 既定から転換）。`.cs` / `.csproj` / `.sln` / `.bat` / `.cmd` / `.nsi` / `.nsh` / `.manifest` / `.resx` など Windows 固有ファイルのみ CRLF。`.editorconfig` も同じ方針で揃えてある。

- 改行コードだけの差分を含むコミットを作らない。エディタや `core.autocrlf` の設定ずれが原因のことが多い
- 過去に blob 内へ CR が混入したファイルは、checkout し直しても `git diff` が消えないという症状を起こした（upstream PR vrcx-team/VRCX#1890 で修正済み）。同じ症状が再発した場合は `.git/info/attributes` に `* -text` を一時的に置いて `git checkout-index -f -a` で raw blob を書き戻すと回避できる

## VRChat API

- REST エンドポイントベース: `https://api.vrchat.cloud/api/1`（Browser のみ同一オリジンの `/api/1` を経由。VRChat が CORS ヘッダーを返さないため）
- WebSocket ベース: `wss://pipeline.vrchat.cloud`（Browser も直接接続する。WebSocket は同一オリジンポリシーの対象外で、pipeline は `Origin` を検証しない。認証は `?auth=` クエリのみで Cookie は不要）
- リクエスト経路: `src/services/request.js` → `src/services/webapi.js` → ネイティブ `WebApi`
- `src/services/request.js` に GET 重複排除ウィンドウと 404/403 抑制ウィンドウがある（具体値は同ファイルを参照）

## DB スキーマ

データベースバージョンは `VRCX_databaseVersion` config キーに保存し、`src/stores/vrcx.js` で管理する（現在値は同ファイルを参照）

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
- `printFavorites`
- `tableAlter`
- `tableFixes`
- `tableSize`

## スタイリング

- TailwindCSS + CSS 変数
- ベーステーマ/スタイルは `src/styles/globals.css`
- レイアウトシェル規則は `src/app.css`
- テーマファイルは `src/styles/themes/`
- 現行テーマ一覧: `blue`、`green`、`midnight`、`orange`、`red`、`rednight`、`rose`、`violet`、`yellow`

## 開発コマンド

ローカルでは `pnpm` を使用する。利用可能なスクリプトは `package.json` を正本とし、現在の主要スクリプトは以下。

```bash
pnpm dev
pnpm test
pnpm test:coverage
pnpm prod
pnpm build-electron
pnpm build-electron-arm64
pnpm start-electron
pnpm localization
pnpm lint
pnpm lint:fix
pnpm lint:fix-danger
pnpm typecheck:js
pnpm typecheck:vue
pnpm typecheck:node
pnpm format
pnpm format:check
pnpm dotnet_format
pnpm dotnet_format:check
pnpm build:licenses
```

## .NET ビルド

```bash
dotnet build Dotnet\VRCX-Cef.csproj -p:Configuration=Release -p:Platform=x64
dotnet build Dotnet\VRCX-Electron.csproj -p:Configuration=Release -p:Platform=x64
dotnet build Dotnet\VRCX-Electron-arm64.csproj -p:Configuration=Release -p:Platform=ARM64
```

## ツール / 規約

- **フォーマッタ**: oxfmt（`oxfmt.config.mts`）。`pnpm format` / `pnpm format:check` で実行。Vue には別 override がある。インデント幅・改行コード・printWidth などは `.editorconfig` を参照する
- **oxlint**: `oxlint.config.mts`、`pnpm lint` で実行。`oxlint-plugin-eslint` 経由の `eslint-js/no-restricted-syntax` でストア境界ルールを強制する。ESLint は廃止済み（upstream が oxlint に一本化）
- **C# フォーマッタ**: `pnpm dotnet_format` / `pnpm dotnet_format:check`
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

- `src/vite.config.js` は Chrome ベースの build target と LightningCSS を使用
- `src/public/` は Vite によってビルド出力にコピーされる
- フロントエンドのビルド成果物は全ターゲット共通で `build/html`。`pnpm prod` ひとつで Cef/Electron/Browser のいずれにも使える。`build-scripts/generate-third-party-licenses.js` と `wrangler.toml` (`pages_build_output_dir`) も同じディレクトリを参照する
- リリース CI は Browser 向けバンドルを `VRCXF_bundle.zip` としてリリースアセットに含める（`.github/workflows/release.yml` の `build_bundle` ジョブ）
- `NIGHTLY` は development 時または version suffix が 7 文字の hash のとき true
- `window.electron` は macOS/Linux のみ
- `pnpm dev` は Vite 開発サーバーだけを起動する。`src/vite.config.js` の `/api/1` プロキシ先である Cloudflare Pages Functions (`npx wrangler pages dev`、既定で 8788 番) は別途起動が必要。ビルド成果物が無くても起動できる
- `BROWSER` ターゲットでは `src/ipc-browser/index.js` が `WebApi`（fetch + Cookie 中継）、`SQLite`（sql.js + IndexedDB）、設定ストレージ、DB インポートを実装する。DB インポートは SQLite ヘッダーと `PRAGMA quick_check` を検証してから IndexedDB と実行中 DB を置き換える
- `LogWatcher` / `Discord` / ゲーム起動 / レジストリ操作 / スクリーンショット等のネイティブ依存機能は Browser ではスタブのため動作しない
- Diagnostics の DevTools Console は Browser 専用ではなく全プラットフォーム共通。`src/app.js` から `src/services/browserConsoleLog.js` を無条件 import し、console API、グローバルエラー、未処理 Promise rejection を最大 500 件までメモリ内だけに保持する。コマンド実行欄はあるがログの永続化は行わない
- Browser 版の「アプリをダウンロード」は Cloudflare API を経由せず、`src/shared/constants/link.js` の Microsoft Store URL を直接開く
- VR オーバーレイは Windows CEF と Electron/共有メモリの 2 系統に分かれたまま
- Windows CEF 版は framework-dependent としてビルドし、.NET ランタイムを配布物へ同梱しない。`--self-contained` を付けないこと。
- `build-scripts/build-all.ps1` は **どのディレクトリからでも**実行できる（スクリプト先頭の `cd "$PSScriptRoot/.."` でリポジトリルートに移動する）。`-NoCI` と `-BuildArm64` のスイッチを取る。ただし `-NoCI` を付けても `node_modules` は削除される（upstream の実装に合わせているため）。
- フロントエンドのビルドスクリプトは `pnpm prod` のみ。`prod-linux` / `prod-browser` は廃止され、全ターゲットが同じ成果物を使う
- framework-dependent への切り替え後などに古い成果物が混在して.NETランタイム要求ダイアログが表示される場合は、リポジトリ直下の `build/` を全削除してから `build-scripts/build-all.ps1` を再実行する。
- `build-scripts/build-all.ps1` は `7z` 実行時に失敗することがある（例: 7-Zip が PATH にない場合）。.NET ビルド、フロントエンドビルド、ライセンス生成、ジャンクション作成がすでに成功していれば、`7z` の失敗は無視して成功扱いにしてよい。
- `build-scripts/build-all.ps1` は `pwsh`（PowerShell 7 以降）前提。Windows PowerShell 5.1 では `$IsWindows` が自動変数として存在しないため `if ($IsWindows)` が全て false になり、**.NET ビルドもフロントエンドビルドも zip もインストーラーも実行されないまま exit 0 で「成功」する**（`node_modules` の作り直しだけが走る）。`pwsh` が無い環境では、呼び出し側で `$IsWindows = $true` を設定してから実行するか、`dotnet build` と `pnpm prod` を個別に実行する。
- `build-all.ps1` のインストーラー生成は、fork の `Version`（`Forked-AariyJP`）が数値でないため NSIS の `VIFileVersion` エラーで失敗する。`Installer/installer.nsi` には `PRODUCT_DISPLAY_VERSION` を別途 `!define` できる `!ifndef` フックがあるので、数値版と表示版を分ければ通せる。
- 最近のプロジェクトの方向性: coordinator 抽出、Vue Query 導入、CSS のトークン化、Browser 機能の拡充、Diagnostics 強化、upstream 同期マージ

## フォーク固有のブランディング

- Windows の実行ファイル名、インストール先、Application ID、URI スキーム、アンインストールキーは互換性維持のため `VRCX` / `vrcx` のまま
- Windows のインストーラー表示名、Publisher、URI の表示名、デスクトップとスタートメニューのショートカット名は `VRCXF` / `AariyJP`
- アンインストール時は `VRCXF.lnk` だけを削除し、`VRCX.lnk` には触れない
- NSIS インストーラーの PE `ProductName` は `VRCXF` だが、.NET アプリ本体の AssemblyTitle / Product は `VRCX` のまま

## GitHub 情報取得

- GitHub から情報を取得する際は、CLI (`gh` コマンド)、API (`curl`) の優先順位で使用すること

## 🚨 Git 操作の制限

- **commit と push**: `git commit` と `git push` は基本的にユーザーが行う。エージェントはユーザーの明示的な許可なくこれらの操作を行ってはならない。
- **`.serena/project.yml`**: 常にコミットに含めてよい。Serena による設定の自動移行で差分が出ても stash 退避や除外はせず、そのままステージする。
- **ブランチ保護の bypass 警告**: `develop` などへの push で `remote: Bypassed rule violations for refs/heads/...`（required status checks / Changes must be made through a pull request）が出るのは想定どおり。リポジトリオーナーが admin 権限で直接 push しているだけなので問題ない。エージェントはこれを警告として報告しなくてよい。
