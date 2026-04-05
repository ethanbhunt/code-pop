# CodePop Data Seeding Guide

This guide explains how to seed initial data for CodePop's database layer (Django PostgreSQL + OrbitDB distributed stores).

## Overview

The seeding process populates the CodePop system with:

- **7 Regional Supply Hubs** (Regions A-G across US)
- **55+ Stores** (20 in Region C, 5+ in neighboring regions)
- **Base Drinks Catalog** (8 drink types: sodas,Root Beer, flavored sodas)
- **Ingredient Library** (5 syrups for customization)
- **Add-ins Menu** (5 premium toppings: whipped cream, sprinkles, etc.)
- **Store Inventory Levels** (100 units initial stock per drink per store)
- **Admin User Account** (for testing and initial management)
- **Audit Trail Baseline** (records seed operation for compliance)

## Quick Start

### 1. Django Backend Seeding (PostgreSQL)

Seed the Django database with core metadata (stores, hubs, drinks):

```bash
# Navigate to Django project
cd codepop_backend

# Run seeder with default settings
python manage.py seed_database

# Clear existing data before seeding (be careful!)
python manage.py seed_database --clear
```

**Output:**
```
🌱 Starting CodePop database seeding...
  Seeding regions...
    • Region A: Chicago, IL
    • Region B: New Jersey / New York
    ...
  Seeding supply hubs...
    ✓ hub-region-A
    ✓ hub-region-B
    ...
  Seeding stores...
    ✓ Region A: 5 stores
    ✓ Region C: 20 stores
    ...
  Seeding drinks...
    ✓ 8 drink types
  
✅ Database seeding complete!

💡 Test credentials:
  Username: admin
  Password: AdminPassword123!
```

### 2. OrbitDB Distributed Seeding

Seed OrbitDB on peer/bootstrap nodes with synchronized data:

```bash
# Navigate to OrbitDB scripts
cd codepop_backend/orbitdb

# Seed to local peer node (default: http://localhost:3001)
node scripts/seed-orbitdb.js

# Seed to specific bootstrap node
node scripts/seed-orbitdb.js --node http://10.0.0.1:3000

# Clear existing OrbitDB data before seeding (CAUTION!)
node scripts/seed-orbitdb.js --clear
```

**Output:**
```
🌱 OrbitDB Seeder

Target Node: http://localhost:3001
Clear Data: NO

Checking node health...
  Active peers: 3
✓ Node is responsive

Seeding 7 regions...
  ✓ Region A: Chicago, IL
  ✓ Region B: New Jersey / New York
  ...

Seeding 7 supply hubs...
  ✓ 7 hubs created

Seeding stores...
  ✓ Region A: 5 stores
  ✓ Region C: 20 stores
  ...

Seeding 8 drinks...
  ✓ 8 drinks created

Seeding 5 syrups...
  ✓ 5 syrups created

Seeding 5 add-ins...
  ✓ 5 add-ins created

Seeding store inventory levels...
  ✓ 5500 inventory items created

==================================================
📊 Seeding Summary:
==================================================
  Regions:          7
  Supply Hubs:      7
  Stores:           55
  Drinks:           8
  Syrups:           5
  Add-ins:          5
  Inventory Items:  5500
  Errors:           0
==================================================

✅ Seeding complete!
```

## Seeded Data Details

### Regional Distribution

| Region | City | Hubs | Stores |
|--------|------|------|--------|
| A | Chicago, IL | 1 | 5 |
| B | New Jersey / New York | 1 | 5 |
| C | Logan, UT | 1 | 20 |
| D | Dallas, TX | 1 | 5 |
| E | Atlanta, GA | 1 | 5 |
| F | Phoenix, AZ | 1 | 5 |
| G | Boise, ID | 1 | 5 |
| **TOTAL** | | **7** | **55** |

### Drinks Catalog

1. **Lemon Lime Soda** - $3.99 - Classic citrus
2. **Cola** - $3.99 - Traditional cola
3. **Orange Soda** - $3.99 - Fresh orange
4. **Grape Soda** - $3.99 - Purple flavor
5. **Root Beer** - $4.49 - Traditional root beer
6. **Strawberry Shortcake** - $4.49 - Fruity specialty
7. **Blue Raspberry** - $3.99 - Bright berry
8. **Peach Mango** - $4.49 - Tropical blend

### Syrups (for customization)

- **Syrup Base** (1000 units) - Foundation for all drinks
- **Citrus Syrup** (500 units) - For light citrus enhancement
- **Berry Syrup** (500 units) - For sweet berry flavor
- **Vanilla Syrup** (300 units) - For creamy taste
- **Caramel Syrup** (300 units) - For sweet caramel notes

### Add-ins (Premium Toppings)

- **Whipped Cream** - $0.50
- **Chocolate Syrup** - $0.75
- **Sprinkles** - $0.25
- **Gummy Bears** - $1.00
- **Marshmallows** - $0.50

### Initial Inventory

Each store receives:
- **100 units** of each drink type
- **Restock threshold**: 20 units
- **Automatic low-stock alerts** trigger when inventory drops below threshold

## Advanced Usage

### Multi-Node Seeding

For a 3-node peer cluster, seed each peer sequentially:

```bash
# Seed bootstrap node (primary registry)
node scripts/seed-orbitdb.js --node http://10.0.0.1:3000

# Seed peer-1 (will replicate from bootstrap)
node scripts/seed-orbitdb.js --node http://10.0.0.2:3001

# Seed peer-2 (will replicate from bootstrap)
node scripts/seed-orbitdb.js --node http://10.0.0.3:3001

# Data automatically replicates via gossipsub within 5 seconds
```

### Clear and Reseed (Full Reset)

To completely reset both databases:

```bash
# 1. Clear Django database
cd codepop_backend
python manage.py seed_database --clear

# 2. Clear OrbitDB (all peers)
cd ../orbitdb
node scripts/seed-orbitdb.js --node http://10.0.0.1:3000 --clear
node scripts/seed-orbitdb.js --node http://10.0.0.2:3001 --clear
node scripts/seed-orbitdb.js --node http://10.0.0.3:3001 --clear

# 3. Reseed
python manage.py seed_database
node scripts/seed-orbitdb.js --node http://10.0.0.1:3000
```

### Verify Seeded Data

**Check Django database:**

```bash
python manage.py shell
>>> from backend.models import Store, SupplyHub, Drink
>>> Store.objects.count()  # Should be 55
>>> SupplyHub.objects.count()  # Should be 7
>>> Drink.objects.count()  # Should be 8
```

**Check OrbitDB node:**

```bash
curl http://localhost:3001/stores | jq '.data | length'  # Should be 55
curl http://localhost:3001/drinks | jq '.data | length'  # Should be 8
curl http://localhost:3001/peers/stats  # Check peer health
```

## Test Scenarios Using Seeded Data

### 1. Test User Registration

Using seeded store #C-001:

```bash
POST /api/users/register
{
  "username": "testuser1",
  "email": "test@example.com",
  "store_id": "store-C-001",
  "password": "Test@123"
}
```

### 2. Test Order Creation

Place order with seeded drinks:

```bash
POST /api/orders/create
{
  "user_id": "testuser1",
  "store_id": "store-C-001",
  "items": [
    {"drink_id": "drink-001", "quantity": 2},  # 2 Lemon Lime Sodas
    {"drink_id": "drink-005", "quantity": 1}   # 1 Root Beer
  ]
}
```

### 3. Test Multi-Region Transfers

Transfer inventory between Region C hub and stores:

```bash
POST /api/transfers/create
{
  "source_type": "hub",
  "source_id": "hub-region-C",
  "destination_type": "store", 
  "destination_id": "store-C-010",
  "items": [
    {"drink_id": "drink-001", "quantity": 50}
  ]
}
```

### 4. Test Multi-Peer Sync

Start 3 peer nodes and verify data replication:

```bash
# Terminal 1: Bootstrap node
BOOTSTRAP_ADDRESSES="http://localhost:3000" \
PEER_ROLE="bootstrap" \
PORT=3000 node bootstrap-node.js

# Terminal 2: Peer 1
BOOTSTRAP_ADDRESSES="http://localhost:3000" \
PEER_ROLE="store" \
PEER_REGION="C" \
PORT=3001 node peer-node.js

# Terminal 3: Peer 2
BOOTSTRAP_ADDRESSES="http://localhost:3000" \
PEER_ROLE="store" \
PEER_REGION="A" \
PORT=3002 node peer-node.js

# Verify all 3 nodes are registered
curl http://localhost:3000/peers/list

# Check data replication
curl http://localhost:3001/stores | jq '.data | length'  # Should match 3000
curl http://localhost:3002/stores | jq '.data | length'  # Should match 3000
```

## Troubleshooting

### Django Seeding Fails

**Error:** `ModuleNotFoundError: No module named 'backend.models'`

**Solution:** Ensure Django app is initialized:

```bash
cd codepop_backend
python manage.py migrate  # Run migrations first
python manage.py seed_database
```

### OrbitDB Seeding Hangs

**Error:** `Cannot connect to http://localhost:3001: ECONNREFUSED`

**Solution:** Ensure peer node is running:

```bash
# Start peer node first
cd orbitdb
node peer-node.js

# In another terminal
node scripts/seed-orbitdb.js
```

### Duplicate Data After Reseed

**Error:** Seeding creates N+N items instead of N items

**Solution:** Use `--clear` flag to delete existing data:

```bash
python manage.py seed_database --clear
node scripts/seed-orbitdb.js --clear
```

### Replication Not Working

**Error:** Data seeded on peer-1 doesn't appear on peer-2

**Solution:** Check peer connectivity and gossipsub status:

```bash
# On bootstrap node
curl http://localhost:3000/peers/list

# Wait for propagation (up to 5 seconds)
curl http://localhost:3002/stores
```

## Customizing Seed Data

### Add Custom Drinks

Edit `seed_database.py` and add to `_seed_drinks()`:

```python
def _seed_drinks(self):
    drinks_data = [
        # ... existing drinks ...
        {"name": "Custom Flavor", "description": "Your flavor", "price": 4.99},
    ]
```

### Add Custom Regions

Edit `seed-orbitdb.js` and update `REGIONS` constant:

```javascript
const REGIONS = [
  // ... existing regions ...
  { id: 'H', name: 'Custom Region', timezone: 'US/Eastern' },
];
```

### Adjust Initial Inventory

Edit seed scripts to change starting inventory per store:

```python
# Django: seed_database.py line ~240
quantity=100,  # Change this

# OrbitDB: seed-orbitdb.js line ~230
initialQuantity: 100,  # Change this
```

## Production Considerations

- **Backup Before Clearing**: Always backup production databases before running `--clear`
- **Off-Peak Seeding**: Run seeding during low-traffic hours
- **Verify Replication**: Check all peer nodes synchronized before going live
- **Test First**: Run seeding on staging environment before production
- **Document Changes**: Update this guide if seeding data changes

## See Also

- [DistributedDatabaseSetup.md](../DistributedDatabaseSetup.md) - Full database setup guide
- [Requirements.txt](../requirements.txt) - Python dependencies
- [package.json](../package.json) - Node.js dependencies
