# Windows System Utility Commands

## File System Operations

### Directory Operations

```cmd
# Display current directory
cd

# Change directory
cd path

# Move to parent directory
cd ..

# Move to root directory
cd \

# Change drive
D:

# Create directory
mkdir directory-name
md directory-name

# Remove directory (if empty)
rmdir directory-name
rd directory-name

# Remove directory (including contents, without confirmation)
rmdir /S /Q directory-name
rd /S /Q directory-name

# List directories
dir

# Detailed view
dir /A

# List including subdirectories
dir /S

# Display files only
dir /A-D

# Display directories only
dir /AD
```

### File Operations

```cmd
# Display file contents
type filename

# Copy file
copy source destination

# Copy directory (including subdirectories)
xcopy /E /I source destination

# Move file
move source destination

# Delete file
del filename

# Delete file (without confirmation)
del /Q filename

# Use wildcards
del *.log
del /Q /S *.tmp

# Search for file
where filename

# Search for file within directory
dir /S /B filename

# Rename file
ren old-filename new-filename
rename old-filename new-filename
```

## Text Search

### findstr (Equivalent to grep)

```cmd
# Search for text within a file
findstr "search-string" filename

# Search across multiple files
findstr "search-string" *.js

# Recursive search
findstr /S "search-string" *.js

# Case-insensitive search
findstr /I "search-string" filename

# Use regular expressions
findstr /R "pattern" filename

# Display line numbers
findstr /N "search-string" filename

# Search multiple patterns
findstr /C:"pattern1" /C:"pattern2" filename
```

## Process Management

```cmd
# List processes
tasklist

# Search for a specific process
tasklist | findstr "process-name"

# Terminate process (using PID)
taskkill /PID process-id

# Terminate process (using name)
taskkill /IM process-name.exe

# Force terminate
taskkill /F /PID process-id
taskkill /F /IM process-name.exe

# Terminate multiple processes
taskkill /F /IM node.exe
taskkill /F /IM electron.exe
```

## Network

```cmd
# Network connection status
netstat

# Display listening ports
netstat -an | findstr LISTENING

# Usage status of specific port
netstat -ano | findstr :9000

# Check IP address
ipconfig

# Detailed info
ipconfig /all

# Clear DNS cache
ipconfig /flushdns

# ping
ping hostname-or-ip

# traceroute
tracert hostname-or-ip
```

## Environment Variables

```cmd
# List environment variables
set

# Display specific environment variable
echo %PATH%
echo %USERPROFILE%
echo %TEMP%

# Set environment variable (Current session only)
set variable-name=value

# Remove environment variable
set variable-name=

# Persistent environment variable setting (System-wide)
setx variable-name value

# Persistent environment variable setting (User-specific)
setx variable-name value /M
```

## System Information

```cmd
# Display system info
systeminfo

# OS version
ver

# Computer name
hostname

# Current user
whoami

# Disk usage
wmic logicaldisk get size,freespace,caption
```

## Permissions

```cmd
# Change owner of file/directory
takeown /F filename

# Display access permissions
icacls filename

# Change access permissions
icacls filename /grant user-name:F
```

## Compression/Extraction

```cmd
# Compress using PowerShell
powershell Compress-Archive -Path source -DestinationPath output.zip

# Extract using PowerShell
powershell Expand-Archive -Path input.zip -DestinationPath destination

# Use 7-Zip (if installed)
7z a output.zip source
7z x input.zip
```

## Git Operations

```cmd
# Check status
git status

# Check changes
git diff

# Staging
git add .
git add filename

# Commit
git commit -m "commit message"

# Push
git push

# Pull
git pull

# List branches
git branch

# Create branch
git branch branch-name

# Switch branch
git checkout branch-name

# Create branch + Switch
git checkout -b branch-name

# Display logs
git log
git log --oneline

# Check remote repository
git remote -v

# Discard changes (unstaged)
git checkout -- filename

# Discard staging
git reset HEAD filename

# Fix last commit
git commit --amend
```

## PowerShell Operations

```powershell
# Start PowerShell
powershell

# Start PowerShell with Administrator privileges
powershell -Command "Start-Process powershell -Verb RunAs"

# Execute script
powershell -ExecutionPolicy Bypass -File script.ps1

# List directories (PowerShell)
Get-ChildItem
ls
dir

# Display file contents (PowerShell)
Get-Content filename
cat filename

# Search for file (PowerShell)
Get-ChildItem -Recurse -Filter "*.js"

# Search for text (PowerShell)
Select-String -Path "*.js" -Pattern "search-string"
```

## Miscellaneous Utilities

```cmd
# Clear screen
cls

# Command history
doskey /history

# Calculate file hash (PowerShell)
powershell Get-FileHash filename -Algorithm SHA256

# Display date/time
date /T
time /T

# Echo
echo message

# Pause
pause

# Exit
exit
```

## Batch Files

```cmd
# Execute batch file
batch-file.bat

# Execute with arguments
batch-file.bat arg1 arg2

# Comment within batch file
REM This is a comment

# Echo off (Suppress command display)
@echo off

# Set variable
set VAR=value

# Use variable
echo %VAR%

# Conditional branching
if exist filename (
    echo File exists
) else (
    echo File does not exist
)

# Loop
for %%i in (*.txt) do echo %%i
```

## Troubleshooting

```cmd
# Identify process using a port
netstat -ano | findstr :port-number
tasklist | findstr "PID"

# Unlock file lock
# (Requires terminating the process)
taskkill /F /IM process-name.exe

# Check disk
chkdsk C: /F

# System file check
sfc /scannow
```
