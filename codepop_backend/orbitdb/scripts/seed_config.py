"""
Seed Configuration for CodePop Testing Data - Store-Tied Peer Node Architecture

This file defines all test data for the CodePop application:
- 4 test users (superadmin, manager, admin, customer)
- 8 seasonal drinks
- 9 user preferences
- 50 inventory items across 3 stores

Used by seed_data.py to populate the OrbitDB backend via the peer node architecture.

Seeding Process:
1. Bootstrap node creates all 26 databases (13 global + 9 store-scoped)
2. Peer nodes connect and replicate databases automatically
3. Seed script targets Peer 1 (http://localhost:3001)
4. Data automatically replicates to Peer 2 and Peer 3 via gossipsub

Store Inventory (50 total items):
- Store 1 (Downtown Café): 21 items - Full selection
- Store 2 (Uptown Hub): 14 items - Limited, some low-stock
- Store 3 (Westside Lounge): 15 items - Premium selection
"""

# Test Users - 4 accounts with different roles
# Note: Passwords must be at least 8 characters
SEED_USERS = [
    {
        "username": "superadmin",
        "email": "superadmin@example.com",
        "password": "SuperAdmin123",
        "firstName": "Superadmin",
        "lastName": "Superadmin",
        "role": "superadmin"
    },
    {
        "username": "manager",
        "email": "manager@example.com",
        "password": "Manager123",
        "firstName": "Manager",
        "lastName": "Manager",
        "role": "manager"
    },
    {
        "username": "admin",
        "email": "admin@example.com",
        "password": "Admin123",
        "firstName": "Admin",
        "lastName": "Admin",
        "role": "admin"
    },
    {
        "username": "customer",
        "email": "customer@example.com",
        "password": "Customer123",
        "firstName": "John",
        "lastName": "Doe",
        "role": "customer"
    },
    {
        "username": "repair",
        "email": "repair@example.com",
        "password": "Repair12345",
        "firstName": "Alex",
        "lastName": "Technician",
        "role": "repair",
    },
    {
        "username": "customer2",
        "email": "jane@example.com",
        "password": "Customer123",
        "firstName": "Jane",
        "lastName": "Smith",
        "role": "customer",
    },
]

# Maintenance machines (supplies / equipment registry) — per-store
SEED_MACHINES = [
    # Store 1
    {"storeId": 1, "name": "Main soda fountain", "model": "SFC-2000X", "status": "normal", "serviceInterval": 30},
    {"storeId": 1, "name": "Syrup rack A", "model": "SR-12", "status": "operational", "serviceInterval": 30},
    {"storeId": 1, "name": "Blend station", "model": "BL-500", "status": "warning", "serviceInterval": 21},
    {"storeId": 1, "name": "Ice maker", "model": "ICE-Pro4", "status": "normal", "serviceInterval": 60},
    # Store 2
    {"storeId": 2, "name": "Compact dispenser", "model": "CDS-Mini", "status": "normal", "serviceInterval": 30},
    {"storeId": 2, "name": "Mixer unit", "model": "MX-2", "status": "error", "serviceInterval": 14},
    {"storeId": 2, "name": "Cold well", "model": "CW-88", "status": "operational", "serviceInterval": 45},
    # Store 3
    {"storeId": 3, "name": "Premium line", "model": "PL-900", "status": "normal", "serviceInterval": 30},
    {"storeId": 3, "name": "Carbonator", "model": "CBR-s1", "status": "warning", "serviceInterval": 30},
    {"storeId": 3, "name": "Nitro tap", "model": "NT-7", "status": "operational", "serviceInterval": 90},
    {"storeId": 3, "name": "Undercounter fridge", "model": "UCF-200", "status": "normal", "serviceInterval": 120},
]

# How many synthetic guest orders + revenue rows to create (uses drinkIds 1–N from seeded drinks)
SEED_ORDER_COUNT = 36

# Drinks Menu - 8 drinks covering major categories
# Note: API expects name, sodas, price, and optional fields: syrups, addIns, ingredients, description, isVegan, isGlutenFree, calories, rating
SEED_DRINKS = [
    {
        "name": "Vanilla Latte",
        "description": "Smooth espresso with steamed milk and vanilla syrup",
        "price": 4.50,
        "sodas": [],
        "syrups": ["vanilla"],
        "addIns": [],
        "ingredients": ["espresso", "milk", "vanilla syrup"],
        "isVegan": False,
        "isGlutenFree": True,
        "calories": 190,
        "rating": 4.7
    },
    {
        "name": "Iced Americano",
        "description": "Bold espresso shots with cold water and ice",
        "price": 3.50,
        "sodas": [],
        "syrups": [],
        "addIns": [],
        "ingredients": ["espresso", "water", "ice"],
        "isVegan": True,
        "isGlutenFree": True,
        "calories": 10,
        "rating": 4.5
    },
    {
        "name": "Oat Milk Cappuccino",
        "description": "Creamy cappuccino with vegan oat milk and foam",
        "price": 5.00,
        "sodas": [],
        "syrups": [],
        "addIns": ["foam"],
        "ingredients": ["espresso", "oat milk", "foam"],
        "isVegan": True,
        "isGlutenFree": True,
        "calories": 120,
        "rating": 4.8
    },
    {
        "name": "Green Tea Latte",
        "description": "Smooth green tea with creamy milk and a touch of vanilla",
        "price": 4.00,
        "sodas": [],
        "syrups": ["vanilla"],
        "addIns": [],
        "ingredients": ["green tea", "milk", "vanilla"],
        "isVegan": False,
        "isGlutenFree": True,
        "calories": 100,
        "rating": 4.3
    },
    {
        "name": "Berry Smoothie",
        "description": "Fresh strawberry and blueberry blend with yogurt",
        "price": 6.00,
        "sodas": [],
        "syrups": [],
        "addIns": [],
        "ingredients": ["strawberry", "blueberry", "yogurt", "banana"],
        "isVegan": False,
        "isGlutenFree": True,
        "calories": 250,
        "rating": 4.6
    },
    {
        "name": "Tropical Smoothie",
        "description": "Exotic mango and pineapple with coconut milk",
        "price": 6.50,
        "sodas": [],
        "syrups": [],
        "addIns": [],
        "ingredients": ["mango", "pineapple", "coconut milk"],
        "isVegan": True,
        "isGlutenFree": True,
        "calories": 280,
        "rating": 4.4
    },
    {
        "name": "Fresh Orange Juice",
        "description": "Freshly squeezed orange juice with ice",
        "price": 5.00,
        "sodas": [],
        "syrups": [],
        "addIns": [],
        "ingredients": ["fresh oranges", "ice"],
        "isVegan": True,
        "isGlutenFree": True,
        "calories": 120,
        "rating": 4.5
    },
    {
        "name": "Caramel Macchiato",
        "description": "Espresso with velvety milk and rich caramel drizzle",
        "price": 5.50,
        "sodas": [],
        "syrups": ["caramel"],
        "addIns": ["whip"],
        "ingredients": ["espresso", "milk", "caramel syrup"],
        "isVegan": False,
        "isGlutenFree": True,
        "calories": 220,
        "rating": 4.9
    }
]

# User Preferences - 2-3 preferences per user
# Note: API expects "preference" field from the allowed list (sodas, syrups, creams, fruits, etc.)
# Valid preferences include: mtn. dew, sprite, coke, pepsi, vanilla, caramel, chocolate, strawberry, whip, sprinkles, etc.
SEED_PREFERENCES = [
    # Superadmin's preferences
    {
        "username": "superadmin",
        "preference": "vanilla",
        "preferenceType": "favorite",
        "sweetness": "medium",
        "temperature": "hot"
    },
    {
        "username": "superadmin",
        "preference": "coconut",
        "preferenceType": "dislike"
    },
    # Manager's preferences
    {
        "username": "manager",
        "preference": "salted caramel",
        "preferenceType": "favorite",
        "sweetness": "high",
        "temperature": "hot"
    },
    {
        "username": "manager",
        "preference": "whip",
        "preferenceType": "favorite"
    },
    # Admin's preferences
    {
        "username": "admin",
        "preference": "chocolate",
        "preferenceType": "favorite"
    },
    {
        "username": "admin",
        "preference": "mtn. dew",
        "preferenceType": "recommended"
    },
    # Customer's preferences
    {
        "username": "customer",
        "preference": "strawberry",
        "preferenceType": "favorite",
        "sweetness": "medium",
        "temperature": "cold"
    },
    {
        "username": "customer",
        "preference": "whip",
        "preferenceType": "favorite"
    },
    {
        "username": "customer",
        "preference": "pepsi",
        "preferenceType": "dislike"
    },
    {
        "username": "repair",
        "preference": "vanilla",
        "preferenceType": "favorite",
    },
    {
        "username": "customer2",
        "preference": "caramel",
        "preferenceType": "favorite",
    },
]

# Inventory Items - Stock levels for admin testing
# Note: API expects itemName, itemType, quantity, thresholdLevel (not minThreshold), storeId (required), and optional: costPerUnit, supplier
# itemType values: 'Soda', 'Syrup', 'Add In', 'Physical'
# Same flavor name is repeated per store (store 1/2/3) — each row is that store's stock, not a duplicate SKU.
# Created for 3 stores with variety to test store selection

SEED_INVENTORY = [
    # ======================== STORE 1: Downtown Café ========================
    # Sodas - Full selection with good stock
    {
        "storeId": 1,
        "itemName": "sprite",
        "itemType": "Soda",
        "quantity": 50,
        "thresholdLevel": 15,
        "supplier": "PepsiCo",
        "costPerUnit": 1.50
    },
    {
        "storeId": 1,
        "itemName": "coke",
        "itemType": "Soda",
        "quantity": 45,
        "thresholdLevel": 15,
        "supplier": "Coca-Cola",
        "costPerUnit": 1.50
    },
    {
        "storeId": 1,
        "itemName": "pepsi",
        "itemType": "Soda",
        "quantity": 40,
        "thresholdLevel": 12,
        "supplier": "PepsiCo",
        "costPerUnit": 1.50
    },
    {
        "storeId": 1,
        "itemName": "mtn. dew",
        "itemType": "Soda",
        "quantity": 35,
        "thresholdLevel": 10,
        "supplier": "PepsiCo",
        "costPerUnit": 1.50
    },
    {
        "storeId": 1,
        "itemName": "dr. pepper",
        "itemType": "Soda",
        "quantity": 30,
        "thresholdLevel": 10,
        "supplier": "Keurig Dr Pepper",
        "costPerUnit": 1.60
    },
    {
        "storeId": 1,
        "itemName": "fanta",
        "itemType": "Soda",
        "quantity": 28,
        "thresholdLevel": 8,
        "supplier": "Coca-Cola",
        "costPerUnit": 1.55
    },
    {
        "storeId": 1,
        "itemName": "rootbeer",
        "itemType": "Soda",
        "quantity": 25,
        "thresholdLevel": 8,
        "supplier": "A&W",
        "costPerUnit": 1.70
    },
    {
        "storeId": 1,
        "itemName": "lemonade",
        "itemType": "Soda",
        "quantity": 32,
        "thresholdLevel": 10,
        "supplier": "Minute Maid",
        "costPerUnit": 1.40
    },
    
    # Syrups - Popular flavors with good stock
    {
        "storeId": 1,
        "itemName": "vanilla",
        "itemType": "Syrup",
        "quantity": 45,
        "thresholdLevel": 15,
        "supplier": "Flavor Co.",
        "costPerUnit": 8.50
    },
    {
        "storeId": 1,
        "itemName": "salted caramel",
        "itemType": "Syrup",
        "quantity": 38,
        "thresholdLevel": 12,
        "supplier": "Flavor Co.",
        "costPerUnit": 9.00
    },
    {
        "storeId": 1,
        "itemName": "strawberry",
        "itemType": "Syrup",
        "quantity": 35,
        "thresholdLevel": 10,
        "supplier": "Flavor Co.",
        "costPerUnit": 8.75
    },
    {
        "storeId": 1,
        "itemName": "raspberry",
        "itemType": "Syrup",
        "quantity": 30,
        "thresholdLevel": 10,
        "supplier": "Flavor Co.",
        "costPerUnit": 8.75
    },
    {
        "storeId": 1,
        "itemName": "mango",
        "itemType": "Syrup",
        "quantity": 28,
        "thresholdLevel": 8,
        "supplier": "Flavor Co.",
        "costPerUnit": 8.50
    },
    {
        "storeId": 1,
        "itemName": "chocolate milano",
        "itemType": "Syrup",
        "quantity": 32,
        "thresholdLevel": 10,
        "supplier": "Flavor Co.",
        "costPerUnit": 9.25
    },
    {
        "storeId": 1,
        "itemName": "hazelnut",
        "itemType": "Syrup",
        "quantity": 26,
        "thresholdLevel": 8,
        "supplier": "Flavor Co.",
        "costPerUnit": 8.75
    },
    {
        "storeId": 1,
        "itemName": "pineapple",
        "itemType": "Syrup",
        "quantity": 24,
        "thresholdLevel": 8,
        "supplier": "Flavor Co.",
        "costPerUnit": 8.50
    },
    {
        "storeId": 1,
        "itemName": "blue raspberry",
        "itemType": "Syrup",
        "quantity": 20,
        "thresholdLevel": 6,
        "supplier": "Flavor Co.",
        "costPerUnit": 8.50
    },
    
    # Add-Ins
    {
        "storeId": 1,
        "itemName": "whip",
        "itemType": "Add In",
        "quantity": 60,
        "thresholdLevel": 20,
        "supplier": "Dairy Cream Co.",
        "costPerUnit": 2.50
    },
    {
        "storeId": 1,
        "itemName": "cream",
        "itemType": "Add In",
        "quantity": 50,
        "thresholdLevel": 18,
        "supplier": "Dairy Cream Co.",
        "costPerUnit": 2.25
    },
    {
        "storeId": 1,
        "itemName": "sprinkles",
        "itemType": "Add In",
        "quantity": 40,
        "thresholdLevel": 12,
        "supplier": "Sweet Supplies Ltd.",
        "costPerUnit": 3.00
    },
    {
        "storeId": 1,
        "itemName": "candy",
        "itemType": "Add In",
        "quantity": 35,
        "thresholdLevel": 10,
        "supplier": "Sweet Supplies Ltd.",
        "costPerUnit": 3.50
    },
    
    # ======================== STORE 2: Uptown Hub ========================
    # Smaller store - selective inventory, some low stock items
    {
        "storeId": 2,
        "itemName": "sprite",
        "itemType": "Soda",
        "quantity": 30,
        "thresholdLevel": 10,
        "supplier": "PepsiCo",
        "costPerUnit": 1.50
    },
    {
        "storeId": 2,
        "itemName": "coke",
        "itemType": "Soda",
        "quantity": 35,
        "thresholdLevel": 12,
        "supplier": "Coca-Cola",
        "costPerUnit": 1.50
    },
    {
        "storeId": 2,
        "itemName": "pepsi",
        "itemType": "Soda",
        "quantity": 25,
        "thresholdLevel": 10,
        "supplier": "PepsiCo",
        "costPerUnit": 1.50
    },
    {
        "storeId": 2,
        "itemName": "mtn. dew",
        "itemType": "Soda",
        "quantity": 8,
        "thresholdLevel": 10,
        "supplier": "PepsiCo",
        "costPerUnit": 1.50
    },
    {
        "storeId": 2,
        "itemName": "fanta",
        "itemType": "Soda",
        "quantity": 20,
        "thresholdLevel": 8,
        "supplier": "Coca-Cola",
        "costPerUnit": 1.55
    },
    {
        "storeId": 2,
        "itemName": "lemonade",
        "itemType": "Soda",
        "quantity": 15,
        "thresholdLevel": 10,
        "supplier": "Minute Maid",
        "costPerUnit": 1.40
    },
    
    # Syrups - Limited selection
    {
        "storeId": 2,
        "itemName": "vanilla",
        "itemType": "Syrup",
        "quantity": 28,
        "thresholdLevel": 10,
        "supplier": "Flavor Co.",
        "costPerUnit": 8.50
    },
    {
        "storeId": 2,
        "itemName": "salted caramel",
        "itemType": "Syrup",
        "quantity": 22,
        "thresholdLevel": 8,
        "supplier": "Flavor Co.",
        "costPerUnit": 9.00
    },
    {
        "storeId": 2,
        "itemName": "strawberry",
        "itemType": "Syrup",
        "quantity": 5,
        "thresholdLevel": 10,
        "supplier": "Flavor Co.",
        "costPerUnit": 8.75
    },
    {
        "storeId": 2,
        "itemName": "raspberry",
        "itemType": "Syrup",
        "quantity": 18,
        "thresholdLevel": 8,
        "supplier": "Flavor Co.",
        "costPerUnit": 8.75
    },
    {
        "storeId": 2,
        "itemName": "chocolate milano",
        "itemType": "Syrup",
        "quantity": 20,
        "thresholdLevel": 8,
        "supplier": "Flavor Co.",
        "costPerUnit": 9.25
    },
    
    # Add-Ins
    {
        "storeId": 2,
        "itemName": "whip",
        "itemType": "Add In",
        "quantity": 35,
        "thresholdLevel": 15,
        "supplier": "Dairy Cream Co.",
        "costPerUnit": 2.50
    },
    {
        "storeId": 2,
        "itemName": "cream",
        "itemType": "Add In",
        "quantity": 28,
        "thresholdLevel": 12,
        "supplier": "Dairy Cream Co.",
        "costPerUnit": 2.25
    },
    {
        "storeId": 2,
        "itemName": "sprinkles",
        "itemType": "Add In",
        "quantity": 4,
        "thresholdLevel": 10,
        "supplier": "Sweet Supplies Ltd.",
        "costPerUnit": 3.00
    },
    
    # ======================== STORE 3: Westside Lounge ========================
    # Boutique store - premium selection with unique items
    {
        "storeId": 3,
        "itemName": "sprite",
        "itemType": "Soda",
        "quantity": 25,
        "thresholdLevel": 8,
        "supplier": "PepsiCo",
        "costPerUnit": 1.50
    },
    {
        "storeId": 3,
        "itemName": "coke",
        "itemType": "Soda",
        "quantity": 28,
        "thresholdLevel": 10,
        "supplier": "Coca-Cola",
        "costPerUnit": 1.50
    },
    {
        "storeId": 3,
        "itemName": "pepsi",
        "itemType": "Soda",
        "quantity": 22,
        "thresholdLevel": 8,
        "supplier": "PepsiCo",
        "costPerUnit": 1.50
    },
    {
        "storeId": 3,
        "itemName": "dr. pepper",
        "itemType": "Soda",
        "quantity": 20,
        "thresholdLevel": 8,
        "supplier": "Keurig Dr Pepper",
        "costPerUnit": 1.60
    },
    {
        "storeId": 3,
        "itemName": "rootbeer",
        "itemType": "Soda",
        "quantity": 32,
        "thresholdLevel": 10,
        "supplier": "A&W",
        "costPerUnit": 1.70
    },
    
    # Syrups - Premium/unique flavors
    {
        "storeId": 3,
        "itemName": "vanilla",
        "itemType": "Syrup",
        "quantity": 35,
        "thresholdLevel": 12,
        "supplier": "Flavor Co.",
        "costPerUnit": 8.50
    },
    {
        "storeId": 3,
        "itemName": "salted caramel",
        "itemType": "Syrup",
        "quantity": 30,
        "thresholdLevel": 10,
        "supplier": "Flavor Co.",
        "costPerUnit": 9.00
    },
    {
        "storeId": 3,
        "itemName": "lavender",
        "itemType": "Syrup",
        "quantity": 18,
        "thresholdLevel": 6,
        "supplier": "Flavor Co.",
        "costPerUnit": 10.50
    },
    {
        "storeId": 3,
        "itemName": "pumpkin spice",
        "itemType": "Syrup",
        "quantity": 25,
        "thresholdLevel": 8,
        "supplier": "Flavor Co.",
        "costPerUnit": 9.75
    },
    {
        "storeId": 3,
        "itemName": "gingerbread",
        "itemType": "Syrup",
        "quantity": 16,
        "thresholdLevel": 6,
        "supplier": "Flavor Co.",
        "costPerUnit": 9.50
    },
    {
        "storeId": 3,
        "itemName": "irish cream",
        "itemType": "Syrup",
        "quantity": 12,
        "thresholdLevel": 5,
        "supplier": "Flavor Co.",
        "costPerUnit": 10.00
    },
    {
        "storeId": 3,
        "itemName": "mojito",
        "itemType": "Syrup",
        "quantity": 14,
        "thresholdLevel": 5,
        "supplier": "Flavor Co.",
        "costPerUnit": 9.25
    },
    
    # Add-Ins - Premium options
    {
        "storeId": 3,
        "itemName": "whip",
        "itemType": "Add In",
        "quantity": 42,
        "thresholdLevel": 15,
        "supplier": "Dairy Cream Co.",
        "costPerUnit": 2.50
    },
    {
        "storeId": 3,
        "itemName": "cream",
        "itemType": "Add In",
        "quantity": 38,
        "thresholdLevel": 12,
        "supplier": "Dairy Cream Co.",
        "costPerUnit": 2.25
    },
    {
        "storeId": 3,
        "itemName": "candy",
        "itemType": "Add In",
        "quantity": 28,
        "thresholdLevel": 10,
        "supplier": "Sweet Supplies Ltd.",
        "costPerUnit": 3.50
    },
]

# Test Data Summary
SEED_CONFIG = {
    "users": len(SEED_USERS),
    "drinks": len(SEED_DRINKS),
    "preferences": len(SEED_PREFERENCES),
    "inventory": len(SEED_INVENTORY),
    "machines": len(SEED_MACHINES),
    "orders": SEED_ORDER_COUNT,
    "description": "CodePop test data: users, drinks, preferences, inventory, machines, orders, revenue, logistics",
}

# Test Credentials for reference
TEST_CREDENTIALS = {
    "superadmin": {
        "username": "superadmin",
        "email": "superadmin@example.com",
        "password": "SuperAdmin123",
        "description": "Super Administrator - full access across all stores"
    },
    "manager": {
        "username": "manager",
        "email": "manager@example.com",
        "password": "Manager123",
        "description": "Store Manager - can manage store operations and staff"
    },
    "admin": {
        "username": "admin",
        "email": "admin@example.com",
        "password": "Admin123",
        "description": "Administrator - full access to all features"
    },
    "customer": {
        "username": "customer",
        "email": "customer@example.com",
        "password": "Customer123",
        "description": "Regular customer - can browse drinks, place orders, manage preferences"
    },
    "repair": {
        "username": "repair",
        "email": "repair@example.com",
        "password": "Repair12345",
        "description": "Repair staff - maintenance machines and status in assigned stores",
    },
    "customer2": {
        "username": "customer2",
        "email": "jane@example.com",
        "password": "Customer123",
        "description": "Second test customer account",
    },
}
