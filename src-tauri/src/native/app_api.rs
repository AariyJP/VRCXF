use crate::native::{
    arg_bool, arg_f64, arg_i64, arg_str, current_culture, current_language, folders, process,
    registry,
};
use crate::paths;
use crate::state::AppState;
use base64::Engine;
use md5::{Digest, Md5};
use serde_json::{json, Map, Value};
use std::fs;
use std::path::PathBuf;
use std::sync::atomic::Ordering;
use tauri::{AppHandle, Manager, UserAttentionType, WebviewWindow};
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_notification::NotificationExt;

const B64: base64::engine::GeneralPurpose = base64::engine::general_purpose::STANDARD;

fn main_window(app: &AppHandle) -> Option<WebviewWindow> {
    app.get_webview_window("main")
}

async fn download_to_file(state: &AppState, url: &str, dest: PathBuf) -> Result<String, String> {
    if let Some(parent) = dest.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let client = state.web.client();
    let response = client.get(url).send().await.map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Err(format!("download failed: {}", response.status()));
    }
    let bytes = response.bytes().await.map_err(|e| e.to_string())?;
    fs::write(&dest, &bytes).map_err(|e| e.to_string())?;
    Ok(dest.to_string_lossy().to_string())
}

fn colour_from_user_id(user_id: &str) -> i64 {
    let mut hasher = Md5::new();
    hasher.update(user_id.as_bytes());
    let hash = hasher.finalize();
    ((hash[3] as i64) << 8) | (hash[4] as i64)
}

fn read_text_or_empty(path: PathBuf) -> String {
    fs::read_to_string(path).unwrap_or_default()
}

#[cfg(windows)]
fn set_startup(enabled: bool) -> Result<(), String> {
    use winreg::enums::HKEY_CURRENT_USER;
    use winreg::RegKey;

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let (key, _) = hkcu
        .create_subkey(r"Software\Microsoft\Windows\CurrentVersion\Run")
        .map_err(|e| e.to_string())?;
    if enabled {
        let exe = std::env::current_exe().map_err(|e| e.to_string())?;
        key.set_value("VRCX", &format!("\"{}\"", exe.display()))
            .map_err(|e| e.to_string())?;
    } else {
        let _ = key.delete_value("VRCX");
    }
    Ok(())
}

#[cfg(not(windows))]
fn set_startup(_enabled: bool) -> Result<(), String> {
    Ok(())
}

pub async fn call(
    app: &AppHandle,
    state: &AppState,
    method: &str,
    args: &[Value],
) -> Result<Value, String> {
    let result = match method {
        "ShowDevTools" => {
            if let Some(window) = main_window(app) {
                window.open_devtools();
            }
            Value::Null
        }
        "SetVR" | "ExecuteVrOverlayFunction" => Value::Null,
        "SetZoom" => {
            let level = arg_f64(args, 0, 0.0);
            *state.zoom.lock() = level;
            if let Some(window) = main_window(app) {
                let _ = window.set_zoom(1.2f64.powf(level));
            }
            Value::Null
        }
        "GetZoom" => json!(*state.zoom.lock()),
        "DesktopNotification" => {
            let bold_text = arg_str(args, 0);
            let text = arg_str(args, 1);
            let _ = app
                .notification()
                .builder()
                .title(&bold_text)
                .body(&text)
                .show();
            Value::Null
        }
        "RestartApplication" => {
            app.restart();
        }
        "CheckForUpdateExe" => json!(false),
        "FocusWindow" => {
            if let Some(window) = main_window(app) {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
            Value::Null
        }
        "ChangeTheme" | "DoFunny" => Value::Null,
        "GetClipboard" => {
            let text = app.clipboard().read_text().unwrap_or_default();
            json!(text)
        }
        "SetStartup" => {
            set_startup(arg_bool(args, 0, false))?;
            Value::Null
        }
        "CopyImageToClipboard" => Value::Null,
        "FlashWindow" => {
            if let Some(window) = main_window(app) {
                let _ = window.request_user_attention(Some(UserAttentionType::Informational));
            }
            Value::Null
        }
        "SetUserAgent" => {
            let ua = arg_str(args, 0);
            if !ua.is_empty() {
                state.web.set_user_agent(&ua);
            }
            Value::Null
        }
        "SetTrayIconNotification" => Value::Null,
        "OpenCalendarFile" => {
            let ics = arg_str(args, 0);
            let path = std::env::temp_dir().join(format!("vrcx_{}.ics", uuid::Uuid::new_v4()));
            fs::write(&path, ics).map_err(|e| e.to_string())?;
            let _ = open::that(path);
            Value::Null
        }
        "GetColourFromUserID" => json!(colour_from_user_id(&arg_str(args, 0))),
        "GetColourBulk" => {
            let mut output = Map::new();
            if let Some(Value::Array(user_ids)) = args.first() {
                for user_id in user_ids {
                    if let Some(id) = user_id.as_str() {
                        output.insert(id.to_string(), json!(colour_from_user_id(id)));
                    }
                }
            }
            Value::Object(output)
        }
        "OpenLink" => {
            let url = arg_str(args, 0);
            if url.starts_with("http://") || url.starts_with("https://") {
                let _ = open::that(url);
            }
            Value::Null
        }
        "OpenDiscordProfile" => {
            let discord_id = arg_str(args, 0);
            if !discord_id.is_empty() {
                let _ = open::that(format!("discord://-/users/{}", discord_id));
            }
            Value::Null
        }
        "GetLaunchCommand" => json!(""),
        "IPCAnnounceStart" | "SendIpc" => Value::Null,
        "CustomCss" => json!(read_text_or_empty(paths::app_data_dir().join("custom.css"))),
        "CustomScript" => json!(read_text_or_empty(paths::app_data_dir().join("custom.js"))),
        "CurrentCulture" => json!(current_culture()),
        "CurrentLanguage" => json!(current_language()),
        "GetVersion" => json!(crate::state::version_string()),
        "VrcClosedGracefully" => {
            json!(state.log_watcher.vrc_closed_gracefully.load(Ordering::SeqCst))
        }
        "SetAppLauncherSettings" => {
            *state.launcher_settings.lock() = (
                arg_bool(args, 0, false),
                arg_bool(args, 1, false),
                arg_bool(args, 2, false),
            );
            Value::Null
        }
        "GetFileBase64" => {
            let path = arg_str(args, 0);
            match fs::read(&path) {
                Ok(bytes) => json!(B64.encode(bytes)),
                Err(_) => Value::Null,
            }
        }
        "TryOpenInstanceInVrc" => {
            let launch_url = arg_str(args, 0);
            json!(open::that(launch_url).is_ok())
        }
        "MD5File" => {
            let blob = arg_str(args, 0);
            let bytes = B64.decode(blob).map_err(|e| e.to_string())?;
            let mut hasher = Md5::new();
            hasher.update(&bytes);
            json!(B64.encode(hasher.finalize()))
        }
        "SignFile" => json!(""),
        "FileLength" => {
            let blob = arg_str(args, 0);
            let bytes = B64.decode(blob).map_err(|e| e.to_string())?;
            json!(bytes.len().to_string())
        }
        "GetVRChatAppDataLocation" => {
            json!(paths::vrchat_appdata_dir().to_string_lossy().to_string())
        }
        "GetVRChatPhotosLocation" => {
            json!(paths::vrchat_photos_dir().to_string_lossy().to_string())
        }
        "GetUGCPhotoLocation" => {
            json!(paths::ugc_photo_dir(&arg_str(args, 0)).to_string_lossy().to_string())
        }
        "GetVRChatScreenshotsLocation" => {
            json!(paths::vrchat_screenshots_dir().to_string_lossy().to_string())
        }
        "GetVRChatCacheLocation" => {
            json!(paths::vrchat_cache_dir().to_string_lossy().to_string())
        }
        "OpenVrcxAppDataFolder" => json!(folders::open_folder(&paths::app_data_dir())),
        "OpenVrcAppDataFolder" => json!(folders::open_folder(&paths::vrchat_appdata_dir())),
        "OpenVrcPhotosFolder" => json!(folders::open_folder(&paths::vrchat_photos_dir())),
        "OpenUGCPhotosFolder" => {
            json!(folders::open_folder(&paths::ugc_photo_dir(&arg_str(args, 0))))
        }
        "OpenVrcScreenshotsFolder" => {
            json!(folders::open_folder(&paths::vrchat_screenshots_dir()))
        }
        "OpenCrashVrcCrashDumps" => json!(folders::open_folder(&paths::vrchat_crash_dumps_dir())),
        "OpenShortcutFolder" => {
            let path = paths::app_data_dir().join("startup");
            let _ = fs::create_dir_all(&path);
            folders::open_folder(&path);
            Value::Null
        }
        "OpenFolderAndSelectItem" => {
            folders::open_folder_and_select_item(&arg_str(args, 0), arg_bool(args, 1, false));
            Value::Null
        }
        "OpenFolderSelectorDialog" => {
            let default_path = arg_str(args, 0);
            let app = app.clone();
            let result = tauri::async_runtime::spawn_blocking(move || {
                folders::open_folder_selector_dialog(&app, &default_path)
            })
            .await
            .map_err(|e| e.to_string())?;
            json!(result)
        }
        "OpenFileSelectorDialog" => {
            let default_path = arg_str(args, 0);
            let default_ext = arg_str(args, 1);
            let default_filter = arg_str(args, 2);
            let app = app.clone();
            let result = tauri::async_runtime::spawn_blocking(move || {
                folders::open_file_selector_dialog(
                    &app,
                    &default_path,
                    &default_ext,
                    &default_filter,
                )
            })
            .await
            .map_err(|e| e.to_string())?;
            json!(result)
        }
        "OnProcessStateChanged" | "CheckGameRunning" => Value::Null,
        "IsGameRunning" => json!(process::is_game_running()),
        "IsSteamVRRunning" => json!(process::is_steamvr_running()),
        "QuitGame" => json!(process::quit_game()),
        "StartGame" => json!(process::start_game(&arg_str(args, 0))),
        "StartGameFromPath" => {
            json!(process::start_game_from_path(&arg_str(args, 0), &arg_str(args, 1)))
        }
        "GetVRChatRegistryKey" => registry::get_key(&arg_str(args, 0)),
        "GetVRChatRegistryKeyString" => {
            let value = registry::get_key(&arg_str(args, 0));
            match value {
                Value::Null => Value::Null,
                Value::String(s) => json!(s),
                other => json!(other.to_string()),
            }
        }
        "SetVRChatRegistryKey" => {
            let key = arg_str(args, 0);
            let value = args.get(1).cloned().unwrap_or(Value::Null);
            let type_int = arg_i64(args, 2, 3);
            json!(registry::set_key(&key, &value, type_int))
        }
        "GetVRChatRegistry" => registry::get_all()?,
        "GetVRChatRegistryJson" => {
            let all = registry::get_all()?;
            json!(all.to_string())
        }
        "SetVRChatRegistry" => {
            registry::set_all(&arg_str(args, 0))?;
            Value::Null
        }
        "HasVRChatRegistryFolder" => json!(registry::has_folder()),
        "DeleteVRChatRegistryFolder" => {
            registry::delete_folder();
            Value::Null
        }
        "ReadVrcRegJsonFile" => json!(registry::read_vrc_reg_json_file(&arg_str(args, 0))),
        "PopulateImageHosts" => Value::Null,
        "GetImage" => {
            let url = arg_str(args, 0);
            let file_id = arg_str(args, 1);
            let version = arg_str(args, 2);
            let dest = paths::app_data_dir()
                .join("ImageCache")
                .join(format!("{}.{}.png", file_id, version));
            if dest.is_file() {
                json!(dest.to_string_lossy().to_string())
            } else {
                json!(download_to_file(state, &url, dest).await?)
            }
        }
        "ResizeImageToFitLimits" => json!(arg_str(args, 0)),
        "CropAllPrints" => Value::Null,
        "CropPrintImage" => json!(false),
        "SavePrintToFile" | "SaveStickerToFile" | "SaveEmojiToFile" => {
            let url = arg_str(args, 0);
            let ugc_folder = arg_str(args, 1);
            let month_folder = arg_str(args, 2);
            let file_name = arg_str(args, 3);
            let subdir = match method {
                "SavePrintToFile" => "Prints",
                "SaveStickerToFile" => "Stickers",
                _ => "Emoji",
            };
            let dest = paths::ugc_photo_dir(&ugc_folder)
                .join(subdir)
                .join(month_folder)
                .join(file_name);
            json!(download_to_file(state, &url, dest).await?)
        }
        "AddScreenshotMetadata" => json!(""),
        "GetExtraScreenshotData" => json!(""),
        "GetScreenshotMetadata" => json!(""),
        "FindScreenshotsBySearch" => json!("[]"),
        "GetLastScreenshot" => json!(""),
        "DeleteScreenshotMetadata" => json!(false),
        "DeleteAllScreenshotMetadata" => Value::Null,
        "GetVRChatModerations" => Value::Null,
        "GetVRChatUserModeration" => json!(0),
        "SetVRChatUserModeration" => json!(false),
        "ReadConfigFile" | "ReadConfigFileSafe" => {
            json!(read_text_or_empty(paths::vrchat_config_path()))
        }
        "WriteConfigFile" => {
            let json_text = arg_str(args, 0);
            let path = paths::vrchat_config_path();
            if let Some(parent) = path.parent() {
                let _ = fs::create_dir_all(parent);
            }
            fs::write(&path, json_text).map_err(|e| e.to_string())?;
            Value::Null
        }
        "DownloadUpdate" | "CancelUpdate" => Value::Null,
        "CheckUpdateProgress" => json!(0),
        "XSNotification" | "OVRTNotification" => Value::Null,
        _ => Value::Null,
    };
    Ok(result)
}
