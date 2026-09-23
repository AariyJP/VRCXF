# VRCXF プロジェクト概要

## プロジェクトの目的

VRCXF は VRChat のフレンド管理、プレゼンス追跡、ログ収集、モデレーション支援、お気に入り管理、チャート、ツール群、VR オーバーレイサポートを提供するデスクトップアプリ。[vrcx-team/VRCX](https://github.com/vrcx-team/VRCX) のフォークとして AariyJP が保守している。

## リポジトリ運用

- 作業ブランチは `develop`、リリースブランチは `main`
- `upstream` = vrcx-team/VRCX。定期的に `upstream/master` を `develop` へマージする
- リリースは `main` 上のマージコミットに CI がタグを打つ形（例: `2026.09.17-6734553`）
- **レビュー時、upstream 由来のコードは指摘しない。** 判定は `git ls-tree --name-only upstream/master <path>` と `git diff upstream/master HEAD -- <path>` で行う

## 配布形態

- **Windows**: CEF/CefSharp。framework-dependent ビルド（.NET ランタイム非同梱）
- **macOS/Linux**: Electron + node-api-dotnet
- **Browser**: .NET ランタイムなしでフロントエンドのみを一般ブラウザで動かす。**配布対象で**、リリース CI が `VRCXF_bundle.zip` としてアセットに含める
- Microsoft Store (`9nrr9b5q60z7`) と WinGet (`VRCXF.VRCXF`) で配布

## フォーク独自の主な差分

- **ポップアウトウィンドウ** — ダイアログを別ウィンドウへ Teleport する (`mem:popout_windows`)
- **`Everyone w/o Public` フィルタ** — noty / wrist の通知フィルタ。Public・Group Public インスタンスではフレンドのみ、それ以外は全員を通す
- **Browser ターゲットの拡充** — `src/ipc-browser/`、`functions/`、DB インポート、Diagnostics
- **`rednight` テーマ**
- **ブランディング** — インストーラー表示名 / Publisher / ショートカット名は `VRCXF` / `AariyJP`。実行ファイル名・インストール先・Application ID・URI スキーム・アンインストールキーは互換性維持のため `VRCX` / `vrcx` のまま

## 進行中のアーキテクチャ方針

- `src/coordinators/`: ストア横断フローの調整層（肥大化したストアから抽出）
- `src/queries/`: Vue Query クライアント、キャッシュヘルパー、エンティティクエリ
- `src/workers/`: Activity の重い計算をレンダラから分離
- `src/ipc-electron/` / `src/ipc-browser/`: ターゲット別の interop ヘルパー
- CSS のトークン化（`src/styles/globals.css` + `src/app.css`）

## 主なランタイムフロー

レンダラ (`src/`) → interop ブートストラップ (`src/plugins/interopApi.js`、`src/ipc-electron/interopApi.js`、`src/ipc-browser/index.js`) → .NET ランタイム (`Dotnet/`) → VRChat REST/WebSocket、SQLite、OS 連携
（Browser のみ .NET ランタイムを介さずブラウザ API で代替）

## ユーザー向け主要領域

Feed / Friends Locations / Game Log / Player List / Search / Favorites / Friend Log・Moderation・Friend List / Notifications / Charts / Tools / Settings / My Avatars / VR オーバーレイ
