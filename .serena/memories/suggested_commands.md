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
