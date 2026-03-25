# CodePop OrbitDB API Documentation

**Base URL**: `http://localhost:3001`

**API Version**: 1.0.0

**Authentication**: All endpoints except registration and login require token-based authentication.

```
Authorization: Token {tokenKey}
```

---

## Table of Contents

1. [Overview](#overview)
2. [Data Model & Relationships](#data-model--relationships)
3. [Authentication](#authentication)
4. [User Management](#user-management)
5. [Preferences](#preferences)
6. [Drinks](#drinks)
7. [Orders](#orders)
8. [Inventory](#inventory)
9. [Notifications](#notifications)
10. [Revenue](#revenue)
11. [Payments](#payments)
12. [QR Codes](#qr-codes)
13. [External Integrations](#external-integrations)
14. [Error Handling](#error-handling)
15. [Health & Info](#health--info)

---

## Overview

### Data Model & Relationships

CodePop uses a decentralized architecture with OrbitDB keyvalue databases. The application manages the following core entities:

**Entity Relationships**:
- **User → Order**: One-to-Many (user places multiple orders)
- **User → Preference**: One-to-Many (user has multiple preferences)
- **User → Payment**: One-to-Many (user makes multiple payments)
- **User → Notification**: One-to-Many (user receives multiple notifications)
- **Order → Drink**: Many-to-Many (order contains multiple drinks)
- **Order → QRCode**: One-to-One (order generates one QR code for fridge access)
- **Order → Revenue**: One-to-One (completed order creates revenue entry)
- **Inventory → Drink**: Many-to-Many (inventory items used in drinks)
- **Revenue → Payment**: One-to-One (revenue from completed payment)

**Database Design**: OrbitDB keyvalue stores (8 databases created by bootstrap node)
- `users-db`: User accounts and authentication
- `tokens-db`: Authentication tokens
- `preferences-db`: User drink and ingredient preferences
- `drinks-db`: Drink menu and recipes
- `inventory-db`: Stock levels and supplies
- `orders-db`: Order records and status
- `notifications-db`: User notifications
- `revenues-db`: Payment and revenue tracking

### Security & Compliance

- **Authentication**: Token-based (64-character hex strings)
- **Encryption**: Passwords hashed with PBKDF2; sensitive data encrypted at rest (AES-256)
- **HTTPS**: All API communications require TLS 1.3
- **GDPR/CCPA**: Supports data deletion and export on request
- **PCI-DSS**: Stripe handles payment data; CodePop never stores card data

---

## Authentication

### POST /backend/auth/register

Register a new user account.

**Request**:
```json
{
  "username": "string (required, 3-30 chars, alphanumeric + underscore)",
  "email": "string (required, valid email format)",
  "password": "string (required, min 8 chars, uppercase + lowercase + number + special char)"
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
    "createdAt": "2026-03-18T12:00:00.000Z",
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

Authenticate and receive a token.

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
    "isStaff": false,
    "isSuperuser": false,
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

All user management endpoints require authentication.

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
  "data": { "/* updated user object */" }
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
  "data": [ "/* array of user objects */" ]
}
```

---

### GET /backend/users/:userId (Admin Only)

Get specific user details.

**Response (200 OK)**:
```json
{
  "status": "success",
  "data": { "/* user object */" }
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
  "data": { "/* updated user object */" }
}
```

---

### DELETE /backend/users/:userId (Admin Only)

Delete a user account.

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

User drink preferences and customization options.

### GET /backend/preferences

Get current user's all preferences.

**Query Parameters**:
- `type`: string (optional: 'favorite', 'allergic', 'dislike', 'recommended', 'ingredient_preference')

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
    },
    {
      "preferenceId": 3,
      "userId": 1,
      "preferenceType": "ingredient_preference",
      "ingredientName": "vanilla syrup",
      "preferenceType": "dislike",
      "details": "too sweet",
      "createdAt": "2026-03-18T12:00:00.000Z"
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
  "drinkId": "integer (required for drink preferences, null for ingredient preferences)",
  "preferenceType": "string (required: 'favorite', 'allergic', 'dislike', 'recommended', 'ingredient_preference')",
  "sweetness": "string (optional: 'low', 'medium', 'high')",
  "temperature": "string (optional: 'hot', 'cold', 'iced')",
  "ingredientName": "string (required if preferenceType is 'ingredient_preference')",
  "details": "string (optional, for notes or allergen details)"
}
```

**Response (201 Created)**:
```json
{
  "status": "created",
  "data": { "/* preference object */" }
}
```

---

### GET /backend/preferences/:preferenceId

Get specific preference.

**Response (200 OK)**:
```json
{
  "status": "success",
  "data": { "/* preference object */" }
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
  "data": { "/* updated preference object */" }
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
- `category`: string (optional: 'coffee', 'tea', 'smoothie', 'juice', 'other')
- `isVegan`: boolean (optional)
- `isGlutenFree`: boolean (optional)
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
      "description": "Single shot espresso",
      "price": 2.99,
      "isVegan": false,
      "isGlutenFree": true,
      "calories": 10,
      "syrups": ["vanilla"],
      "sodas": ["none"],
      "addIns": ["ice"],
      "ingredients": ["coffee beans", "water"],
      "rating": 4.5,
      "createdAt": "2026-03-18T00:00:00.000Z"
    },
    {
      "drinkId": 2,
      "name": "Vanilla Latte",
      "category": "coffee",
      "description": "Espresso with steamed milk and vanilla",
      "price": 4.50,
      "isVegan": false,
      "isGlutenFree": true,
      "calories": 190,
      "syrups": ["vanilla"],
      "sodas": ["none"],
      "addIns": ["foam", "whipped cream"],
      "ingredients": ["espresso", "milk", "vanilla syrup"],
      "rating": 4.8,
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
  "description": "string (optional)",
  "price": "number (required, must be > 0)",
  "isVegan": "boolean (optional, default: false)",
  "isGlutenFree": "boolean (optional, default: false)",
  "calories": "integer (optional)",
  "syrups": "array of strings (optional)",
  "sodas": "array of strings (optional)",
  "addIns": "array of strings (optional)",
  "ingredients": "array of strings (optional)"
}
```

**Response (201 Created)**:
```json
{
  "status": "created",
  "data": { "/* drink object */" }
}
```

---

### GET /backend/drinks/:drinkId

Get specific drink details.

**Response (200 OK)**:
```json
{
  "status": "success",
  "data": { "/* drink object */" }
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
  "description": "string",
  "price": "number",
  "isVegan": "boolean",
  "isGlutenFree": "boolean",
  "calories": "integer",
  "syrups": "array",
  "sodas": "array",
  "addIns": "array",
  "ingredients": "array"
}
```

**Response (200 OK)**:
```json
{
  "status": "success",
  "data": { "/* updated drink object */" }
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

Add drink to user's favorites.

**Response (200 OK)**:
```json
{
  "status": "success",
  "message": "Added to favorites"
}
```

---

### DELETE /backend/drinks/:drinkId/favorite

Remove drink from user's favorites.

**Response (200 OK)**:
```json
{
  "status": "success",
  "message": "Removed from favorites"
}
```

---

### PATCH /backend/drinks/:drinkId/rate

Rate a drink (users can rate drinks they've ordered).

**Request**:
```json
{
  "rating": "number (required, 1-5)"
}
```

**Response (200 OK)**:
```json
{
  "status": "success",
  "data": { "/* updated drink object with new rating */" }
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
      "drinkIds": [2, 5],
      "quantities": [1, 2],
      "totalPrice": 13.50,
      "orderStatus": "completed",
      "paymentStatus": "completed",
      "specialInstructions": "extra hot, no foam",
      "pickupTime": "2026-03-18T09:15:00.000Z",
      "createdAt": "2026-03-18T09:00:00.000Z",
      "completedAt": "2026-03-18T09:15:00.000Z"
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
  "drinkIds": "array of integers (required)",
  "quantities": "array of integers (required, parallel to drinkIds)",
  "specialInstructions": "string (optional)",
  "estimatedPickupTime": "ISO-8601 timestamp (optional)"
}
```

**Response (201 Created)**:
```json
{
  "status": "created",
  "data": { "/* order object */" }
}
```

---

### GET /backend/orders/:orderId

Get specific order.

**Response (200 OK)**:
```json
{
  "status": "success",
  "data": { "/* order object */" }
}
```

---

### PATCH /backend/orders/:orderId

Update order (only if pending).

**Request**:
```json
{
  "drinkIds": "array of integers (optional)",
  "quantities": "array of integers (optional)",
  "specialInstructions": "string (optional)"
}
```

**Response (200 OK)**:
```json
{
  "status": "success",
  "data": { "/* updated order object */" }
}
```

---

### DELETE /backend/orders/:orderId

Cancel order (only if pending or preparing).

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
  "data": { "/* updated order object */" }
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
- `type`: string (optional: 'syrup', 'soda', 'supply', 'equipment')
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
      "itemName": "Vanilla Syrup",
      "itemType": "syrup",
      "quantity": 25,
      "unit": "liter",
      "minThreshold": 5,
      "maxCapacity": 50,
      "supplier": "Local Syrup Co.",
      "costPerUnit": 12.50,
      "lastRestocked": "2026-03-15T10:00:00.000Z",
      "createdAt": "2026-03-01T00:00:00.000Z"
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
  "itemType": "string (required: 'syrup', 'soda', 'supply', 'equipment')",
  "quantity": "integer (required, min: 0)",
  "unit": "string (required: 'liter', 'bag', 'count', 'oz', etc.)",
  "minThreshold": "integer (required)",
  "maxCapacity": "integer (required)",
  "supplier": "string (optional)",
  "costPerUnit": "number (optional)"
}
```

**Response (201 Created)**:
```json
{
  "status": "created",
  "data": { "/* inventory object */" }
}
```

---

### GET /backend/inventory/:inventoryId

Get specific inventory item.

**Response (200 OK)**:
```json
{
  "status": "success",
  "data": { "/* inventory object */" }
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
  "costPerUnit": "number"
}
```

**Response (200 OK)**:
```json
{
  "status": "success",
  "data": { "/* updated inventory object */" }
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
  "costPerUnit": "number (optional, update cost if provided)"
}
```

**Response (200 OK)**:
```json
{
  "status": "success",
  "data": { "/* updated inventory object */" }
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
      "metadata": {
        "orderId": 42
      },
      "createdAt": "2026-03-18T14:30:00.000Z"
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
  "data": { "/* notification object */" }
}
```

---

### PATCH /backend/notifications/:notificationId/read

Mark notification as read.

**Response (200 OK)**:
```json
{
  "status": "success",
  "data": { "/* notification object */" }
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

Delete all read notifications for current user.

**Response (200 OK)**:
```json
{
  "status": "success",
  "message": "Cleared read notifications"
}
```

---

### GET /backend/notifications/unread-count

Get count of unread notifications for current user.

**Response (200 OK)**:
```json
{
  "status": "success",
  "unreadCount": 3
}
```

---

## Revenue

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
      "paymentStatus": "completed",
      "transactionId": "stripe_ch_12345",
      "createdAt": "2026-03-18T09:05:00.000Z"
    }
  ]
}
```

---

### POST /backend/revenues (Admin Only)

Record revenue from completed order.

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
  "data": { "/* revenue object */" }
}
```

---

### GET /backend/revenues/:revenueId (Admin Only)

Get specific revenue record.

**Response (200 OK)**:
```json
{
  "status": "success",
  "data": { "/* revenue object */" }
}
```

---

### PATCH /backend/revenues/:revenueId/status (Admin Only)

Update revenue payment status.

**Request**:
```json
{
  "paymentStatus": "string (required: 'pending', 'completed', 'failed', 'refunded')"
}
```

**Response (200 OK)**:
```json
{
  "status": "success",
  "data": { "/* updated revenue object */" }
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

## Payments

Payment processing and transaction records.

### GET /backend/payments (Admin Only)

List all payment transactions.

**Query Parameters**:
- `status`: string (optional: 'pending', 'completed', 'failed', 'refunded')
- `startDate`: string (optional, YYYY-MM-DD)
- `endDate`: string (optional, YYYY-MM-DD)
- `offset`: integer (default: 0)
- `limit`: integer (default: 50)

**Response (200 OK)**:
```json
{
  "status": "success",
  "count": 200,
  "data": [
    {
      "paymentId": 1,
      "orderId": 42,
      "userId": 5,
      "amount": 13.50,
      "paymentMethod": "card",
      "paymentStatus": "completed",
      "stripeTransactionId": "pi_1A2B3C4D5E6F7G8H",
      "refundStatus": "none",
      "refundedAmount": 0.00,
      "createdAt": "2026-03-18T09:00:00.000Z",
      "completedAt": "2026-03-18T09:01:00.000Z"
    }
  ]
}
```

---

### POST /backend/payments

Process a new payment (typically called after order creation).

**Request**:
```json
{
  "orderId": "integer (required)",
  "userId": "integer (required)",
  "amount": "number (required, must be > 0)",
  "paymentMethod": "string (required: 'cash', 'card', 'mobile')",
  "stripeTokenId": "string (required if paymentMethod is 'card', Stripe token)"
}
```

**Response (201 Created)**:
```json
{
  "status": "created",
  "data": { "/* payment object */" }
}
```

---

### GET /backend/payments/:paymentId (Admin Only)

Get specific payment record.

**Response (200 OK)**:
```json
{
  "status": "success",
  "data": { "/* payment object */" }
}
```

---

### PATCH /backend/payments/:paymentId/refund (Admin Only)

Refund a payment.

**Request**:
```json
{
  "refundAmount": "number (optional, partial refund amount; if omitted, full refund)"
}
```

**Response (200 OK)**:
```json
{
  "status": "success",
  "data": { "/* updated payment object with refund status */" }
}
```

---

## QR Codes

QR code management for fridge access.

### GET /backend/qrcodes

List all QR codes (Admin Only).

**Query Parameters**:
- `orderId`: integer (optional, filter by order)
- `isExpired`: boolean (optional, filter expired/active)
- `offset`: integer (default: 0)
- `limit`: integer (default: 50)

**Response (200 OK)**:
```json
{
  "status": "success",
  "count": 15,
  "data": [
    {
      "qrcodeId": 1,
      "orderId": 42,
      "userId": 5,
      "qrcodeData": "https://fridge.codepop.local/open/abc123def456",
      "expirationTime": "2026-03-18T10:00:00.000Z",
      "isExpired": false,
      "accessCount": 1,
      "createdAt": "2026-03-18T09:05:00.000Z"
    }
  ]
}
```

---

### POST /backend/qrcodes

Create a new QR code for an order (typically called by system after order completion).

**Request**:
```json
{
  "orderId": "integer (required)",
  "userId": "integer (required)",
  "expirationTime": "ISO-8601 timestamp (optional, default: 1 hour from now)"
}
```

**Response (201 Created)**:
```json
{
  "status": "created",
  "data": { "/* qrcode object */" }
}
```

---

### GET /backend/qrcodes/:qrcodeId

Get specific QR code (user can view their own; admin can view all).

**Response (200 OK)**:
```json
{
  "status": "success",
  "data": { "/* qrcode object */" }
}
```

---

### GET /backend/qrcodes/:qrcodeId/validate

Validate and use a QR code (open fridge).

**Response (200 OK)**:
```json
{
  "status": "success",
  "message": "QR code valid. Fridge unlocked.",
  "data": {
    "qrcodeId": 1,
    "orderId": 42,
    "isExpired": false,
    "accessCount": 2
  }
}
```

**Errors**:
- `410`: QR code expired
- `404`: QR code not found
- `400`: QR code already used maximum times

---

### DELETE /backend/qrcodes/:qrcodeId (Admin Only)

Delete/revoke a QR code.

**Response (200 OK)**:
```json
{
  "status": "success",
  "message": "QR code deleted successfully"
}
```

---

### GET /backend/qrcodes/order/:orderId

Get QR code for a specific order (user can view their own orders; admin can view all).

**Response (200 OK)**:
```json
{
  "status": "success",
  "data": { "/* qrcode object */" }
}
```

---

## External Integrations

CodePop integrates with external services to provide core functionality. This section documents the dependencies and fallback behavior.

### Stripe Integration (Payment Processing)

**Purpose**: Secure payment processing without storing card data

**Criticality**: Critical - orders cannot be completed without payments

**Endpoints Affected**:
- `POST /backend/payments` - initiates Stripe charge
- `POST /backend/orders` - fails if payment processing fails
- `PATCH /backend/payments/:paymentId/refund` - processes refunds via Stripe

**Fallback Behavior**:
- Failed payments stored with status `pending`
- Automatic retry with exponential backoff
- Customer notified via email; can retry payment

**API Reference**: See [Stripe API Documentation](https://stripe.com/docs/api)

---

### Firebase Cloud Messaging (FCM) Integration

**Purpose**: Push notifications for order status updates

**Criticality**: High - users won't receive real-time notifications but can check app

**Endpoints Affected**:
- `PATCH /backend/orders/:orderId/status` - sends FCM notification when order ready
- `POST /backend/notifications` - sends FCM notification to device

**Fallback Behavior**:
- Notifications still stored in database
- Users see notifications in-app
- Email fallback for critical notifications

---

### Mapbox Integration (Geolocation & Mapping)

**Purpose**: Show nearby store locations and calculate pickup times

**Criticality**: High - location-based pickup unavailable but time-based pickup works

**Endpoints Affected**:
- `GET /backend/orders` - includes estimated pickup times calculated from user location
- Admin dashboards - show store locations on map

**Fallback Behavior**:
- Time-based pickup ("ready in 15 minutes") used if Mapbox unavailable
- User experience degraded but functional

---

### Claude API Integration (AI Assistant)

**Purpose**: Intelligent customer support and personalized drink recommendations

**Criticality**: Low - optional feature with fallbacks

**Endpoints Affected**:
- Complaints system - provides AI-generated responses
- Recommendation engine - suggests drinks based on preferences

**Fallback Behavior**:
- Pre-written FAQ responses for common complaints
- Top 5 popular drinks suggested if AI unavailable
- Always provide "Contact human support" option

---

## Error Handling

### Standard Error Response Format

```json
{
  "error": "Error message description",
  "code": "ERROR_CODE",
  "details": "optional additional context"
}
```

### Error Codes

| Status | Code | Description |
|--------|------|-------------|
| 400 | VALIDATION_ERROR | Invalid input data or missing required fields |
| 400 | INVALID_TOKEN_FORMAT | Authorization header format incorrect |
| 400 | BAD_REQUEST | Malformed request |
| 401 | INVALID_TOKEN | Token is invalid, expired, or revoked |
| 401 | UNAUTHORIZED | Missing authorization header |
| 403 | NOT_ADMIN | Admin privileges required for this endpoint |
| 404 | NOT_FOUND | Resource not found |
| 409 | CONFLICT | Resource already exists (e.g., duplicate username) |
| 410 | GONE | Resource expired (e.g., QR code expired) |
| 429 | RATE_LIMITED | Too many requests; retry after delay |
| 500 | INTERNAL_ERROR | Server error |
| 500 | DATABASE_ERROR | Database operation failed |
| 502 | EXTERNAL_SERVICE_ERROR | External service (Stripe, FCM) unavailable |

### Example Error Responses

**Validation Error**:
```json
{
  "error": "Invalid email format",
  "code": "VALIDATION_ERROR",
  "details": "email: must be valid email address"
}
```

**Not Found**:
```json
{
  "error": "Order not found",
  "code": "NOT_FOUND",
  "details": "orderId: 999"
}
```

**Unauthorized**:
```json
{
  "error": "Invalid credentials",
  "code": "UNAUTHORIZED",
  "details": "username or password incorrect"
}
```

---

## Health & Info

### GET /health

Health check endpoint (no authentication required).

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

Node information including database addresses (no authentication required).

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

Server information (no authentication required).

**Response (200 OK)**:
```json
{
  "name": "CodePop OrbitDB Backend",
  "version": "1.0.0",
  "nodeType": "peer",
  "port": 3001,
  "status": "running"
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
| DELETE /users/account/delete | Yes | No |
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
| PATCH /drinks/:id/rate | Yes | No |
| GET /orders | Yes | No |
| POST /orders | Yes | No |
| GET /orders/:id | Yes | No |
| PATCH /orders/:id | Yes | No |
| DELETE /orders/:id | Yes | No |
| PATCH /orders/:id/status | Yes | Yes |
| GET /orders/stats/daily | Yes | Yes |
| GET /inventory | Yes | No |
| POST /inventory | Yes | Yes |
| GET /inventory/:id | Yes | No |
| PATCH /inventory/:id | Yes | Yes |
| DELETE /inventory/:id | Yes | Yes |
| PATCH /inventory/:id/restock | Yes | Yes |
| GET /inventory/report/low-stock | Yes | Yes |
| GET /notifications | Yes | No |
| POST /notifications | Yes | Yes |
| PATCH /notifications/:id/read | Yes | No |
| DELETE /notifications/:id | Yes | No |
| DELETE /notifications/clear-read | Yes | No |
| GET /notifications/unread-count | Yes | No |
| GET /revenues | Yes | Yes |
| POST /revenues | Yes | Yes |
| GET /revenues/:id | Yes | Yes |
| PATCH /revenues/:id/status | Yes | Yes |
| GET /revenues/report/daily | Yes | Yes |
| GET /revenues/report/monthly | Yes | Yes |
| GET /payments | Yes | Yes |
| POST /payments | Yes | No |
| GET /payments/:id | Yes | Yes |
| PATCH /payments/:id/refund | Yes | Yes |
| GET /qrcodes | Yes | Yes |
| POST /qrcodes | Yes | Yes |
| GET /qrcodes/:id | Yes | No |
| GET /qrcodes/:id/validate | Yes | No |
| DELETE /qrcodes/:id | Yes | Yes |
| GET /qrcodes/order/:orderId | Yes | No |
| GET /health | No | No |
| GET /info | No | No |
| GET / | No | No |

---

## Rate Limiting & Pagination

### Pagination

All list endpoints support pagination via query parameters:
- `offset`: Starting position (default: 0)
- `limit`: Number of items to return (default: 50, max: 100)

**Example**: `GET /backend/drinks?offset=100&limit=50`

### Rate Limiting

Current implementation: No rate limiting

**Recommended for Production**:
- 1000 requests per hour per token
- 100 requests per hour per IP for auth endpoints
- 429 status code for exceeded limits
- Reset timer provided in response headers

---

## Data Consistency & Transactions

### Order Workflow

1. **Create Order** → `POST /backend/orders`
   - Order created with status `pending`
   - Payment not yet processed

2. **Process Payment** → `POST /backend/payments`
   - Payment processed via Stripe
   - Payment stored with status `pending` or `completed`
   - Order remains in `pending` status

3. **Order Ready** → `PATCH /backend/orders/:orderId/status` (Admin)
   - Admin updates status to `ready`
   - FCM notification sent to user
   - QR code generated if not exists

4. **User Redeems** → `GET /backend/qrcodes/:qrcodeId/validate`
   - QR code validated
   - Fridge unlocked
   - Order access log created

5. **Complete Order** → `PATCH /backend/orders/:orderId/status` (Admin)
   - Admin updates status to `completed`
   - Revenue record created
   - Notification sent to user

### Consistency Guarantees

- **Database transactions**: All critical operations use atomic transactions
- **Idempotency**: Payment endpoints return same result if called multiple times
- **Eventual consistency**: OrbitDB replicates changes across peer nodes
- **Data validation**: All inputs validated before database operations

---

## Security Best Practices

### For API Consumers

1. **Token Management**:
   - Store tokens securely (never in localStorage for sensitive apps)
   - Rotate tokens periodically
   - Invalidate tokens on logout

2. **HTTPS Requirements**:
   - Always use HTTPS (TLS 1.3 or newer)
   - Verify SSL certificates
   - Implement certificate pinning for mobile apps

3. **Password Requirements**:
   - Minimum 8 characters
   - Must include uppercase, lowercase, number, special character
   - Never transmit in plaintext

4. **Input Validation**:
   - Validate all user input on client side
   - Sanitize inputs to prevent injection attacks
   - Use parameterized queries (Django ORM does this by default)

### For Backend Implementation

- Never log passwords or sensitive tokens
- Encrypt sensitive fields at rest (AES-256)
- Hash passwords with PBKDF2 or Argon2
- Implement rate limiting on sensitive endpoints
- Monitor for suspicious activity and unusual access patterns

---

## Testing the API

### Quick Start Test

```bash
#!/bin/bash

BASE_URL="http://localhost:3001"

# 1. Register user
echo "=== Registering user ==="
RESPONSE=$(curl -s -X POST "$BASE_URL/backend/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "SecurePass123!"
  }')

TOKEN=$(echo "$RESPONSE" | jq -r '.data.token')
echo "Token: $TOKEN"

# 2. Get drinks
echo -e "\n=== Fetching drinks ==="
curl -s -X GET "$BASE_URL/backend/drinks" \
  -H "Authorization: Token $TOKEN" | jq .

# 3. Create order
echo -e "\n=== Creating order ==="
curl -s -X POST "$BASE_URL/backend/orders" \
  -H "Authorization: Token $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "drinkIds": [1, 2],
    "quantities": [1, 1],
    "specialInstructions": "extra hot"
  }' | jq .

# 4. Get notifications
echo -e "\n=== Fetching notifications ==="
curl -s -X GET "$BASE_URL/backend/notifications" \
  -H "Authorization: Token $TOKEN" | jq .

# 5. Logout
echo -e "\n=== Logging out ==="
curl -s -X POST "$BASE_URL/backend/auth/logout" \
  -H "Authorization: Token $TOKEN" | jq .
```

---

## API Versioning

**Current Version**: 1.0.0

All endpoints use the `/backend/` prefix for backward compatibility with the legacy Django backend.

Future versions will be available at `/api/v2/` with proper deprecation notices.

---

**Last Updated**: 2026-03-18  
**Maintained By**: CodePop Development Team
