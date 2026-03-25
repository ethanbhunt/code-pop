# CodePop Full Stack Startup Guide

Complete guide to running CodePop with OrbitDB backend for web and mobile development.

## System Architecture

```
Web/Mobile Client (React Native - Expo)
        ↓
http://localhost:19006
        ↓
REST API (Express.js + OrbitDB)
        ↓
http://localhost:3001
        ↓
OrbitDB Peer-to-Peer Network
  - Bootstrap Node (port 3000)
  - Peer Nodes (port 3001+)
  - 8 Databases (users, drinks, orders, etc.)
```

## Prerequisites

- Node.js 18+
- Python 3.8+
- 4 terminal windows (or one with splitting)
- Modern web browser

## Quick Start (5 Minutes)

### Terminal 1: Bootstrap Node

```bash
cd codepop_backend/orbitdb
npm install  # First time only
npm run bootstrap
```

Watch for:
```
[ ^ ] Starting CodePop Bootstrap Node (port 3000)...
[ ^ ] Bootstrap node is ready!
```

### Terminal 2: Peer Node (API Server)

```bash
cd codepop_backend/orbitdb
npm run peer
```

Watch for:
```
[ ^ ] Peer node is ready!
   HTTP API: http://localhost:3001
```

### Terminal 3: Seed Data

```bash
cd codepop_backend/orbitdb
python3 scripts/seed_data.py --all
```

Watch for:
```
============================================================
Seeding Complete!
============================================================

Test Credentials:
CUSTOMER Account:
  Username: customer_jane
  Password: Customer123!
  ...
```

### Terminal 4: Frontend

```bash
cd codepop
npm install  # First time only
npm start
```

When prompted:
```
To open the app in a browser, press w.
```

Press `w` to open in browser at http://localhost:19006

## Login & Test

1. Open http://localhost:19006
2. Login with:
   ```
   Username: customer_jane
   Password: Customer123!
   ```
3. Browse 8 drinks
4. Create an order
5. See the full system working!

## All Running Services

When complete, you should have:

| Service    | URL                    | Port  | Status  |
| ---------- | ---------------------- | ----- | ------- |
| Bootstrap  | N/A                    | 3000  | Running |
| API Server | http://localhost:3001  | 3001  | Running |
| Frontend   | http://localhost:19006 | 19006 | Running |

## Available Commands

### Backend Commands

```bash
cd codepop_backend/orbitdb

# Start services
npm run bootstrap        # Bootstrap node
npm run peer           # API server

# Seed data
npm run seed           # Seed all data
npm run seed:users     # Seed only users
npm run seed:drinks    # Seed only drinks
npm run seed:preferences
npm run seed:inventory

# Clear/Reset
npm run seed:clear     # Delete test data
npm run seed:reset     # Clear and reseed

# Test APIs (with Python client)
python3 client.py      # Run demo
python3 scripts/seed_data.py --help
```

### Frontend Commands

```bash
cd codepop

# Install/Start
npm install    # First time only
npm start      # Start Expo dev server

# From Expo menu:
w              # Web version
a              # Android emulator
i              # iOS simulator
c              # Clear cache
q              # Quit
```

## Test Credentials

Three pre-seeded user accounts:

### Customer Account
```
Username: customer_jane
Email: jane@example.com
Password: Customer123!
```
Can: Browse, order, rate, manage preferences

### Staff Account
```
Username: staff_bob
Email: bob@example.com
Password: Staff123!
```
Can: Prepare orders, manage inventory

### Admin Account
```
Username: admin_alex
Email: alex@example.com
Password: Admin123!
```
Can: Full access, create drinks, view analytics

## Data Seeded

- **3 Users**: Customer, Staff, Admin
- **8 Drinks**: Coffee, Tea, Smoothies, Juice
- **7 Preferences**: Favorites, allergies, dislikes
- **5 Inventory Items**: Syrups, milk, beans

See `TESTING_DATA_REFERENCE.md` for complete details.

## Detailed Guides

- **SETUP_QUICKSTART.md** - 5-minute setup
- **SEEDING_GUIDE.md** - Seeding options and commands
- **TESTING_DATA_REFERENCE.md** - All test data details
- **FULL_STACK_WORKFLOW.md** - Complete testing scenarios
- `codepop_backend/orbitdb/CLIENT_GUIDE.md` - API reference

## Troubleshooting

### "Backend is not running"

Make sure both nodes are started:
```bash
# Terminal 1
npm run bootstrap

# Terminal 2
npm run peer
```

### "Port already in use"

Kill the process using the port:
```bash
lsof -i :3001        # Find process
kill -9 <PID>        # Kill it
```

Then restart:
```bash
npm run peer
```

### "Connection refused"

The backend might be slow to start. Wait 5 seconds and retry seeding:
```bash
sleep 5
python3 scripts/seed_data.py --all
```

### "Token not found" when seeding

Users didn't create properly. Reseed just users:
```bash
python3 scripts/seed_data.py --users
```

### Frontend won't load

1. Make sure Expo is running: `npm start`
2. Clear cache: Press `c` in Expo
3. Reload browser: Ctrl+R or Cmd+R

### Can't login in app

1. Check test credentials in `TESTING_DATA_REFERENCE.md`
2. Make sure data was seeded: `python3 scripts/seed_data.py --all`
3. Try resetting: `python3 scripts/seed_data.py --reset`

## Testing Workflows

### Scenario 1: Simple Order
1. Login as customer_jane
2. Browse 8 drinks
3. Add Vanilla Latte to cart
4. Checkout and pay
5. Get QR code

### Scenario 2: Admin Dashboard
1. Login as admin_alex
2. View all users and orders
3. Create new drink
4. Check inventory
5. View revenue

### Scenario 3: Staff Operations
1. Login as staff_bob
2. View pending orders
3. Mark order as ready
4. Check inventory levels

See `FULL_STACK_WORKFLOW.md` for complete scenarios.

## Data Persistence

- Data persists across restarts
- Stored in local OrbitDB repositories
- To clear: `python3 scripts/seed_data.py --clear`
- To reset: `python3 scripts/seed_data.py --reset`

## Mobile Testing (Android)

After web works perfectly:

```bash
# In Expo terminal
npm start
a  # Start Android emulator
```

Note: `ip_address.js` already configured for Android emulator:
```javascript
const BASE_URL = 'http://10.0.2.2:3001'; // Android special IP
```

## Mobile Testing (iOS)

```bash
# In Expo terminal
npm start
i  # Start iOS simulator
```

For iOS, update `ip_address.js`:
```javascript
const BASE_URL = 'http://localhost:3001'; // iOS simulator
```

## API Testing

### Health Check
```bash
curl http://localhost:3001/health
```

### Get Drinks
```bash
curl http://localhost:3001/backend/drinks \
  -H "Authorization: Token YOUR_TOKEN"
```

### Use Python Client
```bash
python3 codepop_backend/orbitdb/client.py
```

## Database Cleanup

To remove all local data and start fresh:

```bash
# Stop all services (Ctrl+C in terminals)

# Remove databases
rm -rf codepop_backend/orbitdb/repo-bootstrap/
rm -rf codepop_backend/orbitdb/repo-peer-*/

# Restart
npm run bootstrap
npm run peer
python3 scripts/seed_data.py --all
```