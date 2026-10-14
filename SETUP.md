# Setup Guide

## Prerequisites

### For Desktop Development

1. **Rust** (1.70+)
   ```bash
   # Windows - Download from https://rustup.rs/
   # Or use winget:
   winget install Rustlang.Rustup
   ```

2. **Node.js** (18+) and npm
   - Already installed (detected v24.18.0)

3. **Visual Studio Build Tools** (for Windows native compilation)
   - Download from: https://visualstudio.microsoft.com/downloads/
   - Install "Desktop development with C++" workload

### For Mobile Development

1. **Node.js** (18+) and npm - Already installed

2. **React Native CLI**
   ```bash
   npm install -g react-native-cli
   ```

3. **For Android:**
   - Android Studio with SDK 29+
   - Android NDK
   - Add Android SDK to PATH

4. **For iOS (Mac only):**
   - Xcode 14+
   - CocoaPods: `sudo gem install cocoapods`

## Installation

### 1. Clone and Install Dependencies

```bash
cd C:/Users/nyohi/OneDrive/Documents/projects/pccontrol

# Install desktop dependencies
cd desktop
npm install
cd ..

# Install mobile dependencies
cd mobile
npm install
cd ..
```

### 2. Build Shared Protocol

```bash
cd shared
npm install
npm run build
```

## Development

### Desktop Application

```bash
cd desktop

# Run in development mode (hot reload)
npm run tauri dev

# Build for production
npm run tauri build
```

The desktop app will:
- Start a system tray icon
- Launch the management UI at http://localhost:1420
- Start the API server on port 8421
- Advertise via mDNS as "PC Control - [YOUR-PC-NAME]"

### Mobile Application

#### Android

```bash
cd mobile

# Start Metro bundler
npm start

# In another terminal, run on Android
npm run android

# Or for release build
npm run android -- --variant=release
```

#### iOS (Mac only)

```bash
cd mobile

# Install iOS dependencies
cd ios
pod install
cd ..

# Run on iOS simulator
npm run ios

# Or for release build
npm run ios -- --configuration Release
```

## First Time Setup

### 1. Pair Devices

1. Start the desktop application
2. Open the mobile app
3. The mobile app should auto-discover your PC on the LAN
4. Tap the discovered PC
5. A 6-digit pairing code will appear on the desktop
6. Enter the code in the mobile app
7. Devices are now paired

### 2. Configure Permissions

In the desktop app:
1. Go to **Security** → **Devices**
2. Select the paired mobile device
3. Enable desired permissions:
   - System monitoring (always recommended)
   - Power controls
   - Process control
   - Application launching
   - File access
   - Clipboard sync
   - Remote input

### 3. Configure Application Allowlist

For security, only explicitly allowed applications can be launched remotely:

1. Go to **Applications** in desktop app
2. Click **Add Application**
3. Browse and select applications to allow
4. They'll now appear in the mobile app's Apps screen

### 4. Configure File Access

By default, file access is restricted:

1. Go to **Files** → **Settings** in desktop app
2. Add authorized directories (e.g., Documents, Downloads)
3. These directories will be browsable from the mobile app

## Testing

### Desktop Tests

```bash
cd desktop
cargo test
```

### Mobile Tests

```bash
cd mobile
npm test
```

### Integration Tests

```bash
# From project root
npm run test:integration
```

## Production Builds

### Desktop

```bash
cd desktop
npm run tauri build
```

Installer will be in: `desktop/src-tauri/target/release/bundle/`

### Android APK

```bash
cd mobile/android
./gradlew assembleRelease
```

APK will be in: `mobile/android/app/build/outputs/apk/release/`

### iOS IPA (Mac only)

```bash
cd mobile
# Archive in Xcode or use:
xcodebuild -workspace ios/PCControl.xcworkspace \
  -scheme PCControl \
  -configuration Release \
  -archivePath build/PCControl.xcarchive \
  archive
```

## Troubleshooting

### Desktop app won't start

- Check if port 8421 is already in use
- Verify Windows Firewall allows the application
- Check logs in: `%APPDATA%/pccontrol/logs/`

### Mobile app can't discover PC

- Ensure both devices are on the same network
- Check firewall settings on PC
- Try manual connection using PC's IP address
- Verify mDNS/Bonjour is working on your network

### Connection drops frequently

- Check Wi-Fi signal strength
- Disable battery optimization for the mobile app
- Check if PC is going to sleep
- Review logs on both devices

### Remote input not working

- Verify "Remote input" permission is enabled for the device
- Ensure the desktop app has necessary accessibility permissions
- Check if another remote control app is interfering

## Environment Variables

Create `.env` files if needed:

### Desktop `.env`

```env
API_PORT=8421
LOG_LEVEL=info
RUST_LOG=warn
```

### Mobile `.env`

```env
DEFAULT_PORT=8421
ENABLE_DEBUG_LOGS=false
```

## Security Considerations

- Never commit pairing codes or device credentials
- Keep the desktop application updated
- Regularly review paired devices
- Use strong device passwords/biometrics
- Enable remote input only when needed
- Review application allowlist regularly
- Monitor logs for suspicious activity

## Getting Help

- Check logs in the desktop app's Logs section
- Review [ARCHITECTURE.md](ARCHITECTURE.md) for design details
- See [API.md](API.md) for protocol documentation
- Check [SECURITY.md](SECURITY.md) for security model
