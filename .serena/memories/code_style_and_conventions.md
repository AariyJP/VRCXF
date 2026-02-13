# コードスタイルと規約

## Prettier設定 (`.prettierrc.json`)

### 基本設定
- `printWidth`: 80 (JS) / 120 (Vue)
- `tabWidth`: 4
- `semi`: true (セミコロン必須)
- `singleQuote`: true (シングルクォート)
- `quoteProps`: "as-needed"
- `trailingComma`: "none" (末尾カンマなし)
- `bracketSpacing`: true
- `arrowParens`: "always"
- `endOfLine`: "auto"

### ファイル別オーバーライド
- **JS**: `parser: "meriyah"`
- **Vue**: 
  - `printWidth: 120`
  - `bracketSameLine: true`
  - `vueIndentScriptAndStyle: true`

## ESLint設定 (`eslint.config.mjs`)

### プラグイン
- `@eslint/js` (recommended)
- `eslint-plugin-vue` (flat/essential)
- `eslint-plugin-prettier` (recommended)
- `@kamiya4047/eslint-plugin-pretty-import` (import整理)

### グローバル変数
- ブラウザグローバル + 以下のカスタムグローバル:
  - `CefSharp`, `VRCX`, `VRCXStorage`, `SQLite`, `LogWatcher`, `Discord`
  - `AppApi`, `AppApiVr`, `WebApi`, `AssetBundleManager`
  - `WINDOWS`, `LINUX`, `VERSION`, `NIGHTLY`
  - `webApiService`, `process`

### ルール
- `no-unused-vars`: "warn"
- `no-case-declarations`: "off"
- `no-control-regex`: "warn"
- `vue/no-mutating-props`: "warn"
- `vue/multi-word-component-names`: "off"
- `vue/no-v-text-v-html-on-component`: "off"
- `vue/no-use-v-if-with-v-for`: "warn"
- `pretty-import/separate-type-imports`: "warn"
- `pretty-import/sort-import-groups`: "warn" (groupStyleImports: true)
- `pretty-import/sort-import-names`: "warn"

### 特殊ファイル設定
- **Node.js環境** (`webpack.*.js`, `jest.config.js`, `src-electron/*.js`, `src/localization/*.js`):
  - `sourceType: "commonjs"`
  - `globals: node`
- **テストファイル** (`**/__tests__/**/*.{js,mjs,cjs,vue}`, `**/*.spec.{js,mjs,cjs,vue}`, `**/*.test.{js,mjs,cjs,vue}`):
  - `globals: jest`

## TypeScript設定 (`tsconfig.json`)

### 基本設定
- `allowJs`: true
- `checkJs`: true
- `strict`: false
- `noEmit`: true
- `moduleResolution`: "bundler"

### パスエイリアス
- `@/*` → `./src/*`
- `*` → `./*`

## ファイル形式

- 主にJS (`.js` / `.vue`)
- 型定義のみ `.d.ts`

## 命名規約

### Vue コンポーネント
- PascalCase (例: `NavMenu.vue`, `MainLayout.vue`)
- UI primitives: `src/components/ui/` (shadcn-vue)
- Dialogs: `src/components/dialogs/`

### ファイル/ディレクトリ
- camelCase (例: `webapi.js`, `appConfig.js`)
- kebab-case (例: `friend-log`, `screenshot-metadata`)

### 変数/関数
- camelCase (例: `isLoggedIn`, `applyUser`, `createGlobalStores`)

### 定数
- UPPER_SNAKE_CASE (グローバル定数)
- camelCase (ローカル定数)

## Vue スタイル

### Composition API
- `<script setup>` を使用
- Pinia stores
- Composables (`src/composables/`)

### インポート順序 (pretty-import)
1. 外部ライブラリ
2. 内部モジュール
3. スタイルインポート (groupStyleImports: true)

## .NET コードスタイル

### プロジェクト
- `VRCX-Cef.csproj`: Windows (CEF)
- `VRCX-Electron.csproj`: Electron x64
- `VRCX-Electron-arm64.csproj`: Electron arm64

### 条件付きコンパイル
- `#if LINUX` / `#if !LINUX`
- プラットフォーム固有のコードは `AppApi/Cef/` または `AppApi/Electron/` に配置
- 共通コードは `AppApi/Common/` に配置

### 命名
- PascalCase (クラス、メソッド、プロパティ)
- camelCase (ローカル変数、パラメータ)

## プラットフォーム分岐パターン

### フロントエンド
```javascript
if (WINDOWS) {
    // Windows (CEF) 専用コード
} else {
    // macOS/Linux (Electron) 専用コード
}
```

### .NET Interop
```javascript
// Windows
await CefSharp.BindObjectAsync('AppApi');

// Linux
window.interopApi.callDotNetMethod('AppApi', 'MethodName', [args]);
```

### WebApi実行
```javascript
// webApiService.execute() 内で自動分岐
// WINDOWS: WebApi.Execute() → {Item1, Item2}
// LINUX: WebApi.ExecuteJson() → JSON string
```

## コメント

- 重要なロジックには説明コメントを追加
- TODOコメント: `// TODO: 説明`
- 複雑な正規表現や条件には説明を追加

## グローバル定数 (Vite define)

- `WINDOWS`: `process.env.PLATFORM === 'windows'`
- `LINUX`: `process.env.PLATFORM === 'linux'`
- `VERSION`: `./Version` ファイルの内容
- `NIGHTLY`: 開発モードまたはバージョンが7文字のコミットハッシュで終わる場合にtrue
