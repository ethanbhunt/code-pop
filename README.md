# CodePop

CodePop is a multi-app workspace with:

- Mobile app (Expo React Native) in `codepop/`
- Dashboard (Next.js) in `dashboard/`
- OrbitDB backend/API in `codepop_backend/orbitdb/`

## Recent Updates

- Expanded mobile test suite in `codepop/__tests__/` with coverage command support.
- Added dashboard utility and login tests (`dashboard/lib/*.test.ts`, `dashboard/app/login/page.test.tsx`).
- Added dashboard coverage command: `npm run test:coverage`.
- Added mobile coverage command: `npm run test:coverage`.
- Updated mobile map component to support explicit `mapboxToken` prop fallback behavior.
- Updated local workflow scripts for more robust tool detection and startup behavior.

## Current Local Workflow (Recommended)

Use the startup scripts in `scripts/`.

### 1) Start the local stack

From the repository root:

```bash
node scripts/start-local-stack.js
```

What this does:

- Ensures Docker is available
- Runs `docker compose up` for current services
- Waits for health checks:
  - `http://localhost:3000/peers/stats` (OrbitDB bootstrap)
  - `http://localhost:3001/peers/stats` and `http://localhost:3001/health` (OrbitDB peer/API)
  - `http://localhost:3002` (dashboard)
- Seeds OrbitDB test data by running `npm run seed` inside `orbitdb-peer`

Useful flags:

- `--skip-build`: start without rebuilding images
- `--skip-seed`: start without seeding test data
- `--foreground`: run compose in foreground mode

Examples:

```bash
node scripts/start-local-stack.js --skip-build
node scripts/start-local-stack.js --skip-build --skip-seed
```

### 2) Start the mobile Android app

From the repository root:

```bash
node scripts/start-mobile-android.js
```

Default backend URL for Android emulator:

- `http://10.0.2.2:3001`

Custom backend URL:

```bash
node scripts/start-mobile-android.js --backend-url http://10.0.2.2:3001
```

What this script does:

- Verifies `node`, `npm`, and `adb`
- Writes `codepop/.env.local`
- Runs `npm install` in `codepop/`
- Runs `npm run android` in `codepop/`

## Docker Compose Services (Current)

Current `docker-compose.yml` services:

- `postgres` on `5432`
- `orbitdb-bootstrap` on `3000` and `4000`
- `orbitdb-peer` on `3001` and `4001`
- `dashboard` on `3002`

## URLs

- Dashboard: `http://localhost:3002`
- OrbitDB bootstrap stats: `http://localhost:3000/peers/stats`
- OrbitDB peer stats: `http://localhost:3001/peers/stats`
- OrbitDB peer health: `http://localhost:3001/health`
- Android emulator backend URL: `http://10.0.2.2:3001`

## Dashboard Authentication

Dashboard credentials provider authenticates against OrbitDB:

- `POST {ORBITDB_API_URL}/backend/auth/login`

Seeded local test credentials:

- `superadmin` / `SuperAdmin123`
- `manager` / `Manager123`
- `admin` / `Admin123`
- `customer` / `Customer123`

## Seeding Notes

Seeding runs automatically in `start-local-stack.js` unless `--skip-seed` is used.

If you do not want additional seeded records on startup:

```bash
node scripts/start-local-stack.js --skip-build --skip-seed
```

## Testing

### Mobile

```bash
cd codepop
npm test
npm run test:coverage
```

### Dashboard

```bash
cd dashboard
npm test
npm run test:coverage
npm run test:e2e
```

### OrbitDB

```bash
cd codepop_backend/orbitdb
npm test
```

### Django backend smoke tests

```bash
cd codepop_backend/backend
python manage.py test
```

## Manual Compose Commands (Optional)

Start stack manually:

```bash
docker compose up -d --build
```

View logs:

```bash
docker compose logs -f
```

Stop stack:

```bash
docker compose down
```

## Environment and Secrets

Do not commit production values for:

- `DJANGO_SECRET_KEY`
- `POSTGRES_PASSWORD`
- `AUTH_SECRET`
- Stripe keys
- Any service credentials

For local development, use non-committed environment files or shell variables.

## Troubleshooting

- If dashboard login fails with "Invalid username or password", confirm OrbitDB peer health at `http://localhost:3001/health` and that seeding has run.
- If mobile cannot reach backend in emulator, confirm `EXPO_PUBLIC_BACKEND_URL=http://10.0.2.2:3001`.
- If startup fails, run `docker compose ps` and `docker compose logs -f`.
