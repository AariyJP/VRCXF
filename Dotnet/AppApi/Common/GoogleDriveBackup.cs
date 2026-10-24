using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Sockets;
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
        private const string GoogleDriveBackupFileName = "VRCX.sqlite3";
        private const string GoogleDriveBackupContentType = "application/gzip";
        private const string GoogleDriveTokenUrl = "https://oauth2.googleapis.com/token";
        private const string GoogleDriveRevokeUrl = "https://oauth2.googleapis.com/revoke";

        private static readonly HttpClient GoogleDriveHttpClient = CreateGoogleDriveHttpClient();
        private static readonly SemaphoreSlim GoogleDriveLock = new(1, 1);
        private static CancellationTokenSource googleDriveSignInCts;
        private static string googleDrivePendingPath;

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

        public string GoogleDriveGetOAuthConfig()
        {
            return new JObject { ["clientId"] = GoogleDriveClientId }.ToString(Formatting.None);
        }

        private static string GoogleDriveCredentialsPath =>
            Path.Join(Program.AppDataDirectory, "GoogleDrive.json");

        public string GoogleDriveLoadCredentials()
        {
            try
            {
                if (!File.Exists(GoogleDriveCredentialsPath))
                    return new JObject().ToString(Formatting.None);

                return JObject.Parse(File.ReadAllText(GoogleDriveCredentialsPath, Encoding.UTF8))
                    .ToString(Formatting.None);
            }
            catch (Exception ex)
            {
                logger.Warn(ex, "Failed to read Google Drive credentials");
                return new JObject().ToString(Formatting.None);
            }
        }

        public void GoogleDriveSaveCredentials(string credentialsJson)
        {
            var credentials = JObject.Parse(credentialsJson);
            if (string.IsNullOrEmpty(credentials.Value<string>("refreshToken")))
            {
                if (File.Exists(GoogleDriveCredentialsPath))
                    File.Delete(GoogleDriveCredentialsPath);
                return;
            }

            File.WriteAllText(GoogleDriveCredentialsPath, credentials.ToString(Formatting.Indented), Encoding.UTF8);
        }

        public async Task<string> GoogleDriveRequestAuthorizationCode(string requestJson)
        {
            var request = JObject.Parse(requestJson);
            var state = request.Value<string>("state");

            GoogleDriveCancelSignIn();
            using var cts = new CancellationTokenSource(TimeSpan.FromMinutes(5));
            googleDriveSignInCts = cts;

            var listener = new TcpListener(IPAddress.Loopback, 0);
            listener.Start();
            try
            {
                var port = ((IPEndPoint)listener.LocalEndpoint).Port;
                var redirectUri = $"http://127.0.0.1:{port}";

                var authUrl = "https://accounts.google.com/o/oauth2/v2/auth?" + BuildQueryString(new Dictionary<string, string>
                {
                    ["client_id"] = request.Value<string>("clientId"),
                    ["redirect_uri"] = redirectUri,
                    ["response_type"] = "code",
                    ["scope"] = request.Value<string>("scope"),
                    ["code_challenge"] = request.Value<string>("codeChallenge"),
                    ["code_challenge_method"] = "S256",
                    ["state"] = state,
                    ["access_type"] = "offline",
                    ["prompt"] = "consent"
                });
                OpenLink(authUrl);

                var code = await WaitForGoogleAuthorizationCode(listener, state, cts.Token);
                return new JObject
                {
                    ["code"] = code,
                    ["redirectUri"] = redirectUri
                }.ToString(Formatting.None);
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

        public async Task<string> GoogleDriveExchangeToken(string formJson)
        {
            var form = new Dictionary<string, string>
            {
                ["client_id"] = GoogleDriveClientId,
                ["client_secret"] = GoogleDriveClientSecret
            };
            foreach (var (key, value) in JObject.Parse(formJson))
                form[key] = value?.ToString() ?? string.Empty;

            using var content = new FormUrlEncodedContent(form);
            using var response = await GoogleDriveHttpClient.PostAsync(GoogleDriveTokenUrl, content);
            return await response.Content.ReadAsStringAsync();
        }

        public async Task GoogleDriveRevokeToken(string refreshToken)
        {
            using var content = new FormUrlEncodedContent(new Dictionary<string, string> { ["token"] = refreshToken });
            using var response = await GoogleDriveHttpClient.PostAsync(GoogleDriveRevokeUrl, content);
            if (!response.IsSuccessStatusCode)
                logger.Warn("Failed to revoke Google Drive token ({status})", (int)response.StatusCode);
        }

        public async Task GoogleDriveCompressDatabase()
        {
            await GoogleDriveLock.WaitAsync();
            var snapshotPath = GetGoogleDriveTempPath(GoogleDriveBackupFileName);
            var compressedPath = snapshotPath + ".gz";
            try
            {
                TryDeleteFile(snapshotPath);
                SQLite.Instance.ExecuteNonQuery("VACUUM INTO @path", new Dictionary<string, object> { ["@path"] = snapshotPath });

                await using (var input = File.OpenRead(snapshotPath))
                await using (var output = File.Create(compressedPath))
                await using (var gzip = new GZipStream(output, CompressionLevel.Optimal))
                {
                    await input.CopyToAsync(gzip);
                }

                SetGoogleDrivePendingPath(compressedPath);
            }
            catch
            {
                TryDeleteFile(compressedPath);
                throw;
            }
            finally
            {
                TryDeleteFile(snapshotPath);
                GoogleDriveLock.Release();
            }
        }

        public async Task<string> GoogleDriveUploadDatabase(string accessToken)
        {
            await GoogleDriveLock.WaitAsync();
            var compressedPath = TakeGoogleDrivePendingPath();
            try
            {
                var length = new FileInfo(compressedPath).Length;

                using var initRequest = new HttpRequestMessage(HttpMethod.Post,
                    "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id")
                {
                    Content = new StringContent(new JObject
                    {
                        ["name"] = GoogleDriveBackupFileName,
                        ["parents"] = new JArray("appDataFolder")
                    }.ToString(Formatting.None), Encoding.UTF8, "application/json")
                };
                initRequest.Headers.Add("X-Upload-Content-Type", GoogleDriveBackupContentType);
                initRequest.Headers.Add("X-Upload-Content-Length", length.ToString());

                using var initResponse = await SendGoogleDriveRequest(initRequest, accessToken);
                var uploadUrl = initResponse.Headers.Location
                    ?? throw new InvalidOperationException("Google Drive のアップロード先を取得できませんでした。");

                await using var stream = File.OpenRead(compressedPath);
                using var uploadRequest = new HttpRequestMessage(HttpMethod.Put, uploadUrl)
                {
                    Content = new StreamContent(stream)
                };
                uploadRequest.Content.Headers.ContentType = new MediaTypeHeaderValue(GoogleDriveBackupContentType);
                uploadRequest.Content.Headers.ContentLength = length;
                using var uploadResponse = await SendGoogleDriveRequest(uploadRequest, accessToken);
                return JObject.Parse(await uploadResponse.Content.ReadAsStringAsync()).Value<string>("id");
            }
            finally
            {
                TryDeleteFile(compressedPath);
                GoogleDriveLock.Release();
            }
        }

        public async Task GoogleDriveDownloadDatabase(string fileId, string accessToken)
        {
            await GoogleDriveLock.WaitAsync();
            var downloadPath = GetGoogleDriveTempPath(GoogleDriveBackupFileName + ".gz");
            try
            {
                using (var request = new HttpRequestMessage(HttpMethod.Get,
                           $"https://www.googleapis.com/drive/v3/files/{fileId}?alt=media"))
                using (var response = await SendGoogleDriveRequest(request, accessToken, HttpCompletionOption.ResponseHeadersRead))
                await using (var output = File.Create(downloadPath))
                {
                    await response.Content.CopyToAsync(output);
                }

                SetGoogleDrivePendingPath(downloadPath);
            }
            catch
            {
                TryDeleteFile(downloadPath);
                throw;
            }
            finally
            {
                GoogleDriveLock.Release();
            }
        }

        public async Task<bool> GoogleDriveImportDatabase()
        {
            await GoogleDriveLock.WaitAsync();
            var downloadPath = TakeGoogleDrivePendingPath();
            var databasePath = Path.ChangeExtension(downloadPath, null);
            try
            {
                await using (var input = File.OpenRead(downloadPath))
                await using (var gzip = new GZipStream(input, CompressionMode.Decompress))
                await using (var output = File.Create(databasePath))
                {
                    await gzip.CopyToAsync(output);
                }

                return ImportDatabaseFile(databasePath, true);
            }
            finally
            {
                TryDeleteFile(downloadPath);
                TryDeleteFile(databasePath);
                GoogleDriveLock.Release();
            }
        }

        private static string GetGoogleDriveTempPath(string fileName)
        {
            var tempPath = Path.Join(Path.GetTempPath(), "VRCX");
            Directory.CreateDirectory(tempPath);
            return Path.Join(tempPath, fileName);
        }

        private static void SetGoogleDrivePendingPath(string path)
        {
            if (googleDrivePendingPath != null && googleDrivePendingPath != path)
                TryDeleteFile(googleDrivePendingPath);
            googleDrivePendingPath = path;
        }

        private static string TakeGoogleDrivePendingPath()
        {
            var path = googleDrivePendingPath
                ?? throw new InvalidOperationException("Google Drive の転送するファイルが準備されていません。");
            googleDrivePendingPath = null;
            return path;
        }

        private static async Task<HttpResponseMessage> SendGoogleDriveRequest(HttpRequestMessage request, string accessToken,
            HttpCompletionOption completionOption = HttpCompletionOption.ResponseContentRead)
        {
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
            var response = await GoogleDriveHttpClient.SendAsync(request, completionOption);
            if (response.IsSuccessStatusCode)
                return response;

            var statusCode = (int)response.StatusCode;
            var body = await response.Content.ReadAsStringAsync();
            response.Dispose();
            throw new HttpRequestException($"Google Drive API エラー ({statusCode}): {body}");
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
    }
}
