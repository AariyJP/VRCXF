use chrono::{DateTime, Local, NaiveDateTime, SecondsFormat, TimeZone, Utc};
use parking_lot::Mutex;
use regex::Regex;
use serde_json::Value;
use std::collections::HashMap;
use std::fs::File;
use std::io::{BufRead, BufReader, Seek, SeekFrom};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};

pub struct LogWatcher {
    offsets: Mutex<HashMap<PathBuf, u64>>,
    queue: Mutex<Vec<Vec<Value>>>,
    line_queue: Mutex<Vec<String>>,
    date_till: Mutex<Option<DateTime<Utc>>>,
    pending_world_name: Mutex<String>,
    active: AtomicBool,
    first_run: AtomicBool,
    current_file: Mutex<String>,
    pub vrc_closed_gracefully: AtomicBool,
}

impl Default for LogWatcher {
    fn default() -> Self {
        Self::new()
    }
}

impl LogWatcher {
    pub fn new() -> Self {
        Self {
            offsets: Mutex::new(HashMap::new()),
            queue: Mutex::new(Vec::new()),
            line_queue: Mutex::new(Vec::new()),
            date_till: Mutex::new(None),
            pending_world_name: Mutex::new(String::new()),
            active: AtomicBool::new(false),
            first_run: AtomicBool::new(true),
            current_file: Mutex::new(String::new()),
            vrc_closed_gracefully: AtomicBool::new(false),
        }
    }

    pub fn set_date_till(&self, date: &str) {
        let parsed = DateTime::parse_from_rfc3339(date)
            .map(|dt| dt.with_timezone(&Utc))
            .ok()
            .or_else(|| {
                NaiveDateTime::parse_from_str(date, "%Y-%m-%d %H:%M:%S")
                    .ok()
                    .and_then(|naive| Local.from_local_datetime(&naive).single())
                    .map(|dt| dt.with_timezone(&Utc))
            });
        *self.date_till.lock() = parsed;
        self.active.store(true, Ordering::SeqCst);
        self.first_run.store(true, Ordering::SeqCst);
    }

    pub fn reset(&self) {
        self.offsets.lock().clear();
        self.queue.lock().clear();
        self.line_queue.lock().clear();
        self.pending_world_name.lock().clear();
        self.first_run.store(true, Ordering::SeqCst);
    }

    pub fn get(&self) -> Vec<Vec<Value>> {
        if self.active.load(Ordering::SeqCst) {
            self.update();
        }
        let mut queue = self.queue.lock();
        if queue.len() > 1000 {
            queue.drain(..1000).collect()
        } else {
            std::mem::take(&mut *queue)
        }
    }

    pub fn get_log_lines(&self) -> Vec<String> {
        if self.active.load(Ordering::SeqCst) {
            self.update();
        }
        std::mem::take(&mut *self.line_queue.lock())
    }

    fn update(&self) {
        let dir = crate::paths::vrchat_appdata_dir();
        let Ok(entries) = std::fs::read_dir(&dir) else {
            return;
        };
        let mut files: Vec<PathBuf> = entries
            .flatten()
            .map(|e| e.path())
            .filter(|p| {
                p.file_name()
                    .and_then(|n| n.to_str())
                    .map(|n| n.starts_with("output_log") && n.ends_with(".txt"))
                    .unwrap_or(false)
            })
            .collect();
        files.sort();
        for file in files {
            self.read_file(&file);
        }
        self.first_run.store(false, Ordering::SeqCst);
    }

    fn read_file(&self, path: &Path) {
        let file_name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();
        *self.current_file.lock() = file_name;

        let start_offset = *self.offsets.lock().get(path).unwrap_or(&0);
        let Ok(file) = File::open(path) else {
            return;
        };
        let file_len = file.metadata().map(|m| m.len()).unwrap_or(0);
        if file_len <= start_offset {
            if file_len < start_offset {
                self.offsets.lock().insert(path.to_path_buf(), 0);
            }
            return;
        }
        let mut reader = BufReader::new(file);
        if reader.seek(SeekFrom::Start(start_offset)).is_err() {
            return;
        }
        let mut consumed = start_offset;
        let mut line = String::new();
        loop {
            line.clear();
            let read = match reader.read_line(&mut line) {
                Ok(0) => break,
                Ok(n) => n,
                Err(_) => break,
            };
            if !line.ends_with('\n') {
                break;
            }
            consumed += read as u64;
            self.parse_line(line.trim_end());
        }
        self.offsets.lock().insert(path.to_path_buf(), consumed);
    }

    fn parse_datetime(&self, line: &str) -> Option<String> {
        if line.len() < 20 {
            return None;
        }
        let naive = NaiveDateTime::parse_from_str(&line[..19], "%Y.%m.%d %H:%M:%S").ok()?;
        let local = Local.from_local_datetime(&naive).single()?;
        let utc = local.with_timezone(&Utc);
        if let Some(till) = *self.date_till.lock() {
            if utc <= till {
                return None;
            }
        }
        Some(utc.to_rfc3339_opts(SecondsFormat::Secs, true))
    }

    fn push(&self, dt: String, event_type: &str, args: Vec<String>) {
        let file_name = self.current_file.lock().clone();
        let mut entry: Vec<Value> = vec![
            Value::String(file_name),
            Value::String(dt),
            Value::String(event_type.to_string()),
        ];
        for arg in args {
            entry.push(Value::String(arg));
        }
        if !self.first_run.load(Ordering::SeqCst) {
            if let Ok(json) = serde_json::to_string(&entry) {
                self.line_queue.lock().push(json);
            }
        }
        self.queue.lock().push(entry);
    }

    fn parse_line(&self, line: &str) {
        static PLAYER_RE: std::sync::OnceLock<Regex> = std::sync::OnceLock::new();
        let player_re = PLAYER_RE.get_or_init(|| {
            Regex::new(r"^(.*?)(?:\s+\((usr_[0-9A-Fa-f\-]{36})\))?$").unwrap()
        });

        if line.contains("VRCApplication: HandleApplicationQuit") {
            self.vrc_closed_gracefully.store(true, Ordering::SeqCst);
            if let Some(dt) = self.parse_datetime(line) {
                self.push(dt, "vrc-quit", vec![]);
            }
            return;
        }

        let Some(index) = line.find("[Behaviour] ").or_else(|| {
            line.find("[Video Playback] ")
                .or_else(|| line.find("[VRC Camera] "))
        }) else {
            return;
        };
        let content = &line[index..];

        if let Some(rest) = content.strip_prefix("[Behaviour] Joining or Creating Room: ") {
            *self.pending_world_name.lock() = rest.to_string();
            return;
        }

        if let Some(rest) = content.strip_prefix("[Behaviour] Joining wrld_") {
            self.vrc_closed_gracefully.store(false, Ordering::SeqCst);
            let location = format!("wrld_{}", rest.trim());
            let world_name = std::mem::take(&mut *self.pending_world_name.lock());
            if let Some(dt) = self.parse_datetime(line) {
                self.push(dt, "location", vec![location, world_name]);
            }
            return;
        }

        if let Some(rest) = content.strip_prefix("[Behaviour] OnPlayerJoined ") {
            if let Some(dt) = self.parse_datetime(line) {
                if let Some(caps) = player_re.captures(rest.trim()) {
                    let name = caps.get(1).map(|m| m.as_str()).unwrap_or("").to_string();
                    let user_id = caps.get(2).map(|m| m.as_str()).unwrap_or("").to_string();
                    self.push(dt, "player-joined", vec![name, user_id]);
                }
            }
            return;
        }

        if let Some(rest) = content.strip_prefix("[Behaviour] OnPlayerLeft ") {
            if let Some(dt) = self.parse_datetime(line) {
                if let Some(caps) = player_re.captures(rest.trim()) {
                    let name = caps.get(1).map(|m| m.as_str()).unwrap_or("").to_string();
                    let user_id = caps.get(2).map(|m| m.as_str()).unwrap_or("").to_string();
                    self.push(dt, "player-left", vec![name, user_id]);
                }
            }
            return;
        }

        if let Some(rest) = content.strip_prefix("[Video Playback] Attempting to resolve URL '") {
            if let Some(url) = rest.strip_suffix('\'') {
                if let Some(dt) = self.parse_datetime(line) {
                    self.push(dt, "video-play", vec![url.to_string(), String::new()]);
                }
            }
            return;
        }

        if let Some(rest) = content.strip_prefix("[VRC Camera] Took screenshot to: ") {
            if let Some(dt) = self.parse_datetime(line) {
                self.push(dt, "screenshot", vec![rest.trim().to_string()]);
            }
        }
    }
}
