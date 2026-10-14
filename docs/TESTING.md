# Testing Guide

## Running Tests

### Desktop Tests

```bash
cd desktop/src-tauri
cargo test
```

#### Key Test Areas

**Security Module Tests:**
- Pairing code generation (6 digits, numeric)
- Pairing code verification
- Token generation and validation
- Permission checks

**Database Tests:**
- Device CRUD operations
- Application storage
- Log persistence
- SQLite schema validation

**System Module Tests:**
- Process enumeration
- Protected process list
- System info gathering

### Mobile Tests

```bash
cd mobile
npm test
```

#### Test Coverage

**Connection Tests:**
- WebSocket authentication
- Reconnection logic
- Token refresh

**UI Tests:**
- Component rendering
- Navigation flow
- Input validation

## Integration Tests

### Manual Integration Test Flow

1. **Pairing Test**
   ```
   ✓ Start desktop app
   ✓ Generate pairing code
   ✓ Open mobile app
   ✓ Enter PC IP and code
   ✓ Verify successful pairing
   ✓ Check device appears in desktop app
   ```

2. **System Monitoring Test**
   ```
   ✓ Connect mobile to desktop
   ✓ Verify real-time stats display
   ✓ Check CPU, GPU, RAM values are realistic
   ✓ Monitor WebSocket updates (2s interval)
   ```

3. **Process Management Test**
   ```
   ✓ View processes from mobile
   ✓ Launch a test process (e.g., Notepad)
   ✓ Terminate the process
   ✓ Verify termination succeeded
   ✓ Test protected process rejection
   ```

4. **Power Controls Test** (Use VM or test PC!)
   ```
   ✓ Test Lock (safe)
   ✓ Test Sleep (if safe)
   ✓ DO NOT test Shutdown/Restart on dev machine
   ```

5. **Permission Test**
   ```
   ✓ Disable process_control permission
   ✓ Attempt to terminate process from mobile
   ✓ Verify permission denied error
   ✓ Re-enable permission
   ✓ Verify action succeeds
   ```

6. **Security Test**
   ```
   ✓ Revoke device from desktop
   ✓ Verify mobile connection fails
   ✓ Re-pair device
   ✓ Test with wrong IP
   ✓ Test with expired code
   ```

7. **Remote Input Test** (if enabled)
   ```
   ✓ Enable remote_input permission
   ✓ Test mouse movement
   ✓ Test left/right click
   ✓ Test scrolling
   ✓ Disable permission
   ```

## Path Traversal Tests

The file system API must reject path traversal attempts:

```rust
#[test]
fn test_path_traversal_prevention() {
    // These should all be rejected
    assert!(validate_path("../../etc/passwd").is_err());
    assert!(validate_path("..\\..\\Windows\\System32").is_err());
    assert!(validate_path("/etc/shadow").is_err());
}
```

## Rate Limiting Tests

Test that rate limits are enforced:

```bash
# Should succeed
for i in {1..100}; do curl -H "Authorization: Bearer $TOKEN" http://localhost:8421/api/system/stats; done

# 101st request should return 429
curl -H "Authorization: Bearer $TOKEN" http://localhost:8421/api/system/stats
```

## Authentication Tests

Test authentication edge cases:

```bash
# No token - should fail
curl http://localhost:8421/api/system/stats

# Invalid token - should fail
curl -H "Authorization: Bearer invalid" http://localhost:8421/api/system/stats

# Expired token - should fail
curl -H "Authorization: Bearer <expired-token>" http://localhost:8421/api/system/stats

# Valid token - should succeed
curl -H "Authorization: Bearer <valid-token>" http://localhost:8421/api/system/stats
```

## Network Failure Tests

Test reconnection logic:

1. Connect mobile to desktop
2. Disable network on mobile
3. Wait 10 seconds
4. Re-enable network
5. Verify automatic reconnection

## Expected Test Results

### Security Module
- ✓ All pairing code tests pass
- ✓ Token validation works correctly
- ✓ Permission checks enforce access control
- ✓ Protected processes cannot be terminated

### API Module
- ✓ Authentication required for all endpoints
- ✓ Permissions checked before actions
- ✓ Path traversal prevented
- ✓ Rate limiting enforced

### System Module
- ✓ System stats return realistic values
- ✓ Process list is accurate
- ✓ Temperature readings (if available)

### Mobile App
- ✓ Pairing flow completes successfully
- ✓ Real-time stats update
- ✓ Power controls trigger correctly
- ✓ Permission errors handled gracefully

## CI/CD Integration

Add to your CI pipeline:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  desktop-tests:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      - uses: dtolnay/rust-toolchain@stable
      - run: cd desktop/src-tauri && cargo test

  mobile-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: cd mobile && npm ci && npm test
```

## Known Limitations

- CPU temperature may not be available on all systems
- GPU stats require NVIDIA GPU with NVML
- Remote input tests require desktop access
- Power action tests should use a VM
