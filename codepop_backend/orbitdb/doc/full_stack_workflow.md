# CodePop Full Stack Testing Workflows

Complete step-by-step testing scenarios for the full CodePop application.

## Table of Contents

1. [Initial Setup](#initial-setup)
2. [Scenario 1: Customer Ordering](#scenario-1-customer-ordering)
3. [Scenario 2: Admin Management](#scenario-2-admin-management)
4. [Scenario 3: Staff Operations](#scenario-3-staff-operations)
5. [Scenario 4: Multiple Users](#scenario-4-multiple-users-concurrent)
6. [Scenario 5: Edge Cases](#scenario-5-edge-cases)

---

## Initial Setup

Before starting any scenario, ensure:

1. Backend is running:
   ```bash
   # Terminal 1
   cd codepop_backend/orbitdb
   npm run bootstrap
   
   # Terminal 2
   npm run peer
   ```

2. Data is seeded:
   ```bash
   # Terminal 3
   python3 scripts/seed_data.py --all
   ```

3. Frontend is running:
   ```bash
   # Terminal 4
   cd codepop
   npm start
   # Press 'w' for web
   ```

4. You should have:
   - Backend: http://localhost:3001 (running)
   - Frontend: http://localhost:19006 (open in browser)
   - 3 test users with data
   - 8 drinks in menu
   - User preferences set up

---

## Scenario 1: Customer Ordering

Test the complete customer order flow.

### Step 1: Login as Customer

1. Open http://localhost:19006
2. Click "Login" or "Create Account"
3. Enter credentials:
   ```
   Username: customer_jane
   Password: Customer123!
   ```
4. Click "Login"

Expected result:
- Logged in as Jane Smith
- Redirected to home page
- Can see drinks menu

### Step 2: Browse Drinks Menu

1. On home page, view available drinks
2. Should see 8 drinks:
   - Vanilla Latte ($4.50)
   - Iced Americano ($3.50)
   - Oat Milk Cappuccino ($5.00)
   - Green Tea Latte ($4.00)
   - Berry Smoothie ($6.00)
   - Tropical Smoothie ($6.50)
   - Fresh Orange Juice ($5.00)
   - Caramel Macchiato ($5.50)

3. Click on drinks to see details
4. Check ratings and nutritional info

Expected result:
- All 8 drinks visible with correct prices
- Can click to see full details
- Ratings displayed (4.3-4.9 stars)

### Step 3: Add to Cart

1. Select "Vanilla Latte" (Jane's favorite)
2. Click "Add to Cart"
3. Quantity: 1 (default)
4. Add to cart

Expected result:
- Drink added to cart
- Cart icon shows item count
- Can continue shopping

### Step 4: Add Multiple Items

1. Go back to menu
2. Add "Green Tea Latte" (Jane's other option)
   - Quantity: 1
3. Add "Iced Americano"
   - Quantity: 1

Expected result:
- Cart now has 3 items
- Total: $4.50 + $4.00 + $3.50 = $12.00

### Step 5: View Cart

1. Click cart icon
2. Should see:
   - Vanilla Latte x1: $4.50
   - Green Tea Latte x1: $4.00
   - Iced Americano x1: $3.50
   - Total: $12.00

3. Options to:
   - Remove items
   - Change quantities
   - Proceed to checkout

Expected result:
- Cart displays all items correctly
- Can modify quantities
- Correct total calculation

### Step 6: Add Special Instructions

1. In cart, find option for special instructions
2. Add: "Extra hot on coffee drinks"
3. Save

Expected result:
- Special instructions added
- Saved to order

### Step 7: Check Preferences Warning

1. Try to add "Berry Smoothie" (Jane has dairy allergy)
2. System should show warning:
   - "You have marked this item as allergenic"
   - Can still order with acknowledgment

Expected result:
- Allergy warning shown
- Can override if desired
- Confirms Jane's preference

### Step 8: Proceed to Checkout

1. Click "Checkout"
2. Review order:
   - All items shown
   - Special instructions displayed
   - Total: $12.00 + allergy warning

Expected result:
- Checkout page loads
- Order summary correct
- Ready for payment

### Step 9: Process Payment

1. Select payment method: "Card"
2. Enter card details (mock):
   ```
   Card: 4242424242424242
   Exp: 12/25
   CVC: 123
   ```
3. Click "Pay"

Expected result:
- Payment processed
- Order confirmed with ID
- Redirected to order confirmation page

### Step 10: View Order and QR Code

1. On confirmation page, should see:
   - Order ID (e.g., #1)
   - Status: "Pending"
   - Items list
   - Total: $12.00
   - QR code for fridge access

2. Click on QR code
3. Should show:
   - Scannable QR code
   - Expiration time (1 hour from now)
   - Instruction: "Show this to access your order from the fridge"

Expected result:
- QR code generated successfully
- Can screenshot or print
- Valid for 1 hour

### Step 11: View Order History

1. Go to "My Orders"
2. Should see:
   - Order #1 listed
   - Status: "Pending"
   - Items and total
   - Created timestamp

Expected result:
- Order appears in history
- Status is correct
- Can click to see details

### Step 12: Logout

1. Click "Profile" or "Settings"
2. Click "Logout"

Expected result:
- Logged out successfully
- Redirected to login page

---

## Scenario 2: Admin Management

Test admin functions for system management.

### Step 1: Login as Admin

1. Open http://localhost:19006
2. Enter credentials:
   ```
   Username: admin_alex
   Password: Admin123!
   ```
3. Click "Login"

Expected result:
- Logged in as Alex Davis
- Admin dashboard accessible
- Can see additional options

### Step 2: View All Users

1. Click "Admin Dashboard"
2. Go to "Users" section
3. Should see:
   - customer_jane (Regular Customer)
   - staff_bob (Staff Member)
   - admin_alex (Administrator)

Expected result:
- All 3 users listed
- User details visible
- Can manage users

### Step 3: View All Orders

1. In Admin Dashboard, go to "Orders"
2. Should see:
   - All orders from all users
   - Status of each order
   - Order details

Expected result:
- Orders from Jane's purchase visible
- Can filter by status
- Can mark as ready/completed

### Step 4: Mark Order as Ready

1. Find Jane's order (#1)
2. Click "Mark as Ready"
3. Status should change to "Ready"

Expected result:
- Order status updated
- Jane receives notification
- Order ready for pickup

### Step 5: View Inventory

1. Go to "Inventory" section
2. Should see:
   - Vanilla Syrup: 30/50 liters
   - Caramel Syrup: 25/50 liters
   - Oat Milk: 40/60 liters
   - Whole Milk: 50/80 liters
   - Espresso Beans: 20/30 bags

Expected result:
- All inventory items listed
- Current quantity and capacity shown
- No items below minimum threshold

### Step 6: View Low Stock Alert

1. Manually edit an inventory item to low level
2. Drink Vanilla Syrup quantity to 8 liters (below 10 minimum)
3. System should show warning

Or check dashboard for automatic low stock alerts.

Expected result:
- Low stock items highlighted
- Alert shown to admin
- Recommendation to restock

### Step 7: Create New Drink

1. Go to "Drinks" section
2. Click "Create New Drink"
3. Fill in details:
   ```
   Name: Matcha Latte
   Category: Tea
   Price: 6.00
   Description: Creamy green tea powder with steamed milk
   Vegan: Yes
   Gluten-Free: Yes
   Calories: 150
   Ingredients: Matcha powder, milk, water
   ```
4. Click "Create"

Expected result:
- New drink created (ID: 9)
- Appears in menu immediately
- All users can see it

### Step 8: Edit Existing Drink

1. Go to "Drinks" section
2. Select "Vanilla Latte"
3. Edit:
   - Price: $4.50 → $4.75
   - Description: Add "Best seller"
4. Click "Save"

Expected result:
- Price updated
- Next orders reflect new price
- Old orders unaffected

### Step 9: View Revenue Reports

1. Go to "Revenue" section
2. Should see:
   - Daily revenue
   - Number of orders
   - Payment breakdown (cash, card, mobile)
   - Average order value

Example for today:
```
Orders: 1
Total Revenue: $12.00
Average Order: $12.00
Payment: Card 100%
```

Expected result:
- Revenue data displayed
- Can filter by date range
- Correct calculations

### Step 10: Generate Report

1. Click "Generate Report" or "Export"
2. Choose date range:
   - From: Today
   - To: Today
3. Format: CSV or PDF
4. Download

Expected result:
- Report generated
- Can open and view
- Contains all order details

### Step 11: View System Logs

1. Go to "System" or "Logs"
2. Should see:
   - Recent activities
   - User logins
   - Order creations
   - Data modifications

Expected result:
- Activity log visible
- Timestamps correct
- Can filter by type

### Step 12: Logout

1. Click "Logout"

Expected result:
- Admin dashboard closed
- Logged out
- Redirected to login

---

## Scenario 3: Staff Operations

Test staff functions for order preparation.

### Step 1: Login as Staff

1. Open http://localhost:19006
2. Enter credentials:
   ```
   Username: staff_bob
   Password: Staff123!
   ```
3. Click "Login"

Expected result:
- Logged in as Bob Johnson
- Staff dashboard accessible

### Step 2: View Pending Orders

1. Click "Staff Dashboard"
2. Go to "Pending Orders"
3. Should see:
   - Jane's order (#1)
   - Status: "Pending" or "Ready" (from admin scenario)
   - Items:
     - Vanilla Latte x1
     - Green Tea Latte x1
     - Iced Americano x1
   - Special instructions: "Extra hot on coffee drinks"

Expected result:
- Pending orders listed
- Can see items and instructions
- Ready to prepare

### Step 3: Mark Order as Preparing

1. Click on order #1
2. Click "Start Preparing"
3. Status changes to "Preparing"

Expected result:
- Status updated
- Order moved to "Preparing" section
- User notified

### Step 4: Mark Order as Ready

1. After preparing (simulated)
2. Click "Mark Ready"
3. Status changes to "Ready"

Expected result:
- Status updated
- Customer notified (notification sent)
- Order ready for pickup

### Step 5: View Inventory for Preparation

1. Go to "Inventory" section
2. Check available items:
   - Vanilla Syrup: 30 liters (enough)
   - Whole Milk: 50 liters (enough)
   - Espresso Beans: 20 bags (enough)

Expected result:
- Can see stock levels
- Know if items available
- Alert if low stock

### Step 6: Update Inventory After Preparation

1. Used for order #1:
   - Vanilla Syrup: -0.5 liters (for latte)
   - Whole Milk: -2 liters (for 3 drinks)
   - Espresso Beans: -1 bag (for 2 coffee drinks)

2. Manually update or system auto-deducts:
   - Vanilla Syrup: 30 → 29.5
   - Whole Milk: 50 → 48
   - Espresso Beans: 20 → 19

Expected result:
- Inventory tracking works
- Can manually adjust if needed
- History recorded

### Step 7: View Completed Orders

1. Go to "Completed Orders"
2. Should see orders that are "Ready"
3. Can mark as "Picked Up" when customer takes order

Expected result:
- Completed orders listed
- Timestamps shown
- Can finalize

### Step 8: Logout

1. Click "Logout"

Expected result:
- Logged out
- Back to login page

---

## Scenario 4: Multiple Users (Concurrent)

Test multiple users accessing system simultaneously.

### Setup

- Browser Window 1: Logged in as customer_jane
- Browser Window 2: Logged in as admin_alex
- Browser Window 3: Logged in as staff_bob

### Test

1. **Window 1 (Customer)**: Browse menu
2. **Window 2 (Admin)**: View dashboard
3. **Window 3 (Staff)**: View pending orders

Expected result:
- All 3 users can access simultaneously
- No conflicts
- Each sees appropriate data
- Data updates propagate to all

### Test Data Changes

1. **Window 2 (Admin)**: Change drink price
2. **Window 1 (Customer)**: Refresh menu
3. New price should appear

Expected result:
- Changes visible across all sessions
- No data loss
- Consistent state maintained

### Test Order Workflow

1. **Window 1 (Customer)**: Creates order
2. **Window 2 (Admin)**: Sees order immediately
3. **Window 3 (Staff)**: Gets notification to prepare

Expected result:
- Order flows through system
- All users see updates in real-time
- No delays

---

## Scenario 5: Edge Cases

Test boundary conditions and error handling.

### Edge Case 1: Duplicate Order

1. Customer Jane orders same items twice
2. System should:
   - Allow duplicate orders
   - Create separate order records
   - Both processed independently

### Edge Case 2: Allergy Override

1. Customer Jane tries to order "Berry Smoothie" (marked allergic)
2. System warns but allows with confirmation
3. Order processed successfully

Expected result:
- Warning shown
- Customer can override
- Order proceeds with allergy noted

### Edge Case 3: Low Stock Order

1. Staff Bob uses lots of vanilla syrup
2. Inventory drops to 5 liters (below 10 minimum)
3. System alerts admin

Expected result:
- Alert triggered
- Admin notified
- Can still process orders
- Restock needed

### Edge Case 4: Price Change During Order

1. Admin changes price while customer in checkout
2. Customer should see:
   - Original price they selected
   - Or notification of price change
   - Can confirm new price

Expected result:
- Customer protected
- New price shown
- Can proceed or cancel

### Edge Case 5: Concurrent Inventory Deduction

1. Two orders process simultaneously
2. Both use same item
3. Inventory should deduct correctly for both

Example:
- Espresso Beans: 20 bags
- Order 1: -2 bags
- Order 2: -1 bag
- Result: 17 bags (not 18 or 19)

Expected result:
- Correct final count
- No race conditions
- Accurate tracking

### Edge Case 6: Order Cancellation

1. Customer Jane creates order
2. Cancels before staff begins preparing
3. Order deleted
4. Payment refunded (mock)

Expected result:
- Order removed from queue
- Staff doesn't see it
- Payment processed as refund
- Customer notified

### Edge Case 7: System Recovery

1. Forcefully shut down backend
2. Restart backend and peer
3. All data should persist
4. Orders and users still visible

Expected result:
- Data preserved in databases
- System recovers cleanly
- No data loss
- Users can login normally