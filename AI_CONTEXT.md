# CodePop — AI Context Reference

> Consolidated summary of the Requirements Document, High-Level Design, and Low-Level Design for use as persistent AI context when working on this project.

---

## 1. What Is CodePop?

CodePop is an AI-powered, multi-store dirty-soda ordering platform. Customers build custom soda drinks (base soda + syrups + add-ins), pay in-app via Stripe, and pick up from automated (robotic) store locations. The business model emphasises **minimal human intervention** — stores run autonomously with AI-driven inventory management, ordering, logistics, and maintenance.

---

## 2. Architecture & Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | **React Native** (mobile-first web app) | Portrait-optimised, responsive; also serves desktop admin views |
| Backend | **Django** (Python) + Django REST Framework | Built-in auth, ORM, CSRF, admin |
| Database | **PostgreSQL** | Relational, ACID, JSONB support; accessed via Django ORM |
| AI/ML | **Scikit-Learn** | Content-based filtering (personal recs), item-based collaborative filtering (random/popular recs), demand forecasting |
| AI Chat | **Claude (Anthropic API)** | Complaint handling, drink recommendations; 10 s timeout, fallback to canned responses |
| Payments | **Stripe** | Tokenised; no raw card data stored; webhooks for confirmation |
| Maps/Geo | **Mapbox** | Store locator, proximity-based pickup, routing |
| Notifications | **Firebase Cloud Messaging (FCM)** | Push notifications (order ready, promos) |
| Email | **Django Email (SMTP)** | Account verification, password reset |
| Containerisation | **Docker / Docker Compose** | Local dev; Kubernetes optional for prod |

### Architecture Pattern

- **Client-server, three-tier** (Frontend → Django Backend → PostgreSQL).
- **Decentralised multi-store**: no single central server. Each store keeps its own local data, communicates peer-to-peer within its region, and syncs with regional supply hubs.
- **Fault tolerance**: stores operate autonomously during connectivity loss; data syncs automatically on reconnect using timestamp/priority-based conflict resolution.
- **Service discovery**: new stores broadcast presence and handshake with regional peers on deployment.

---

## 3. User Roles & Permissions

| Role | Scope | Key Capabilities |
|------|-------|-----------------|
| `general_user` | Single session | Order drinks without an account; data not persisted |
| `account_user` | Own data, any store | Preferences, order history, favourites, ratings, AI recs, saved payments, location-based pickup |
| `manager` | Own store(s) | Inventory grid, revenue reports, cooler status, order tracking, low-stock notifications |
| `admin` | Own store | User account CRUD, lock/unlock accounts, create manager accounts, grant permissions |
| `super_admin` | All stores | System-wide reports, all-store data access, role management, can view any page |
| `logistics_manager` | Assigned region | Supply hub management, hub-to-store routing, CSV import for demand forecasting, AI supply predictions |
| `repair_staff` | Assigned stores | Machine status tracking, CSV import of repair schedules, optimised repair routing, maintenance history |

---

## 4. Core Modules

### 4.1 User Management
- Registration, login (Django auth), email verification, profile CRUD.
- `UserService`, `AuthenticationService`, `UserRepository`, `PreferenceService`, `GuestService`.

### 4.2 Soda Catalog & Inventory
- Product listing, custom drink builder (base soda + syrups + add-ins), pricing.
- Inventory tracking per store with configurable low-stock thresholds, automated alerts.
- Supply hub coordination for restocking.
- `CatalogService`, `ProductRepository`, `DrinkBuilder`, `CustomizationService`, `InventoryService`, `StockAlertService`.

### 4.3 Order Management
- Full order lifecycle: create → payment → preparation → ready → pickup.
- **Order status state machine**: `PENDING` → (`CONFIRMED` | `CANCELLED`) → `IN_PROGRESS` → `READY_FOR_PICKUP` → `COMPLETED` or `CANCELLED`.
- QR code generation for cooler/fridge access; codes expire after single use or timeout.
- Pickup tracking with stale-order disposal.
- Key classes: `OrderService` (orchestrator), `OrderRepository` (persistence), `OrderItem` (line items), `OrderStatusManager` (state machine), `QRCodeService` (code generation/validation).

### 4.4 Payment (Stripe)
- Stripe payment intents: create → confirm → webhook notification.
- `PaymentService` initiates and tracks; `StripeIntegration` handles API calls and webhook verification.
- Local `PaymentRepository` stores transaction records (no card data—only Stripe token IDs).
- Refund support: reverse transaction + optionally trigger order cancellation.
- Webhook-driven: success/failure updates order status asynchronously.

### 4.5 AI Recommendation & Chatbot
- **Content-based filtering** → personalised recs per user (works with cold-start).
- **Item-based collaborative filtering** (optional) → popular/trending recs.
- `RecommendationService` calls `ContentBasedFilter` and/or sklearn models.
- **AI Chatbot** → Claude API for complaint handling and drink recommendations; 10s timeout, fallback to canned responses.
- AI services depend on `PreferenceService` for user drink history and preferences.

### 4.6 Supply & Logistics
- 7 regional supply hubs: Chicago (A), NJ/NY (B), Logan UT (C), Dallas (D), Atlanta (E), Phoenix (F), Boise (G).
- Hubs deliver within assigned region + cross-region up to 1000 miles.
- AI demand prediction from CSV historical data; actionable reorder recommendations.
- Logistics Manager dashboard: regional supply levels, hub-to-store routing, AI forecasts.

### 4.7 Machine Maintenance
- Machine states: `normal`, `warning`, `repair-start`, `repair-end`, `error`, `out-of-order`, `schedule-service`.
- State transitions logged with timestamp + responsible personnel.
- Repair schedule optimisation: minimise technician travel, respect max service intervals, prevent warning-state machines from exceeding safe thresholds.
- CSV import of repair schedules.

---

## 4.8 Subsystem Architecture & Service Layer Detail

### User Management Subsystem
- **Services**: `UserService` (CRUD + profile), `AuthenticationService` (login/logout, token/session), `PreferenceService` (drink preferences), `GuestService` (unauthenticated sessions).
- **Repositories**: `UserRepository` (user persistence, password hashing via Django auth), `PreferenceRepository` (preference storage, linked to user).
- **Key flow**: Registration → email verification → auto-login; login → validate credentials → create session/token. Guest sessions support upgrade to registered user with cart merge.
- **Design choice**: Django built-in User model (with AbstractUser extension for `role`, `phone_number`); session-based auth (DB-backed sessions) for web, optional JWT for mobile.

### Order Management Subsystem
- **Services**: `OrderService` (create, update status, cancel, history); `OrderStatusManager` (enforce state machine); `QRCodeService` (generate and validate codes).
- **Repositories**: `OrderRepository` (order + items persistence), `QRCodeRepository` (implicit: QR code ↔ order_id mapping).
- **Key flow**: User submits cart → `OrderService.createOrder()` creates PENDING order → `PaymentService.processPayment()` triggered → on success, `OrderStatusManager` transitions to CONFIRMED → later to IN_PROGRESS, READY_FOR_PICKUP, COMPLETED.
- **State machine**: PENDING → (CONFIRMED | CANCELLED); CONFIRMED → (IN_PROGRESS | CANCELLED); IN_PROGRESS → READY_FOR_PICKUP; READY_FOR_PICKUP → COMPLETED. Each transition is validated by `OrderStatusManager.canTransition()`.
- **QR codes**: Generated on order ready; bound to order_id; expire after single use or timeout (24 hours default).

### Payment Subsystem
- **Services**: `PaymentService` (orchestrate payments, refunds); `StripeIntegration` (API calls, webhook verification).
- **Repositories**: `PaymentRepository` (payment transaction records with Stripe payment_intent_id).
- **Key flow**: `OrderService` calls `PaymentService.processPayment()` → `StripeIntegration.createPaymentIntent()` → client-side confirmation (via Stripe SDK) → `handleWebhook()` updates `PaymentRepository` → success triggers `OrderService` to confirm order; failure triggers rollback.
- **Webhook handling**: Stripe sends payment_intent.succeeded/failed events; `StripeIntegration.handleWebhook()` verifies HMAC signature, parses event, updates payment status, and may trigger order state change.

### AI Recommendation Subsystem
- **Component**: `RecommendationService` (entry point), `ContentBasedFilter` (personalised drink combos), `AIChatbotService` (Claude API wrapper).
- **Inputs**: User preferences (from `PreferenceService`), order history, drink catalog.
- **Outputs**: Recommended drink(s) for user; chatbot responses for complaints/inquiries.
- **Claude integration**: 10-second timeout; fallback to pre-canned responses if API fails.

---

## 5. API Endpoints (Key Routes)

### Authentication
- `POST /api/auth/register` — Create user, auto-login, return session/token + user profile.
- `POST /api/auth/login` — Validate credentials, return session/token + user profile.
- `POST /api/auth/logout` — Invalidate session/token.

### Users & Profiles
- `GET /api/users/me`, `PATCH /api/users/me` — Current user profile.
- `GET /api/users/:id`, `PATCH /api/users/:id` — User profile (admin/owner only).
- `GET /api/preferences/`, `POST /api/preferences/`, `DELETE /api/preferences/:id` — Preferences CRUD.

### Guest Sessions
- `POST /api/guest/session` — Create guest session ID.
- `GET /api/guest/session` — Retrieve guest session state.

### Orders
- `POST /api/orders` — Create order from cart (calls `OrderService.createOrder`).
- `GET /api/orders` — List user's orders (paginated).
- `GET /api/orders/:id` — Fetch order details.
- `PATCH /api/orders/:id` — Update order (e.g., cancel).
- `GET /api/orders/:id/qr` — Generate or fetch QR code for pickup.

### Payments
- `POST /api/payments/:orderId` — Initiate payment (create Stripe intent).
- `GET /api/payments/:orderId` — Check payment status.
- `POST /api/payments/:paymentId/refund` — Issue refund.

### Recommendations
- `GET /api/recommendations` — Get personalised drink recommendations.
- `POST /api/chatbot` — Chat with AI (complaint, question, or recommendation request).



## 5. Database Schema (Key Tables)

| Table | Purpose | Key Columns | Constraints |
|-------|---------|-------------|-------------|
| `users` | Extends Django auth_user | `id` (PK), `email` (unique), `username` (unique), `password_hash`, `role`, `phone_number`, `created_at`, `updated_at` | NOT NULL on email, role; role ∈ {general_user, account_user, manager, admin, super_admin, logistics_manager, repair_staff} |
| `preferences` | User drink preferences (1NF — one per row) | `id` (PK), `user_id` (FK), `preference_type`, `preference_value`, `created_at` | FK to users; preference_type ∈ {favorite_soda, favorite_syrup, favorite_addin} |
| `orders` | Order records | `id` (PK), `user_id` (FK, nullable for guests), `guest_session_id` (FK, nullable), `status`, `payment_status`, `total_amount`, `pickup_time`, `created_at`, `updated_at` | status ∈ {pending, confirmed, in_progress, ready_for_pickup, completed, cancelled}; payment_status ∈ {pending, succeeded, failed, refunded} |
| `order_items` | Items in an order | `id` (PK), `order_id` (FK), `drink_id` (FK), `quantity`, `customization_json`, `price`, `created_at` | quantity > 0; order_id cannot be null |
| `drinks` | Drink definitions | `id` (PK), `name`, `base_soda`, `size`, `ice_level`, `syrups_json`, `add_ins_json`, `price`, `rating_avg`, `rating_count`, `is_user_created`, `created_at`, `updated_at` | price > 0; is_user_created boolean; syrups/add_ins stored as JSON arrays |
| `inventory` | Per-store stock levels | `id` (PK), `store_id` (FK), `item_name`, `item_type`, `quantity`, `threshold_level`, `unit_cost`, `updated_at` | quantity, threshold_level >= 0; item_type ∈ {base_soda, syrup, addin, cup, ice} |
| `drink_ingredients` | Junction: drinks ↔ inventory | `drink_id` (FK), `ingredient_id` (FK), `quantity` | Composite PK (drink_id, ingredient_id); quantity > 0 |
| `payments` | Stripe transactions | `id` (PK), `order_id` (FK, unique), `stripe_payment_intent_id`, `amount`, `status`, `refund_status`, `refund_amount`, `created_at`, `updated_at` | status ∈ {pending, succeeded, failed}; refund_status ∈ {none, partial, full}; amount > 0 |
| `qr_codes` | Pickup QR codes | `id` (PK), `order_id` (FK, unique), `code_data` (unique), `is_used`, `created_at`, `expiration_time` | order_id cannot be null; each order has exactly one QR code; expiration enforced at application layer |
| `order_status_history` | Audit trail of order status changes | `id` (PK), `order_id` (FK), `old_status`, `new_status`, `reason`, `changed_by`, `changed_at` (timestamp) | Immutable; created_at auto-set to now(); used for auditing and troubleshooting |
| `qr_code_validations` | Audit trail of QR code use | `id` (PK), `qr_code_id` (FK), `validated_at`, `validated_by` | Immutable; tracks every QR code scan for security/analytics |
| `notifications` | User notifications (opt-in) | `user_id` (FK), `message`, `type`, `is_read`, `qr_code_id` (FK, nullable), `created_at` | type ∈ {order_ready, promo, alert}; optional qr_code_id links order-related notifications |
| `revenue` | Store financial data | `id` (PK), `store_id` (FK), `total_amount`, `date`, `period_type`, `manager_id` (FK), `created_at` | period_type ∈ {daily, weekly, monthly}; aggregate of completed orders per store |

**Key relationships & constraints**:
- **User → Orders** (1:N): user_id FK, NOT NULL for authenticated; guests use guest_session_id + nullable user_id.
- **User → Preferences** (1:N): user_id FK, NOT NULL.
- **Order → OrderItems** (1:N): order_id FK, NOT NULL; items immutable after order confirmation.
- **Order → Payment** (1:1): order_id FK, unique (one payment per order).
- **Order → QRCode** (1:1): order_id FK, unique (one QR per order).
- **Order → OrderStatusHistory** (1:N): audit trail, immutable.
- **QRCode → QRCodeValidations** (1:N): audit trail of scans.
- **Drink ↔ Inventory** (N:M via drink_ingredients): tracks which items are needed per drink.
- **User → Notifications** (1:N): optional, for order/promo alerts.

**Indexes**:
- (user_id, created_at) on orders (list user's orders, chronological).
- (status) on orders (fulfillment queue queries).
- (order_id) on order_items (fetch items for order).
- (store_id, updated_at) on inventory (stock level queries per store).
- (user_id) on preferences (fetch user preferences for AI).
- order_id on payments (payment lookup by order).
- order_id on qr_codes (QR lookup by order).

**Data access conventions**:
- No raw SQL; use Django ORM with `select_related` (1:1, FK) and `prefetch_related` (1:N) to avoid N+1 queries.
- Transactions (`transaction.atomic()`) wrap order creation + payment + status update.
- Soft deletes (add `is_deleted`, `deleted_at`) for users, orders, preferences where audit trail matters.
- Redis cache for menu/catalog (low churn, read-heavy) and session data (high volume).



---

## 6. Dashboards

| Dashboard | Audience | Key Features |
|-----------|----------|-------------|
| Manager | `manager` | Inventory grid, cooler status, order tracking, revenue stats, pickup wait times |
| Admin | `admin` | User account management (CRUD, lock/unlock), store metrics |
| Super Admin | `super_admin` | System-wide reports, multi-store analytics, access any page |
| Logistics Manager | `logistics_manager` | Regional supply levels, hub-to-store routing, AI demand forecasts, CSV import/export |
| Repair Staff | `repair_staff` | Machine status by store, repair calendar, travel-optimised task list, maintenance history |

---

## 7. Key Design Patterns & Service Architecture

### Service Layer Pattern
- Each subsystem (User, Order, Payment, Catalog, AI) has a **Service** class as the business logic entry point.
- Services delegate persistence to **Repository** classes (single responsibility: data access only).
- Services orchestrate between repositories and external integrations.
- **Example**: `OrderService` uses `OrderRepository`, `PaymentService`, `NotificationService`, `InventoryService`, `OrderStatusManager`, `QRCodeService`.

### Repository Pattern
- One repository per logical entity (User, Order, Payment, Drink, Inventory, Preference).
- Repositories abstract Django ORM; queries stay in one place.
- All persistence goes through repositories (no raw SQL in views/controllers).
- Methods: `save()`, `findById()`, `findBy*()`, `delete()`.

### State Machine Pattern (Order Status)
- `OrderStatusManager` enforces valid transitions.
- Prevents invalid state changes (e.g., cannot cancel a completed order).
- Transition rules: PENDING → (CONFIRMED | CANCELLED), CONFIRMED → (IN_PROGRESS | CANCELLED), IN_PROGRESS → READY_FOR_PICKUP, READY_FOR_PICKUP → COMPLETED.
- Status history table (`order_status_history`) tracks all transitions immutably for audit.

### Event-Driven Async (Webhooks)
- Stripe webhooks trigger `StripeIntegration.handleWebhook()` asynchronously.
- Webhook handler verifies HMAC signature, updates `PaymentRepository`, and may trigger `OrderService.updateOrderStatus()`.
- Prevents race conditions: payment success confirmed and persisted before order confirmation.

### Repository & Service Interfaces (for testability)
- Services depend on repository **interfaces**, not concrete classes.
- Tests inject mock repositories.
- Example: `OrderService(repository: IOrderRepository, paymentService: IPaymentService, ...)` allows mocking in unit tests.

### Transaction Management
- Order creation, payment, and status update are wrapped in `transaction.atomic()`.
- Ensures all-or-nothing semantics: if any step fails, entire order is rolled back.

---

## 8. External Integrations Summary

| Service | Type | Auth | Criticality |
|---------|------|------|-------------|
| Stripe | REST API + Webhooks | API keys + HMAC webhook signatures | Critical |
| Mapbox | REST API + Client SDK | Bearer tokens (public + secret) | High |
| FCM | REST API / Admin SDK | OAuth 2.0 service account | High |
| Claude | REST API | API key (`x-api-key`) | Medium |
| Scikit-Learn | In-process Python lib | None | Medium |
| Django Email | SMTP over TLS | Provider credentials | High |
| PostgreSQL | Native wire protocol | Username/password | Critical |

---

## 9. Security & Compliance

- **Encryption in transit**: TLS 1.3 for all API calls; HTTPS enforced.
- **Encryption at rest**: AES-256 for sensitive fields (email, geolocation); Argon2 password hashing.
- **Payment security**: PCI-DSS via Stripe (no raw card data stored).
- **Geolocation**: encrypted, deleted 24 hours post-order, requires explicit opt-in.
- **Inter-store comms**: digitally signed; PKI-verified sender identity.
- **Audit logging**: immutable transaction logs at each node; timestamped + cryptographically signed actions for `logistics_manager` and `repair_staff`.
- **GDPR/CCPA**: right to erasure, data portability, consent management.
- **Application security**: Django CSRF middleware, ORM parameterisation (SQL injection prevention), React XSS protection, rate limiting.

---

## 10. Non-Functional Requirements

| Requirement | Priority | Notes |
|-------------|----------|-------|
| Decentralised (no central server) | Must | Peer-to-peer within regions |
| Data consistency across stores | Must | Timestamp/priority-based conflict resolution |
| Fault tolerance | Should | Local ops continue during outage; sync on reconnect |
| Service discovery | Must | Auto-broadcast + handshake for new stores |
| Responsive design | Must | Mobile-first; works on desktop/tablet |
| Cross-browser (Chrome, Firefox, Safari, Edge) | Should | Modern versions |
| Scalability (multi-store nationwide) | Must | No architectural redesign for expansion |
| Accessibility (WCAG 2.1 Level AA target) | Should | Screen reader, keyboard nav, colour contrast |
| Clear error messages | Must | Concise, actionable |
| Reporting (inventory, financial) | Should | Auto low-stock alerts; revenue reports |

---

## 11. Test Data Requirements

- **7 supply hubs** (one per region A–G).
- **Region C (Logan, UT)**: 20 stores.
- **Neighbouring regions** (within 200 mi of Region C): minimum 5 stores each.
- **Role assignments**: 1 `logistics_manager` per hub, 1 `repair_staff` for Region C.
- **Populate**: supply inventories, maintenance schedules, machine status histories.

---

## 12. Key UI/UX Details

- **Colour palette** (hex): `#D30C7B`, `#8DF1D3`, `#C6C8EE`, `#F92758`, `#FFA686`.
- **Style**: rounded corners on boxes/buttons; bright, colourful aesthetic.
- **Nav**: persistent navbar with descriptive graphic icons; all pages ≤ 2–3 clicks deep.
- **Drink design page**: visual ingredient selection (graphics, not lists); search bar; size + soda required to add to cart.
- **Loading screens**: AI-generated mascot images (robot, "Bob" for customer service).
- **Accessibility**: colour-blind-safe palette (avoid teal/purple adjacency); screen-reader compatible; tab navigation.

---

## 13. Project Structure (Codebase)

```
code-pop/
├── codepop/                    # React Native frontend
│   ├── App.js                  # App entry point
│   ├── ip_address.js           # Backend IP config
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   │   ├── AIAlert.js, DropDown.js, Gif.js, Ingredients.js,
│   │   │   │   map.js, NavBar.js, RatingCarosel.js,
│   │   │   │   SeasonalCarousel.js, StarRating.js
│   │   └── pages/              # Screen-level pages
│   │       ├── AdminDash.js, AuthPage.js, CartPage.js,
│   │       │   CheckoutForm.js, ComplaintsPage.js, CompletePage.js,
│   │       │   CreateAccountPage.js, CreateDrinkPage.js,
│   │       │   GeneralHomePage.js, ManagerDash.js, PaymentPage.js,
│   │       │   PostCheckout.js, PreferencesPage.js, UpdateDrink.js
├── codepop_backend/            # Django backend
│   ├── manage.py
│   ├── backend/                # Main Django app
│   │   ├── models.py           # Database models
│   │   ├── views.py            # API views
│   │   ├── urls.py             # URL routing
│   │   ├── serializers.py      # DRF serializers
│   │   ├── admin.py            # Django admin config
│   │   ├── customerAI.py       # Customer AI logic
│   │   ├── drinkAI.py          # Drink recommendation AI
│   │   ├── tests.py            # Unit tests
│   │   ├── Sodas.csv, Syrups.csv, AddIns.csv  # Seed data
│   │   └── management/commands/populate_db.py  # DB seeding
│   └── codepop_backend/        # Django project config
│       ├── settings.py, urls.py, wsgi.py, asgi.py
├── docker-compose.yml
├── requirements.txt
└── package.json
```

---

## 14. MoSCoW Priority Summary

### Must Have
- Multi-store decentralised architecture with fault tolerance and service discovery
- Account creation, login, profile management, preferences
- Custom drink builder with full ingredient selection
- Order lifecycle (create → pay → prepare → pickup)
- Stripe payment processing with refunds
- Per-store inventory tracking with low-stock alerts
- 7 regional supply hubs with AI demand prediction (CSV-based)
- Machine maintenance tracking with defined status states
- All role-specific dashboards (Manager, Admin, Super Admin, Logistics, Repair)
- Revenue tracking per location
- Push notifications (order ready)
- Responsive design, clear error messages, scalability

### Should Have
- AI personalised drink recommendations
- Order pickup time tracking / stale order disposal
- Repair schedule optimisation (min travel, respect service intervals)
- AI customer support chatbot
- Cross-browser compatibility
- WCAG 2.1 accessibility
- Reporting (inventory + financial)
- Geolocation-based pickup with opt-out to time-based

### Could Have
- Saved payment methods
- Loyalty/points programme
- Social media sharing
- Drink ratings
- Seasonal drink menu
- AI complaint lodging
- CSV export of schedules/reports

### Won't Have
- Global trend-based inventory forecasting
- Shared user accounts
- Stored-value wallets / gift cards
- Cash payments
- Refunds after drink creation
