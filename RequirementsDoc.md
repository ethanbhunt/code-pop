# CodePop Requirements Document (Current)

## 1. Purpose and Scope

CodePop is a distributed soda-ordering platform with three active product surfaces:

- Mobile ordering app (Expo React Native)
- Operations dashboard (Next.js + NextAuth)
- OrbitDB-backed distributed API (Node/Express + libp2p)

This document defines the current requirements baseline that matches the repository's implemented state.

## 2. Functional Requirements

### 2.1 Identity and Access

- The system must authenticate users through OrbitDB API credentials (`/backend/auth/login`).
- The system must support role-aware behavior for:
  - customer
  - staff
  - manager/logistics manager (dashboard tier)
  - admin/super admin
  - repair staff
- The mobile app must support guest mode when no valid auth token exists.
- The mobile app must validate saved tokens on startup (`/backend/auth/me`) and clear stale auth data if invalid.

### 2.2 Store-Aware Runtime

- The mobile app must persist selected store values and route to store selection when missing.
- Runtime configuration must support store-aware backend URL initialization.
- Local stack startup must check health of OrbitDB bootstrap, OrbitDB peer/API, and dashboard services.

### 2.3 Ordering and Catalog

- Users must be able to browse drinks, customize drinks, add to cart, and complete checkout.
- Mobile startup must initialize `checkoutList` to an empty list.
- Mobile startup must clear stale `purchasedDrinks` values.
- Order APIs must support creation, retrieval, status transitions, and fulfillment paths.

### 2.4 Inventory, Logistics, and Maintenance

- Inventory APIs must support read/update/create operations with role-based enforcement.
- Logistics APIs must support transfer and scheduling workflows.
- Maintenance APIs must support machine state tracking and assignment/history workflows.
- Audit logs must be readable only by authorized roles.

### 2.5 Dashboard Feature Requirements

- Dashboard BFF endpoints must proxy OrbitDB APIs for users, stores, inventory, notifications, revenues, logistics, and maintenance.
- Dashboard role mapping must correctly translate Orbit roles to dashboard role sets and defaults.
- Login UI must show deterministic error states and redirect to callback URL on success.

### 2.6 Mapping and Geolocation

- The mobile map component must render Mapbox static maps when a token is available.
- Map token resolution must support:
  - explicit `mapboxToken` prop
  - fallback to `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN`
- The map component must show a graceful placeholder when no token is configured.

### 2.7 Seeding and Data Bootstrapping

- OrbitDB seeding must support:
  - all data
  - users only
  - drinks only
  - preferences only
  - inventory only
  - clear
  - reset
  - all-peers mode
- Seeding must support primary + multi-peer scenarios through peer configuration.

## 3. Non-Functional Requirements

### 3.1 Availability and Fault Tolerance

- Local development workflows must continue using local services in Docker compose unless an external dependency is explicitly required.
- Startup scripts must fail with actionable diagnostics when health checks fail.

### 3.2 Security

- Sensitive values (auth secrets, DB passwords, payment keys) must not be committed as production secrets.
- Authenticated API calls must use token-based authorization headers.
- Role checks must gate protected operations (inventory mutation, audit access, admin operations).

### 3.3 Performance and Determinism

- Local startup must support detached mode and optional skip-build/skip-seed flags.
- Test pipelines should run deterministically:
  - Dashboard Vitest configured with fixed worker count.
  - Mobile Jest configured with coverage collection.

### 3.4 Maintainability

- Shared scripts in `scripts/` must remain the recommended startup workflow.
- Core docs must stay synchronized with `docker-compose.yml`, startup scripts, and package test commands.

## 4. Integration Requirements

- Payment routes must remain compatible with Stripe integration in backend APIs.
- Map routes/components must remain compatible with Mapbox static image API.
- Dashboard authentication must target OrbitDB `/backend/auth/login`.

## 5. Verification Requirements

- Mobile tests must verify app bootstrap/auth/cart behavior and major shared components.
- Dashboard tests must verify login behavior and Orbit utility role/session helpers.
- OrbitDB tests must verify peer config helpers, seeding scripts, request error paths, and sync-related paths.
- Backend smoke tests must verify deployment health and route bindings.

## 6. Out of Scope (Current Baseline)

- Production SLO/SLA definitions and cloud region rollout policy.
- Full cross-browser and cross-device end-to-end automation matrix.
