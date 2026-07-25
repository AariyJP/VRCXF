# 推奨コマンド集

## 主要 npm スクリプト

```bash
npm run dev
npm run dev-linux
npm run dev-browser
npm test
npm run test:coverage
npm run prod
npm run prod-linux
npm run prod-browser
npm run preview-cloudflare
npm run build-electron
npm run build-electron-arm64
npm run start-electron
npm run localization
npm run dotnet-win
npm run dotnet-arm64
```

> **メモ**: `npm test` / `npm run test:coverage` はエージェントが自動的に走らせない。テストの実行・編集はユーザーから明示的な依頼があった場合のみ (`mem:testing_policy`)。

## Lint / Format

```bash
npm run lint
npm run lint:eslint
npm run lint:oxlint
npm run typecheck:js
npx eslint .
npx eslint . --fix
npx prettier --check .
npx prettier --write .
```

## .NET ビルド

```bash
dotnet build Dotnet\VRCX-Cef.csproj -p:Configuration=Release -p:Platform=x64 --self-contained
dotnet build Dotnet\VRCX-Electron.csproj -p:Configuration=Release -p:Platform=x64
dotnet build Dotnet\VRCX-Electron-arm64.csproj -p:Configuration=Release -p:Platform=ARM64
```

## その他ユーティリティ

```bash
dotnet run --project Dotnet\DBMerger\DBMerger.csproj
npm ci
npm install
```

## Git の参照のみ

Git コマンドは参照用にのみ使う。ユーザーの代わりに commit / push しない。

```bash
git status
git diff
git log --oneline --decorate -n 20
```

## 補足

- `dev-browser` / `prod-browser` / `preview-cloudflare` は `PLATFORM=browser`(`BROWSER` フラグ) の開発/検証用ブラウザターゲット。配布物ではなく、`src/ipc-browser/` のモックでネイティブ API を代替する
- 現プロジェクトに `npm run dev:test` は存在しない
- 可能な限り Shell より Serena / 純正ツールを優先する
- commit / push はユーザーが行うため、エージェント側で走らせない
- `build-scripts/build-all.ps1` は **`build-scripts/` ディレクトリから**実行すること（スクリプトの先頭が `cd ..`）。`Set-Location build-scripts; .\build-all.ps1` または `powershell -Command "Set-Location 'path\to\VRCX\build-scripts'; .\build-all.ps1"` のように呼ぶ
- `build-scripts/build-all.ps1` は `7z` ステップで停止することがある（例: 7-Zip が PATH にない場合）。.NET ビルド、フロントエンドビルド、ライセンス生成、ジャンクション作成がすでに成功していれば、`7z` の失敗は無視して成功扱いにしてよい
