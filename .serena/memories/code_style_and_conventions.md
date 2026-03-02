# Code Style and Conventions

## Prettier Configuration (`.prettierrc.json`)

### Basic Settings
- `printWidth`: 80 (JS) / 120 (Vue)
- `tabWidth`: 4
- `semi`: true (Semicolons required)
- `singleQuote`: true (Single quotes)
- `quoteProps`: "as-needed"
- `trailingComma`: "none" (No trailing commas)
- `bracketSpacing`: true
- `arrowParens`: "always"
- `endOfLine`: "auto"

### File-specific Overrides
- **JS**: `parser: "meriyah"`
- **Vue**: 
  - `printWidth: 120`
  - `bracketSameLine: true`
  - `vueIndentScriptAndStyle: true`

## ESLint Configuration (`eslint.config.mjs`)

### Plugins
- `@eslint/js` (recommended)
- `eslint-plugin-vue` (flat/essential)
- `eslint-plugin-prettier` (recommended)
- `@kamiya4047/eslint-plugin-pretty-import` (Import organization)

### Global Variables
- Browser globals + the following custom globals:
  - `CefSharp`, `VRCX`, `VRCXStorage`, `SQLite`, `LogWatcher`, `Discord`
  - `AppApi`, `AppApiVr`, `WebApi`, `AssetBundleManager`
  - `WINDOWS`, `LINUX`, `VERSION`, `NIGHTLY`
  - `webApiService`, `process`

### Rules
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

### Special File Settings
- **Node.js Environment** (`vitest.config.js`, `src-electron/*.js`, `src/localization/*.js`):
  - `sourceType: "commonjs"`
  - `globals: node`
- **Test Files** (`**/__tests__/**/*.{js,mjs,cjs,vue}`, `**/*.spec.{js,mjs,cjs,vue}`, `**/*.test.{js,mjs,cjs,vue}`):
  - `globals: vitest`

## TypeScript Configuration (`tsconfig.json`)

### Basic Settings
- `allowJs`: true
- `checkJs`: true
- `strict`: false
- `noEmit`: true
- `moduleResolution`: "bundler"

### Path Aliases
- `@/*` → `./src/*`
- `*` → `./*`

## File Formats

- Primarily JS (`.js` / `.vue`)
- Type definitions only in `.d.ts`
- **i18n translation files (`src/localization/*.json`) must not be modified** (Translation fixes only by separate instruction)

## Naming Conventions

### Vue Components
- PascalCase (e.g., `NavMenu.vue`, `MainLayout.vue`)
- UI primitives: `src/components/ui/` (shadcn-vue)
- Dialogs: `src/components/dialogs/`

### Files/Directories
- camelCase (e.g., `webapi.js`, `appConfig.js`)
- kebab-case (e.g., `friend-log`, `screenshot-metadata`)

### Variables/Functions
- camelCase (e.g., `isLoggedIn`, `applyUser`, `createGlobalStores`)

### Constants
- UPPER_SNAKE_CASE (Global constants)
- camelCase (Local constants)

## Vue Style

### Composition API
- Use `<script setup>`
- Pinia stores
- Composables (`src/composables/`)

### Import Order (pretty-import)
1. External libraries
2. Internal modules
3. Style imports (groupStyleImports: true)

## .NET Code Style

### Projects
- `VRCX-Cef.csproj`: Windows (CEF) - .NET 10
- `VRCX-Electron.csproj`: Electron x64 - .NET 9
- `VRCX-Electron-arm64.csproj`: Electron arm64 - .NET 9

### Conditional Compilation
- `#if LINUX` / `#if !LINUX`
- Platform-specific code placed in `AppApi/Cef/` or `AppApi/Electron/`
- Shared code placed in `AppApi/Common/`

### Naming
- PascalCase (Classes, Methods, Properties)
- camelCase (Local variables, Parameters)

## Platform Branching Patterns

### Frontend
```javascript
if (WINDOWS) {
    // Windows (CEF) specific code
} else {
    // macOS/Linux (Electron) specific code
}
```

### .NET Interop
```javascript
// Windows
await CefSharp.BindObjectAsync('AppApi');

// Linux
window.interopApi.callDotNetMethod('AppApi', 'MethodName', [args]);
```

### WebApi Execution
```javascript
// Automatically branched inside webApiService.execute()
// WINDOWS: WebApi.Execute() → {Item1, Item2}
// LINUX: WebApi.ExecuteJson() → JSON string
```

## 🚨 Comments (Strict Rule)
- **DO NOT WRITE COMMENTS IN GENERATED CODE.**
- Code should be self-explanatory through clear variable/function names and structure.
- Explanatory comments, TODOs, and complex logic explanations are prohibited in the code.

## Global Constants (Vite define)

- `WINDOWS`: `process.env.PLATFORM === 'windows'`
- `LINUX`: `process.env.PLATFORM === 'linux'`
- `VERSION`: Content of `./Version` file
- `NIGHTLY`: true in development mode or when version ends with a 7-char commit hash

## 🚨 Git Operation Restrictions
- **Commit and Push**: `git commit` and `git push` are generally performed by the user. Agents MUST NOT perform these operations without explicit permission.
