# CodePop Test Design Report (Current)

## 1. Test Strategy Summary

CodePop testing is organized by product surface:

- Mobile app unit/integration-style component tests (Jest, React Native Testing Library)
- Dashboard unit/component tests (Vitest, Testing Library, jsdom)
- OrbitDB backend/script tests (Python unit tests + Jest tests)
- Backend deployment/route smoke tests (Django test modules)

The strategy prioritizes validating startup safety, auth correctness, role gating, and script/runtime reliability.

## 2. Test Inventory by Surface

### 2.1 Mobile (`codepop/__tests__`)

Current suites:

- `AIAlert.test.js`
- `App.test.js`
- `DropDown.test.js`
- `Ingredients.test.js`
- `Map.test.js`
- `NavBar.test.js`
- `RatingCarosel.test.js`
- `SeasonalCarousel.test.js`
- `StarRating.test.js`

Recent emphasis:

- bootstrap auth/cart initialization in `App.test.js`
- map token injection behavior in `Map.test.js`
- carousel/rating/cart flows and navigation side effects

Coverage command:

- `cd codepop && npm run test:coverage`

### 2.2 Dashboard (`dashboard/`)

Current suites:

- `app/login/page.test.tsx`
- `lib/orbit-fetch.test.ts`
- `lib/orbit-role-map.test.ts`
- `lib/orbit-session.test.ts`

Recent emphasis:

- auth failure/success behavior on login page
- Orbit fetch header/JSON parsing behavior
- role conversion and session guard logic

Coverage command:

- `cd dashboard && npm run test:coverage`

### 2.3 OrbitDB Script/Backend Tests (`codepop_backend/orbitdb/tests`)

Current suites include:

- peer config tests (`test_peer_config_unit.py`, `test_peer_config_backup_unit.py`)
- seed script unit tests and main-path tests (`test_seed_data_*`, `test_seed_backup_*`)
- request error-path coverage (`test_seed_request_paths_unit.py`)
- peer sync behavior (`test_peer_sync.py`)

Coverage command:

- `cd codepop_backend/orbitdb && npm test`

### 2.4 Backend Smoke Tests (`codepop_backend/backend`)

Current suites:

- `test_deployment_smoke.py`
- `test_route_bindings.py`

Focus areas:

- health endpoint reachability
- authenticated store create/read smoke path
- `/backend/auth/me/` behavior
- fulfillment route alias/auth behavior

## 3. Test Environment and Configuration Notes

### 3.1 Mobile Jest

- `jest-expo` preset
- coverage enabled via `collectCoverage`
- component-focused coverage include/exclude patterns

### 3.2 Dashboard Vitest

- `jsdom` environment
- single-worker deterministic config
- V8 coverage provider with include/exclude patterns

### 3.3 Local Stack Validation

- `scripts/start-local-stack.js` performs runtime health checks and optional seeding.
- This script acts as a pre-test environment validation mechanism for local integrated runs.

## 4. Key Risks and Gaps

- End-to-end tests spanning mobile -> dashboard -> orbitdb in one automated pipeline are still limited.
- Cross-browser dashboard compatibility checks are mostly manual.
- Compose default uses one peer service while multi-peer behavior is tested mostly at script/unit level.
- External integration reliability (Stripe, Mapbox, email providers) is validated primarily via targeted/manual testing.

## 5. Recommended Next Additions

1. Add dashboard API route tests for critical BFF endpoints under `app/api/orbit/**`.
2. Add mobile tests for checkout success and error recovery paths.
3. Add an automated local-stack smoke script that verifies seeded login credentials and one protected endpoint.
4. Add concurrency-focused backend tests for inventory/order mutation race scenarios.
