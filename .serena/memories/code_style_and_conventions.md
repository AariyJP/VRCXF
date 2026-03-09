# Code Style and Conventions

## Formatting

`.prettierrc.json` currently defines:

- `printWidth: 80`
- `tabWidth: 4`
- `semi: true`
- `singleQuote: true`
- `quoteProps: as-needed`
- `trailingComma: none`
- `arrowParens: always`
- Vue override: `printWidth: 120`, `bracketSameLine: true`, `vueIndentScriptAndStyle: true`
- JS override: parser `meriyah`

## ESLint

`eslint.config.mjs` currently uses:

- `@eslint/js`
- `eslint-plugin-vue`
- `eslint-plugin-prettier`
- `eslint-plugin-jsdoc`
- `@kamiya4047/eslint-plugin-pretty-import`

Important rules/conventions:

- `no-unused-vars: warn`
- `no-case-declarations: off`
- `no-control-regex: warn`
- `vue/no-mutating-props: warn`
- `vue/multi-word-component-names: off`
- `vue/no-v-text-v-html-on-component: off`
- `vue/no-use-v-if-with-v-for: warn`
- `pretty-import/*` rules enabled
- `no-restricted-syntax` forbids direct cross-store mutation via `xxxStore.foo = ...` and `xxxStore.foo++/--`

## TypeScript / JS

- Main app code is JS / Vue SFCs
- Type definitions live in `.d.ts`
- `tsconfig.app.json` uses `allowJs`, `checkJs`, `strict: false`, `moduleResolution: bundler`, `noEmit`
- Vitest globals are included in TS types

## Testing

- Test runner: Vitest
- Environment: `jsdom`
- Include pattern: `src/**/*.{test,spec}.js`
- Setup file: `vitest.setup.js`
- Coordinator tests live in `src/stores/coordinators/__tests__/`

## Naming / Structure

- Vue components: PascalCase
- Stores and helpers: camelCase filenames
- Routes mostly use kebab-case paths
- Shared orchestration logic should prefer coordinator modules over bloating large stores further
- Query/cache logic should live under `src/query/` when it belongs to fetch/cache coordination rather than view-local state

## Comments Policy

- Existing comments may remain
- Agents should not add new explanatory code comments unless explicitly required
- i18n JSON files should not be modified unless the task explicitly calls for translation changes
