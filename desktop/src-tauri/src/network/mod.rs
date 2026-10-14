use anyhow::Result;
use std::sync::Arc;
use tauri::AppHandle;
use warp::Filter;

mod routes;
mod websocket;
mod discovery;

pub async fn start_server(app_handle: AppHandle) -> Result<()> {
    let app_state = app_handle.state::<crate::AppState>();

    // Clone the state for routes
    let db = app_state.db.clone();
    let pairing_code = app_state.pairing_code.clone();

    // Start mDNS discovery
    discovery::start_mdns_advertising()?;

    // Build API routes
    let api_routes = routes::build_routes(db.clone(), pairing_code.clone());

    // WebSocket route
    let ws_route = warp::path("ws")
        .and(warp::ws())
        .and(warp::any().map(move || db.clone()))
        .map(|ws: warp::ws::Ws, db| {
            ws.on_upgrade(move |socket| websocket::handle_connection(socket, db))
        });

    let routes = api_routes.or(ws_route);

    // Start server on port 8421
    tracing::info!("Starting API server on 0.0.0.0:8421");
    warp::serve(routes)
        .run(([0, 0, 0, 0], 8421))
        .await;

    Ok(())
}
