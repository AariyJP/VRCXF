mod commands;
mod native;
mod paths;
mod state;

use tauri::tray::TrayIconBuilder;

pub fn run() {
    let app_state = state::AppState::new().expect("failed to initialize app state");

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .manage(app_state)
        .setup(|app| {
            if let Some(icon) = app.default_window_icon().cloned() {
                let _ = TrayIconBuilder::with_id("main")
                    .icon(icon)
                    .tooltip("VRCXF")
                    .build(app);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::dispatch::call_native,
            commands::dispatch::ping
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
