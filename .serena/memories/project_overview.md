# VRCXF プロジェクト概要

## プロジェクトの目的

VRCXF は VRChat のフレンド管理、プレゼンス追跡、ログ収集、モデレーション支援、お気に入り管理、チャート、ツール群、VR オーバーレイサポートを提供するデスクトップアプリ。vrcx-team/VRCX のフォークとして保守されている。

## 現在のプロダクト形態

- コードベース上のブランディングは主に `VRCXF`
- Windows は CEF/CefSharp
- macOS/Linux は Electron + node-api-dotnet
- Browser: 開発/検証用の追加ターゲット（配布対象外）。`src/ipc-browser/` のブラウザ内モックで .NET ランタイムなしに動作確認できる
- フロントエンドは Vue 3 SPA、Pinia、Vue Router、TailwindCSS 4、shadcn-vue、vue-i18n、Vitest、Vue Query を使用
- バックエンドは C#、Windows で .NET 10、Electron ターゲットで .NET 9

## 進行中のアーキテクチャ方針

最近のプロジェクト進化で導入・拡張されたレイヤ:

- `src/queries/`: Vue Query クライアント、キャッシュヘルパー、エンティティクエリ
- `src/coordinators/`: 認証、フレンド、ゲーム、ユーザーフローのオーケストレーション層
- `src/ipc-electron/`: レンダラ側の Electron IPC ヘルパー
- `src/ipc-browser/`: Browser 検証ターゲット向けネイティブ API モック
- `src/public/`: Vite が管理する公開静的アセット
- `src/app.css`: `src/styles/globals.css` から分離されたアプリシェルのレイアウト用 CSS

## 主なランタイムフロー

レンダラ (`src/`) → interop ブートストラップ (`src/plugins/interopApi.js`、`src/ipc-electron/interopApi.js`、`src/ipc-browser/index.js`) → .NET ランタイム (`Dotnet/`) → VRChat API / WebSocket / SQLite / OS 連携（Browser ターゲットのみ .NET ランタイムを介さずブラウザ API で代替）

## ユーザー向け主要領域

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
- VR オーバーレイ
