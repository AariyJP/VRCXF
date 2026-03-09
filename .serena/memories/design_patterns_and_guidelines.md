# Design Patterns and Guidelines

## Architecture Patterns

### Layered Frontend

Use this split when placing logic:

- View/UI: `src/views/`, `src/components/`
- View reuse: `src/composables/`
- Store state: `src/stores/`
- Store orchestration: `src/stores/coordinators/`
- Data fetching / cache policy: `src/query/`
- External services / persistence: `src/service/`
- Shared pure helpers/constants: `src/shared/`

### Coordinator Pattern

The project now actively extracts multi-step store workflows into coordinators. Prefer adding new cross-store orchestration to `src/stores/coordinators/` instead of further inflating already-large store files.

### Store Boundary Rule

Do not directly mutate another store's state with `otherStore.foo = ...` or update operators. Use owner-store actions/setters or coordinator-mediated flow.

### Query Pattern

Use Vue Query for cache-aware entity fetching and synchronization concerns. Use `src/service/request.js` and API wrappers for transport, and `src/query/` for client/cache/query-key policy.

### Router Pattern

`src/plugin/router.js` uses return-based guards, not legacy `next()`-style guards. Preserve redirect query handling and the explicit block on `/social`.

### Cross-Platform Pattern

- Frontend branches with `WINDOWS` / `LINUX`
- Native bindings differ between CEF and Electron proxy paths
- Shared native functionality belongs in `Dotnet/AppApi/Common/` when possible
- Electron-only APIs on `window.electron` require care when used from shared UI code

### Styling Pattern

- Base variables and shared styles belong in `src/styles/globals.css`
- App shell/layout rules belong in `src/app.css`
- Theme-specific values belong in `src/styles/themes/`
- Prefer design tokens / utility classes over new ad-hoc hardcoded values when touching existing refactored areas

### Testing Pattern

Keep tests near the area they verify:

- generic store tests: `src/stores/__tests__/`
- coordinator tests: `src/stores/coordinators/__tests__/`
- component/view tests: nearby `__tests__` directories

### Static Assets Pattern

Use `src/public/` for Vite-copied public assets. Do not assume all static assets live under the repo-root `images/` directory; renderer-facing assets increasingly live in `src/public/`.
