# CodePop Development Tasks

## Purpose
This document is the execution-ready development backlog for the CodePop development phase. It consolidates all required implementation tasks and detailed steps.

## Task Index (Prioritized)

### MUST HAVE
- Task-001 Multi-store database schema
- Task-002 Supply hub network implementation
- Task-003 Automated inventory deduction
- Task-004 AI demand prediction service
- Task-005 Inventory permissions & audit logging
- Task-006 Logistics Manager dashboard
- Task-007 Decentralized sync & conflict resolution
- Task-008 Service discovery & peer handshake
- Task-009 Maintenance tracking & repair workflow
- Task-010 Inter-store PKI signature verification
- Task-011 Test data completion & seeder automation

### SHOULD HAVE
- Task-012 Redis caching for CSV data
- Task-013 Bulk drink fetch endpoint
- Task-014 Manager low-stock alerts
- Task-015 Response filtering for chatbot
- Task-016 Fault tolerance + immutable auditability
- Task-017 Repair schedule optimization constraints
- Task-018 Cross-browser + WCAG hardening

---

## Detailed Tasks and Steps

## Task-001 — Multi-Store Database Schema
**Priority:** MUST  
**Team:** Database  
**Estimate:** 1 week  
**Dependencies:** None

### Steps
1. Create migration for `stores` table.
2. Create migration for `supply_hubs` table.
3. Create migration for `stock_transfers` table.
4. Add `StoreID` foreign key to `inventory` table.
5. Add `StoreID` foreign key to `orders` table.
6. Create indexes on new foreign keys.
7. Seed all 7 supply hubs.
8. Seed 20 stores in Region C (Logan, UT).
9. Seed at least 5 stores in neighboring regions.
10. Run migrations in dev.
11. Verify data integrity and constraints.

### Done Criteria
- Schema and FKs are correct.
- Seed data present.
- No data loss/regression in existing tables.

---

## Task-002 — Supply Hub Network Implementation
**Priority:** MUST  
**Team:** Backend  
**Estimate:** 3 weeks  
**Dependencies:** Task-001

### Steps
1. Create `SupplyHub` model.
2. Create `StockTransfer` model.
3. Create `Store` model.
4. Implement `SupplyHubRepository`.
5. Implement `StockTransferRepository`.
6. Add repository unit tests.
7. Implement `SupplyHubService.findNearestHub(storeId)`.
8. Implement `SupplyHubService.requestSupply(itemName, quantity, storeId)`.
9. Implement delivery-time calculation logic.
10. Implement `SupplyCoordinator.autoReorder()`.
11. Implement `SupplyCoordinator.optimizeBatchOrders()`.
12. Integrate with `InventoryService`.
13. Create `GET /api/supply-hubs/`.
14. Create `GET /api/supply-hubs/<id>/inventory/`.
15. Create `POST/GET /api/stock-transfers/`.
16. Create `PATCH /api/stock-transfers/<id>/`.
17. Add API docs (Swagger/OpenAPI).
18. Run end-to-end tests.

### Done Criteria
- Regional + 1000-mile fallback hub selection works.
- Stock transfers are tracked end-to-end.
- APIs are documented and tested.

---

## Task-003 — Automated Inventory Deduction
**Priority:** MUST  
**Team:** Backend  
**Estimate:** 1 week  
**Dependencies:** Order completion flow

### Steps
1. Design `OrderCompletionService`.
2. Implement `extractIngredients()` for all drinks in an order.
3. Aggregate duplicate ingredient quantities.
4. Implement transaction-wrapped `fulfillOrder()`.
5. Add rollback for insufficient stock.
6. Integrate with `InventoryService.bulkDeduct()`.
7. Add order failure notifications.
8. Write unit tests with inventory mocks.
9. Write integration tests on real DB.
10. Validate race conditions using row-level locking (`select_for_update()`).

### Done Criteria
- Inventory deduction is atomic.
- Rollback works on any failure.
- Concurrency issues are handled.

---

## Task-004 — AI Demand Prediction Service
**Priority:** MUST  
**Team:** Backend (ML)  
**Estimate:** 2 weeks  
**Dependencies:** Historical data source

### Steps
1. Design `DemandPredictionService` interface.
2. Define CSV import schema.
3. Generate baseline historical dataset (6 months).
4. Implement feature engineering (date, store/item encoding, external factors).
5. Train `RandomForestRegressor`.
6. Evaluate with R², MAE, RMSE.
7. Tune hyperparameters (GridSearchCV).
8. Implement `predictDemand()`.
9. Implement `generateReorderRecommendations()`.
10. Create `GET /api/demand-predictions/<item_name>/`.
11. Create `GET /api/reorder-recommendations/<store_id>/`.
12. Integrate recommendations into `SupplyCoordinator.autoReorder()`.
13. Create CSV import endpoint for logistics managers.
14. Document model usage and operational limits.

### Done Criteria
- Prediction model meets minimum quality target.
- Predictions/recommendations available by API.
- CSV import and supply integration are working.

---

## Task-005 — Inventory Permissions & Audit Logging
**Priority:** MUST  
**Team:** Backend (Security)  
**Estimate:** 1 week  
**Dependencies:** Auth system

### Steps
1. Create `AuditLog` model.
2. Create `IsStoreManager` permission class.
3. Enforce auth on inventory endpoints.
4. Add audit logging in inventory update flows.
5. Add quantity validation limits.
6. Create read-only `GET /api/audit-logs/` endpoint.
7. Add unauthorized-access security tests.
8. Document security model and role behavior.

### Done Criteria
- Only authorized managers can mutate inventory.
- All changes are fully audited with before/after values.

---

## Task-006 — Logistics Manager Dashboard
**Priority:** MUST  
**Team:** Frontend  
**Estimate:** 2 weeks  
**Dependencies:** Task-002, Task-004 APIs

### Steps
1. Create `LogisticsDash.js` page.
2. Build hub inventory overview cards.
3. Add Mapbox map with 7 hub markers.
4. Display store locations and delivery routes.
5. Build stock transfer table/list.
6. Add filters (region, status, priority).
7. Add CSV import UI for demand data.
8. Add demand prediction charts.
9. Add reorder recommendation panel.
10. Add approve/reject transfer actions.
11. Add real-time updates (polling/WebSocket).
12. Add CSV export for reports.

### Done Criteria
- Logistics managers can view, filter, and act on regional supply data.
- Imports/exports and route views work correctly.

---

## Task-007 — Decentralized Sync & Conflict Resolution
**Priority:** MUST  
**Team:** Backend (Distributed Systems)  
**Estimate:** 2 weeks  
**Dependencies:** Task-001

### Steps
1. Define sync protocol for store↔store and store↔hub events.
2. Implement local offline event queue.
3. Implement reconnect replay worker.
4. Implement timestamp + priority conflict resolution.
5. Add idempotency keys for replay safety.
6. Add retry policy with exponential backoff.
7. Add integration tests for partitions/recovery.
8. Document reconciliation rules.

### Done Criteria
- Local operations continue during outages.
- Automatic and deterministic reconciliation occurs after reconnect.

---

## Task-008 — Service Discovery & Peer Handshake
**Priority:** MUST  
**Team:** Backend  
**Estimate:** 1 week  
**Dependencies:** Task-001

### Steps
1. Define node registration payload schema.
2. Implement discovery announce flow.
3. Implement handshake validation mechanism.
4. Persist peer directory and heartbeat timestamps.
5. Implement stale peer eviction.
6. Add tests for join/leave/rejoin behavior.
7. Document new-store onboarding flow.

### Done Criteria
- New nodes auto-discover peers and establish valid handshakes.
- Peer list remains current without manual updates.

---

## Task-009 — Maintenance Tracking & Repair Workflow
**Priority:** MUST  
**Team:** Backend + Frontend  
**Estimate:** 2 weeks  
**Dependencies:** Task-001

### Steps
1. Create machine and maintenance models.
2. Support required statuses (`normal`, `warning`, `repair-start`, `repair-end`, `error`, `out-of-order`, `schedule-service`).
3. Implement status transition logging (user + timestamp).
4. Build CSV import endpoint for repair schedules.
5. Build APIs for machine history retrieval.
6. Implement repair-staff filtered views for assigned stores.
7. Enforce role permissions across repair endpoints.
8. Add tests for transitions and authorization.
9. Seed maintenance schedules and machine histories.

### Done Criteria
- Repair workflows are complete and role-protected.
- Status histories are accurate and queryable.

---

## Task-010 — Inter-Store PKI Signature Verification
**Priority:** MUST  
**Team:** Backend (Security)  
**Estimate:** 1 week  
**Dependencies:** Task-007, Task-008

### Steps
1. Define signed message envelope format.
2. Implement signature verification middleware.
3. Implement sender identity validation against trusted keys.
4. Reject unsigned/invalid sync payloads.
5. Audit-log accepted and rejected sync messages.
6. Add tests for tamper/replay attacks.

### Done Criteria
- All inter-store updates are cryptographically validated.
- Invalid/tampered messages are rejected and logged.

---

## Task-011 — Test Data Completion & Seeder Automation
**Priority:** MUST  
**Team:** Database + Backend  
**Estimate:** 3 days  
**Dependencies:** Task-001, Task-009

### Steps
1. Extend seed scripts for hubs/stores requirements.
2. Seed one `logistics_manager` per hub.
3. Seed one `repair_staff` for Region C.
4. Seed supply inventories.
5. Seed maintenance schedules and machine histories.
6. Add validation command to verify counts and constraints.
7. Ensure idempotent seeding behavior.

### Done Criteria
- All required role/store/hub/test datasets are reproducible.
- Validation command passes in dev and CI.

---

## Task-012 — Redis Caching for CSV Data
**Priority:** SHOULD  
**Team:** Backend  
**Estimate:** 1 week  
**Dependencies:** Redis setup

### Steps
1. Add Redis service (Docker compose).
2. Install Redis client library.
3. Implement `CSVCacheManager`.
4. Update `ContentBasedFilter` to use cache.
5. Implement invalidation strategy.
6. Add startup cache warming.
7. Add hit/miss metrics and logging.
8. Run load tests and measure gain.
9. Document runtime configuration.

### Done Criteria
- Noticeable latency improvement and stable cache behavior.

---

## Task-013 — Bulk Drink Fetch Endpoint
**Priority:** SHOULD  
**Team:** Backend  
**Estimate:** 2 days  
**Dependencies:** None

### Steps
1. Implement `GET /api/drinks/bulk/` with pagination.
2. Add filtering params (category/search/user-created).
3. Optimize queries with related loading.
4. Add optional cache support.
5. Add API tests for paging/filter correctness.

### Done Criteria
- Endpoint is fast, paginated, and filter-correct.

---

## Task-014 — Manager Low-Stock Alerts
**Priority:** SHOULD  
**Team:** Backend + Frontend  
**Estimate:** 1 week  
**Dependencies:** Notification system

### Steps
1. Implement threshold evaluation job.
2. Create `GET /api/alerts/low-stock/`.
3. Add manager dashboard alert panel.
4. Add badge counts and alert state indicators.
5. Add acknowledge/snooze actions.
6. Persist alert states.
7. Add backend and UI tests.

### Done Criteria
- Managers get actionable low-stock alerts with state tracking.

---

## Task-015 — Response Filtering for Chatbot
**Priority:** SHOULD  
**Team:** Backend  
**Estimate:** 1 week  
**Dependencies:** Chatbot system

### Steps
1. Build output sanitization pipeline.
2. Add prompt-injection and unsafe pattern filters.
3. Enforce response length/time limits.
4. Add safe fallback responses.
5. Add test suite for malicious/unsafe outputs.
6. Document filtering and escalation behavior.

### Done Criteria
- Unsafe responses are blocked/replaced deterministically.

---

## Task-016 — Fault Tolerance + Immutable Auditability
**Priority:** SHOULD  
**Team:** Backend  
**Estimate:** 1 week  
**Dependencies:** Task-007

### Steps
1. Implement append-only transaction log for logistics/repair actions.
2. Add tamper-evidence fields (hash/checksum chain).
3. Add reconnect reconciliation worker observability.
4. Add metrics for replay backlog and sync lag.
5. Add fault-injection recovery tests.

### Done Criteria
- Audit logs are immutable and tamper-evident.
- Recovery behavior is observable and test-verified.

---

## Task-017 — Repair Schedule Optimization Constraints
**Priority:** SHOULD  
**Team:** Backend (ML/Optimization)  
**Estimate:** 1 week  
**Dependencies:** Task-009

### Steps
1. Define optimization input schema.
2. Implement travel-time minimization objective.
3. Enforce max warning-state runtime constraint.
4. Enforce max service interval constraints by machine type.
5. Expose optimization result endpoint.
6. Add deterministic fixture tests.

### Done Criteria
- Schedules satisfy constraints and improve travel efficiency.

---

## Task-018 — Cross-Browser + WCAG Hardening
**Priority:** SHOULD  
**Team:** Frontend  
**Estimate:** 1 week  
**Dependencies:** Core UI complete

### Steps
1. Build browser test matrix (Chrome, Firefox, Safari, Edge).
2. Execute compatibility pass on customer/admin/logistics flows.
3. Run WCAG checks (contrast, keyboard nav, labels/semantics).
4. Fix defects from accessibility/browser audit.
5. Publish compliance signoff checklist.

### Done Criteria
- Core flows pass target browser matrix.
- Baseline accessibility issues are resolved.

---

## Suggested Execution Order
1. Foundation: Task-001, Task-005
2. Distributed core: Task-002, Task-007, Task-008, Task-010
3. Domain workflows: Task-003, Task-004, Task-009, Task-011
4. UX and optimization: Task-006, Task-012, Task-013, Task-014, Task-015, Task-016, Task-017, Task-018

## Notes
- This backlog includes both core implementation and requirement-coverage hardening tasks.
- Could-have features are intentionally excluded from development-phase mandatory planning unless scope changes.
