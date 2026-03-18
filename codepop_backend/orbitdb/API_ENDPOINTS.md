# CodePop OrbitDB API Endpoints Reference

**Base URL**: `http://localhost:3001` (or your peer node address)

**Authentication**: All endpoints except registration and login require token-based authentication.

```
Authorization: Token {tokenKey}
```

## Quick Start

### 1. Register a User

```bash
curl -X POST http://localhost:3001/backend/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john@example.com",
    "password": "SecurePassword123!"
  }'
```

**Response (201 Created)**:
```json
{
  "status": "created",
  "data": {
    "userId": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "firstName": "",
    "lastName": "",
    "isStaff": false,
    "isSuperuser": false,
    "token": "8d0ac92319a3f11fff392c5a8d7e5ac9ab50768530c19dfd7776ba0fdf16a358"
  }
}
```

Save the `token` value for subsequent API calls.

### 2. Use Token for Authenticated Requests

```bash
TOKEN="8d0ac92319a3f11fff392c5a8d7e5ac9ab50768530c19dfd7776ba0fdf16a358"
curl -X GET http://localhost:3001/backend/drinks \
  -H "Authorization: Token $TOKEN"
```

---

## Table of Contents

1. [Authentication](#authentication)
2. [User Management](#user-management)
3. [Preferences](#preferences)
4. [Drinks](#drinks)
5. [Orders](#orders)
6. [Inventory](#inventory)
7. [Notifications](#notifications)
8. [Revenues](#revenues)
9. [Health & Info](#health--info)
10. [Error Responses](#error-responses)

---

## Authentication

### POST /backend/auth/register

Register a new user account.

**Request**:
```json
{
  "username": "string (required, 3-30 chars, alphanumeric + underscore)",
  "email": "string (required, valid email format)",
  "password": "string (required, min 8 chars, must include uppercase, lowercase, number, special char)"
}
```

**Response (201 Created)**:
```json
{
  "status": "created",
  "data": {
    "userId": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "firstName": "",
    "lastName": "",
    "isStaff": false,
    "isSuperuser": false,
    "token": "64-character hex string"
  }
}
```

**Errors**:
- `400`: Username already exists
- `400`: Email already registered
- `400`: Invalid email format
- `400`: Password validation failed

---

### POST /backend/auth/login

Authenticate and get a token.

**Request**:
```json
{
  "username": "string (username or email)",
  "password": "string (user's password)"
}
```

**Response (200 OK)**:
```json
{
  "status": "success",
  "data": {
    "userId": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "token": "64-character hex string"
  }
}
```

**Errors**:
- `401`: Invalid credentials
- `400`: User not found

---

### POST /backend/auth/logout

Invalidate the current token.

**Request**: Token in Authorization header

**Response (200 OK)**:
```json
{
  "status": "success",
  "message": "Logged out successfully"
}
```

---

## User Management

All user management endpoints require authentication and admin privileges.

### GET /backend/users/profile

Get current user's profile.

**Request**: Token in Authorization header

**Response (200 OK)**:
```json
{
  "status": "success",
  "data": {
    "userId": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "isStaff": false,
    "isSuperuser": false,
    "createdAt": "2026-03-18T12:00:00.000Z"
  }
}
```

---

### PATCH /backend/users/profile

Update current user's profile.

**Request**:
```json
{
  "firstName": "string (optional)",
  "lastName": "string (optional)",
  "email": "string (optional, must be unique)"
}
```

**Response (200 OK)**:
```json
{
  "status": "success",
  "data": { /* updated user object */ }
}
```

---

### GET /backend/users (Admin Only)

List all users.

**Query Parameters**:
- `offset`: integer (default: 0)
- `limit`: integer (default: 50, max: 100)

**Response (200 OK)**:
```json
{
  "status": "success",
  "count": 10,
  "data": [ /* array of user objects */ ]
}
```

---

### GET /backend/users/:userId (Admin Only)

Get specific user details.

**Response (200 OK)**:
```json
{
  "status": "success",
  "data": { /* user object */ }
}
```

---

### PATCH /backend/users/:userId (Admin Only)

Update user as admin.

**Request**:
```json
{
  "firstName": "string (optional)",
  "lastName": "string (optional)",
  "isStaff": "boolean (optional)",
  "isSuperuser": "boolean (optional)"
}
```

**Response (200 OK)**:
```json
{
  "status": "success",
  "data": { /* updated user object */ }
}
```

---

### DELETE /backend/users/:userId (Admin Only)

Delete a user.

**Response (200 OK)**:
```json
{
  "status": "success",
  "message": "User deleted successfully"
}
```

---

### DELETE /backend/users/account/delete

Delete current user's account (requires own token).

**Response (200 OK)**:
```json
{
  "status": "success",
  "message": "Account deleted successfully"
}
```

---

## Preferences

User drink preferences and customization.

### GET /backend/preferences

Get current user's preferences.

**Response (200 OK)**:
```json
{
  "status": "success",
  "count": 2,
  "data": [
    {
      "preferenceId": 1,
      "userId": 1,
      "drinkId": 5,
      "preferenceType": "favorite",
      "sweetness": "medium",
      "temperature": "hot",
      "createdAt": "2026-03-18T10:00:00.000Z"
    },
    {
      "preferenceId": 2,
      "userId": 1,
      "drinkId": 3,
      "preferenceType": "allergic",
      "details": "dairy allergy",
      "createdAt": "2026-03-18T11:00:00.000Z"
    }
  ]
}
```

---

### POST /backend/preferences

Create a new preference.

**Request**:
```json
{
  "drinkId": "integer (required)",
  "preferenceType": "string (required: 'favorite', 'allergic', 'dislike', 'recommended')",
  "sweetness": "string (optional: 'low', 'medium', 'high')",
  "temperature": "string (optional: 'hot', 'cold', 'iced')",
  "details": "string (optional, for notes)"
}
```

**Response (201 Created)**:
```json
{
  "status": "created",
  "data": { /* preference object */ }
}
```

---

### GET /backend/preferences/:preferenceId

Get specific preference.

**Response (200 OK)**:
```json
{
  "status": "success",
  "data": { /* preference object */ }
}
```

---

### PATCH /backend/preferences/:preferenceId

Update preference.

**Request**:
```json
{
  "preferenceType": "string (optional)",
  "sweetness": "string (optional)",
  "temperature": "string (optional)",
  "details": "string (optional)"
}
```

**Response (200 OK)**:
```json
{
  "status": "success",
  "data": { /* updated preference object */ }
}
```

---

### DELETE /backend/preferences/:preferenceId

Delete preference.

**Response (200 OK)**:
```json
{
  "status": "success",
  "message": "Preference deleted successfully"
}
```

---

## Drinks

Drink menu items and recipes.

### GET /backend/drinks

List all drinks.

**Query Parameters**:
- `category`: string (optional, filter by category)
- `offset`: integer (default: 0)
- `limit`: integer (default: 50)

**Response (200 OK)**:
```json
{
  "status": "success",
  "count": 25,
  "data": [
    {
      "drinkId": 1,
      "name": "Espresso",
      "category": "coffee",
      "size": "small",
      "price": 2.99,
      "isVegan": false,
      "isGlutenFree": false,
      "calories": 10,
      "description": "Single shot espresso",
      "ingredients": ["coffee beans", "water"],
      "createdAt": "2026-03-18T00:00:00.000Z"
    },
    {
      "drinkId": 2,
      "name": "Latte",
      "category": "coffee",
      "size": "medium",
      "price": 4.50,
      "isVegan": false,
      "isGlutenFree": true,
      "calories": 190,
      "description": "Espresso with steamed milk",
      "ingredients": ["espresso", "milk", "foam"],
      "createdAt": "2026-03-18T00:00:00.000Z"
    }
  ]
}
```

---

### POST /backend/drinks (Admin Only)

Create a new drink.

**Request**:
```json
{
  "name": "string (required)",
  "category": "string (required: 'coffee', 'tea', 'smoothie', 'juice', 'other')",
  "size": "string (required: 'small', 'medium', 'large')",
  "price": "number (required, must be > 0)",
  "isVegan": "boolean (optional, default: false)",
  "isGlutenFree": "boolean (optional, default: false)",
  "calories": "integer (optional)",
  "description": "string (optional)",
  "ingredients": "array of strings (optional)"
}
```

**Response (201 Created)**:
```json
{
  "status": "created",
  "data": { /* drink object */ }
}
```

---

### GET /backend/drinks/:drinkId

Get specific drink details.

**Response (200 OK)**:
```json
{
  "status": "success",
  "data": { /* drink object */ }
}
```

---

### PATCH /backend/drinks/:drinkId (Admin Only)

Update drink.

**Request**: (all fields optional)
```json
{
  "name": "string",
  "category": "string",
  "size": "string",
  "price": "number",
  "isVegan": "boolean",
  "isGlutenFree": "boolean",
  "calories": "integer",
  "description": "string",
  "ingredients": "array"
}
```

**Response (200 OK)**:
```json
{
  "status": "success",
  "data": { /* updated drink object */ }
}
```

---

### DELETE /backend/drinks/:drinkId (Admin Only)

Delete drink.

**Response (200 OK)**:
```json
{
  "status": "success",
  "message": "Drink deleted successfully"
}
```

---

### POST /backend/drinks/:drinkId/favorite

Add drink to favorites.

**Response (200 OK)**:
```json
{
  "status": "success",
  "message": "Added to favorites"
}
```

---

### DELETE /backend/drinks/:drinkId/favorite

Remove drink from favorites.

**Response (200 OK)**:
```json
{
  "status": "success",
  "message": "Removed from favorites"
}
```

---

## Orders

Customer orders and order management.

### GET /backend/orders

List current user's orders.

**Query Parameters**:
- `status`: string (optional: 'pending', 'preparing', 'ready', 'completed', 'cancelled')
- `offset`: integer (default: 0)
- `limit`: integer (default: 50)

**Response (200 OK)**:
```json
{
  "status": "success",
  "count": 5,
  "data": [
    {
      "orderId": 1,
      "userId": 1,
      "drinkId": 2,
      "quantity": 1,
      "totalPrice": 4.50,
      "orderStatus": "completed",
      "specialInstructions": "extra hot",
      "createdAt": "2026-03-18T09:00:00.000Z",
      "completedAt": "2026-03-18T09:05:00.000Z"
    }
  ]
}
```

---

### POST /backend/orders

Create a new order.

**Request**:
```json
{
  "drinkId": "integer (required)",
  "quantity": "integer (required, min: 1, max: 100)",
  "specialInstructions": "string (optional)"
}
```

**Response (201 Created)**:
```json
{
  "status": "created",
  "data": { /* order object */ }
}
```

---

### GET /backend/orders/:orderId

Get specific order.

**Response (200 OK)**:
```json
{
  "status": "success",
  "data": { /* order object */ }
}
```

---

### PATCH /backend/orders/:orderId

Update order (only if pending).

**Request**:
```json
{
  "quantity": "integer (optional)",
  "specialInstructions": "string (optional)"
}
```

**Response (200 OK)**:
```json
{
  "status": "success",
  "data": { /* updated order object */ }
}
```

---

### DELETE /backend/orders/:orderId

Cancel order (only if pending).

**Response (200 OK)**:
```json
{
  "status": "success",
  "message": "Order cancelled successfully"
}
```

---

### PATCH /backend/orders/:orderId/status (Admin Only)

Update order status.

**Request**:
```json
{
  "status": "string (required: 'pending', 'preparing', 'ready', 'completed', 'cancelled')"
}
```

**Response (200 OK)**:
```json
{
  "status": "success",
  "data": { /* updated order object */ }
}
```

---

### GET /backend/orders/stats/daily (Admin Only)

Get daily order statistics.

**Query Parameters**:
- `date`: string (optional, format: YYYY-MM-DD, default: today)

**Response (200 OK)**:
```json
{
  "status": "success",
  "data": {
    "date": "2026-03-18",
    "totalOrders": 47,
    "completedOrders": 45,
    "pendingOrders": 2,
    "totalRevenue": 189.50,
    "averageOrderValue": 4.03
  }
}
```

---

## Inventory

Stock and supply management.

### GET /backend/inventory

List all inventory items.

**Query Parameters**:
- `type`: string (optional: 'drink', 'supply', 'equipment')
- `offset`: integer (default: 0)
- `limit`: integer (default: 50)

**Response (200 OK)**:
```json
{
  "status": "success",
  "count": 15,
  "data": [
    {
      "inventoryId": 1,
      "itemName": "Coffee Beans (1kg)",
      "itemType": "drink",
      "quantity": 25,
      "unit": "bag",
      "minThreshold": 5,
      "maxCapacity": 50,
      "lastRestocked": "2026-03-15T10:00:00.000Z",
      "supplier": "Local Roaster Co.",
      "cost": 12.50,
      "createdAt": "2026-03-18T00:00:00.000Z"
    }
  ]
}
```

---

### POST /backend/inventory (Admin Only)

Create new inventory item.

**Request**:
```json
{
  "itemName": "string (required)",
  "itemType": "string (required: 'drink', 'supply', 'equipment')",
  "quantity": "integer (required, min: 0)",
  "unit": "string (required: 'bag', 'liter', 'count', 'oz', etc.)",
  "minThreshold": "integer (required)",
  "maxCapacity": "integer (required)",
  "supplier": "string (optional)",
  "cost": "number (optional, cost per unit)"
}
```

**Response (201 Created)**:
```json
{
  "status": "created",
  "data": { /* inventory object */ }
}
```

---

### GET /backend/inventory/:inventoryId

Get specific inventory item.

**Response (200 OK)**:
```json
{
  "status": "success",
  "data": { /* inventory object */ }
}
```

---

### PATCH /backend/inventory/:inventoryId (Admin Only)

Update inventory item.

**Request**: (all fields optional)
```json
{
  "quantity": "integer",
  "minThreshold": "integer",
  "maxCapacity": "integer",
  "supplier": "string",
  "cost": "number"
}
```

**Response (200 OK)**:
```json
{
  "status": "success",
  "data": { /* updated inventory object */ }
}
```

---

### DELETE /backend/inventory/:inventoryId (Admin Only)

Delete inventory item.

**Response (200 OK)**:
```json
{
  "status": "success",
  "message": "Inventory item deleted successfully"
}
```

---

### PATCH /backend/inventory/:inventoryId/restock (Admin Only)

Restock an item.

**Request**:
```json
{
  "quantity": "integer (required, amount to add)",
  "cost": "number (optional, new cost per unit)"
}
```

**Response (200 OK)**:
```json
{
  "status": "success",
  "data": { /* updated inventory object */ }
}
```

---

### GET /backend/inventory/report/low-stock (Admin Only)

Get items below minimum threshold.

**Response (200 OK)**:
```json
{
  "status": "success",
  "count": 3,
  "data": [
    {
      "inventoryId": 5,
      "itemName": "Milk",
      "quantity": 3,
      "minThreshold": 10,
      "status": "CRITICAL"
    }
  ]
}
```

---

## Notifications

System notifications and alerts.

### GET /backend/notifications

Get notifications for current user.

**Query Parameters**:
- `type`: string (optional: 'order', 'promotion', 'alert', 'system')
- `read`: boolean (optional, filter read/unread)
- `offset`: integer (default: 0)
- `limit`: integer (default: 50)

**Response (200 OK)**:
```json
{
  "status": "success",
  "count": 8,
  "unreadCount": 3,
  "data": [
    {
      "notificationId": 1,
      "userId": 1,
      "type": "order",
      "title": "Order Ready",
      "message": "Your order is ready for pickup",
      "isRead": false,
      "createdAt": "2026-03-18T14:30:00.000Z"
    },
    {
      "notificationId": 2,
      "userId": 1,
      "type": "promotion",
      "title": "Special Offer",
      "message": "20% off lattes today!",
      "isRead": true,
      "createdAt": "2026-03-18T09:00:00.000Z"
    }
  ]
}
```

---

### POST /backend/notifications (Admin Only)

Send notification to user.

**Request**:
```json
{
  "userId": "integer (required)",
  "type": "string (required: 'order', 'promotion', 'alert', 'system')",
  "title": "string (required)",
  "message": "string (required)",
  "metadata": "object (optional)"
}
```

**Response (201 Created)**:
```json
{
  "status": "created",
  "data": { /* notification object */ }
}
```

---

### PATCH /backend/notifications/:notificationId/read

Mark notification as read.

**Response (200 OK)**:
```json
{
  "status": "success",
  "data": { /* notification object */ }
}
```

---

### DELETE /backend/notifications/:notificationId

Delete notification.

**Response (200 OK)**:
```json
{
  "status": "success",
  "message": "Notification deleted successfully"
}
```

---

### DELETE /backend/notifications/clear-read

Delete all read notifications for user.

**Response (200 OK)**:
```json
{
  "status": "success",
  "message": "Cleared read notifications"
}
```

---

### GET /backend/notifications/unread-count

Get count of unread notifications.

**Response (200 OK)**:
```json
{
  "status": "success",
  "unreadCount": 3
}
```

---

## Revenues

Payment and revenue tracking.

### GET /backend/revenues (Admin Only)

List all revenues.

**Query Parameters**:
- `startDate`: string (optional, YYYY-MM-DD)
- `endDate`: string (optional, YYYY-MM-DD)
- `offset`: integer (default: 0)
- `limit`: integer (default: 50)

**Response (200 OK)**:
```json
{
  "status": "success",
  "count": 150,
  "data": [
    {
      "revenueId": 1,
      "orderId": 42,
      "userId": 5,
      "amount": 4.50,
      "paymentMethod": "card",
      "transactionId": "stripe_ch_12345",
      "status": "completed",
      "createdAt": "2026-03-18T09:05:00.000Z"
    }
  ]
}
```

---

### POST /backend/revenues (Admin Only)

Record revenue from payment.

**Request**:
```json
{
  "orderId": "integer (required)",
  "userId": "integer (required)",
  "amount": "number (required, must be > 0)",
  "paymentMethod": "string (required: 'cash', 'card', 'mobile')",
  "transactionId": "string (optional)"
}
```

**Response (201 Created)**:
```json
{
  "status": "created",
  "data": { /* revenue object */ }
}
```

---

### GET /backend/revenues/:revenueId (Admin Only)

Get specific revenue record.

**Response (200 OK)**:
```json
{
  "status": "success",
  "data": { /* revenue object */ }
}
```

---

### PATCH /backend/revenues/:revenueId/status (Admin Only)

Update revenue status.

**Request**:
```json
{
  "status": "string (required: 'pending', 'completed', 'failed', 'refunded')"
}
```

**Response (200 OK)**:
```json
{
  "status": "success",
  "data": { /* updated revenue object */ }
}
```

---

### GET /backend/revenues/report/daily (Admin Only)

Get daily revenue report.

**Query Parameters**:
- `date`: string (optional, YYYY-MM-DD, default: today)

**Response (200 OK)**:
```json
{
  "status": "success",
  "data": {
    "date": "2026-03-18",
    "totalRevenue": 567.89,
    "totalTransactions": 98,
    "completedTransactions": 96,
    "failedTransactions": 2,
    "refundedAmount": 0.00,
    "byPaymentMethod": {
      "card": 456.50,
      "cash": 111.39,
      "mobile": 0.00
    }
  }
}
```

---

### GET /backend/revenues/report/monthly (Admin Only)

Get monthly revenue report.

**Query Parameters**:
- `month`: string (optional, YYYY-MM, default: current month)

**Response (200 OK)**:
```json
{
  "status": "success",
  "data": {
    "month": "2026-03",
    "totalRevenue": 12450.75,
    "totalTransactions": 2150,
    "averageTransactionValue": 5.79,
    "trend": "up 15% from previous month"
  }
}
```

---

## Health & Info

System health and node information.

### GET /health

Health check endpoint (no auth required).

**Response (200 OK)**:
```json
{
  "status": "healthy",
  "nodeType": "peer",
  "peerId": "12D3KooWSBNnxKtWGJP5waG16...",
  "port": 3001,
  "timestamp": "2026-03-18T23:18:00.862Z"
}
```

---

### GET /info

Node information including databases (no auth required).

**Response (200 OK)**:
```json
{
  "nodeType": "peer",
  "port": 3001,
  "peerId": "12D3KooWSBNnxKtWGJP5waG16...",
  "multiaddrs": [
    "/ip4/127.0.0.1/tcp/4001/p2p/12D3KooWSBNnxKtWGJP5waG16..."
  ],
  "connectedPeers": [],
  "databases": {
    "users-db": "orbitdb/zdpuAzFqYXQhSnmZB1ur9GbyDWwLZSuTawP27Xydo...",
    "tokens-db": "orbitdb/zdpuAzJvGDd5vFpPVayxodpwoXEiPncf9pE8H2qeK...",
    "preferences-db": "orbitdb/zdpuB17rWFqd6YFqfuwaNtodyFYc76SuNq9z3keqe...",
    "drinks-db": "orbitdb/zdpuApfkSi9L9CF2E8TZDHewpr5g2uUs9fkrSGhcd...",
    "inventory-db": "orbitdb/zdpuAppGMb6BoRPBppqa7EM3aCsjnMTUe465qrjcS...",
    "orders-db": "orbitdb/zdpuAwYxBu8fnSyfgrMJCNrRwdbbojEpcBgCBJRj4...",
    "notifications-db": "orbitdb/zdpuAtwbHWqSEzEfb6Fw1mSq2s8VZPRBy8mnFAisk...",
    "revenues-db": "orbitdb/zdpuAtvPgq28r2KWkpAHWDJdhFGnJbJgex9aSV9VL..."
  },
  "timestamp": "2026-03-18T23:18:00.862Z"
}
```

---

### GET /

Server info (no auth required).

**Response (200 OK)**:
```json
{
  "name": "CodePop OrbitDB Backend",
  "version": "1.0.0-beta",
  "nodeType": "peer",
  "port": 3001,
  "status": "running"
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error message description",
  "code": "ERROR_CODE",
  "details": "optional additional context"
}
```

### Common Error Codes

| Status | Code | Description |
|--------|------|-------------|
| 400 | VALIDATION_ERROR | Invalid input data |
| 400 | INVALID_TOKEN_FORMAT | Authorization header format incorrect |
| 401 | INVALID_TOKEN | Token is invalid or expired |
| 401 | UNAUTHORIZED | Missing or invalid authentication |
| 403 | NOT_ADMIN | Admin privileges required |
| 404 | NOT_FOUND | Resource not found |
| 409 | CONFLICT | Resource already exists |
| 500 | INTERNAL_ERROR | Server error |
| 500 | DATABASE_ERROR | Database operation failed |

### Example Error Response

```json
{
  "error": "User not found",
  "code": "NOT_FOUND",
  "details": "userId: 999"
}
```

---

## Authentication Requirements Summary

| Endpoint | Auth Required | Admin Only |
|----------|---------------|-----------|
| POST /auth/register | No | No |
| POST /auth/login | No | No |
| POST /auth/logout | Yes | No |
| GET /users/profile | Yes | No |
| PATCH /users/profile | Yes | No |
| GET /users | Yes | Yes |
| GET /users/:id | Yes | Yes |
| PATCH /users/:id | Yes | Yes |
| DELETE /users/:id | Yes | Yes |
| GET /preferences | Yes | No |
| POST /preferences | Yes | No |
| GET /preferences/:id | Yes | No |
| PATCH /preferences/:id | Yes | No |
| DELETE /preferences/:id | Yes | No |
| GET /drinks | Yes | No |
| POST /drinks | Yes | Yes |
| GET /drinks/:id | Yes | No |
| PATCH /drinks/:id | Yes | Yes |
| DELETE /drinks/:id | Yes | Yes |
| POST /drinks/:id/favorite | Yes | No |
| GET /orders | Yes | No |
| POST /orders | Yes | No |
| GET /orders/:id | Yes | No |
| PATCH /orders/:id | Yes | No |
| DELETE /orders/:id | Yes | No |
| PATCH /orders/:id/status | Yes | Yes |
| GET /inventory | Yes | No |
| POST /inventory | Yes | Yes |
| GET /inventory/:id | Yes | No |
| PATCH /inventory/:id | Yes | Yes |
| DELETE /inventory/:id | Yes | Yes |
| GET /notifications | Yes | No |
| POST /notifications | Yes | Yes |
| PATCH /notifications/:id/read | Yes | No |
| DELETE /notifications/:id | Yes | No |
| GET /revenues | Yes | Yes |
| POST /revenues | Yes | Yes |
| GET /revenues/:id | Yes | Yes |
| PATCH /revenues/:id/status | Yes | Yes |
| GET /health | No | No |
| GET /info | No | No |
| GET / | No | No |

---

## Testing Examples

### Complete User Journey

```bash
#!/bin/bash

BASE_URL="http://localhost:3001"

# 1. Register
echo "1. Registering user..."
RESPONSE=$(curl -s -X POST "$BASE_URL/backend/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "coffee_lover",
    "email": "coffee@example.com",
    "password": "SecurePass123!"
  }')

TOKEN=$(echo "$RESPONSE" | jq -r '.data.token')
echo "Token: $TOKEN"

# 2. Get profile
echo -e "\n2. Getting profile..."
curl -s -X GET "$BASE_URL/backend/users/profile" \
  -H "Authorization: Token $TOKEN" | jq .

# 3. Create preference
echo -e "\n3. Creating preference..."
curl -s -X POST "$BASE_URL/backend/preferences" \
  -H "Authorization: Token $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "drinkId": 1,
    "preferenceType": "favorite",
    "sweetness": "medium"
  }' | jq .

# 4. Get drinks
echo -e "\n4. Getting drinks..."
curl -s -X GET "$BASE_URL/backend/drinks" \
  -H "Authorization: Token $TOKEN" | jq .

# 5. Create order
echo -e "\n5. Creating order..."
curl -s -X POST "$BASE_URL/backend/orders" \
  -H "Authorization: Token $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "drinkId": 1,
    "quantity": 1,
    "specialInstructions": "extra hot"
  }' | jq .

# 6. Get notifications
echo -e "\n6. Getting notifications..."
curl -s -X GET "$BASE_URL/backend/notifications" \
  -H "Authorization: Token $TOKEN" | jq .

# 7. Logout
echo -e "\n7. Logging out..."
curl -s -X POST "$BASE_URL/backend/auth/logout" \
  -H "Authorization: Token $TOKEN" | jq .
```

---

## Rate Limiting

Currently, the API does not implement rate limiting. In production, implement:
- 1000 requests per hour per token
- 100 requests per hour per IP (for auth endpoints)
- 429 status code for exceeded limits

---

## Versioning

Current API version: **1.0.0-beta**

All endpoints are prefixed with `/backend/` to maintain compatibility with the original Django backend.

Future versions will be available at `/api/v2/` with breaking changes managed through deprecation notices.
