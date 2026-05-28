# コーディングスタイルと規約

## フォーマット

`.prettierrc.json` の現行設定:

- `printWidth: 80`
- `tabWidth: 4`
- `semi: true`
- `singleQuote: true`
- `quoteProps: as-needed`
- `trailingComma: none`
- `arrowParens: always`
- Vue オーバーライド: `printWidth: 120`、`bracketSameLine: true`、`vueIndentScriptAndStyle: true`
- JS オーバーライド: パーサーに `meriyah` を使用

## ESLint

`eslint.config.mjs` で使用しているプラグイン:

- `@eslint/js`
- `eslint-plugin-vue`
- `eslint-plugin-prettier`
- `eslint-plugin-jsdoc`
- `@kamiya4047/eslint-plugin-pretty-import`

主なルール:

- `no-unused-vars: warn`
- `no-case-declarations: off`
- `no-control-regex: warn`
- `vue/no-mutating-props: warn`
- `vue/multi-word-component-names: off`
- `vue/no-v-text-v-html-on-component: off`
- `vue/no-use-v-if-with-v-for: warn`
- `pretty-import/*` 系を有効化
- `no-restricted-syntax` でストア境界を越えた `xxxStore.foo = ...` および `xxxStore.foo++/--` を禁止

## TypeScript / JS

- 本体コードは JS / Vue SFC
- 型定義は `.d.ts` に集約
- `tsconfig.app.json` は `allowJs`、`checkJs`、`strict: false`、`moduleResolution: bundler`、`noEmit`
- TS の型に Vitest グローバルを含む

## テスト

- ランナー: Vitest
- 環境: `jsdom`
- include パターン: `src/**/*.{test,spec}.js`
- セットアップ: `vitest.setup.js`
- coordinator のテストは `src/stores/coordinators/__tests__/`
- **エージェントはテストファイルを基本変更・実行しない**。詳細は `mem:testing_policy`。

## 命名 / 構造

- Vue コンポーネント: PascalCase
- ストアとヘルパーのファイル名: camelCase
- ルートは原則 kebab-case パス
- ストア横断の調整ロジックは、巨大化したストアにさらに足すより coordinator モジュールに切り出す
- 取得/キャッシュ調整に属する処理は、view ローカル状態ではなく `src/query/` 配下に置く

## コメントポリシー

- 既存コメントはそのまま残してよい
- エージェントは明示的に必要とされない限り新規の説明コメントを追加しない
- 翻訳作業を伴うタスクでない限り、i18n JSON ファイルは変更しない
