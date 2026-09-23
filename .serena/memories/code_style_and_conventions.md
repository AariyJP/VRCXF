# コーディングスタイルと規約

## フォーマッタ: oxfmt

**Prettier は廃止済み**（`.prettierrc.json` は存在しない）。`oxfmt.config.mts` が正本。

- インデント幅・改行コード・printWidth・最終改行は `.editorconfig` から読む（`oxfmt.config.mts` 内ではコメントアウトされている）
- oxfmt 側で指定しているのは `semi: true`、`singleQuote: true`、`trailingComma: 'none'`、`bracketSpacing: true`、`arrowParens: 'always'`、JSDoc の折り返し方針
- Vue の override: `bracketSameLine: true`、`vueIndentScriptAndStyle: true`
- `build/**` は対象外

## Linter: oxlint

**ESLint は廃止済み**（upstream が vrcx-team/VRCX#1868 で oxlint に一本化）。`oxlint.config.mts` が正本。

- `oxlint-plugin-eslint` 経由の `eslint-js/no-restricted-syntax` で**ストア境界ルール**を強制している。他ストア境界を越えた `xxxStore.foo = ...` および `xxxStore.foo++/--` は禁止
- 既存の warning（未使用変数、`no-control-regex` など）がそれなりに残っているので、増減で判断する

## C#

`pnpm dotnet_format` / `pnpm dotnet_format:check`（`dotnet format`）。

## TypeScript / JS

- 本体コードは JS / Vue SFC。型定義は `.d.ts` に集約（`src/types/`）
- 型チェックは `tsconfig.checkjs.json`（`pnpm typecheck:js` / `typecheck:vue`）。`allowJs`、`checkJs`、`strict: false`、`moduleResolution: bundler`、`noEmit`
- パスエイリアス `@/*` → `./src/*`
- tsconfig は 4 分割: `tsconfig.json`、`tsconfig.app.json`、`tsconfig.checkjs.json`、`tsconfig.node.json`

## 命名 / 構造

- Vue コンポーネント: PascalCase
- ストアとヘルパーのファイル名: camelCase
- ルートは原則 kebab-case パス
- ストア横断の調整ロジックは、巨大化したストアにさらに足すより `src/coordinators/` に切り出す
- 取得/キャッシュ調整に属する処理は view ローカル状態ではなく **`src/queries/`**（`src/query/` ではない）配下に置く

## テスト

- Vitest / `jsdom` / `src/**/*.{test,spec}.js` / setup は `vitest.setup.js`
- coordinator のテストは **`src/coordinators/__tests__/`**（`src/stores/coordinators/__tests__/` ではない）
- **エージェントはテストファイルを基本変更・実行しない** (`mem:testing_policy`)

## コメントポリシー

- 既存コメントはそのまま残す
- **生成したコードに新規の説明コメントを書かない**
- i18n JSON は明示指示がない限り変更しない (`mem:i18n_upstream_policy`)

## 改行コード

`.gitattributes` は **LF 既定**（2026-09-17 に upstream が CRLF 既定から転換）。Windows 固有ファイル（`.cs`、`.csproj`、`.sln`、`.bat`、`.cmd`、`.nsi`、`.nsh`、`.manifest`、`.resx`）のみ CRLF。改行だけの差分を含むコミットを作らないこと。
