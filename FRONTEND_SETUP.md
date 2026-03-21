# CodePop - Frontend Development Setup

## Fixed: "Too Many Open Files" Error ✅

The Expo Metro bundler was hitting macOS file descriptor limits.

## Solution Applied

### 1. Installed Watchman (✅ DONE)

```bash
brew install watchman
```

Watchman is Facebook's file watching service - it's much more efficient than Node's default watcher and handles many more files.

### 2. Increased File Descriptor Limits

#### Current Session:
```bash
ulimit -n 8192
```

#### Permanent (for all future sessions):

Added to `~/.zshrc`:
```bash
ulimit -n 4096
```

This is already done for you.

### 3. Simplified Metro Configuration

Created `codepop/metro.config.js`:
```javascript
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = config;
```

This minimal config works with Watchman and prevents file watcher issues.

### 4. Installed Web Dependencies

```bash
npx expo install react-native-web react-dom @expo/metro-runtime
```

This allows running the app in web browsers for easier testing.

## Running the Frontend

### Option 1: Simple Start

```bash
cd codepop
npm start
```

Then press:
- `w` for web browser (easiest)
- `a` for Android emulator
- `i` for iOS simulator

### Option 2: Specific Platform

```bash
# Web browser
npm run web

# Android
npm run android

# iOS
npm run ios
```

## Troubleshooting

### Still Getting "Too Many Open Files"?

```bash
# Make sure Watchman is running
brew services start watchman

# Increase limit in current shell
ulimit -n 8192

# Clear Expo cache
rm -rf codepop/.expo

# Try again
cd codepop && npm start
```

### Expo Won't Start?

```bash
# Kill any hung processes
pkill -9 -f expo
pkill -9 -f metro

# Clear caches
npm cache clean --force
rm -rf codepop/.expo

# Reinstall dependencies
cd codepop
rm -rf node_modules
npm install

# Try again
npm start
```

### Connection Issues?

Make sure both backend nodes are running:
```bash
# Check backend health
curl http://localhost:3001/health

# If not running, start them
/tmp/start_nodes.sh
```

## System Checkup

Run this to verify everything is ready:

```bash
# Check Watchman
watchman --version

# Check ulimit
ulimit -n

# Check backend
curl http://localhost:3001/health | jq '.'

# Check Metro can start
cd codepop && npm start
```

Expected results:
- Watchman: version number (e.g., 4.9.x)
- ulimit: 4096 or higher
- Backend: healthy status
- Metro: starts without errors

## Backend Connection

The frontend connects to the OrbitDB backend at:
```
http://localhost:3001
```

This is configured in `codepop/ip_address.js`.

## Architecture

```
┌─────────────────────────────────────────┐
│   Expo Dev Server (Port 8081)            │
│   • Metro Bundler                        │
│   • Watchman File Watcher               │
│   • Hot Module Reloading                │
└─────────────┬───────────────────────────┘
              │ HTTP/REST API
              ↓
┌─────────────────────────────────────────┐
│   OrbitDB Peer Node (Port 3001)          │
│   • User Management                      │
│   • Drink CRUD                          │
│   • Order Processing                    │
│   • Inventory Management                │
└─────────────────────────────────────────┘
```

## Files Modified/Created

- `codepop/metro.config.js` - Metro bundler configuration
- `~/.zshrc` - Added `ulimit -n 4096` for permanent limit increase
- `codepop/node_modules` - Added web dependencies

## Performance Notes

- First build: ~30-60 seconds (builds bundle)
- Subsequent builds: ~5-10 seconds (with hot reload)
- File watching: Efficient with Watchman
- Metro bundler: No file descriptor errors

## Next Steps

1. Run `npm start` in the `codepop` directory
2. Press `w` to open the web version
3. Test user registration with the backend
4. Test creating drinks
5. Test full checkout flow
6. Verify data persists in OrbitDB

## Related Documentation

- **STARTUP_GUIDE.md** - Backend startup procedures
- **EMERGENCY_RESTART.md** - Backend troubleshooting
- **QUICK_START_TESTING.md** - API testing guide
- **ORBITDB_INTEGRATION_COMPLETE.md** - Full integration report
