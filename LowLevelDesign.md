# CodePop Low-Level Design (Current)

## 1. Repository-Level Module Breakdown

### 1.1 Mobile App (`codepop/`)

Core files:

- `App.js`: bootstrap, auth validation, initial route selection, stack navigation
- `ip_address.js`: store-aware base URL behavior
- `src/components/*`: shared UI and behavior components
- `src/pages/*`: screen-level flows

Boot sequence in `App.js`:

1. Initialize backend URL selection
2. Reset cart storage (`checkoutList`)
3. Clear stale `purchasedDrinks`
4. Resolve store selection
5. Validate token via `/backend/auth/me`
6. Set initial route (`StoreSelect` or `GeneralHome`)

### 1.2 Dashboard App (`dashboard/`)

Core files:

- `auth.ts`: NextAuth credential provider integration
- `lib/orbit-fetch.ts`: authenticated and public Orbit fetch wrappers
- `lib/orbit-role-map.ts`: Orbit-to-dashboard role mappings
- `lib/orbit-session.ts`: role guard helpers
- `app/api/orbit/**`: server-side BFF route proxies

Login flow:

1. User enters credentials on `app/login/page.tsx`
2. NextAuth credentials provider posts to Orbit `/backend/auth/login`
3. Session stores access token + mapped dashboard roles
4. BFF routes use `orbit-fetch` utilities for downstream API calls

### 1.3 OrbitDB Backend (`codepop_backend/orbitdb/`)

Core route domains (`src/routes`):

- auth
- users
- drinks
- orders
- payments
- preferences
- inventory
- logistics
- maintenance
- notifications
- auditLogs
- stores
- peers
- admin
- revenues
- qrcodes

Service layer mirrors route domains in `src/services/*`.

### 1.4 Local Operations Scripts (`scripts/`)

- `start-local-stack.js`: compose startup + health checks + seeding
- `start-mobile-android.js`: env generation + install + Expo Android launch

## 2. Data and Control Flows

### 2.1 Mobile Auth Control Flow

- Token from AsyncStorage is optional.
- Missing token => guest mode allowed.
- Existing token is validated; failures remove token and user metadata keys.
- Selected store requirement is enforced before normal customer flow.

### 2.2 Dashboard API Flow

- Dashboard server-side routes receive request.
- Session token and role guard is evaluated (`orbit-session.ts`).
- Request is forwarded with token via `orbitFetch`.
- JSON parsing and error shaping handled by orbit fetch utility helpers.

### 2.3 Seeding Flow

- Single-peer seeding through `seed_data.py --all`.
- Multi-peer mode through `--all-peers` using configured peer URL set.
- Users are primarily seeded on peer 1 then replicated; non-user data seeded across peers.

## 3. Interfaces and Contracts

### 3.1 Orbit Fetch Utility Contracts

`orbit-fetch.ts` guarantees:

- `getOrbitBaseUrl()` returns normalized base URL or null
- `orbitFetch(token, path, init)` injects `Authorization: Token ...`
- `orbitFetchPublic(path, init)` omits auth for public endpoints
- JSON helpers return tagged unions for success/failure (`ok: true/false`)

### 3.2 Role Mapping Contracts

`orbit-role-map.ts` guarantees:

- Dashboard role to Orbit tier mapping for write/update operations
- Orbit role to dashboard role set expansion for session permissions
- Default dashboard role selection for role editor use cases

### 3.3 Session Guard Contracts

`orbit-session.ts` provides explicit role guard helpers:

- access token extraction
- admin/super-admin checks
- staff/manager/logistics checks
- repair checks

## 4. Testable Behaviors (LLD-Level)

- Mobile bootstrap route selection and storage initialization
- Map rendering token fallback and placeholder mode
- Dashboard login success/failure UX behavior
- Orbit role map and session guard correctness
- Seeding script branch behavior for each CLI flag
- Peer config helper return values
- Request wrapper error handling branches

## 5. Implementation Notes and Constraints

- Dashboard Vitest config currently forces serial execution (`maxWorkers: 1`) for deterministic runs.
- Mobile Jest config now collects coverage for `App.js` and component files (excluding specific patterns).
- Orbit package scripts depend on `python3` for seeding and include jest coverage commands.
- Windows shell environments may need explicit executable resolution for `node`, `npm`, and `adb` (handled in startup scripts).
