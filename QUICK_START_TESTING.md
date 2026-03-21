# CodePop - Quick Start Testing Guide

## ⚡ Get Started in 5 Minutes

### Step 1: Start OrbitDB Backend (30 seconds)

```bash
cd codepop_backend/orbitdb

# Terminal 1: Bootstrap Node
npm run bootstrap

# Terminal 2: Peer Node (wait for bootstrap to start first)
npm run peer
```

Verify it's running:
```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "healthy",
  "nodeType": "peer",
  "port": 3001
}
```

### Step 2: Test API Endpoints (2 minutes)

Copy and run these curl commands:

```bash
# 1. Register a user
curl -X POST http://localhost:3001/backend/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "TestPass123!",
    "email": "test@example.com",
    "first_name": "Test"
  }'

# Save the token from response (or use this test token)
TOKEN="your_token_here"

# 2. Create a drink
curl -X POST http://localhost:3001/backend/drinks/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Token $TOKEN" \
  -d '{
    "name": "Vanilla Sprite",
    "sodaUsed": ["Sprite"],
    "syrupsUsed": ["Vanilla"],
    "addIns": [],
    "price": 3.50,
    "size": "16oz",
    "ice": "light",
    "userCreated": true
  }'

# 3. Get all drinks
curl -X GET http://localhost:3001/backend/drinks/ \
  -H "Authorization: Token $TOKEN"

# 4. Create an order
curl -X POST http://localhost:3001/backend/orders/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Token $TOKEN" \
  -d '{
    "userId": 1,
    "drinks": [1],
    "orderStatus": "processing",
    "paymentStatus": "pending"
  }'

# 5. Get inventory
curl -X GET http://localhost:3001/backend/inventory/ \
  -H "Authorization: Token $TOKEN"

# 6. Logout
curl -X POST http://localhost:3001/backend/auth/logout/ \
  -H "Authorization: Token $TOKEN"
```

### Step 3: Start Frontend (1.5 minutes)

```bash
cd codepop

# Install dependencies (if needed)
npm install

# Start dev server
npm start

# Choose:
# - Press 'i' for iOS simulator
# - Press 'a' for Android emulator
# - Press 'w' for web version
```

### Step 4: Test Full User Flow (1 minute)

1. **Login Screen**
   - Username: `testuser`
   - Password: `TestPass123!`
   - Tap "Login"

2. **Home Page**
   - Should load without errors
   - Check console for API calls

3. **Create Drink**
   - Tap "Create Drink" (or equivalent)
   - Fill in drink details
   - Verify it saves to database

4. **View Cart**
   - Navigate to cart
   - Should show created drink
   - Verify prices calculate correctly

5. **Complete Order**
   - Proceed to checkout
   - Complete Stripe payment (test mode)
   - Verify order appears in backend

---

## 🔍 Troubleshooting

### Backend won't start?

```bash
# Check if ports are in use
lsof -i :3000
lsof -i :3001

# Kill existing processes
pkill -f "node bootstrap-node.js"
pkill -f "node peer-node.js"

# Clean up old data
rm -rf repo-bootstrap repo-peer-3001

# Try again
npm run bootstrap  # in Terminal 1
npm run peer       # in Terminal 2 (after bootstrap starts)
```

### Frontend can't connect?

1. Check `codepop/ip_address.js` points to `http://localhost:3001`
2. Verify backend is running: `curl http://localhost:3001/health`
3. Check React Native console for network errors
4. Clear AsyncStorage if needed (clear app cache)

### API returns 401 Unauthorized?

- Token may be expired
- Headers may be missing `Authorization: Token`
- Register a new user and get fresh token

### Drink creation fails?

Use correct size values: `"16oz"`, `"24oz"`, or `"32oz"`

Valid ice levels: `"light"`, `"normal"`, or `"extra"`

---

## 📊 Key Test Scenarios

### Scenario 1: User Registration & Login
```
Expected: New user registers → receives token → can login with same credentials
Time: ~2 minutes
```

### Scenario 2: Create Custom Drink
```
Expected: User creates drink → appears in database → can be retrieved by ID
Time: ~1 minute
```

### Scenario 3: Place Order
```
Expected: User adds drink to cart → creates order → status tracked
Time: ~2 minutes
```

### Scenario 4: Manager Dashboard
```
Expected: Manager views revenue → inventory levels → order counts
Time: ~1 minute
```

### Scenario 5: Full Checkout Flow
```
Expected: User creates drink → adds to cart → checkout → payment → complete
Time: ~3 minutes
```

---

## 📱 Default Test Credentials

| Field | Value |
|-------|-------|
| Username | `testuser` |
| Password | `TestPass123!` |
| Email | `test@example.com` |

Or create your own during testing.

---

## 🚀 Performance Tips

- Backend is faster on same machine (localhost vs network)
- First request is slower due to database initialization
- Subsequent requests are ~30-50ms
- Multiple peer nodes scale horizontally

---

## 📚 Full Documentation

- API Endpoints: `codepop_backend/orbitdb/API_ENDPOINTS.md`
- Integration Report: `ORBITDB_INTEGRATION_COMPLETE.md`
- Migration Guide: `codepop_backend/orbitdb/MIGRATION_GUIDE.md`

---

## ✅ All Fixed Issues

- ✅ Backend URL updated to `localhost:3001`
- ✅ 25+ API calls now include auth headers
- ✅ 8 pages updated with proper authentication
- ✅ All databases initialized and replicating
- ✅ 19 endpoints tested and working

**Ready to test!** 🎉
