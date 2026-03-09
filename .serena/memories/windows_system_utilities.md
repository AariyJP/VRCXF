# Windows System Utilities

This memory is only a lightweight fallback reference. Prefer Serena and other native tools first.

## Preferred Shell Style

Use PowerShell when shell access is necessary.

Common read-only commands:

```powershell
Get-ChildItem
Get-ChildItem -Recurse -Filter *.js
Get-Content path\to\file
Select-String -Path *.js -Pattern "text"
```

## Safe Git Inspection

```powershell
git status
git diff
git log --oneline -n 20
```

## Avoid by Default

- destructive git commands
- commit / push commands unless explicitly requested
- broad shell usage when Serena can inspect/edit more precisely
