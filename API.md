# API Documentation

## Base URL

```
https://<pc-ip>:8421/api
```

## Authentication

All API requests (except pairing) require authentication.

### Authorization Header

```http
Authorization: Bearer <access_token>
```

### Token Refresh

When access token expires (24h), use refresh token:

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refresh_token": "..."
}
```

**Response:**
```json
{
  "access_token": "...",
  "refresh_token": "...",
  "expires_in": 86400
}
```

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

**Error Codes:**
- `AUTH_FAILED` - Authentication failed
- `PERMISSION_DENIED` - Missing required permission
- `INVALID_REQUEST` - Request validation failed
- `NOT_FOUND` - Resource not found
- `SYSTEM_ERROR` - Internal server error
- `RATE_LIMITED` - Too many requests

## Pairing

### Initiate Pairing

Desktop generates code, mobile does not call an endpoint. Desktop UI displays the code.

### Submit Pairing Code

```http
POST /api/pairing/verify
Content-Type: application/json

{
  "code": "123456",
  "device_name": "John's iPhone",
  "device_type": "mobile"
}
```

**Response:**
```json
{
  "device_id": "uuid-v4",
  "access_token": "jwt-token",
  "refresh_token": "refresh-token",
  "expires_in": 86400,
  "secret": "base64-encoded-secret"
}
```

**Errors:**
- `INVALID_CODE` - Code incorrect or expired
- `PAIRING_DISABLED` - Pairing not active on desktop

## System Information

### Get System Info

```http
GET /api/system
```

**Permission:** `system_monitoring`

**Response:**
```json
{
  "hostname": "DESKTOP-PC",
  "os_version": "Windows 11 Pro 10.0.26200",
  "cpu": {
    "model": "Intel Core i7-9700K",
    "cores": 8,
    "threads": 8
  },
  "gpu": {
    "model": "NVIDIA GeForce RTX 3070",
    "memory": 8589934592
  },
  "memory": {
    "total": 17179869184,
    "available": 8589934592
  },
  "storage": [
    {
      "drive": "C:",
      "total": 1000000000000,
      "available": 500000000000,
      "type": "NTFS"
    }
  ],
  "uptime": 345600
}
```

### Get Current Statistics

```http
GET /api/system/stats
```

**Permission:** `system_monitoring`

**Response:**
```json
{
  "timestamp": 1724940996084,
  "cpu": {
    "usage_percent": 42.5,
    "temperature": 58.0
  },
  "gpu": {
    "usage_percent": 37.2,
    "temperature": 65.0,
    "memory_used": 4294967296
  },
  "memory": {
    "used": 8589934592,
    "available": 8589934592,
    "usage_percent": 50.0
  },
  "network": {
    "download_bytes_per_sec": 12582912,
    "upload_bytes_per_sec": 3145728
  },
  "disk": {
    "read_bytes_per_sec": 1048576,
    "write_bytes_per_sec": 2097152
  }
}
```

## Processes

### List Processes

```http
GET /api/processes
```

**Permission:** `process_control` or `system_monitoring`

**Query Parameters:**
- `sort` - Sort field: `name`, `cpu`, `memory` (default: `name`)
- `order` - Sort order: `asc`, `desc` (default: `asc`)
- `filter` - Filter by name (case-insensitive substring)

**Response:**
```json
{
  "processes": [
    {
      "pid": 1234,
      "name": "chrome.exe",
      "cpu_percent": 15.5,
      "memory_bytes": 524288000,
      "status": "running",
      "path": "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "user": "DESKTOP-PC\\User"
    }
  ],
  "total": 156
}
```

### Terminate Process

```http
POST /api/processes/{pid}/terminate
```

**Permission:** `process_control`

**Response:**
```json
{
  "success": true,
  "message": "Process 1234 terminated"
}
```

**Errors:**
- `PROCESS_NOT_FOUND` - Process does not exist
- `PROCESS_PROTECTED` - Cannot terminate system process
- `ACCESS_DENIED` - Insufficient privileges

## Power Control

### Shutdown

```http
POST /api/power/shutdown
Content-Type: application/json

{
  "force": false,
  "delay_seconds": 0
}
```

**Permission:** `power_controls`

**Response:**
```json
{
  "success": true,
  "message": "Shutdown initiated",
  "action_id": "uuid"
}
```

### Restart

```http
POST /api/power/restart
Content-Type: application/json

{
  "force": false,
  "delay_seconds": 0
}
```

**Permission:** `power_controls`

### Sleep

```http
POST /api/power/sleep
```

**Permission:** `power_controls`

### Hibernate

```http
POST /api/power/hibernate
```

**Permission:** `power_controls`

### Lock Workstation

```http
POST /api/power/lock
```

**Permission:** `power_controls`

### Logout

```http
POST /api/power/logout
Content-Type: application/json

{
  "force": false
}
```

**Permission:** `power_controls`

### Cancel Pending Action

```http
DELETE /api/power/pending/{action_id}
```

**Permission:** `power_controls`

## Applications

### List Allowed Applications

```http
GET /api/applications
```

**Permission:** `application_launching`

**Response:**
```json
{
  "applications": [
    {
      "id": "uuid",
      "name": "Visual Studio Code",
      "path": "C:\\Program Files\\Microsoft VS Code\\Code.exe",
      "icon": "base64-encoded-icon"
    }
  ]
}
```

### Launch Application

```http
POST /api/applications/{id}/launch
```

**Permission:** `application_launching`

**Response:**
```json
{
  "success": true,
  "pid": 5678,
  "message": "Application launched"
}
```

**Errors:**
- `APP_NOT_FOUND` - Application not in allowlist
- `APP_ALREADY_RUNNING` - Application already has running instance
- `LAUNCH_FAILED` - Failed to start application

## File System

### List Directory

```http
GET /api/files?path=/Users/User/Documents
```

**Permission:** `file_access`

**Response:**
```json
{
  "path": "C:\\Users\\User\\Documents",
  "entries": [
    {
      "name": "file.txt",
      "type": "file",
      "size": 1024,
      "modified": 1724940996084,
      "permissions": "rw-"
    },
    {
      "name": "folder",
      "type": "directory",
      "size": 0,
      "modified": 1724940996084,
      "permissions": "rwx"
    }
  ]
}
```

### Download File

```http
GET /api/files/download?path=/Users/User/Documents/file.txt
```

**Permission:** `file_access`

**Response:** Raw file content with appropriate Content-Type

### Upload File

```http
POST /api/files/upload
Content-Type: multipart/form-data

path: /Users/User/Documents/
file: <binary>
```

**Permission:** `file_access`

**Response:**
```json
{
  "success": true,
  "path": "C:\\Users\\User\\Documents\\file.txt",
  "size": 1024
}
```

### Create Directory

```http
POST /api/files/mkdir
Content-Type: application/json

{
  "path": "/Users/User/Documents/NewFolder"
}
```

**Permission:** `file_access`

### Rename File/Folder

```http
PUT /api/files/rename
Content-Type: application/json

{
  "old_path": "/Users/User/Documents/old.txt",
  "new_path": "/Users/User/Documents/new.txt"
}
```

**Permission:** `file_access`

### Delete File/Folder

```http
DELETE /api/files?path=/Users/User/Documents/file.txt
```

**Permission:** `file_access`

**Response:**
```json
{
  "success": true,
  "message": "File deleted"
}
```

## Clipboard

### Get Clipboard Content

```http
GET /api/clipboard
```

**Permission:** `clipboard_sync`

**Response:**
```json
{
  "content": "clipboard text content",
  "type": "text",
  "timestamp": 1724940996084
}
```

### Set Clipboard Content

```http
POST /api/clipboard
Content-Type: application/json

{
  "content": "new clipboard content",
  "type": "text"
}
```

**Permission:** `clipboard_sync`

## Remote Input

### Move Mouse

```http
POST /api/input/mouse/move
Content-Type: application/json

{
  "x": 100,
  "y": 200,
  "relative": true
}
```

**Permission:** `remote_input`

**Fields:**
- `x`, `y` - Coordinates
- `relative` - If true, move relative to current position

### Mouse Click

```http
POST /api/input/mouse/click
Content-Type: application/json

{
  "button": "left",
  "action": "click"
}
```

**Permission:** `remote_input`

**Fields:**
- `button` - `left`, `right`, `middle`
- `action` - `click`, `double`, `down`, `up`

### Mouse Scroll

```http
POST /api/input/mouse/scroll
Content-Type: application/json

{
  "delta": -120,
  "horizontal": false
}
```

**Permission:** `remote_input`

### Send Keyboard Input

```http
POST /api/input/keyboard
Content-Type: application/json

{
  "text": "Hello World"
}
```

**Permission:** `remote_input`

**Note:** Only text input supported. No special keys or key combinations.

## WebSocket Events

Connect to: `wss://<pc-ip>:8421/ws`

Send authentication immediately after connecting:

```json
{
  "type": "auth",
  "token": "access-token"
}
```

### Events from Server

#### system.stats

Real-time system statistics (sent every 2 seconds):

```json
{
  "type": "system.stats",
  "data": {
    "timestamp": 1724940996084,
    "cpu": {"usage_percent": 42.5, "temperature": 58.0},
    "gpu": {"usage_percent": 37.2, "temperature": 65.0},
    "memory": {"usage_percent": 50.0},
    "network": {
      "download_bytes_per_sec": 12582912,
      "upload_bytes_per_sec": 3145728
    }
  }
}
```

#### process.updated

Sent when process list changes:

```json
{
  "type": "process.updated",
  "data": {
    "action": "started",
    "pid": 5678,
    "name": "chrome.exe"
  }
}
```

#### notification.created

System notification:

```json
{
  "type": "notification.created",
  "data": {
    "id": "uuid",
    "severity": "warning",
    "title": "High CPU Usage",
    "message": "CPU usage has exceeded 90% for 5 minutes",
    "timestamp": 1724940996084
  }
}
```

#### connection.status

Connection state changed:

```json
{
  "type": "connection.status",
  "data": {
    "status": "connected",
    "message": "Connected from 192.168.1.50"
  }
}
```

#### power.state

Power state changing:

```json
{
  "type": "power.state",
  "data": {
    "action": "shutdown",
    "delay_seconds": 60,
    "action_id": "uuid"
  }
}
```

#### clipboard.changed

Clipboard content changed (if sync enabled):

```json
{
  "type": "clipboard.changed",
  "data": {
    "content": "new content",
    "type": "text",
    "timestamp": 1724940996084
  }
}
```

### Events from Client

#### ping

Keepalive:

```json
{
  "type": "ping"
}
```

Server responds with:

```json
{
  "type": "pong",
  "timestamp": 1724940996084
}
```

## Rate Limits

- Authentication: 5 failures per hour per device
- API requests: 100 per minute, 1000 per hour per device
- File operations: 50 per minute
- File uploads: 100 MB per minute
- WebSocket messages: 120 per minute

Exceeded limits return HTTP 429 with:

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests",
    "details": {
      "retry_after": 60
    }
  }
}
```

## Examples

### Python Client Example

```python
import requests
import websocket
import json

class PCControlClient:
    def __init__(self, host, token):
        self.host = host
        self.token = token
        self.base_url = f"https://{host}:8421/api"
        
    def get_system_stats(self):
        headers = {"Authorization": f"Bearer {self.token}"}
        response = requests.get(f"{self.base_url}/system/stats", 
                              headers=headers, verify=False)
        return response.json()
    
    def shutdown(self):
        headers = {"Authorization": f"Bearer {self.token}"}
        data = {"force": False, "delay_seconds": 0}
        response = requests.post(f"{self.base_url}/power/shutdown",
                               headers=headers, json=data, verify=False)
        return response.json()

# Usage
client = PCControlClient("192.168.1.100", "your-access-token")
stats = client.get_system_stats()
print(f"CPU Usage: {stats['cpu']['usage_percent']}%")
```

### JavaScript/TypeScript Client

```typescript
class PCControlAPI {
  constructor(private host: string, private token: string) {}
  
  private async request(method: string, path: string, body?: any) {
    const response = await fetch(`https://${this.host}:8421/api${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error.message);
    }
    
    return response.json();
  }
  
  async getSystemStats() {
    return this.request('GET', '/system/stats');
  }
  
  async terminateProcess(pid: number) {
    return this.request('POST', `/processes/${pid}/terminate`);
  }
  
  async shutdown(force = false, delaySeconds = 0) {
    return this.request('POST', '/power/shutdown', { force, delay_seconds: delaySeconds });
  }
}
```
