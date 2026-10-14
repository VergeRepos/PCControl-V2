use warp::{Filter, Reply};
use std::sync::Arc;
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use crate::database::Database;

#[derive(Deserialize)]
struct PairingRequest {
    code: String,
    device_name: String,
    device_type: String,
}

#[derive(Serialize)]
struct PairingResponse {
    device_id: String,
    access_token: String,
    refresh_token: String,
    expires_in: i64,
    secret: String,
}

#[derive(Serialize)]
struct ErrorResponse {
    error: ErrorDetail,
}

#[derive(Serialize)]
struct ErrorDetail {
    code: String,
    message: String,
}

pub fn build_routes(
    db: Arc<RwLock<Database>>,
    pairing_code: Arc<RwLock<Option<String>>>,
) -> impl Filter<Extract = impl Reply, Error = warp::Rejection> + Clone {
    let pairing = warp::path!("api" / "pairing" / "verify")
        .and(warp::post())
        .and(warp::body::json())
        .and(with_db(db.clone()))
        .and(with_pairing_code(pairing_code.clone()))
        .and_then(handle_pairing);

    let system_info = warp::path!("api" / "system")
        .and(warp::get())
        .and(require_auth(db.clone()))
        .and_then(handle_get_system_info);

    let system_stats = warp::path!("api" / "system" / "stats")
        .and(warp::get())
        .and(require_auth(db.clone()))
        .and_then(handle_get_system_stats);

    let processes = warp::path!("api" / "processes")
        .and(warp::get())
        .and(require_auth(db.clone()))
        .and(warp::query::<std::collections::HashMap<String, String>>())
        .and_then(handle_get_processes);

    let terminate_process = warp::path!("api" / "processes" / u32 / "terminate")
        .and(warp::post())
        .and(require_auth_with_permission(db.clone(), "process_control"))
        .and_then(handle_terminate_process);

    let power_shutdown = warp::path!("api" / "power" / "shutdown")
        .and(warp::post())
        .and(require_auth_with_permission(db.clone(), "power_controls"))
        .and_then(handle_power_shutdown);

    let power_restart = warp::path!("api" / "power" / "restart")
        .and(warp::post())
        .and(require_auth_with_permission(db.clone(), "power_controls"))
        .and_then(handle_power_restart);

    let power_sleep = warp::path!("api" / "power" / "sleep")
        .and(warp::post())
        .and(require_auth_with_permission(db.clone(), "power_controls"))
        .and_then(handle_power_sleep);

    let power_lock = warp::path!("api" / "power" / "lock")
        .and(warp::post())
        .and(require_auth_with_permission(db.clone(), "power_controls"))
        .and_then(handle_power_lock);

    pairing
        .or(system_info)
        .or(system_stats)
        .or(processes)
        .or(terminate_process)
        .or(power_shutdown)
        .or(power_restart)
        .or(power_sleep)
        .or(power_lock)
}

fn with_db(
    db: Arc<RwLock<Database>>,
) -> impl Filter<Extract = (Arc<RwLock<Database>>,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || db.clone())
}

fn with_pairing_code(
    code: Arc<RwLock<Option<String>>>,
) -> impl Filter<Extract = (Arc<RwLock<Option<String>>>,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || code.clone())
}

fn require_auth(
    db: Arc<RwLock<Database>>,
) -> impl Filter<Extract = (String,), Error = warp::Rejection> + Clone {
    warp::header::<String>("authorization")
        .and(with_db(db))
        .and_then(|auth_header: String, db: Arc<RwLock<Database>>| async move {
            verify_auth(&auth_header, &db).map_err(|_| warp::reject::reject())
        })
}

fn require_auth_with_permission(
    db: Arc<RwLock<Database>>,
    permission: &'static str,
) -> impl Filter<Extract = (String,), Error = warp::Rejection> + Clone {
    warp::header::<String>("authorization")
        .and(with_db(db))
        .and_then(move |auth_header: String, db: Arc<RwLock<Database>>| async move {
            let device_id = verify_auth(&auth_header, &db).map_err(|_| warp::reject::reject())?;

            let db_lock = db.read();
            if let Ok(Some(device)) = db_lock.get_device(&device_id) {
                crate::security::check_permission(&device, permission)
                    .map_err(|_| warp::reject::reject())?;
                Ok(device_id)
            } else {
                Err(warp::reject::reject())
            }
        })
}

fn verify_auth(auth_header: &str, db: &Arc<RwLock<Database>>) -> Result<String, ()> {
    let token = auth_header.strip_prefix("Bearer ").ok_or(())?;

    // Need to find device to get secret - try all devices
    let db_lock = db.read();
    let devices = db_lock.get_all_devices().map_err(|_| ())?;

    for device in devices {
        if let Ok(device_id) = crate::security::validate_token(token, &device.secret) {
            // Update last seen
            let timestamp = chrono::Utc::now().timestamp_millis();
            db_lock.update_device_last_seen(&device_id, timestamp).ok();
            return Ok(device_id);
        }
    }

    Err(())
}

async fn handle_pairing(
    req: PairingRequest,
    db: Arc<RwLock<Database>>,
    pairing_code: Arc<RwLock<Option<String>>>,
) -> Result<impl Reply, warp::Rejection> {
    let stored_code = pairing_code.read().clone();

    if !crate::security::verify_pairing_code(&req.code, stored_code.as_deref()) {
        return Ok(warp::reply::with_status(
            warp::reply::json(&ErrorResponse {
                error: ErrorDetail {
                    code: "INVALID_CODE".to_string(),
                    message: "Invalid or expired pairing code".to_string(),
                },
            }),
            warp::http::StatusCode::UNAUTHORIZED,
        ));
    }

    // Clear the pairing code
    *pairing_code.write() = None;

    // Create device
    let (device, access_token, refresh_token) =
        crate::security::create_device(req.device_name, req.device_type)
            .map_err(|_| warp::reject::reject())?;

    // Save device
    let db_lock = db.read();
    db_lock.save_device(&device).map_err(|_| warp::reject::reject())?;

    // Log pairing
    let log_entry = crate::database::LogEntry {
        id: None,
        timestamp: chrono::Utc::now().timestamp_millis(),
        level: "INFO".to_string(),
        category: "SECURITY".to_string(),
        message: format!("Device paired: {}", device.name),
        device_id: Some(device.id.clone()),
        metadata: None,
    };
    db_lock.add_log(&log_entry).ok();

    Ok(warp::reply::with_status(
        warp::reply::json(&PairingResponse {
            device_id: device.id.clone(),
            access_token,
            refresh_token,
            expires_in: 86400,
            secret: device.secret,
        }),
        warp::http::StatusCode::OK,
    ))
}

async fn handle_get_system_info(_device_id: String) -> Result<impl Reply, warp::Rejection> {
    let info = crate::system::get_system_info().map_err(|_| warp::reject::reject())?;
    Ok(warp::reply::json(&info))
}

async fn handle_get_system_stats(_device_id: String) -> Result<impl Reply, warp::Rejection> {
    let stats = crate::system::get_system_stats().map_err(|_| warp::reject::reject())?;
    Ok(warp::reply::json(&stats))
}

async fn handle_get_processes(
    _device_id: String,
    query: std::collections::HashMap<String, String>,
) -> Result<impl Reply, warp::Rejection> {
    let sort = query.get("sort").cloned();
    let filter = query.get("filter").cloned();

    let mut processes = crate::system::get_processes().map_err(|_| warp::reject::reject())?;

    if let Some(filter_text) = filter {
        let filter_lower = filter_text.to_lowercase();
        processes.retain(|p| p.name.to_lowercase().contains(&filter_lower));
    }

    match sort.as_deref() {
        Some("cpu") => processes.sort_by(|a, b| b.cpu_percent.partial_cmp(&a.cpu_percent).unwrap()),
        Some("memory") => processes.sort_by(|a, b| b.memory_bytes.cmp(&a.memory_bytes)),
        _ => processes.sort_by(|a, b| a.name.cmp(&b.name)),
    }

    Ok(warp::reply::json(&serde_json::json!({
        "processes": processes,
        "total": processes.len()
    })))
}

async fn handle_terminate_process(
    pid: u32,
    _device_id: String,
) -> Result<impl Reply, warp::Rejection> {
    crate::system::terminate_process(pid).map_err(|_| warp::reject::reject())?;

    Ok(warp::reply::json(&serde_json::json!({
        "success": true,
        "message": format!("Process {} terminated", pid)
    })))
}

async fn handle_power_shutdown(_device_id: String) -> Result<impl Reply, warp::Rejection> {
    #[cfg(target_os = "windows")]
    {
        use windows::Win32::System::Shutdown::{ExitWindowsEx, SHTDN_REASON_MAJOR_APPLICATION, SHTDN_REASON_MINOR_OTHER};
        use windows::Win32::System::Shutdown::{EWX_SHUTDOWN, EWX_FORCE};

        unsafe {
            let _ = ExitWindowsEx(EWX_SHUTDOWN | EWX_FORCE, SHTDN_REASON_MAJOR_APPLICATION | SHTDN_REASON_MINOR_OTHER);
        }
    }

    Ok(warp::reply::json(&serde_json::json!({
        "success": true,
        "message": "Shutdown initiated"
    })))
}

async fn handle_power_restart(_device_id: String) -> Result<impl Reply, warp::Rejection> {
    #[cfg(target_os = "windows")]
    {
        use windows::Win32::System::Shutdown::{ExitWindowsEx, SHTDN_REASON_MAJOR_APPLICATION, SHTDN_REASON_MINOR_OTHER};
        use windows::Win32::System::Shutdown::{EWX_REBOOT, EWX_FORCE};

        unsafe {
            let _ = ExitWindowsEx(EWX_REBOOT | EWX_FORCE, SHTDN_REASON_MAJOR_APPLICATION | SHTDN_REASON_MINOR_OTHER);
        }
    }

    Ok(warp::reply::json(&serde_json::json!({
        "success": true,
        "message": "Restart initiated"
    })))
}

async fn handle_power_sleep(_device_id: String) -> Result<impl Reply, warp::Rejection> {
    #[cfg(target_os = "windows")]
    {
        use windows::Win32::System::Power::SetSuspendState;

        unsafe {
            let _ = SetSuspendState(false, false, false);
        }
    }

    Ok(warp::reply::json(&serde_json::json!({
        "success": true,
        "message": "Sleep initiated"
    })))
}

async fn handle_power_lock(_device_id: String) -> Result<impl Reply, warp::Rejection> {
    #[cfg(target_os = "windows")]
    {
        use windows::Win32::UI::WindowsAndMessaging::LockWorkStation;

        unsafe {
            let _ = LockWorkStation();
        }
    }

    Ok(warp::reply::json(&serde_json::json!({
        "success": true,
        "message": "Workstation locked"
    })))
}
