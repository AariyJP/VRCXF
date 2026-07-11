use crate::native::discord::DiscordAssets;
use crate::native::{
    app_api, app_api_vr, arg_bool, arg_i64, arg_map, arg_str, asset_bundle,
};
use crate::state::AppState;
use serde_json::{json, Value};
use tauri::{AppHandle, State};

#[tauri::command]
pub fn ping() -> String {
    "pong".to_string()
}

#[tauri::command]
pub async fn call_native(
    app: AppHandle,
    state: State<'_, AppState>,
    namespace: String,
    method: String,
    args: Vec<Value>,
) -> Result<Value, String> {
    let state = state.inner();
    match namespace.as_str() {
        "AppApi" => app_api::call(&app, state, &method, &args).await,
        "AppApiVr" => app_api_vr::call(&method, &args),
        "WebApi" => call_web_api(state, &method, &args).await,
        "VRCXStorage" => call_storage(state, &method, &args),
        "SQLite" => call_sqlite(state, &method, &args),
        "LogWatcher" => call_log_watcher(state, &method, &args),
        "Discord" => call_discord(state, &method, &args),
        "AssetBundleManager" => call_asset_bundle_manager(&method, &args),
        other => Err(format!("Unknown namespace: {}", other)),
    }
}

async fn call_web_api(state: &AppState, method: &str, args: &[Value]) -> Result<Value, String> {
    let result = match method {
        "ClearCookies" => {
            state.web.clear_cookies();
            Value::Null
        }
        "GetCookies" => json!(state.web.get_cookies()),
        "SetCookies" => {
            state.web.set_cookies(&arg_str(args, 0));
            Value::Null
        }
        "Execute" => {
            let options = arg_map(args, 0).ok_or("options is required")?;
            let (status, message) = state.web.execute(&options).await;
            json!({ "Item1": status, "Item2": message })
        }
        "ExecuteJson" => {
            let request_json = match args.first() {
                Some(Value::String(s)) => s.clone(),
                Some(Value::Object(map)) => Value::Object(map.clone()).to_string(),
                _ => return Err("request json is required".to_string()),
            };
            json!(state.web.execute_json(&request_json).await)
        }
        other => return Err(format!("Unknown WebApi method: {}", other)),
    };
    Ok(result)
}

fn call_storage(state: &AppState, method: &str, args: &[Value]) -> Result<Value, String> {
    let storage = &state.storage;
    let result = match method {
        "Get" => json!(storage.get(&arg_str(args, 0))),
        "Set" => {
            storage.set(&arg_str(args, 0), &arg_str(args, 1));
            Value::Null
        }
        "Remove" => {
            storage.remove(&arg_str(args, 0));
            Value::Null
        }
        "GetAll" => json!(storage.get_all()),
        "Clear" => {
            storage.clear();
            Value::Null
        }
        "Flush" | "Save" => {
            storage.save();
            Value::Null
        }
        "Load" => {
            storage.load();
            Value::Null
        }
        "GetArray" => storage.get_array(&arg_str(args, 0)),
        "SetArray" => {
            storage.set_array(&arg_str(args, 0), args.get(1).unwrap_or(&Value::Null));
            Value::Null
        }
        "GetObject" => storage.get_object(&arg_str(args, 0)),
        "SetObject" => {
            storage.set_object(&arg_str(args, 0), args.get(1).unwrap_or(&Value::Null));
            Value::Null
        }
        other => return Err(format!("Unknown VRCXStorage method: {}", other)),
    };
    Ok(result)
}

fn call_sqlite(state: &AppState, method: &str, args: &[Value]) -> Result<Value, String> {
    let sql = arg_str(args, 0);
    let params = arg_map(args, 1);
    let result = match method {
        "Execute" => {
            let rows = state.db.execute(&sql, params.as_ref())?;
            serde_json::to_value(rows).map_err(|e| e.to_string())?
        }
        "ExecuteJson" => json!(state.db.execute_json(&sql, params.as_ref())?),
        "ExecuteNonQuery" => json!(state.db.execute_non_query(&sql, params.as_ref())?),
        other => return Err(format!("Unknown SQLite method: {}", other)),
    };
    Ok(result)
}

fn call_log_watcher(state: &AppState, method: &str, args: &[Value]) -> Result<Value, String> {
    let watcher = &state.log_watcher;
    let result = match method {
        "Get" => serde_json::to_value(watcher.get()).map_err(|e| e.to_string())?,
        "SetDateTill" => {
            watcher.set_date_till(&arg_str(args, 0));
            Value::Null
        }
        "GetLogLines" => {
            serde_json::to_value(watcher.get_log_lines()).map_err(|e| e.to_string())?
        }
        "Reset" => {
            watcher.reset();
            Value::Null
        }
        other => return Err(format!("Unknown LogWatcher method: {}", other)),
    };
    Ok(result)
}

fn call_discord(state: &AppState, method: &str, args: &[Value]) -> Result<Value, String> {
    let result = match method {
        "SetAssets" => {
            let assets = DiscordAssets {
                details: arg_str(args, 0),
                state: arg_str(args, 1),
                details_url: arg_str(args, 2),
                big_icon: arg_str(args, 3),
                big_icon_text: arg_str(args, 4),
                small_icon: arg_str(args, 5),
                small_icon_text: arg_str(args, 6),
                start_time: arg_i64(args, 7, 0),
                end_time: arg_i64(args, 8, 0),
                party_id: arg_str(args, 9),
                party_size: arg_i64(args, 10, 0),
                party_max_size: arg_i64(args, 11, 0),
                button_text: arg_str(args, 12),
                button_url: arg_str(args, 13),
                app_id: arg_str(args, 14),
                activity_type: arg_i64(args, 15, 0),
                status_display_type: arg_i64(args, 16, 0),
            };
            state.discord.set_assets(assets);
            Value::Null
        }
        "SetActive" => json!(state.discord.set_active(arg_bool(args, 0, false))),
        other => return Err(format!("Unknown Discord method: {}", other)),
    };
    Ok(result)
}

fn call_asset_bundle_manager(method: &str, args: &[Value]) -> Result<Value, String> {
    let result = match method {
        "SweepCache" => {
            let removed = asset_bundle::sweep_cache();
            json!(serde_json::to_string(&removed).map_err(|e| e.to_string())?)
        }
        "GetCacheSize" => json!(asset_bundle::get_cache_size()),
        "GetVRChatCacheFullLocation" => {
            let path = asset_bundle::get_cache_full_location(
                &arg_str(args, 0),
                arg_i64(args, 1, 0) as i32,
                &arg_str(args, 2),
                arg_i64(args, 3, 0) as i32,
            );
            json!(path.to_string_lossy().to_string())
        }
        "CheckVRChatCache" => asset_bundle::check_cache(
            &arg_str(args, 0),
            arg_i64(args, 1, 0) as i32,
            &arg_str(args, 2),
            arg_i64(args, 3, 0) as i32,
        ),
        "DeleteCache" => {
            asset_bundle::delete_cache(
                &arg_str(args, 0),
                arg_i64(args, 1, 0) as i32,
                &arg_str(args, 2),
                arg_i64(args, 3, 0) as i32,
            );
            Value::Null
        }
        "DeleteAllCache" => {
            asset_bundle::delete_all_cache();
            Value::Null
        }
        other => return Err(format!("Unknown AssetBundleManager method: {}", other)),
    };
    Ok(result)
}
