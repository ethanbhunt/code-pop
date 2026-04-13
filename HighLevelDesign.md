# CodePop High-Level Design (Current)

## 1. System Summary

CodePop is a multi-surface distributed system composed of:

- Mobile client: Expo React Native app in `codepop/`
- Web operations dashboard: Next.js app in `dashboard/`
- Distributed backend: OrbitDB peer network and API in `codepop_backend/orbitdb/`
- Optional/legacy backend assets: Django backend smoke and route tests in `codepop_backend/backend/`

The default local architecture is OrbitDB-first.

## 2. Runtime Topology

### 2.1 Docker Compose Services

Current local stack (`docker-compose.yml`) includes:

- `postgres` on 5432
- `orbitdb-bootstrap` on 3000/4000
- `orbitdb-peer` on 3001/4001
- `dashboard` on 3002

### 2.2 Startup Orchestration

Primary startup script: `scripts/start-local-stack.js`

Responsibilities:

- Detect Docker and compose mode
- Bring up containers (`docker compose up`)
- Wait for service health:
  - `http://localhost:3000/peers/stats`
  - `http://localhost:3001/peers/stats`
  - `http://localhost:3001/health`
  - `http://localhost:3002`
- Seed OrbitDB test data via `npm run seed` in `orbitdb-peer`

Primary mobile startup script: `scripts/start-mobile-android.js`

Responsibilities:

- Write mobile env file (`codepop/.env.local`)
- Default backend URL to `http://10.0.2.2:3001`
- Install mobile dependencies and run Android app

## 3. Major Architectural Decisions

### 3.1 Backend Style

- OrbitDB peer architecture is used as the active local backend pattern.
- Bootstrap + peer nodes coordinate distributed data replication.
- API endpoints are exposed under `/backend/*` on peer nodes.

### 3.2 Frontend Split

- Mobile app handles customer ordering workflows and store-aware routing.
- Dashboard handles role-based operational workflows and admin reporting.

### 3.3 Authentication Model

- Dashboard auth uses NextAuth credentials provider against OrbitDB `/backend/auth/login`.
- Mobile app stores token in AsyncStorage and validates via `/backend/auth/me`.
- Invalid token handling is fail-safe and falls back to guest flow.

## 4. Functional Surface Map

### 4.1 Mobile

- Auth, account creation, and guest operation
- Store selection and store-aware backend routing
- Drink creation/customization
- Cart and checkout flow
- Post-checkout and rating interactions
- Map visualization via Mapbox static maps

### 4.2 Dashboard

- Role dashboards (customer/staff/manager/logistics/admin/super-admin/repair)
- BFF API routes under `dashboard/app/api/orbit/**`
- Inventory, notifications, users, revenues, stores, logistics, maintenance flows

### 4.3 OrbitDB Backend

- Route groups under `src/routes` including auth, users, drinks, orders, payments,
  inventory, logistics, maintenance, notifications, audit logs, stores, peers
- Service layer under `src/services` mirrors route domains
- Seeding and peer config helpers in `scripts/`

## 5. Observability and Health

- Stack readiness is determined by HTTP health/stats checks for bootstrap, peer, and dashboard.
- Compose process state is reported through `docker compose ps`.
- Seed step can be skipped for faster local spin-up when data already exists.

## 6. Security and Access Control

- Token-based API authorization for protected backend routes
- Role-aware gatekeeping for sensitive operations
- Non-production defaults for local secrets; production secrets must be externalized

## 7. Testing Strategy at High Level

- Mobile: Jest tests in `codepop/__tests__` with coverage support
- Dashboard: Vitest tests (`app/login` and `lib/*.test.ts`) with V8 coverage support
- OrbitDB scripts/backend: Python and Jest-based tests in orbitdb project
- Backend smoke checks: deployment and route-binding tests in `codepop_backend/backend`

## 8. Known Design Constraints

- Compose stack currently exposes one OrbitDB peer service by default (3001), while peer config supports additional peers.
- Some Django backend artifacts remain in repository but are not part of the default local stack workflow.
- Full end-to-end automation across all surfaces is still evolving.
