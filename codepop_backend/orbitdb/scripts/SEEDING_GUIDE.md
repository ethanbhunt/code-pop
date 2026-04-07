# CodePop Seeding Guide - Store-Tied Peer Node Architecture

## Overview

This guide explains how to seed test data for CodePop in the store-tied peer node architecture.

### Architecture Diagram

```
┌──────────────────────────────────────┐
│    Bootstrap Node (Port 3000)        │
│  Creates & owns all databases        │
└────────────────┬─────────────────────┘
                 │
         (gossipsub replication)
                 │
    ┌────────────┼────────────┐
    │            │            │
┌───▼───┐   ┌────▼────┐  ┌────▼────┐
│Peer 1 │   │ Peer 2  │  │ Peer 3  │
│:3001  │   │ :3002   │  │ :3003   │
│       │   │         │  │         │
│Seed   │   │ Store   │  │ Store   │
│Target │   │ 2 Tied  │  │ 3 Tied  │
└───┬───┘   └────┬────┘  └────┬────┘
    │            │            │
    └────────────┼────────────┘
         All data synced
```

## Quick Start

### Prerequisites

1. **Bootstrap node running**:
   ```bash
   cd codepop_backend/orbitdb
   node bootstrap-node.js
   ```

2. **At least one peer node running**:
   ```bash
   # Terminal 2
   PORT=3001 node peer-node.js
   ```

### Seeding Test Data

```bash
# Navigate to scripts directory
cd codepop_backend/orbitdb/scripts

# Seed all test data (recommended)
python3 seed_data.py --all
```

**Expected output**:
```
============================================================
CodePop Backend Seeding
============================================================

Seeding users...
  Created user: superadmin (ID: 1)
  Created user: manager (ID: 2)
  Created user: admin (ID: 3)
  Created user: customer (ID: 4)
Users seeded: 4/4

Seeding drinks...
  Created drink: Vanilla Latte (ID: 1)
  Created drink: Iced Americano (ID: 2)
  ... [6 more drinks]
Drinks seeded: 8/8

Seeding preferences...
  Created preference for superadmin: vanilla (favorite)
  ... [8 more preferences]
Preferences seeded: 9/9

Seeding inventory...
  Created inventory: sprite (50 units, Store 1)
  Created inventory: coke (45 units, Store 1)
  ... [48 more items across 3 stores]
Inventory seeded: 50/50

============================================================
Seeding Complete!
============================================================

Test Data Created:
  Users: 4
  Drinks: 8
  Preferences: 9
  Inventory Items: 50

Test Credentials:
  SUPERADMIN Account:
    Username: superadmin
    Description: Super Administrator - full access across all stores

  MANAGER Account:
    Username: manager
    Description: Store Manager - can manage store operations and staff

  ADMIN Account:
    Username: admin
    Description: Administrator - full access to all features

  CUSTOMER Account:
    Username: customer
    Description: Regular customer - can browse drinks, place orders, manage preferences
```

## Seeding Options

### 1. Seed All Data (Recommended)
Seeds users, drinks, preferences, and inventory for all 3 stores.

```bash
python3 seed_data.py --all
```

**What gets seeded**:
- 4 test user accounts with different roles
- 8 seasonal drink menu items
- 9 user preferences (favorites, dislikes, etc.)
- 50 inventory items:
  - Store 1 (Downtown Café): 21 items (sodas, syrups, add-ins)
  - Store 2 (Uptown Hub): 14 items (limited selection, some low-stock)
  - Store 3 (Westside Lounge): 15 items (premium selection)

### 2. Seed Inventory Only
Seeds just the 50 inventory items across the 3 stores.

```bash
python3 seed_data.py --inventory
```

Use this if you already have users and drinks but need fresh inventory.

### 3. Seed Users Only
Seeds the 4 test user accounts.

```bash
python3 seed_data.py --users
```

### 4. Seed Drinks Only
Seeds the 8 seasonal drink menu items.

```bash
python3 seed_data.py --drinks
```

### 5. Seed Preferences Only
Seeds the 9 user preferences.

```bash
python3 seed_data.py --preferences
```

### 6. Clear Test Data
Deletes all test data from the database.

```bash
python3 seed_data.py --clear
```

### 7. Reset (Clear and Reseed)
Deletes all test data and reseeds everything fresh.

```bash
python3 seed_data.py --reset
```

Use this to start with a clean slate.

## Advanced Options

### Seed to Specific Peer Node

By default, seeding targets `http://localhost:3001` (Peer 1 - General peer).

All data automatically replicates to other peers, so you typically don't need this.

However, you can seed to a specific peer if needed:

```bash
# Seed to Peer 2 (Store 2 exclusive)
python3 seed_data.py --all --url http://localhost:3002

# Seed to Peer 3 (Store 3 exclusive)
python3 seed_data.py --all --url http://localhost:3003

# Seed to a custom host IP (for network development)
python3 seed_data.py --all --url http://<your-host-ip>:3001
```

## Understanding the Seed Data

### Test Users

| Username | Password | Role | Description |
|----------|----------|------|-------------|
| superadmin | SuperAdmin123 | superadmin | Full access across all stores |
| manager | Manager123 | manager | Store operations management |
| admin | Admin123 | admin | Full feature access |
| customer | Customer123 | customer | Browse, order, manage preferences |

### Inventory Distribution

**Store 1: Downtown Café** (21 items - Full Selection)
- Sodas: 8 (sprite, coke, pepsi, mtn. dew, dr. pepper, fanta, rootbeer, lemonade)
- Syrups: 9 (vanilla, salted caramel, strawberry, raspberry, etc.)
- Add-Ins: 4 (whip, cream, sprinkles, candy)

**Store 2: Uptown Hub** (14 items - Limited, Some Low-Stock)
- Sodas: 6 (limited selection)
- Syrups: 5 (less variety than Store 1)
- Add-Ins: 3
- ⚠️ Low-stock items: mtn. dew (8/10), strawberry (5/10), sprinkles (4/10)

**Store 3: Westside Lounge** (15 items - Premium Selection)
- Sodas: 5 (quality-focused)
- Syrups: 7 (premium flavors: lavender, pumpkin spice, gingerbread, mojito, etc.)
- Add-Ins: 3 (premium options)

### Drinks Menu

8 test drinks across different categories:
1. Vanilla Latte - Coffee-based
2. Iced Americano - Coffee
3. Oat Milk Cappuccino - Premium coffee
4. Green Tea Latte - Tea-based
5. Berry Smoothie - Fruit smoothie
6. Tropical Smoothie - Fruit smoothie
7. Fresh Orange Juice - Juice
8. Caramel Macchiato - Coffee with caramel

## Automatic Replication

Once data is seeded to Peer 1, it automatically replicates to all other peers:

```
Peer 1 (3001) → Seeding happens here
     ↓
  gossipsub protocol
     ↓
Peer 2 (3002) ← Data automatically synced
Peer 3 (3003) ← Data automatically synced
```

**No manual sync needed!**

## Troubleshooting

### "Connection Error: Failed to connect to http://localhost:3001"

**Solution**: Make sure at least one peer node is running:
```bash
# Terminal 1: Bootstrap (if not already running)
node bootstrap-node.js

# Terminal 2: Peer 1 (General)
PORT=3001 node peer-node.js

# Then run seeding
python3 seed_data.py --all
```

### "Error: User X already exists"

**Cause**: Test data already seeded.

**Solution**: Either:
1. Continue seeding (script will skip existing users) - safe
2. Reset: `python3 seed_data.py --reset` - clears all test data and reseeds

### "Inventory seeding fails but users/drinks succeed"

**Cause**: Could be permissions or database access issue.

**Solution**: 
1. Ensure bootstrap node is healthy: `curl http://localhost:3000/health`
2. Ensure peer node is running: `curl http://localhost:3001/health`
3. Check peer node logs for errors

### "Data not visible on Peer 2/3"

**Cause**: Replication lag or nodes not connected.

**Solution**:
1. Wait 5-10 seconds for gossipsub replication
2. Check peer node logs to verify gossipsub connections
3. Verify all nodes are running: `curl http://localhost:300{1,2,3}/health`

## Testing After Seeding

### Test 1: Verify Data on All Peers

```bash
# From different terminals, test each peer
curl http://localhost:3001/backend/users
curl http://localhost:3002/backend/stores
curl http://localhost:3003/backend/drinks
```

### Test 2: Check Inventory for Each Store

```bash
# Store 1 inventory
curl http://localhost:3001/backend/inventory/?storeId=1

# Store 2 inventory (should show low-stock items)
curl http://localhost:3001/backend/inventory/?storeId=2

# Store 3 inventory (premium items)
curl http://localhost:3001/backend/inventory/?storeId=3
```

### Test 3: Login and Create Order

1. Start the app (frontend)
2. Login with: `customer / Customer123`
3. Select Store 1
4. Create a drink using seeded ingredients
5. Proceed to checkout
6. Verify inventory decremented

### Test 4: Multi-Store Testing

1. Logout and restart app
2. Select Store 2 (Uptown Hub)
3. Create drink - note fewer ingredient options
4. Switch to Store 3 - see premium syrups
5. Verify each store has correct inventory

## Resetting for Fresh Start

If you want to start over:

```bash
# Option 1: Reset test data only (reseeds same data)
python3 seed_data.py --reset

# Option 2: Start completely fresh (delete all repos)
cd codepop_backend/orbitdb
rm -rf repo-bootstrap repo-peer-*

# Then restart:
node bootstrap-node.js
# Wait for peer-info.json to be created
PORT=3001 node peer-node.js
python3 scripts/seed_data.py --all
```

## Performance Notes

- **Seeding time**: ~5-10 seconds for all data
- **Data replication**: < 100ms to all peers
- **Total data size**: ~5MB across all 26 databases
- **Database operations**: ~100 write operations during seeding

## Next Steps After Seeding

1. **Start peer nodes** (if not already running):
   ```bash
   PORT=3002 node peer-node.js  # Store 2
   PORT=3003 node peer-node.js  # Store 3
   ```

2. **Start the frontend**:
   ```bash
   cd codepop
   npm start
   ```

3. **Test store-aware peer selection**:
   - Select Store 1 → Requests go to :3001
   - Select Store 2 → Requests go to :3002
   - Select Store 3 → Requests go to :3003

4. **Test inventory management**:
   - Create drinks using seeded ingredients
   - Place orders
   - Verify inventory decrements correctly

## Questions?

Refer to:
- `PEER_NODE_SETUP.md` - Peer node architecture guide
- `store-peer-config.js` - Store-to-peer mapping
- `seed_config.py` - Test data configuration
