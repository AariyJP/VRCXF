# タスク完了時のチェックリスト

## コード変更後の必須手順

### 1. コード品質チェック

#### Linting
```bash
# ESLint実行
npx eslint .

# 自動修正可能な問題を修正
npx eslint . --fix
```

#### Formatting
```bash
# Prettier実行 (チェックのみ)
npx prettier --check .

# 自動フォーマット
npx prettier --write .
```

### 2. テスト実行

```bash
# 全テスト実行
npm test

# カバレッジ確認 (必要に応じて)
npm run test:coverage
```

### 3. ビルド確認

#### フロントエンド

```bash
# Windows版ビルド
npm run prod

# Linux版ビルド (クロスプラットフォーム対応の場合)
npm run prod-linux
```

#### .NET (必要に応じて)

```bash
# Windows CEF版
dotnet build Dotnet\VRCX-Cef.csproj -p:Configuration=Release -p:Platform=x64

# Electron版
dotnet build Dotnet\VRCX-Electron.csproj -p:Configuration=Release -p:Platform=x64
```

### 4. 動作確認

```bash
# 開発サーバーで動作確認
npm run dev

# または Electron版で確認
npm run start-electron
```

### 5. Git操作

```bash
# 変更内容確認
git status
git diff

# ステージング
git add .

# コミット (意味のあるメッセージを記述)
git commit -m "feat: 新機能の説明" 
# または
git commit -m "fix: バグ修正の説明"
# または
git commit -m "refactor: リファクタリングの説明"

# プッシュ (必要に応じて)
git push
```

## クロスプラットフォーム対応の確認

新しいネイティブAPI呼び出しを追加した場合:

### 1. 共通APIの追加
- `Dotnet/AppApi/Common/` に共通メソッドを追加

### 2. プラットフォーム固有の実装
- Windows: `Dotnet/AppApi/Cef/` に実装
- macOS/Linux: `Dotnet/AppApi/Electron/` に実装

### 3. フロントエンドの分岐
- `WINDOWS`/`LINUX` グローバル定数で分岐
- 既存パターンを参照:
  - `src/plugin/interopApi.js`
  - `src/service/webapi.js`

### 4. Electron専用APIの使用
- `window.electron.*` を使用する場合、Windows (CEF) のフォールバック実装を検討

### 5. ビルド確認
- 両方の .csproj でビルドが成功することを確認:
  ```bash
  dotnet build Dotnet\VRCX-Cef.csproj -p:Configuration=Release -p:Platform=x64
  dotnet build Dotnet\VRCX-Electron.csproj -p:Configuration=Release -p:Platform=x64
  ```

## i18n対応の確認

テキストを追加/変更した場合:

### 1. 翻訳キーの追加
- `src/localization/` の各言語ファイル (14言語) に翻訳を追加
- 最低限 `en.json` と `ja.json` は必須

### 2. i18nヘルパーの使用
```bash
npm run localization
```

### 3. 翻訳の確認
- 開発サーバーで各言語に切り替えて表示を確認

## データベーススキーマ変更の確認

スキーマを変更した場合:

### 1. マイグレーションの追加
- `src/service/database/tableAlter.js` にマイグレーションを追加

### 2. テーブル定義の更新
- 該当する `src/service/database/` のファイルを更新

### 3. 動作確認
- 既存データベースでのマイグレーションテスト
- 新規データベースでの作成テスト

## VRChat API変更の確認

VRChat APIエンドポイントを追加/変更した場合:

### 1. APIラッパーの更新
- `src/api/` の該当ファイルを更新

### 2. 型定義の更新
- `src/types/api/` の該当ファイルを更新

### 3. レート制限の確認
- VRChat APIのレート制限に違反していないか確認

## UIコンポーネント追加の確認

新しいコンポーネントを追加した場合:

### 1. shadcn-vueの使用
- 可能な限り `src/components/ui/` の既存コンポーネントを使用

### 2. スタイリング
- TailwindCSS 4を使用
- カスタムCSSは `src/styles/globals.css` または `src/styles/themes/` に追加

### 3. レスポンシブ対応
- モバイル、タブレット、デスクトップでの表示確認

## パフォーマンス確認

### 1. バンドルサイズ
- ビルド後のバンドルサイズを確認
- 必要に応じて動的インポートを使用

### 2. メモリリーク
- 長時間実行時のメモリ使用量を確認
- 不要なリスナーやタイマーの削除を確認

### 3. WebSocket接続
- WebSocket接続の安定性を確認
- 自動再接続が正常に動作することを確認

## セキュリティ確認

### 1. XSS対策
- ユーザー入力を適切にエスケープ
- `v-html` の使用を最小限に

### 2. 認証/認可
- 認証が必要なページへのアクセス制御を確認
- トークンの適切な管理を確認

### 3. 依存関係の脆弱性
```bash
npm audit
npm audit fix
```

## ドキュメント更新

### 1. コメント
- 複雑なロジックには説明コメントを追加

### 2. README/AGENTS.md/CLAUDE.md
- 重要な変更は該当ドキュメントを更新

### 3. 型定義
- TypeScript型定義 (`src/types/`) を最新に保つ

## 最終チェック

- [ ] ESLint エラーなし
- [ ] Prettier フォーマット済み
- [ ] テスト全て成功
- [ ] ビルド成功 (Windows/Linux両方)
- [ ] 動作確認完了
- [ ] クロスプラットフォーム対応確認 (該当する場合)
- [ ] i18n対応確認 (該当する場合)
- [ ] Git コミット完了
- [ ] ドキュメント更新 (必要に応じて)
