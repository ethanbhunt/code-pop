"""
Seed Configuration for CodePop Testing Data

This file defines all test data: users, drinks, preferences, and inventory.
Used by seed_data.py to populate the OrbitDB backend.
"""

# Test Users - 3 accounts with different roles
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
]

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
    }
]

# Inventory Items - Stock levels for admin testing
# Note: API expects itemName, itemType, quantity, thresholdLevel (not minThreshold), storeId (required), and optional: costPerUnit, supplier
# itemType values: 'Soda', 'Syrup', 'Add In', 'Physical'
SEED_INVENTORY = [
    {
        "storeId": 1,
        "itemName": "Vanilla Syrup",
        "itemType": "Syrup",
        "quantity": 30,
        "thresholdLevel": 10,
        "supplier": "Flavor Co.",
        "costPerUnit": 8.50
    },
    {
        "storeId": 1,
        "itemName": "Caramel Syrup",
        "itemType": "Syrup",
        "quantity": 25,
        "thresholdLevel": 10,
        "supplier": "Flavor Co.",
        "costPerUnit": 9.00
    },
    {
        "storeId": 1,
        "itemName": "Oat Milk",
        "itemType": "Add In",
        "quantity": 40,
        "thresholdLevel": 15,
        "supplier": "Dairy Alternatives Inc.",
        "costPerUnit": 3.50
    },
    {
        "storeId": 1,
        "itemName": "Whole Milk",
        "itemType": "Add In",
        "quantity": 50,
        "thresholdLevel": 20,
        "supplier": "Local Dairy Farm",
        "costPerUnit": 2.75
    },
    {
        "storeId": 1,
        "itemName": "Espresso Beans",
        "itemType": "Physical",
        "quantity": 20,
        "thresholdLevel": 5,
        "supplier": "Premium Coffee Roasters",
        "costPerUnit": 12.00
    }
]

# Test Data Summary
SEED_CONFIG = {
    "users": len(SEED_USERS),
    "drinks": len(SEED_DRINKS),
    "preferences": len(SEED_PREFERENCES),
    "inventory": len(SEED_INVENTORY),
    "description": "CodePop test data with users, drinks, preferences, and inventory"
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
    }
}
