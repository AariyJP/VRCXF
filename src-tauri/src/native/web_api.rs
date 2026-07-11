use base64::Engine;
use cookie_store::CookieStore;
use parking_lot::RwLock;
use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
use reqwest::multipart::{Form, Part};
use reqwest::{Client, Method};
use reqwest_cookie_store::CookieStoreMutex;
use serde_json::{Map, Value};
use std::fs;
use std::io::BufReader;
use std::path::PathBuf;
use std::sync::Arc;

const B64: base64::engine::GeneralPurpose = base64::engine::general_purpose::STANDARD;

pub struct WebApi {
    cookie_store: Arc<CookieStoreMutex>,
    client: RwLock<Client>,
    user_agent: RwLock<String>,
    cookies_path: PathBuf,
}

fn build_client(store: &Arc<CookieStoreMutex>, user_agent: &str) -> Client {
    Client::builder()
        .cookie_provider(Arc::clone(store))
        .user_agent(user_agent)
        .build()
        .unwrap_or_default()
}

impl WebApi {
    pub fn new(cookies_path: PathBuf, user_agent: String) -> Self {
        let store = Self::load_store(&cookies_path);
        let store = Arc::new(CookieStoreMutex::new(store));
        let client = build_client(&store, &user_agent);
        Self {
            cookie_store: store,
            client: RwLock::new(client),
            user_agent: RwLock::new(user_agent),
            cookies_path,
        }
    }

    fn load_store(path: &PathBuf) -> CookieStore {
        if let Ok(file) = fs::File::open(path) {
            if let Ok(store) = cookie_store::serde::json::load(BufReader::new(file)) {
                return store;
            }
        }
        CookieStore::default()
    }

    fn save_store(&self) {
        let store = self.cookie_store.lock().unwrap();
        if let Ok(mut file) = fs::File::create(&self.cookies_path) {
            let _ = cookie_store::serde::json::save_incl_expired_and_nonpersistent(
                &store, &mut file,
            );
        }
    }

    fn store_to_json(&self) -> Vec<u8> {
        let store = self.cookie_store.lock().unwrap();
        let mut buffer = Vec::new();
        let _ = cookie_store::serde::json::save_incl_expired_and_nonpersistent(
            &store,
            &mut buffer,
        );
        buffer
    }

    pub fn client(&self) -> Client {
        self.client.read().clone()
    }

    pub fn set_user_agent(&self, user_agent: &str) {
        *self.user_agent.write() = user_agent.to_string();
        *self.client.write() = build_client(&self.cookie_store, user_agent);
    }

    pub fn clear_cookies(&self) {
        {
            let mut store = self.cookie_store.lock().unwrap();
            *store = CookieStore::default();
        }
        self.save_store();
    }

    pub fn get_cookies(&self) -> String {
        self.save_store();
        B64.encode(self.store_to_json())
    }

    pub fn set_cookies(&self, encoded: &str) {
        if let Ok(bytes) = B64.decode(encoded) {
            if let Ok(store) = cookie_store::serde::json::load(BufReader::new(&bytes[..])) {
                let mut current = self.cookie_store.lock().unwrap();
                *current = store;
            }
        }
        self.save_store();
    }

    fn parse_headers(options: &Map<String, Value>) -> Vec<(String, String)> {
        let mut result = Vec::new();
        if let Some(Value::Object(headers)) = options.get("headers") {
            for (key, value) in headers {
                let text = match value {
                    Value::String(s) => s.clone(),
                    other => other.to_string(),
                };
                result.push((key.clone(), text));
            }
        }
        result
    }

    fn str_opt(options: &Map<String, Value>, key: &str) -> Option<String> {
        options.get(key).and_then(|v| v.as_str()).map(|s| s.to_string())
    }

    async fn build_request(
        &self,
        url: &str,
        options: &Map<String, Value>,
    ) -> Result<reqwest::RequestBuilder, String> {
        let client = self.client.read().clone();
        let headers = Self::parse_headers(options);

        let mut builder = if options.contains_key("uploadFilePUT") {
            let file_data = Self::str_opt(options, "fileData").unwrap_or_default();
            let bytes = B64.decode(file_data).map_err(|e| e.to_string())?;
            let mime = Self::str_opt(options, "fileMIME")
                .unwrap_or_else(|| "application/octet-stream".to_string());
            let mut b = client
                .put(url)
                .header("Content-Type", mime)
                .body(bytes);
            if let Some(md5) = Self::str_opt(options, "fileMD5") {
                b = b.header("Content-MD5", md5);
            }
            b
        } else if options.contains_key("uploadImageLegacy") {
            let mut form = Form::new();
            if let Some(post_data) = Self::str_opt(options, "postData") {
                form = form.text("data", post_data);
            }
            let image_data = Self::str_opt(options, "imageData").unwrap_or_default();
            let bytes = B64.decode(image_data).map_err(|e| e.to_string())?;
            let part = Part::bytes(bytes)
                .file_name("image.png")
                .mime_str("image/png")
                .map_err(|e| e.to_string())?;
            form = form.part("image", part);
            client.post(url).multipart(form)
        } else if options.contains_key("uploadImage") {
            let mut form = Form::new();
            if let Some(post_data) = Self::str_opt(options, "postData") {
                if let Ok(Value::Object(map)) = serde_json::from_str::<Value>(&post_data) {
                    for (key, value) in map {
                        let text = match value {
                            Value::String(s) => s,
                            other => other.to_string(),
                        };
                        form = form.text(key, text);
                    }
                }
            }
            let image_data = Self::str_opt(options, "imageData").unwrap_or_default();
            let bytes = B64.decode(image_data).map_err(|e| e.to_string())?;
            let part = Part::bytes(bytes)
                .file_name("blob")
                .mime_str("image/png")
                .map_err(|e| e.to_string())?;
            form = form.part("file", part);
            client.post(url).multipart(form)
        } else if options.contains_key("uploadImagePrint") {
            let image_data = Self::str_opt(options, "imageData").unwrap_or_default();
            let bytes = B64.decode(image_data).map_err(|e| e.to_string())?;
            let part = Part::bytes(bytes)
                .file_name("image")
                .mime_str("image/png")
                .map_err(|e| e.to_string())?;
            let mut form = Form::new().part("image", part);
            if let Some(post_data) = Self::str_opt(options, "postData") {
                if let Ok(Value::Object(map)) = serde_json::from_str::<Value>(&post_data) {
                    for (key, value) in map {
                        let text = match value {
                            Value::String(s) => s,
                            other => other.to_string(),
                        };
                        form = form.text(key, text);
                    }
                }
            }
            client.post(url).multipart(form)
        } else {
            let method = Self::str_opt(options, "method")
                .and_then(|m| Method::from_bytes(m.to_uppercase().as_bytes()).ok())
                .unwrap_or(Method::GET);
            let has_body = method != Method::GET && options.contains_key("body");
            let mut b = client.request(method, url);
            if has_body {
                let body = Self::str_opt(options, "body").unwrap_or_default();
                if let Some((_, content_type)) = headers
                    .iter()
                    .find(|(k, _)| k.eq_ignore_ascii_case("content-type"))
                {
                    b = b.header("Content-Type", content_type.clone());
                }
                b = b.body(body);
            }
            b
        };

        let mut header_map = HeaderMap::new();
        for (key, value) in &headers {
            if key.eq_ignore_ascii_case("content-type") {
                continue;
            }
            if let (Ok(name), Ok(val)) = (
                HeaderName::from_bytes(key.as_bytes()),
                HeaderValue::from_str(value),
            ) {
                header_map.insert(name, val);
            }
        }
        builder = builder.headers(header_map);
        Ok(builder)
    }

    pub async fn execute(&self, options: &Map<String, Value>) -> (i64, String) {
        let url = match options.get("url").and_then(|v| v.as_str()) {
            Some(url) => url.to_string(),
            None => return (-1, "url is required".to_string()),
        };

        let builder = match self.build_request(&url, options).await {
            Ok(builder) => builder,
            Err(e) => return (-1, e),
        };

        match builder.send().await {
            Ok(response) => {
                let status = response.status().as_u16() as i64;
                let has_set_cookie = response.headers().contains_key("set-cookie");
                let content_type = response
                    .headers()
                    .get("content-type")
                    .and_then(|v| v.to_str().ok())
                    .unwrap_or("")
                    .to_string();

                let result = if content_type.contains("image/")
                    || content_type.contains("application/octet-stream")
                {
                    match response.bytes().await {
                        Ok(bytes) => (
                            status,
                            format!("data:image/png;base64,{}", B64.encode(&bytes)),
                        ),
                        Err(e) => (-1, e.to_string()),
                    }
                } else {
                    match response.text().await {
                        Ok(text) => (status, text),
                        Err(e) => (-1, e.to_string()),
                    }
                };

                if has_set_cookie {
                    self.save_store();
                }
                result
            }
            Err(e) => {
                let status = e.status().map(|s| s.as_u16() as i64).unwrap_or(-1);
                (status, e.to_string())
            }
        }
    }

    pub async fn execute_json(&self, request_json: &str) -> String {
        let options = match serde_json::from_str::<Value>(request_json) {
            Ok(Value::Object(map)) => map,
            _ => {
                return serde_json::json!({ "status": -1, "message": "invalid request json" })
                    .to_string()
            }
        };
        let (status, message) = self.execute(&options).await;
        serde_json::json!({ "status": status, "message": message }).to_string()
    }
}
