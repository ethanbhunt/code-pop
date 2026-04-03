# CodePop OrbitDB Backend

A decentralized backend for CodePop using OrbitDB, libp2p, and Express.js. This adds the distributed data layer and API surface used by the current multi-store runtime.

## Architecture

### Bootstrap Node
- Creates 8 OrbitDB keyvalue databases
- Writes peer information to `peer-info.json`
- Exposes REST API on port 3000
- Must run first

### Peer Nodes
- Read bootstrap peer information
- Connect to bootstrap automatically
- Open the same 8 databases
- Automatically replicate via gossipsub
- Expose full REST API on configurable ports (3001, 3002, etc.)
- Stateless - can spawn multiple instances

### Databases (8 total)
1. **users-db** - User account information
2. **tokens-db** - Authentication tokens
3. **preferences-db** - User drink preferences
4. **drinks-db** - Drink recipes and menu items
5. **inventory-db** - Stock levels and supplies
6. **orders-db** - Customer orders
7. **notifications-db** - System notifications
8. **revenues-db** - Payment and revenue tracking

## Setup

### Installation

```bash
cd codepop_backend/orbitdb
npm install
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

## Running the Backend

### Quick Start (3 Terminals)

**Terminal 1 - Bootstrap Node (Creates databases)**
```bash
cd codepop_backend/orbitdb
npm run bootstrap
```

Output:
```
[ ^ ] Starting CodePop Bootstrap Node...
[ ^ ] Creating CodePop databases...
[ ^ ] users-db created
[ ^ ] tokens-db created
  ... (6 more databases)
[ ^ ] Peer information written to peer-info.json
[ ^ ] Peer ID: 12D3KooXXXXXXXXX...
[ ^ ] Bootstrap node is ready!
[ ^ ] HTTP API: http://localhost:3000
```

**Terminal 2 - Peer Node 1 (Main API Server)**
```bash
cd codepop_backend/orbitdb
PORT=3001 npm run peer
```

Output:
```
[ ^ ] Starting CodePop Peer Node (port 3001)...
[ ^ ] Read bootstrap info from peer-info.json
[ ^ ] libp2p configured
[ ^ ] Dialing bootstrap: /ip4/127.0.0.1/tcp/4000/p2p/12D3KooXXX...
[ ^ ] Connected to bootstrap node
[ ^ ] Opening CodePop databases...
✓ Databases synchronized with bootstrap
[ ^ ] Peer node is ready!
[ ^ ] HTTP API: http://localhost:3001
```

**Terminal 3 - React Native Frontend**
```bash
cd codepop
npm start
```

Then choose:
- `a` for Android emulator
- `i` for iOS simulator
- `w` for web browser

### Optional: Additional Peer Node (for redundancy)

**Terminal 4 (Optional)**
```bash
cd codepop_backend/orbitdb
PORT=3002 npm run peer
```

This creates a second peer node on port 3002 that automatically syncs with the first peer.

## Frontend Configuration

### Android Emulator Setup
The React Native app is configured to connect to the backend at `10.0.2.2:3001` (special IP alias for the Android emulator to reach host localhost).

This is set in: `/codepop/ip_address.js`

```javascript
export const BASE_URL = 'http://10.0.2.2:3001';
```

**To connect to a different backend:**
1. Update `BASE_URL` in `/codepop/ip_address.js`
2. For physical device on same network, use your machine's IP: `http://192.168.x.x:3001`
3. For web version, use `http://localhost:3001`

### iOS Simulator Setup
Same configuration as Android. Simulators can also reach host localhost via `localhost:3001`

### Physical Device Setup
If running on a physical device on the same network:
1. Find your machine's IP: `ipconfig getifaddr en0` (Mac) or `ipconfig` (Windows)
2. Update `BASE_URL` in `/codepop/ip_address.js` to `http://<your-ip>:3001`
3. Ensure firewall allows port 3001 on your machine

## Running Individual Commands

**Backend only (if already running bootstrap):**
```bash
# Terminal 2
npm run peer

# Terminal 3 (additional peer)
PORT=3002 npm run peer
```

**Frontend only (if backend already running):**
```bash
cd codepop
npm start
```

**Run tests:**
```bash
cd codepop_backend/orbitdb
npm test                  # Unit tests
npm run test:integration  # Integration tests
```

## Authentication

All API endpoints (except health/info) require token-based authentication:

```
Authorization: Token {tokenKey}
```

### Authentication Flow

1. **Register**: `POST /backend/auth/register/`
   ```bash
   curl -X POST http://localhost:3001/backend/auth/register/ \
     -H "Content-Type: application/json" \
     -d '{
       "username": "testuser",
       "email": "test@example.com",
       "password": "SecurePass123!",
       "firstName": "Test",
       "lastName": "User"
     }'
   ```
   Response includes token for authentication.

2. **Login**: `POST /backend/auth/login`
   ```bash
   curl -X POST http://localhost:3001/backend/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "username": "testuser",
       "password": "SecurePass123!"
     }'
   ```
   Returns token to use in subsequent requests.

3. **Use Token**: Add to headers of authenticated endpoints
   ```bash
   curl -H "Authorization: Token {tokenKey}" \
     http://localhost:3001/backend/drinks/
   ```

Token format: 64 hexadecimal characters

## API Endpoints

### Health & Info (No auth required)
- `GET /health` - Node health check
- `GET /info` - Node information and database addresses
- `GET /` - Server info

### Authentication (Phase 2 - Complete)
- `POST /backend/auth/register/` - Create new user account
- `POST /backend/auth/login` - Login and get token
- `POST /backend/auth/logout` - Logout (requires token)

### Drinks (Phase 2 - Complete)
- `GET /backend/drinks/` - List menu drinks (requires token)
- `POST /backend/drinks/` - Create new drink (requires token)
- `GET /backend/drinks/:id` - Get drink details (requires token)
- `PUT /backend/drinks/:id` - Update drink (requires token)
- `DELETE /backend/drinks/:id` - Delete drink (requires token)
- `POST /backend/drinks/:id/favorite` - Add to favorites (requires token)
- `DELETE /backend/drinks/:id/favorite` - Remove from favorites (requires token)

### User Preferences (Phase 2 - Complete)
- `GET /backend/preferences/` - Get user preferences (requires token)
- `POST /backend/preferences/` - Create preference (requires token)
- `PUT /backend/preferences/:id` - Update preference (requires token)
- `DELETE /backend/preferences/:id` - Delete preference (requires token)

### Orders (Phase 2 - Complete)
- `POST /backend/orders/` - Create order (requires token)
- `GET /backend/orders/` - List user orders (requires token)
- `GET /backend/orders/:id` - Get order details (requires token)
- `PUT /backend/orders/:id` - Update order status (requires token)

### Full API Documentation
See [api.md](./doc/api.md) for complete endpoint list and examples.

## Project Structure

```
codepop_backend/orbitdb/
├── doc/
|   ├── api.md                 # API documentation
|   ├── quick_start_testing.md # Testing guide
|   ├── starting_guide.md.     # Starting guide
├── bootstrap-node.js          # Bootstrap node (creates DBs)
├── peer-node.js               # Peer node with Express API
├── package.json               # Dependencies & scripts
├── .env.example               # Environment variable template
├── peer-info.json             # Auto-generated (bootstrap info)
├── src/
│   ├── middleware/
│   │   ├── auth.js           # Token authentication
│   │   └── errorHandler.js   # Error handling
│   ├── services/             # Business logic (Phase 2+)
│   ├── routes/               # API routes (Phase 2+)
│   └── utils/
│       ├── db.js             # OrbitDB accessors
│       ├── crypto.js         # Password hashing & tokens
│       └── validation.js     # Input validation
├── tests/                    # Unit & integration tests
├── scripts/                  # Utility scripts
└── README.md                 # This file
```

## Development Commands

### Backend (from `codepop_backend/orbitdb` directory)

```bash
# Start bootstrap node (creates 8 databases)
npm run bootstrap

# Start peer node on default port 3001
npm run peer

# Start peer node on custom port
PORT=3002 npm run peer

# Run all tests
npm test

# Run tests with coverage report
npm run test:coverage

# Run integration tests
npm run test:integration
```

### Frontend (from `codepop` directory)

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on Android emulator
npm run android

# Run on iOS simulator
npm run ios

# Run web version
npm run web
```

## Deployment Strategy

### Local Development (Recommended Setup)

**Terminal 1: Bootstrap Node**
```bash
cd codepop_backend/orbitdb
npm run bootstrap
```

**Terminal 2: Peer Node**
```bash
cd codepop_backend/orbitdb
PORT=3001 npm run peer
```

**Terminal 3: Frontend**
```bash
cd codepop
npm start
# Choose: a (Android), i (iOS), or w (web)
```

### Network Setup for Multiple Devices

**If testing on physical device on same network:**

1. Find your machine's IP:
   ```bash
   # Mac/Linux
   ipconfig getifaddr en0
   
   # Windows
   ipconfig | findstr "IPv4"
   ```

2. Update `codepop/ip_address.js`:
   ```javascript
   export const BASE_URL = 'http://192.168.1.100:3001'; // Your IP
   ```

3. Ensure firewall allows port 3001:
   ```bash
   # Mac
   sudo defaults write com.apple.alf allowsignedenabled -bool false
   ```

### Production Deployment (Future)

1. Deploy bootstrap on public server with static IP
2. Deploy multiple peers for redundancy
3. Use load balancer in front of peer nodes
4. Configure persistent peer IDs for nodes
5. Implement DHT for automatic peer discovery
6. Use environment variables for all URLs
7. Enable HTTPS/TLS for all connections

## Key Differences from Django Backend

| Aspect | Django | OrbitDB |
|--------|--------|---------|
| Database | PostgreSQL (centralized) | OrbitDB (decentralized) |
| Data Model | SQL ORM models | Keyvalue stores |
| Storage | Disk (SQL) | Level DB (local) |
| Replication | Manual backup | Automatic gossipsub |
| Scalability | Vertical (bigger server) | Horizontal (more peers) |
| Architecture | Client-Server | Peer-to-Peer |

## Testing the Backend

### Quick Test with cURL

```bash
# Health check
curl http://localhost:3001/health

# Node info
curl http://localhost:3001/info

# Test database access (requires token)
curl -H "Authorization: Token your-token-here" \
  http://localhost:3001/test/users/get/user:1
```

## Troubleshooting

### App Won't Start / "No module found" errors

**Solution:**
```bash
cd codepop
npm install
```

### Backend: "peer-info.json not found"

**Problem:** Peer node started before bootstrap node

**Solution:**
1. Ensure bootstrap node is running: `npm run bootstrap`
2. Bootstrap creates `peer-info.json` on startup
3. Then start peer nodes

### Backend: "Failed to dial bootstrap"

**Problem:** Peer node can't connect to bootstrap

**Solution:**
- Ensure bootstrap is running on port 4000
- Check logs for bootstrap peer address
- Verify TCP connectivity on your firewall
- If using non-standard ports, update bootstrap connection string

### Frontend: "Cannot connect to backend"

**Problem:** Android app shows network errors or can't create drinks

**Possible Solutions:**

1. **Check IP address configuration** (`codepop/ip_address.js`):
   ```javascript
   // For Android emulator (default)
   export const BASE_URL = 'http://10.0.2.2:3001';
   
   // For iOS simulator
   export const BASE_URL = 'http://localhost:3001';
   
   // For physical device on same network
   export const BASE_URL = 'http://192.168.1.100:3001'; // Your IP
   ```

2. **Verify backend is running:**
   ```bash
   curl http://localhost:3001/health
   ```

3. **Check network connectivity:**
   - Android emulator can't reach `localhost` - must use `10.0.2.2`
   - Physical devices need your machine's IP address
   - Both must be on same network

4. **Clear AsyncStorage cache:**
   - Uninstall and reinstall the app
   - Or manually clear app data

### Frontend: "Missing authorization header" warnings on startup

**Problem:** App shows "MISSING_TOKEN" error on initial load

**Expected behavior:**
- SeasonalCarousel doesn't fetch drinks until user logs in
- This is normal - no token exists yet
- Warning disappears after login

**If it doesn't go away:**
1. User may not be logged in
2. Check AsyncStorage token storage
3. Try logging out and back in

### Database synchronization slow

- Allow 2-3 seconds for initial peer-to-peer sync
- More data = longer sync time
- Check network connectivity between bootstrap and peers
- Restart nodes if sync takes >10 seconds

### Token authentication failing

**Problem:** API returns 401 Unauthorized

**Check:**
1. Token format: Must be 64 hexadecimal characters
2. Header format: `Authorization: Token {tokenKey}` (space required)
3. Token exists in tokens-db
4. Token hasn't expired
5. User is logged in and token stored in AsyncStorage