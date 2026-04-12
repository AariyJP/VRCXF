# Suggested Commands

## Primary npm Scripts

```bash
npm run dev
npm run dev-linux
npm test
npm run test:coverage
npm run prod
npm run prod-linux
npm run build-electron
npm run build-electron-arm64
npm run start-electron
npm run localization
npm run dotnet-win
npm run dotnet-arm64
```

## Lint / Format

```bash
npm run lint
npm run lint:eslint
npm run lint:oxlint
npm run typecheck:js
npx eslint .
npx eslint . --fix
npx prettier --check .
npx prettier --write .
```

## .NET Build

```bash
dotnet build Dotnet\VRCX-Cef.csproj -p:Configuration=Release -p:Platform=x64 --self-contained
dotnet build Dotnet\VRCX-Electron.csproj -p:Configuration=Release -p:Platform=x64
dotnet build Dotnet\VRCX-Electron-arm64.csproj -p:Configuration=Release -p:Platform=ARM64
```

## Utilities

```bash
dotnet run --project Dotnet\DBMerger\DBMerger.csproj
npm ci
npm install
```

## Git Inspection Only

Use Git commands for inspection, not for committing/pushing on the user's behalf.

```bash
git status
git diff
git log --oneline --decorate -n 20
```

## Notes

- `npm run dev:test` does not exist in the current project
- Prefer Serena/native tools over shell commands when possible
- Do not rely on agent-side commit/push flows; the user handles those
- `build-scripts/build-all.ps1` must be run **from the `build-scripts/` directory** (the script starts with `cd ..`); invoke as `Set-Location build-scripts; .\build-all.ps1` or `powershell -Command "Set-Location 'path\to\VRCX\build-scripts'; .\build-all.ps1"`
- `build-scripts/build-all.ps1` may stop at the `7z` step (e.g. 7-Zip not in PATH); if .NET build, frontend build, license generation, and junction creation already succeeded, treat that outcome as acceptable — ignore the `7z` failure
