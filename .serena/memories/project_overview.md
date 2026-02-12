# VRCXFプロジェクト概要

## プロジェクトの目的

VRCXFは、VRChatのフレンド管理を行うデスクトップアプリケーションです。元々の[vrcx-team/VRCX](https://github.com/vrcx-team/VRCX)のフォーク版で、AariyJPによって開発されています（MITライセンス）。

### 主な機能
- **フレンド管理**: VRChatのフレンドリストの管理・追跡
- **ロケーション追跡**: フレンドの現在地確認
- **通知システム**: フレンドのオンライン/オフライン、招待などの通知
- **ゲームログ**: VRChatのプレイ履歴記録
- **VRオーバーレイ**: VR内での情報表示
- **Discord Rich Presence**: Discordへのステータス表示
- **お気に入り管理**: アバター、ワールド、フレンドのお気に入り
- **統計・チャート**: インスタンス活動、相互フレンドなどの可視化

## 技術スタック

### フロントエンド
- **Vue 3** (Composition API / `<script setup>`)
- **Pinia** (状態管理)
- **Vue Router** (ルーティング、hash mode)
- **Vite 7** (ビルドツール)
- **TailwindCSS 4** (スタイリング)
- **shadcn-vue** (reka-ui, new-york style)
- **LightningCSS** (CSS transformer)
- **ECharts** (チャート)
- **Graphology + Sigma** (グラフ可視化)
- **vue-i18n** (14言語対応: cs, en, es, fr, hu, ja, ko, pl, pt, ru, th, vi, zh-CN, zh-TW)
- **Jest** (テスト)
- **Sentry** (エラートラッキング)

### バックエンド
- **C# / .NET 9**
- **SQLite** (データベース)
- **OpenVR** (VRオーバーレイ)
- **node-api-dotnet** (JS ⇄ .NET連携)

### デスクトップ
- **Electron 39** (macOS/Linux)
- **CEF (CefSharp)** (Windows)
- **electron-builder** (パッケージング)

### プラットフォーム
- Windows (x64) - CEF版
- Linux (x64, arm64) - Electron版 (AppImage)
- macOS (x64, arm64) - Electron版 (dmg)

## クロスプラットフォーム対応

**重要**: このプロジェクトは完全なクロスプラットフォーム実装が必須です。

### プラットフォーム構成
- **Windows**: CEF (CefSharp) — `Dotnet/Cef/`, `Dotnet/AppApi/Cef/`, `VRCX-Cef.csproj`
- **macOS/Linux**: Electron + node-api-dotnet — `src-electron/`, `Dotnet/AppApi/Electron/`, `VRCX-Electron.csproj`

### 分岐パターン
- **フロントエンドJS**: グローバル定数 `WINDOWS`/`LINUX` で分岐 (`if (WINDOWS) {...} else {...}`)
- **ネイティブAPI呼び出し**: 
  - Windows = `CefSharp.BindObjectAsync` による直接バインディング
  - macOS/Linux = `InteropApi` Proxy (`window.interopApi.callDotNetMethod`)
- **WebApi実行**: `webApiService.execute()` 内で分岐
  - WINDOWS = `WebApi.Execute()` (returns `{Item1, Item2}`)
  - LINUX = `WebApi.ExecuteJson()` (JSON string)
- **.NET側**: 
  - `AppApi/Common/` = 共通
  - `AppApi/Cef/` = Windows専用
  - `AppApi/Electron/` = macOS/Linux専用
  - 条件付きコンパイル: `#if LINUX` / `#if !LINUX`
- **Electron専用**: `window.electron` (preloadで公開) はmacOS/Linuxのみ存在

## アーキテクチャ

### 全体構成
```
Electron Main (src-electron/main.js)
  ↓ node-api-dotnet
.NET Runtime (Dotnet/)
  ↓
VRChat API / WebSocket
```

### フロントエンド (Renderer)
- Vue 3 SPA
- VRChat REST API (`src/service/request.js`)
- WebSocket (`src/service/websocket.js`)

### .NETバックエンド
- ログ解析 (`LogWatcher.cs`)
- データベース (`SQLite.cs`)
- VRオーバーレイ (`Overlay/`)
- Discord Rich Presence (`Discord.cs`)
- プロセス監視 (`ProcessMonitor.cs`)

### IPC
- `src-electron/InteropApi.js` ⇄ `Dotnet/AppApi/`

## VRChat API連携

- **REST API**: `https://api.vrchat.cloud/api/1` (`AppDebug.endpointDomain`)
- **WebSocket**: `wss://pipeline.vrchat.cloud` (`AppDebug.websocketDomain`)
- **HTTP**: `request(endpoint, options)` → `webApiService.execute()` → .NET `WebApi.Execute`
- **GET request dedup**: 10秒
- **404/403 retry suppression**: 15分
- **WebSocket events**: notification, friend-add/delete/online/active/offline/update/location, user-update/location, group-*, instance-*, content-refresh

## バージョン管理

- バージョンファイル: `./Version` (現在: `0.0.0-develop`)
- `NIGHTLY`: 開発モードまたはバージョンが7文字のコミットハッシュで終わる場合にtrue
