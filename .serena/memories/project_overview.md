# VRCXF Project Overview

## Project Purpose

VRCXF is a desktop application for managing friends in VRChat. It is a fork of the original [vrcx-team/VRCX](https://github.com/vrcx-team/VRCX), developed by AariyJP (MIT License).

### Key Features

- **Friend Management**: Manage and track VRChat friend lists.
- **Location Tracking**: Check current locations of friends.
- **Notification System**: Notifications for friend online/offline, invites, etc.
- **Game Log**: Play history recording for VRChat.
- **VR Overlay**: Display information within VR.
- **Discord Rich Presence**: Show status on Discord.
- **Favorites Management**: Favorites for avatars, worlds, and friends.
- **Statistics & Charts**: Visualization of instance activity, mutual friends, etc.

## Tech Stack

### Frontend

- **Vue 3** (Composition API / `<script setup>`)
- **Pinia** (State management)
- **Vue Router** (Routing, hash mode)
- **Vite 7** (Build tool)
- **TailwindCSS 4** (Styling)
- **shadcn-vue** (reka-ui, new-york style)
- **LightningCSS** (CSS transformer)
- **ECharts** (Charts)
- **Graphology + Sigma** (Graph visualization)
- **vue-i18n** (Multiple languages supported)
- **Vitest** (Testing)
- **Sentry** (Error tracking)

### Backend

- **C# / .NET 10 (Windows) / .NET 9 (macOS/Linux)**
- **SQLite** (Database)
- **OpenVR** (VR Overlay)
- **node-api-dotnet** (JS ⇄ .NET interop)

### Desktop

- **Electron 39** (macOS/Linux only)
- **CEF (CefSharp)** (Windows)
- **electron-builder** (Packaging)

### Platform

- Windows (x64) - CEF version
- Linux (x64, arm64) - Electron version (AppImage, macOS/Linux only)
- macOS (x64, arm64) - Electron version (dmg, macOS/Linux only)

## Cross-Platform Compatibility

**IMPORTANT**: This project requires complete cross-platform implementation.

### Platform Configuration

- **Windows**: CEF (CefSharp) — `Dotnet/Cef/`, `Dotnet/AppApi/Cef/`, `VRCX-Cef.csproj`
- **macOS/Linux**: Electron + node-api-dotnet — `src-electron/`, `Dotnet/AppApi/Electron/`, `VRCX-Electron.csproj`

### Branching Patterns

- **Frontend JS**: Branch using global constants `WINDOWS`/`LINUX` (`if (WINDOWS) {...} else {...}`)
- **Native API Calls**:
    - Windows = Direct binding via `CefSharp.BindObjectAsync`
    - macOS/Linux = `InteropApi` Proxy (`window.interopApi.callDotNetMethod`)
- **WebApi Execution**: Branching inside `webApiService.execute()`
    - WINDOWS = `WebApi.Execute()` (returns `{Item1, Item2}`)
    - LINUX = `WebApi.ExecuteJson()` (JSON string)
- **.NET Side**:
    - `AppApi/Common/` = Shared
    - `AppApi/Cef/` = Windows only
    - `AppApi/Electron/` = macOS/Linux only
    - Conditional compilation: `#if LINUX` / `#if !LINUX`
- **Electron-only**: `window.electron` (exposed via preload) exists only on macOS/Linux.

## Architecture

### Overall Structure

```
Electron Main (src-electron/main.js)
  ↓ node-api-dotnet
.NET Runtime (Dotnet/)
  ↓
VRChat API / WebSocket
```

### Frontend (Renderer)

- Vue 3 SPA
- VRChat REST API (`src/service/request.js`)
- WebSocket (`src/service/websocket.js`)

### .NET Backend

- Log parsing (`LogWatcher.cs`)
- Database (`SQLite.cs`)
- VR overlay (`Overlay/`)
- Discord Rich Presence (`Discord.cs`)
- Process monitoring (`ProcessMonitor.cs`)

### IPC

- `src-electron/InteropApi.js` ⇄ `Dotnet/AppApi/`

## VRChat API Integration

- **REST API**: `https://api.vrchat.cloud/api/1` (`AppDebug.endpointDomain`)
- **WebSocket**: `wss://pipeline.vrchat.cloud` (`AppDebug.websocketDomain`)
- **HTTP**: `request(endpoint, options)` → `webApiService.execute()` → .NET `WebApi.Execute`
- **GET request dedup**: 10 seconds
- **404/403 retry suppression**: 15 minutes
- **WebSocket events**: notification, friend-add/delete/online/active/offline/update/location, user-update/location, group-_, instance-_, content-refresh
- **VRChat API docs**: `https://vrchat.community`

## Version Management

- Version file: `./Version`
- `NIGHTLY`: true in development mode or when version ends with a 7-char commit hash.
