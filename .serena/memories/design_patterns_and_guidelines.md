# 設計パターンとガイドライン

## アーキテクチャパターン

### フロントエンドのレイヤ分離

ロジックを置く場所:

- View / UI: `src/views/`、`src/components/`
- View 横断の再利用: `src/composables/`
- ストア状態: `src/stores/`
- ストア横断調整: `src/coordinators/`
- データ取得 / キャッシュ方針: `src/queries/`
- 外部サービス / 永続化: `src/services/`
- 共通の純粋ヘルパー・定数: `src/shared/`

### Coordinator パターン

複数ステップに渡るストア処理は coordinator に切り出す方針。既に肥大化したストアファイルにロジックを追加するより、`src/coordinators/` に新規 coordinator を追加することを優先する。

### ストア境界ルール

他ストアの状態を `otherStore.foo = ...` や複合代入で直接変更しない。所有ストアのアクション/セッターを経由するか、coordinator 経由のフローを使う。

### Query パターン

キャッシュを意識したエンティティ取得・同期には Vue Query を使用する。トランスポートは `src/services/request.js` と API ラッパー、クライアント/キャッシュ/クエリキー方針は `src/queries/`。

### ルーターパターン

`src/plugins/router.js` は旧来の `next()` ベースではなく return ベースのガードを使う。`redirect` クエリ処理と `/social` への明示的なブロックを保持すること。

### クロスプラットフォームパターン

- フロントエンドは `WINDOWS` / `LINUX` / `BROWSER` で分岐
- CEF と Electron プロキシ経路でネイティブバインディングが異なる。`BROWSER` は `src/ipc-browser/index.js` のブラウザ内モック（.NET ランタイムなし、開発/検証用で配布対象外）
- 共通機能は可能な限り `Dotnet/AppApi/Common/` に置く
- 共有 UI コードから `window.electron` 専用 API を使う場合は注意する
- `src/services/webapi.js` は `LINUX` のときのみ `ExecuteJson()`、それ以外(Windows/Browser)は `Execute()`(`{Item1,Item2}`形式)に分岐。Browser モックもこの形式に合わせている

### スタイリングパターン

- 基本変数や共通スタイルは `src/styles/globals.css`
- アプリシェル / レイアウト規則は `src/app.css`
- テーマ固有値は `src/styles/themes/`
- すでにリファクタ済みの領域を触るときは、新たな ad-hoc なハードコード値より、デザイントークン / ユーティリティクラスを優先する

### テストパターン

テストは対象に近い場所に置く:

- 汎用ストアテスト: `src/stores/__tests__/`
- coordinator テスト: `src/coordinators/__tests__/`
- コンポーネント/ビューテスト: 各 `__tests__` 配下

ただしテスト自体の追加・編集はエージェントの基本スコープ外 (`mem:testing_policy` 参照)。

### 静的アセットパターン

Vite がコピーする公開アセットは `src/public/` に置く。すべての静的アセットがリポジトリルートの `images/` 配下にあると仮定しないこと。レンダラ向けアセットは増えるごとに `src/public/` 配下へ移っている。
