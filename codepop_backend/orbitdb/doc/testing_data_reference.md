# CodePop Testing Data Reference

Complete reference for all test data seeded in CodePop.

## Test User Accounts

### 1. Customer Account

```
Username:     customer_jane
Email:        jane@example.com
Password:     Customer123!
First Name:   Jane
Last Name:    Smith
Role:         Regular Customer
Permissions:  Browse drinks, create orders, rate drinks, manage preferences
```

Use this account to test:
- Browsing drinks menu
- Adding items to cart
- Creating and modifying orders
- Rating drinks
- Managing personal preferences
- Processing payments

### 2. Staff Account

```
Username:     staff_bob
Email:        bob@example.com
Password:     Staff123!
First Name:   Bob
Last Name:    Johnson
Role:         Staff Member
Permissions:  View orders, prepare orders, manage inventory
```

Use this account to test:
- Viewing orders to prepare
- Marking orders as ready
- Managing inventory stock
- Viewing low stock alerts

### 3. Admin Account

```
Username:     admin_alex
Email:        alex@example.com
Password:     Admin123!
First Name:   Alex
Last Name:    Davis
Role:         Administrator
Permissions:  Full access to all features
```

Use this account to test:
- Creating and managing drinks
- Viewing all users and orders
- Managing inventory
- Creating new users
- Accessing admin dashboard

---

## Drinks Menu (8 Items)

### Coffee Category (4 drinks)

#### 1. Vanilla Latte
- Price: $4.50
- Calories: 190
- Vegan: No
- Gluten-Free: Yes
- Ingredients: espresso, milk, vanilla syrup
- Syrups: vanilla
- Rating: 4.7/5
- Description: Smooth espresso with steamed milk and vanilla syrup

#### 2. Iced Americano
- Price: $3.50
- Calories: 10
- Vegan: Yes
- Gluten-Free: Yes
- Ingredients: espresso, water, ice
- Rating: 4.5/5
- Description: Bold espresso shots with cold water and ice

#### 3. Oat Milk Cappuccino
- Price: $5.00
- Calories: 120
- Vegan: Yes
- Gluten-Free: Yes
- Ingredients: espresso, oat milk, foam
- Rating: 4.8/5
- Description: Creamy cappuccino with vegan oat milk and foam

#### 4. Caramel Macchiato
- Price: $5.50
- Calories: 220
- Vegan: No
- Gluten-Free: Yes
- Ingredients: espresso, milk, caramel syrup
- Syrups: caramel
- Rating: 4.9/5
- Description: Espresso with velvety milk and rich caramel drizzle

### Tea Category (1 drink)

#### 5. Green Tea Latte
- Price: $4.00
- Calories: 100
- Vegan: No
- Gluten-Free: Yes
- Ingredients: green tea, milk, vanilla
- Syrups: vanilla
- Rating: 4.3/5
- Description: Smooth green tea with creamy milk and a touch of vanilla

### Smoothie Category (2 drinks)

#### 6. Berry Smoothie
- Price: $6.00
- Calories: 250
- Vegan: No
- Gluten-Free: Yes
- Ingredients: strawberry, blueberry, yogurt, banana
- Rating: 4.6/5
- Description: Fresh strawberry and blueberry blend with yogurt

#### 7. Tropical Smoothie
- Price: $6.50
- Calories: 280
- Vegan: Yes
- Gluten-Free: Yes
- Ingredients: mango, pineapple, coconut milk
- Rating: 4.4/5
- Description: Exotic mango and pineapple with coconut milk

### Juice Category (1 drink)

#### 8. Fresh Orange Juice
- Price: $5.00
- Calories: 120
- Vegan: Yes
- Gluten-Free: Yes
- Ingredients: fresh oranges, ice
- Rating: 4.5/5
- Description: Freshly squeezed orange juice with ice

---

## User Preferences

### Jane's Preferences (Customer)

1. **Favorite Drink**: Vanilla Latte
   - Sweetness: Medium
   - Temperature: Hot
   - Note: "My regular order"

2. **Disliked Ingredient**: Coconut milk
   - Note: "Too strong of a taste"

3. **Allergy**: Berry Smoothie
   - Note: "Dairy sensitivity"

### Bob's Preferences (Staff)

1. **Favorite Drink**: Iced Americano
   - Temperature: Cold
   - Note: "Perfect for work"

2. **Ingredient Preference**: Extra ice
   - Note: "Always extra ice"

### Alex's Preferences (Admin)

1. **Favorite Drink**: Caramel Macchiato
   - Sweetness: High
   - Temperature: Hot
   - Note: "My favorite indulgence"

2. **Recommended Drink**: Oat Milk Cappuccino
   - Note: "Great vegan option"

---

## Inventory Items (5 Items)

### Syrups

1. **Vanilla Syrup**
   - Quantity: 30 liters
   - Min Threshold: 10 liters
   - Max Capacity: 50 liters
   - Supplier: Flavor Co.
   - Cost per Unit: $8.50

2. **Caramel Syrup**
   - Quantity: 25 liters
   - Min Threshold: 10 liters
   - Max Capacity: 50 liters
   - Supplier: Flavor Co.
   - Cost per Unit: $9.00

### Supplies

3. **Oat Milk**
   - Quantity: 40 liters
   - Min Threshold: 15 liters
   - Max Capacity: 60 liters
   - Supplier: Dairy Alternatives Inc.
   - Cost per Unit: $3.50

4. **Whole Milk**
   - Quantity: 50 liters
   - Min Threshold: 20 liters
   - Max Capacity: 80 liters
   - Supplier: Local Dairy Farm
   - Cost per Unit: $2.75

5. **Espresso Beans**
   - Quantity: 20 bags
   - Min Threshold: 5 bags
   - Max Capacity: 30 bags
   - Supplier: Premium Coffee Roasters
   - Cost per Unit: $12.00

---

## Testing Scenarios

### Scenario 1: Customer Orders Favorite Drink

1. Login as: customer_jane / Customer123!
2. Browse drinks
3. Order: 1x Vanilla Latte
4. Modify: Add "extra hot" to special instructions
5. Proceed to checkout
6. Mock payment
7. Get QR code
8. View order status

### Scenario 2: Admin Manages Inventory

1. Login as: admin_alex / Admin123!
2. Access admin dashboard
3. View inventory levels
4. Check vanilla syrup (30/50 liters)
5. Check for low stock items
6. Restock vanilla syrup

### Scenario 3: Customer with Allergies

1. Login as: customer_jane / Customer123!
2. View preferences (has dairy allergy for Berry Smoothie)
3. Try to order Berry Smoothie
4. Should see allergy warning
5. Can still order but with acknowledgment

### Scenario 4: Staff Prepares Orders

1. Login as: staff_bob / Staff123!
2. View incoming orders
3. Mark order as "preparing"
4. Mark order as "ready"
5. Notify customer

### Scenario 5: Multiple Drinks Order

1. Login as: customer_jane / Customer123!
2. Order:
   - 2x Vanilla Latte ($4.50 each = $9.00)
   - 1x Green Tea Latte ($4.00)
   - 1x Iced Americano ($3.50)
3. Total: $16.50
4. Add special instructions for each drink
5. Process payment
6. Get QR code

---

## Password Requirements

All test passwords meet the security requirements:
- Minimum 8 characters
- Contains uppercase: A-Z
- Contains lowercase: a-z
- Contains number: 0-9
- Contains special character: !@#$%^&*

Example: `Customer123!`
- Uppercase: C
- Lowercase: ustomer
- Number: 123
- Special: !

---

## Quick Login Reference

Copy-paste ready credentials:

**Customer:**
```
Username: customer_jane
Password: Customer123!
```

**Staff:**
```
Username: staff_bob
Password: Staff123!
```

**Admin:**
```
Username: admin_alex
Password: Admin123!
```

---

## API Endpoints for Testing

### Health Check
```bash
curl http://localhost:3001/health
```

### Get All Drinks
```bash
curl http://localhost:3001/backend/drinks \
  -H "Authorization: Token YOUR_TOKEN"
```

### Get User Orders
```bash
curl http://localhost:3001/backend/orders \
  -H "Authorization: Token YOUR_TOKEN"
```

### Check Inventory (Admin)
```bash
curl http://localhost:3001/backend/inventory \
  -H "Authorization: Token YOUR_ADMIN_TOKEN"
```

---

## Data Persistence

All seeded data is persistent:
- Data survives app restarts
- Data survives backend restarts
- Databases are stored in `repo-bootstrap/` and `repo-peer-3001/`
- To clear data, use: `python3 scripts/seed_data.py --clear`
- To reseed, use: `python3 scripts/seed_data.py --reset`

---

## Notes

- All test passwords are intentionally simple for testing
- Do not use in production
- Test users have IDs starting from 1
- Test drinks have IDs starting from 1
- Backend URL: `http://localhost:3001`
- Frontend URL: `http://localhost:19006`
