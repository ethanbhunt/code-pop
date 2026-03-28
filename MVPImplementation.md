# CodePop MVP Implementation (March 2026)

## Scope Completed In This Increment
This increment begins implementation from `DevelopmentTasks.md` with a practical MVP slice from the critical path:

1. Task-001 (partial): Multi-store database schema foundation.
2. Task-002 (partial): Supply hub network MVP APIs and service logic.
3. Test harness bootstrapping for all major project parts:
   - Django backend
   - Next.js dashboard
   - Expo mobile app

## What Was Implemented

### 1) Backend data model expansion (Django)
Implemented in backend model layer:

- `Store` model
  - Basic region/location metadata for multi-store support.
- `SupplyHub` model
  - Regional hub metadata + max delivery radius.
- `StockTransfer` model
  - Track hub-to-store transfer requests and statuses.
- `Inventory` model updates
  - Added optional `StoreID` FK.
  - Added optional `HubID` FK so hub inventory can be queried directly.
- `Order` model updates
  - Added optional `StoreID` FK.
- Compatibility fixes
  - Added `max_length` and safe defaults for `Drink.Size`, `Drink.Ice`, and `Order.StripeID` fields.

### 2) Backend service logic
Implemented `SupplyHubService` in `backend/supply_services.py`:

- `findNearestHub(store_id, item_name, item_type, quantity)`
  - Uses geospatial approximation (Haversine miles).
  - Filters for active hubs with sufficient inventory.
  - Applies per-hub radius rule with nearest fallback.
- `requestSupply(item_name, quantity, store_id, item_type)`
  - Transactional flow with row locking (`select_for_update`).
  - Deducts hub inventory.
  - Creates a pending `StockTransfer` record.

### 3) Backend API endpoints
Added endpoint support in existing DRF view/URL architecture:

- `GET /backend/supply-hubs/`
- `GET /backend/supply-hubs/<id>/`
- `GET /backend/supply-hubs/<id>/inventory/`
- `GET /backend/stock-transfers/`
- `POST /backend/stock-transfers/`
- `GET/PUT/PATCH/DELETE /backend/stock-transfers/<id>/`

Behavior notes:
- Endpoints use token auth (`IsAuthenticated`).
- `POST /backend/stock-transfers/` uses `SupplyHubService.requestSupply` and returns clear validation errors.

### 4) Data seeding updates
Updated `populate_db` command to start MVP seed support:

- Seeds two supply hubs.
- Seeds two stores.
- Associates seeded inventory rows to a hub.
- Corrected physical inventory item type to match model choices.

### 5) Django migration
Added initial migration file:

- `backend/migrations/0001_initial.py`

This introduces existing schema + new supply network models in versioned form for reproducibility.

### 6) Dashboard test baseline
Added unit-test tooling and first auth-path test:

- Added scripts in `dashboard/package.json`:
  - `test`
  - `test:watch`
  - `test:e2e`
- Added Vitest config + setup.
- Added login-page test:
  - Invalid credentials shows error.
  - Successful credentials triggers redirect navigation.

### 7) Mobile test baseline
Added Jest test tooling and first bootstrapping test:

- Added `test` script in `codepop/package.json`.
- Added Jest config/setup for Expo.
- Added `App` bootstrap test:
  - Verifies cart storage (`checkoutList`) initialization when absent.

## Tests Added In This Increment

### Backend tests
File: `codepop_backend/backend/test_supply_network.py`

- `SupplyHubServiceTests`
  - `test_find_nearest_hub`
  - `test_request_supply_creates_transfer_and_deducts_inventory`
- `SupplyHubApiTests`
  - `test_list_supply_hubs`
  - `test_get_supply_hub_inventory`
  - `test_create_stock_transfer`
  - `test_update_stock_transfer_status`

### Dashboard tests
File: `dashboard/app/login/page.test.tsx`

- `shows error when sign-in fails`
- `navigates to callback url when sign-in succeeds`

### Mobile tests
File: `codepop/__tests__/App.test.js`

- `initializes checkout cart storage when missing`

## Human Developer Steps Required

### A) Backend setup and migration
1. Create/activate Python environment from project root.
2. Install dependencies:
   - `python -m pip install -r requirements.txt`
3. Ensure PostgreSQL is running and database exists (`codepop_database`).
4. Run migrations from `codepop_backend`:
   - `python manage.py migrate`
5. (Optional) Seed test data:
   - `python manage.py populate_db`

### B) Backend tests
From `codepop_backend`:
- `python manage.py test backend.test_supply_network`
- Full suite (optional): `python manage.py test`

### C) Dashboard tests
From `dashboard`:
1. `npm install`
2. `npm run test`

### D) Mobile tests
From `codepop`:
1. `npm install`
2. `npm run test`

## Known Constraints In Current Environment
- Node/npm availability may be missing in current shell on this machine.
- Backend test execution requires Django dependencies in the selected Python env.

If either prerequisite is missing, install dependencies first, then run commands above.

## Suggested Next MVP Steps
1. Implement `Task-001` seed targets fully (all 7 hubs, 20+ stores) via deterministic fixtures/management command.
2. Add permissions and audit logging for stock transfer mutations (align with Task-005).
3. Add integration test validating full flow:
   - transfer request -> inventory deduction -> status progression.
4. Add dashboard Logistics page consuming `/backend/supply-hubs/` and `/backend/stock-transfers/`.
5. Add mobile manager-facing low-stock/transfer visibility once manager UI path is finalized.
