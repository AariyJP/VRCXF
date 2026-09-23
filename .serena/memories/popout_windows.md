# ポップアウトウィンドウ（フォーク独自機能）

ダイアログを `window.open()` した別ウィンドウへ Teleport して表示できる。**upstream には存在しないフォーク独自のサブシステム**で、upstream をマージするたびに壊れやすい。

## 構成要素

- `src/components/ui/window-teleport/WindowTeleport.vue` — 子ウィンドウを開き、スタイルを複製して Vue のツリーを Teleport する
- `src/lib/activeWindowTracker.js` — 開いている全 document を追跡し `activeDocument` を保持。`queryAcrossWindows()` / `queryAllAcrossWindows()` / `getFocusedWindow()` / `registerActiveDocument()` を提供
- `src/composables/usePortalDocument.js` — provide/inject で「自分が属する document」を配下へ伝える。`usePortalTarget()`、`useModalPortalLayer()`、クロスウィンドウの誤 dismiss を防ぐ `useCrossWindowDismissGuard()` / `useGuardedOutsideEmit()`
- `src/composables/useDialogPopoutModal.js` — ポップアウト内のダイアログでは `modal` を強制的に false にする。メインウィンドウが暗転して操作不能になるのを防ぐ
- `src/lib/modalPortalLayers.js` — document ごとにモーダルポータル層を確保・解放する
- `src/lib/clipboard.js` — `navigator.clipboard` をフォーカス中のウィンドウから取る。子ウィンドウでコピーが無反応になるのを防ぐ

組み込み箇所: `src/App.vue`、`src/views/Layout/MainLayout.vue`、`src/components/dialogs/MainDialogContainer.vue`

## 守るべき規約

**モジュールスコープの `document` / `window` は常にメインウィンドウを指す**ため、ポップアウト内の要素には当たらない。

| やりたいこと | 使わない | 使う |
|---|---|---|
| 要素探索 | `document.getElementById()` / `querySelector()` | `queryAcrossWindows()` |
| ポータル先 | `document.body` | `usePortalTarget()` / `usePortalDocument()` |
| クリップボード | `navigator.clipboard` | `src/lib/clipboard.js` |
| ウィンドウ参照 | `window` | `getFocusedWindow()` |

upstream が新しく `document.*` を使うコードを入れてきたら、ポップアウト内で使われ得るコンポーネントかを確認すること。

## 既知の未対応

- `src/components/ui/tabs/TabsUnderline.vue` の `getComputedStyle(document.documentElement).fontSize` は upstream 由来（2026-09-17 のタブスクロール実装）で、ポップアウト内ではメインウィンドウのルートを読む。両ウィンドウとも既定 16px のため現状は無害。ルートの font-size を可変にする場合は `usePortalDocument()` 経由に直す必要がある
