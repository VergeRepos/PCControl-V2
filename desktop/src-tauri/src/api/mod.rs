use crate::AppState;
use tauri::{command, State};
use anyhow::Result;

#[command]
pub async fn get_system_info() -> Result<crate::system::SystemInfo, String> {
    crate::system::get_system_info()
        .map_err(|e| e.to_string())
}

#[command]
pub async fn get_system_stats() -> Result<crate::system::SystemStats, String> {
    crate::system::get_system_stats()
        .map_err(|e| e.to_string())
}

#[command]
pub async fn get_processes(
    sort: Option<String>,
    filter: Option<String>,
) -> Result<Vec<crate::system::ProcessInfo>, String> {
    let mut processes = crate::system::get_processes()
        .map_err(|e| e.to_string())?;

    // Apply filter
    if let Some(filter_text) = filter {
        let filter_lower = filter_text.to_lowercase();
        processes.retain(|p| p.name.to_lowercase().contains(&filter_lower));
    }

    // Apply sort
    match sort.as_deref() {
        Some("cpu") => processes.sort_by(|a, b| b.cpu_percent.partial_cmp(&a.cpu_percent).unwrap()),
        Some("memory") => processes.sort_by(|a, b| b.memory_bytes.cmp(&a.memory_bytes)),
        _ => processes.sort_by(|a, b| a.name.cmp(&b.name)),
    }

    Ok(processes)
}

#[command]
pub async fn get_devices(state: State<'_, AppState>) -> Result<Vec<crate::database::Device>, String> {
    let db = state.db.read();
    db.get_all_devices()
        .map_err(|e| e.to_string())
}

#[command]
pub async fn generate_pairing_code(state: State<'_, AppState>) -> Result<String, String> {
    let code = crate::security::generate_pairing_code();

    // Store code in state
    *state.pairing_code.write() = Some(code.clone());

    // Code expires after 5 minutes
    let pairing_code = state.pairing_code.clone();
    tokio::spawn(async move {
        tokio::time::sleep(tokio::time::Duration::from_secs(300)).await;
        *pairing_code.write() = None;
    });

    Ok(code)
}

#[command]
pub async fn revoke_device(
    state: State<'_, AppState>,
    device_id: String,
) -> Result<(), String> {
    let db = state.db.read();
    db.delete_device(&device_id)
        .map_err(|e| e.to_string())?;

    // Log the revocation
    let log_entry = crate::database::LogEntry {
        id: None,
        timestamp: chrono::Utc::now().timestamp_millis(),
        level: "INFO".to_string(),
        category: "SECURITY".to_string(),
        message: format!("Device revoked: {}", device_id),
        device_id: Some(device_id),
        metadata: None,
    };
    db.add_log(&log_entry).ok();

    Ok(())
}

#[command]
pub async fn update_device_permissions(
    state: State<'_, AppState>,
    device_id: String,
    permissions: crate::database::DevicePermissions,
) -> Result<(), String> {
    let db = state.db.read();

    // Get existing device
    let mut device = db.get_device(&device_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Device not found".to_string())?;

    // Update permissions
    device.permissions = permissions;

    db.save_device(&device)
        .map_err(|e| e.to_string())?;

    // Log the change
    let log_entry = crate::database::LogEntry {
        id: None,
        timestamp: chrono::Utc::now().timestamp_millis(),
        level: "INFO".to_string(),
        category: "SECURITY".to_string(),
        message: format!("Device permissions updated: {}", device_id),
        device_id: Some(device_id),
        metadata: Some(serde_json::to_string(&device.permissions).unwrap_or_default()),
    };
    db.add_log(&log_entry).ok();

    Ok(())
}

#[command]
pub async fn get_logs(
    state: State<'_, AppState>,
    limit: Option<usize>,
    offset: Option<usize>,
) -> Result<Vec<crate::database::LogEntry>, String> {
    let db = state.db.read();
    db.get_logs(limit.unwrap_or(100), offset.unwrap_or(0))
        .map_err(|e| e.to_string())
}
