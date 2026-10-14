// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod api;
mod database;
mod logger;
mod network;
mod security;
mod system;

use anyhow::Result;
use parking_lot::RwLock;
use std::sync::Arc;
use tauri::{Manager, SystemTray, SystemTrayEvent};

pub struct AppState {
    db: Arc<RwLock<database::Database>>,
    pairing_code: Arc<RwLock<Option<String>>>,
}

fn main() -> Result<()> {
    // Initialize logging
    logger::init()?;

    // Initialize database
    let db = Arc::new(RwLock::new(database::Database::new()?));

    // Create app state
    let state = AppState {
        db: db.clone(),
        pairing_code: Arc::new(RwLock::new(None)),
    };

    // Create system tray
    let tray = SystemTray::new();

    // Start Tauri app
    tauri::Builder::default()
        .manage(state)
        .system_tray(tray)
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::LeftClick { .. } => {
                let window = app.get_window("main").unwrap();
                window.show().unwrap();
                window.set_focus().unwrap();
            }
            _ => {}
        })
        .setup(|app| {
            let app_handle = app.handle();

            // Start API server in background
            tauri::async_runtime::spawn(async move {
                if let Err(e) = network::start_server(app_handle).await {
                    tracing::error!("Failed to start API server: {}", e);
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            api::get_system_info,
            api::get_system_stats,
            api::get_processes,
            api::get_devices,
            api::generate_pairing_code,
            api::revoke_device,
            api::update_device_permissions,
            api::get_logs,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");

    Ok(())
}
