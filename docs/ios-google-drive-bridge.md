# iOS 向け Google Drive バックアップ受け口仕様

VRCXF 本体（Web）側の Google Drive バックアップは、共通ロジックを `src/services/googleDrive.js` に置き、プラットフォーム差分だけを `AppApi.GoogleDrive*` の 9 本のフックに逃がす構成になっている。本書は [VRCXF-ios](https://github.com/AariyJP/VRCXF-ios) が実装すべきフックの契約を定義する。

対象コミット: `6bece3dd feat: support google drive backup on browser target`

## 1. 前提

iOS アプリは Browser ビルド（`build/html`）を `WKURLSchemeHandler` 経由で `<scheme>://app` から配信している。`src/index.html` のランタイム判定は次のとおりで、iOS では `CefSharp` も `window.electron` も存在しないため `BROWSER === true` になる。

```js
BROWSER = typeof CefSharp === 'undefined' && typeof window.electron === 'undefined';
```

したがって **iOS では既定で `src/ipc-browser/index.js` の実装が使われる**。Swift 側がフックを担うには、JS 側に「ネイティブブリッジがあればそちらへ委譲する」シムが必要になる（§3）。

### iOS で Swift 実装が必要なフック

| フック                                | iOS での担当       | 理由                                                                                          |
| ------------------------------------- | ------------------ | --------------------------------------------------------------------------------------------- |
| `GoogleDriveGetOAuthConfig`           | **Swift**          | iOS 専用 OAuth クライアント ID を返すため                                                     |
| `GoogleDriveRequestAuthorizationCode` | **Swift**          | `window.open` が WKWebView で成立しない。`ASWebAuthenticationSession` を使う                  |
| `GoogleDriveCancelSignIn`             | **Swift**          | 認証セッションのキャンセル                                                                    |
| `GoogleDriveExchangeToken`            | **Swift**          | 独自スキームオリジンから Google のトークンエンドポイントへ直接 `fetch` できるか保証がないため |
| `GoogleDriveRevokeToken`              | **Swift**          | 同上                                                                                          |
| `GoogleDriveLoadCredentials`          | Browser 実装を流用 | `localStorage`                                                                                |
| `GoogleDriveSaveCredentials`          | Browser 実装を流用 | `localStorage`                                                                                |
| `GoogleDriveUploadDatabase`           | Browser 実装を流用 | sql.js の `export()` + `fetch`。Drive API は CORS 対応                                        |
| `GoogleDriveDownloadDatabase`         | Browser 実装を流用 | `fetch` + 既存の `importDatabase`                                                             |

Swift 側の実装は **5 本**。

## 2. OAuth クライアントの選択

iOS は **「iOS」タイプの OAuth 2.0 クライアント**を Google Cloud Console に新規作成して使う。Desktop（installed app タイプ）や Browser（Web application タイプ）のクライアントは流用しない。

理由:

- iOS タイプのクライアントは **public client** であり `client_secret` を持たない。アプリバイナリに秘密を埋め込まずに済む
- リダイレクト URI は逆ドメイン形式のカスタムスキーム（`com.googleusercontent.apps.<CLIENT_ID 前半>:/oauth2redirect`）で、`ASWebAuthenticationSession` の `callbackURLScheme` にそのまま対応する
- Cloudflare Pages Function（`functions/api/google/token.ts`）を経由させる案は採らない。同 Function は `Origin` が自オリジンと一致することを要求しており、iOS の独自スキームオリジンからは通らない。スキームハンドラで `Origin` を詐称すれば動くが、検証を無意味にするうえ、バックアップ機能が Cloudflare 配信に依存することになる

スコープは Desktop / Browser と同一:

```
https://www.googleapis.com/auth/drive.appdata
```

### Console で必要な設定

1. OAuth クライアント ID を新規作成（アプリケーションの種類: **iOS**）
2. バンドル ID にアプリの bundle identifier を設定
3. 発行された **クライアント ID** を `VRCXF/Info.plist` の `GoogleDriveClientID` キーに設定する（secret は発行されない）。3 ターゲットが同じ `Info.plist` を使うため設定は 1 か所で済む
4. `CFBundleURLTypes` への登録は不要。`ASWebAuthenticationSession` が `callbackURLScheme` で指定したスキームを自前で受け取るため

リダイレクト URI は Swift 側がクライアント ID から導出する。

```
com.googleusercontent.apps.<クライアント ID から .apps.googleusercontent.com を除いた部分>:/oauth2redirect
```

## 3. JS 側の委譲シム

`src/ipc-browser/index.js` に実装済み。Swift 側は次のメッセージハンドラ名を公開する。

```
window.webkit.messageHandlers.googleDrive
```

JS からの呼び出しは単一ハンドラに対する `postMessage` とし、`{ method, args }` を渡して戻り値を受け取る。ブリッジが存在しない場合は Browser 実装へフォールバックする。

```js
function delegateToNativeGoogleDrive(method, args) {
  const bridge = globalThis.webkit?.messageHandlers?.googleDrive;
  return bridge ? bridge.postMessage({ method, args }) : null;
}
```

`args` は文字列の配列で、Swift 側は `args[0]` のみを読む。`GoogleDriveGetOAuthConfig` と `GoogleDriveCancelSignIn` は空配列を渡す。

`GoogleDriveGetOAuthConfig` / `GoogleDriveRequestAuthorizationCode` / `GoogleDriveExchangeToken` は文字列で resolve する。`GoogleDriveCancelSignIn` / `GoogleDriveRevokeToken` は値なしで resolve する。失敗時は reject され、エラーメッセージは英語の短い説明になる。

`WKScriptMessageHandlerWithReply`（iOS 14+）を使うと `postMessage` が Promise を返すため、既存のフック定義（すべて `Promise` を返す）とそのまま噛み合う。片方向の `WKScriptMessageHandler` では戻り値を返せないので使えない。

Swift 側の登録は `userContentController.add(_:name:)` ではなく次を使う。

```swift
configuration.userContentController.addScriptMessageHandler(
    self.googleDriveBridge,
    contentWorld: .page,
    name: "googleDrive"
)
```

既存の `themeChange` / `routeChange` / `dialogChange` は片方向のままでよい。

## 4. フック契約

ブリッジを跨ぐ値は **すべて文字列**。オブジェクトは JSON 文字列としてやり取りする。これは CefSharp / node-api-dotnet との互換のための既存の取り決めであり、iOS もこれに従う。

型定義の正本は `src/types/globals.d.ts`。

```ts
GoogleDriveGetOAuthConfig(): Promise<string>;
GoogleDriveLoadCredentials(): Promise<string>;
GoogleDriveSaveCredentials(credentialsJson: string): Promise<void>;
GoogleDriveRequestAuthorizationCode(requestJson: string): Promise<string>;
GoogleDriveCancelSignIn(): Promise<void>;
GoogleDriveExchangeToken(formJson: string): Promise<string>;
GoogleDriveRevokeToken(refreshToken: string): Promise<void>;
GoogleDriveUploadDatabase(accessToken: string): Promise<string>;
GoogleDriveDownloadDatabase(fileId: string, accessToken: string): Promise<boolean>;
```

### 4.1 `GoogleDriveGetOAuthConfig`

引数なし。iOS タイプ OAuth クライアントのクライアント ID を返す。

戻り値（JSON 文字列）:

```json
{ "clientId": "1234567890-abcdefg.apps.googleusercontent.com" }
```

未設定時は `{ "clientId": "" }` を返す。共通層はこれを「連携未設定」と解釈し、UI に「このビルドでは Google Drive 連携が設定されていません。」を表示してすべてのボタンを無効化する。例外を投げてはならない。

### 4.2 `GoogleDriveRequestAuthorizationCode`

引数（JSON 文字列）:

```json
{
  "clientId": "1234567890-abcdefg.apps.googleusercontent.com",
  "scope": "https://www.googleapis.com/auth/drive.appdata",
  "codeChallenge": "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
  "state": "qWxYz0123456789abcdef"
}
```

`codeChallenge` は共通層が生成済みの **S256 チャレンジ**（base64url、パディング無し）。`code_verifier` は共通層が保持するため Swift 側には渡らない。

Swift 側の責務:

1. リダイレクト URI を自分で決める（`com.googleusercontent.apps.<...>:/oauth2redirect`）
2. 認可 URL を組み立てる。クエリは以下を**すべて**付与する

   | パラメータ              | 値                             |
   | ----------------------- | ------------------------------ |
   | `client_id`             | 引数の `clientId`              |
   | `redirect_uri`          | Swift が決めたリダイレクト URI |
   | `response_type`         | `code`                         |
   | `scope`                 | 引数の `scope`                 |
   | `code_challenge`        | 引数の `codeChallenge`         |
   | `code_challenge_method` | `S256`                         |
   | `state`                 | 引数の `state`                 |
   | `access_type`           | `offline`                      |
   | `prompt`                | `consent`                      |

   `access_type=offline` と `prompt=consent` は **リフレッシュトークンを確実に得るために必須**。欠けると共通層が「Google からリフレッシュトークンを取得できませんでした。」で失敗する。

   エンドポイントは `https://accounts.google.com/o/oauth2/v2/auth`。

3. `ASWebAuthenticationSession` を開始する（`prefersEphemeralWebBrowserSession` は既定の `false` でよい。ユーザーの既存 Google ログインを再利用できる）
4. コールバック URL のクエリから `state` を取り出し、**引数の `state` と一致することを検証する**。不一致ならエラーを投げる
5. `code` を取り出して返す

戻り値（JSON 文字列）:

```json
{
  "code": "4/0AX4Xf...",
  "redirectUri": "com.googleusercontent.apps.1234567890-abcdefg:/oauth2redirect"
}
```

`redirectUri` は次の `GoogleDriveExchangeToken` にそのまま渡されるため、**認可時に使った値と完全に同一**でなければならない。

エラー時は reject する。ユーザーがキャンセルした場合（`ASWebAuthenticationSessionError.canceledLogin`）も reject でよい。共通層はキャンセルを別扱いするが、その判定は `GoogleDriveCancelSignIn` が呼ばれたかどうかで共通層自身が行うため、Swift 側でエラー種別を区別する必要はない。

### 4.3 `GoogleDriveCancelSignIn`

引数なし、戻り値なし。進行中の `ASWebAuthenticationSession` を `cancel()` する。セッションが無い場合は何もしない（例外を投げない）。

### 4.4 `GoogleDriveExchangeToken`

引数（JSON 文字列）。共通層は次の 2 パターンのいずれかを送る。

認可コード交換:

```json
{
  "grant_type": "authorization_code",
  "code": "4/0AX4Xf...",
  "code_verifier": "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
  "redirect_uri": "com.googleusercontent.apps.1234567890-abcdefg:/oauth2redirect"
}
```

リフレッシュ:

```json
{
  "grant_type": "refresh_token",
  "refresh_token": "1//0eXa..."
}
```

Swift 側の責務: 受け取ったフィールドに `client_id` を加えて `https://oauth2.googleapis.com/token` へ `application/x-www-form-urlencoded` で POST し、**レスポンスボディをそのまま文字列で返す**。iOS クライアントは public client なので `client_secret` は付けない。

**HTTP ステータスが 4xx / 5xx でも例外を投げず、ボディをそのまま返すこと。** 共通層は本文の `error` フィールドを見て分岐しており、特に `invalid_grant` を検出して資格情報の破棄と再ログイン誘導を行う。

成功時のボディ例:

```json
{
  "access_token": "ya29...",
  "expires_in": 3599,
  "refresh_token": "1//0eXa...",
  "scope": "https://www.googleapis.com/auth/drive.appdata",
  "token_type": "Bearer"
}
```

失敗時のボディ例:

```json
{ "error": "invalid_grant", "error_description": "Token has been expired or revoked." }
```

ネットワーク到達不能など、HTTP レスポンス自体が得られなかった場合のみ reject する。

### 4.5 `GoogleDriveRevokeToken`

引数はリフレッシュトークンの**生文字列**（JSON ではない）。`https://oauth2.googleapis.com/revoke` へ `token=<値>` を `application/x-www-form-urlencoded` で POST する。

戻り値なし。失敗しても **reject しないことが望ましい**。共通層はログアウト時にローカルの資格情報を先に破棄してから本フックを呼び、失敗は警告ログに留める設計になっている。

### 4.6 Browser 実装を流用するフック

以下は Swift 実装不要。委譲シムは `nativeGoogleDrive` が無いか、該当メソッドを公開していない場合に既存の Browser 実装へフォールバックする。

| フック                        | Browser 実装の挙動                                                                                                    |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `GoogleDriveLoadCredentials`  | `localStorage` の `vrcx-google-drive-credentials` を返す。未保存なら `"{}"`                                           |
| `GoogleDriveSaveCredentials`  | `refreshToken` が空なら削除、それ以外は JSON をそのまま保存                                                           |
| `GoogleDriveUploadDatabase`   | sql.js の `export()` を `Blob` にして multipart で `appDataFolder` にアップロード。アップロードしたファイル ID を返す |
| `GoogleDriveDownloadDatabase` | `alt=media` で取得し、既存の `importDatabase` で IndexedDB ごと差し替える。成否を `boolean` で返す                    |

資格情報の JSON 形状:

```json
{ "refreshToken": "1//0eXa...", "email": "user@example.com" }
```

`email` は Drive の `about` 取得に失敗した場合 `null` になり得る。`refreshToken` の有無のみがログイン状態の判定に使われる。

## 5. 共通層が保証していること

Swift 側で**実装してはならない**責務。二重実装すると不整合になる。

- PKCE の `code_verifier` 生成と S256 チャレンジ算出（`src/services/googleDrive.js` の純 JS SHA-256。`crypto.subtle` は独自スキームが secure context でないため使えない）
- `state` の生成
- アクセストークンのキャッシュと期限管理（`expires_in - 60` 秒）
- `invalid_grant` 検出時の資格情報破棄
- Drive のファイル一覧取得、旧バックアップの削除、`about` でのメールアドレス取得
- ログイン状態・最終バックアップ日時の算出と UI への反映

## 6. 既知の制約

- **メモリ**: sql.js は DB 全体を wasm ヒープに保持し、`export()` でさらに全量コピーが発生する。これは Browser ターゲットの既存の仕組みであり iOS でも同様に動作しているが、Desktop サイズのバックアップ（100 MB 超）を iOS で復元する場合はダウンロード分を含めて複数コピーが同時に存在する
- **バックグラウンド遷移**: WKWebView はバックグラウンド遷移で IndexedDB 接続を閉じることがある。長時間のアップロード / ダウンロード中に発生し得る。`src/ipc-browser/index.js` には再接続とリトライの実装が入っているが、転送そのものは中断され得る
- **`/api/google/*`**: iOS のスキームハンドラは `/api/1` と `/locate-me-api/1` のみ中継している。本仕様では Function を使わないため中継追加は不要

## 7. 実装チェックリスト

Swift 側:

- [x] `WKScriptMessageHandlerWithReply` を実装し、`addScriptMessageHandler(_:contentWorld:name:)` で `googleDrive` として登録
- [x] `GoogleDriveGetOAuthConfig` / `RequestAuthorizationCode` / `CancelSignIn` / `ExchangeToken` / `RevokeToken` の 5 メソッドをディスパッチ
- [x] `ASWebAuthenticationSession` の `presentationContextProvider` を実装
- [x] `state` 検証を実装
- [x] `ExchangeToken` がエラーレスポンスのボディをそのまま返すことを確認
- [ ] Google Cloud Console で iOS タイプの OAuth クライアントを作成し、クライアント ID を取得
- [ ] クライアント ID を `Info.plist` の `GoogleDriveClientID` に設定
- [ ] 実機 / シミュレータでの動作確認

VRCXF 本体側:

- [x] `src/ipc-browser/index.js` にネイティブブリッジ委譲シムを追加
- [x] ブリッジ非在時に既存の Browser 実装へフォールバック

`VRCXF.xcodeproj/project.pbxproj` は Xcode が管理するため直接編集しない。新規ファイルの追加は Xcode 上で行う。
