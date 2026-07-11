use serde_json::{json, Value};

pub fn call(method: &str, _args: &[Value]) -> Result<Value, String> {
    let result = match method {
        "Init" | "VrInit" | "ToggleSystemMonitor" => Value::Null,
        "CpuUsage" => json!(0.0),
        "GetVRDevices" => json!([]),
        "GetUptime" => json!(0),
        "CurrentCulture" => json!(super::current_culture()),
        "CustomVrScript" => json!(""),
        "GetExecuteVrOverlayFunctionQueue" => json!({}),
        _ => Value::Null,
    };
    Ok(result)
}
