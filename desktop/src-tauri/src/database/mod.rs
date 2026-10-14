use anyhow::Result;
use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Device {
    pub id: String,
    pub name: String,
    pub device_type: String,
    pub paired_at: i64,
    pub last_seen: Option<i64>,
    pub secret: String,
    pub permissions: DevicePermissions,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DevicePermissions {
    pub system_monitoring: bool,
    pub power_controls: bool,
    pub process_control: bool,
    pub application_launching: bool,
    pub file_access: bool,
    pub clipboard_sync: bool,
    pub remote_input: bool,
}

impl Default for DevicePermissions {
    fn default() -> Self {
        Self {
            system_monitoring: true, // Only safe permission enabled by default
            power_controls: false,
            process_control: false,
            application_launching: false,
            file_access: false,
            clipboard_sync: false,
            remote_input: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Application {
    pub id: String,
    pub name: String,
    pub path: String,
    pub icon: Option<Vec<u8>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    pub id: Option<i64>,
    pub timestamp: i64,
    pub level: String,
    pub category: String,
    pub message: String,
    pub device_id: Option<String>,
    pub metadata: Option<String>,
}

pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn new() -> Result<Self> {
        let db_path = get_db_path()?;
        std::fs::create_dir_all(db_path.parent().unwrap())?;

        let conn = Connection::open(db_path)?;

        let db = Self { conn };
        db.init_schema()?;

        Ok(db)
    }

    fn init_schema(&self) -> Result<()> {
        self.conn.execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS devices (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                device_type TEXT NOT NULL,
                paired_at INTEGER NOT NULL,
                last_seen INTEGER,
                secret TEXT NOT NULL,
                permissions TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS applications (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                path TEXT NOT NULL,
                icon BLOB
            );

            CREATE TABLE IF NOT EXISTS logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER NOT NULL,
                level TEXT NOT NULL,
                category TEXT NOT NULL,
                message TEXT NOT NULL,
                device_id TEXT,
                metadata TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);
            CREATE INDEX IF NOT EXISTS idx_logs_device ON logs(device_id);
            "#,
        )?;

        Ok(())
    }

    // Device operations
    pub fn save_device(&self, device: &Device) -> Result<()> {
        let permissions_json = serde_json::to_string(&device.permissions)?;

        self.conn.execute(
            "INSERT OR REPLACE INTO devices (id, name, device_type, paired_at, last_seen, secret, permissions)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                &device.id,
                &device.name,
                &device.device_type,
                device.paired_at,
                device.last_seen,
                &device.secret,
                &permissions_json
            ],
        )?;

        Ok(())
    }

    pub fn get_device(&self, id: &str) -> Result<Option<Device>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, device_type, paired_at, last_seen, secret, permissions FROM devices WHERE id = ?1"
        )?;

        let mut rows = stmt.query(params![id])?;

        if let Some(row) = rows.next()? {
            let permissions_json: String = row.get(6)?;
            let permissions: DevicePermissions = serde_json::from_str(&permissions_json)?;

            Ok(Some(Device {
                id: row.get(0)?,
                name: row.get(1)?,
                device_type: row.get(2)?,
                paired_at: row.get(3)?,
                last_seen: row.get(4)?,
                secret: row.get(5)?,
                permissions,
            }))
        } else {
            Ok(None)
        }
    }

    pub fn get_all_devices(&self) -> Result<Vec<Device>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, device_type, paired_at, last_seen, secret, permissions FROM devices"
        )?;

        let rows = stmt.query_map([], |row| {
            let permissions_json: String = row.get(6)?;
            let permissions: DevicePermissions = serde_json::from_str(&permissions_json)
                .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;

            Ok(Device {
                id: row.get(0)?,
                name: row.get(1)?,
                device_type: row.get(2)?,
                paired_at: row.get(3)?,
                last_seen: row.get(4)?,
                secret: row.get(5)?,
                permissions,
            })
        })?;

        let mut devices = Vec::new();
        for device in rows {
            devices.push(device?);
        }

        Ok(devices)
    }

    pub fn delete_device(&self, id: &str) -> Result<()> {
        self.conn.execute("DELETE FROM devices WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn update_device_last_seen(&self, id: &str, timestamp: i64) -> Result<()> {
        self.conn.execute(
            "UPDATE devices SET last_seen = ?1 WHERE id = ?2",
            params![timestamp, id],
        )?;
        Ok(())
    }

    // Application operations
    pub fn save_application(&self, app: &Application) -> Result<()> {
        self.conn.execute(
            "INSERT OR REPLACE INTO applications (id, name, path, icon) VALUES (?1, ?2, ?3, ?4)",
            params![&app.id, &app.name, &app.path, &app.icon],
        )?;
        Ok(())
    }

    pub fn get_all_applications(&self) -> Result<Vec<Application>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, path, icon FROM applications"
        )?;

        let rows = stmt.query_map([], |row| {
            Ok(Application {
                id: row.get(0)?,
                name: row.get(1)?,
                path: row.get(2)?,
                icon: row.get(3)?,
            })
        })?;

        let mut apps = Vec::new();
        for app in rows {
            apps.push(app?);
        }

        Ok(apps)
    }

    pub fn get_application(&self, id: &str) -> Result<Option<Application>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, path, icon FROM applications WHERE id = ?1"
        )?;

        let mut rows = stmt.query(params![id])?;

        if let Some(row) = rows.next()? {
            Ok(Some(Application {
                id: row.get(0)?,
                name: row.get(1)?,
                path: row.get(2)?,
                icon: row.get(3)?,
            }))
        } else {
            Ok(None)
        }
    }

    // Log operations
    pub fn add_log(&self, entry: &LogEntry) -> Result<()> {
        self.conn.execute(
            "INSERT INTO logs (timestamp, level, category, message, device_id, metadata)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                entry.timestamp,
                &entry.level,
                &entry.category,
                &entry.message,
                &entry.device_id,
                &entry.metadata
            ],
        )?;
        Ok(())
    }

    pub fn get_logs(&self, limit: usize, offset: usize) -> Result<Vec<LogEntry>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, timestamp, level, category, message, device_id, metadata
             FROM logs ORDER BY timestamp DESC LIMIT ?1 OFFSET ?2"
        )?;

        let rows = stmt.query_map(params![limit, offset], |row| {
            Ok(LogEntry {
                id: Some(row.get(0)?),
                timestamp: row.get(1)?,
                level: row.get(2)?,
                category: row.get(3)?,
                message: row.get(4)?,
                device_id: row.get(5)?,
                metadata: row.get(6)?,
            })
        })?;

        let mut logs = Vec::new();
        for log in rows {
            logs.push(log?);
        }

        Ok(logs)
    }
}

fn get_db_path() -> Result<PathBuf> {
    let mut path = dirs::data_local_dir()
        .ok_or_else(|| anyhow::anyhow!("Failed to get local data dir"))?;
    path.push("pccontrol");
    path.push("pccontrol.db");
    Ok(path)
}
