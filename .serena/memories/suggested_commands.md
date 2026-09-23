# 推奨コマンド集

パッケージマネージャは **pnpm**。`npm` ではない。スクリプトの正本は `package.json`。

## 主要スクリプト

```bash
pnpm dev
pnpm prod
pnpm build-electron
pnpm build-electron-arm64
pnpm start-electron
pnpm localization
pnpm build:licenses
```

- `pnpm dev` は Vite のみ起動する。Browser ターゲットの REST 中継 (Cloudflare Pages Functions) は別プロセスで `npx wrangler pages dev` が必要（`src/vite.config.js` のプロキシ先はポート 8788）
- **`prod-linux` / `prod-browser` / `dev-linux` / `preview-cloudflare` は廃止済み。** 全ターゲットが `pnpm prod` の成果物 (`build/html`) を共有する

## Lint / Format / 型チェック

```bash
pnpm lint
pnpm lint:fix
pnpm format
pnpm format:check
pnpm typecheck:js
pnpm typecheck:vue
pnpm typecheck:node
pnpm dotnet_format
pnpm dotnet_format:check
```

- **ESLint と Prettier は廃止済み。** oxlint (`oxlint.config.mts`) と oxfmt (`oxfmt.config.mts`) に一本化された。`npx eslint` / `npx prettier` を提案しないこと
- `typecheck:js` / `typecheck:vue` は `tsconfig.checkjs.json` を使う
- 既存の型エラー・lint 警告がそれなりに残っているので、差分の有無で判断する

## テスト

```bash
pnpm test
pnpm test:coverage
```

> エージェントは自動的に走らせない。実行・編集はユーザーの明示依頼があった場合のみ (`mem:testing_policy`)。

## .NET ビルド

```bash
dotnet build Dotnet\VRCX-Cef.csproj -p:Configuration=Release -p:Platform=x64
dotnet build Dotnet\VRCX-Electron.csproj -p:Configuration=Release -p:Platform=x64
dotnet build Dotnet\VRCX-Electron-arm64.csproj -p:Configuration=Release -p:Platform=ARM64
```

**`--self-contained` は付けない。** Windows CEF 版は framework-dependent でビルドし、.NET ランタイムを同梱しない方針。

## build-all.ps1

`build-scripts/build-all.ps1` は **どのディレクトリからでも実行できる**（スクリプト先頭の `cd "$PSScriptRoot/.."` でリポジトリルートへ移動する）。`-NoCI` と `-BuildArm64` のスイッチを取る。

落とし穴:

- `pwsh`(PowerShell 7+) 前提。Windows PowerShell 5.1 では `$IsWindows` が未定義のため全分岐が false になり、**何もビルドしないまま exit 0 で「成功」する**。`pwsh` が無ければ `$IsWindows = $true` を設定するか、`dotnet build` と `pnpm prod` を個別に実行する
- `-NoCI` を付けても `node_modules` は削除される（upstream 実装に合わせているため）
- `7z` ステップで失敗することがある（7-Zip が PATH にない等）。.NET ビルド / フロントエンドビルド / ライセンス生成 / ジャンクション作成が成功していれば無視してよい
- インストーラー生成は fork の `Version`(`Forked-AariyJP`) が数値でないため NSIS の `VIFileVersion` エラーで失敗する。`Installer/installer.nsi` の `PRODUCT_DISPLAY_VERSION` の `!ifndef` フックで数値版と表示版を分ければ通せる

## Git の参照のみ

commit / push はユーザーが行う。エージェントは明示指示がない限り実行しない。

```bash
git status
git diff
git log --oneline --decorate -n 20
```

## 補足

- PowerShell を使う場合は文字化け回避のため `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8;` を前置する
- 可能な限り Shell より Serena / 純正ツールを優先する
