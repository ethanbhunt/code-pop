# CodePop Test Design Report - Draft 1

## 1. Overview and Testing Philosophy

CodePop is a full-stack custom beverage ordering and management application consisting of three main components:

- **Backend API** (Django + Django REST Framework, PostgreSQL)
- **Mobile App** (React Native / Expo)
- **Admin Dashboard** (Next.js / TypeScript)

Our testing approach centers on **API-level integration tests** for the backend, where the bulk of our business logic resides. The backend handles user authentication, drink management, order processing, inventory control, payment integration, AI-powered recommendations, and a multi-location supply network. Because nearly every user-facing action flows through these API endpoints, thorough backend testing gives us the highest confidence-to-effort ratio.

Frontend testing is lighter: the mobile app has a Jest-based smoke test for bootstrap behavior, and the dashboard has Vitest configured but is still in early coverage. We compensate for thinner frontend unit tests with manual end-to-end walkthroughs described in Section 5.

---

## 2. Testing Approach by Component

### 2.1 Backend (Django) - Primary Test Suite

**Framework:** Django `TestCase` and DRF `APITestCase`
**Location:** `codepop_backend/backend/tests.py` and three supplementary modules

We organized backend tests around the major domain areas of the application:

| Test Class | File | Tests | What It Covers |
|---|---|---|---|
| `PreferenceTests` | `tests.py` | 6 | CRUD for user flavor preferences, validation of invalid preference values |
| `DrinkTests` | `tests.py` | 9 | Drink CRUD, user favorites, Ice/Size validation, unauthenticated access |
| `InventoryTests` | `tests.py` | 7 | Stock deduction, out-of-stock handling, low-stock warnings, non-existent items |
| `NotificationTests` | `tests.py` | 9 | Notification CRUD, time-range filtering, user isolation, auth enforcement |
| `OrderTests` | `tests.py` | 8 | Order creation, retrieval by user, deletion, adding/removing drinks from orders |
| `RevenueTests` | `tests.py` | 5 | Revenue record creation, update after drink deletion, zero-amount edge case |
| `AITests` | `tests.py` | 3+ | AI drink generation, recommendation accuracy |
| `InventoryAuditSecurityTests` | `test_inventory_audit.py` | 4 | Role-based access: customers blocked from inventory mutation and audit log access; managers can mutate and read audit trails |
| `OrderFulfillmentTests` | `test_order_fulfillment.py` | 3 | End-to-end fulfillment flow: inventory deduction on fulfillment, rollback on insufficient stock, auth required |
| `SupplyHubServiceTests` | `test_supply_network.py` | 2 | Nearest-hub geolocation lookup, supply request creates transfer and deducts hub inventory |
| `SupplyHubApiTests` | `test_supply_network.py` | 4 | REST API for supply hubs, hub inventory retrieval, stock transfer creation and status updates |

**Total: ~60 test methods across 4 files.**

#### Key patterns in our backend tests

- **Authentication is tested throughout.** Almost every test class includes a helper `authenticate()` method and tests for both authenticated and unauthenticated access. Notification creation without auth returns 401; drink creation is intentionally open (returns 201).
- **Role-based access control.** The `InventoryAuditSecurityTests` class specifically validates that customers (non-staff) cannot modify inventory or view audit logs, while managers (staff) can.
- **Edge cases and error paths.** We test out-of-stock deductions, insufficient stock, non-existent items, invalid preference values (e.g., "Mountain Dew" vs. the canonical "Mtn. Dew"), and invalid Ice/Size enum values.
- **Transactional integrity.** `OrderFulfillmentTests.test_fulfill_rolls_back_on_insufficient_stock` verifies that when one ingredient is missing, no partial deduction occurs across any inventory items. This was one of the more important tests to get right because a bug here would silently drain inventory.

### 2.2 Mobile App (React Native)

**Framework:** Jest with `jest-expo` preset
**Location:** `codepop/__tests__/App.test.js`

The mobile test suite currently has a single test class (`App bootstrap`) that verifies:

- AsyncStorage is initialized with an empty checkout cart when no prior data exists

All page components and navigation dependencies are mocked out, isolating the bootstrap logic. This is a smoke test, not comprehensive coverage of the mobile UI.

### 2.3 Admin Dashboard (Next.js)

**Framework:** Vitest with jsdom environment
**Location:** `dashboard/test/setup.ts`

The dashboard test infrastructure is in place (Vitest configured, setup file imports `@testing-library/jest-dom`) but does not yet contain test files. Dashboard functionality is validated through manual end-to-end testing described in Section 5.

---

## 3. Especially Challenging Areas to Test

### 3.1 AI Recommendation Engine (`drinkAI.py`, `customerAI.py`)

The AI module uses scikit-learn cosine similarity and HuggingFace transformers to generate drink recommendations and power a customer service chatbot. Testing AI outputs is inherently non-deterministic. Our approach:

- Validate that the generation endpoint returns a well-formed drink object
- Check that recommendations align with user preferences at a basic level
- We do **not** assert exact drink names or ingredient lists, since the model output varies

**Concern:** The chatbot (`customerAI.py`) is the least-tested AI component. Its responses depend on a language model and are difficult to assert against.

### 3.2 Stripe Payment Integration

Payment processing involves the Stripe API (`create-payment-intent` endpoint). We have not written automated tests that hit Stripe's test mode API because:

- It requires network access and API keys in CI
- The Stripe SDK is well-tested upstream

Instead, we validate payment flows through manual end-to-end testing with Stripe test cards.

### 3.3 Order Fulfillment with Inventory Rollback

The fulfillment flow touches multiple models (Order, Inventory, Notification) in a single transaction. The rollback test (`test_fulfill_rolls_back_on_insufficient_stock`) was challenging because we needed to confirm that no partial inventory deductions occurred when one ingredient was unavailable. Getting the atomic transaction boundaries correct required careful testing.

### 3.4 Supply Network Geolocation

The `SupplyHubService.findNearestHub()` uses latitude/longitude calculations to route supply requests. Testing this required setting up hubs at known coordinates and asserting the correct hub was selected. The math is straightforward but the test data setup (multiple hubs at different distances) required care.

### 3.5 Frontend Component Testing

React Native components with deep navigation stacks, AsyncStorage, and native modules (maps, payments, location) require extensive mocking. We found that the cost of mocking every native dependency was high relative to the confidence gained, so we opted for manual testing of the mobile UI.

---

## 4. Code Coverage Estimate

| Component | Estimated Coverage | Method |
|---|---|---|
| Backend API (Django) | ~65-75% | Estimate based on endpoints and models tested vs. total |
| Mobile App (React Native) | ~5% | Single bootstrap test; most pages untested by automation |
| Admin Dashboard (Next.js) | ~0% | No automated tests yet; infrastructure only |

**Backend breakdown:**

- **Models with good coverage:** Preference, Drink, Inventory, Notification, Order, Revenue, SupplyHub, Store, StockTransfer, AuditLog
- **Views with good coverage:** All CRUD endpoints for the above models, fulfillment endpoint, supply hub endpoints
- **Lower coverage areas:** AI endpoints (partial), Stripe payment intent creation, email notification sending, user management (edit/delete)

We plan to run `coverage.py` with `python manage.py test` to get an exact figure for the final draft.

---

## 5. System-Level (End-to-End) Test Plan

These are manual tests that verify the full user journey across frontend and backend. Each test describes steps to reproduce and expected outcomes.

### Test 1: New User Registration and First Order

**Steps:**
1. Open the CodePop mobile app
2. Tap "Create Account"
3. Enter username, email, and password
4. Confirm account creation succeeds (redirected to home page)
5. Browse the drink menu on the General Home Page
6. Select a drink (e.g., "Cola Vanilla")
7. Customize Ice (Light) and Size (32oz)
8. Add to cart
9. Navigate to Cart Page and verify the drink appears with correct details
10. Proceed to Checkout
11. Enter Stripe test card number (`4242 4242 4242 4242`)
12. Complete payment
13. Verify order confirmation screen appears
14. Check that the order appears in the user's order history

**Expected outcome:** User can register, browse, customize, order, and pay without errors. Order appears in history with status "processing."

### Test 2: Manager Fulfills an Order

**Steps:**
1. Log in as a manager (staff) user
2. Navigate to the Admin Dashboard
3. View pending orders
4. Select a pending order and click "Fulfill"
5. Verify the order status changes to "completed"
6. Check inventory levels for the drink's ingredients (sodas, syrups, add-ins)
7. Verify inventory quantities decreased by 1 each
8. Verify an audit log entry was created for the inventory changes

**Expected outcome:** Order status updates, inventory decrements correctly, and audit trail is recorded.

### Test 3: Inventory Low-Stock Alert

**Steps:**
1. Log in as a manager
2. Set an inventory item's quantity to just above its threshold level (e.g., Coke at 3, threshold 2)
3. Fulfill an order that uses that item
4. Check for a low-stock warning notification

**Expected outcome:** System generates a warning when stock drops to or below the threshold level.

### Test 4: Supply Network Restocking

**Steps:**
1. Log in as an authenticated user
2. View available supply hubs (`/backend/supply-hubs/`)
3. Create a stock transfer request for a specific item to a store
4. Verify the transfer is created with "pending" status
5. Update the transfer status to "approved"
6. Verify hub inventory was deducted by the requested quantity

**Expected outcome:** Stock transfers flow correctly from hub to store with proper inventory accounting.

### Test 5: AI Drink Recommendation

**Steps:**
1. Log in as a user with saved flavor preferences (e.g., "mango", "vanilla")
2. Navigate to the drink generation feature
3. Request an AI-generated drink recommendation
4. Verify the returned drink contains ingredients that align with the user's preferences
5. Verify the drink object has all required fields (Name, SodaUsed, SyrupsUsed, Price, etc.)

**Expected outcome:** AI returns a valid drink object with ingredients relevant to user preferences.

### Test 6: Role-Based Access Control

**Steps:**
1. Log in as a regular customer
2. Attempt to access the inventory management endpoint (`PATCH /backend/inventory/{id}/`)
3. Verify a 403 Forbidden response
4. Attempt to access audit logs (`GET /backend/audit-logs/`)
5. Verify a 403 Forbidden response
6. Log in as a manager (staff) user
7. Repeat the same requests
8. Verify 200 OK responses

**Expected outcome:** Customers are blocked from staff-only actions; managers have full access.

### Test 7: Dashboard Analytics View

**Steps:**
1. Log in to the Next.js admin dashboard
2. Verify the dashboard loads and displays revenue data
3. Check that the orders list shows recent orders with correct statuses
4. Verify inventory overview shows current stock levels
5. Check notification panel displays relevant alerts

**Expected outcome:** Dashboard renders all analytics components with data from the backend API.

---

## 6. What We Are Still Worried About

- **Payment edge cases:** Stripe webhook handling for failed payments, refunds, and network timeouts is not tested automatically. A payment failure mid-checkout could leave an order in an inconsistent state.
- **AI model reliability:** The recommendation engine's output quality depends on the training data (CSV files of syrups, sodas, add-ins). If the CSV data changes, recommendations could degrade silently.
- **Concurrent order fulfillment:** We have not tested what happens when two managers attempt to fulfill the same order simultaneously, or when fulfillment and a supply transfer race on the same inventory item.
- **Mobile app on real devices:** Our React Native testing is minimal. Navigation bugs, platform-specific rendering issues (iOS vs. Android), and native module compatibility could surface in production that we'd miss in Jest.
- **Dashboard authentication:** The dashboard uses `next-auth` (v5 beta), and we have no automated tests for the auth flow. If the beta introduces breaking changes, we'd only catch it manually.

---

## 7. Problems Uncovered by Testing

*(To be completed in the final draft after the testing sprint. This section will document bugs found, fixes applied, and lessons learned.)*

---

## 8. Next Steps for Final Draft

- [ ] Run `coverage.py` and report exact backend code coverage percentage
- [ ] Add screenshots for each end-to-end test
- [ ] Document bugs found and fixed during the testing sprint
- [ ] Expand frontend test coverage if time permits
- [ ] Add dashboard component tests using Vitest
- [ ] Document any new tests written during the testing sprint
