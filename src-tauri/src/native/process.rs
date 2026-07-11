use sysinfo::{ProcessesToUpdate, System};

fn process_running(names: &[&str]) -> bool {
    let mut sys = System::new();
    sys.refresh_processes(ProcessesToUpdate::All, true);
    sys.processes().values().any(|p| {
        let name = p.name().to_string_lossy().to_lowercase();
        names.iter().any(|n| name == *n)
    })
}

pub fn is_game_running() -> bool {
    process_running(&["vrchat.exe", "vrchat"])
}

pub fn is_steamvr_running() -> bool {
    process_running(&["vrserver.exe", "vrserver"])
}

pub fn quit_game() -> i64 {
    let mut sys = System::new();
    sys.refresh_processes(ProcessesToUpdate::All, true);
    let mut killed = 0;
    for process in sys.processes().values() {
        let name = process.name().to_string_lossy().to_lowercase();
        if name == "vrchat.exe" || name == "vrchat" {
            if process.kill() {
                killed += 1;
            }
        }
    }
    killed
}

pub fn start_game(arguments: &str) -> bool {
    let encoded = urlencoding_encode(arguments);
    let uri = if arguments.is_empty() {
        "steam://run/438100".to_string()
    } else {
        format!("steam://run/438100//{}/", encoded)
    };
    open::that(uri).is_ok()
}

pub fn start_game_from_path(path: &str, arguments: &str) -> bool {
    let path_buf = std::path::PathBuf::from(path);
    if !path_buf.is_file() {
        return false;
    }
    let mut command = std::process::Command::new(&path_buf);
    if let Some(parent) = path_buf.parent() {
        command.current_dir(parent);
    }
    if !arguments.is_empty() {
        for arg in split_arguments(arguments) {
            command.arg(arg);
        }
    }
    command.spawn().is_ok()
}

fn split_arguments(arguments: &str) -> Vec<String> {
    let mut result = Vec::new();
    let mut current = String::new();
    let mut in_quotes = false;
    for c in arguments.chars() {
        match c {
            '"' => in_quotes = !in_quotes,
            ' ' if !in_quotes => {
                if !current.is_empty() {
                    result.push(std::mem::take(&mut current));
                }
            }
            _ => current.push(c),
        }
    }
    if !current.is_empty() {
        result.push(current);
    }
    result
}

fn urlencoding_encode(input: &str) -> String {
    let mut result = String::new();
    for byte in input.bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                result.push(byte as char)
            }
            _ => result.push_str(&format!("%{:02X}", byte)),
        }
    }
    result
}
