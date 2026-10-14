use anyhow::Result;
use rand::Rng;
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};
use uuid::Uuid;

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
            system_monitoring: true,
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
pub struct Device {
    pub id: String,
    pub name: String,
    pub device_type: String,
    pub paired_at: i64,
    pub last_seen: Option<i64>,
    pub secret: String,
    pub permissions: DevicePermissions,
}

pub fn generate_pairing_code() -> String {
    let mut rng = rand::thread_rng();
    (0..6).map(|_| rng.gen_range(0..10).to_string()).collect()
}

pub fn verify_pairing_code(input: &str, stored: Option<&str>) -> bool {
    stored.map_or(false, |code| input == code)
}

pub fn check_permission(device: &Device, permission: &str) -> Result<()> {
    let has_permission = match permission {
        "system_monitoring" => device.permissions.system_monitoring,
        "power_controls" => device.permissions.power_controls,
        "process_control" => device.permissions.process_control,
        "application_launching" => device.permissions.application_launching,
        "file_access" => device.permissions.file_access,
        "clipboard_sync" => device.permissions.clipboard_sync,
        "remote_input" => device.permissions.remote_input,
        _ => false,
    };

    if has_permission {
        Ok(())
    } else {
        anyhow::bail!("Permission denied: {}", permission)
    }
}

pub fn create_device(
    device_name: String,
    device_type: String,
) -> Result<(Device, String, String)> {
    let device_id = Uuid::new_v4().to_string();
    let secret = generate_secret();
    let paired_at = SystemTime::now()
        .duration_since(UNIX_EPOCH)?
        .as_millis() as i64;

    let device = Device {
        id: device_id.clone(),
        name: device_name,
        device_type,
        paired_at,
        last_seen: None,
        secret: secret.clone(),
        permissions: DevicePermissions::default(),
    };

    let access_token = generate_jwt(&device_id, &secret, 86400)?;
    let refresh_token = generate_jwt(&device_id, &secret, 2592000)?;

    Ok((device, access_token, refresh_token))
}

pub fn validate_token(token: &str, secret: &str) -> Result<String> {
    let parts: Vec<&str> = token.split('.').collect();
    if parts.len() != 3 {
        anyhow::bail!("Invalid token format");
    }

    let header = parts[0];
    let payload = parts[1];
    let signature = parts[2];

    let expected_signature = compute_signature(header, payload, secret);
    if signature != expected_signature {
        anyhow::bail!("Invalid token signature");
    }

    let decoded: TokenPayload = serde_json::from_str(&base64_decode(payload))?;
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)?
        .as_secs() as i64;

    if decoded.exp < now {
        anyhow::bail!("Token expired");
    }

    Ok(decoded.sub)
}

fn generate_jwt(device_id: &str, secret: &str, expires_in_seconds: i64) -> Result<String> {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)?
        .as_secs() as i64;

    let header = base64_encode(r#"{"alg":"HS256","typ":"JWT"}"#);
    let payload = serde_json::to_string(&TokenPayload {
        sub: device_id.to_string(),
        iat: now,
        exp: now + expires_in_seconds,
    })?;

    let payload_b64 = base64_encode(&payload);
    let signature = compute_signature(&header, &payload_b64, secret);

    format!("{}.{}.{}", header, payload_b64, signature).parse().map_err(Into::into)
}

#[derive(Serialize, Deserialize)]
struct TokenPayload {
    sub: String,
    iat: i64,
    exp: i64,
}

fn generate_secret() -> String {
    const CHARSET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let mut rng = rand::thread_rng();
    (0..32).map(|_| {
        let idx = rng.gen_range(0..CHARSET.len());
        CHARSET[idx] as char
    }).collect()
}

fn compute_signature(header: &str, payload: &str, secret: &str) -> String {
    use hmac::{Hmac, Mac};
    use sha2::Sha256;

    let key = secret.as_bytes();
    let data = format!("{}.{}", header, payload);

    let mut mac = Hmac::<Sha256>::new_from_slice(key).expect("HMAC allocation failed");
    mac.update(data.as_bytes());
    let result = mac.finalize().into_bytes();

    base64_encode(&hex::encode(result))
}

fn base64_encode(input: &str) -> String {
    const CHARSET: &[u8] =
        b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let bytes = input.as_bytes();
    let mut result = String::new();

    for chunk in bytes.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = chunk.get(1).map(|&b| b as u32).unwrap_or(0);
        let b2 = chunk.get(2).map(|&b| b as u32).unwrap_or(0);

        let n = (b0 << 16) | (b1 << 8) | b2;

        result.push(CHARSET[(n >> 18 & 0x3F) as usize] as char);
        result.push(CHARSET[(n >> 12 & 0x3F) as usize] as char);
        result.push(
            chunk.len() > 1
                .then(|| CHARSET[(n >> 6 & 0x3F) as usize] as char)
                .unwrap_or('='),
        );
        result.push(chunk.len() > 2
            .then(|| CHARSET[(n & 0x3F) as usize] as char)
            .unwrap_or('='));
    }

    result
}

fn base64_decode(input: &str) -> String {
    let input = input.trim_end_matches('=');
    let bytes: Vec<u8> = input
        .chars()
        .filter_map(|c| {
            if c >= 'A' && c <= 'Z' {
                Some(c as u8 - b'A')
            } else if c >= 'a' && c <= 'z' {
                Some(c as u8 - b'a' + 26)
            } else if c >= '0' && c <= '9' {
                Some(c as u8 - b'0' + 52)
            } else if c == '+' {
                Some(62)
            } else if c == '/' {
                Some(63)
            } else {
                None
            }
        })
        .collect();

    let mut result = Vec::new();
    for chunk in bytes.chunks(4) {
        let n: u32 = chunk
            .iter()
            .enumerate()
            .map(|(i, &b)| (b as u32) << (18 - i * 6))
            .sum();

        result.push((n >> 16) as u8);
        if chunk.len() > 1 {
            result.push((n >> 8 & 0xFF) as u8);
        }
        if chunk.len() > 2 {
            result.push((n & 0xFF) as u8);
        }
    }

    String::from_utf8_lossy(&result).to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_pairing_code() {
        let code = generate_pairing_code();
        assert_eq!(code.len(), 6);
        assert!(code.chars().all(|c| c.is_numeric()));
    }

    #[test]
    fn test_verify_pairing_code() {
        let code = "123456";
        assert!(verify_pairing_code(code, Some(code)));
        assert!(!verify_pairing_code("000000", Some(code)));
        assert!(!verify_pairing_code(code, None));
    }

    #[test]
    fn test_device_permissions_default() {
        let perms = DevicePermissions::default();
        assert!(perms.system_monitoring);
        assert!(!perms.power_controls);
        assert!(!perms.process_control);
        assert!(!perms.remote_input);
    }

    #[test]
    fn test_check_permission() {
        let mut device = Device {
            id: "test".to_string(),
            name: "Test".to_string(),
            device_type: "mobile".to_string(),
            paired_at: 0,
            last_seen: None,
            secret: "secret".to_string(),
            permissions: DevicePermissions::default(),
        };

        assert!(check_permission(&device, "system_monitoring").is_ok());
        assert!(check_permission(&device, "power_controls").is_err());

        device.permissions.power_controls = true;
        assert!(check_permission(&device, "power_controls").is_ok());
    }

    #[test]
    fn test_create_device() {
        let (device, access, refresh) = create_device("Test Device".to_string(), "mobile".to_string())
            .expect("Failed to create device");

        assert!(!device.id.is_empty());
        assert_eq!(device.name, "Test Device");
        assert_eq!(device.device_type, "mobile");
        assert!(!access.is_empty());
        assert!(!refresh.is_empty());
    }

    #[test]
    fn test_validate_token() {
        let (_, access, _) = create_device("Test Device".to_string(), "mobile".to_string())
            .expect("Failed to create device");

        let device_id = validate_token(&access, "wrong_secret");
        assert!(device_id.is_err());
    }

    #[test]
    fn test_base64_encode_decode() {
        let original = "Hello, World!";
        let encoded = base64_encode(original);
        let decoded = base64_decode(&encoded);
        assert_eq!(original, decoded);
    }
}