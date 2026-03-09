# VRCXF Project Overview

## Project Purpose

VRCXF is a desktop application for VRChat friend management, presence tracking, logging, moderation support, favorites management, charts, tools, and VR overlay support. It is a maintained fork of vrcx-team/VRCX.

## Current Product Shape

- Branding in the codebase is primarily `VRCXF`
- Windows uses CEF/CefSharp
- macOS/Linux use Electron + node-api-dotnet
- Frontend is a Vue 3 SPA with Pinia, Vue Router, TailwindCSS 4, shadcn-vue, vue-i18n, Vitest, and Vue Query
- Backend is C# with .NET 10 on Windows and .NET 9 on Electron targets

## Active Architectural Direction

Recent project evolution introduced and/or expanded these layers:

- `src/query/`: Vue Query client, cache helpers, entity query utilities
- `src/stores/coordinators/`: orchestration layer for auth, friend, game, and user flows
- `src/ipc-electron/`: renderer-side Electron IPC helper surface
- `src/public/`: Vite-managed public static assets
- `src/app.css`: app shell layout styling separated from `src/styles/globals.css`

## Key Runtime Flow

Renderer (`src/`) -> interop bootstrap (`src/plugin/interopApi.js`, `src/ipc-electron/interopApi.js`) -> .NET runtime (`Dotnet/`) -> VRChat API / WebSocket / SQLite / OS integration

## Important User-Facing Areas

- Feed
- Friends Locations
- Game Log
- Player List
- Search
- Favorites
- Friend Log / Moderation / Friend List
- Notifications
- Charts
- Tools
- Settings
- My Avatars
- VR overlay
