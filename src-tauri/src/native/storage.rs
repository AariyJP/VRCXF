use parking_lot::RwLock;
use serde_json::Value;
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

pub struct Storage {
    path: PathBuf,
    map: RwLock<HashMap<String, String>>,
}

impl Storage {
    pub fn new(path: PathBuf) -> Self {
        let storage = Self {
            path,
            map: RwLock::new(HashMap::new()),
        };
        storage.load();
        storage
    }

    pub fn load(&self) {
        let mut map = self.map.write();
        map.clear();
        if let Ok(text) = fs::read_to_string(&self.path) {
            if let Ok(parsed) = serde_json::from_str::<HashMap<String, String>>(&text) {
                *map = parsed;
            }
        }
    }

    pub fn save(&self) {
        let map = self.map.read();
        if let Ok(json) = serde_json::to_string_pretty(&*map) {
            let _ = fs::write(&self.path, json);
        }
    }

    pub fn get(&self, key: &str) -> String {
        self.map.read().get(key).cloned().unwrap_or_default()
    }

    pub fn set(&self, key: &str, value: &str) {
        self.map.write().insert(key.to_string(), value.to_string());
        self.save();
    }

    pub fn remove(&self, key: &str) -> bool {
        let removed = self.map.write().remove(key).is_some();
        if removed {
            self.save();
        }
        removed
    }

    pub fn get_all(&self) -> String {
        serde_json::to_string(&*self.map.read()).unwrap_or_else(|_| "{}".to_string())
    }

    pub fn clear(&self) {
        self.map.write().clear();
        self.save();
    }

    pub fn get_array(&self, key: &str) -> Value {
        let raw = self.get(key);
        serde_json::from_str::<Value>(&raw)
            .ok()
            .filter(|v| v.is_array())
            .unwrap_or_else(|| Value::Array(vec![]))
    }

    pub fn set_array(&self, key: &str, value: &Value) {
        self.set(key, &serde_json::to_string(value).unwrap_or_else(|_| "[]".to_string()));
    }

    pub fn get_object(&self, key: &str) -> Value {
        let raw = self.get(key);
        serde_json::from_str::<Value>(&raw)
            .ok()
            .filter(|v| v.is_object())
            .unwrap_or_else(|| Value::Object(serde_json::Map::new()))
    }

    pub fn set_object(&self, key: &str, value: &Value) {
        self.set(key, &serde_json::to_string(value).unwrap_or_else(|_| "{}".to_string()));
    }
}
