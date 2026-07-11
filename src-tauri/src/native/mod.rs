pub mod app_api;
pub mod app_api_vr;
pub mod asset_bundle;
pub mod discord;
pub mod folders;
pub mod log_watcher;
pub mod process;
pub mod registry;
pub mod sqlite;
pub mod storage;
pub mod web_api;

use serde_json::Value;

pub fn arg_str(args: &[Value], index: usize) -> String {
    match args.get(index) {
        Some(Value::String(s)) => s.clone(),
        Some(Value::Null) | None => String::new(),
        Some(other) => other.to_string(),
    }
}

pub fn arg_bool(args: &[Value], index: usize, default: bool) -> bool {
    args.get(index).and_then(|v| v.as_bool()).unwrap_or(default)
}

pub fn arg_i64(args: &[Value], index: usize, default: i64) -> i64 {
    match args.get(index) {
        Some(Value::Number(n)) => n.as_i64().unwrap_or(default),
        Some(Value::String(s)) => s.parse().unwrap_or(default),
        _ => default,
    }
}

pub fn arg_f64(args: &[Value], index: usize, default: f64) -> f64 {
    match args.get(index) {
        Some(Value::Number(n)) => n.as_f64().unwrap_or(default),
        Some(Value::String(s)) => s.parse().unwrap_or(default),
        _ => default,
    }
}

pub fn arg_map(args: &[Value], index: usize) -> Option<serde_json::Map<String, Value>> {
    match args.get(index) {
        Some(Value::Object(map)) => Some(map.clone()),
        Some(Value::String(s)) => match serde_json::from_str::<Value>(s) {
            Ok(Value::Object(map)) => Some(map),
            _ => None,
        },
        _ => None,
    }
}

#[cfg(windows)]
pub fn current_culture() -> String {
    use winreg::enums::HKEY_CURRENT_USER;
    use winreg::RegKey;

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    if let Ok(key) = hkcu.open_subkey(r"Control Panel\International") {
        if let Ok(locale) = key.get_value::<String, _>("LocaleName") {
            if !locale.is_empty() {
                return locale;
            }
        }
    }
    "en-US".to_string()
}

#[cfg(not(windows))]
pub fn current_culture() -> String {
    std::env::var("LC_ALL")
        .or_else(|_| std::env::var("LANG"))
        .ok()
        .and_then(|lang| lang.split('.').next().map(|s| s.replace('_', "-")))
        .filter(|s| !s.is_empty() && s != "C")
        .unwrap_or_else(|| "en-US".to_string())
}

pub fn current_language() -> String {
    current_culture()
        .split('-')
        .next()
        .unwrap_or("en")
        .to_string()
}
