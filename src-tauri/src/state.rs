use crate::native::discord::Discord;
use crate::native::log_watcher::LogWatcher;
use crate::native::sqlite::SqliteDb;
use crate::native::storage::Storage;
use crate::native::web_api::WebApi;
use crate::paths;
use parking_lot::Mutex;
use std::path::PathBuf;

pub const VERSION: &str = include_str!("../../Version");

pub fn version_string() -> String {
    format!("VRCX {}", VERSION.trim())
}

pub struct AppState {
    pub storage: Storage,
    pub db: SqliteDb,
    pub web: WebApi,
    pub log_watcher: LogWatcher,
    pub discord: Discord,
    pub zoom: Mutex<f64>,
    pub launcher_settings: Mutex<(bool, bool, bool)>,
}

impl AppState {
    pub fn new() -> Result<Self, String> {
        let app_data = paths::app_data_dir();
        std::fs::create_dir_all(&app_data).map_err(|e| e.to_string())?;

        let storage = Storage::new(paths::storage_path());

        let db_location = storage.get("VRCX_DatabaseLocation");
        let db_path = if db_location.is_empty() {
            paths::default_sqlite_path()
        } else {
            PathBuf::from(db_location)
        };
        let db = SqliteDb::new(&db_path)?;

        let web = WebApi::new(paths::cookies_path(), version_string());

        Ok(Self {
            storage,
            db,
            web,
            log_watcher: LogWatcher::new(),
            discord: Discord::new(),
            zoom: Mutex::new(0.0),
            launcher_settings: Mutex::new((false, false, false)),
        })
    }
}
