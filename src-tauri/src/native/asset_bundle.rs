use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::fs;
use std::path::PathBuf;
use walkdir::WalkDir;

fn get_asset_id(id: &str, variant: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(format!("{}{}", id, variant).as_bytes());
    let hash = hasher.finalize();
    let hex: String = hash.iter().map(|b| format!("{:02X}", b)).collect();
    hex[..16].to_string()
}

fn get_asset_version(version: i32, variant_version: i32) -> String {
    let mut hex = String::new();
    for b in variant_version.to_le_bytes() {
        hex.push_str(&format!("{:02X}", b));
    }
    for b in version.to_le_bytes() {
        hex.push_str(&format!("{:02X}", b));
    }
    format!("{:0>32}", hex).to_lowercase()
}

fn reverse_hex_to_decimal(hex: &str) -> (i32, i32) {
    if hex.len() != 32 {
        return (0, 0);
    }
    let parse_le = |s: &str| -> Option<i32> {
        let mut bytes = [0u8; 4];
        for i in 0..4 {
            bytes[i] = u8::from_str_radix(&s[i * 2..i * 2 + 2], 16).ok()?;
        }
        Some(i32::from_le_bytes(bytes))
    };
    let variant_version = parse_le(&hex[0..8]).unwrap_or(0);
    let version = parse_le(&hex[24..32]).unwrap_or(0);
    (version, variant_version)
}

pub fn get_cache_full_location(
    id: &str,
    version: i32,
    variant: &str,
    variant_version: i32,
) -> PathBuf {
    let cache_path = crate::paths::vrchat_cache_dir();
    let id_hash = get_asset_id(id, variant);
    let top_dir = cache_path.join(&id_hash);
    let version_location = get_asset_version(version, variant_version);
    if !top_dir.is_dir() {
        return top_dir.join(version_location);
    }
    let suffix = &version_location[16..];
    let mut candidates: Vec<PathBuf> = Vec::new();
    if let Ok(entries) = fs::read_dir(&top_dir) {
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().to_string();
            if name.len() == 32 && name.ends_with(suffix) {
                candidates.push(entry.path());
            }
        }
    }
    if !candidates.is_empty() {
        candidates.sort_by_key(|dir| {
            let name = dir
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_default();
            std::cmp::Reverse(reverse_hex_to_decimal(&name).1)
        });
        return candidates.into_iter().next().unwrap();
    }
    top_dir.join(version_location)
}

pub fn check_cache(id: &str, version: i32, variant: &str, variant_version: i32) -> Value {
    let mut file_size: i64 = -1;
    let mut is_locked = false;
    let mut full_location = get_cache_full_location(id, version, "", 0);
    if !full_location.is_dir() {
        full_location = get_cache_full_location(id, version, variant, variant_version);
    }
    let file_location = full_location.join("__data");
    let mut cache_path = String::new();
    if file_location.is_file() {
        cache_path = full_location.to_string_lossy().to_string();
        file_size = fs::metadata(&file_location).map(|m| m.len() as i64).unwrap_or(-1);
    }
    if full_location.join("__lock").is_file() {
        is_locked = true;
    }
    json!({ "Item1": file_size, "Item2": is_locked, "Item3": cache_path })
}

pub fn delete_cache(id: &str, version: i32, variant: &str, variant_version: i32) {
    let path = get_cache_full_location(id, version, "", 0);
    if path.is_dir() {
        let _ = fs::remove_dir_all(&path);
    }
    let path = get_cache_full_location(id, version, variant, variant_version);
    if path.is_dir() {
        let _ = fs::remove_dir_all(&path);
    }
}

pub fn delete_all_cache() {
    let cache_path = crate::paths::vrchat_cache_dir();
    if cache_path.is_dir() {
        let _ = fs::remove_dir_all(&cache_path);
        let _ = fs::create_dir_all(&cache_path);
    }
}

pub fn sweep_cache() -> Vec<String> {
    let mut output = Vec::new();
    let cache_path = crate::paths::vrchat_cache_dir();
    let Ok(entries) = fs::read_dir(&cache_path) else {
        return output;
    };
    for entry in entries.flatten() {
        let cache_dir = entry.path();
        if !cache_dir.is_dir() {
            continue;
        }
        let mut version_dirs: Vec<PathBuf> = fs::read_dir(&cache_dir)
            .map(|e| {
                e.flatten()
                    .map(|d| d.path())
                    .filter(|p| p.is_dir())
                    .collect()
            })
            .unwrap_or_default();
        version_dirs.sort_by_key(|dir| {
            fs::metadata(dir)
                .and_then(|m| m.modified())
                .unwrap_or(std::time::SystemTime::UNIX_EPOCH)
        });
        let count = version_dirs.len();
        for (index, version_dir) in version_dirs.iter().enumerate() {
            let is_empty = fs::read_dir(version_dir)
                .map(|mut e| e.next().is_none())
                .unwrap_or(false);
            if is_empty {
                let _ = fs::remove_dir(version_dir);
                continue;
            }
            if index == count - 1 {
                continue;
            }
            if version_dir.join("__lock").is_file() {
                continue;
            }
            if fs::remove_dir_all(version_dir).is_ok() {
                let cache_name = cache_dir
                    .file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_default();
                let version_name = version_dir
                    .file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_default();
                output.push(format!("{}\\{}", cache_name, version_name));
            }
        }
        let is_empty = fs::read_dir(&cache_dir)
            .map(|mut e| e.next().is_none())
            .unwrap_or(false);
        if is_empty {
            let _ = fs::remove_dir(&cache_dir);
        }
    }
    output
}

pub fn get_cache_size() -> i64 {
    let cache_path = crate::paths::vrchat_cache_dir();
    if !cache_path.is_dir() {
        return 0;
    }
    WalkDir::new(&cache_path)
        .into_iter()
        .flatten()
        .filter(|e| e.file_type().is_file())
        .filter_map(|e| e.metadata().ok())
        .map(|m| m.len() as i64)
        .sum()
}
