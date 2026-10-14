# Security Model

## Overview

PC Control provides remote access to critical system functions. Security is implemented through multiple layers of defense.

## Threat Model

### In Scope

This system protects against:

- **Unauthorized access** - Devices must pair using a one-time code before any control is possible
- **Man-in-the-middle attacks** - All communication is encrypted over TLS
- **Replay attacks** - Tokens are time-limited and cryptographically signed
- **Privilege escalation** - Permissions are checked on every request
- **Path traversal** - File paths are validated and restricted to allowed directories
- **Command injection** - All commands use parameterized APIs, not shell execution
- **Credential theft** - Secrets are stored using OS secure storage mechanisms

### Out of Scope

This system does NOT protect against:

- **Physical access to the desktop PC** - An attacker with physical access can compromise the system
- **Malware on the desktop** - If the PC is compromised, the control app can be subverted
- **Malware on the mobile device** - A compromised phone can use stored credentials
- **Network-level attacks on the local network** - Assumes the LAN is semi-trusted
- **Social engineering** - Users sharing pairing codes or credentials

## Authentication

### Initial Pairing

1. **Desktop generates pairing code**
   - 6-digit random numeric code
   - Valid for 5 minutes
   - Single-use only
   - Displayed prominently on desktop UI

2. **Mobile submits code**
   - User enters code manually or scans QR code
   - Desktop validates code
   - Desktop generates cryptographic credentials

3. **Credential exchange**
   - Desktop creates:
     - Device ID (UUID v4)
     - Shared secret (256-bit random)
     - Initial access token (JWT, 24h)
   - Mobile stores credentials in secure storage
   - Desktop stores device record in database

### Subsequent Authentication

**Access Tokens (JWT)**
- 24-hour expiry
- Signed with HMAC-SHA256 using shared secret
- Contains: device ID, issued-at, expiry
- Transmitted in Authorization header

**Refresh Tokens**
- Used to obtain new access tokens
- 30-day expiry
- Stored securely on mobile device
- Rotated on each use

**Token Validation**
- Signature verified on every request
- Expiry checked
- Device ID validated against database
- Revoked devices rejected

## Authorization

### Permission Model

Each paired device has granular permissions:

```typescript
interface DevicePermissions {
  system_monitoring: boolean;     // View system stats
  power_controls: boolean;        // Shutdown, restart, etc.
  process_control: boolean;       // View and terminate processes
  application_launching: boolean; // Launch allowed apps
  file_access: boolean;           // Browse/manage files
  clipboard_sync: boolean;        // Sync clipboard
  remote_input: boolean;          // Mouse/keyboard control
}
```

### Permission Checks

Every API endpoint checks permissions:

```rust
fn check_permission(device: &Device, permission: Permission) -> Result<()> {
    if !device.permissions.has(permission) {
        return Err(Error::PermissionDenied);
    }
    Ok(())
}
```

### Default Permissions

Newly paired devices get:
- `system_monitoring`: **enabled** (safe, read-only)
- All other permissions: **disabled** by default

User must explicitly enable each permission from desktop UI.

## Transport Security

### TLS Configuration

**Desktop Server:**
- TLS 1.3 only (no TLS 1.2/1.1/1.0)
- Self-signed certificate generated on first run
- Certificate pinned on mobile app after pairing
- Forward secrecy enabled
- Strong cipher suites only

**Cipher Suites (priority order):**
1. TLS_AES_256_GCM_SHA384
2. TLS_CHACHA20_POLY1305_SHA256
3. TLS_AES_128_GCM_SHA256

### Certificate Pinning

Mobile app pins desktop certificate on first successful pairing:
- Public key hash stored securely
- All subsequent connections verify against pin
- Prevents MITM even if CA is compromised
- Pin rotation supported via re-pairing

## Input Validation

### API Request Validation

All API requests are validated:

```typescript
// Example: File path validation
function validateFilePath(path: string): Result<string> {
  // Normalize path
  const normalized = path.normalize();
  
  // Prevent path traversal
  if (normalized.includes('..')) {
    return Err('Path traversal detected');
  }
  
  // Check against allowed directories
  if (!isPathAllowed(normalized)) {
    return Err('Path not in allowed list');
  }
  
  return Ok(normalized);
}
```

### File System Security

**Allowed Directories**
- Must be explicitly configured by user
- Default: None (file access disabled until configured)
- Recommended: Documents, Downloads, specific project folders
- Never: System directories, Program Files, Windows

**File Operations**
- All paths normalized and validated
- Symbolic links resolved and checked
- Operations logged
- Large file uploads rate-limited

### Process Control

**Process Termination**
- Requires `process_control` permission
- Cannot terminate system-critical processes
- Process list: `System`, `csrss.exe`, `smss.exe`, `wininit.exe`
- Confirmation required on mobile
- Every termination logged

**Application Launching**
- Requires `application_launching` permission
- Only applications in allowlist can be launched
- No arbitrary command execution
- No command-line argument support (prevent injection)
- Executable path validated against allowlist

## Secure Storage

### Desktop Storage

**SQLite Database**
- Located in: `%APPDATA%/pccontrol/pccontrol.db`
- File permissions: User only (no group/others)
- Device secrets encrypted at rest using DPAPI (Windows)
- Database encrypted with SQLCipher (future enhancement)

**Logs**
- Located in: `%APPDATA%/pccontrol/logs/`
- No secrets logged (tokens, secrets, passwords)
- IP addresses logged (legitimate)
- Rotated daily, kept for 30 days

### Mobile Storage

**React Native Secure Storage**
- Uses Keychain (iOS) and Keystore (Android)
- Credentials encrypted by OS
- Biometric protection available
- Cleared on app uninstall

**Stored Data:**
- Device credentials (secret, tokens)
- Certificate pins
- PC connection info (IP, hostname)
- User preferences

## Logging and Monitoring

### Security Events Logged

```typescript
enum SecurityEvent {
  DEVICE_PAIRED = 'device.paired',
  DEVICE_CONNECTED = 'device.connected',
  DEVICE_DISCONNECTED = 'device.disconnected',
  AUTH_FAILED = 'auth.failed',
  PERMISSION_DENIED = 'permission.denied',
  PROCESS_TERMINATED = 'process.terminated',
  POWER_ACTION = 'power.action',
  FILE_ACCESSED = 'file.accessed',
  APP_LAUNCHED = 'app.launched',
  DEVICE_REVOKED = 'device.revoked',
}
```

### Log Format

```json
{
  "timestamp": "2026-08-29T13:36:36.084Z",
  "level": "WARN",
  "event": "auth.failed",
  "device_id": "abc123",
  "message": "Invalid token signature",
  "metadata": {
    "ip": "192.168.1.50",
    "attempts": 3
  }
}
```

## Rate Limiting

To prevent abuse:

**Authentication**
- 5 failed attempts per device ID per hour
- 10 pairing attempts per IP per hour

**API Requests**
- 100 requests per minute per device
- 1000 requests per hour per device

**File Operations**
- 50 file operations per minute
- 100 MB upload per minute

Exceeded limits return HTTP 429.

## Device Revocation

### Manual Revocation

User can revoke devices from desktop UI:
1. Go to **Security** → **Devices**
2. Select device
3. Click **Revoke Access**
4. Device credentials immediately blacklisted
5. Active connections terminated
6. All tokens invalidated

### Automatic Revocation

Devices are automatically revoked if:
- Not seen in 90 days (configurable)
- Multiple authentication failures (10+)
- Suspicious behavior detected

## Remote Input Security

Remote input is the most sensitive feature.

**Protection Mechanisms:**

1. **Disabled by default** - User must explicitly enable
2. **Requires permission** - Separate from other permissions
3. **Visual indicator** - Desktop shows when remote input is active
4. **Session timeout** - Auto-disables after 10 minutes of inactivity
5. **Quick disable** - Desktop hotkey to immediately disable (Ctrl+Alt+End)
6. **Logging** - All input events logged

**Recommendations:**
- Only enable when actively using
- Use for convenience, not as primary input method
- Disable when not at desk
- Be aware of clipboard sync implications

## Network Security

### mDNS Security

mDNS discovery broadcasts PC presence on local network.

**Mitigations:**
- Only advertises on private network interfaces
- Does not reveal sensitive information
- Pairing still required for access
- Can be disabled in settings

### Firewall Configuration

Desktop application should be configured in Windows Firewall:
- Allow inbound on private networks only
- Block on public networks
- Use specific port (8421)

## Clipboard Synchronization

Clipboard sync can leak sensitive data.

**Protection:**
- Disabled by default
- Requires explicit permission
- User confirmation on first sync
- Can be temporarily disabled
- Sensitive patterns detected and warned:
  - Password-like strings
  - Credit card numbers
  - Private keys

## Vulnerability Disclosure

If you discover a security vulnerability:

1. **DO NOT** open a public issue
2. Email: nybentulan@gmail.com
3. Include: description, reproduction steps, impact assessment
4. Allow 90 days for fix before public disclosure

## Security Checklist

### For Users

- [ ] Only pair trusted devices
- [ ] Review permissions before enabling
- [ ] Regularly review paired devices
- [ ] Revoke unused devices
- [ ] Keep software updated
- [ ] Use strong device passwords/biometrics
- [ ] Enable remote input only when needed
- [ ] Review logs periodically
- [ ] Use firewall on private networks only

### For Developers

- [ ] All inputs validated
- [ ] Permissions checked on every endpoint
- [ ] No arbitrary command execution
- [ ] Paths normalized and validated
- [ ] Secrets never logged
- [ ] TLS properly configured
- [ ] Rate limiting implemented
- [ ] Secure storage used
- [ ] Dependencies kept updated
- [ ] Security tests passing

## Known Limitations

1. **Local network assumed semi-trusted** - MITM possible if attacker controls router
2. **No remote access over internet** - Currently LAN-only (by design)
3. **Desktop must stay running** - No wake-on-LAN support yet
4. **Single user per PC** - No multi-user support
5. **Windows only** - macOS/Linux not yet supported

## Future Security Enhancements

- End-to-end encryption for remote access over internet
- Hardware security key support (FIDO2)
- SQLCipher database encryption
- Intrusion detection system
- Anomaly detection for unusual commands
- Security audit log export
- Multi-factor authentication
- Geofencing (only allow from certain locations)
