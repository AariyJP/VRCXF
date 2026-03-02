# Suggested Commands

## Development Commands

### Frontend Development

```bash
# Start Windows development server (port 9000)
npm run dev

# Start Linux development server
npm run dev-linux

# Dev server + Test monitoring
npm run dev:test
```

### Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

### Build

```bash
# Windows production build
npm run prod

# Linux production build
npm run prod-linux

# Electron build (macOS/Linux only)
npm run build-electron
npm run build-electron-arm64

# Start Electron (macOS/Linux only)
npm run start-electron
```

### Utility

```bash
# i18n helper CLI
npm run localization
```

## .NET Build

### Visual Studio / dotnet CLI

```bash
# Build Windows CEF version (Release, x64, MUST be --self-contained)
dotnet build Dotnet\VRCX-Cef.csproj -p:Configuration=Release -p:Platform=x64 -p:RestorePackagesConfig=true -t:"Restore;Clean;Build" -m --self-contained

# Build Electron version (x64)
dotnet build Dotnet\VRCX-Electron.csproj -p:Configuration=Release -p:Platform=x64

# Build Electron version (arm64)
dotnet build Dotnet\VRCX-Electron-arm64.csproj -p:Configuration=Release -p:Platform=x64
```

### Solution-wide

```bash
# Visual Studio solution build
msbuild VRCX.sln /p:Configuration=Release /p:Platform=x64
```

## Full Build (Windows)

```powershell
# Build everything (PowerShell)
.\build-scripts\build-all.ps1
```

This script executes:
1. .NET build (VRCX-Cef.csproj)
2. Node.js build (`npm ci` + `npm run prod`)
3. Create Zip file
4. Create NSIS installer
5. Generate SHA256 hashes

## Package Management

```bash
# Install dependencies
npm ci

# Install dependencies (Development environment)
npm install

# Update dependencies
npm update
```

## Code Quality

### Linting

```bash
# Run ESLint
npx eslint .

# Auto-fix ESLint issues
npx eslint . --fix
```

### Formatting

```bash
# Run Prettier (Check only)
npx prettier --check .

# Auto-fix Formatting with Prettier
npx prettier --write .
```

## Git Operations

```bash
# Check status
git status

# Stage changes
git add .

# Commit
git commit -m "commit message"

# Push
git push

# Pull
git pull

# Create branch
git checkout -b branch-name

# Switch branch
git checkout branch-name

# List branches
git branch
```

## Windows-specific Utility Commands

```cmd
# List directories
dir

# Change directory
cd path

# Search for file
where filename

# Display file contents
type filename

# Copy files/directories
xcopy /E /I source destination

# Remove files/directories
rmdir /S /Q directory-name
del filename

# Display environment variables
set

# List processes
tasklist

# Terminate process
taskkill /F /PID process-id
```

## Debugging

### Electron DevTools

```bash
# DevTools automatically opens when starting Electron
npm run start-electron
```

### Vite DevTools

Access `http://localhost:9000` in your browser when the development server is running.

## Database Operations

### DBMerger

```bash
# Run database merge tool
dotnet run --project Dotnet\DBMerger\DBMerger.csproj
```

## Cleanup

```bash
# Delete node_modules
rmdir /S /Q node_modules

# Delete build directory
rmdir /S /Q build

# Delete .NET build artifacts
dotnet clean
```

## CI/CD

GitHub Actions Workflows:
- `.github/workflows/build.yml`: Build
- `.github/workflows/github_actions.yml`: GitHub Actions
- `.github/workflows/release.yml`: Release

## Environment Variables

### Vite

```bash
# Specify platform (windows/linux)
set PLATFORM=windows
npm run dev

# Sentry Auth Token (for source map upload)
set SENTRY_AUTH_TOKEN=your_token
npm run prod
```

## Troubleshooting

```bash
# Reinstall node_modules
rmdir /S /Q node_modules
npm ci

# Clear cache
npm cache clean --force

# Clear .NET build cache
dotnet clean
rmdir /S /Q Dotnet\bin
rmdir /S /Q Dotnet\obj
```
