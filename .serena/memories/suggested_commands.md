# 推奨コマンド

## 開発コマンド

### フロントエンド開発

```bash
# Windows版開発サーバー起動 (ポート9000)
npm run dev

# Linux版開発サーバー起動
npm run dev-linux

# 開発サーバー + テスト監視
npm run dev:test
```

### テスト

```bash
# テスト実行
npm test

# カバレッジ付きテスト
npm run test:coverage
```

### ビルド

```bash
# Windows版プロダクションビルド
npm run prod

# Linux版プロダクションビルド
npm run prod-linux

# Electronビルド (x64)
npm run build-electron

# Electronビルド (arm64)
npm run build-electron-arm64

# Electron起動 (ホットリロード付き)
npm run start-electron
```

### ユーティリティ

```bash
# i18nヘルパーCLI
npm run localization
```

## .NETビルド

### Visual Studio

```bash
# Windows CEF版ビルド (Release, x64)
dotnet build Dotnet\VRCX-Cef.csproj -p:Configuration=Release -p:Platform=x64 -p:RestorePackagesConfig=true -t:"Restore;Clean;Build" -m --self-contained

# Electron版ビルド (x64)
dotnet build Dotnet\VRCX-Electron.csproj -p:Configuration=Release -p:Platform=x64

# Electron版ビルド (arm64)
dotnet build Dotnet\VRCX-Electron-arm64.csproj -p:Configuration=Release -p:Platform=x64
```

### ソリューション全体

```bash
# Visual Studioソリューションビルド
msbuild VRCX.sln /p:Configuration=Release /p:Platform=x64
```

## 完全ビルド (Windows)

```powershell
# すべてをビルド (PowerShell)
.\build-scripts\build-all.ps1
```

このスクリプトは以下を実行:
1. .NETビルド (VRCX-Cef.csproj)
2. Node.jsビルド (`npm ci` + `npm run prod`)
3. Zipファイル作成
4. NSISインストーラー作成
5. SHA256ハッシュ生成

## パッケージ管理

```bash
# 依存関係インストール
npm ci

# 依存関係インストール (開発環境)
npm install

# 依存関係更新
npm update
```

## コード品質

### Linting

```bash
# ESLint実行
npx eslint .

# ESLint自動修正
npx eslint . --fix
```

### Formatting

```bash
# Prettier実行 (チェックのみ)
npx prettier --check .

# Prettier自動修正
npx prettier --write .
```

## Git操作

```bash
# ステータス確認
git status

# 変更をステージング
git add .

# コミット
git commit -m "コミットメッセージ"

# プッシュ
git push

# プル
git pull

# ブランチ作成
git checkout -b ブランチ名

# ブランチ切り替え
git checkout ブランチ名

# ブランチ一覧
git branch
```

## Windows固有のユーティリティコマンド

```cmd
# ディレクトリ一覧
dir

# ディレクトリ移動
cd パス

# ファイル検索
where ファイル名

# ファイル内容表示
type ファイル名

# ファイル/ディレクトリコピー
xcopy /E /I ソース 宛先

# ファイル/ディレクトリ削除
rmdir /S /Q ディレクトリ名
del ファイル名

# 環境変数表示
set

# プロセス一覧
tasklist

# プロセス終了
taskkill /F /PID プロセスID
```

## デバッグ

### Electron DevTools

```bash
# Electron起動時に自動的にDevToolsが開く
npm run start-electron
```

### Vite DevTools

開発サーバー起動時にブラウザで `http://localhost:9000` にアクセス

## データベース操作

### DBMerger

```bash
# DBマージツール実行
dotnet run --project Dotnet\DBMerger\DBMerger.csproj
```

## クリーンアップ

```bash
# node_modules削除
rmdir /S /Q node_modules

# buildディレクトリ削除
rmdir /S /Q build

# .NETビルド成果物削除
dotnet clean
```

## CI/CD

GitHub Actionsワークフロー:
- `.github/workflows/build.yml`: ビルド
- `.github/workflows/github_actions.yml`: GitHub Actions
- `.github/workflows/release.yml`: リリース

## 環境変数

### Vite

```bash
# プラットフォーム指定 (windows/linux)
set PLATFORM=windows
npm run dev

# Sentry認証トークン (ソースマップアップロード用)
set SENTRY_AUTH_TOKEN=your_token
npm run prod
```

## トラブルシューティング

```bash
# node_modules再インストール
rmdir /S /Q node_modules
npm ci

# キャッシュクリア
npm cache clean --force

# .NETビルドキャッシュクリア
dotnet clean
rmdir /S /Q Dotnet\bin
rmdir /S /Q Dotnet\obj
```
