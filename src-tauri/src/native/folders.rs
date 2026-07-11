use std::path::Path;
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

pub fn open_folder(path: &Path) -> bool {
    if !path.is_dir() {
        return false;
    }
    open::that(path).is_ok()
}

pub fn open_folder_and_select_item(path: &str, _is_folder: bool) {
    let path_buf = std::path::PathBuf::from(path);
    #[cfg(windows)]
    {
        if path_buf.exists() {
            let _ = std::process::Command::new("explorer")
                .arg(format!("/select,{}", path_buf.display()))
                .spawn();
            return;
        }
    }
    let target = if path_buf.is_dir() {
        path_buf
    } else {
        path_buf.parent().map(|p| p.to_path_buf()).unwrap_or(path_buf)
    };
    let _ = open::that(target);
}

pub fn open_folder_selector_dialog(app: &AppHandle, default_path: &str) -> String {
    let mut dialog = app.dialog().file();
    if !default_path.is_empty() && Path::new(default_path).is_dir() {
        dialog = dialog.set_directory(default_path);
    }
    match dialog.blocking_pick_folder() {
        Some(path) => path.to_string(),
        None => default_path.to_string(),
    }
}

pub fn open_file_selector_dialog(
    app: &AppHandle,
    default_path: &str,
    default_ext: &str,
    _default_filter: &str,
) -> String {
    let mut dialog = app.dialog().file();
    if !default_path.is_empty() && Path::new(default_path).is_dir() {
        dialog = dialog.set_directory(default_path);
    }
    if !default_ext.is_empty() {
        let ext = default_ext.trim_start_matches("*.").trim_start_matches('.');
        if !ext.is_empty() && ext != "*" {
            dialog = dialog.add_filter(ext.to_string(), &[ext]);
        }
    }
    match dialog.blocking_pick_file() {
        Some(path) => path.to_string(),
        None => String::new(),
    }
}
