"""
Seed Configuration for CodePop Testing Data

This file defines all test data: users, drinks, preferences, and inventory.
Used by seed_data.py to populate the OrbitDB backend.
"""

# Test Users - 3 accounts with different roles
SEED_USERS = [
    {
        "username": "superadmin",
        "email": "superadmin@example.com",
        "password": "superadmin",
        "firstName": "Superadmin",
        "lastName": "Superadmin",
        "role": "superadmin"
    },
    {
        "username": "manager",
        "email": "manager@example.com",
        "password": "manager",
        "firstName": "Manager",
        "lastName": "Manager",
        "role": "manager"
    },
    {
        "username": "admin",
        "email": "admin@example.com",
        "password": "admin",
        "firstName": "Admin",
        "lastName": "Admin",
        "role": "admin"
    },
]

# Drinks Menu - 8 drinks covering major categories
SEED_DRINKS = [
    {
        "name": "Vanilla Latte",
        "category": "coffee",
        "description": "Smooth espresso with steamed milk and vanilla syrup",
        "price": 4.50,
        "isVegan": False,
        "isGlutenFree": True,
        "calories": 190,
        "ingredients": ["espresso", "milk", "vanilla syrup"],
        "syrups": ["vanilla"],
        "sodas": [],
        "rating": 4.7
    },
    {
        "name": "Iced Americano",
        "category": "coffee",
        "description": "Bold espresso shots with cold water and ice",
        "price": 3.50,
        "isVegan": True,
        "isGlutenFree": True,
        "calories": 10,
        "ingredients": ["espresso", "water", "ice"],
        "syrups": [],
        "sodas": [],
        "rating": 4.5
    },
    {
        "name": "Oat Milk Cappuccino",
        "category": "coffee",
        "description": "Creamy cappuccino with vegan oat milk and foam",
        "price": 5.00,
        "isVegan": True,
        "isGlutenFree": True,
        "calories": 120,
        "ingredients": ["espresso", "oat milk", "foam"],
        "syrups": [],
        "sodas": [],
        "rating": 4.8
    },
    {
        "name": "Green Tea Latte",
        "category": "tea",
        "description": "Smooth green tea with creamy milk and a touch of vanilla",
        "price": 4.00,
        "isVegan": False,
        "isGlutenFree": True,
        "calories": 100,
        "ingredients": ["green tea", "milk", "vanilla"],
        "syrups": ["vanilla"],
        "sodas": [],
        "rating": 4.3
    },
    {
        "name": "Berry Smoothie",
        "category": "smoothie",
        "description": "Fresh strawberry and blueberry blend with yogurt",
        "price": 6.00,
        "isVegan": False,
        "isGlutenFree": True,
        "calories": 250,
        "ingredients": ["strawberry", "blueberry", "yogurt", "banana"],
        "syrups": [],
        "sodas": [],
        "rating": 4.6
    },
    {
        "name": "Tropical Smoothie",
        "category": "smoothie",
        "description": "Exotic mango and pineapple with coconut milk",
        "price": 6.50,
        "isVegan": True,
        "isGlutenFree": True,
        "calories": 280,
        "ingredients": ["mango", "pineapple", "coconut milk"],
        "syrups": [],
        "sodas": [],
        "rating": 4.4
    },
    {
        "name": "Fresh Orange Juice",
        "category": "juice",
        "description": "Freshly squeezed orange juice with ice",
        "price": 5.00,
        "isVegan": True,
        "isGlutenFree": True,
        "calories": 120,
        "ingredients": ["fresh oranges", "ice"],
        "syrups": [],
        "sodas": [],
        "rating": 4.5
    },
    {
        "name": "Caramel Macchiato",
        "category": "coffee",
        "description": "Espresso with velvety milk and rich caramel drizzle",
        "price": 5.50,
        "isVegan": False,
        "isGlutenFree": True,
        "calories": 220,
        "ingredients": ["espresso", "milk", "caramel syrup"],
        "syrups": ["caramel"],
        "sodas": [],
        "rating": 4.9
    }
]

# User Preferences - 2-3 preferences per user
SEED_PREFERENCES = [
    # Jane's preferences
    {
        "username": "customer_jane",
        "preference_type": "favorite",
        "drink_name": "Vanilla Latte",
        "sweetness": "medium",
        "temperature": "hot",
        "details": "My regular order"
    },
    {
        "username": "customer_jane",
        "preference_type": "dislike",
        "ingredient_name": "coconut milk",
        "details": "Too strong of a taste"
    },
    {
        "username": "customer_jane",
        "preference_type": "allergic",
        "drink_name": "Berry Smoothie",
        "details": "Dairy sensitivity"
    },
    # Bob's preferences
    {
        "username": "staff_bob",
        "preference_type": "favorite",
        "drink_name": "Iced Americano",
        "temperature": "cold",
        "details": "Perfect for work"
    },
    {
        "username": "staff_bob",
        "preference_type": "ingredient_preference",
        "ingredient_name": "extra ice",
        "details": "Always extra ice"
    },
    # Alex's preferences
    {
        "username": "admin_alex",
        "preference_type": "favorite",
        "drink_name": "Caramel Macchiato",
        "sweetness": "high",
        "temperature": "hot",
        "details": "My favorite indulgence"
    },
    {
        "username": "admin_alex",
        "preference_type": "recommended",
        "drink_name": "Oat Milk Cappuccino",
        "details": "Great vegan option"
    }
]

# Inventory Items - Stock levels for admin testing
SEED_INVENTORY = [
    {
        "itemName": "Vanilla Syrup",
        "itemType": "Syrup",
        "quantity": 30,
        "thresholdLevel": 10,
        "supplier": "Flavor Co.",
        "costPerUnit": 8.50
    },
    {
        "itemName": "Caramel Syrup",
        "itemType": "Syrup",
        "quantity": 25,
        "thresholdLevel": 10,
        "supplier": "Flavor Co.",
        "costPerUnit": 9.00
    },
    {
        "itemName": "Oat Milk",
        "itemType": "Add In",
        "quantity": 40,
        "thresholdLevel": 15,
        "supplier": "Dairy Alternatives Inc.",
        "costPerUnit": 3.50
    },
    {
        "itemName": "Whole Milk",
        "itemType": "Add In",
        "quantity": 50,
        "thresholdLevel": 20,
        "supplier": "Local Dairy Farm",
        "costPerUnit": 2.75
    },
    {
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
    "customer": {
        "username": "customer_jane",
        "email": "jane@example.com",
        "password": "Customer123!",
        "description": "Regular customer - can browse, order, and rate"
    },
    "staff": {
        "username": "staff_bob",
        "email": "bob@example.com",
        "password": "Staff123!",
        "description": "Staff member - can prepare orders, manage inventory"
    },
    "admin": {
        "username": "admin_alex",
        "email": "alex@example.com",
        "password": "Admin123!",
        "description": "Administrator - full access to all features"
    }
}
