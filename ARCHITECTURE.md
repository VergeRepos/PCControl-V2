# Architecture

## Overview

PC Control uses a client-server architecture where the desktop application acts as the server and the mobile app acts as the client. All control commands originate from the mobile client and are executed by the desktop server after authentication and authorization.

## Components

### Desktop Application (Rust + Tauri)

The desktop application consists of several modules:

#### Core Modules

```
desktop/src-tauri/src/
├── main.rs                 - Application entry, Tauri setup
├── api/                    - HTTP/WebSocket API handlers
│   ├── mod.rs
│   ├── system.rs           - System info endpoints
│   ├── processes.rs        - Process management
│   ├── power.rs            - Power control endpoints
│   ├── applications.rs     - App launcher
│   ├── files.rs            - File system API
│   └── auth.rs             - Authentication handlers
├── system/                 - Windows API wrappers
│   ├── mod.rs
│   ├── monitoring.rs       - CPU/GPU/RAM/Disk stats
│   ├── power.rs            - Power management
│   ├── processes.rs        - Process enumeration
│   └── temperature.rs      - Hardware temperature
├── security/               - Security and authentication
│   ├── mod.rs
│   ├── pairing.rs          - Device pairing logic
│   ├── auth.rs             - Token management
│   ├── permissions.rs      - Permission checks
│   └── crypto.rs           - Cryptographic operations
├── network/                - Network services
│   ├── mod.rs
│   ├── server.rs           - HTTP/WebSocket server
│   ├── discovery.rs        - mDNS advertising
│   └── websocket.rs        - WebSocket handler
├── database/               - Data persistence
│   ├── mod.rs
│   ├── schema.rs           - Database schema
│   └── queries.rs          - Database operations
├── clipboard/              - Clipboard sync
│   ├── mod.rs
│   └── sync.rs
├── input/                  - Remote input handling
│   ├── mod.rs
│   ├── mouse.rs
│   └── keyboard.rs
└── logger/                 - Structured logging
    └── mod.rs
```

#### Frontend (React + TypeScript)

```
desktop/src/
├── App.tsx                 - Main application component
├── pages/
│   ├── Dashboard.tsx       - System overview
│   ├── Devices.tsx         - Connected devices
│   ├── Processes.tsx       - Process list
│   ├── Applications.tsx    - App allowlist manager
│   ├── Files.tsx           - File permissions
│   ├── RemoteControl.tsx   - Remote input settings
│   ├── Security.tsx        - Security & pairing
│   ├── Settings.tsx        - App settings
│   └── Logs.tsx            - Event logs viewer
├── components/
│   ├── SystemStats.tsx     - Real-time statistics
│   ├── DeviceCard.tsx      - Device info card
│   ├── ProcessTable.tsx    - Process list table
│   ├── PermissionToggle.tsx
│   └── PairingDialog.tsx
└── services/
    ├── api.ts              - API client
    └── websocket.ts        - WebSocket client
```

### Mobile Application (React Native)

```
mobile/src/
├── App.tsx                 - Root component
├── navigation/
│   └── AppNavigator.tsx    - Tab navigation
├── screens/
│   ├── DashboardScreen.tsx - Main screen with stats
│   ├── ProcessesScreen.tsx - Process manager
│   ├── AppsScreen.tsx      - App launcher
│   ├── FilesScreen.tsx     - File browser
│   ├── RemoteScreen.tsx    - Touchpad/keyboard
│   ├── SettingsScreen.tsx  - Settings
│   ├── PairingScreen.tsx   - Device pairing flow
│   └── DiscoveryScreen.tsx - PC discovery
├── components/
│   ├── StatCard.tsx        - Dashboard stat card
│   ├── ProcessRow.tsx      - Process list item
│   ├── PowerButton.tsx     - Power control button
│   ├── FileRow.tsx         - File list item
│   ├── Touchpad.tsx        - Remote input touchpad
│   └── ConfirmDialog.tsx   - Confirmation modal
├── services/
│   ├── api.ts              - API client
│   ├── websocket.ts        - WebSocket connection
│   ├── discovery.ts        - mDNS discovery
│   └── storage.ts          - Secure storage
└── state/
    ├── store.ts            - Redux store
    ├── slices/
    │   ├── connection.ts
    │   ├── system.ts
    │   └── settings.ts
    └── hooks.ts
```

### Shared Protocol

```
shared/
├── protocol/
│   ├── messages.ts         - Request/response types
│   ├── events.ts           - WebSocket event types
│   └── models.ts           - Shared data models
└── schemas/
    └── validation.ts       - JSON schema validation
```

## Communication Protocol

### Initial Pairing

```
Mobile                          Desktop
  |                               |
  |------ mDNS Discovery -------->|
  |<------ Service Info ----------|
  |                               |
  |------ Pairing Request ------->|
  |                               |
  |                          (Generate code)
  |                          (Display code)
  |                               |
  |------ Submit Code ----------->|
  |                               |
  |                          (Validate code)
  |                          (Generate keys)
  |                               |
  |<----- Device Credentials -----|
  |                               |
 (Store                      (Store device)
  credentials)
```

### Authenticated Connection

```
Mobile                          Desktop
  |                               |
  |------ Connect WS ------------>|
  |------ Auth Token ------------>|
  |                               |
  |                          (Validate token)
  |                               |
  |<----- Auth Success ----------|
  |<----- System Stats Stream ----|
  |                               |
  |------ API Request ----------->|
  |                               |
  |                          (Check permissions)
  |                          (Execute command)
  |                               |
  |<----- Response ---------------|
```

### WebSocket Events

Real-time events pushed from desktop to mobile:

- `system.stats` - System metrics (every 2 seconds)
- `process.updated` - Process list changed
- `connection.status` - Connection state change
- `notification.created` - System notification
- `power.state` - Power state change
- `clipboard.changed` - Clipboard content changed

## API Endpoints

### REST API

All endpoints require authentication header:
```
Authorization: Bearer <token>
```

#### System
- `GET /api/system` - Get system information
- `GET /api/system/stats` - Get current statistics

#### Processes
- `GET /api/processes` - List running processes
- `POST /api/processes/{pid}/terminate` - Terminate process

#### Power
- `POST /api/power/shutdown` - Shutdown PC
- `POST /api/power/restart` - Restart PC
- `POST /api/power/sleep` - Sleep PC
- `POST /api/power/hibernate` - Hibernate PC
- `POST /api/power/lock` - Lock workstation
- `POST /api/power/logout` - Log out user
- `DELETE /api/power/pending` - Cancel pending action

#### Applications
- `GET /api/applications` - List allowed applications
- `POST /api/applications/{id}/launch` - Launch application

#### Files
- `GET /api/files?path=<path>` - List directory
- `GET /api/files/download?path=<path>` - Download file
- `POST /api/files/upload` - Upload file
- `POST /api/files/mkdir` - Create directory
- `PUT /api/files/rename` - Rename file/folder
- `DELETE /api/files?path=<path>` - Delete file/folder

#### Clipboard
- `GET /api/clipboard` - Get clipboard content
- `POST /api/clipboard` - Set clipboard content

#### Input
- `POST /api/input/mouse/move` - Move mouse
- `POST /api/input/mouse/click` - Mouse click
- `POST /api/input/mouse/scroll` - Scroll
- `POST /api/input/keyboard` - Send keystrokes

## Security Architecture

### Device Pairing

1. Desktop generates a random 6-digit pairing code (valid 5 minutes)
2. Mobile submits code to `/api/pairing/verify`
3. Desktop generates:
   - Device ID (UUID)
   - Shared secret (256-bit)
   - Initial access token (JWT, 24h expiry)
4. Mobile stores credentials in secure storage
5. Subsequent connections use token-based auth

### Authentication Flow

- Access tokens are JWT with 24-hour expiry
- Refresh tokens are used to obtain new access tokens
- All tokens are cryptographically signed
- Revoked devices' tokens are blacklisted

### Authorization

Each device has granular permissions:

```typescript
interface DevicePermissions {
  system_monitoring: boolean;
  power_controls: boolean;
  process_control: boolean;
  application_launching: boolean;
  file_access: boolean;
  clipboard_sync: boolean;
  remote_input: boolean;
}
```

Every API call checks permissions before execution.

### Transport Security

- HTTPS for REST API (self-signed cert in LAN mode)
- WSS (WebSocket over TLS) for real-time events
- Certificate pinning on mobile app
- Path traversal prevention
- Input validation and sanitization

## Data Storage

### Desktop (SQLite)

**Devices table:**
```sql
CREATE TABLE devices (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  paired_at INTEGER NOT NULL,
  last_seen INTEGER,
  secret TEXT NOT NULL,
  permissions TEXT NOT NULL -- JSON
);
```

**Allowed applications:**
```sql
CREATE TABLE applications (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  icon BLOB
);
```

**Logs:**
```sql
CREATE TABLE logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,
  level TEXT NOT NULL,
  category TEXT NOT NULL,
  message TEXT NOT NULL,
  device_id TEXT,
  metadata TEXT -- JSON
);
```

### Mobile (Secure Storage)

- Device credentials (encrypted)
- Connection history
- App settings
- Cached PC information

## Network Discovery

### mDNS Service Advertising

Desktop advertises:
```
Service: _pccontrol._tcp.local.
Name: PC Control - [HOSTNAME]
Port: 8421
TXT records:
  - version=1.0.0
  - platform=windows
  - hostname=[HOSTNAME]
  - id=[DEVICE_ID]
```

Mobile discovers using Bonjour/mDNS browser.

## Performance Considerations

- System stats cached for 500ms to limit Windows API calls
- Process list cached for 2s
- WebSocket events use binary encoding where applicable
- File transfers use chunked encoding
- Automatic reconnection uses exponential backoff (1s → 32s max)

## Logging

Structured logs include:
- Timestamp (ISO 8601)
- Level (DEBUG, INFO, WARN, ERROR)
- Category (API, AUTH, SYSTEM, NETWORK)
- Message
- Device ID (if applicable)
- Metadata (JSON)

Desktop logs stored in: `%APPDATA%/pccontrol/logs/`

## Error Handling

All errors use consistent format:

```typescript
interface ErrorResponse {
  error: {
    code: string;           // ERROR_CODE
    message: string;        // Human-readable
    details?: any;          // Optional context
  }
}
```

Error codes:
- `AUTH_FAILED` - Authentication failed
- `PERMISSION_DENIED` - Missing permission
- `INVALID_REQUEST` - Validation error
- `NOT_FOUND` - Resource not found
- `SYSTEM_ERROR` - Internal error
- `RATE_LIMITED` - Too many requests

## Deployment

### Desktop
- Installed via Windows installer
- Runs on startup (optional)
- System tray icon for quick access
- Auto-update capability (future)

### Mobile
- Distributed via app stores
- Background refresh for notifications
- Certificate pinning for security
- Crash reporting (optional)
