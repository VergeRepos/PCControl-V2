use futures_util::{SinkExt, StreamExt};
use std::sync::Arc;
use parking_lot::RwLock;
use tokio_tungstenite::tungstenite::Message;
use crate::database::Database;

pub async fn handle_connection(
    ws: warp::ws::WebSocket,
    db: Arc<RwLock<Database>>,
) {
    let (mut ws_sender, mut ws_receiver) = ws.split();

    // Wait for authentication
    let device_id = match authenticate_websocket(&mut ws_receiver, &db).await {
        Ok(id) => id,
        Err(_) => {
            let _ = ws_sender.send(warp::ws::Message::close()).await;
            return;
        }
    };

    tracing::info!("WebSocket authenticated for device: {}", device_id);

    // Send system stats every 2 seconds
    let stats_task = {
        let mut sender = ws_sender.clone();
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(2));
            loop {
                interval.tick().await;

                if let Ok(stats) = crate::system::get_system_stats() {
                    let event = serde_json::json!({
                        "type": "system.stats",
                        "data": stats
                    });

                    if let Ok(msg) = serde_json::to_string(&event) {
                        if sender.send(warp::ws::Message::text(msg)).await.is_err() {
                            break;
                        }
                    }
                }
            }
        })
    };

    // Handle incoming messages
    while let Some(result) = ws_receiver.next().await {
        match result {
            Ok(msg) => {
                if msg.is_text() {
                    if let Ok(text) = msg.to_str() {
                        if let Ok(json) = serde_json::from_str::<serde_json::Value>(text) {
                            if json["type"] == "ping" {
                                let pong = serde_json::json!({
                                    "type": "pong",
                                    "timestamp": chrono::Utc::now().timestamp_millis()
                                });

                                if let Ok(pong_msg) = serde_json::to_string(&pong) {
                                    let _ = ws_sender.send(warp::ws::Message::text(pong_msg)).await;
                                }
                            }
                        }
                    }
                } else if msg.is_close() {
                    break;
                }
            }
            Err(_) => break,
        }
    }

    stats_task.abort();
    tracing::info!("WebSocket closed for device: {}", device_id);
}

async fn authenticate_websocket(
    ws_receiver: &mut futures_util::stream::SplitStream<warp::ws::WebSocket>,
    db: &Arc<RwLock<Database>>,
) -> Result<String, ()> {
    // Wait for auth message with timeout
    let timeout = tokio::time::Duration::from_secs(10);

    match tokio::time::timeout(timeout, ws_receiver.next()).await {
        Ok(Some(Ok(msg))) => {
            if let Ok(text) = msg.to_str() {
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(text) {
                    if json["type"] == "auth" {
                        if let Some(token) = json["token"].as_str() {
                            // Validate token
                            let db_lock = db.read();
                            let devices = db_lock.get_all_devices().map_err(|_| ())?;

                            for device in devices {
                                if let Ok(device_id) = crate::security::validate_token(token, &device.secret) {
                                    return Ok(device_id);
                                }
                            }
                        }
                    }
                }
            }
            Err(())
        }
        _ => Err(()),
    }
}
