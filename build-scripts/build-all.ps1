#!/usr/bin/env pwsh

using namespace System.Runtime.InteropServices

[CmdletBinding()]
param (
    [Parameter()]
    [Switch]
    $NoCI,
    [Parameter()]
    [Switch]
    $BuildArm64
)

$ErrorActionPreference = "Stop"

$IsArm64 = [RuntimeInformation]::ProcessArchitecture -eq [Architecture]::Arm64

if ($IsArm64) {
    $BuildArm64 = $true
}

cd "$PSScriptRoot/.."

$root = Resolve-Path .

Set-Content -Path "Version" -Value "Forked-AariyJP" -NoNewline

$Date = Get-Date -format yyyyMMdd
$ZipName = "VRCX_" + $Date + ".zip"
$SetupName = "VRCX_" + $Date + "_Setup.exe"

Write-Host "Building .Net..." -ForegroundColor Green

if ($IsWindows) {
    dotnet build Dotnet\VRCX-Cef.csproj -p:Configuration=Release -p:WarningLevel=0 -p:Platform=x64 -p:RestorePackagesConfig=true -t:"Restore;Clean;Build" -maxcpucount
}

if ($IsLinux -or $IsMacOS) {
    if ($BuildArm64) {
        dotnet build 'Dotnet/VRCX-Electron-arm64.csproj' -p:Configuration=Release -p:WarningLevel=0 -p:Platform=arm64 -p:PlatformTarget=arm64 -t:"Restore;Clean;Build" -maxcpucount --arch arm64
    }
    else {
        dotnet build 'Dotnet/VRCX-Electron.csproj' -p:Configuration=Release -p:WarningLevel=0 -p:Platform=x64 -p:PlatformTarget=x64 -t:"Restore;Clean;Build" -maxcpucount --arch x64
    }
}

Write-Host "Building Node.js..." -ForegroundColor Green
if (-not $NoCI) {
    Remove-Item -Path "node_modules" -Force -Recurse -ErrorAction SilentlyContinue
}
pnpm install --frozen-lockfile --loglevel=error

$ErrorActionPreference = "Continue"

if ($IsWindows) {
    pnpm prod
}
if ($IsLinux -or $IsMacOS) {
    if ($BuildArm64) {
        pnpm prod-linux
        pnpm build-electron-arm64
    }
    else {
        pnpm prod-linux
        pnpm build-electron
    }
}
$ErrorActionPreference = "Stop"

if ($IsWindows) {
    Remove-Item -Path "build\Cef\html" -Force -Recurse -ErrorAction SilentlyContinue
    New-Item -ItemType Junction -Path "$root\build\Cef\html" -Target "$root\build\html"

    Write-Host "Creating Zip..." -ForegroundColor Green
    cd "build\Cef"
    7z a -tzip $ZipName * -mx=7 -xr0!"*.log" -xr0!"*.pdb"
    Move-Item $ZipName ..\..\$ZipName -Force
    cd ..\..\

    Write-Host "Creating Installer..." -ForegroundColor Green
    $version = Get-Content -Path "Version" -Raw
    cd "Installer"
    Out-File -FilePath "version_define.nsh" -Encoding UTF8 -InputObject "!define PRODUCT_VERSION_FROM_FILE `"$version.0`""
    $nsisPath = "C:\Program Files (x86)\NSIS\makensis.exe"
    &$nsisPath installer.nsi
    Start-Sleep -Seconds 1
    Move-Item VRCX_Setup.exe ..\$SetupName -Force
    cd ..

    Write-Host "Creating SHA256-hash..." -ForegroundColor Green
    $hash = Get-FileHash -Path $SetupName -Algorithm SHA256
    $hashLine = "$($hash.Hash)  $SetupName"
    $hashLine | Out-File -FilePath "SHA256SUMS.txt" -Encoding ASCII
}

Write-Host "Done!" -ForegroundColor Green
