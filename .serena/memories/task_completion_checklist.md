# Task Completion Checklist

## After Code Changes

### Validate scope

- Confirm whether the change touched frontend only, .NET only, or both
- If native/frontend boundaries changed, review both platform paths
- If architecture changed materially, update `AGENTS.md`

### Quality checks

Run what is appropriate for the touched area:

```bash
npx eslint .
npm test
npm run prod
npm run prod-linux
```

Use targeted verification when the task is narrow, but do not claim checks you did not run.

### Native verification

When .NET or interop code changed, use the relevant builds:

```bash
dotnet build Dotnet\VRCX-Cef.csproj -p:Configuration=Release -p:Platform=x64 --self-contained
dotnet build Dotnet\VRCX-Electron.csproj -p:Configuration=Release -p:Platform=x64
dotnet build Dotnet\VRCX-Electron-arm64.csproj -p:Configuration=Release -p:Platform=ARM64
```

### Cross-platform verification

When adding/changing native APIs or shared UI behavior:

- Check `WINDOWS` and `LINUX` branches
- Confirm CEF and Electron paths still make sense
- Verify `window.electron` usage is guarded where needed
- Keep `src/plugin/interopApi.js`, `src/ipc-electron/interopApi.js`, and native surfaces aligned

### Data / schema verification

When changing database behavior:

- Update schema/migration modules under `src/service/database/` as needed
- Consider both existing DB migration and fresh DB creation paths

### Query / cache verification

When changing entity fetch/cache logic:

- Check whether the change belongs in `src/query/` rather than a store or component
- Verify query invalidation / cache update paths if applicable

### Docs / conventions

- Do not add new explanatory code comments unless explicitly required
- Do not modify localization JSON files unless the task is about translations
- Update `AGENTS.md` or Serena memories when project structure/patterns changed

### Git / delivery

- Inspect with `git status` / `git diff` when useful
- Do not commit or push unless the user explicitly asks
- Report clearly which checks were run and which were not run
