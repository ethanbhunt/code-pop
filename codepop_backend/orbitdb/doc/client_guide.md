# CodePop Backend API Client Guide

A comprehensive Python client library for the CodePop OrbitDB backend API. This client serves as the bridge between the React Native frontend and the decentralized backend.

## Overview

The `CodePopClient` provides a simple, Pythonic interface to interact with all CodePop backend API endpoints. It handles:

- **Authentication** - Register, login, logout
- **User Management** - Profile management, account deletion
- **Drinks** - Browse, create, update, manage favorites
- **Preferences** - User drink and ingredient preferences
- **Orders** - Create, update, cancel orders
- **Notifications** - Manage user notifications
- **Payments** - Process payments
- **Inventory** - Manage stock (admin only)
- **QR Codes** - Generate and validate QR codes

## Installation

### Requirements

- Python 3.8+
- No external dependencies (uses only stdlib `urllib`, `json`)

### Setup

```bash
cd codepop_backend/orbitdb
python3 client.py  # Run demo
```

## Quick Start

### Basic Usage

```python
from client import CodePopClient

# Initialize client
client = CodePopClient("http://localhost:3001")

# Register or login
user = client.register("john_doe", "john@example.com", "SecurePass123!")
# OR
user = client.login("john_doe", "SecurePass123!")

# Get current user
profile = client.get_current_user()
print(f"Logged in as: {profile.username}")

# List available drinks
drinks = client.list_drinks(limit=10)
for drink in drinks:
    print(f"- {drink['name']}: ${drink['price']:.2f}")

# Create an order
order = client.create_order(
    drink_ids=[1, 2],
    quantities=[1, 1],
    special_instructions="Extra hot, no foam"
)
print(f"Order created: #{order['orderId']}")

# Get user profile
profile = client.get_user_profile()
print(f"User: {profile.firstName} {profile.lastName}")

# Logout
client.logout()
```

## API Reference

### Authentication

#### `register(username, email, password) -> User`

Register a new user account.

**Parameters:**
- `username` (str): 3-30 characters, alphanumeric + underscore
- `email` (str): Valid email address
- `password` (str): Min 8 chars, must include uppercase, lowercase, number, special char

**Returns:** `User` object with authentication token

**Example:**
```python
user = client.register(
    "jane_doe",
    "jane@example.com",
    "SecurePass123!"
)
print(f"Token: {user.token}")
```

#### `login(username, password) -> User`

Authenticate and get authentication token.

**Parameters:**
- `username` (str): Username or email
- `password` (str): User password

**Returns:** `User` object with authentication token

**Example:**
```python
user = client.login("jane_doe", "SecurePass123!")
```

#### `logout() -> bool`

Logout current user and invalidate token.

**Returns:** `True` if logout successful

**Example:**
```python
client.logout()
```

### User Management

#### `get_current_user() -> User`

Get currently authenticated user profile.

**Returns:** `User` object

**Example:**
```python
user = client.get_current_user()
print(user.email)
```

#### `get_user_profile() -> User`

Alias for `get_current_user()`.

#### `update_user_profile(first_name=None, last_name=None, email=None) -> User`

Update current user's profile.

**Parameters (all optional):**
- `first_name` (str): First name
- `last_name` (str): Last name
- `email` (str): Email address

**Returns:** Updated `User` object

**Example:**
```python
user = client.update_user_profile(
    first_name="Jane",
    last_name="Doe"
)
```

#### `delete_account() -> bool`

Delete current user account.

**Returns:** `True` if account deleted

**Example:**
```python
client.delete_account()
```

### Drinks

#### `list_drinks(limit=100) -> List[Dict]`

List all available drinks.

**Parameters:**
- `limit` (int): Maximum number of drinks to return (default: 100)

**Returns:** List of drink objects

**Example:**
```python
drinks = client.list_drinks(limit=5)
for drink in drinks:
    print(f"{drink['name']}: ${drink['price']:.2f}")
    print(f"  Vegan: {drink['isVegan']}")
    print(f"  Calories: {drink['calories']}")
```

#### `get_drink(drink_id) -> Dict`

Get specific drink details.

**Parameters:**
- `drink_id` (int): The drink ID

**Returns:** Drink object

**Example:**
```python
drink = client.get_drink(1)
print(drink['name'])
```

#### `create_drink(name, category, price, ...) -> Dict`

Create a new drink (admin only).

**Parameters:**
- `name` (str): Drink name
- `category` (str): Category (coffee, tea, smoothie, juice, other)
- `price` (float): Drink price
- `description` (str, optional): Description
- `is_vegan` (bool): Whether vegan
- `is_gluten_free` (bool): Whether gluten-free
- `calories` (int): Calorie count
- `syrups` (List[str], optional): List of syrups
- `ingredients` (List[str], optional): List of ingredients

**Returns:** Created drink object

**Example:**
```python
drink = client.create_drink(
    name="Vanilla Latte",
    category="coffee",
    price=4.50,
    description="Espresso with steamed milk and vanilla",
    ingredients=["espresso", "milk", "vanilla syrup"]
)
```

#### `add_favorite(drink_id) -> Dict`

Add drink to user's favorites.

**Parameters:**
- `drink_id` (int): The drink ID

**Returns:** Updated drink object

**Example:**
```python
client.add_favorite(5)
```

#### `remove_favorite(drink_id) -> Dict`

Remove drink from user's favorites.

**Parameters:**
- `drink_id` (int): The drink ID

**Returns:** Updated drink object

**Example:**
```python
client.remove_favorite(5)
```

### Preferences

#### `list_preferences(pref_type=None) -> List[Dict]`

Get user's preferences.

**Parameters:**
- `pref_type` (str, optional): Filter by type (favorite, allergic, dislike, recommended, ingredient_preference)

**Returns:** List of preference objects

**Example:**
```python
# Get all allergies
allergies = client.list_preferences(pref_type="allergic")
for allergy in allergies:
    print(f"Allergic to: {allergy['details']}")
```

#### `create_preference(preference_type, drink_id=None, ...) -> Dict`

Create a new preference.

**Parameters:**
- `preference_type` (str): Type (favorite, allergic, dislike, recommended, ingredient_preference)
- `drink_id` (int, optional): Drink ID for drink preferences
- `ingredient_name` (str, optional): Ingredient name for ingredient preferences
- `sweetness` (str, optional): Sweetness level (low, medium, high)
- `temperature` (str, optional): Temperature (hot, cold, iced)
- `details` (str, optional): Additional notes

**Returns:** Created preference object

**Example:**
```python
# Add a favorite drink
pref = client.create_preference(
    preference_type="favorite",
    drink_id=2,
    sweetness="medium",
    temperature="hot"
)

# Mark ingredient as disliked
pref = client.create_preference(
    preference_type="dislike",
    ingredient_name="coconut milk",
    details="too sweet"
)

# Mark food allergy
pref = client.create_preference(
    preference_type="allergic",
    drink_id=3,
    details="dairy allergy"
)
```

#### `delete_preference(preference_id) -> bool`

Delete a preference.

**Parameters:**
- `preference_id` (int): The preference ID

**Returns:** `True` if deleted

**Example:**
```python
client.delete_preference(1)
```

### Orders

#### `list_orders(status=None, limit=50) -> List[Dict]`

Get user's orders.

**Parameters:**
- `status` (str, optional): Filter by status (pending, preparing, ready, completed, cancelled)
- `limit` (int): Maximum number to return (default: 50)

**Returns:** List of order objects

**Example:**
```python
# Get pending orders
pending = client.list_orders(status="pending")

# Get all completed orders
completed = client.list_orders(status="completed")
```

#### `get_order(order_id) -> Dict`

Get specific order details.

**Parameters:**
- `order_id` (int): The order ID

**Returns:** Order object

**Example:**
```python
order = client.get_order(42)
print(f"Status: {order['orderStatus']}")
print(f"Total: ${order['totalPrice']:.2f}")
```

#### `create_order(drink_ids, quantities, ...) -> Dict`

Create a new order.

**Parameters:**
- `drink_ids` (List[int]): List of drink IDs
- `quantities` (List[int]): List of quantities (parallel to drink_ids)
- `special_instructions` (str, optional): Special instructions
- `estimated_pickup_time` (str, optional): ISO-8601 timestamp

**Returns:** Created order object

**Example:**
```python
order = client.create_order(
    drink_ids=[1, 3, 5],
    quantities=[2, 1, 1],
    special_instructions="Extra hot, no foam on first drink"
)
print(f"Order #{order['orderId']} created")
```

#### `update_order(order_id, drink_ids=None, ...) -> Dict`

Update an order (only if pending).

**Parameters:**
- `order_id` (int): The order ID
- `drink_ids` (List[int], optional): Updated drink IDs
- `quantities` (List[int], optional): Updated quantities
- `special_instructions` (str, optional): Updated instructions

**Returns:** Updated order object

**Example:**
```python
order = client.update_order(
    order_id=42,
    special_instructions="Actually, make it extra cold"
)
```

#### `cancel_order(order_id) -> bool`

Cancel an order (only if pending or preparing).

**Parameters:**
- `order_id` (int): The order ID

**Returns:** `True` if cancelled

**Example:**
```python
client.cancel_order(42)
```

### Notifications

#### `list_notifications(notification_type=None, read=None, limit=50) -> List[Dict]`

Get user's notifications.

**Parameters:**
- `notification_type` (str, optional): Filter by type (order, promotion, alert, system)
- `read` (bool, optional): Filter by read status
- `limit` (int): Maximum number to return (default: 50)

**Returns:** List of notification objects

**Example:**
```python
# Get unread notifications
unread = client.list_notifications(read=False)

# Get order notifications
orders = client.list_notifications(notification_type="order")
```

#### `get_unread_count() -> int`

Get count of unread notifications.

**Returns:** Number of unread notifications

**Example:**
```python
count = client.get_unread_count()
print(f"You have {count} unread notifications")
```

#### `mark_notification_read(notification_id) -> Dict`

Mark notification as read.

**Parameters:**
- `notification_id` (int): The notification ID

**Returns:** Updated notification object

**Example:**
```python
client.mark_notification_read(123)
```

#### `delete_notification(notification_id) -> bool`

Delete a notification.

**Parameters:**
- `notification_id` (int): The notification ID

**Returns:** `True` if deleted

**Example:**
```python
client.delete_notification(123)
```

#### `clear_read_notifications() -> bool`

Delete all read notifications.

**Returns:** `True` if cleared

**Example:**
```python
client.clear_read_notifications()
```

### Payments

#### `process_payment(order_id, amount, payment_method, stripe_token_id=None) -> Dict`

Process a payment for an order.

**Parameters:**
- `order_id` (int): The order ID
- `amount` (float): Payment amount
- `payment_method` (str): Payment method (cash, card, mobile)
- `stripe_token_id` (str, optional): Stripe token (required for card payments)

**Returns:** Payment object

**Example:**
```python
# Cash payment
payment = client.process_payment(
    order_id=42,
    amount=13.50,
    payment_method="cash"
)

# Card payment (requires Stripe token)
payment = client.process_payment(
    order_id=42,
    amount=13.50,
    payment_method="card",
    stripe_token_id="tok_visa"
)
```

### QR Codes

#### `get_qrcode(qrcode_id) -> Dict`

Get specific QR code.

**Parameters:**
- `qrcode_id` (int): The QR code ID

**Returns:** QR code object

**Example:**
```python
qr = client.get_qrcode(1)
print(qr['qrcodeData'])
```

#### `validate_qrcode(qrcode_id) -> Dict`

Validate and use a QR code to open fridge.

**Parameters:**
- `qrcode_id` (int): The QR code ID

**Returns:** Validation result with access info

**Example:**
```python
result = client.validate_qrcode(1)
print(f"Access count: {result['accessCount']}")
```

#### `get_order_qrcode(order_id) -> Dict`

Get QR code for a specific order.

**Parameters:**
- `order_id` (int): The order ID

**Returns:** QR code object

**Example:**
```python
qr = client.get_order_qrcode(42)
print(qr['expirationTime'])
```

### Inventory

#### `list_inventory(item_type=None, limit=50) -> List[Dict]`

List inventory items (admin only).

**Parameters:**
- `item_type` (str, optional): Filter by type (syrup, soda, supply, equipment)
- `limit` (int): Maximum number to return (default: 50)

**Returns:** List of inventory objects

**Example:**
```python
syrups = client.list_inventory(item_type="syrup")
for syrup in syrups:
    print(f"{syrup['itemName']}: {syrup['quantity']} {syrup['unit']}")
```

#### `get_inventory_item(inventory_id) -> Dict`

Get specific inventory item.

**Parameters:**
- `inventory_id` (int): The inventory ID

**Returns:** Inventory object

**Example:**
```python
item = client.get_inventory_item(1)
print(f"Stock: {item['quantity']} {item['unit']}")
```

### Health & Info

#### `health_check() -> Dict`

Check if backend is healthy.

**Returns:** Health status information

**Example:**
```python
health = client.health_check()
if health['status'] == 'healthy':
    print("Backend is running!")
```

#### `get_info() -> Dict`

Get backend node information.

**Returns:** Node info (peer ID, databases, etc.)

**Example:**
```python
info = client.get_info()
print(f"Node Type: {info['nodeType']}")
print(f"Peer ID: {info['peerId']}")
```

## Error Handling

All methods raise exceptions on errors. Catch them appropriately:

```python
from client import CodePopClient

client = CodePopClient()

try:
    user = client.login("invalid_user", "wrong_password")
except Exception as e:
    print(f"Login failed: {e}")

try:
    order = client.create_order([1, 2], [1, 1])
except ValueError as e:
    print(f"Not authenticated: {e}")
except Exception as e:
    print(f"API error: {e}")
```

## Common Workflows

### Complete Order Workflow

```python
# 1. Login
client = CodePopClient()
user = client.login("jane_doe", "SecurePass123!")
print(f"Logged in as {user.username}")

# 2. Browse drinks
drinks = client.list_drinks(limit=10)
print(f"Available drinks: {len(drinks)}")

# 3. Create order
order = client.create_order(
    drink_ids=[1, 3],
    quantities=[1, 2],
    special_instructions="Extra hot"
)
print(f"Order created: #{order['orderId']}")

# 4. Process payment
payment = client.process_payment(
    order_id=order['orderId'],
    amount=order['totalPrice'],
    payment_method="card",
    stripe_token_id="tok_visa"
)
print(f"Payment processed: {payment['paymentStatus']}")

# 5. Get QR code for pickup
qr = client.get_order_qrcode(order['orderId'])
print(f"QR code expires: {qr['expirationTime']}")

# 6. Validate QR at fridge
client.validate_qrcode(qr['qrcodeId'])
print("Fridge unlocked!")

# 7. Logout
client.logout()
```

### Manage User Preferences

```python
# Mark favorite drink
client.create_preference(
    preference_type="favorite",
    drink_id=2,
    sweetness="medium",
    temperature="hot"
)

# Mark allergy
client.create_preference(
    preference_type="allergic",
    drink_id=1,
    details="dairy allergy"
)

# Mark disliked ingredient
client.create_preference(
    preference_type="dislike",
    ingredient_name="coconut milk",
    details="too sweet for me"
)

# Get all preferences
prefs = client.list_preferences()
for pref in prefs:
    print(f"{pref['preferenceType']}: {pref.get('details', '')}")
```

### Handle Notifications

```python
# Check for unread notifications
unread_count = client.get_unread_count()
if unread_count > 0:
    print(f"You have {unread_count} new messages")

# Get order notifications
order_notifs = client.list_notifications(notification_type="order")
for notif in order_notifs:
    print(f"- {notif['title']}: {notif['message']}")
    if not notif.get('isRead'):
        client.mark_notification_read(notif['notificationId'])

# Clear old notifications
client.clear_read_notifications()
```

## Advanced Usage

### Custom Base URL

```python
# Connect to different backend
client = CodePopClient("http://192.168.1.100:3001")
```

### Session Management

```python
# Reuse authentication across requests
client = CodePopClient()
client.login("user", "pass")

# Make multiple requests
for i in range(10):
    orders = client.list_orders()
    print(f"You have {len(orders)} orders")

# Logout when done
client.logout()
```

### Batch Operations

```python
# Create multiple orders
for order_data in [
    {"ids": [1], "qty": [1]},
    {"ids": [2, 3], "qty": [1, 2]},
    {"ids": [4], "qty": [3]},
]:
    order = client.create_order(order_data["ids"], order_data["qty"])
    print(f"Order #{order['orderId']} created")
```

## Enumerations

### PreferenceType

```python
from client import PreferenceType

# Use enum for type safety
client.create_preference(
    preference_type=PreferenceType.FAVORITE.value,
    drink_id=1
)
```

Available types:
- `FAVORITE` - User's favorite drink
- `ALLERGIC` - Allergen warning
- `DISLIKE` - User dislikes
- `RECOMMENDED` - Recommended for user
- `INGREDIENT_PREFERENCE` - Specific ingredient preference

### OrderStatus

```python
from client import OrderStatus

# Check order status
order = client.get_order(42)
if order['orderStatus'] == OrderStatus.READY.value:
    print("Your order is ready!")
```

Available statuses:
- `PENDING` - Order created
- `PREPARING` - Being prepared
- `READY` - Ready for pickup
- `COMPLETED` - Picked up
- `CANCELLED` - Cancelled

## Testing

Run the demo to verify the client:

```bash
python3 client.py
```

Expected output:
```
────────────────────────────────────────────────────────────────────────────────

CodePop Backend API Client - Demo

────────────────────────────────────────────────────────────────────────────────

1. Health Check
   Status: healthy
   Node Type: peer
   ...
```

## Troubleshooting

### Connection Refused

```
API Error: Request failed: [Errno 111] Connection refused
```

**Solution:** Make sure backend is running:
```bash
# Terminal 1
npm run bootstrap

# Terminal 2
PORT=3001 npm run peer
```

### Not Authenticated

```
ValueError: Not authenticated. Please login first.
```

**Solution:** Login before making requests:
```python
user = client.login("username", "password")
```

### Invalid Credentials

```
API Error (401): Invalid credentials
```

**Solution:** Check username and password are correct.

### Username Already Exists

```
API Error (500): Username already exists
```

**Solution:** Choose a different username or login instead of registering.