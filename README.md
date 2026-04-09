# CodePop

CodePop is a multi-app workspace with:
- Mobile app (Expo React Native) in `codepop/`
- Dashboard (Next.js) in `dashboard/`
- OrbitDB backend/API in `codepop_backend/orbitdb/`

## Current Local Workflow (Recommended)

The current implementation uses the Node startup scripts in `scripts/`.

### 1. Start the local stack

From the repository root:

```bash
node scripts/start-local-stack.js
```

What this does:
- Ensures Docker is available
- Runs `docker compose up` for the current services
- Waits for service health checks:
  - `http://localhost:3000/peers/stats` (OrbitDB bootstrap)
  - `http://localhost:3001/peers/stats` and `http://localhost:3001/health` (OrbitDB peer/API)
  - `http://localhost:3002` (dashboard)
- Seeds OrbitDB test data by running `npm run seed` inside the `orbitdb-peer` container

Useful flags:
- `--skip-build`: start without rebuilding images
- `--skip-seed`: start without seeding test data
- `--foreground`: run compose in foreground mode

Examples:

```bash
node scripts/start-local-stack.js --skip-build
node scripts/start-local-stack.js --skip-build --skip-seed
```

### 2. Start the mobile Android app

From the repository root:

```bash
node scripts/start-mobile-android.js
```

Default backend URL used for Android emulator:
- `http://10.0.2.2:3001`

Use a custom backend URL if needed:

```bash
node scripts/start-mobile-android.js --backend-url http://10.0.2.2:3001
```

What this script does:
- Verifies `node`, `npm`, and `adb`
- Writes `codepop/.env.local` with mobile runtime values
- Runs `npm install` in `codepop/`
- Runs `npm run android` in `codepop/`

## Docker Compose Services (Current)

Current `docker-compose.yml` brings up:
- `postgres` on `5432`
- `orbitdb-bootstrap` on `3000` and `4000`
- `orbitdb-peer` on `3001` and `4001`
- `dashboard` on `3002`


## URLs

- Dashboard: `http://localhost:3002`
- OrbitDB bootstrap: `http://localhost:3000/peers/stats`
- OrbitDB peer stats: `http://localhost:3001/peers/stats`
- OrbitDB peer health: `http://localhost:3001/health`
- Android emulator backend base URL: `http://10.0.2.2:3001`

## Dashboard Authentication

The dashboard authenticates against OrbitDB using:
- `POST {ORBITDB_API_URL}/backend/auth/login`

If using the default seeded users, test credentials are:
- `superadmin` / `SuperAdmin123`
- `manager` / `Manager123`
- `admin` / `Admin123`
- `customer` / `Customer123`

## Seeding Notes

Seeding runs automatically in `start-local-stack.js` unless `--skip-seed` is used.

Current seeding behavior is partially idempotent:
- Existing users are skipped
- Other seeded entities may be added again if seeded repeatedly

If you need to avoid additional seeded records on startup, use:

```bash
node scripts/start-local-stack.js --skip-build --skip-seed
```

## Manual Commands (Optional)

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

## Testing

### Dashboard tests

```bash
cd dashboard
npm test
```

### OrbitDB tests

```bash
cd codepop_backend/orbitdb
npm test
```

### Mobile tests

```bash
cd codepop
npm test
```

### Django backend tests

```bash
cd codepop_backend/backend
python manage.py test
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

- If dashboard login fails with "Invalid username or password", confirm OrbitDB peer is healthy at `http://localhost:3001/health` and that users are seeded.
- If mobile app cannot reach backend on emulator, confirm it uses `http://10.0.2.2:3001`.
- If Docker is running but startup fails, run `docker compose ps` and `docker compose logs -f`.
