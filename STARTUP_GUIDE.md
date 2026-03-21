# CodePop - OrbitDB Startup Guide

## Problems Resolved ✅

### Error 1: Database is not open
**Error**: `Database is not open - Resource temporarily unavailable`  
**Cause**: Lock file from previous shutdown  
**Solution**: Clean database directories and restart

### Error 2: No valid address (ERR_NO_VALID_ADDRESSES)
**Error**: `Transport (@libp2p/tcp) could not listen on any available address`  
**Cause**: Previous bootstrap process still holding port 4000 (libp2p TCP port)  
**Solution**: Force-kill all Node processes, clean directories, restart fresh

---

## Quick Start - 2 Minutes

### Step 1: Use the Automatic Startup Script (RECOMMENDED)

```bash
/tmp/start_nodes.sh
```

This script automatically:
- Force-kills any orphaned processes
- Cleans all repo directories and peer-info.json
- Starts bootstrap node
- Waits 8 seconds
- Starts peer node
- Verifies both nodes are healthy

### Step 2: Manual Startup (Alternative)

If you prefer manual startup:

```bash
cd codepop_backend/orbitdb

# Force kill any old processes
pkill -9 -f "node.*-node.js"

# Clean up old database files
rm -rf repo-bootstrap repo-peer-* peer-info.json

# Wait a moment for ports to be released
sleep 2

# Start Bootstrap Node (Terminal 1)
node bootstrap-node.js

# Wait 8 seconds, then start Peer Node (Terminal 2)
node peer-node.js
```

### Step 2: Verify Backend is Running

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "healthy",
  "nodeType": "peer",
  "port": 3001
}
```

### Step 3: Start Frontend

```bash
cd codepop
npm install  # if needed
npm start
```

Then choose:
- `i` for iOS simulator
- `a` for Android emulator
- `w` for web browser

---

## Troubleshooting

### If you get "Database is not open" error:

```bash
# 1. Force-kill any running processes (use -9 flag)
pkill -9 -f "node bootstrap-node.js"
pkill -9 -f "node peer-node.js"
sleep 2

# 2. Clean database directories
rm -rf codepop_backend/orbitdb/repo-bootstrap
rm -rf codepop_backend/orbitdb/repo-peer-*
rm codepop_backend/orbitdb/peer-info.json

# 3. Restart fresh
cd codepop_backend/orbitdb
node bootstrap-node.js  # Terminal 1
# Wait 8 seconds
node peer-node.js       # Terminal 2
```

### If you get "No valid address" or "ERR_NO_VALID_ADDRESSES" error:

This means ports 4000 or 4001 (libp2p ports) are locked by a previous process.

```bash
# 1. Check what's using the ports
lsof -i :4000
lsof -i :4001

# 2. Force-kill all Node processes
pkill -9 -f "node bootstrap-node.js"
pkill -9 -f "node peer-node.js"
sleep 3

# 3. Clean everything
rm -rf codepop_backend/orbitdb/repo-*
rm codepop_backend/orbitdb/peer-info.json

# 4. Restart (use the startup script or manual steps)
/tmp/start_nodes.sh
```

### If port 3000 or 3001 is already in use:

```bash
# Find and kill the process using port 3001
lsof -i :3001
kill -9 <PID>

# Or use a different port
PORT=3002 node peer-node.js
```

### If peer won't connect to bootstrap:

Make sure bootstrap is fully started before starting peer. Wait at least 8 seconds between starts.

### Check logs for errors:

```bash
# Bootstrap log
tail -f /tmp/bootstrap.log

# Peer log
tail -f /tmp/peer.log
```

---

## Running Processes

After startup, you should have 2 Node.js processes running:

```bash
ps aux | grep "node.*node.js"
```

You should see:
- `bootstrap-node.js` on port 3000
- `peer-node.js` on port 3001

---

## Testing the API

Once both nodes are running:

```bash
# Register user
curl -X POST http://localhost:3001/backend/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "Test@123",
    "email": "test@example.com"
  }'

# Get token from response and test authenticated request
TOKEN="your_token_here"

curl -X POST http://localhost:3001/backend/drinks/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Token $TOKEN" \
  -d '{
    "name": "Test Drink",
    "sodaUsed": ["Sprite"],
    "price": 3.50,
    "size": "16oz",
    "ice": "normal"
  }'
```

---

## Full Architecture

```
┌─────────────────────────────────────────────────────┐
│             React Native Frontend (Port 3000+)       │
│                                                       │
│    (iOS, Android, or Web via Expo)                  │
└─────────────────────┬───────────────────────────────┘
                      │ HTTP/REST API
                      ↓
┌─────────────────────────────────────────────────────┐
│         OrbitDB Peer Node (Port 3001)                │
│                                                       │
│  - Authentication Service                           │
│  - Drink Management                                 │
│  - Order Processing                                 │
│  - Inventory Management                             │
│  - User Preferences                                 │
└─────────────────┬──────────────────────────────────┘
                  │ P2P Gossipsub
                  ↓
┌─────────────────────────────────────────────────────┐
│      OrbitDB Bootstrap Node (Port 3000)              │
│                                                       │
│  - Initializes 8 Keyvalue Databases                 │
│  - Provides Database Addresses to Peers             │
│  - Manages Network Bootstrap                        │
└─────────────────────────────────────────────────────┘
```

---

## Database Files

When running, the following directories will be created:

```
codepop_backend/orbitdb/
├── repo-bootstrap/          # Bootstrap node data
│   ├── blocks/              # Blockstore data
│   ├── data/                # Datastore data
│   └── orbitdb/             # OrbitDB databases
│
└── repo-peer-3001/          # Peer node data (same structure)
```

These are safe to delete if needed - they'll be recreated when nodes start.

---

## Key Files

- **`codepop_backend/orbitdb/bootstrap-node.js`** - Bootstrap node entry point
- **`codepop_backend/orbitdb/peer-node.js`** - Peer node (API server) entry point
- **`codepop_backend/orbitdb/peer-info.json`** - Bootstrap node info (auto-generated)
- **`codepop/ip_address.js`** - Frontend API base URL configuration

---

## Common Commands

```bash
# View bootstrap logs
tail -f /tmp/bootstrap.log

# View peer logs
tail -f /tmp/peer.log

# Stop all nodes
pkill -f "bootstrap-node.js"
pkill -f "peer-node.js"

# Clean everything
rm -rf codepop_backend/orbitdb/repo-*
rm codepop_backend/orbitdb/peer-info.json

# Test API endpoints
curl http://localhost:3001/health

# Check npm dependencies
cd codepop_backend/orbitdb
npm list
```

---

## Documentation

For more detailed information, see:

- **ORBITDB_INTEGRATION_COMPLETE.md** - Comprehensive integration report
- **QUICK_START_TESTING.md** - Testing guide
- **API_ENDPOINTS.md** - Full API documentation (in `codepop_backend/orbitdb/`)

---

## Status Check

After startup, verify everything is working:

```bash
# 1. Check bootstrap health
curl http://localhost:3000/health

# 2. Check peer health  
curl http://localhost:3001/health

# 3. Test user registration
curl -X POST http://localhost:3001/backend/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"Test@123","email":"test@example.com"}'
```

All should return `"status": "healthy"` and registration should return a valid token.

---

## Getting Help

If you encounter issues:

1. **Check logs**: `tail -f /tmp/bootstrap.log` and `tail -f /tmp/peer.log`
2. **Kill and restart**: Follow the troubleshooting section above
3. **Clean slate**: Delete `repo-*` directories and restart
4. **Check processes**: `ps aux | grep "node.*node.js"`
5. **Test connectivity**: `curl http://localhost:3001/health`

---

**Last Updated**: March 21, 2026  
**Status**: ✅ All systems operational
