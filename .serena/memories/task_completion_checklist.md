# Task Completion Checklist

## Required Steps After Code Changes

### 1. Code Quality Check

#### Linting
```bash
# Run ESLint
npx eslint .

# Fix auto-fixable issues
npx eslint . --fix
```

#### Formatting
```bash
# Run Prettier (Check only)
npx prettier --check .

# Auto-format
npx prettier --write .
```

### 2. Run Tests

```bash
# Run all tests (Vitest)
npm test

# Check coverage (if necessary)
npm run test:coverage
```

### 3. Verify Build

#### Frontend

```bash
# Windows build
npm run prod

# Linux build (for cross-platform compatibility)
npm run prod-linux
```

#### .NET (if necessary)

```bash
# Windows CEF version (MUST be --self-contained)
dotnet build Dotnet\VRCX-Cef.csproj -p:Configuration=Release -p:Platform=x64 --self-contained

# Electron version (macOS/Linux only)
dotnet build Dotnet\VRCX-Electron.csproj -p:Configuration=Release -p:Platform=x64
```

### 4. Verification in App

```bash
# Verify behavior on development server
npm run dev

# Or verify with Electron version
npm run start-electron
```

### 5. Git Operations

```bash
# Check status
git status
git diff

# Staging
git add .

# Commit (using meaningful messages)
git commit -m "feat: description of new feature" 
# OR
git commit -m "fix: description of bug fix"
# OR
git commit -m "refactor: description of refactoring"

# Push (if necessary)
git push
```

## Cross-Platform Verification

When adding a new native API call:

### 1. Add Shared API
- Add the shared method in `Dotnet/AppApi/Common/`.

### 2. Platform-specific Implementation
- Windows: Implement in `Dotnet/AppApi/Cef/`.
- macOS/Linux: Implement in `Dotnet/AppApi/Electron/`.

### 3. Frontend Branching
- Branch using global constants `WINDOWS`/`LINUX`.
- Refer to existing patterns:
  - `src/plugin/interopApi.js`
  - `src/service/webapi.js`

### 4. Use of Electron-only APIs
- If using `window.electron.*`, consider a fallback implementation for Windows (CEF).

### 5. Build Verification
- Confirm build success in both .csproj files:
  ```bash
  dotnet build Dotnet\VRCX-Cef.csproj -p:Configuration=Release -p:Platform=x64 --self-contained
  dotnet build Dotnet\VRCX-Electron.csproj -p:Configuration=Release -p:Platform=x64
  ```

## i18n Verification

When adding/changing text:

### 1. Add Translation Keys
- Add translations to each language file in `src/localization/` (14 languages).
- At minimum, `en.json` and `ja.json` are required.

### 2. Use i18n Helper
```bash
npm run localization
```

### 3. Verify Translations
- Switch languages on the development server to check the display.

## Database Schema Change Verification

When modifying the schema:

### 1. Add Migration
- Add a migration in `src/service/database/tableAlter.js`.

### 2. Update Table Definitions
- Update the relevant files in `src/service/database/`.

### 3. Verify Behavior
- Test migrations on an existing database.
- Test creation on a new database.

## VRChat API Change Verification

When adding/changing VRChat API endpoints:

### 1. Update API Wrapper
- Update the corresponding file in `src/api/`.

### 2. Update Type Definitions
- Update the corresponding file in `src/types/api/`.

### 3. Verify Rate Limits
- Confirm that VRChat API rate limits are not violated.

## UI Component Addition Verification

When adding new components:

### 1. Use of shadcn-vue
- Utilize existing components in `src/components/ui/` as much as possible.

### 2. Styling
- Use TailwindCSS 4.
- Add custom CSS to `src/styles/globals.css` or `src/styles/themes/`.

### 3. Responsive Compatibility
- Check display on mobile, tablet, and desktop.

## Performance Verification

### 1. Bundle Size
- Check the bundle size after build.
- Use dynamic imports where necessary.

### 2. Memory Leaks
- Check memory usage during long-running sessions.
- Confirm removal of unnecessary listeners or timers.

### 3. WebSocket Connection
- Verify stability of the WebSocket connection.
- Confirm auto-reconnect works as expected.

## Security Verification

### 1. XSS Prevention
- Properly escape user input.
- Minimize the use of `v-html`.

### 2. Authentication/Authorization
- Check access control for authenticated pages.
- Confirm proper token management.

### 3. Dependency Vulnerabilities
```bash
npm audit
npm audit fix
```

## Documentation Update

### 1. No Code Comments
- **DO NOT WRITE COMMENTS IN GENERATED CODE.**
- Ensure no new comments were added during the task.

### 2. AGENTS.md
- Update `AGENTS.md` (Source of Truth) for significant changes.

### 3. Type Definitions
- Keep TypeScript type definitions (`src/types/`) up to date.

## Final Checklist

- [ ] No ESLint errors
- [ ] Prettier formatted
- [ ] All tests passed
- [ ] Build successful (Both Windows and Linux)
- [ ] Verification in app completed
- [ ] Cross-platform compatibility confirmed (if applicable)
- [ ] i18n compatibility confirmed (if applicable)
- [ ] **Git Operations (🚨 Commit and Push must NOT be performed by the agent)**
- [ ] No comments added to the code
- [ ] Documentation updated (if necessary)
