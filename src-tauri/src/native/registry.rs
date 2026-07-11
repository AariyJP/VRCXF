use serde_json::{Map, Number, Value};

#[cfg(windows)]
mod win {
    use super::*;
    use winreg::enums::{HKEY_CURRENT_USER, KEY_ALL_ACCESS, KEY_READ, REG_BINARY, REG_DWORD, REG_QWORD};
    use winreg::{RegKey, RegValue};

    const VRC_KEY: &str = r"SOFTWARE\VRChat\VRChat";

    fn add_hash_to_key_name(key: &str) -> String {
        let mut hash: u32 = 5381;
        for c in key.chars() {
            hash = hash.wrapping_mul(33) ^ (c as u32);
        }
        format!("{}_h{}", key, hash)
    }

    fn open_vrc_key(writable: bool) -> Option<RegKey> {
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let access = if writable { KEY_ALL_ACCESS } else { KEY_READ };
        hkcu.open_subkey_with_flags(VRC_KEY, access).ok()
    }

    fn reg_value_to_json(value: &RegValue) -> Option<(Value, u32)> {
        match value.vtype {
            REG_BINARY => {
                let text = String::from_utf8_lossy(&value.bytes).to_string();
                Some((Value::String(text), 3))
            }
            REG_DWORD => {
                if value.bytes.len() >= 4 {
                    let n = u32::from_le_bytes([
                        value.bytes[0],
                        value.bytes[1],
                        value.bytes[2],
                        value.bytes[3],
                    ]);
                    Some((Value::Number(Number::from(n)), 4))
                } else {
                    None
                }
            }
            REG_QWORD => {
                if value.bytes.len() >= 8 {
                    let mut arr = [0u8; 8];
                    arr.copy_from_slice(&value.bytes[..8]);
                    let bits = u64::from_le_bytes(arr);
                    let float = f64::from_bits(bits);
                    Number::from_f64(float).map(|n| (Value::Number(n), 100))
                } else {
                    None
                }
            }
            _ => None,
        }
    }

    pub fn get_key(key: &str) -> Value {
        let key_name = add_hash_to_key_name(key);
        let Some(reg) = open_vrc_key(false) else {
            return Value::Null;
        };
        match reg.get_raw_value(&key_name) {
            Ok(raw) => reg_value_to_json(&raw).map(|(v, _)| v).unwrap_or(Value::Null),
            Err(_) => Value::Null,
        }
    }

    pub fn set_key(key: &str, value: &Value, type_int: i64) -> bool {
        let key_name = add_hash_to_key_name(key);
        let Some(reg) = open_vrc_key(true) else {
            return false;
        };
        match type_int {
            3 => {
                let text = match value {
                    Value::String(s) => s.clone(),
                    other => other.to_string(),
                };
                let raw = RegValue {
                    bytes: text.into_bytes(),
                    vtype: REG_BINARY,
                };
                reg.set_raw_value(&key_name, &raw).is_ok()
            }
            4 => {
                let n = value.as_i64().unwrap_or(0) as u32;
                reg.set_value(&key_name, &n).is_ok()
            }
            _ => false,
        }
    }

    fn set_key_double(key: &str, value: f64) -> bool {
        let key_name = add_hash_to_key_name(key);
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let Ok((reg, _)) = hkcu.create_subkey(VRC_KEY) else {
            return false;
        };
        let raw = RegValue {
            bytes: value.to_bits().to_le_bytes().to_vec(),
            vtype: REG_QWORD,
        };
        reg.set_raw_value(&key_name, &raw).is_ok()
    }

    pub fn get_all() -> Result<Value, String> {
        let Some(reg) = open_vrc_key(false) else {
            return Err("Failed to get VRC registry data".to_string());
        };
        let mut output = Map::new();
        for item in reg.enum_values() {
            let Ok((name, raw)) = item else { continue };
            let Some(index) = name.rfind("_h") else { continue };
            if index == 0 {
                continue;
            }
            let key_name = &name[..index];
            if let Some((data, type_id)) = reg_value_to_json(&raw) {
                let mut entry = Map::new();
                entry.insert("data".to_string(), data);
                entry.insert("type".to_string(), Value::Number(Number::from(type_id)));
                output.insert(key_name.to_string(), Value::Object(entry));
            }
        }
        Ok(Value::Object(output))
    }

    pub fn set_all(json: &str) -> Result<(), String> {
        create_folder()?;
        let parsed: Value = serde_json::from_str(json).map_err(|e| e.to_string())?;
        let Value::Object(dict) = parsed else {
            return Err("expected object".to_string());
        };
        for (key, entry) in dict {
            let Some(data) = entry.get("data") else { continue };
            let type_int = entry
                .get("type")
                .and_then(|v| v.as_i64())
                .ok_or_else(|| format!("Unknown type for key: {}", key))?;
            if data.is_number() {
                if type_int == 100 {
                    set_key_double(&key, data.as_f64().unwrap_or(0.0));
                    continue;
                }
                set_key(&key, data, type_int);
                continue;
            }
            set_key(&key, data, type_int);
        }
        Ok(())
    }

    pub fn has_folder() -> bool {
        open_vrc_key(false).is_some()
    }

    pub fn create_folder() -> Result<(), String> {
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        hkcu.create_subkey(VRC_KEY)
            .map(|_| ())
            .map_err(|e| e.to_string())
    }

    pub fn delete_folder() {
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let _ = hkcu.delete_subkey_all(VRC_KEY);
    }
}

#[cfg(windows)]
pub use win::{delete_folder, get_all, get_key, has_folder, set_all, set_key};

#[cfg(not(windows))]
pub fn get_key(_key: &str) -> Value {
    Value::Null
}

#[cfg(not(windows))]
pub fn set_key(_key: &str, _value: &Value, _type_int: i64) -> bool {
    false
}

#[cfg(not(windows))]
pub fn get_all() -> Result<Value, String> {
    Ok(Value::Object(Map::new()))
}

#[cfg(not(windows))]
pub fn set_all(_json: &str) -> Result<(), String> {
    Ok(())
}

#[cfg(not(windows))]
pub fn has_folder() -> bool {
    false
}

#[cfg(not(windows))]
pub fn delete_folder() {}

pub fn read_vrc_reg_json_file(filepath: &str) -> String {
    std::fs::read_to_string(filepath).unwrap_or_default()
}
