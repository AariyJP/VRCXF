# タスク完了チェックリスト

## スコープ確認

- フロントエンドのみ / .NET のみ / 両方のどれを触ったか整理する
- ネイティブとフロントの境界に触れた場合は両プラットフォーム経路を確認する
- アーキテクチャやパターンが変わったら `AGENTS.md`（`CLAUDE.md` はその symlink）と Serena メモリを更新する

## 品質チェック

触った領域に応じて実行する。**ESLint / Prettier は廃止済みなので使わない。**

```bash
pnpm lint
pnpm format:check
pnpm typecheck:js
pnpm typecheck:vue
pnpm prod
```

- `pnpm prod` ひとつで Cef / Electron / Browser 全ターゲット分の成果物になる（`prod-linux` は廃止済み）
- 既存の型エラー・lint 警告が残っているので、**差分（新規に増えたか）で判断する**
- `pnpm test` は基本走らせない (`mem:testing_policy`)
- 実行していないチェックを実行したと報告しないこと

## ネイティブの検証

.NET / interop を変更した場合（`--self-contained` は付けない）:

```bash
dotnet build Dotnet\VRCX-Cef.csproj -p:Configuration=Release -p:Platform=x64
dotnet build Dotnet\VRCX-Electron.csproj -p:Configuration=Release -p:Platform=x64
dotnet build Dotnet\VRCX-Electron-arm64.csproj -p:Configuration=Release -p:Platform=ARM64
```

## クロスプラットフォーム検証

ネイティブ API を追加・変更した、または共通 UI の挙動を変えた場合:

- `WINDOWS` / `LINUX` / `BROWSER` の分岐を確認
- CEF / Electron 経路が両方つじつまの合う状態か確認
- 必要箇所で `window.electron` がガードされているか確認
- `src/plugins/interopApi.js`、`src/ipc-electron/interopApi.js`、`src/ipc-browser/index.js` とネイティブサーフェスの整合を保つ
- Browser の REST 中継を変えたら `functions/api/1/[[path]].ts` も確認する

## ポップアウトウィンドウ検証

UI に `document` / `window` / `navigator.clipboard` を使うコードが入った場合:

- `queryAcrossWindows()` / `usePortalTarget()` / `src/lib/clipboard.js` / `getFocusedWindow()` を使っているか確認する
- 詳細は `mem:popout_windows`

## データ / スキーマ検証

- 必要に応じて **`src/services/database/`**（`src/service/database/` ではない）のスキーマ/マイグレーションを更新
- 既存 DB のマイグレーション経路と新規 DB 作成経路の両方を考慮する
- DB バージョンを上げたら `src/stores/vrcx.js` の `databaseVersion` も更新する

## Query / キャッシュ検証

- ストアやコンポーネントではなく **`src/queries/`**（`src/query/` ではない）に置くべきかを確認
- invalidation / キャッシュ更新経路もチェック

## 通知 / 共有フィード検証

`sharedFeedFilters` の選択肢を増減した場合は 3 箇所を揃える:

1. `src/shared/constants/feedFilters.js`
2. `src/stores/notification/index.js` の `queueGameLogNoty()`
3. `src/stores/sharedFeed.js`（逐次判定 + `loadSharedFeed()` のバケット振り分けと後段フィルタ）

## ドキュメント / 規約

- 生成コードに新規の説明コメントを追加しない
- i18n JSON は触らない (`mem:i18n_upstream_policy`)
- 改行コードだけの差分を混ぜない

## Git / 納品

- `git status` / `git diff` で確認
- **ユーザーが明示しない限り commit / push しない**
- 実行したチェック・していないチェックを明確に報告する
