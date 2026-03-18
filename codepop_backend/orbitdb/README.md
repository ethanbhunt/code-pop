# CodePop OrbitDB Backend

A decentralized backend for CodePop using OrbitDB, libp2p, and Express.js. This replaces the Django/PostgreSQL architecture with a peer-to-peer database system.

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

### Terminal 1 - Bootstrap Node (Creates databases)
```bash
npm run bootstrap
```

Output:
```
🚀 Starting CodePop Bootstrap Node...
📚 Creating CodePop databases...
  ✓ users-db created
  ✓ tokens-db created
  ... (6 more databases)
📝 Peer information written to peer-info.json
   Peer ID: 12D3KooXXXXXXXXX...
✅ Bootstrap node is ready!
   HTTP API: http://localhost:3000
```

### Terminal 2 - Peer Node 1 (API Server)
```bash
npm run peer
```

Or specify port:
```bash
PORT=3001 npm run peer
```

Output:
```
🚀 Starting CodePop Peer Node (port 3001)...
✓ Read bootstrap info from peer-info.json
✓ libp2p configured
🔌 Dialing bootstrap: /ip4/127.0.0.1/tcp/4000/p2p/12D3KooXXX...
✓ Connected to bootstrap node
📚 Opening CodePop databases...
✓ Databases synchronized with bootstrap
✅ Peer node is ready!
   HTTP API: http://localhost:3001
```

### Terminal 3 - Peer Node 2 (Optional - for redundancy)
```bash
PORT=3002 npm run peer
```

## API Endpoints (Phase 1 - Basic)

### Health & Info
- `GET /health` - Node health check
- `GET /info` - Node information and database addresses
- `GET /` - Server info

### Testing
- `GET /test/users/get/:key` - Get user (requires token)

## Authentication

API uses token-based authentication:

```
Authorization: Token {tokenKey}
```

Example:
```bash
curl -H "Authorization: Token abc123def456..." http://localhost:3001/test/users/get/user:1
```

## Project Structure

```
codepop_backend/orbitdb/
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

```bash
# Start bootstrap node
npm run bootstrap

# Start peer node on port 3001
npm run peer

# Start peer node on port 3002
npm run peer:3002

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run integration tests
npm run test:integration

# Migrate data from Django/PostgreSQL
npm run migrate
```

## Phase 1 Status

✅ **Complete:**
- Bootstrap node with 8 database creation
- Peer node with libp2p networking
- Automatic database replication via gossipsub
- Authentication middleware
- Error handling middleware
- Database accessor utility
- Crypto utilities (password hashing, token generation)
- REST API foundation with Health/Info endpoints

🚧 **Phase 2 (Next):**
- User authentication (register, login, logout)
- CRUD endpoints for all entities
- Input validation
- Admin/staff permission checks
- Error handling for all scenarios

## Deployment Strategy

### Local Development
1. Start bootstrap in terminal 1: `npm run bootstrap`
2. Start peer in terminal 2: `npm run peer`
3. Mobile app connects to `http://localhost:3001` (or your IP)

### Production (Future)
1. Deploy bootstrap on public server with static IP
2. Deploy multiple peers for redundancy
3. Use load balancer in front of peer nodes
4. Configure persistent peer IDs for nodes
5. Implement DHT for automatic peer discovery

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

### "peer-info.json not found"
- Make sure bootstrap node is running first
- Bootstrap creates `peer-info.json` on startup

### "Failed to dial bootstrap"
- Ensure bootstrap is running on port 4000
- Check firewall allows TCP connections
- Try connecting with IP instead of 127.0.0.1

### Database synchronization slow
- Allow 2-3 seconds for initial sync
- More data = longer sync time
- Check network connectivity between nodes

### Token authentication failing
- Ensure token is in correct format (64 hex characters)
- Check Authorization header: `Token {tokenKey}`
- Verify token exists in tokens-db

## Next Steps

1. **Phase 2**: Implement all user/auth endpoints
2. **Phase 2**: Implement CRUD for Preferences, Drinks, Orders, etc.
3. **Phase 3**: Port Python AI services (drinkAI, customerAI)
4. **Phase 4**: Data migration from PostgreSQL
5. **Phase 5**: Frontend integration & testing

## Contributing

When adding new endpoints:
1. Create service in `src/services/`
2. Create routes in `src/routes/`
3. Add unit tests in `tests/services/`
4. Add integration tests in `tests/integration/`
5. Update this README

## Resources

- [OrbitDB Documentation](https://docs.orbitdb.org/)
- [libp2p JavaScript](https://docs.libp2p.io/)
- [Express.js Guide](https://expressjs.com/)
- [CodePop AGENTS.md](../../AGENTS.md)

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review Phase 1 implementation details above
3. Check AGENTS.md for development guidelines
4. Open an issue with logs from both bootstrap and peer nodes
