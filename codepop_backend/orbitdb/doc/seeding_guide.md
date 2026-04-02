# CodePop Seeding Guide

Complete guide for managing test data with the seeding script.

## Overview

The seeding script (`scripts/seed_data.py`) populates your OrbitDB backend with test data:
- 3 test users (customer, staff, admin)
- 8 drinks menu items
- 7 user preferences
- 5 inventory items

The script uses the Python standard library only (no external dependencies).

## Prerequisites

- Python 3.8+
- OrbitDB backend running (bootstrap and peer nodes)
- Backend API accessible at `http://localhost:3001`

## Quick Commands

### Seed Everything

```bash
cd codepop_backend/orbitdb
python3 scripts/seed_data.py --all
```

This seeds all data in order: users → drinks → preferences → inventory

### Seed Specific Data

```bash
# Seed only users
python3 scripts/seed_data.py --users

# Seed only drinks
python3 scripts/seed_data.py --drinks

# Seed only preferences
python3 scripts/seed_data.py --preferences

# Seed only inventory
python3 scripts/seed_data.py --inventory
```

### Clear Data

```bash
# Delete all test data
python3 scripts/seed_data.py --clear
```

This removes all users named in SEED_USERS and their associated data.

### Reset Data

```bash
# Clear and reseed everything
python3 scripts/seed_data.py --reset
```

Equivalent to running `--clear` then `--all`.

### Custom Backend URL

```bash
# Seed from remote backend
python3 scripts/seed_data.py --all --url http://192.168.1.100:3001
```

## What Gets Seeded

### Users

```
1. customer_jane (customer)
   - Email: jane@example.com
   - Password: Customer123!

2. staff_bob (staff)
   - Email: bob@example.com
   - Password: Staff123!

3. admin_alex (admin)
   - Email: alex@example.com
   - Password: Admin123!
```

### Drinks (8 items)

- Coffee: Vanilla Latte, Iced Americano, Oat Milk Cappuccino, Caramel Macchiato
- Tea: Green Tea Latte
- Smoothies: Berry Smoothie, Tropical Smoothie
- Juice: Fresh Orange Juice

All with prices, descriptions, dietary info, and ratings.

### Preferences (7 items)

- Jane: 1 favorite, 1 dislike, 1 allergy
- Bob: 1 favorite, 1 preference
- Alex: 1 favorite, 1 recommendation

### Inventory (5 items)

- Vanilla Syrup
- Caramel Syrup
- Oat Milk
- Whole Milk
- Espresso Beans

## Detailed Output

When running the seeding script, you'll see:

```
============================================================
CodePop Backend Seeding
============================================================

Backend health: healthy

Seeding users...
  Created user: customer_jane (ID: 1)
  Created user: staff_bob (ID: 2)
  Created user: admin_alex (ID: 3)
Users seeded: 3/3

Seeding drinks...
  Created drink: Vanilla Latte (ID: 1)
  Created drink: Iced Americano (ID: 2)
  Created drink: Oat Milk Cappuccino (ID: 3)
  Created drink: Green Tea Latte (ID: 4)
  Created drink: Berry Smoothie (ID: 5)
  Created drink: Tropical Smoothie (ID: 6)
  Created drink: Fresh Orange Juice (ID: 7)
  Created drink: Caramel Macchiato (ID: 8)
Drinks seeded: 8/8

Seeding preferences...
  Created preference for customer_jane: favorite
  Created preference for customer_jane: dislike
  Created preference for customer_jane: allergic
  Created preference for staff_bob: favorite
  Created preference for staff_bob: ingredient_preference
  Created preference for admin_alex: favorite
  Created preference for admin_alex: recommended
Preferences seeded: 7/7

Seeding inventory...
  Created inventory: Vanilla Syrup (30 liters)
  Created inventory: Caramel Syrup (25 liters)
  Created inventory: Oat Milk (40 liters)
  Created inventory: Whole Milk (50 liters)
  Created inventory: Espresso Beans (20 bags)
Inventory seeded: 5/5

============================================================
Seeding Complete!
============================================================

Test Credentials:
CUSTOMER Account:
  Username: customer_jane
  Email: jane@example.com
  Password: Customer123!
  Note: Regular customer - can browse, order, and rate

STAFF Account:
  Username: staff_bob
  Email: bob@example.com
  Password: Staff123!
  Note: Staff member - can prepare orders, manage inventory

ADMIN Account:
  Username: admin_alex
  Email: alex@example.com
  Password: Admin123!
  Note: Administrator - full access to all features

Frontend Base URL:
  Web:     http://localhost:19006
  Backend: http://localhost:3001

Next Steps:
  1. Start frontend: cd ../../codepop && npm start
  2. Press 'w' for web version
  3. Login with any of the above credentials
  4. Test the application!

============================================================
```

## Health Checks

The script automatically checks if the backend is running:

```
Backend health: healthy
```

If the backend is not running, you'll see:

```
Backend unavailable: [Errno 111] Connection refused
ERROR: Backend is not running!
Please start the OrbitDB backend first:
  Terminal 1: npm run bootstrap
  Terminal 2: npm run peer
```

## Error Handling

### User Already Exists

If you run `--users` multiple times:

```
Seeding users...
  User customer_jane already exists (skipping)
  User staff_bob already exists (skipping)
  User admin_alex already exists (skipping)
Users seeded: 0/3
```

This is fine - the script skips existing users.

### Drink Already Exists

Same behavior for drinks:

```
Seeding drinks...
  Drink Vanilla Latte already exists (skipping)
  ...
```

### Preference Failures

If a user doesn't exist, preferences are skipped:

```
Seeding preferences...
  Warning: User customer_jane not found, skipping preference
```

Always seed users first before preferences.

## Advanced Usage

### Seeding Order

For a clean start, seed in this order:

```bash
# 1. Clear existing data (optional)
python3 scripts/seed_data.py --clear

# 2. Seed users first
python3 scripts/seed_data.py --users

# 3. Seed drinks (requires admin token)
python3 scripts/seed_data.py --drinks

# 4. Seed preferences
python3 scripts/seed_data.py --preferences

# 5. Seed inventory
python3 scripts/seed_data.py --inventory
```

Or just use `--reset` for all at once:

```bash
python3 scripts/seed_data.py --reset
```

### Partial Seeding

You can seed only what you need:

```bash
# Just create users and drinks (for menu testing)
python3 scripts/seed_data.py --users
python3 scripts/seed_data.py --drinks

# Just create users and preferences (for preference testing)
python3 scripts/seed_data.py --users
python3 scripts/seed_data.py --preferences
```

### Multiple Seeding Runs

Running seed again with existing data:

```bash
python3 scripts/seed_data.py --all
```

Result: Existing data is preserved, duplicates are skipped.

To force a complete reset:

```bash
python3 scripts/seed_data.py --reset
```

This clears all test users and their data, then reseeds everything.

## Modifying Test Data

### Edit Test Data

Edit `scripts/seed_config.py` to modify test data:

```python
SEED_USERS = [
    {
        "username": "customer_jane",
        "email": "jane@example.com",
        "password": "Customer123!",
        "firstName": "Jane",
        "lastName": "Smith",
    },
    # Add more users here
]

SEED_DRINKS = [
    {
        "name": "Vanilla Latte",
        "price": 4.50,
        # ...
    },
    # Add more drinks here
]
```

### Create New Test Data

1. Add user data to `SEED_USERS`
2. Add drink data to `SEED_DRINKS`
3. Add preferences to `SEED_PREFERENCES`
4. Add inventory to `SEED_INVENTORY`
5. Run `python3 scripts/seed_data.py --reset`

Example: Adding a new user

```python
{
    "username": "customer_john",
    "email": "john@example.com",
    "password": "Customer456!",
    "firstName": "John",
    "lastName": "Brown",
},
```

Then run `python3 scripts/seed_data.py --users`

## Troubleshooting

### Backend Connection Error

```
Backend unavailable: [Errno 111] Connection refused
```

Solution: Make sure backend is running:

```bash
cd codepop_backend/orbitdb
npm run bootstrap   # Terminal 1
npm run peer        # Terminal 2
```

### Token Not Found

```
Error creating drinks: API Error (401): Invalid Token
```

Solution: The admin user wasn't created. Reseed users:

```bash
python3 scripts/seed_data.py --reset
```

### Users Already Exist

```
User customer_jane already exists (skipping)
```

This is normal - just means the user is already in the database.

To replace all test data:

```bash
python3 scripts/seed_data.py --reset
```

### Timeout Error

```
Request failed: [Errno 110] Connection timed out
```

Solution: The backend is slow to respond. Wait and try again:

```bash
sleep 5
python3 scripts/seed_data.py --all
```

## Data Reference

See `testing_data_reference.md` for complete details on:
- User credentials
- Drink menu items and prices
- User preferences and allergies
- Inventory stock levels