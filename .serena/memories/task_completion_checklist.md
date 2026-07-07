# タスク完了チェックリスト

## コード変更後の流れ

### スコープ確認

- フロントエンドのみ / .NET のみ / 両方のどれを触ったか整理する
- ネイティブとフロントの境界に触れた場合は両プラットフォーム経路を確認する
- アーキテクチャが大きく変わったら `AGENTS.md` を更新する

### 品質チェック

触った領域に応じて以下を実行する:

```bash
npx eslint .
npm run prod
npm run prod-linux
```

> **注意**: `npm test` は基本走らせない。テストの実行・修正・追加はユーザーから明示的に依頼された場合のみ (`mem:testing_policy`)。

タスクが狭いときは絞った検証で構わないが、実行していないチェックを実行したと報告しないこと。

### ネイティブの検証

.NET / interop を変更した場合は対応するビルドを実行:

```bash
dotnet build Dotnet\VRCX-Cef.csproj -p:Configuration=Release -p:Platform=x64 --self-contained
dotnet build Dotnet\VRCX-Electron.csproj -p:Configuration=Release -p:Platform=x64
dotnet build Dotnet\VRCX-Electron-arm64.csproj -p:Configuration=Release -p:Platform=ARM64
```

### クロスプラットフォーム検証

ネイティブ API を追加・変更した、または共通 UI の挙動を変えた場合:

- `WINDOWS` / `LINUX` の分岐を確認
- CEF / Electron 経路が両方つじつまの合う状態か確認
- 必要箇所で `window.electron` がガードされているか確認
- `src/plugin/interopApi.js`、`src/ipc-electron/interopApi.js` とネイティブサーフェスの整合を保つ

### データ / スキーマ検証

DB 挙動を変えた場合:

- 必要に応じて `src/service/database/` のスキーマ/マイグレーションモジュールを更新
- 既存 DB のマイグレーション経路と新規 DB 作成経路の両方を考慮する

### Query / キャッシュ検証

エンティティ取得/キャッシュロジックを変えた場合:

- ストアやコンポーネントではなく `src/query/` に置くべきかを確認
- 必要なら invalidation / キャッシュ更新経路もチェック

### ドキュメント / 規約

- 必須でない限り新規説明コメントは追加しない
- 翻訳タスクでない限り i18n JSON は触らない
- 構造やパターンが変わったら `AGENTS.md` または Serena メモリを更新する

### Git / 納品

- 必要に応じて `git status` / `git diff` で確認
- ユーザーが明示しない限り commit / push しない
- 実行したチェック・していないチェックを明確に報告する
