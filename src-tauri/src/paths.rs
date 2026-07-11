use std::fs;
use std::path::PathBuf;

pub fn app_data_dir() -> PathBuf {
    let dir = dirs::data_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("VRCX");
    let _ = fs::create_dir_all(&dir);
    dir
}

pub fn storage_path() -> PathBuf {
    app_data_dir().join("VRCX.json")
}

pub fn default_sqlite_path() -> PathBuf {
    app_data_dir().join("VRCX.sqlite3")
}

pub fn cookies_path() -> PathBuf {
    app_data_dir().join("cookies.json")
}

pub fn vrchat_appdata_dir() -> PathBuf {
    let local = dirs::data_local_dir().unwrap_or_else(|| PathBuf::from("."));
    let mut s = local.into_os_string();
    s.push("Low");
    PathBuf::from(s).join("VRChat").join("VRChat")
}

pub fn vrchat_config_path() -> PathBuf {
    vrchat_appdata_dir().join("config.json")
}

pub fn read_vrchat_config() -> Option<serde_json::Value> {
    let text = fs::read_to_string(vrchat_config_path()).ok()?;
    serde_json::from_str(&text).ok()
}

pub fn vrchat_cache_dir() -> PathBuf {
    let default_path = vrchat_appdata_dir().join("Cache-WindowsPlayer");
    if let Some(config) = read_vrchat_config() {
        if let Some(cache_dir) = config.get("cache_directory").and_then(|v| v.as_str()) {
            if !cache_dir.is_empty() && PathBuf::from(cache_dir).is_dir() {
                return PathBuf::from(cache_dir).join("Cache-WindowsPlayer");
            }
        }
    }
    default_path
}

pub fn vrchat_photos_dir() -> PathBuf {
    let default_path = dirs::picture_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("VRChat");
    if let Some(config) = read_vrchat_config() {
        if let Some(photos_dir) = config.get("picture_output_folder").and_then(|v| v.as_str()) {
            if !photos_dir.is_empty() && PathBuf::from(photos_dir).is_dir() {
                return PathBuf::from(photos_dir);
            }
        }
    }
    default_path
}

pub fn ugc_photo_dir(path: &str) -> PathBuf {
    if path.is_empty() {
        return vrchat_photos_dir();
    }
    let p = PathBuf::from(path);
    if !p.is_dir() && fs::create_dir_all(&p).is_err() {
        return vrchat_photos_dir();
    }
    p
}

#[cfg(windows)]
fn steam_userdata_dir() -> PathBuf {
    use winreg::enums::HKEY_LOCAL_MACHINE;
    use winreg::RegKey;

    let fallback = PathBuf::from(r"C:\Program Files (x86)\Steam\userdata");
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    if let Ok(key) = hklm.open_subkey(r"SOFTWARE\WOW6432Node\Valve\Steam") {
        if let Ok(install_path) = key.get_value::<String, _>("InstallPath") {
            return PathBuf::from(install_path).join("userdata");
        }
    }
    fallback
}

#[cfg(not(windows))]
fn steam_userdata_dir() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join(".steam")
        .join("steam")
        .join("userdata")
}

pub fn vrchat_screenshots_dir() -> PathBuf {
    let userdata = steam_userdata_dir();
    let mut latest: Option<(std::time::SystemTime, PathBuf)> = None;
    if let Ok(entries) = fs::read_dir(&userdata) {
        for entry in entries.flatten() {
            let screenshot_dir = entry
                .path()
                .join("760")
                .join("remote")
                .join("438100")
                .join("screenshots");
            if !screenshot_dir.is_dir() {
                continue;
            }
            let modified = fs::metadata(&screenshot_dir)
                .and_then(|m| m.modified())
                .unwrap_or(std::time::SystemTime::UNIX_EPOCH);
            if latest.as_ref().map(|(t, _)| modified > *t).unwrap_or(true) {
                latest = Some((modified, screenshot_dir));
            }
        }
    }
    latest.map(|(_, p)| p).unwrap_or_default()
}

pub fn vrchat_crash_dumps_dir() -> PathBuf {
    std::env::temp_dir().join("VRChat").join("VRChat").join("Crashes")
}
