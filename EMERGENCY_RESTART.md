# CodePop - Emergency Restart Guide

If you're having trouble starting the OrbitDB infrastructure, use this emergency restart procedure.

## ⚡ Quick Emergency Fix (30 seconds)

```bash
# Copy and run this exact command:
pkill -9 -f "node.*-node.js" 2>/dev/null; sleep 3 && rm -rf ~/Documents/software_programming/code-pop/codepop_backend/orbitdb/repo-* ~/Documents/software_programming/code-pop/codepop_backend/orbitdb/peer-info.json 2>/dev/null; /tmp/start_nodes.sh
```

Then wait for the confirmation message that both nodes are HEALTHY.

## 🔧 Step-by-Step Emergency Procedure

### Step 1: Force Kill All Processes
```bash
pkill -9 -f "bootstrap-node.js"
pkill -9 -f "peer-node.js"
sleep 3
```

### Step 2: Clean All Data
```bash
cd ~/Documents/software_programming/code-pop/codepop_backend/orbitdb
rm -rf repo-bootstrap repo-peer-3001 repo-peer-3002 peer-info.json
echo "✅ Cleaned"
```

### Step 3: Start Fresh
```bash
# Use the startup script
/tmp/start_nodes.sh
```

Or manually:

```bash
# Terminal 1
cd ~/Documents/software_programming/code-pop/codepop_backend/orbitdb
node bootstrap-node.js

# Terminal 2 (after 8 seconds)
cd ~/Documents/software_programming/code-pop/codepop_backend/orbitdb
node peer-node.js
```

### Step 4: Verify
```bash
curl http://localhost:3001/health
```

Should return:
```json
{
  "status": "healthy",
  "nodeType": "peer"
}
```

## 🚨 Common Errors & Fixes

### Error: "Database is not open"
```bash
pkill -9 -f "node.*-node.js"
rm -rf codepop_backend/orbitdb/repo-*
sleep 2
/tmp/start_nodes.sh
```

### Error: "No valid address" or "ERR_NO_VALID_ADDRESSES"
```bash
# Check port 4000 is free
lsof -i :4000

# If it shows a node process, kill it
pkill -9 -f "bootstrap-node.js"

# Wait and restart
sleep 3
/tmp/start_nodes.sh
```

### Error: "Address already in use"
```bash
# Check which process is using the port
lsof -i :3000  # or :3001, :4000, :4001

# Kill it
kill -9 <PID>

# Restart
/tmp/start_nodes.sh
```

## 📋 Diagnostic Checks

Check what's running:
```bash
ps aux | grep "node" | grep -v grep
```

Check port usage:
```bash
lsof -i :3000    # HTTP Bootstrap
lsof -i :3001    # HTTP Peer
lsof -i :4000    # libp2p Bootstrap
lsof -i :4001    # libp2p Peer
```

View logs:
```bash
tail -50 /tmp/bootstrap.log
tail -50 /tmp/peer.log
```

Test API:
```bash
curl -s http://localhost:3001/health | jq '.'
```

## ✅ Expected Output When Working

```
✅ Bootstrap:  HEALTHY
✅ Peer:       HEALTHY
```

And curl should return:
```json
{
  "status": "healthy",
  "nodeType": "peer",
  "peerId": "12D3Koo...",
  "port": 3001,
  "timestamp": "2026-03-21T..."
}
```

## 🎯 The Nuclear Option

If nothing else works:

```bash
# Kill everything
pkill -9 -f node

# Clean everything
rm -rf ~/Documents/software_programming/code-pop/codepop_backend/orbitdb/repo-*
rm ~/Documents/software_programming/code-pop/codepop_backend/orbitdb/peer-info.json

# Wait a bit
sleep 5

# Start fresh
cd ~/Documents/software_programming/code-pop/codepop_backend/orbitdb
node bootstrap-node.js
```

Then in another terminal:
```bash
cd ~/Documents/software_programming/code-pop/codepop_backend/orbitdb
node peer-node.js
```

## 🔗 Startup Script Location

The automatic startup script is located at:
```bash
/tmp/start_nodes.sh
```

You can run it anytime with:
```bash
/tmp/start_nodes.sh
```

It will:
1. Kill any orphaned processes
2. Clean all databases
3. Start bootstrap node
4. Wait 8 seconds
5. Start peer node
6. Wait 5 seconds
7. Verify both are healthy

## 📚 Related Documentation

- **STARTUP_GUIDE.md** - Detailed startup procedures
- **QUICK_START_TESTING.md** - API testing
- **ORBITDB_INTEGRATION_COMPLETE.md** - Full integration report
