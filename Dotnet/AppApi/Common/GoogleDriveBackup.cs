using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace VRCX
{
    public partial class AppApi
    {
        private const string GoogleDriveClientId = "906543223879-p7nsbk0jnqegkoa4boa486ho2jtlssdr.apps.googleusercontent.com";
        private const string GoogleDriveClientSecret = "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";
        private const string GoogleDriveScope = "https://www.googleapis.com/auth/drive.appdata";
        private const string GoogleDriveRefreshTokenKey = "VRCX_GoogleDriveRefreshToken";
        private const string GoogleDriveEmailKey = "VRCX_GoogleDriveEmail";
        private const string GoogleDriveBackupFileName = "VRCX.sqlite3";
        private const string GoogleDriveBackupContentType = "application/vnd.sqlite3";

        private static readonly HttpClient GoogleDriveHttpClient = CreateGoogleDriveHttpClient();
        private static readonly SemaphoreSlim GoogleDriveLock = new(1, 1);
        private static CancellationTokenSource googleDriveSignInCts;
        private static string googleDriveAccessToken;
        private static DateTime googleDriveAccessTokenExpiry = DateTime.MinValue;

        private static HttpClient CreateGoogleDriveHttpClient()
        {
            var handler = new HttpClientHandler();
            if (WebApi.ProxySet)
                handler.Proxy = WebApi.Proxy;

            var client = new HttpClient(handler)
            {
                Timeout = TimeSpan.FromMinutes(30)
            };
            client.DefaultRequestHeaders.Add("User-Agent", Program.Version);
            return client;
        }

        public async Task<string> GoogleDriveGetStatus()
        {
            var status = new JObject
            {
                ["configured"] = !string.IsNullOrEmpty(GoogleDriveClientId),
                ["signedIn"] = false,
                ["email"] = null,
                ["backup"] = null,
                ["error"] = null
            };

            if (string.IsNullOrEmpty(VRCXStorage.Instance.Get(GoogleDriveRefreshTokenKey)))
                return status.ToString(Formatting.None);

            status["signedIn"] = true;
            status["email"] = VRCXStorage.Instance.Get(GoogleDriveEmailKey);

            try
            {
                var file = await FindGoogleDriveBackupFile();
                if (file != null)
                {
                    status["backup"] = new JObject
                    {
                        ["modifiedTime"] = file["modifiedTime"],
                        ["size"] = file["size"]
                    };
                }
            }
            catch (Exception ex)
            {
                logger.Error(ex, "Failed to get Google Drive backup status");
                status["error"] = ex.Message;
                if (string.IsNullOrEmpty(VRCXStorage.Instance.Get(GoogleDriveRefreshTokenKey)))
                    status["signedIn"] = false;
            }

            return status.ToString(Formatting.None);
        }

        public async Task<string> GoogleDriveSignIn()
        {
            if (string.IsNullOrEmpty(GoogleDriveClientId))
                throw new InvalidOperationException("Google Drive のクライアント ID が設定されていません。");

            GoogleDriveCancelSignIn();
            using var cts = new CancellationTokenSource(TimeSpan.FromMinutes(5));
            googleDriveSignInCts = cts;

            var verifier = ToBase64Url(RandomNumberGenerator.GetBytes(32));
            var challenge = ToBase64Url(SHA256.HashData(Encoding.ASCII.GetBytes(verifier)));
            var state = ToBase64Url(RandomNumberGenerator.GetBytes(16));

            var listener = new TcpListener(IPAddress.Loopback, 0);
            listener.Start();
            try
            {
                var port = ((IPEndPoint)listener.LocalEndpoint).Port;
                var redirectUri = $"http://127.0.0.1:{port}";

                var authUrl = "https://accounts.google.com/o/oauth2/v2/auth?" + BuildQueryString(new Dictionary<string, string>
                {
                    ["client_id"] = GoogleDriveClientId,
                    ["redirect_uri"] = redirectUri,
                    ["response_type"] = "code",
                    ["scope"] = GoogleDriveScope,
                    ["code_challenge"] = challenge,
                    ["code_challenge_method"] = "S256",
                    ["state"] = state,
                    ["access_type"] = "offline",
                    ["prompt"] = "consent"
                });
                OpenLink(authUrl);

                var code = await WaitForGoogleAuthorizationCode(listener, state, cts.Token);

                var token = await PostGoogleToken(new Dictionary<string, string>
                {
                    ["client_id"] = GoogleDriveClientId,
                    ["client_secret"] = GoogleDriveClientSecret,
                    ["code"] = code,
                    ["code_verifier"] = verifier,
                    ["grant_type"] = "authorization_code",
                    ["redirect_uri"] = redirectUri
                });

                var refreshToken = token.Value<string>("refresh_token");
                if (string.IsNullOrEmpty(refreshToken))
                    throw new InvalidOperationException("Google からリフレッシュトークンを取得できませんでした。");

                SetGoogleDriveAccessToken(token);
                VRCXStorage.Instance.Set(GoogleDriveRefreshTokenKey, refreshToken);

                var about = await SendGoogleDriveJson(HttpMethod.Get,
                    "https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)");
                VRCXStorage.Instance.Set(GoogleDriveEmailKey, about.SelectToken("user.emailAddress")?.ToString() ?? string.Empty);
                VRCXStorage.Instance.Save();
            }
            catch (OperationCanceledException)
            {
                throw new TimeoutException("Google の認証がタイムアウトしたか、キャンセルされました。");
            }
            finally
            {
                listener.Stop();
                if (googleDriveSignInCts == cts)
                    googleDriveSignInCts = null;
            }

            return await GoogleDriveGetStatus();
        }

        public void GoogleDriveCancelSignIn()
        {
            try
            {
                googleDriveSignInCts?.Cancel();
            }
            catch (ObjectDisposedException)
            {
            }
        }

        public async Task GoogleDriveSignOut()
        {
            var refreshToken = VRCXStorage.Instance.Get(GoogleDriveRefreshTokenKey);
            ClearGoogleDriveCredentials();

            if (string.IsNullOrEmpty(refreshToken))
                return;

            try
            {
                using var content = new FormUrlEncodedContent(new Dictionary<string, string> { ["token"] = refreshToken });
                await GoogleDriveHttpClient.PostAsync("https://oauth2.googleapis.com/revoke", content);
            }
            catch (Exception ex)
            {
                logger.Warn(ex, "Failed to revoke Google Drive token");
            }
        }

        public async Task<string> GoogleDriveBackup()
        {
            await GoogleDriveLock.WaitAsync();
            var snapshotPath = Path.Join(Path.GetTempPath(), $"VRCX-gdrive-{Guid.NewGuid():N}.sqlite3");
            try
            {
                SQLite.Instance.ExecuteNonQuery("VACUUM INTO @path", new Dictionary<string, object> { ["@path"] = snapshotPath });

                var existing = await FindGoogleDriveBackupFile();
                var length = new FileInfo(snapshotPath).Length;

                using var initRequest = existing == null
                    ? new HttpRequestMessage(HttpMethod.Post, "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable")
                    {
                        Content = new StringContent(new JObject
                        {
                            ["name"] = GoogleDriveBackupFileName,
                            ["parents"] = new JArray("appDataFolder")
                        }.ToString(Formatting.None), Encoding.UTF8, "application/json")
                    }
                    : new HttpRequestMessage(HttpMethod.Patch,
                        $"https://www.googleapis.com/upload/drive/v3/files/{existing.Value<string>("id")}?uploadType=resumable")
                    {
                        Content = new StringContent("{}", Encoding.UTF8, "application/json")
                    };
                initRequest.Headers.Add("X-Upload-Content-Type", GoogleDriveBackupContentType);
                initRequest.Headers.Add("X-Upload-Content-Length", length.ToString());

                using var initResponse = await SendGoogleDriveRequest(initRequest);
                var uploadUrl = initResponse.Headers.Location
                    ?? throw new InvalidOperationException("Google Drive のアップロード先を取得できませんでした。");

                await using var stream = File.OpenRead(snapshotPath);
                using var uploadRequest = new HttpRequestMessage(HttpMethod.Put, uploadUrl)
                {
                    Content = new StreamContent(stream)
                };
                uploadRequest.Content.Headers.ContentType = new MediaTypeHeaderValue(GoogleDriveBackupContentType);
                uploadRequest.Content.Headers.ContentLength = length;
                using var uploadResponse = await SendGoogleDriveRequest(uploadRequest);
            }
            finally
            {
                TryDeleteFile(snapshotPath);
                GoogleDriveLock.Release();
            }

            return await GoogleDriveGetStatus();
        }

        public async Task<bool> GoogleDriveRestore()
        {
            await GoogleDriveLock.WaitAsync();
            var downloadPath = Path.Join(Path.GetTempPath(), $"VRCX-gdrive-{Guid.NewGuid():N}.sqlite3");
            try
            {
                var file = await FindGoogleDriveBackupFile()
                    ?? throw new FileNotFoundException("Google Drive にバックアップがありません。");

                using (var request = new HttpRequestMessage(HttpMethod.Get,
                           $"https://www.googleapis.com/drive/v3/files/{file.Value<string>("id")}?alt=media"))
                using (var response = await SendGoogleDriveRequest(request, HttpCompletionOption.ResponseHeadersRead))
                await using (var output = File.Create(downloadPath))
                {
                    await response.Content.CopyToAsync(output);
                }

                return ImportDatabaseFile(downloadPath, true);
            }
            finally
            {
                TryDeleteFile(downloadPath);
                GoogleDriveLock.Release();
            }
        }

        private static async Task<string> WaitForGoogleAuthorizationCode(TcpListener listener, string state, CancellationToken cancellationToken)
        {
            while (true)
            {
                using var client = await listener.AcceptTcpClientAsync(cancellationToken);
                await using var stream = client.GetStream();
                using var reader = new StreamReader(stream, Encoding.ASCII, false, 1024, true);

                var requestLine = await reader.ReadLineAsync(cancellationToken);
                while (!string.IsNullOrEmpty(await reader.ReadLineAsync(cancellationToken)))
                {
                }

                var target = requestLine?.Split(' ') is { Length: >= 2 } parts ? parts[1] : string.Empty;
                var query = ParseQueryString(target.Contains('?') ? target[(target.IndexOf('?') + 1)..] : string.Empty);

                if (!query.ContainsKey("code") && !query.ContainsKey("error"))
                {
                    await WriteLoopbackResponse(stream, "404 Not Found", string.Empty);
                    continue;
                }

                if (query.TryGetValue("error", out var error))
                {
                    await WriteLoopbackResponse(stream, "200 OK", "認証がキャンセルされました。このタブを閉じてください。");
                    throw new OperationCanceledException(error);
                }

                if (!query.TryGetValue("state", out var returnedState) || returnedState != state)
                {
                    await WriteLoopbackResponse(stream, "400 Bad Request", "不正な認証応答です。");
                    continue;
                }

                await WriteLoopbackResponse(stream, "200 OK", "VRCXFとGoogle Driveの連携が完了しました。");
                return query["code"];
            }
        }

        private static async Task WriteLoopbackResponse(Stream stream, string status, string message)
        {
            var body = Encoding.UTF8.GetBytes(
                $"<!doctype html><html><head><meta charset=\"utf-8\"><title>VRCXF</title></head><body style=\"margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#000;color:#fff;font-family:sans-serif\">{WebUtility.HtmlEncode(message)}</body></html>");
            var header = Encoding.ASCII.GetBytes(
                $"HTTP/1.1 {status}\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {body.Length}\r\nConnection: close\r\n\r\n");
            await stream.WriteAsync(header);
            await stream.WriteAsync(body);
            await stream.FlushAsync();
        }

        private static async Task<JObject> FindGoogleDriveBackupFile()
        {
            var query = BuildQueryString(new Dictionary<string, string>
            {
                ["spaces"] = "appDataFolder",
                ["q"] = $"name = '{GoogleDriveBackupFileName}' and trashed = false",
                ["fields"] = "files(id,size,modifiedTime)",
                ["orderBy"] = "modifiedTime desc",
                ["pageSize"] = "1"
            });
            var result = await SendGoogleDriveJson(HttpMethod.Get, $"https://www.googleapis.com/drive/v3/files?{query}");
            return result["files"] is JArray { Count: > 0 } files ? (JObject)files[0] : null;
        }

        private static async Task<JObject> SendGoogleDriveJson(HttpMethod method, string url)
        {
            using var request = new HttpRequestMessage(method, url);
            using var response = await SendGoogleDriveRequest(request);
            return JObject.Parse(await response.Content.ReadAsStringAsync());
        }

        private static async Task<HttpResponseMessage> SendGoogleDriveRequest(HttpRequestMessage request,
            HttpCompletionOption completionOption = HttpCompletionOption.ResponseContentRead)
        {
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", await GetGoogleDriveAccessToken());
            var response = await GoogleDriveHttpClient.SendAsync(request, completionOption);
            if (response.IsSuccessStatusCode)
                return response;

            var body = await response.Content.ReadAsStringAsync();
            response.Dispose();
            if (response.StatusCode == HttpStatusCode.Unauthorized)
                googleDriveAccessToken = null;

            throw new HttpRequestException($"Google Drive API エラー ({(int)response.StatusCode}): {body}");
        }

        private static async Task<string> GetGoogleDriveAccessToken()
        {
            if (!string.IsNullOrEmpty(googleDriveAccessToken) && DateTime.UtcNow < googleDriveAccessTokenExpiry)
                return googleDriveAccessToken;

            var refreshToken = VRCXStorage.Instance.Get(GoogleDriveRefreshTokenKey);
            if (string.IsNullOrEmpty(refreshToken))
                throw new InvalidOperationException("Google Drive にログインしていません。");

            JObject token;
            try
            {
                token = await PostGoogleToken(new Dictionary<string, string>
                {
                    ["client_id"] = GoogleDriveClientId,
                    ["client_secret"] = GoogleDriveClientSecret,
                    ["refresh_token"] = refreshToken,
                    ["grant_type"] = "refresh_token"
                });
            }
            catch (GoogleTokenException ex) when (ex.Error == "invalid_grant")
            {
                ClearGoogleDriveCredentials();
                throw new InvalidOperationException("Google Drive の認証が失効しました。再度ログインしてください。");
            }

            SetGoogleDriveAccessToken(token);
            return googleDriveAccessToken;
        }

        private static async Task<JObject> PostGoogleToken(Dictionary<string, string> form)
        {
            using var content = new FormUrlEncodedContent(form);
            using var response = await GoogleDriveHttpClient.PostAsync("https://oauth2.googleapis.com/token", content);
            var json = JObject.Parse(await response.Content.ReadAsStringAsync());
            if (!response.IsSuccessStatusCode)
                throw new GoogleTokenException(json.Value<string>("error"), json.Value<string>("error_description"));

            return json;
        }

        private static void SetGoogleDriveAccessToken(JObject token)
        {
            googleDriveAccessToken = token.Value<string>("access_token");
            var expiresIn = token.Value<int?>("expires_in") ?? 3600;
            googleDriveAccessTokenExpiry = DateTime.UtcNow.AddSeconds(expiresIn - 60);
        }

        private static void ClearGoogleDriveCredentials()
        {
            googleDriveAccessToken = null;
            googleDriveAccessTokenExpiry = DateTime.MinValue;
            VRCXStorage.Instance.Remove(GoogleDriveRefreshTokenKey);
            VRCXStorage.Instance.Remove(GoogleDriveEmailKey);
            VRCXStorage.Instance.Save();
        }

        private static string BuildQueryString(Dictionary<string, string> values)
        {
            var parts = new List<string>();
            foreach (var (key, value) in values)
                parts.Add($"{Uri.EscapeDataString(key)}={Uri.EscapeDataString(value)}");
            return string.Join('&', parts);
        }

        private static Dictionary<string, string> ParseQueryString(string query)
        {
            var result = new Dictionary<string, string>();
            foreach (var pair in query.Split('&', StringSplitOptions.RemoveEmptyEntries))
            {
                var index = pair.IndexOf('=');
                var key = index < 0 ? pair : pair[..index];
                var value = index < 0 ? string.Empty : pair[(index + 1)..];
                result[Uri.UnescapeDataString(key.Replace('+', ' '))] = Uri.UnescapeDataString(value.Replace('+', ' '));
            }
            return result;
        }

        private static string ToBase64Url(byte[] bytes)
        {
            return Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
        }

        private static void TryDeleteFile(string path)
        {
            try
            {
                if (File.Exists(path))
                    File.Delete(path);
            }
            catch (Exception ex)
            {
                logger.Warn(ex, "Failed to delete temporary file {path}", path);
            }
        }

        private sealed class GoogleTokenException : Exception
        {
            public string Error { get; }

            public GoogleTokenException(string error, string description)
                : base($"Google 認証エラー: {description ?? error}")
            {
                Error = error;
            }
        }
    }
}
