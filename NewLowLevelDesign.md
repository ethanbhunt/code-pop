# CodePop Low-Level Design Document

## Document Overview & Introduction

This document is the **Low-Level Design (LLD)** which outlines user accounts, orders, payments, inventory, AI recommendations, and manager/admin tooling. It translates the High-Level Design into concrete technical specifications for our team to implement.

The LLD covers:

- **System architecture** — Client-server, three-tier layout (Frontend, Backend, Database), and how components interact.
- **Subsystem designs** — User management, orders, payments, catalog, inventory, and AI recommendations, with class-level responsibilities and interfaces.
- **Data and persistence** — Database schema (PostgreSQL), tables, normalization, indexes, and data access patterns.
- **Cross-cutting concerns** — Security, performance, monitoring, deployment, and consistency (naming, docs, testing).

Each major area is specified with classes, methods, relationships, design choices, and (where applicable) UML diagrams and ERDs, so the team can build from a single, consistent blueprint.

---

### **Section 1: System Architecture & User Management Subsystem**

---

#### 1.1 System Architecture Overview

**Architecture style and tiers**

CodePop follows a **client–server**, **three-tier** architecture:

- **Presentation tier (frontend)** — React-based single-page application(s) serving the customer ordering experience, manager dashboard, and admin interface. The frontend communicates with the backend exclusively over HTTPS via REST APIs; no direct database access.
- **Application tier (backend)** — Django-based REST API that implements business logic, authentication, authorization, and integrations with external services (Stripe, AI provider, email, maps). All user-facing and internal operations flow through this tier.
- **Data tier** — PostgreSQL database storing users, orders, payments, catalog, inventory, preferences, and related data. Access is only through the backend (Django ORM); see Section 4 for schema and data access.

**Core runtime components**

| Component                      | Responsibility                                                    | Technology / Interaction                                           |
| ----------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------ |
| Web client(s)                 | Customer UI, manager UI, admin UI                                 | React; HTTP/JSON to backend                                       |
| Django API server             | Request routing, auth middleware, business logic                  | Gunicorn/uWSGI + Django; HTTP to DB and external APIs              |
| User Management module        | Registration, login, profiles, preferences, guests                | Part of Django backend; uses `users`, `preferences` tables (Section 4) |
| Order Management module       | Order lifecycle, status, QR codes                                 | Part of Django backend; depends on User Management, Catalog, Payment |
| Payment module                | Payment processing, refunds                                       | Part of Django backend; integrates with Stripe                     |
| Catalog module                | Products, drinks, customization                                   | Part of Django backend; uses catalog and inventory data           |
| Inventory module              | Stock levels, alerts, restock                                     | Part of Django backend                                             |
| AI Recommendation module      | Personalized recommendations, chatbot                             | Part of Django backend; uses preferences; calls external AI API    |
| PostgreSQL                    | Persistent storage                                                | Accessed via Django ORM / repositories                             |
| Stripe                        | Payment processing                                                | HTTPS API; webhooks for async events                               |
| Email / notification service  | Verification, password reset, order/alert notifications           | HTTPS or SMTP from backend                                         |
| AI provider (e.g., Claude API)| Recommendation and complaint chatbot                             | HTTPS API from backend                                             |
| Maps / geolocation provider   | Store locator, delivery/pickup                                    | HTTPS API from frontend or backend                                 |

![1.1 Component Diagram](misc/1.1_Component_Diagram.png)

**Request/response flow — User login and authenticated request**

1. User submits login credentials from the React login form.
2. Frontend sends `POST /api/auth/login` with credentials (e.g., email + password) over HTTPS.
3. Django API receives the request; middleware may attach CORS and security headers.
4. `AuthenticationService.login(credentials)` is invoked: credentials are validated (e.g., against hashed password in `users` table via `UserRepository`); on success, a session or token is created and stored (e.g., Django session in DB or signed cookie).
5. Backend returns success response with session cookie or token (and optionally user profile summary).
6. For a subsequent authenticated request (e.g., "Get my profile"): frontend sends `GET /api/users/me` with session cookie or `Authorization` token.
7. `AuthenticationService.validateToken(sessionOrToken)` (or Django auth middleware) resolves the current user; `UserService` or a profile endpoint returns the user's profile from `UserRepository.findById(userId)`.
8. Response is returned as JSON to the frontend.

**Request/response flow — User signup**

1. User submits registration form (email, username, password, optional profile fields).
2. Frontend sends `POST /api/auth/register` (or `/api/users/`) with payload.
3. Backend invokes `UserService.createUser(dto)`: validates input, checks uniqueness (e.g., `UserRepository.findByEmail`, `findByUsername`), hashes password, persists user via `UserRepository.save()`; optionally triggers `emailService` for verification email.
4. Backend automatically logs in the user: calls `AuthenticationService.login(credentials)` (or issues a session/token for the new user), then returns the same kind of auth payload as login (session/token + user summary) so the client can stay in an authenticated state without a separate login request.

![1.1 Login Flow Diagram](misc/1.1_Login_Flow_Diagram.png)

**Architecture justification**

- **Client–server and three-tier** — Fits project scope and team size: clear separation of UI, business logic, and data; single backend simplifies deployment, security, and consistency. Aligns with typical course/assignment expectations for a full-stack application.
- **Monolithic backend (Django) rather than microservices** — Reduces operational and networking complexity; shared database and in-process calls simplify transactions and debugging. Microservices would add deployment and coordination overhead without clear benefit at current scale.
- **No serverless for core logic** — Keeps control flow and state in one place; serverless is reserved for optional/event-driven use cases if needed. Detailed technology comparisons are in **Section 6**.

**Technology stack summary**

- **Frontend:** React, with HTTP client for REST API calls.
- **Backend:** Django (Python), REST API (Django REST framework or equivalent), PostgreSQL driver/ORM.
- **Database:** PostgreSQL (see Section 4 for schema).
- **External:** Stripe (payments), AI provider (e.g., Claude API), email service, maps/geolocation (e.g., Mapbox).

Detailed justifications for framework and service choices are in **Section 6**.

---

#### 1.2 User Management Subsystem

**Subsystem overview**

The User Management subsystem is responsible for identity, authentication, profile management, drink preferences, and guest sessions. It ensures that only authorized users (or designated guest sessions) can perform actions that require identity (e.g., placing orders, viewing history, managing preferences).

- **Purpose and responsibilities**
  - User registration and account lifecycle (create, update, delete).
  - Authentication: login, logout, session or token issuance and validation.
  - Profile management: read/update of user attributes (name, contact, role, etc.).
  - Drink preference CRUD and retrieval for use by the Catalog and AI Recommendation subsystems.
  - Guest session creation and lookup so unauthenticated users can browse and build orders before optionally converting to a registered account.

- **Dependencies**
  - **Database:** `users` (and any extended/auth tables), `preferences`; see **Section 4.2** for table definitions.
  - **External:** Email service (verification, password reset); optionally notification service for account-related alerts.
  - **Internal:** Order Management (orders tied to `user_id`); AI Recommendation (consumes preferences via `PreferenceService` or shared interfaces).

- **Key interfaces (API surface)**
  - `POST /api/auth/register` — Create new user (calls `UserService.createUser`); on success, auto-login and return session/token + user (same shape as login).
  - `POST /api/auth/login` — Login (calls `AuthenticationService.login`).
  - `POST /api/auth/logout` — Logout (calls `AuthenticationService.logout`).
  - `GET /api/users/me`, `PATCH /api/users/me` — Current user profile (calls `UserService` / `UserRepository`).
  - `GET /api/preferences/`, `POST /api/preferences/`, `DELETE /api/preferences/:id` — Preferences (calls `PreferenceService`).
  - Guest endpoints (e.g., `POST /api/guest/session`, `GET /api/guest/session`) — `GuestService.createGuestSession`, `getGuestSession`.

Security hardening (password hashing, RBAC, rate limiting, session configuration) is detailed in **Section 5**.

**Detailed class breakdown**

**UserService**

- **Responsibility:** Orchestrates user CRUD and profile operations; delegates persistence to `UserRepository`, auth to `AuthenticationService`, and outbound email to `EmailService`. Does not perform password hashing directly—relies on auth layer or Django's user model.
- **Fields:**
  - `userRepository` (UserRepository) — Data access for user entities.
  - `authService` (AuthenticationService) — For token/session creation after registration or login.
  - `emailService` (interface to email provider) — Sends verification or password-reset emails.
- **Methods:**
  - `createUser(dto: CreateUserDto): User` — Validates dto (email format, username uniqueness, password policy); checks uniqueness via `userRepository.findByEmail`, `findByUsername`; creates user entity (password hashed by auth/django); `userRepository.save(user)`; optionally sends verification email via `emailService`; returns created user (or throws on validation/duplicate); The register API handler calls `AuthenticationService.login(credentials)` after a successful `createUser()` and returns the resulting AuthResult to the client.”.
  - `authenticateUser(credentials: LoginCredentials): AuthResult` — Delegates to `authService.login(credentials)`; returns session/token and user summary.
  - `updateUserProfile(userId: Id, profileDto: UpdateProfileDto): User` — Ensures caller is authorized for `userId`; updates allowed profile fields; `userRepository.save(user)`; returns updated user.
  - `deleteUser(userId: Id): void` — Ensures authorization; performs soft delete or hard delete per policy; clears or anonymizes related data as defined (e.g., preferences, orders reference); `userRepository.delete(userId)`.
- **Error handling:** Validation errors and duplicate email/username return client-friendly errors; not-found and unauthorized return appropriate HTTP status codes.

**AuthenticationService**

- **Responsibility:** Verifies credentials, issues and invalidates sessions or tokens, and validates incoming requests. Encapsulates whether the system uses Django sessions, JWT, or both.
- **Fields:**
  - `tokenGenerator` (or session backend) — Creates and signs tokens or session identifiers.
  - `sessionManager` — Stores and retrieves session data (e.g., DB-backed sessions, or token blocklist for logout).
- **Methods:**
  - `login(credentials: LoginCredentials): AuthResult` — Looks up user (e.g., via `UserRepository.findByEmail`); verifies password (Django/auth library); creates session or token via `tokenGenerator`; stores session via `sessionManager`; returns `AuthResult` (token/session id + user summary).
  - `logout(userContext: UserContext): void` — Invalidates session or token (e.g., remove from store or add to blocklist).
  - `refreshToken(refreshToken: string): AuthResult` — If refresh tokens are used: validates refresh token, issues new access token/session; returns new `AuthResult`.
  - `validateToken(tokenOrSessionId: string): UserContext | null` — Verifies signature and expiry; resolves user id; returns `UserContext` for downstream use or `null` if invalid/expired.
- **Integration:** Used by Django middleware or view layer to set `request.user` for protected endpoints.

**UserRepository**

- **Responsibility:** Single place for all persistence operations on the `users` table (and any Django auth tables). Abstracts Django ORM or raw SQL; returns domain entities or ORM models as agreed.
- **Fields:**
  - `dbConnection` or ORM handle — Django model layer / database connection.
- **Methods:**
  - `findById(id: Id): User | null` — Returns user by primary key; null if not found.
  - `findByEmail(email: string): User | null` — Returns user by email (unique).
  - `findByUsername(username: string): User | null` — Returns user by username (unique).
  - `save(user: User): User` — Inserts or updates user; returns saved entity (e.g., with generated id).
  - `delete(userId: Id): void` — Deletes or soft-deletes user by id.
- **Conventions:** Methods raise an exception or return null for "not found" consistently; constraint violations (e.g., duplicate email) surface as specific errors for the service layer to map to HTTP responses.

**PreferenceService**

- **Responsibility:** Manages per-user drink preferences (e.g., favorite base sodas, syrups, or saved customizations). Used by the AI Recommendation subsystem to personalize suggestions; by Catalog/UI to prefill or highlight options.
- **Fields:**
  - `preferenceRepository` — Data access for `preferences` table (Section 4.2).
  - `userRepository` — To validate that the user exists and to enforce ownership.
- **Methods:**
  - `addPreference(userId: Id, preferenceDto: PreferenceDto): Preference` — Validates user exists; validates preference payload; persists via `preferenceRepository.save`; returns created preference.
  - `removePreference(userId: Id, preferenceId: Id): void` — Ensures preference belongs to `userId`; deletes or soft-deletes.
  - `getUserPreferences(userId: Id): List<Preference>` — Returns all active preferences for the user (e.g., for profile page or recommendation engine).
- **Dependencies:** AI Recommendation (Section 3) may call `getUserPreferences` or consume preference data via a shared interface or API.

**GuestService**

- **Responsibility:** Creates and retrieves guest sessions so unauthenticated users can have a temporary identity (e.g., for cart or preferences stored server-side). Supports upgrade path: when a guest registers or logs in, their session data can be merged into the new or existing user.
- **Fields:**
  - `sessionStorage` — Backing store for guest session data (e.g., Django session keyed by guest id, or Redis/DB keyed by `guest_session_id`). Stores minimal data: guest id, created_at, optional cart/preference snapshot.
- **Methods:**
  - `createGuestSession(): GuestSession` — Generates a unique guest session id; stores a new record in `sessionStorage`; returns `GuestSession` (id, optional expiry).
  - `getGuestSession(sessionId: string): GuestSession | null` — Looks up session by id; returns session or null if expired/invalid.
- **Upgrade path:** When guest converts to user (register/login), the application layer merges guest cart/preferences into the user and then invalidates or disassociates the guest session. Order history is attached to the user from that point forward.

**UML class diagram — User Management Subsystem**

![1.2 Class Diagram](misc/1.2_Class_Diagram.png)

*Note:* `EmailService` and `PreferenceRepository` are interfaces or external modules; their implementations may live in other packages. Section 4 describes the `users` and `preferences` table schemas.



**Design decisions**

- **Django built-in User model vs custom User model**
  - **Choice:** Use Django's built-in `User` model (and `AbstractUser` extension if extra fields are needed, e.g., `role`, `phone_number`).
  - **Rationale:** Built-in model provides battle-tested password hashing, group/permission hooks, and admin integration; reduces custom security code. Extending with a one-to-one or subclass satisfies CodePop's need for roles and contact info without maintaining a full custom auth stack.

- **Token-based vs session-based auth**
  - **Choice:** Session-based auth (Django sessions stored in DB or cache) for the primary web app; optional JWT or signed tokens for mobile or third-party API access if required later.
  - **Rationale:** Sessions simplify logout (invalidate server-side), CSRF handling with cookies, and integration with Django middleware. Tokens are stateless but require explicit refresh/revocation and storage considerations.

- **Guest user handling**
  - **Choice:** Server-side guest sessions: backend issues a guest session id (e.g., in a cookie or returned to client); cart and temporary preferences stored keyed by that id. On register/login, merge guest data into the authenticated user and retire the guest session.
  - **Rationale:** Allows "continue as guest" without polluting the `users` table; clear upgrade path and single source of truth for active cart/state. Limits abuse by tying sessions to a short-lived or single-device identity.

---

### **Section 2: Order Management & Payment Subsystem**
**Assigned to: Team Member 2**

#### 2.1 Order Management Subsystem
- **Subsystem Overview**
  - Purpose: Handle order lifecycle from creation to completion
  - Integration points: User Management, Catalog, Payment, Notifications
  
- **Detailed Class Breakdown**
  - `OrderService` class
    - Fields: orderRepository, paymentService, notificationService, inventoryService
    - Methods: createOrder(), updateOrderStatus(), cancelOrder(), getOrderHistory()
    - Responsibilities: Order business logic and orchestration
  - `OrderRepository` class
    - Fields: dbConnection
    - Methods: save(), findById(), findByUserId(), findByStatus()
    - Responsibilities: Order data persistence
  - `OrderItem` class
    - Fields: drinkId, quantity, customization, price
    - Methods: calculateSubtotal()
    - Responsibilities: Represent individual items in an order
  - `OrderStatusManager` class
    - Fields: statusTransitionRules
    - Methods: canTransition(), updateStatus(), getStatusHistory()
    - Responsibilities: Order status state machine management
  - `QRCodeService` class
    - Fields: codeGenerator, expirationManager
    - Methods: generateQRCode(), validateQRCode(), expireQRCode()
    - Responsibilities: QR code generation and validation for pickup

- **UML Class Diagram** for Order Management Subsystem
  - Classes, relationships, and dependencies

#### 2.2 Payment Integration Subsystem
- **Subsystem Overview**
  - Integration with Stripe payment processing
  - Payment method management
  
- **Detailed Class Breakdown**
  - `PaymentService` class
    - Fields: stripeClient, paymentRepository, orderService
    - Methods: processPayment(), refundPayment(), getPaymentStatus()
    - Responsibilities: Payment processing orchestration
  - `StripeIntegration` class
    - Fields: apiKey, webhookSecret
    - Methods: createPaymentIntent(), confirmPayment(), handleWebhook()
    - Responsibilities: Stripe API communication
  - `PaymentRepository` class
    - Fields: dbConnection
    - Methods: save(), findByOrderId(), findByUserId()
    - Responsibilities: Payment transaction persistence

- **UML Class Diagram** for Payment Subsystem
  - Integration with Order Management
  - External dependency on Stripe

- **Design Decisions & Alternatives**
  - Stripe vs Square vs PayPal
  - Payment tokenization approach
  - Webhook handling strategy

---

### **Section 3: Catalog, Inventory & AI Recommendation Subsystems**
**Assigned to: Team Member 3**

#### 3.1 Soda Catalog Subsystem
- **Subsystem Overview**
  - Product catalog management
  - Custom drink creation
  - Menu management
  
- **Detailed Class Breakdown**
  - `CatalogService` class
    - Fields: productRepository, inventoryService
    - Methods: getProducts(), getProductById(), searchProducts(), getAvailableProducts()
    - Responsibilities: Product catalog operations
  - `ProductRepository` class
    - Fields: dbConnection
    - Methods: findAll(), findById(), findByCategory(), save()
    - Responsibilities: Product data access
  - `DrinkBuilder` class
    - Fields: validationRules, pricingCalculator
    - Methods: buildDrink(), validateDrink(), calculatePrice()
    - Responsibilities: Drink object construction and validation
  - `CustomizationService` class
    - Fields: ingredientRepository, validationService
    - Methods: addSyrup(), addAddIn(), removeIngredient(), validateCustomization()
    - Responsibilities: Drink customization logic

- **UML Class Diagram** for Catalog Subsystem

#### 3.2 Inventory Management Subsystem
- **Subsystem Overview**
  - Inventory tracking and management
  - Low stock alerts
  - Supply hub coordination
  
- **Detailed Class Breakdown**
  - `InventoryService` class
    - Fields: inventoryRepository, alertService, supplyHubService
    - Methods: updateInventory(), checkStockLevel(), getLowStockItems(), requestRestock()
    - Responsibilities: Inventory operations and coordination
  - `InventoryRepository` class
    - Fields: dbConnection
    - Methods: findByItemName(), updateQuantity(), findAllBelowThreshold()
    - Responsibilities: Inventory data access
  - `StockAlertService` class
    - Fields: notificationService, thresholdRules
    - Methods: checkThresholds(), sendAlert(), updateThreshold()
    - Responsibilities: Low stock monitoring and alerts

- **UML Class Diagram** for Inventory Subsystem

#### 3.3 AI Recommendation Subsystem
- **Subsystem Overview**
  - Personalized drink recommendations
  - Random drink generation
  - Complaint handling chatbot
  
- **Detailed Class Breakdown**
  - `RecommendationService` class
    - Fields: contentBasedModel, collaborativeFilteringModel, userPreferenceService
    - Methods: getPersonalizedRecommendations(), getRandomRecommendation(), trainModel()
    - Responsibilities: Recommendation generation
  - `ContentBasedFilter` class
    - Fields: scikitLearnModel, featureExtractor
    - Methods: calculateSimilarity(), generateRecommendations()
    - Responsibilities: Content-based filtering using Scikit-Learn
  - `AIChatbotService` class
    - Fields: claudeClient, conversationHistory, responseValidator
    - Methods: processComplaint(), generateResponse(), validateResponse()
    - Responsibilities: AI-powered complaint handling using Claude API

- **UML Class Diagram** for AI Recommendation Subsystem

- **Design Decisions & Alternatives**
  - Scikit-Learn vs TensorFlow for recommendations
  - Claude vs GPT-4 vs local models for chatbot
  - Model training and update strategies

---

### **Section 4: Database Design & Data Access Layer**
**Assigned to: Team Member 4**

---

## 4.1 Database Schema Design

### 4.1.1 Database Overview

**Selected Database System: PostgreSQL 15+**

CodePop requires a robust, ACID-compliant relational database capable of managing complex relationships between users, orders, inventory, supply chains, and maintenance operations across multiple distributed store locations. PostgreSQL was selected as the database management system for the following technical and business reasons:

**PostgreSQL Selection Justification:**

1. **ACID Compliance & Transactional Integrity**
   - **Requirement**: Order processing, payment handling, and inventory management require guaranteed transactional consistency
   - **Solution**: PostgreSQL provides full ACID compliance with robust transaction isolation levels
   - **Alternatives Considered**: 
     - MySQL: Weaker support for complex queries and constraints; limited JSON capabilities
     - MongoDB: NoSQL design unsuitable for transactional orders and complex relational integrity
     - SQLite: Insufficient for multi-user, distributed production environments

2. **Advanced Data Type Support**
   - **Requirement**: Flexible storage for semi-structured data (drink customizations, ingredient lists)
   - **Solution**: PostgreSQL's JSONB data type provides indexed, queryable JSON storage
   - **Benefit**: Allows schema flexibility for user-created drinks while maintaining relational integrity

3. **Django ORM Integration**
   - **Requirement**: Seamless integration with Django backend framework
   - **Solution**: Django's ORM has first-class PostgreSQL support with access to advanced features
   - **Benefit**: Automatic query optimization, migration management, and parameterized queries preventing SQL injection

4. **Performance & Scalability**
   - **Requirement**: Handle concurrent operations across multiple stores with thousands of daily transactions
   - **Solution**: PostgreSQL's Multi-Version Concurrency Control (MVCC) allows high read/write concurrency
   - **Benefit**: Readers don't block writers; supports horizontal scaling through read replicas

5. **Open Source & Cost-Effective**
   - **Requirement**: Minimize licensing costs while maintaining enterprise-grade capabilities
   - **Solution**: PostgreSQL is fully open-source (PostgreSQL License)
   - **Benefit**: No per-core licensing fees; extensive community support; compatible with cloud managed services (AWS RDS, Google Cloud SQL)

6. **Security Features**
   - **Requirement**: Protect sensitive user data, payment information, and business intelligence
   - **Solution**: Row-level security, SSL/TLS support, column-level encryption
   - **Benefit**: Granular access control; supports compliance with GDPR, CCPA, PCI-DSS

### 4.1.2 Database Normalization Approach

**Normalization Standard: Third Normal Form (3NF) Minimum**

All tables in the CodePop database are designed to meet at least Third Normal Form (3NF) to:
- Eliminate data redundancy
- Prevent update anomalies
- Ensure data integrity through foreign key constraints
- Optimize storage efficiency

**Normalization Strategy:**

- **First Normal Form (1NF)**: All columns contain atomic values; no repeating groups
  - Example: Preferences are stored as individual rows, not comma-separated lists
  - Example: Drink ingredients stored in junction table, not as arrays

- **Second Normal Form (2NF)**: All non-key attributes fully depend on the primary key
  - Example: Order items have composite dependency on order_id; moved to separate `order_items` table
  - Example: Maintenance logs depend on machine_id and timestamp, not just one

- **Third Normal Form (3NF)**: No transitive dependencies; non-key attributes depend only on primary key
  - Example: Store location details stored in `stores` table, not duplicated in `orders`
  - Example: Supply hub information stored separately, referenced via foreign keys

**Selective Denormalization:**

For performance optimization, limited controlled denormalization is applied in specific scenarios:
- **Computed aggregates**: `rating_avg` and `rating_count` in `drinks` table (updated via triggers)
- **Cached totals**: `total_amount` in `orders` table (computed from order_items, cached for performance)
- **JSONB fields**: Ingredient lists stored as JSONB for flexibility in user-created drinks

These denormalizations are justified by:
1. Significant performance gains (avoiding expensive joins on hot paths)
2. Low update frequency (ratings change infrequently relative to reads)
3. Application-layer consistency enforcement through Django signals and atomic transactions

### 4.1.3 Indexing Strategy

**Primary Indexing Goals:**
- Optimize frequent query patterns (user lookups, order retrieval, inventory checks)
- Support foreign key relationships efficiently
- Enable fast full-text search for drink names and ingredients

**Index Categories:**

1. **Automatic Indexes** (Created by PostgreSQL):
   - Primary key indexes (B-tree) on all `id` columns
   - Unique constraint indexes on email, username

2. **Foreign Key Indexes** (Explicitly created):
   - All foreign key columns indexed to optimize JOIN operations
   - Examples: `orders.user_id`, `payments.order_id`, `inventory.store_id`

3. **Composite Indexes** (Multi-column for common query patterns):
   - `(user_id, created_at)` on `orders` for user order history pagination
   - `(store_id, item_type, quantity)` on `inventory` for manager dashboard queries
   - `(status, pickup_time)` on `orders` for order queue management

4. **Partial Indexes** (Filtered indexes for specific conditions):
   - `WHERE status = 'pending'` on `orders` (active orders are frequent query targets)
   - `WHERE is_used = FALSE` on `qr_codes` (only unused codes need fast lookup)

5. **JSONB GIN Indexes** (For semi-structured data queries):
   - `syrups_json` and `add_ins_json` in `drinks` for ingredient-based searches
   - `customization_json` in `order_items` for order analysis

**Index Maintenance:**
- Indexes rebuilt during off-peak hours using `REINDEX CONCURRENTLY`
- Vacuum operations scheduled nightly to reclaim space and update statistics
- Query performance monitoring via `pg_stat_statements` extension

---

## 4.2 Detailed Table Definitions

### 4.2.1 Core User & Authentication Tables

#### **Table 1: `users` (extends Django's `auth_user`)**

**Purpose**: Central user management table storing authentication credentials, profile information, and role-based access control. Extends Django's built-in User model with custom fields for CodePop-specific requirements.

**Design Decision**: Uses Django's `AbstractUser` base class rather than building from scratch to leverage Django's mature authentication system (password hashing, session management, permission framework).

| Column Name      | Data Type         | Constraints                          | Description |
|------------------|-------------------|--------------------------------------|-------------|
| `id`             | INTEGER           | PRIMARY KEY, AUTO_INCREMENT          | Unique user identifier |
| `username`       | VARCHAR(150)      | UNIQUE, NOT NULL                     | User's login username |
| `email`          | VARCHAR(254)      | UNIQUE, NOT NULL                     | User's email address (for authentication and notifications) |
| `password`       | VARCHAR(128)      | NOT NULL                             | Hashed password (Argon2 algorithm) |
| `first_name`     | VARCHAR(150)      | NULL                                 | User's first name (optional) |
| `last_name`      | VARCHAR(150)      | NULL                                 | User's last name (optional) |
| `phone_number`   | VARCHAR(15)       | NULL                                 | Contact number for order notifications |
| `role`           | VARCHAR(20)       | NOT NULL, DEFAULT 'customer'         | User role: 'customer', 'manager', 'admin', 'super_admin', 'logistics_manager', 'repair_staff' |
| `is_active`      | BOOLEAN           | NOT NULL, DEFAULT TRUE               | Account active status |
| `is_staff`       | BOOLEAN           | NOT NULL, DEFAULT FALSE              | Django admin access |
| `is_superuser`   | BOOLEAN           | NOT NULL, DEFAULT FALSE              | Django superuser status |
| `date_joined`    | TIMESTAMP         | NOT NULL, DEFAULT CURRENT_TIMESTAMP  | Account creation timestamp |
| `last_login`     | TIMESTAMP         | NULL                                 | Most recent login timestamp |
| `created_at`     | TIMESTAMP         | NOT NULL, DEFAULT CURRENT_TIMESTAMP  | Record creation time |
| `updated_at`     | TIMESTAMP         | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | Last modification time |

**Primary Key**: `id`

**Indexes**:
- `idx_users_email` (UNIQUE, B-tree) - Fast email-based login lookups
- `idx_users_username` (UNIQUE, B-tree) - Fast username-based login lookups
- `idx_users_role` (B-tree) - Filter users by role for admin dashboards

**Normalization Compliance (3NF)**:
- No repeating groups: User preferences stored in separate `preferences` table
- No partial dependencies: All attributes depend solely on `user_id`
- No transitive dependencies: Role is atomic; order history stored in `orders` table

**Relationships**:
- One-to-Many with `orders` (user_id → orders.user_id)
- One-to-Many with `preferences` (user_id → preferences.user_id)
- One-to-Many with `payments` (user_id → payments.user_id)
- One-to-Many with `notifications` (user_id → notifications.user_id)

**Security Considerations**:
- Passwords hashed using Argon2id (Django 4.x default)
- Email addresses encrypted at rest using application-level encryption
- Role-based access control enforced in Django views and serializers

---

#### **Table 2: `preferences`**

**Purpose**: Stores individual user preferences for drink ingredients, enabling personalized AI recommendations and filtering unwanted ingredients. Each preference is an atomic value (1NF compliance).

**Design Decision**: Separate table instead of JSON array in `users` table to enable efficient querying, indexing, and normalization.

| Column Name        | Data Type    | Constraints                          | Description |
|--------------------|--------------|--------------------------------------|-------------|
| `id`               | INTEGER      | PRIMARY KEY, AUTO_INCREMENT          | Unique preference identifier |
| `user_id`          | INTEGER      | NOT NULL, FOREIGN KEY → users(id) ON DELETE CASCADE | User who set this preference |
| `preference_type`  | VARCHAR(20)  | NOT NULL, CHECK IN ('like', 'dislike') | Whether user likes or dislikes this ingredient |
| `preference_value` | VARCHAR(100) | NOT NULL                             | Ingredient name (e.g., "Strawberry", "Vanilla") |
| `created_at`       | TIMESTAMP    | NOT NULL, DEFAULT CURRENT_TIMESTAMP  | When preference was added |

**Primary Key**: `id`

**Foreign Keys**:
- `user_id` → `users(id)` ON DELETE CASCADE (delete preferences when user deleted)

**Indexes**:
- `idx_preferences_user_id` (B-tree) - Retrieve all preferences for a user
- `idx_preferences_composite` (B-tree on `user_id, preference_type`) - Filter liked/disliked ingredients for AI

**Unique Constraint**:
- `UNIQUE(user_id, preference_value)` - Prevent duplicate preferences for same user

**Normalization Compliance (3NF)**:
- **1NF**: Each preference is atomic (no comma-separated lists)
- **2NF**: `preference_value` fully depends on `id`, not just part of composite key
- **3NF**: No transitive dependencies; all attributes depend only on primary key

**Alternative Considered**: PostgreSQL ARRAY type for storing preferences directly in `users` table
- **Rejected Because**: Arrays violate 1NF; difficult to index; cannot enforce foreign key integrity if preferences reference inventory items

---

### 4.2.2 Order Management Tables

#### **Table 3: `orders`**

**Purpose**: Captures complete order lifecycle from creation through completion, including status tracking, payment association, and pickup scheduling.

| Column Name      | Data Type      | Constraints                                  | Description |
|------------------|----------------|----------------------------------------------|-------------|
| `id`             | INTEGER        | PRIMARY KEY, AUTO_INCREMENT                  | Unique order identifier |
| `user_id`        | INTEGER        | NULL, FOREIGN KEY → users(id) ON DELETE SET NULL | User who placed order (NULL for guest orders) |
| `store_id`       | INTEGER        | NOT NULL, FOREIGN KEY → stores(id)           | Store fulfilling this order |
| `status`         | VARCHAR(20)    | NOT NULL, DEFAULT 'pending', CHECK IN ('pending', 'preparing', 'ready', 'completed', 'cancelled') | Order status |
| `payment_status` | VARCHAR(20)    | NOT NULL, DEFAULT 'unpaid', CHECK IN ('unpaid', 'paid', 'refunded', 'failed') | Payment status |
| `total_amount`   | DECIMAL(10,2)  | NOT NULL, CHECK (total_amount >= 0)          | Total order cost (cached from order_items) |
| `pickup_time`    | TIMESTAMP      | NULL                                         | Scheduled pickup time (NULL if immediate) |
| `pickup_method`  | VARCHAR(20)    | NOT NULL, CHECK IN ('immediate', 'scheduled', 'geolocation') | How user initiated order preparation |
| `created_at`     | TIMESTAMP      | NOT NULL, DEFAULT CURRENT_TIMESTAMP          | Order placement time |
| `updated_at`     | TIMESTAMP      | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | Last status change |

**Primary Key**: `id`

**Foreign Keys**:
- `user_id` → `users(id)` ON DELETE SET NULL (preserve order history if user deleted)
- `store_id` → `stores(id)` ON DELETE RESTRICT (cannot delete store with orders)

**Indexes**:
- `idx_orders_user_id_created` (B-tree composite on `user_id, created_at DESC`) - Order history pagination
- `idx_orders_store_status` (B-tree composite on `store_id, status`) - Manager dashboard active orders
- `idx_orders_status_pickup` (Partial index on `status, pickup_time` WHERE `status = 'ready'`) - Cooler management

**Normalization Compliance (3NF)**:
- Drink details stored in `order_items` (not embedded as JSON arrays)
- Total amount denormalized for performance (updated via trigger when order_items change)
- Store details referenced, not duplicated

**Relationships**:
- One-to-Many with `order_items` (id → order_items.order_id)
- One-to-One with `payments` (id → payments.order_id)
- One-to-One with `qr_codes` (id → qr_codes.order_id)

---

#### **Table 4: `order_items`**

**Purpose**: Junction table resolving Many-to-Many relationship between orders and drinks. Stores drink quantity and customizations specific to this order.

| Column Name          | Data Type      | Constraints                              | Description |
|----------------------|----------------|------------------------------------------|-------------|
| `id`                 | INTEGER        | PRIMARY KEY, AUTO_INCREMENT              | Unique line item identifier |
| `order_id`           | INTEGER        | NOT NULL, FOREIGN KEY → orders(id) ON DELETE CASCADE | Parent order |
| `drink_id`           | INTEGER        | NULL, FOREIGN KEY → drinks(id) ON DELETE SET NULL | Template drink (NULL if custom) |
| `quantity`           | INTEGER        | NOT NULL, DEFAULT 1, CHECK (quantity > 0) | Number of this drink in order |
| `customization_json` | JSONB          | NULL                                     | Order-specific customizations (size, extra syrup, etc.) |
| `unit_price`         | DECIMAL(8,2)   | NOT NULL, CHECK (unit_price >= 0)        | Price per drink at order time |
| `subtotal`           | DECIMAL(10,2)  | NOT NULL, CHECK (subtotal >= 0)          | quantity × unit_price (denormalized for performance) |

**Primary Key**: `id`

**Foreign Keys**:
- `order_id` → `orders(id)` ON DELETE CASCADE (delete items when order deleted)
- `drink_id` → `drinks(id)` ON DELETE SET NULL (preserve history if drink removed from menu)

**Indexes**:
- `idx_order_items_order_id` (B-tree) - Retrieve all items in an order
- `idx_order_items_drink_id` (B-tree) - Analytics on popular drinks

**GIN Index**:
- `idx_order_items_customization_gin` (GIN on `customization_json`) - Query orders by specific customizations

**Normalization Compliance (3NF)**:
- **Why Separate Table**: Order-drink relationship is Many-to-Many (one order has multiple drinks; one drink appears in multiple orders)
- **Why JSONB**: Customizations are semi-structured and vary per order; storage in separate tables (order_item_customizations) would be over-normalization
- Unit price stored to preserve historical pricing (drink prices may change over time)

**Example JSONB Structure**:
```json
{
  "size": "24oz",
  "ice": "light",
  "extra_pumps": {"vanilla": 2},
  "notes": "extra ice on the side"
}
```

---

### 4.2.3 Product Catalog Tables

#### **Table 5: `drinks`**

**Purpose**: Catalog of all available drinks, including pre-set menu items and user-created custom drinks. Supports rating aggregation and ingredient tracking.

| Column Name      | Data Type      | Constraints                                  | Description |
|------------------|----------------|----------------------------------------------|-------------|
| `id`             | INTEGER        | PRIMARY KEY, AUTO_INCREMENT                  | Unique drink identifier |
| `name`           | VARCHAR(200)   | NOT NULL                                     | Display name |
| `base_soda`      | VARCHAR(100)   | NOT NULL                                     | Primary soda ingredient |
| `size`           | VARCHAR(10)    | NOT NULL, CHECK IN ('16oz', '24oz', '32oz')  | Default drink size |
| `ice_level`      | VARCHAR(10)    | NOT NULL, DEFAULT 'regular', CHECK IN ('none', 'light', 'regular', 'extra') | Default ice amount |
| `syrups_json`    | JSONB          | NULL                                         | Syrup ingredients with quantities |
| `add_ins_json`   | JSONB          | NULL                                         | Additional ingredients (cream, fruit, etc.) |
| `price`          | DECIMAL(6,2)   | NOT NULL, CHECK (price >= 0)                 | Base price for default size |
| `rating_avg`     | DECIMAL(3,2)   | NULL, CHECK (rating_avg >= 0 AND rating_avg <= 5) | Average rating (denormalized, updated via trigger) |
| `rating_count`   | INTEGER        | NOT NULL, DEFAULT 0                          | Total number of ratings |
| `is_user_created`| BOOLEAN        | NOT NULL, DEFAULT FALSE                      | TRUE if custom user drink, FALSE if menu item |
| `created_by`     | INTEGER        | NULL, FOREIGN KEY → users(id) ON DELETE SET NULL | User who created custom drink |
| `is_seasonal`    | BOOLEAN        | NOT NULL, DEFAULT FALSE                      | TRUE if seasonal menu item |
| `is_active`      | BOOLEAN        | NOT NULL, DEFAULT TRUE                       | FALSE if removed from menu |
| `created_at`     | TIMESTAMP      | NOT NULL, DEFAULT CURRENT_TIMESTAMP          | Creation timestamp |

**Primary Key**: `id`

**Foreign Keys**:
- `created_by` → `users(id)` ON DELETE SET NULL

**Indexes**:
- `idx_drinks_name_trgm` (GIN trigram index) - Full-text search on drink names
- `idx_drinks_rating_avg` (B-tree DESC) - Top-rated drinks query
- `idx_drinks_is_active` (Partial B-tree WHERE `is_active = TRUE`) - Active menu items
- `idx_drinks_syrups_gin` (GIN on `syrups_json`) - Search by ingredient
- `idx_drinks_add_ins_gin` (GIN on `add_ins_json`) - Search by add-ins

**Normalization Considerations**:
- **Controlled Denormalization**: `rating_avg` and `rating_count` are aggregates, violating 3NF
- **Justification**: Calculating average ratings on-the-fly for menu display would require expensive joins to `ratings` table
- **Consistency Enforcement**: Updated atomically via database trigger on `ratings` INSERT/UPDATE/DELETE

**Example JSONB Structure**:
```json
{
  "syrups_json": {"vanilla": 2, "caramel": 1},
  "add_ins_json": {"cream": "heavy", "cherry": 1}
}
```

**Alternative Considered**: Separate `drink_syrups` and `drink_add_ins` junction tables
- **Rejected Because**: Over-normalization for user-created drinks with variable ingredients; JSONB provides flexibility with indexing via GIN

---

#### **Table 6: `drink_ingredients` (Junction Table)**

**Purpose**: Many-to-Many relationship between drinks and inventory items. Tracks which inventory items are consumed when a drink is prepared.

| Column Name      | Data Type      | Constraints                                  | Description |
|------------------|----------------|----------------------------------------------|-------------|
| `id`             | INTEGER        | PRIMARY KEY, AUTO_INCREMENT                  | Unique relationship identifier |
| `drink_id`       | INTEGER        | NOT NULL, FOREIGN KEY → drinks(id) ON DELETE CASCADE | Drink requiring this ingredient |
| `inventory_id`   | INTEGER        | NOT NULL, FOREIGN KEY → inventory(id) ON DELETE RESTRICT | Inventory item consumed |
| `quantity_ml`    | DECIMAL(8,2)   | NOT NULL, CHECK (quantity_ml > 0)            | Amount consumed per drink (in milliliters) |

**Composite Primary Key Alternative**: Could use `(drink_id, inventory_id)` as primary key
- **Chosen Approach**: Surrogate key `id` for simpler ORM relationships and future extensibility

**Foreign Keys**:
- `drink_id` → `drinks(id)` ON DELETE CASCADE
- `inventory_id` → `inventory(id)` ON DELETE RESTRICT (cannot delete inventory item used in drinks)

**Indexes**:
- `idx_drink_ingredients_drink` (B-tree on `drink_id`) - Get all ingredients for a drink
- `idx_drink_ingredients_inventory` (B-tree on `inventory_id`) - Find drinks using specific ingredient

**Unique Constraint**:
- `UNIQUE(drink_id, inventory_id)` - Prevent duplicate ingredient entries

**Normalization Compliance (3NF)**:
- Resolves Many-to-Many relationship (drinks ↔ inventory)
- Quantity depends on the drink-ingredient combination, stored appropriately

---

### 4.2.4 Inventory & Supply Chain Tables

#### **Table 7: `stores`**

**Purpose**: Represents individual CodePop store locations. Supports multi-store architecture and regional grouping for logistics coordination.

| Column Name      | Data Type      | Constraints                                  | Description |
|------------------|----------------|----------------------------------------------|-------------|
| `id`             | INTEGER        | PRIMARY KEY, AUTO_INCREMENT                  | Unique store identifier |
| `store_name`     | VARCHAR(200)   | NOT NULL                                     | Store display name |
| `region`         | VARCHAR(10)    | NOT NULL, CHECK IN ('A', 'B', 'C', 'D', 'E', 'F', 'G') | Regional assignment (A=Chicago, B=NJ/NY, C=Logan, D=Dallas, E=Atlanta, F=Phoenix, G=Boise) |
| `address_line1`  | VARCHAR(255)   | NOT NULL                                     | Street address |
| `address_line2`  | VARCHAR(255)   | NULL                                         | Apt/suite number |
| `city`           | VARCHAR(100)   | NOT NULL                                     | City name |
| `state`          | VARCHAR(2)     | NOT NULL                                     | US state code (e.g., 'UT') |
| `zip_code`       | VARCHAR(10)    | NOT NULL                                     | ZIP code |
| `latitude`       | DECIMAL(10,8)  | NOT NULL                                     | GPS latitude for geolocation |
| `longitude`      | DECIMAL(11,8)  | NOT NULL                                     | GPS longitude for geolocation |
| `manager_id`     | INTEGER        | NULL, FOREIGN KEY → users(id) ON DELETE SET NULL | Store manager (role='manager') |
| `is_active`      | BOOLEAN        | NOT NULL, DEFAULT TRUE                       | FALSE if store closed |
| `opened_at`      | DATE           | NOT NULL                                     | Store opening date |
| `created_at`     | TIMESTAMP      | NOT NULL, DEFAULT CURRENT_TIMESTAMP          | Record creation time |

**Primary Key**: `id`

**Foreign Keys**:
- `manager_id` → `users(id)` ON DELETE SET NULL (WHERE `users.role = 'manager'`)

**Indexes**:
- `idx_stores_region` (B-tree) - Regional logistics queries
- `idx_stores_location_gist` (GiST on `(latitude, longitude)`) - Geospatial queries for nearest store
- `idx_stores_is_active` (Partial WHERE `is_active = TRUE`) - Active stores only

**Normalization Compliance (3NF)**:
- Store location details centralized (not duplicated in orders, inventory, etc.)
- Manager reference instead of embedding manager data

---

#### **Table 8: `supply_hubs`**

**Purpose**: Represents seven regional supply hubs responsible for distributing ingredients and machine parts to stores.

| Column Name      | Data Type      | Constraints                                  | Description |
|------------------|----------------|----------------------------------------------|-------------|
| `id`             | INTEGER        | PRIMARY KEY, AUTO_INCREMENT                  | Unique hub identifier |
| `region`         | VARCHAR(10)    | NOT NULL, UNIQUE, CHECK IN ('A', 'B', 'C', 'D', 'E', 'F', 'G') | Region served |
| `hub_name`       | VARCHAR(200)   | NOT NULL                                     | Hub display name |
| `city`           | VARCHAR(100)   | NOT NULL                                     | Hub city |
| `state`          | VARCHAR(2)     | NOT NULL                                     | Hub state |
| `logistics_manager_id` | INTEGER  | NULL, FOREIGN KEY → users(id) ON DELETE SET NULL | Manager (role='logistics_manager') |
| `max_delivery_radius_miles` | INTEGER | NOT NULL, DEFAULT 1000                | Maximum delivery distance |
| `created_at`     | TIMESTAMP      | NOT NULL, DEFAULT CURRENT_TIMESTAMP          | Record creation time |

**Primary Key**: `id`

**Foreign Keys**:
- `logistics_manager_id` → `users(id)` ON DELETE SET NULL

**Indexes**:
- `idx_supply_hubs_region` (UNIQUE B-tree) - One hub per region

**Normalization Compliance (3NF)**:
- Hub information centralized for reference by shipments, stores

**Initial Data**:
```sql
INSERT INTO supply_hubs (region, hub_name, city, state) VALUES
('A', 'Chicago Distribution Center', 'Chicago', 'IL'),
('B', 'New Jersey Logistics Hub', 'Jersey City', 'NJ'),
('C', 'Logan Supply Depot', 'Logan', 'UT'),
('D', 'Dallas Supply Center', 'Dallas', 'TX'),
('E', 'Atlanta Distribution Hub', 'Atlanta', 'GA'),
('F', 'Phoenix Logistics Center', 'Phoenix', 'AZ'),
('G', 'Boise Supply Hub', 'Boise', 'ID');
```

---

#### **Table 9: `inventory`**

**Purpose**: Tracks ingredient and supply levels at each store location. Supports low-stock alerting and AI-driven demand forecasting.

| Column Name      | Data Type      | Constraints                                  | Description |
|------------------|----------------|----------------------------------------------|-------------|
| `id`             | INTEGER        | PRIMARY KEY, AUTO_INCREMENT                  | Unique inventory entry identifier |
| `store_id`       | INTEGER        | NOT NULL, FOREIGN KEY → stores(id) ON DELETE CASCADE | Store location |
| `item_name`      | VARCHAR(200)   | NOT NULL                                     | Item name (e.g., "Vanilla Syrup", "Diet Coke") |
| `item_type`      | VARCHAR(20)    | NOT NULL, CHECK IN ('soda', 'syrup', 'add_in', 'physical', 'machine_part') | Item category |
| `quantity`       | DECIMAL(10,2)  | NOT NULL, DEFAULT 0, CHECK (quantity >= 0)   | Current stock level (units vary by type) |
| `unit_of_measure`| VARCHAR(20)    | NOT NULL, CHECK IN ('ml', 'oz', 'count', 'kg', 'lb') | Measurement unit |
| `threshold_level`| DECIMAL(10,2)  | NOT NULL                                     | Reorder alert threshold |
| `unit_cost`      | DECIMAL(8,2)   | NOT NULL, CHECK (unit_cost >= 0)             | Cost per unit (for financial reporting) |
| `last_updated`   | TIMESTAMP      | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | Last inventory change |
| `supplier_name`  | VARCHAR(200)   | NULL                                         | Primary supplier for this item |

**Primary Key**: `id`

**Foreign Keys**:
- `store_id` → `stores(id)` ON DELETE CASCADE

**Indexes**:
- `idx_inventory_store_item` (B-tree composite on `store_id, item_type`) - Manager dashboard inventory view
- `idx_inventory_low_stock` (Partial WHERE `quantity <= threshold_level`) - Low-stock alerts

**Unique Constraint**:
- `UNIQUE(store_id, item_name, item_type)` - Prevent duplicate inventory items per store

**Normalization Compliance (3NF)**:
- Inventory specific to store (no global inventory table that violates 3NF)
- Item details (name, type, UOM) depend only on inventory entry, not on store

**Trigger for Low-Stock Alerts**:
```sql
CREATE TRIGGER inventory_low_stock_alert
AFTER UPDATE ON inventory
FOR EACH ROW
WHEN (NEW.quantity <= NEW.threshold_level AND OLD.quantity > OLD.threshold_level)
EXECUTE FUNCTION notify_manager_low_stock();
```

---

### 4.2.5 Maintenance & Machine Management Tables

#### **Table 10: `machines`**

**Purpose**: Tracks all operational machines used in drink preparation at each store. Supports maintenance scheduling and failure tracking.

| Column Name      | Data Type      | Constraints                                  | Description |
|------------------|----------------|----------------------------------------------|-------------|
| `id`             | INTEGER        | PRIMARY KEY, AUTO_INCREMENT                  | Unique machine identifier |
| `store_id`       | INTEGER        | NOT NULL, FOREIGN KEY → stores(id) ON DELETE RESTRICT | Store location |
| `machine_type`   | VARCHAR(100)   | NOT NULL, CHECK IN ('soda_dispenser', 'syrup_pump', 'ice_maker', 'cooler', 'cleaning_system') | Machine category |
| `model_number`   | VARCHAR(100)   | NOT NULL                                     | Manufacturer model |
| `serial_number`  | VARCHAR(100)   | UNIQUE, NOT NULL                             | Unique serial number |
| `install_date`   | DATE           | NOT NULL                                     | Installation date |
| `status`         | VARCHAR(20)    | NOT NULL, DEFAULT 'normal', CHECK IN ('normal', 'warning', 'repair-start', 'repair-end', 'error', 'out-of-order', 'schedule-service') | Current operational status |
| `last_service_date` | DATE        | NULL                                         | Most recent maintenance date |
| `next_service_due` | DATE         | NULL                                         | Scheduled next service |
| `created_at`     | TIMESTAMP      | NOT NULL, DEFAULT CURRENT_TIMESTAMP          | Record creation time |
| `updated_at`     | TIMESTAMP      | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | Last status change |

**Primary Key**: `id`

**Foreign Keys**:
- `store_id` → `stores(id)` ON DELETE RESTRICT (cannot delete store with machines)

**Indexes**:
- `idx_machines_store_status` (B-tree composite on `store_id, status`) - Manager dashboard machine health
- `idx_machines_service_due` (B-tree on `next_service_due`) - Maintenance schedule optimization
- `idx_machines_serial` (UNIQUE B-tree) - Manufacturer lookup

**Normalization Compliance (3NF)**:
- Machine details depend only on machine_id, not duplicated across maintenance logs

---

#### **Table 11: `maintenance_logs`**

**Purpose**: Complete audit trail of all maintenance activities, repairs, and status changes for machines. Supports predictive maintenance and repair optimization.

| Column Name      | Data Type      | Constraints                                  | Description |
|------------------|----------------|----------------------------------------------|-------------|
| `id`             | INTEGER        | PRIMARY KEY, AUTO_INCREMENT                  | Unique log entry identifier |
| `machine_id`     | INTEGER        | NOT NULL, FOREIGN KEY → machines(id) ON DELETE CASCADE | Machine being serviced |
| `technician_id`  | INTEGER        | NULL, FOREIGN KEY → users(id) ON DELETE SET NULL | Repair staff (role='repair_staff') |
| `log_type`       | VARCHAR(20)    | NOT NULL, CHECK IN ('status_change', 'repair', 'routine_maintenance', 'inspection') | Log entry type |
| `old_status`     | VARCHAR(20)    | NULL                                         | Previous machine status |
| `new_status`     | VARCHAR(20)    | NOT NULL                                     | New machine status |
| `description`    | TEXT           | NOT NULL                                     | Detailed description of work performed |
| `parts_replaced` | JSONB          | NULL                                         | List of parts replaced (if repair) |
| `labor_hours`    | DECIMAL(5,2)   | NULL, CHECK (labor_hours >= 0)               | Time spent on maintenance |
| `cost`           | DECIMAL(10,2)  | NULL, CHECK (cost >= 0)                      | Total maintenance cost |
| `created_at`     | TIMESTAMP      | NOT NULL, DEFAULT CURRENT_TIMESTAMP          | Log entry timestamp |

**Primary Key**: `id`

**Foreign Keys**:
- `machine_id` → `machines(id)` ON DELETE CASCADE
- `technician_id` → `users(id)` ON DELETE SET NULL

**Indexes**:
- `idx_maintenance_logs_machine` (B-tree on `machine_id, created_at DESC`) - Machine history
- `idx_maintenance_logs_technician` (B-tree on `technician_id, created_at DESC`) - Technician workload
- `idx_maintenance_logs_created` (B-tree on `created_at DESC`) - Recent maintenance activity

**Normalization Compliance (3NF)**:
- Separate record for each maintenance event (no repeated groups)
- Status transitions logged rather than overwriting historical data

**Example `parts_replaced` JSONB**:
```json
{
  "valve_assembly": {"part_number": "VA-2034", "quantity": 1},
  "tubing": {"part_number": "TB-500", "quantity": 3}
}
```

---

### 4.2.6 Payment & Financial Tables

#### **Table 12: `payments`**

**Purpose**: Records all payment transactions processed through Stripe. Tracks payment status, refunds, and links to orders.

**Security Note**: No raw credit card data is stored. All payment processing delegated to Stripe (PCI-DSS Level 1 compliant).

| Column Name               | Data Type      | Constraints                                  | Description |
|---------------------------|----------------|----------------------------------------------|-------------|
| `id`                      | INTEGER        | PRIMARY KEY, AUTO_INCREMENT                  | Unique payment identifier |
| `order_id`                | INTEGER        | UNIQUE, NOT NULL, FOREIGN KEY → orders(id) ON DELETE RESTRICT | Associated order (one-to-one) |
| `user_id`                 | INTEGER        | NULL, FOREIGN KEY → users(id) ON DELETE SET NULL | User who made payment |
| `amount`                  | DECIMAL(10,2)  | NOT NULL, CHECK (amount >= 0)                | Payment amount in USD |
| `payment_method`          | VARCHAR(50)    | NOT NULL, CHECK IN ('card', 'apple_pay', 'google_pay') | Payment method |
| `stripe_payment_intent_id`| VARCHAR(255)   | UNIQUE, NOT NULL                             | Stripe PaymentIntent ID (for refunds/disputes) |
| `stripe_customer_id`      | VARCHAR(255)   | NULL                                         | Stripe Customer ID (if saved payment method) |
| `status`                  | VARCHAR(20)    | NOT NULL, DEFAULT 'pending', CHECK IN ('pending', 'succeeded', 'failed', 'cancelled') | Payment status |
| `refund_status`           | VARCHAR(20)    | NULL, CHECK IN ('none', 'partial', 'full')   | Refund status (NULL if no refund) |
| `refund_amount`           | DECIMAL(10,2)  | NULL, CHECK (refund_amount >= 0 AND refund_amount <= amount) | Refunded amount |
| `failure_reason`          | TEXT           | NULL                                         | Error message if payment failed |
| `created_at`              | TIMESTAMP      | NOT NULL, DEFAULT CURRENT_TIMESTAMP          | Payment initiation time |
| `updated_at`              | TIMESTAMP      | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | Last status update |

**Primary Key**: `id`

**Foreign Keys**:
- `order_id` → `orders(id)` ON DELETE RESTRICT (cannot delete order with payment)
- `user_id` → `users(id)` ON DELETE SET NULL

**Indexes**:
- `idx_payments_order_id` (UNIQUE B-tree) - One-to-one relationship with orders
- `idx_payments_stripe_intent` (UNIQUE B-tree) - Webhook lookups by Stripe PaymentIntent ID
- `idx_payments_user_created` (B-tree composite on `user_id, created_at DESC`) - User payment history

**Normalization Compliance (3NF)**:
- Payment details depend only on payment_id
- Order reference prevents duplication of order data

**PCI-DSS Compliance**:
- No `card_number`, `cvv`, or `billing_address` stored in database
- All sensitive data handled by Stripe; only tokens stored

---

#### **Table 13: `revenue`**

**Purpose**: Aggregated revenue reporting by store and time period. Supports manager dashboard financial analytics.

| Column Name      | Data Type      | Constraints                                  | Description |
|------------------|----------------|----------------------------------------------|-------------|
| `id`             | INTEGER        | PRIMARY KEY, AUTO_INCREMENT                  | Unique revenue entry identifier |
| `store_id`       | INTEGER        | NOT NULL, FOREIGN KEY → stores(id) ON DELETE CASCADE | Store location |
| `period_type`    | VARCHAR(20)    | NOT NULL, CHECK IN ('daily', 'weekly', 'monthly') | Aggregation period |
| `period_start`   | DATE           | NOT NULL                                     | Period start date |
| `period_end`     | DATE           | NOT NULL                                     | Period end date |
| `total_amount`   | DECIMAL(12,2)  | NOT NULL, DEFAULT 0, CHECK (total_amount >= 0) | Total revenue for period |
| `order_count`    | INTEGER        | NOT NULL, DEFAULT 0                          | Number of completed orders |
| `refund_amount`  | DECIMAL(10,2)  | NOT NULL, DEFAULT 0                          | Total refunds issued |
| `net_revenue`    | DECIMAL(12,2)  | NOT NULL, DEFAULT 0                          | total_amount - refund_amount |
| `created_at`     | TIMESTAMP      | NOT NULL, DEFAULT CURRENT_TIMESTAMP          | Record creation time |

**Primary Key**: `id`

**Foreign Keys**:
- `store_id` → `stores(id)` ON DELETE CASCADE

**Indexes**:
- `idx_revenue_store_period` (B-tree composite on `store_id, period_type, period_start DESC`) - Manager dashboard queries

**Unique Constraint**:
- `UNIQUE(store_id, period_type, period_start)` - Prevent duplicate aggregation entries

**Normalization Considerations**:
- **Controlled Denormalization**: Revenue aggregates violate 3NF (data derived from `orders` and `payments`)
- **Justification**: Real-time aggregation across thousands of orders would be too slow for dashboard
- **Consistency**: Updated via scheduled batch job (nightly) and materialized view refresh

---

### 4.2.7 Notification & Order Pickup Tables

#### **Table 14: `notifications`**

**Purpose**: Stores user notifications for order status updates, low inventory alerts, and promotional messages. Supports push notification delivery via Firebase Cloud Messaging (FCM).

| Column Name      | Data Type      | Constraints                                  | Description |
|------------------|----------------|----------------------------------------------|-------------|
| `id`             | INTEGER        | PRIMARY KEY, AUTO_INCREMENT                  | Unique notification identifier |
| `user_id`        | INTEGER        | NOT NULL, FOREIGN KEY → users(id) ON DELETE CASCADE | Recipient user |
| `message`        | TEXT           | NOT NULL                                     | Notification message body |
| `type`           | VARCHAR(30)    | NOT NULL, CHECK IN ('order_update', 'order_ready', 'low_stock', 'promotional', 'maintenance_alert') | Notification category |
| `related_order_id` | INTEGER      | NULL, FOREIGN KEY → orders(id) ON DELETE SET NULL | Associated order (if applicable) |
| `qr_code_id`     | INTEGER        | NULL, FOREIGN KEY → qr_codes(id) ON DELETE SET NULL | Associated QR code (if order ready) |
| `is_read`        | BOOLEAN        | NOT NULL, DEFAULT FALSE                      | Read status |
| `fcm_token`      | VARCHAR(255)   | NULL                                         | Firebase Cloud Messaging device token |
| `sent_at`        | TIMESTAMP      | NULL                                         | When push notification was sent |
| `created_at`     | TIMESTAMP      | NOT NULL, DEFAULT CURRENT_TIMESTAMP          | Notification creation time |

**Primary Key**: `id`

**Foreign Keys**:
- `user_id` → `users(id)` ON DELETE CASCADE
- `related_order_id` → `orders(id)` ON DELETE SET NULL
- `qr_code_id` → `qr_codes(id)` ON DELETE SET NULL

**Indexes**:
- `idx_notifications_user_created` (B-tree composite on `user_id, created_at DESC`) - User notification feed
- `idx_notifications_unread` (Partial WHERE `is_read = FALSE`) - Unread notification count

**Normalization Compliance (3NF)**:
- Notification content depends only on notification_id
- References to orders and QR codes prevent data duplication

---

#### **Table 15: `qr_codes`**

**Purpose**: Generates unique, time-limited QR codes for order pickup. Stores code data, expiration time, and usage status.

| Column Name      | Data Type      | Constraints                                  | Description |
|------------------|----------------|----------------------------------------------|-------------|
| `id`             | INTEGER        | PRIMARY KEY, AUTO_INCREMENT                  | Unique QR code identifier |
| `order_id`       | INTEGER        | UNIQUE, NOT NULL, FOREIGN KEY → orders(id) ON DELETE CASCADE | Associated order (one-to-one) |
| `code_data`      | VARCHAR(255)   | UNIQUE, NOT NULL                             | QR code content (randomly generated UUID) |
| `expiration_time`| TIMESTAMP      | NOT NULL                                     | When code expires (typically 24 hours after order ready) |
| `is_used`        | BOOLEAN        | NOT NULL, DEFAULT FALSE                      | TRUE once customer scans and retrieves order |
| `used_at`        | TIMESTAMP      | NULL                                         | When code was scanned |
| `created_at`     | TIMESTAMP      | NOT NULL, DEFAULT CURRENT_TIMESTAMP          | Code generation time |

**Primary Key**: `id`

**Foreign Keys**:
- `order_id` → `orders(id)` ON DELETE CASCADE

**Indexes**:
- `idx_qr_codes_code_data` (UNIQUE B-tree) - Fast lookup when customer scans QR code
- `idx_qr_codes_unused` (Partial WHERE `is_used = FALSE AND expiration_time > NOW()`) - Active QR codes
- `idx_qr_codes_order_id` (UNIQUE B-tree) - Enforce one-to-one with orders

**Normalization Compliance (3NF)**:
- QR code details depend only on qr_code_id
- One-to-one relationship with orders (each order gets exactly one QR code)

**Generation Strategy**:
- `code_data` generated using UUID v4 (e.g., `550e8400-e29b-41d4-a716-446655440000`)
- Expiration set to `order.pickup_time + 24 hours` or `NOW() + 24 hours` for immediate orders
- QR code image rendered client-side using `code_data` value

**Security Consideration**:
- QR codes expire after pickup window to prevent reuse
- Single-use codes (is_used flag prevents duplicate scans)
- Stored QR data does not expose sensitive order details (requires database lookup)

---

## 4.3 Entity Relationship Diagram (ERD)

### 4.3.1 ERD Description

The CodePop database schema consists of **15 core tables** organized into six functional domains:

1. **User & Authentication** (`users`, `preferences`)
2. **Order Management** (`orders`, `order_items`)
3. **Product Catalog** (`drinks`, `drink_ingredients`)
4. **Inventory & Supply Chain** (`stores`, `supply_hubs`, `inventory`)
5. **Maintenance** (`machines`, `maintenance_logs`)
6. **Payments & Notifications** (`payments`, `revenue`, `notifications`, `qr_codes`)

**Key Relationships:**

| Relationship                     | Type      | Cardinality | Enforcement |
|----------------------------------|-----------|-------------|-------------|
| `users` ↔ `orders`               | One-to-Many | 1:N       | FK `orders.user_id` → `users.id` |
| `users` ↔ `preferences`          | One-to-Many | 1:N       | FK `preferences.user_id` → `users.id` |
| `orders` ↔ `order_items`         | One-to-Many | 1:N       | FK `order_items.order_id` → `orders.id` |
| `orders` ↔ `payments`            | One-to-One | 1:1        | UNIQUE constraint on `payments.order_id` |
| `orders` ↔ `qr_codes`            | One-to-One | 1:1        | UNIQUE constraint on `qr_codes.order_id` |
| `drinks` ↔ `order_items`         | One-to-Many | 1:N       | FK `order_items.drink_id` → `drinks.id` |
| `drinks` ↔ `drink_ingredients` ↔ `inventory` | Many-to-Many | N:M | Junction table `drink_ingredients` |
| `stores` ↔ `orders`              | One-to-Many | 1:N       | FK `orders.store_id` → `stores.id` |
| `stores` ↔ `inventory`           | One-to-Many | 1:N       | FK `inventory.store_id` → `stores.id` |
| `stores` ↔ `machines`            | One-to-Many | 1:N       | FK `machines.store_id` → `stores.id` |
| `machines` ↔ `maintenance_logs`  | One-to-Many | 1:N       | FK `maintenance_logs.machine_id` → `machines.id` |

**Referential Integrity Strategy:**

- **ON DELETE CASCADE**: Used when child records should be deleted with parent (e.g., `order_items` when `orders` deleted)
- **ON DELETE SET NULL**: Used when historical data should be preserved (e.g., `orders.user_id` set to NULL if user deleted)
- **ON DELETE RESTRICT**: Used to prevent deletion of critical parent records (e.g., cannot delete `stores` with associated `orders`)

### 4.3.2 ERD Visual Structure

```
┌──────────────────┐
│     USERS        │
│==================│
│ id (PK)          │
│ username         │
│ email            │
│ password         │
│ role             │
│ phone_number     │
└────────┬─────────┘
         │ 1
         │
         │ N
┌────────▼─────────────┐        ┌──────────────────┐
│   PREFERENCES        │        │     ORDERS       │
│======================│        │==================│
│ id (PK)              │        │ id (PK)          │
│ user_id (FK)         │        │ user_id (FK)     │
│ preference_type      │        │ store_id (FK)    │
│ preference_value     │        │ status           │
└──────────────────────┘        │ payment_status   │
                                │ total_amount     │
                                │ pickup_time      │
                                └────────┬─────────┘
                                         │ 1
                    ┌────────────────────┼─────────────────────┐
                    │ 1                  │ N                   │ 1
         ┌──────────▼──────────┐ ┌───────▼────────┐   ┌───────▼─────────┐
         │     PAYMENTS        │ │  ORDER_ITEMS   │   │    QR_CODES     │
         │=====================│ │================│   │=================│
         │ id (PK)             │ │ id (PK)        │   │ id (PK)         │
         │ order_id (FK,UNIQUE)│ │ order_id (FK)  │   │ order_id (FK,UQ)│
         │ user_id (FK)        │ │ drink_id (FK)  │   │ code_data       │
         │ amount              │ │ quantity       │   │ expiration_time │
         │ stripe_intent_id    │ │ unit_price     │   │ is_used         │
         │ status              │ └────────┬───────┘   └─────────────────┘
         │ refund_status       │          │ N
         └─────────────────────┘          │
                                          │ 1
                              ┌───────────▼──────────┐
                              │       DRINKS         │
                              │======================│
                              │ id (PK)              │
                              │ name                 │
                              │ base_soda spec      │
                              │ syrups_json          │
                              │ add_ins_json         │
                              │ price                │
                              │ rating_avg           │
                              │ is_user_created      │
                              └───────────┬──────────┘
                                          │ N
                                          │
                                          │ 1
                         ┌────────────────▼─────────────┐
                         │   DRINK_INGREDIENTS          │
                         │==============================│
                         │ id (PK)                      │
                         │ drink_id (FK)                │
                         │ inventory_id (FK)            │
                         │ quantity_ml                  │
                         └────────────────┬─────────────┘
                                          │ N
                                          │
                                          │ 1
                              ┌───────────▼──────────┐
                              │     INVENTORY        │
                              │======================│
                              │ id (PK)              │
                              │ store_id (FK)        │
                              │ item_name            │
                              │ item_type            │
                              │ quantity             │
                              │ threshold_level      │
                              └───────────┬──────────┘
                                          │ N
                                          │
                                          │ 1
                              ┌───────────▼──────────┐
                              │       STORES         │
                              │======================│
                              │ id (PK)              │
                              │ store_name           │
                              │ region               │
                              │ latitude/longitude   │
                              │ manager_id (FK)      │
                              └───────────┬──────────┘
                                          │ 1
                                          │
                                          │ N
                              ┌───────────▼──────────┐
                              │      MACHINES        │
                              │======================│
                              │ id (PK)              │
                              │ store_id (FK)        │
                              │ machine_type         │
                              │ status               │
                              │ next_service_due     │
                              └───────────┬──────────┘
                                          │ 1
                                          │
                                          │ N
                         ┌────────────────▼─────────────┐
                         │   MAINTENANCE_LOGS           │
                         │==============================│
                         │ id (PK)                      │
                         │ machine_id (FK)              │
                         │ technician_id (FK)           │
                         │ log_type                     │
                         │ old_status / new_status      │
                         │ description                  │
                         └──────────────────────────────┘

Legend:
  PK = Primary Key
  FK = Foreign Key
  UQ = Unique Constraint
  1:N = One-to-Many Relationship
  N:M = Many-to-Many Relationship (via junction table)
```

**Note**: Additional tables not shown in simplified diagram: `supply_hubs`, `revenue`, `notifications` (all follow similar FK patterns to `stores` and `users`)

---

## 4.4 Data Access Layer Design

### 4.4.1 ORM Strategy: Django ORM Usage Patterns

**Framework**: Django ORM (Object-Relational Mapper)

**Selection Justification**:
- **Abstraction**: Provides Pythonic interface to database operations, eliminating raw SQL for most operations
- **Security**: Automatic SQL injection prevention through parameterized queries
- **Portability**: Database-agnostic (can switch PostgreSQL → MySQL with minimal code changes)
- **Migration Management**: Built-in schema versioning and migration generation
- **Performance**: Lazy query evaluation, query optimization, and connection pooling

**Alternative Considered**: SQLAlchemy
- **Rejected Because**: Django ORM integrates seamlessly with Django's authentication, admin, and form systems; SQLAlchemy would require additional configuration

### 4.4.2 Repository Pattern Implementation

**Design Pattern**: Service Layer + Repository Pattern

Rather than directly accessing Django models from views, CodePop implements a **Service Layer** that encapsulates business logic and delegates data access to **Repository classes**.

**Architecture**:

```
┌─────────────────────────────────────────────────┐
│         Views / API Endpoints (Django REST)     │
│         (Handle HTTP requests/responses)        │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│           Service Layer (Business Logic)        │
│  OrderService, PaymentService, InventoryService │
│  - Orchestrates workflows                       │
│  - Enforces business rules                      │
│  - Coordinates transactions                     │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│         Repository Layer (Data Access)          │
│  OrderRepository, DrinkRepository, etc.         │
│  - CRUD operations                              │
│  - Query builders                               │
│  - Django ORM abstraction                       │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│              Django Models (ORM)                │
│  Order, Drink, User, Inventory (map to tables) │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│            PostgreSQL Database                  │
└─────────────────────────────────────────────────┘
```

**Example Service Class** (`OrderService`):

```python
from django.db import transaction
from .repositories import OrderRepository, InventoryRepository, PaymentRepository
from .models import Order, OrderItem

class OrderService:
    def __init__(self):
        self.order_repo = OrderRepository()
        self.inventory_repo = InventoryRepository()
        self.payment_repo = PaymentRepository()
    
    @transaction.atomic
    def create_order(self, user, store, items, payment_method):
        """
        Create order with payment and inventory deduction.
        Uses database transaction for atomicity.
        """
        # 1. Validate inventory availability
        for item in items:
            ingredients = self.inventory_repo.get_drink_ingredients(item['drink_id'])
            if not self.inventory_repo.check_availability(store.id, ingredients, item['quantity']):
                raise InsufficientInventoryError(f"Not enough stock for {item['drink_id']}")
        
        # 2. Create order record
        order = self.order_repo.create(
            user=user,
            store=store,
            items=items,
            status='pending'
        )
        
        # 3. Process payment via Stripe
        payment_result = self.payment_repo.charge(
            amount=order.total_amount,
            payment_method=payment_method,
            order_id=order.id
        )
        
        if not payment_result.success:
            raise PaymentFailedError(payment_result.error)
        
        # 4. Deduct inventory
        for item in items:
            ingredients = self.inventory_repo.get_drink_ingredients(item['drink_id'])
            self.inventory_repo.deduct_ingredients(store.id, ingredients, item['quantity'])
        
        # 5. Update order status
        order.payment_status = 'paid'
        order.status = 'preparing'
        self.order_repo.save(order)
        
        return order
```

**Benefits**:
- **Testability**: Services can be unit-tested with mocked repositories
- **Reusability**: Common queries encapsulated in repository methods
- **Transaction Safety**: `@transaction.atomic` decorator ensures all-or-nothing operations
- **Separation of Concerns**: Views handle HTTP, services handle logic, repositories handle data

### 4.4.3 Query Optimization Strategies

**Problem**: Naive ORM usage can result in N+1 query problems and slow page loads.

**Solutions**:

**1. Eager Loading with `select_related()` (1:1 and N:1 relationships)**

```python
# BAD: Triggers separate query for each order's user
orders = Order.objects.all()
for order in orders:
    print(order.user.email)  # Query executed here for each iteration

# GOOD: Single JOIN query
orders = Order.objects.select_related('user', 'store').all()
for order in orders:
    print(order.user.email)  # No additional query
```

**When to Use**: Fetching foreign key relationships (user, store, payment)

**2. Eager Loading with `prefetch_related()` (1:N and N:M relationships)**

```python
# BAD: N+1 queries (1 for orders + N for order_items)
orders = Order.objects.all()
for order in orders:
    for item in order.order_items.all():  # Separate query per order
        print(item.drink.name)

# GOOD: 3 queries total (orders, order_items, drinks)
orders = Order.objects.prefetch_related('order_items__drink').all()
for order in orders:
    for item in order.order_items.all():  # Uses cached results
        print(item.drink.name)
```

**When to Use**: Fetching reverse foreign keys (order → order_items) and many-to-many (drinks → ingredients)

**3. Query Result Caching**

```python
from django.core.cache import cache

def get_popular_drinks():
    cache_key = 'popular_drinks_top_10'
    drinks = cache.get(cache_key)
    
    if drinks is None:
        drinks = Drink.objects.filter(is_active=True).order_by('-rating_avg')[:10]
        cache.set(cache_key, drinks, timeout=3600)  # Cache for 1 hour
    
    return drinks
```

**When to Use**: Data that changes infrequently (menu items, top-rated drinks, store locations)

**Cache Backend**: Redis (configured via Django's `CACHES` setting)

**4. Database Query Annotations (Aggregation)**

```python
from django.db.models import Count, Avg, Sum

# Calculate total revenue per store
store_revenue = Store.objects.annotate(
    total_orders=Count('orders'),
    avg_order_value=Avg('orders__total_amount'),
    total_revenue=Sum('orders__total_amount')
).filter(is_active=True)
```

**When to Use**: Dashboard analytics, reporting queries

**5. Raw SQL for Complex Queries**

```python
from django.db import connection

def get_low_stock_items_with_demand_forecast(store_id):
    """
    Complex query combining inventory, order history, and ML predictions.
    Too complex for ORM; use raw SQL.
    """
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT 
                inv.item_name,
                inv.quantity,
                inv.threshold_level,
                COALESCE(SUM(oi.quantity), 0) as last_30_days_usage
            FROM inventory inv
            LEFT JOIN drink_ingredients di ON inv.id = di.inventory_id
            LEFT JOIN order_items oi ON di.drink_id = oi.drink_id
            LEFT JOIN orders o ON oi.order_id = o.id
            WHERE inv.store_id = %s
              AND o.created_at >= NOW() - INTERVAL '30 days'
              AND inv.quantity <= inv.threshold_level
            GROUP BY inv.id, inv.item_name, inv.quantity, inv.threshold_level
            ORDER BY (inv.threshold_level - inv.quantity) DESC
        """, [store_id])
        return cursor.fetchall()
```

**When to Use**: Multi-table aggregations, window functions, or PostgreSQL-specific features not exposed by ORM

### 4.4.4 Transaction Management

**ACID Guarantees**: All critical operations (orders, payments, inventory updates) must be transactional.

**Django's `transaction.atomic` Decorator**:

```python
from django.db import transaction

@transaction.atomic
def process_refund(order_id, refund_amount):
    """
    Refund payment and restore inventory.
    If any step fails, entire operation rolls back.
    """
    order = Order.objects.select_for_update().get(id=order_id)
    payment = Payment.objects.get(order=order)
    
    # 1. Process Stripe refund
    stripe.Refund.create(
        payment_intent=payment.stripe_payment_intent_id,
        amount=int(refund_amount * 100)  # Stripe uses cents
    )
    
    # 2. Update payment record
    payment.refund_status = 'full' if refund_amount == payment.amount else 'partial'
    payment.refund_amount = refund_amount
    payment.save()
    
    # 3. Restore inventory
    for item in order.order_items.all():
        ingredients = DrinkIngredient.objects.filter(drink=item.drink)
        for ing in ingredients:
            inv = Inventory.objects.get(store=order.store, item_name=ing.inventory.item_name)
            inv.quantity += ing.quantity_ml * item.quantity
            inv.save()
    
    # 4. Update order status
    order.status = 'cancelled'
    order.payment_status = 'refunded'
    order.save()
```

**Key Points**:
- **Atomicity**: All database changes committed together or rolled back on exception
- **Locking**: `select_for_update()` prevents concurrent modifications (row-level lock)
- **Savepoints**: Nested `atomic` blocks create savepoints for partial rollbacks

**When to Use Transactions**:
- Order creation (order + payment + inventory deduction)
- Refunds (payment reversal + inventory restoration)
- Inventory transfers between stores
- Maintenance status changes affecting machine availability

### 4.4.5 Migration Strategy

**Django Migrations**: Version-controlled database schema changes.

**Workflow**:

1. **Modify Django Model**:
```python
class Drink(models.Model):
    # Add new field
    allergen_info = models.JSONField(null=True, blank=True)
```

2. **Generate Migration**:
```bash
python manage.py makemigrations
```

Outputs: `backend/migrations/0015_drink_allergen_info.py`

3. **Review Generated SQL**:
```bash
python manage.py sqlmigrate backend 0015
```

4. **Apply Migration**:
```bash
python manage.py migrate
```

**Data Migrations** (for transforming existing data):

```python
from django.db import migrations

def populate_allergen_info(apps, schema_editor):
    """
    Populate allergen_info for existing drinks based on ingredients.
    """
    Drink = apps.get_model('backend', 'Drink')
    for drink in Drink.objects.all():
        if 'milk' in drink.add_ins_json:
            drink.allergen_info = {'contains': ['dairy']}
            drink.save()

class Migration(migrations.Migration):
    dependencies = [
        ('backend', '0015_drink_allergen_info'),
    ]
    
    operations = [
        migrations.RunPython(populate_allergen_info),
    ]
```

**Best Practices**:
- **Backwards Compatibility**: Use `null=True` for new fields to avoid breaking existing rows
- **Test on Staging**: Apply migrations to staging database before production
- **Backup Before Migrations**: Automated `pg_dump` before applying migrations in production
- **Idempotent Migrations**: Ensure migrations can be run multiple times safely (e.g., `get_or_create()` instead of `create()`)

**Rollback Strategy**:
```bash
# Rollback to specific migration
python manage.py migrate backend 0014

# Rollback all migrations for an app
python manage.py migrate backend zero
```

**Production Deployment**:
- **Zero-Downtime Migrations**: Use `--no-input` flag and run during maintenance window
- **Long-Running Migrations**: Use `CREATE INDEX CONCURRENTLY` for large tables
- **Monitor Migration Time**: Track migration duration to detect performance issues

---

## 4.5 Database Performance Considerations

### 4.5.1 Indexing Strategy

**Already Defined Indexes** (from Section 4.2):

| Table               | Index Name                        | Type      | Columns                          | Purpose |
|---------------------|-----------------------------------|-----------|----------------------------------|---------|
| `users`             | `idx_users_email`                 | B-tree    | `email`                          | Login lookups |
| `users`             | `idx_users_username`              | B-tree    | `username`                       | Login lookups |
| `preferences`       | `idx_preferences_composite`       | B-tree    | `user_id, preference_type`       | Filter user preferences |
| `orders`            | `idx_orders_user_created`         | B-tree    | `user_id, created_at DESC`       | Order history pagination |
| `orders`            | `idx_orders_store_status`         | B-tree    | `store_id, status`               | Manager dashboard |
| `orders`            | `idx_orders_status_pickup`        | Partial   | `status, pickup_time` (WHERE `status='ready'`) | Cooler management |
| `order_items`       | `idx_order_items_customization_gin` | GIN     | `customization_json`             | Search by customizations |
| `drinks`            | `idx_drinks_name_trgm`            | GIN       | `name` (trigram)                 | Full-text search |
| `drinks`            | `idx_drinks_syrups_gin`           | GIN       | `syrups_json`                    | Search by ingredients |
| `inventory`         | `idx_inventory_low_stock`         | Partial   | `quantity, threshold_level` (WHERE `quantity <= threshold_level`) | Low-stock alerts |
| `machines`          | `idx_machines_service_due`        | B-tree    | `next_service_due`               | Maintenance scheduling |
| `payments`          | `idx_payments_stripe_intent`      | B-tree    | `stripe_payment_intent_id`       | Webhook lookups |
| `qr_codes`          | `idx_qr_codes_unused`             | Partial   | `is_used, expiration_time` (WHERE `is_used=FALSE`) | Active QR codes |

**Monitoring Index Usage**:

```sql
-- Identify unused indexes (candidates for removal)
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan AS index_scans,
    idx_tup_read AS tuples_read,
    idx_tup_fetch AS tuples_fetched
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;
```

**Index Maintenance Schedule**:
- **Weekly**: Update index statistics (`ANALYZE`)
- **Monthly**: Rebuild fragmented indexes (`REINDEX CONCURRENTLY`)
- **Quarterly**: Review slow query log to identify missing index opportunities

### 4.5.2 Query Performance Optimization

**Slow Query Identification**:

Enable `pg_stat_statements` extension:

```sql
CREATE EXTENSION pg_stat_statements;

-- View slowest queries
SELECT
    calls,
    total_exec_time,
    mean_exec_time,
    query
FROM pg_stat_statements
WHERE calls > 100
ORDER BY mean_exec_time DESC
LIMIT 20;
```

**Query Optimization Example**:

**Before** (Slow):
```sql
-- Fetches all orders then filters in application code
SELECT * FROM orders;
```

**After** (Fast):
```sql
-- Filter at database level, only fetch needed columns
SELECT id, user_id, status, total_amount, created_at
FROM orders
WHERE store_id = 5
  AND status IN ('pending', 'preparing')
  AND created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 50;
```

**Performance Gains**:
- Reduced data transfer (only 5 columns vs 12)
- Index usage (`idx_orders_store_status`)
- Early filtering (eliminates completed/cancelled orders)
- Pagination (LIMIT 50 prevents unbounded result sets)

**Django ORM Equivalent**:
```python
orders = Order.objects.filter(
    store_id=5,
    status__in=['pending', 'preparing'],
    created_at__gte=timezone.now() - timedelta(hours=24)
).values('id', 'user_id', 'status', 'total_amount', 'created_at').order_by('-created_at')[:50]
```

### 4.5.3 Connection Pooling

**Problem**: Opening/closing database connections for every request is expensive (TCP handshake, TLS negotiation, authentication).

**Solution**: Connection pooling maintains persistent connections that are reused across requests.

**Implementation**: PgBouncer (lightweight PostgreSQL connection pooler)

**Architecture**:

```
Django App 1 ──┐
Django App 2 ──┼──► PgBouncer (Port 6432) ──► PostgreSQL (Port 5432)
Django App 3 ──┘    (Connection Pool)          (Limited Connections)
```

**PgBouncer Configuration** (`/etc/pgbouncer/pgbouncer.ini`):

```ini
[databases]
codepop_db = host=localhost port=5432 dbname=codepop

[pgbouncer]
listen_addr = 127.0.0.1
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

# Pool settings
pool_mode = transaction          # Release connection after each transaction
max_client_conn = 1000           # Maximum client connections
default_pool_size = 25           # Connections per database
reserve_pool_size = 5            # Reserved connections for emergencies
reserve_pool_timeout = 3         # Seconds before using reserve pool

# Timeouts
server_idle_timeout = 600        # Close idle server connections after 10 min
query_timeout = 60               # Cancel queries taking >60 seconds
```

**Django Settings** (`settings.py`):

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'codepop_db',
        'USER': 'codepop_user',
        'PASSWORD': 'secure_password',
        'HOST': '127.0.0.1',
        'PORT': '6432',  # PgBouncer port, not PostgreSQL direct
        'CONN_MAX_AGE': 600,  # Persist connections for 10 minutes
        'OPTIONS': {
            'connect_timeout': 10,
        }
    }
}
```

**Benefits**:
- **Scalability**: Support 1000+ concurrent clients with only 25-30 PostgreSQL connections
- **Performance**: Eliminate connection overhead (~50ms per new connection)
- **Resilience**: Automatic reconnection on database restarts

**Monitoring**:
```bash
# View PgBouncer statistics
psql -h 127.0.0.1 -p 6432 -U codepop_user -d pgbouncer -c "SHOW POOLS;"
```

### 4.5.4 Load Handling & Scalability

**Projected Load** (per store, peak hours):
- 100 concurrent users
- 50 orders/hour
- 200 database queries/minute

**Nationwide Load** (100 stores):
- 10,000 concurrent users
- 5,000 orders/hour
- 20,000 database queries/minute

**Scaling Strategies**:

**1. Vertical Scaling** (Single Database Server):
- **Hardware**: AWS RDS db.r6g.2xlarge (8 vCPUs, 64 GB RAM, Provisioned IOPS SSD)
- **Limits**: Handles ~50,000 QPS, 500 concurrent connections
- **Cost-Effective**: For initial deployment (<50 stores)

**2. Horizontal Scaling (Read Replicas)**:
- **Primary**: Handles all writes (orders, payments, inventory updates)
- **Replicas (3x)**: Handle read-only queries (menu browsing, order history, analytics)
- **Routing**: Django database router directs reads to replicas

```python
# settings.py
DATABASES = {
    'default': {  # Primary (read-write)
        'ENGINE': 'django.db.backends.postgresql',
        'HOST': 'primary.codepop.rds.amazonaws.com',
        # ... other settings
    },
    'replica1': {  # Read-only
        'ENGINE': 'django.db.backends.postgresql',
        'HOST': 'replica1.codepop.rds.amazonaws.com',
        # ... other settings
    }
}

# Database router
class PrimaryReplicaRouter:
    def db_for_read(self, model, **hints):
        return random.choice(['default', 'replica1'])  # Load balance reads
    
    def db_for_write(self, model, **hints):
        return 'default'  # All writes to primary
```

**3. Sharding** (Future Consideration for >500 stores):
- **Partition by Region**: Separate database per region (A-G)
- **Trade-offs**: Increased complexity, cross-region queries become harder

**Performance Testing**:

```bash
# Apache JMeter load test (simulate 10,000 concurrent users)
jmeter -n -t load_test_plan.jmx -l results.jtl

# Analyze results
awk '{sum+=$2; count++} END {print "Avg Response Time:", sum/count, "ms"}' results.jtl
```

**Target Metrics**:
- **Response Time**: <200ms for 95th percentile
- **Throughput**: >500 requests/second per server
- **Error Rate**: <0.1% under normal load

---

## 4.6 Design Alternatives & Justification

### 4.6.1 Database Technology Alternatives

| Alternative       | Pros | Cons | Verdict |
|-------------------|------|------|---------|
| **MongoDB** (NoSQL) | Flexible schema, horizontal scaling | No ACID transactions, poor for relational data | ❌ Rejected: CodePop requires strong transaction guarantees for payments/orders |
| **MySQL**         | Widely used, good performance | Weaker JSON support, less advanced features | ❌ Partially: PostgreSQL's JSONB and indexing superior |
| **SQLite**        | Serverless, simple setup | Single-writer bottleneck, no replication | ❌ Rejected: Insufficient for production multi-user environment |

### 4.6.2 Normalization vs. Denormalization

| Data              | Approach      | Justification |
|-------------------|---------------|---------------|
| **Preferences**   | Normalized (separate table) | Enables indexing, querying; prevents 1NF violations |
| **Drink Ratings** | Denormalized (`rating_avg` in `drinks`) | Calculating on-the-fly too expensive for menu display; updated via trigger |
| **Order Total**   | Denormalized (`total_amount` in `orders`) | Caching prevents recalculation from order_items; historical accuracy |
| **Ingredient Lists** | Semi-normalized (JSONB in `drinks` + junction table for inventory) | Flexibility for user-created drinks; structured tracking for inventory deduction |

### 4.6.3 JSONB vs. Separate Tables

**Use Case**: Storing drink customizations (syrups, add-ins)

| Approach          | Pros | Cons | Decision |
|-------------------|------|------|----------|
| **JSONB Fields**  | Flexible schema, compact storage, GIN indexing | Harder to enforce constraints, less normalized | ✅ **Selected** for `drinks.syrups_json` (variable ingredients) |
| **Separate Tables** (`drink_syrups`, `drink_add_ins`) | Fully normalized, foreign key integrity | Over-engineering for user-created drinks, schema rigidity | ❌ Rejected for user drinks; ✅ Used for `drink_ingredients` (inventory tracking) |

### 4.6.4 Surrogate vs. Natural Keys

| Table             | Primary Key   | Justification |
|-------------------|---------------|---------------|
| **users**         | Surrogate (`id`) | Email/username can change; integer keys faster for joins |
| **qr_codes**      | Surrogate (`id`) | `code_data` is UUID (performance overhead for primary key) |
| **drink_ingredients** | Surrogate (`id`) vs. Composite (`drink_id, inventory_id`) | Surrogate chosen for ORM simplicity; UNIQUE constraint on composite |

---

## 4.7 Key Takeaways & Implementation Guidelines

### 4.7.1 Database Design Principles Applied

1. **Normalization First, Denormalization When Justified**: All tables meet 3NF; controlled denormalization only for performance-critical aggregates
2. **Index Strategically**: Every foreign key indexed; composite indexes for common query patterns
3. **Constrain Rigorously**: CHECK constraints, foreign keys, and unique constraints enforce data integrity at database level
4. **Plan for Scale**: Connection pooling, read replicas, and query optimization built from the start
5. **Security by Design**: No sensitive payment data stored; passwords hashed; encryption for PII

### 4.7.2 Testing & Validation Checklist

- [ ] All migrations tested on staging database before production
- [ ] Index usage verified via `pg_stat_user_indexes`
- [ ] Slow queries identified and optimized (< 100ms for common queries)
- [ ] Transaction safety tested (rollback scenarios)
- [ ] Load testing completed (10,000 concurrent users, 500 req/s)
- [ ] Backup/restore procedures validated
- [ ] Foreign key constraints prevent orphaned records
- [ ] Database monitoring configured (slow query log, connection pool stats)

### 4.7.3 Future Enhancements

- **Full-Text Search**: Implement PostgreSQL `tsvector` + `tsquery` for advanced drink search
- **Geospatial Queries**: Optimize store lookup using PostGIS extension for nearest-store calculations
- **Data Warehousing**: ETL pipeline to analytics database (Redshift/BigQuery) for historical reporting
- **Multi-Tenancy**: Partition tables by region for improved performance in nationwide deployment

---

**End of Section 4: Database Design & Data Access Layer**

---

#### Section 5: Security, Performance & Monitoring – Low-Level Design

##### Executive Summary


1. **Security Architecture** – Multi-role RBAC (user, manager, admin, super admin, logistics manager, repair staff), authentication flows, decentralized inter-store communication security, and token lifecycle management
2. **Security Controls** – Mitigation strategies for 7 OWASP-aligned threats plus decentralized architecture risks (SQL injection, XSS, CSRF, auth bypass, data exposure, IDOR, misconfiguration, service discovery spoofing, man-in-the-middle attacks)
3. **Data Protection** – Field-level encryption, key rotation, geolocation lifecycle (24-hour deletion), sensitive data handling, and inter-store encryption
4. **Compliance** – GDPR (right to erasure), CCPA (opt-out), PCI-DSS (Stripe), AI safety monitoring (Claude), and fairness monitoring (Scikit-Learn recommendations)
5. **Performance** – Database optimization, async processing, caching strategies, decentralized synchronization, Firebase FCM integration, and horizontal scaling strategies
6. **Monitoring** – Observability stack architecture, metrics, thresholds, alerting for multi-store operations, and external dependency health checks
7. **Testing** – Test pyramid, coverage targets, CI/CD integration, and decentralized system testing strategies

**Implementation Order**: 5.1 → 5.2 → 5.3 → 5.4 → 5.5 → 5.6 → 5.7 (each section depends on previous work).

---

##### 5.1 Security Architecture

###### Authentication & Authorization Design

**Goal**: Implement secure user authentication with role-based access control (RBAC).

**User Model Structure**
```
User
├── id (primary key)
├── username (unique)
├── email (unique, encrypted at rest)
├── password_hash (Argon2id)
├── role (choice: super, manager, user)
├── is_active (boolean, for soft-deletes)
├── last_login (timestamp)
├── created_at (timestamp)
└── audit_trail (foreign key to AuditLog)
```

**Django Middleware Stack** (in order)
```
SecurityMiddleware
  ↓ (enforce HTTPS, set security headers)
SessionMiddleware
  ↓ (manage session cookies)
AuthenticationMiddleware
  ↓ (attach user to request.user)
MessageMiddleware
  ↓ (session-based messages)
CsrfViewMiddleware
  ↓ (CSRF token validation)
CustomRateLimitMiddleware
  ↓ (rate limiting for brute-force protection)
```

**RBAC Permission Matrix** (Updated for Multi-Store, Multi-Role System)
```
Role:             super    admin   manager  logistics  repair  user
├── Users
│  ├── Create      ✓        ✓        ✗        ✗         ✗      ✗
│  ├── Read        ✓        ✓(own)   ✗        ✗         ✗      ✓(own)
│  ├── Update      ✓        ✓(own)   ✗        ✗         ✗      ✓(own)
│  ├── Delete      ✓        ✓(own)   ✗        ✗         ✗      ✗
│  └── Grant Perm  ✓        ✓        ✗        ✗         ✗      ✗
│
├── Orders
│  ├── Create      ✓        ✓        ✓        ✗         ✗      ✓
│  ├── Read        ✓        ✓(own)   ✓(own)   ✗         ✗      ✓(own)
│  ├── Update      ✓        ✓(own)   ✓(own)   ✗         ✗      ✓(own)
│  └── Cancel      ✓        ✓(own)   ✓(own)   ✗         ✗      ✓(own)
│
├── Inventory
│  ├── View        ✓        ✓        ✓        ✓         ✗      ✗
│  ├── Update      ✓        ✓        ✓        ✓         ✗      ✗
│  └── Adjust      ✓        ✓        ✓        ✓         ✗      ✗
│
├── Supply Hub
│  ├── View        ✓        ✗        ✗        ✓(region) ✗      ✗
│  ├── Coordinate  ✓        ✗        ✗        ✓(region) ✗      ✗
│  └── Forecast    ✓        ✗        ✗        ✓(region) ✗      ✗
│
├── Machines
│  ├── View        ✓        ✗        ✗        ✗         ✓      ✗
│  ├── Update      ✓        ✗        ✗        ✗         ✓      ✗
│  └── Schedule    ✓        ✗        ✗        ✗         ✓      ✗
│
├── Reports
│  ├── View        ✓        ✓        ✓        ✓(region) ✓      ✗
│  └── Export      ✓        ✓        ✓        ✓(region) ✓      ✗
│
└── AI Features
   ├── Claude      ✓        ✓        ✓        ✓         ✓      ✓
   ├── Scikit-Learn ✓       ✗        ✓        ✓         ✗      ✗
   └── Gemini      ✓        ✗        ✗        ✗         ✗      ✗
```

**New Roles Introduced**:
- **Super Admin**: System-wide access across all stores, can manage all regions
- **Admin**: Store-specific user/account management within assigned store
- **Logistics Manager**: Regional supply coordination, demand forecasting, cross-store inventory transfers
- **Repair Staff**: Machine maintenance scheduling, technician routing, status updates

**Token Lifecycle Design**

For **web clients** (React): Django sessions
- Session cookie stored in browser (HttpOnly, Secure, SameSite=Strict)
- Server-side session store (PostgreSQL or Redis)
- No token required in headers

For **mobile clients** (Expo): JWT tokens
```
AccessToken (JWT)
├── Payload: {user_id, role, email, exp: 15min}
├── Signature: HS256 with SECRET_KEY
└── Usage: Authorization header (Bearer token)

RefreshToken (opaque)
├── Stored: HttpOnly cookie or secure storage
├── Lifetime: 7 days
└── Purpose: Obtain new access token
```

**Implementation Pattern**
```python
# Authentication flow
class LoginView(APIView):
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        
        # Validate input (rate limit, check if user exists)
        if not validate_input(username, password):
            log_failed_attempt(request.ip, username)
            return Response({'error': 'Invalid input'}, status=401)
        
        # Authenticate user
        user = User.objects.filter(username=username).first()
        if not user or not check_password(password, user.password_hash):
            log_failed_attempt(request.ip, username)
            return Response({'error': 'Invalid credentials'}, status=401)
        
        # Generate tokens (JWT for mobile, session for web)
        if request.headers.get('X-Client') == 'mobile':
            access_token = generate_jwt_token(user, expires_in=900)  # 15 min
            refresh_token = generate_jwt_token(user, expires_in=604800)  # 7 days
            return Response({
                'access_token': access_token,
                'refresh_token': refresh_token
            })
        else:
            create_session(request, user)
            return Response({'status': 'authenticated'})
```

**RBAC Authorization Decorator**
```python
def require_role(*allowed_roles):
    def decorator(view_func):
        def wrapper(request, *args, **kwargs):
            if not request.user.is_authenticated:
                log_unauthorized_access(request.path, 'not_authenticated')
                return Response({'error': 'Unauthorized'}, status=401)
            
            if request.user.role not in allowed_roles:
                log_unauthorized_access(request.user.id, request.path)
                return Response({'error': 'Forbidden'}, status=403)
            
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator

# Usage
@require_role('super', 'manager')
def delete_user(request, user_id):
    # Only super & manager can delete users
    user = User.objects.get(id=user_id)
    user.delete()
    return Response(status=204)
```

**Verification**
```python
# Test: Unauthorized user cannot access restricted endpoint
def test_rbac_unauthorized_access():
    user = create_test_user(role='user')
    response = client.delete(
        '/api/users/123',
        HTTP_AUTHORIZATION=f'Bearer {get_token(user)}'
    )
    assert response.status_code == 403

# Test: Correct role can access endpoint
def test_rbac_authorized_access():
    user = create_test_user(role='manager')
    response = client.delete(
        '/api/users/123',
        HTTP_AUTHORIZATION=f'Bearer {get_token(user)}'
    )
    assert response.status_code in [200, 204]
```

---

##### 5.2 Security Controls & Risk Mitigation

###### Threat Model Matrix (Updated for Decentralized Architecture)

| Threat                                                       | Risk                                                                                | Mitigation                                                                                                                                     | Detection                                                                                                      | Verification                                                                             |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **1. SQL Injection**                                         | Attacker executes malicious SQL queries                                             | Use Django ORM (parameterized queries); no raw SQL; input validation via serializers; validate CSV imports                                     | Code review for `.raw()`, `.execute()`; static analysis tool (bandit); CSV schema validation                   | Test: inject SQL in search parameter; confirm query fails safely                         |
| **2. Cross-Site Scripting (XSS)**                            | Attacker injects malicious JS in forms/comments                                     | React auto-escapes strings; DRF serializer validation; CSP headers; Claude prompt injection prevention                                         | Code review for `dangerouslySetInnerHTML`; CSP violation logs; prompt validation logs                          | Test: submit `<script>alert('xss')</script>` in text field; confirm escaped              |
| **3. Cross-Site Request Forgery (CSRF)**                     | Attacker tricks user into making unwanted request                                   | Django CSRF middleware + token; SameSite cookies; HTTPS only; digital signatures for inter-store messages                                      | CSRF token present in POST forms; SameSite cookie set; signature verification logs                             | Test: POST without CSRF token; confirm 403 error                                         |
| **4. Authentication Bypass**                                 | Attacker gains access without valid credentials                                     | Strong password policy (12+ chars); rate limiting (5 attempts → 15min lockout); no default credentials                                         | Failed login attempts logged; account lockout tracking; monitor auth logs                                      | Test: brute-force login endpoint; confirm lockout after 5 attempts                       |
| **5. Sensitive Data Exposure**                               | Payment/email/location/geolocation data leaked                                      | Encryption at rest (AES-256); TLS 1.3 in transit; geolocation auto-deleted 24hrs; PCI-DSS via Stripe; never log passwords                      | Data access audit log; encryption key access control; TLS certificate validation; geolocation purge logs       | Test: verify email/geolocation encrypted in DB; confirm TLS 1.3 only                     |
| **6. Insecure Direct Object References (IDOR)**              | User accesses another user's data or cross-store data                               | Authorization check on every endpoint; validate user context; filter queries by user + store; region-based access control                      | Code review for missing auth checks; test coverage for access control; cross-store isolation tests             | Test: user A tries to access user B's order; store A tries to access store B's inventory |
| **7. Security Misconfiguration**                             | Secrets exposed; weak defaults; unpatched dependencies                              | Environment variables for secrets; secure defaults in settings.py; dependency scanning                                                         | Pre-commit hook (detect-secrets); dependency audit (Snyk); security audit                                      | Test: verify SECRET_KEY not in code; check .env in .gitignore                            |
| **8. Decentralized Service Discovery Spoofing**              | Fake store registers itself or intercepts peer discovery                            | Digital signatures (PKI) for all inter-store messages; certificate pinning for regional hubs; nonce-based handshakes                           | Signature verification on all incoming messages; failed verification logging; peer certificate validation logs | Test: attempt to register fake store; confirm signature verification fails               |
| **9. Man-in-the-Middle (MITM) on Inter-Store Communication** | Attacker intercepts store-to-store data (inventory, orders, supply)                 | TLS 1.3 with certificate pinning; cryptographic signatures on sensitive messages; VPN for critical links                                       | Signature verification logs; TLS handshake failures; certificate validation events                             | Test: attempt to intercept signed message; confirm validation fails                      |
| **10. Supply Chain Data Injection (CSV Imports)**            | Malicious CSV files containing crafted SQL/formulas                                 | CSV schema validation; data type enforcement; sanitize numeric/date fields; max file size limits                                               | CSV parsing error logs; data validation failure counts; import audit trail                                     | Test: upload CSV with SQL injection payload; confirm sanitization                        |
| **11. Claude Prompt Injection**                              | Attacker tricks Claude API into revealing system info or generating harmful content | Input validation (no system prompts in user input); sanitize complaint text; rate limit requests; response timeout (10s); log all interactions | Claude API error logs; timeout events; response validation failures; interaction audit log                     | Test: submit malicious prompt; confirm Claude doesn't execute system commands            |
| **12. AI Fairness & Bias (Scikit-Learn)**                    | Recommendation model discriminates based on protected attributes                    | Train only on anonymized data; remove PII before model training; fairness monitoring; bias detection; human review of outputs                  | Model training logs showing PII removal; fairness metrics per demographic; bias alerts                         | Test: verify no user IDs in training data; confirm fairness metrics within threshold     |

###### Implementation Patterns

**Input Validation**
```python
# Use DRF serializers for validation
class UserSerializer(serializers.ModelSerializer):
    email = serializers.EmailField()
    password = serializers.CharField(
        min_length=12,
        validators=[
            validators.validate_password
        ]
    )
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'role']
    
    def validate_username(self, value):
        # Reject special characters, SQL keywords
        if not value.replace('_', '').isalnum():
            raise serializers.ValidationError(
                "Username must be alphanumeric"
            )
        return value
```

**Authorization Check Pattern**
```python
# Check user owns resource before accessing
class OrderDetailView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, order_id):
        order = Order.objects.get(id=order_id)
        
        # CRITICAL: Verify user owns order or is admin
        if order.user_id != request.user.id and \
           request.user.role not in ['super', 'manager']:
            log_unauthorized_access(
                request.user.id,
                'order_access',
                order_id
            )
            raise PermissionDenied()
        
        return Response(OrderSerializer(order).data)
```

**Structured Logging**
```python
import json
import logging

logger = logging.getLogger(__name__)

def log_failed_attempt(user_id, ip_address, reason):
    logger.warning(json.dumps({
        'event': 'authentication_failed',
        'user_id': user_id,
        'ip': ip_address,
        'reason': reason,
        'timestamp': utcnow().isoformat(),
        'request_id': get_request_id()
    }))

def log_unauthorized_access(user_id, resource, action):
    logger.warning(json.dumps({
        'event': 'unauthorized_access',
        'user_id': user_id,
        'resource': resource,
        'action': action,
        'timestamp': utcnow().isoformat()
    }))
```

---

##### 5.3 Data Protection

###### Encryption at Rest

**Field-Level Encryption** (use `django-cryptography`)
```python
from django_cryptography.fields import EncryptedCharField
from django_cryptography.fields import EncryptedDecimalField

class User(models.Model):
    email = EncryptedCharField(max_length=255)
    phone = EncryptedCharField(max_length=20, null=True)
    geolocation_lat = EncryptedDecimalField(null=True)
    geolocation_lng = EncryptedDecimalField(null=True)
    password_hash = models.CharField(max_length=255)
```

**Key Rotation Strategy**
```python
# Quarterly key rotation with versioning
from django.core.management.base import BaseCommand

class Command(BaseCommand):
    def handle(self, *args, **options):
        """
        1. Generate new master key (new version)
        2. Store old key as inactive
        3. Re-encrypt all fields with new key (background job)
        4. Archive old key with audit timestamp
        5. Destroy old key after 90 days
        """
        old_version = get_current_key_version()
        new_version = old_version + 1
        new_key = generate_key(version=new_version)
        
        store_key(new_key, version=new_version, status='active')
        
        # Async task: re-encrypt all EncryptedFields
        reencrypt_all_fields.delay(
            old_version=old_version,
            new_version=new_version
        )
        
        logger.info(json.dumps({
            'event': 'key_rotation_initiated',
            'old_version': old_version,
            'new_version': new_version,
            'timestamp': utcnow().isoformat()
        }))
```

###### Encryption in Transit

**Django Settings**
```python
# settings.py
SECURE_SSL_REDIRECT = True  # Force HTTPS
SESSION_COOKIE_SECURE = True  # Only send over HTTPS
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# CSP Headers
SECURE_CONTENT_SECURITY_POLICY = {
    'default-src': ("'self'",),
    'script-src': ("'self'", "'unsafe-inline'"),
    'style-src': ("'self'", "'unsafe-inline'"),
}
```

###### Sensitive Data Lifecycle (Updated for New Features)

| Data Type                   | Storage              | Encryption                         | Retention            | Deletion                            | Special Handling                                       |
| --------------------------- | -------------------- | ---------------------------------- | -------------------- | ----------------------------------- | ------------------------------------------------------ |
| **Payment**                 | Stripe token only    | N/A (Stripe handles)               | Until order archived | Delete with order (1 year)          | PCI-DSS compliant; never store card numbers            |
| **Email**                   | User table           | AES-256 (EncryptedCharField)       | User lifetime        | Delete on user erasure request      | GDPR/CCPA: right to erasure                            |
| **Geolocation**             | Location table       | AES-256                            | 24 hours post-order  | Auto-purge Celery task              | GDPR: explicit opt-in required; 24hr deletion enforced |
| **Password**                | User table           | Argon2id hash                      | User lifetime        | Delete on password change           | Argon2id (not PBKDF2); never log plaintext             |
| **Audit logs**              | AuditLog table       | Plaintext (sensitive events only)  | 90 days              | Auto-purge after retention          | Track all user actions; signed to prevent tampering    |
| **Inter-Store Messages**    | Regional store nodes | TLS 1.3 + digital signatures (PKI) | Until processed      | Auto-delete after sync confirmation | Cryptographically signed; nonce prevents replay        |
| **CSV Import Data**         | Temporary table      | AES-256 for sensitive fields       | During import only   | Delete after validation             | Schema validation; no raw data storage                 |
| **Machine Status Data**     | Maintenance table    | Unencrypted (low sensitivity)      | Until replaced       | Archive on machine retirement       | Timestamps and repair staff audit trail                |
| **Device Tokens (FCM)**     | User devices table   | Secure tokens                      | Until app uninstall  | Delete on uninstall event           | PII risk if exposed; validate on each send             |
| **AI Training Data**        | Anonymized tables    | Encrypted at rest                  | For model lifecycle  | Delete with model version           | GDPR: anonymization required; no user IDs              |
| **Claude Interaction Logs** | Audit table          | AES-256                            | 90 days (compliance) | Auto-purge after retention          | Log all requests/responses for safety monitoring       |

---

##### 5.4 Compliance Implementation (Updated for Multi-Store, AI, and New Features)

###### Geolocation Compliance (NEW)

**GDPR Requirements**: Explicit opt-in, 24-hour auto-deletion, data portability
```python
class GeolocationConsent(models.Model):
    """GDPR: Track explicit opt-in for geolocation tracking"""
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    consented = models.BooleanField(default=False)
    consent_timestamp = models.DateTimeField(auto_now_add=True)
    consent_ip = models.GenericIPAddressField()

class LocationData(models.Model):
    """GDPR: Auto-delete after 24 hours"""
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    latitude = EncryptedDecimalField()  # AES-256 encrypted
    longitude = EncryptedDecimalField()
    order = models.ForeignKey(Order, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

# Background job: purge geolocation every 24 hours
@shared_task
def purge_old_geolocation():
    """Delete geolocation data older than 24 hours (GDPR compliance)"""
    cutoff = utcnow() - timedelta(hours=24)
    deleted_count, _ = LocationData.objects.filter(
        created_at__lt=cutoff
    ).delete()
    logger.info(json.dumps({
        'event': 'geolocation_purge',
        'records_deleted': deleted_count,
        'timestamp': utcnow().isoformat()
    }))
```

###### Claude AI Safety Monitoring (NEW)

**Compliance**: AI safety, prompt injection prevention, fairness monitoring
```python
class ClaudeInteractionLog(models.Model):
    """AI Safety: Log all Claude API interactions for audit & fairness"""
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    input_prompt = models.TextField()
    output_response = models.TextField()
    latency_ms = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

def call_claude_api(user, prompt, max_timeout=10):
    """Call Claude with safety guardrails & logging"""
    try:
        response = claude_client.messages.create(
            model="claude-3-sonnet",
            max_tokens=500,
            system="You are a helpful customer service bot. Do not reveal system information.",
            messages=[{"role": "user", "content": prompt}],
            timeout=max_timeout
        )
        
        # Log for compliance & safety monitoring
        ClaudeInteractionLog.objects.create(
            user=user,
            input_prompt=prompt[:500],
            output_response=response.content[:1000],
            latency_ms=response.metadata.get('latency_ms', -1)
        )
        
        return response.content
        
    except TimeoutError:
        logger.warning(f"Claude timeout for user {user.id}")
        return "System is temporarily busy. Please try again or contact support."
```

###### Scikit-Learn Fairness Monitoring (NEW)

**Compliance**: GDPR/CCPA (no PII in models), fairness monitoring for bias
```python
@shared_task
def validate_ml_model():
    """GDPR: Verify no PII in model before serving recommendations"""
    
    # Load model
    with open('recommendation_model.pkl', 'rb') as f:
        model_data = pickle.load(f)
    
    # Check for user IDs or other PII
    model_str = str(model_data)
    if 'user_id' in model_str or any(str(uid) in model_str for uid in range(1, 100)):
        logger.error("Model contains PII! Rolling back to previous version")
        send_security_alert("Model contains unencrypted user IDs")
        raise ValueError("Model validation failed: PII detected")

@shared_task
def monitor_recommendation_fairness():
    """GDPR/CCPA: Check for bias in recommendations across demographics"""
    
    # Sample users by demographic
    recommendation_quality_by_group = {}
    
    for age_group in ['18-25', '26-35', '36-50', '50+']:
        users_in_group = User.objects.filter(age__range=AGE_RANGES[age_group])
        qualities = []
        
        for user in users_in_group:
            recs = get_recommendations(user.id)
            avg_rating = sum(rec['rating'] for rec in recs) / len(recs) if recs else 0
            qualities.append(avg_rating)
        
        recommendation_quality_by_group[age_group] = average(qualities)
    
    # Check for fairness (max variance < 10%)
    min_quality = min(recommendation_quality_by_group.values())
    max_quality = max(recommendation_quality_by_group.values())
    variance = (max_quality - min_quality) / max_quality if max_quality > 0 else 0
    
    if variance > 0.1:
        logger.warning(f"Fairness variance detected: {variance:.2%}")
        send_alert_to_ml_team("Fairness check failed; review training data for bias")
```

###### Firebase Cloud Messaging (FCM) Compliance (NEW)

**Compliance**: CAN-SPAM (opt-out for marketing), consent logging
```python
class PushNotificationPreference(models.Model):
    """Track FCM opt-in/opt-out per notification type"""
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    order_updates = models.BooleanField(default=True)  # Critical: always on
    marketing = models.BooleanField(default=False)  # CAN-SPAM: requires opt-in
    
    class Meta:
        indexes = [
            models.Index(fields=['user']),
        ]

def send_push_notification(user_id, message_type, **kwargs):
    """Send FCM notification respecting user preferences"""
    user = User.objects.get(id=user_id)
    prefs = user.pushnotificationpreference
    
    # Check consent
    if message_type == 'marketing' and not prefs.marketing:
        logger.info(f"Skipping marketing notification for user {user_id} (not opted in)")
        return
    
    # Get device token
    device = UserDevice.objects.filter(user=user).first()
    if not device:
        logger.warning(f"No device token for user {user_id}")
        return
    
    try:
        # Send via FCM
        response = firebase_messaging.send(
            messaging.Message(
                token=device.fcm_token,
                data={'type': message_type, **kwargs}
            )
        )
        logger.info(f"FCM sent to user {user_id}: {response}")
        
    except firebase_admin.exceptions.InvalidArgumentError as e:
        # Invalid token: remove it
        logger.warning(f"Invalid FCM token for user {user_id}: {str(e)}")
        device.delete()
```

### Decentralized System Compliance (NEW)

**Inter-Store Message Signing** (prevent spoofing, ensure authenticity)
```python
import hashlib
import hmac
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import hashes, serialization

class InterStoreMessage(models.Model):
    """Signed messages between stores for inventory/order sync"""
    sender_store_id = models.CharField(max_length=50)
    recipient_store_id = models.CharField(max_length=50)
    message_type = models.CharField(max_length=50)  # 'inventory_sync', 'order_update', etc.
    payload = models.JSONField()  # Encrypted data
    signature = models.BinaryField()  # HMAC-SHA256 signature
    nonce = models.CharField(max_length=64)  # Prevent replay attacks
    created_at = models.DateTimeField(auto_now_add=True)
    processed = models.BooleanField(default=False)

def sign_inter_store_message(sender_store_id, payload, private_key):
    """Sign message with store's private key"""
    # Create JSON payload
    message_json = json.dumps(payload, sort_keys=True)
    
    # Sign with HMAC-SHA256
    signature = hmac.new(
        private_key.encode(),
        message_json.encode(),
        hashlib.sha256
    ).digest()
    
    # Generate nonce to prevent replay attacks
    nonce = secrets.token_hex(32)
    
    return {
        'payload': payload,
        'signature': signature.hex(),
        'nonce': nonce,
        'timestamp': utcnow().isoformat()
    }

def verify_inter_store_message(message, sender_store_id, public_key):
    """Verify message signature & nonce"""
    
    # Verify signature
    expected_signature = hmac.new(
        public_key.encode(),
        json.dumps(message['payload'], sort_keys=True).encode(),
        hashlib.sha256
    ).digest()
    
    if not hmac.compare_digest(expected_signature.hex(), message['signature']):
        logger.error(f"Signature verification failed from store {sender_store_id}")
        return False
    
    # Check nonce (prevent replay)
    if InterStoreMessage.objects.filter(nonce=message['nonce']).exists():
        logger.error(f"Duplicate nonce from store {sender_store_id}")
        return False
    
    # Check timestamp (message not older than 5 minutes)
    msg_time = datetime.fromisoformat(message['timestamp'])
    if (utcnow() - msg_time).total_seconds() > 300:
        logger.error(f"Stale message from store {sender_store_id}")
        return False
    
    return True
```

### GDPR Compliance

**Data Subject Access Request (DSAR) Endpoint**
```python
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

class GDPRDataExportView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Export user's personal data as JSON (right to access)
        """
        user = request.user
        data = {
            'user': {
                'id': user.id,
                'email': user.email,
                'created_at': user.created_at.isoformat()
            },
            'orders': [
                {
                    'id': o.id,
                    'total': float(o.total),
                    'created_at': o.created_at.isoformat()
                }
                for o in user.orders.all()
            ],
            'preferences': list(
                user.preferences.values('drink_id', 'rating')
            ),
            'audit_log': list(
                AuditLog.objects.filter(user=user).values(
                    'event', 'timestamp'
                )
            )
        }
        return Response(data)
```

**Right to Erasure (Deletion) Flow**
```python
class GDPRDeleteUserView(APIView):
    permission_classes = [IsAuthenticated]
    
    def delete(self, request):
        """
        Delete user and all associated data (right to erasure)
        """
        user = request.user
        user_id = user.id
        
        # 1. Log deletion request
        AuditLog.objects.create(
            user_id=user_id,
            event='user_deletion_requested',
            timestamp=utcnow()
        )
        
        # 2. Async task: cascade delete
        async_delete_user.delay(user_id=user_id)
        
        return Response({'status': 'deletion_in_progress'})

@shared_task
def async_delete_user(user_id):
    """Delete all user data"""
    user = User.objects.get(id=user_id)
    
    # Cascade delete with audit trail
    orders = Order.objects.filter(user=user)
    for order in orders:
        AuditLog.objects.create(
            event='order_deleted',
            user_id=user_id,
            timestamp=utcnow()
        )
        order.delete()
    
    preferences = Preference.objects.filter(user=user)
    preferences.delete()
    
    user.delete()
    AuditLog.objects.create(
        event='user_deleted',
        user_id=user_id,
        timestamp=utcnow()
    )
```

**Consent Management**
```python
class ConsentLog(models.Model):
    CONSENT_TYPES = [
        ('marketing', 'Marketing'),
        ('analytics', 'Analytics'),
        ('third_party', 'Third Party'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    consent_type = models.CharField(max_length=20, choices=CONSENT_TYPES)
    given = models.BooleanField()
    timestamp = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField()

# Every opt-in/opt-out is audited
def update_marketing_consent(user, consent):
    ConsentLog.objects.create(
        user=user,
        consent_type='marketing',
        given=consent,
        ip_address=get_client_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT')
    )
```

### CCPA Compliance

Similar to GDPR with CA-specific language:
- **Opt-out mechanism**: Add `do_not_sell` boolean to User model
- **Data disclosure**: Implement same DSAR endpoint with CCPA terminology
- **Verification**: Annual audit of opt-out requests

### PCI-DSS Status

**Compliance Statement**:
- We do NOT store, process, or transmit credit card data
- All payments processed via Stripe (PCI-DSS Level 1 certified)
- We store only Stripe payment tokens (low risk)
- **Annual attestation**: Update yearly with Stripe's compliance certification

---

## 5.5 Performance Architecture

### Database Query Optimization

**Indexing Strategy**
```python
class User(models.Model):
    username = models.CharField(
        max_length=150,
        db_index=True
    )
    email = EncryptedCharField(db_index=True)
    role = models.CharField(
        max_length=20,
        choices=[...],
        db_index=True
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True
    )
    
    class Meta:
        indexes = [
            models.Index(fields=['email', 'is_active']),
            models.Index(fields=['-created_at']),
        ]

class Order(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        db_index=True
    )
    status = models.CharField(max_length=20, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
```

**Query Optimization Patterns**
```python
# BAD: N+1 queries
orders = Order.objects.all()
for order in orders:
    print(order.user.email)  # One query per order!

# GOOD: Select related (foreign key)
orders = Order.objects.select_related('user')

# GOOD: Prefetch related (reverse FK)
users = User.objects.prefetch_related('orders')

# GOOD: Annotate for counts
users = User.objects.annotate(
    order_count=Count('orders')
)

# GOOD: Filter in database, not Python
recent_orders = Order.objects.filter(
    created_at__gte=utcnow() - timedelta(days=7)
)
```

**Connection Pooling** (pgbouncer)
```
# pgbouncer.ini
[databases]
codepop_database = \
    host=localhost \
    port=5432 \
    dbname=codepop_database

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 20
min_pool_size = 10
reserve_pool_size = 5
server_idle_timeout = 600
```

### Async Task Processing

**Payment Processing with Retries**
```python
from celery import shared_task
from celery.utils.log import get_task_logger
import stripe

logger = get_task_logger(__name__)

@shared_task(
    autoretry_for=(stripe.error.StripeError,),
    retry_kwargs={'max_retries': 3},
    bind=True
)
def process_payment(self, order_id):
    """
    Retry logic: exponential backoff (5s → 10s → 20s)
    """
    order = Order.objects.get(id=order_id)
    
    try:
        charge = stripe.Charge.create(
            amount=int(order.total * 100),
            currency='usd',
            source=order.stripe_token,
            idempotency_key=f"order_{order_id}"
        )
        
        order.status = 'paid'
        order.stripe_charge_id = charge.id
        order.save()
        
        logger.info(f"Payment succeeded for order {order_id}")
        
    except stripe.error.StripeError as exc:
        logger.error(f"Payment failed for order {order_id}: {str(exc)}")
        # Celery will retry automatically
        raise self.retry(exc=exc, countdown=5 * (2 ** self.request.retries))
```

### Caching Strategy

**Redis Caching with TTL**
```python
from django.views.decorators.cache import cache_page
from django.core.cache import cache

# Cache view output (60 seconds)
@cache_page(60)
def get_trending_drinks(request):
    return Response(Drink.objects.filter(trending=True).values())

# Cache in code (1 hour)
def get_user_recommendations(user_id):
    cache_key = f'recommendations:{user_id}'
    
    # Try cache first
    recommendations = cache.get(cache_key)
    if recommendations:
        return recommendations
    
    # Compute if not cached
    recommendations = ml_model.recommend(user_id)
    cache.set(cache_key, recommendations, timeout=3600)
    
    return recommendations

# Invalidate on update
def update_user_preference(user, preference):
    preference.save()
    cache.delete(f'recommendations:{user.id}')
```

### Concurrent Order Processing

**Optimistic Locking**
```python
from django.db.models import F

class Inventory(models.Model):
    drink = models.ForeignKey(Drink, on_delete=models.CASCADE)
    quantity = models.IntegerField()
    version = models.IntegerField(default=0)

def place_order(user, drink_id, quantity):
    """
    Update inventory with optimistic locking
    """
    inventory = Inventory.objects.get(drink_id=drink_id)
    original_version = inventory.version
    
    if inventory.quantity < quantity:
        raise ValueError("Out of stock")
    
    # Try to update
    updated = Inventory.objects.filter(
        id=inventory.id,
        version=original_version
    ).update(
        quantity=F('quantity') - quantity,
        version=F('version') + 1
    )
    
    if not updated:
        raise ValueError("Concurrent modification: retry order")
    
    # Create order
    Order.objects.create(
        user=user,
        drink_id=drink_id,
        quantity=quantity
    )
```

### External Service Integration Performance (NEW)

**Stripe Payment Processing**
```python
@shared_task(
    autoretry_for=(stripe.error.StripeError,),
    retry_kwargs={'max_retries': 3},
    bind=True
)
def process_stripe_payment(self, order_id):
    """Process payment with retry logic & webhook fallback"""
    order = Order.objects.get(id=order_id)
    
    try:
        charge = stripe.Charge.create(
            amount=int(order.total * 100),
            currency='usd',
            source=order.stripe_token,
            idempotency_key=f"order_{order_id}"  # Prevent double-charging
        )
        
        order.payment_status = 'completed'
        order.stripe_charge_id = charge.id
        order.save()
        
    except stripe.error.RateLimitError:
        # Stripe is rate limiting: retry with exponential backoff
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))
    
    except stripe.error.APIError as exc:
        logger.error(f"Stripe API error for order {order_id}: {str(exc)}")
        raise self.retry(exc=exc, countdown=5 * (2 ** self.request.retries))

# Webhook handler: verify Stripe signature & update order
@csrf_exempt
def stripe_webhook(request):
    """Handle Stripe webhook (payment confirmation)"""
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
    
    # Verify Stripe webhook signature
    try:
        event = stripe.Webhook.construct_event(
            payload,
            sig_header,
            os.getenv('STRIPE_WEBHOOK_SECRET')
        )
    except ValueError:
        return JsonResponse({'status': 'invalid'}, status=400)
    except stripe.error.SignatureVerificationError:
        return JsonResponse({'status': 'invalid'}, status=400)
    
    # Handle payment confirmation
    if event['type'] == 'charge.succeeded':
        charge = event['data']['object']
        order = Order.objects.get(stripe_charge_id=charge.id)
        order.payment_status = 'confirmed'
        order.save()
        
        # Send FCM notification
        send_push_notification(order.user_id, 'order_ready')
    
    return JsonResponse({'status': 'success'})
```

**Firebase Cloud Messaging (FCM) Integration**
```python
import firebase_admin
from firebase_admin import messaging

def send_order_ready_notification(order_id):
    """Send FCM notification when order is ready"""
    order = Order.objects.get(id=order_id)
    device = UserDevice.objects.filter(user=order.user).first()
    
    if not device:
        logger.warning(f"No FCM token for user {order.user_id}")
        # Fallback: send email
        send_order_ready_email(order.user.email)
        return
    
    try:
        message = messaging.Message(
            notification=messaging.Notification(
                title="Your drink is ready!",
                body=f"Pick up order #{order.id}"
            ),
            data={
                'order_id': str(order.id),
                'pickup_location': order.pickup_location
            },
            token=device.fcm_token
        )
        
        response = messaging.send(message)
        logger.info(f"FCM sent to user {order.user_id}: {response}")
        
    except firebase_admin.exceptions.InvalidArgumentError:
        # Token invalid: remove and fallback to email
        device.delete()
        send_order_ready_email(order.user.email)
```

**Claude AI API Integration with Timeouts**
```python
import anthropic
from anthropic import APITimeoutError, APIError

def handle_customer_complaint(user_id, complaint_text):
    """Route complaint to Claude with safety timeout"""
    
    client = anthropic.Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))
    
    try:
        response = client.messages.create(
            model="claude-3-sonnet-20240229",
            max_tokens=500,
            system="You are a helpful customer service representative for CodePop. Respond with empathy and offer solutions. Never disclose system details.",
            messages=[
                {
                    "role": "user",
                    "content": complaint_text[:500]  # Prevent prompt injection
                }
            ],
            timeout=10  # 10-second timeout
        )
        
        ai_response = response.content[0].text
        
        # Log for safety monitoring
        ClaudeInteractionLog.objects.create(
            user_id=user_id,
            input_prompt=complaint_text[:500],
            output_response=ai_response[:1000],
            latency_ms=int(response.usage.output_tokens)
        )
        
        return ai_response
        
    except APITimeoutError:
        logger.warning(f"Claude timeout for user {user_id}")
        # Fallback: escalate to human
        return "Your request is complex and requires human attention. An agent will contact you shortly."
    
    except APIError as e:
        logger.error(f"Claude API error: {str(e)}")
        return "Sorry, I'm temporarily unavailable. Please try again or contact support."
```

**Mapbox Geolocation Caching**
```python
from django.core.cache import cache

def get_distance_to_store(user_lat, user_lng, store_id, use_cache=True):
    """Get distance from user to store (with caching to prevent rate limit)"""
    
    cache_key = f"distance:{user_lat:.4f}:{user_lng:.4f}:{store_id}"
    
    # Try cache first
    if use_cache:
        cached_distance = cache.get(cache_key)
        if cached_distance:
            return cached_distance
    
    # Query Mapbox API
    try:
        store = Store.objects.get(id=store_id)
        
        response = requests.get(
            f"https://api.mapbox.com/directions/geojson",
            params={
                'coordinates': f"{user_lng},{user_lat};{store.longitude},{store.latitude}",
                'access_token': os.getenv('MAPBOX_PUBLIC_TOKEN')
            },
            timeout=3
        )
        
        if response.status_code == 200:
            distance = response.json()['routes'][0]['distance']
            
            # Cache for 1 hour
            cache.set(cache_key, distance, timeout=3600)
            
            return distance
        else:
            logger.warning(f"Mapbox error: {response.status_code}")
            # Fallback to time-based pickup
            return None
            
    except requests.Timeout:
        logger.warning(f"Mapbox timeout for user at ({user_lat}, {user_lng})")
        return None
```

### Decentralized Architecture & Load Balancing

**Horizontal Scaling with Nginx (Multi-Store)**
```
# nginx.conf (each store has replicas behind load balancer)
upstream store_app {
    server store_instance_1:8000;
    server store_instance_2:8000;
    server store_instance_3:8000;
}

# Inter-store communication (direct, secure connections)
upstream supply_hub_region_1 {
    server supply_hub_us_east:8000;
}

server {
    listen 443 ssl http2;
    
    location / {
        # Load balance customer requests
        proxy_pass http://store_app;
        proxy_set_header X-Forwarded-For $remote_addr;
    }
    
    location /api/inter-store/ {
        # Secure inter-store communication
        proxy_pass http://supply_hub_region_1;
        proxy_ssl_verify on;
        proxy_ssl_trusted_certificate /etc/nginx/certs/ca-bundle.crt;
        proxy_set_header X-Store-Signature $http_x_store_signature;
    }
    
    location /health {
        access_log off;
        proxy_pass http://store_app;
    }
}
```

**Auto-Scaling Policy (Per-Store, Considering Regional Load)**
```
Scale Up:   if CPU > 70% for 2 minutes OR network latency > 200ms
Scale Down: if CPU < 30% for 5 minutes
Min instances per store: 2 (high availability)
Max instances per store: 10
Regional limit: max 100 instances across all stores in region
Cooldown: 300 seconds between scaling events
Priority: critical services (payment, inventory) scale first
```

**Decentralized Data Synchronization Performance**
```python
@shared_task
def sync_inventory_with_regional_peers():
    """Periodically sync inventory with peer stores in same region"""
    
    local_store = Store.objects.get(id=os.getenv('STORE_ID'))
    peer_stores = Store.objects.filter(region=local_store.region).exclude(id=local_store.id)
    
    for peer in peer_stores:
        try:
            # Get local inventory snapshot
            inventory_snapshot = Inventory.objects.filter(
                store=local_store
            ).values('item_name', 'quantity', 'last_updated')
            
            # Sign message
            signed_message = sign_inter_store_message(
                sender_store_id=local_store.id,
                payload={'inventory': list(inventory_snapshot)},
                private_key=os.getenv('STORE_PRIVATE_KEY')
            )
            
            # Send to peer with 5-second timeout
            response = requests.post(
                f"{peer.api_url}/api/inter-store/inventory-sync",
                json=signed_message,
                timeout=5,
                verify=True  # Verify SSL certificate
            )
            
            if response.status_code == 200:
                logger.info(f"Inventory synced with {peer.store_name}")
            else:
                logger.warning(f"Sync failed with {peer.store_name}: {response.status_code}")
                
        except requests.Timeout:
            logger.warning(f"Timeout syncing with {peer.store_name}")
            # Retry in background
            sync_inventory_with_peer.apply_async(
                args=[peer.id],
                countdown=60
            )
        except Exception as e:
            logger.error(f"Error syncing with {peer.store_name}: {str(e)}")
```

---

## 5.6 Monitoring & Observability

### Observability Stack Architecture

**Layers**

| Layer              | Tools                           | Purpose                                                  |
| ------------------ | ------------------------------- | -------------------------------------------------------- |
| **Application**    | Sentry, APM (DataDog/New Relic) | Error tracking, performance tracing, distributed tracing |
| **Infrastructure** | Prometheus, Grafana             | Metrics collection, visualization, dashboards            |
| **Logging**        | Loki or ELK Stack               | Centralized logs, search, aggregation                    |
| **Business**       | Custom events/Mixpanel          | Revenue, user engagement, conversion funnels             |

**Instrumentation Points**
```
Request → Middleware (log start, set request ID)
        ↓
      View (log inputs, user context)
        ↓
      Serializer (log validation)
        ↓
      Service Layer (log business logic, timings)
        ↓
      Database (log queries, slow query alerts)
        ↓
      Cache (log hit/miss, TTL)
        ↓
      External API (log request/response, latency)
        ↓
      Response → Middleware (log status, duration, request ID)
```

### Key Metrics & Thresholds (Updated for Multi-Store & External Dependencies)

**Application Metrics**
- Request latency: p95 < 200ms, p99 < 500ms
- Error rate: < 0.5%
- Payment success rate (Stripe): > 95%
- Cache hit ratio: > 70% (recommendations, geolocation)

**External Service Health (NEW)**
- Stripe API availability: > 99.99% uptime (monitor status page)
- Stripe API latency: < 5s for charge operations
- Firebase FCM delivery rate: > 98%
- Mapbox API latency: < 3s for distance calculations
- Claude API timeout rate: < 2% (10s threshold)
- Scikit-Learn model latency: < 100ms for predictions

**Decentralized Architecture Metrics (NEW)**
- Inter-store message delivery success: > 99%
- Inventory sync latency between stores: < 30 seconds
- Regional supply hub responsiveness: < 5 seconds
- Service discovery heartbeat (peer detection): every 5 minutes
- Data synchronization conflicts: < 1% of sync operations

**Infrastructure Metrics**
- Database connection pool: < 80% utilized
- Redis memory: < 80% used
- Disk space: > 10% free
- CPU per instance: < 70% average
- Network latency to regional supply hub: < 100ms

**Business Metrics**
- Daily active users (DAU) per store
- Orders per day per store
- Payment success rate
- Geolocation opt-in rate (GDPR requirement)
- Average order value (AOV)
- User retention (30-day)
- AI recommendation accuracy (fairness parity < 10%)

### Alerting Strategy (Updated for External Dependencies & Multi-Store)

**Alert Severity Levels**
```
CRITICAL (Page PagerDuty immediately)
├── Database connection: 0 available
├── Payment failures (Stripe): > 10% for 5 minutes
├── Error rate: > 5% for 5 minutes
├── Disk space: < 5% free
├── Redis down
├── Stripe API unavailable: 0% success rate
├── Inter-store sync failing: > 5 consecutive failures
├── Supply hub unreachable (> 5 min)
└── Geolocation data breach detected (encryption compromised)

WARNING (Email/Slack to #alerts)
├── High latency: p95 > 400ms for 10 minutes
├── Cache hit ratio: < 50% for 30 minutes
├── Slow queries: > 1 second execution time
├── Failed auth attempts: > 100/minute per IP
├── Stripe API latency: > 5 seconds
├── FCM delivery rate: < 98%
├── Mapbox API latency: > 3 seconds
├── Claude timeout rate: > 2%
├── Inter-store sync latency: > 60 seconds
├── ML fairness variance: > 10% between demographics
└── Geolocation purge job failed (GDPR compliance risk)

INFO (Dashboard only)
├── New deployments completed
├── Database backups finished
├── Routine metric drift (within 10%)
├── Service discovery: new peer registered
├── Model retraining completed
└── CSV import job finished
```

### Dashboard Structure (Conceptual - Updated for Multi-Store & External Services)

**Overview Dashboard**
- SLO compliance (uptime %, latency %, error rate %)
- Request volume (RPS, trending) per store
- Top errors (exception type, frequency)
- Payment activity (success rate via Stripe, transaction volume)
- External service health: Stripe, Firebase FCM, Mapbox, Claude (green/red status)

**Performance Dashboard**
- API latency histogram (p50, p95, p99) per store
- Database query times (slow query log)
- Cache hit/miss rates (recommendations, geolocation)
- External API latencies: Stripe (< 5s), Mapbox (< 3s), Claude (< 10s), FCM delivery rate
- Decentralized sync latency between stores (< 30s target)
- Regional supply hub response times

**Security Dashboard**
- Authentication failures (by user, IP, store)
- Authorization failures (denied requests, cross-store access attempts)
- Suspicious activity (rate limit triggers, signature verification failures)
- Data access audit log (encrypted fields accessed)
- GDPR compliance: geolocation purge job status, consent tracking
- Inter-store message verification failures (potential MITM attacks)
- AI safety: Claude timeout events, fairness variance alerts

**Compliance Dashboard (NEW)**
- Geolocation consent rates by store
- Geolocation purge job status (24-hour deletion verification)
- Claude interaction logs (response quality, timeout events)
- ML fairness metrics (recommendation quality parity by demographic)
- Data subject access requests (DSAR) completion status
- CSV import audit trail (what was imported, by whom, when)

**Business Dashboard**
- Revenue (daily, weekly, monthly) per store + cross-store trends
- Order completion rate per store
- User growth (DAU, MAU) per store
- Conversion funnel (browse → search → order → pay) per store
- Top products by store/region
- Supply hub inventory levels by region
- Machine maintenance status per store (normal, warning, needs repair)

---

## 5.7 Testing Strategy

### Test Pyramid & Coverage

```
              E2E Tests (critical user flows)
           ↑          ↑          ↑
         5%        5%        5%
     
          Integration Tests (40% coverage)
       ↑          ↑          ↑          ↑
     20%        20%        20%        20%
  
   Unit Tests (80% coverage of critical paths)
 ↑     ↑     ↑     ↑     ↑     ↑     ↑     ↑
Auth  Perm  Data  Valid Crypt Cache Async Error
10%   10%   10%   10%   10%   10%   15%   15%
```

### Test Organization

**File Structure**
```
/backend/tests/
├── __init__.py
├── conftest.py              # Shared fixtures
├── factories.py             # Factory Boy definitions
├── test_models.py           # Model tests
├── test_views.py            # API endpoint tests
├── test_serializers.py      # Serializer tests
├── test_auth.py             # Authentication tests
├── test_permissions.py      # RBAC tests
├── test_encryption.py       # Data protection tests
├── test_compliance.py       # GDPR/CCPA tests
├── test_performance.py      # Load/latency tests
└── fixtures/
    ├── users.json
    ├── orders.json
    └── ...
```

### Unit Test Patterns

**Authentication Tests**
```python
import pytest
from django.test import Client

@pytest.mark.django_db
def test_login_with_valid_credentials():
    from backend.models import User
    
    user = User.objects.create_user(
        username='alice',
        password='SecurePass123'
    )
    
    client = Client()
    response = client.post('/api/auth/login/', {
        'username': 'alice',
        'password': 'SecurePass123'
    })
    
    assert response.status_code == 200
    assert 'access_token' in response.json()

@pytest.mark.django_db
def test_login_with_invalid_password():
    from backend.models import User
    
    User.objects.create_user(
        username='alice',
        password='SecurePass123'
    )
    
    client = Client()
    response = client.post('/api/auth/login/', {
        'username': 'alice',
        'password': 'WrongPassword'
    })
    
    assert response.status_code == 401

@pytest.mark.django_db
def test_account_lockout_after_5_attempts():
    from backend.models import User
    
    user = User.objects.create_user(username='alice')
    client = Client()
    
    for _ in range(5):
        client.post('/api/auth/login/', {
            'username': 'alice',
            'password': 'WrongPassword'
        })
    
    response = client.post('/api/auth/login/', {
        'username': 'alice',
        'password': 'SecurePass123'
    })
    
    assert response.status_code == 429
```

**Authorization (RBAC) Tests**
```python
@pytest.mark.django_db
def test_user_cannot_delete_other_user():
    from backend.models import User
    
    user_a = User.objects.create_user(
        username='alice',
        role='user'
    )
    user_b = User.objects.create_user(
        username='bob',
        role='user'
    )
    
    client = Client()
    token = get_jwt_token(user_a)
    
    response = client.delete(
        f'/api/users/{user_b.id}/',
        HTTP_AUTHORIZATION=f'Bearer {token}'
    )
    
    assert response.status_code == 403

@pytest.mark.django_db
def test_manager_can_delete_user():
    from backend.models import User
    
    manager = User.objects.create_user(
        username='alice',
        role='manager'
    )
    user = User.objects.create_user(
        username='bob',
        role='user'
    )
    
    client = Client()
    token = get_jwt_token(manager)
    
    response = client.delete(
        f'/api/users/{user.id}/',
        HTTP_AUTHORIZATION=f'Bearer {token}'
    )
    
    assert response.status_code == 204
```

**Data Protection Tests**
```python
@pytest.mark.django_db
def test_email_encrypted_in_database():
    from backend.models import User
    from django.db import connection
    
    user = User.objects.create_user(
        username='alice',
        email='alice@example.com'
    )
    
    # Read raw from DB
    with connection.cursor() as cursor:
        cursor.execute(
            'SELECT email FROM auth_user WHERE id = %s',
            [user.id]
        )
        encrypted_email = cursor.fetchone()[0]
    
    # Should be encrypted (not plaintext)
    assert encrypted_email != 'alice@example.com'
    assert encrypted_email.startswith('$enc$')

@pytest.mark.django_db
def test_password_not_logged():
    """Ensure passwords don't appear in logs"""
    import logging
    
    with pytest.LogCaptureFixture.for_logger(
        logging.getLogger('backend')
    ) as logs:
        client = Client()
        response = client.post('/api/auth/login/', {
            'username': 'alice',
            'password': 'SecurePass123'
        })
    
    for record in logs.records:
        assert 'SecurePass123' not in record.message
```

### Integration Test Patterns

**API Endpoint Testing**
```python
@pytest.mark.django_db
def test_create_order_with_mocked_stripe():
    from unittest.mock import patch
    from backend.models import User, Drink, Order
    
    user = User.objects.create_user(username='alice')
    drink = Drink.objects.create(name='Cola', price=2.50)
    
    with patch('stripe.Charge.create') as mock_charge:
        mock_charge.return_value = {
            'id': 'ch_123',
            'status': 'succeeded'
        }
        
        client = Client()
        token = get_jwt_token(user)
        
        response = client.post(
            '/api/orders/',
            {
                'drink_id': drink.id,
                'quantity': 2,
                'payment_token': 'tok_visa'
            },
            HTTP_AUTHORIZATION=f'Bearer {token}'
        )
        
        assert response.status_code == 201
        assert mock_charge.called
```

**Database Integration Test**
```python
@pytest.mark.django_db
def test_order_creation_updates_inventory():
    from backend.models import User, Drink, Order, Inventory
    
    drink = Drink.objects.create(name='Cola', price=2.50)
    inventory = Inventory.objects.create(drink=drink, quantity=100)
    user = User.objects.create_user(username='alice')
    
    client = Client()
    token = get_jwt_token(user)
    
    response = client.post(
        '/api/orders/',
        {
            'drink_id': drink.id,
            'quantity': 5
        },
        HTTP_AUTHORIZATION=f'Bearer {token}'
    )
    
    inventory.refresh_from_db()
    assert inventory.quantity == 95
```

### E2E Test Patterns

**Critical User Flow**
```python
@pytest.mark.django_db
def test_end_to_end_order_flow():
    from backend.models import User, Drink
    
    # 1. Login
    client = Client()
    response = client.post('/api/auth/login/', {
        'username': 'alice',
        'password': 'SecurePass123'
    })
    token = response.json()['access_token']
    
    # 2. Browse drinks
    response = client.get(
        '/api/drinks/',
        HTTP_AUTHORIZATION=f'Bearer {token}'
    )
    assert response.status_code == 200
    drinks = response.json()
    assert len(drinks) > 0
    
    # 3. Add to cart
    response = client.post(
        '/api/cart/',
        {
            'drink_id': drinks[0]['id'],
            'quantity': 2
        },
        HTTP_AUTHORIZATION=f'Bearer {token}'
    )
    assert response.status_code == 201
    
    # 4. Checkout (place order)
    response = client.post(
        '/api/orders/',
        {
            'payment_token': 'tok_visa'
        },
        HTTP_AUTHORIZATION=f'Bearer {token}'
    )
    assert response.status_code == 201
    order = response.json()
    
    # 5. Verify order status
    response = client.get(
        f'/api/orders/{order["id"]}/',
        HTTP_AUTHORIZATION=f'Bearer {token}'
    )
    assert response.status_code == 200
    assert response.json()['status'] == 'pending'
```

### Integration Test Patterns (NEW - External Services & Decentralized)

**Stripe Webhook Handling**
```python
@pytest.mark.django_db
def test_stripe_webhook_payment_confirmation():
    from backend.models import Order, Payment
    
    order = Order.objects.create(
        user=create_test_user(),
        total=10.00,
        stripe_token='tok_visa',
        payment_status='pending'
    )
    
    # Simulate Stripe webhook
    webhook_payload = {
        'type': 'charge.succeeded',
        'data': {
            'object': {
                'id': 'ch_123',
                'amount': 1000,
                'status': 'succeeded'
            }
        }
    }
    
    response = client.post(
        '/api/webhooks/stripe/',
        data=json.dumps(webhook_payload),
        content_type='application/json',
        HTTP_STRIPE_SIGNATURE='sig_test'
    )
    
    assert response.status_code == 200
    order.refresh_from_db()
    assert order.payment_status == 'confirmed'
```

**Inter-Store Message Signing & Verification**
```python
@pytest.mark.django_db
def test_inter_store_message_signature_verification():
    from backend.security import sign_inter_store_message, verify_inter_store_message
    
    # Store A sends inventory to Store B
    sender_store = Store.objects.create(id='store_a', region='us_east')
    recipient_store = Store.objects.create(id='store_b', region='us_east')
    
    payload = {
        'inventory': [
            {'item_name': 'Coke Syrup', 'quantity': 100},
            {'item_name': 'Vanilla Syrup', 'quantity': 50}
        ]
    }
    
    # Sign message
    signed = sign_inter_store_message('store_a', payload, 'private_key_a')
    
    # Verify signature (with public key)
    is_valid = verify_inter_store_message(signed, 'store_a', 'public_key_a')
    assert is_valid == True
    
    # Tampering should fail
    signed['payload']['inventory'][0]['quantity'] = 999
    is_valid = verify_inter_store_message(signed, 'store_a', 'public_key_a')
    assert is_valid == False
```

**CSV Import Validation**
```python
@pytest.mark.django_db
def test_csv_supply_import_validation():
    import csv
    import tempfile
    
    # Create test CSV
    csv_data = """date,item_name,quantity_used,store_location,region
2026-02-25,Coke Syrup,50,123 Main St,us_east
2026-02-25,Vanilla Syrup,30,123 Main St,us_east
2026-02-25,Ice,100,123 Main St,us_east"""
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
        f.write(csv_data)
        csv_path = f.name
    
    # Import via logistics manager endpoint
    manager = create_test_user(role='logistics_manager')
    
    with open(csv_path, 'rb') as f:
        response = client.post(
            '/api/supply/import/',
            {'csv_file': f},
            HTTP_AUTHORIZATION=f'Bearer {get_token(manager)}'
        )
    
    assert response.status_code == 201
    assert SupplyUsageLog.objects.count() == 3
```

**Claude API Timeout & Fallback**
```python
@pytest.mark.django_db
def test_claude_complaint_handler_timeout():
    from unittest.mock import patch, MagicMock
    from anthropic import APITimeoutError
    
    user = create_test_user()
    complaint = "I didn't get my drink!"
    
    with patch('anthropic.Anthropic.messages.create') as mock_claude:
        # Simulate timeout
        mock_claude.side_effect = APITimeoutError("Request timed out")
        
        response = client.post(
            '/api/complaints/',
            {'text': complaint},
            HTTP_AUTHORIZATION=f'Bearer {get_token(user)}'
        )
    
    assert response.status_code == 201
    # Should fallback gracefully
    assert 'human attention' in response.json()['ai_response'].lower()
```

**Geolocation Purge Compliance (GDPR)**
```python
@pytest.mark.django_db
def test_geolocation_24hour_purge():
    from django.utils import timezone
    
    user = create_test_user()
    order = Order.objects.create(user=user)
    
    # Create old geolocation data (25 hours old)
    old_time = timezone.now() - timedelta(hours=25)
    LocationData.objects.create(
        user=user,
        order=order,
        latitude=40.7128,
        longitude=-74.0060,
        created_at=old_time
    )
    
    # Create recent data (1 hour old)
    recent_time = timezone.now() - timedelta(hours=1)
    LocationData.objects.create(
        user=user,
        order=order,
        latitude=40.7128,
        longitude=-74.0060,
        created_at=recent_time
    )
    
    # Run purge task
    purge_old_geolocation()
    
    # Old data should be deleted, recent data should remain
    assert LocationData.objects.filter(created_at=old_time).count() == 0
    assert LocationData.objects.filter(created_at=recent_time).count() == 1
```

**Firebase FCM Fallback to Email**
```python
@pytest.mark.django_db
def test_fcm_fallback_to_email():
    from unittest.mock import patch
    import firebase_admin
    
    user = create_test_user()
    order = Order.objects.create(user=user)
    
    with patch('firebase_admin.messaging.send') as mock_fcm:
        # Simulate invalid FCM token
        mock_fcm.side_effect = firebase_admin.exceptions.InvalidArgumentError("Invalid token")
        
        send_order_ready_notification(order.id)
        
        # Should fallback to email
        assert len(mail.outbox) == 1
        assert 'ready' in mail.outbox[0].subject.lower()
```

### Performance Test Pattern (Locust) - Updated for Multi-Store

```python
from locust import HttpUser, task, between

class CodePopCustomer(HttpUser):
    """Simulate customer behavior across stores"""
    wait_time = between(1, 3)
    token = None
    store_id = None
    
    @task(3)
    def browse_drinks(self):
        self.client.get(
            '/api/drinks/',
            headers={'Authorization': f'Bearer {self.token}'}
        )
    
    @task(1)
    def place_order(self):
        self.client.post(
            '/api/orders/',
            json={
                'drink_id': 1,
                'quantity': 1,
                'payment_token': 'tok_visa'
            },
            headers={'Authorization': f'Bearer {self.token}'}
        )
    
    def on_start(self):
        # Login
        response = self.client.post(
            '/api/auth/login/',
            json={'username': 'load_test_user', 'password': 'SecurePass123'}
        )
        self.token = response.json()['access_token']

class CodePopLogisticsManager(HttpUser):
    """Simulate logistics manager (supply coordination)"""
    wait_time = between(5, 15)
    token = None
    
    @task(1)
    def check_regional_inventory(self):
        self.client.get(
            '/api/supply-hub/inventory/',
            headers={'Authorization': f'Bearer {self.token}'}
        )
    
    @task(1)
    def upload_demand_forecast(self):
        # Simulate CSV upload
        self.client.post(
            '/api/supply/import/',
            {'csv_file': generate_test_csv()},
            headers={'Authorization': f'Bearer {self.token}'}
        )
    
    def on_start(self):
        response = self.client.post(
            '/api/auth/login/',
            json={'username': 'logistics_manager', 'password': 'SecurePass123'}
        )
        self.token = response.json()['access_token']
```

### CI/CD Integration

**Pre-Commit Hooks**
```bash
# Check for secrets
detect-secrets scan --baseline .secrets.baseline

# Lint code
pylint backend/

# Type checking (optional)
mypy backend/
```

**PR Checks (GitHub Actions)**
```yaml
# Run on push to PR
- Run unit tests: pytest backend/tests/ --cov=backend
- Coverage report: Fail if < 80% on critical paths
- Security scan: bandit -r backend/
- Dependency check: pip-audit
```

**Pre-Merge Checks**
```bash
# Integration tests
pytest backend/tests/test_integration.py

# Security scanning
# OWASP ZAP automated scan (Docker)
```

**Post-Merge Deployment**
```bash
# Smoke tests on staging
pytest backend/tests/test_e2e.py

# Load test (baseline)
locust -f backend/tests/load_test.py --users=100 --run-time=5m --headless
```

---

## Implementation Dependencies

```
5.1 Security Architecture (FOUNDATION)
  ↓
  Implements: User model, auth middleware, RBAC
  
5.2 Security Controls (BUILD ON 5.1)
  ↓
  Depends on: Auth framework in place
  Implements: Input validation, authorization decorators
  
5.3 Data Protection (PARALLEL TO 5.2)
  ↓
  Depends on: User model structure
  Implements: Field encryption, key rotation
  
5.4 Compliance (BUILD ON 5.1-5.3)
  ↓
  Depends on: Auth, data protection in place
  Implements: GDPR/CCPA endpoints, audit logging
  
5.5 Performance (BUILD ON 5.1-5.4)
  ↓
  Depends on: All prior sections (full feature set)
  Implements: Caching, async tasks, load balancing
  
5.6 Monitoring (PARALLEL TO 5.5)
  ↓
  Depends on: All prior sections (instrumentation)
  Implements: Observability stack, dashboards, alerts
  
5.7 Testing (VALIDATES ALL)
  ↓
  Depends on: All prior sections
  Implements: Test suite, CI/CD, load/security tests
```

**Suggested Timeline**:
1. **Week 1-2**: 5.1 (auth) + 5.2 (security controls)
2. **Week 3**: 5.3 (data protection) + 5.4 (compliance)
3. **Week 4**: 5.5 (performance) + 5.6 (monitoring)
4. **Week 5**: 5.7 (testing) + refinement

---

## Quick-Start Guide

### Key Django Settings to Update
```python
# settings.py

# Security
SECRET_KEY = os.getenv('SECRET_KEY')
DEBUG = False
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', '').split(',')

SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000

# Authentication
AUTH_USER_MODEL = 'auth.CustomUser'

# Encryption
ENCRYPTION_KEY = os.getenv('ENCRYPTION_KEY')

# Caching (Redis)
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
        'OPTIONS': {'CLIENT_CLASS': 'django_redis.client.DefaultClient'}
    }
}

# Celery
CELERY_BROKER_URL = 'redis://127.0.0.1:6379/0'
CELERY_RESULT_BACKEND = 'redis://127.0.0.1:6379/0'

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'json': {
            '()': 'pythonjsonlogger.jsonlogger.JsonFormatter',
            'format': '%(timestamp)s %(level)s %(message)s'
        }
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'json'
        }
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO'
    }
}
```

### Install Dependencies
```bash
pip install django-cryptography==0.3.2
pip install djangorestframework-simplejwt==5.3.0
pip install django-ratelimit==4.1.0
pip install celery==5.3.4
pip install redis==5.0.1
pip install sentry-sdk==1.40.0
pip install pytest-django==4.7.0
pip install locust==2.20.0
```

### Run Tests
```bash
# All tests
pytest backend/tests/ -v

# Specific test file
pytest backend/tests/test_auth.py -v

# Coverage report
pytest backend/tests/ --cov=backend --cov-report=html

# Load test
locust -f backend/tests/load_test.py --users=100 --hatch-rate=10 --headless
```

---

## References

- [Django Security Documentation](https://docs.djangoproject.com/en/5.1/topics/security/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/)
- [GDPR Regulation](https://gdpr-info.eu/)
- [Stripe PCI Compliance](https://stripe.com/en-gb/resources/more/guide-pci-compliance)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [Celery Task Queue](https://docs.celeryproject.org/)
- [Prometheus Monitoring](https://prometheus.io/docs/introduction/overview/)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/sql-syntax.html)
---

### **Section 6: User Interfaces, Technology Stack, Deployment & Integrations**
**Assigned to: Team Member 6**

#### 6.1 User Interface Prototypes
**For each user type, provide:**
- **Screenshots/Mockups** of key interfaces
- **UI Component Specifications**
- **Usability Features**
- **Accessibility Features**

**User Types:**
1. **Customer (Account User)**
   - Home page
   - Drink creation page
   - Cart page
   - Payment/checkout page
   - Order confirmation page
   - Account preferences page
   - Order history page
   
2. **Customer (Guest User)**
   - Home page (simplified)
   - Drink creation page
   - Cart page
   - Payment/checkout page
   
3. **Manager**
   - Manager dashboard
   - Revenue reports
   - Inventory management
   
4. **Admin**
   - Admin dashboard
   - User management interface
   - Account creation/editing
   
5. **Super Admin**
   - System-wide dashboard
   - Multi-store analytics
   
6. **Logistics Manager**
   - Supply hub dashboard
   - Inventory distribution interface
   - CSV import/export interface
   
7. **Repair Staff**
   - Maintenance dashboard
   - Machine status interface
   - Repair scheduling interface

#### 6.2 Usability & Accessibility
- **Usability Principles**
  - Consistency: Design language across all pages
  - Simplicity: Minimal clicks to complete tasks
  - Feedback: Clear status indicators
  - Error prevention: Input validation, confirmation dialogs
  
- **Accessibility Implementation**
  - **WCAG 2.1 Compliance**: Level AA target
  - **Screen Reader Support**: ARIA labels, semantic HTML
  - **Keyboard Navigation**: Tab order, focus indicators
  - **Color Contrast**: WCAG contrast ratios (4.5:1 for text)
  - **Color Blindness**: Color palette tested for common types
  - **Text Alternatives**: Alt text for images, icons
  - **Responsive Design**: Mobile-first approach, flexible layouts

#### 6.3 User Flow Diagrams
**Key User Interactions:**
1. **Order Placement Flow**
   - Start → Browse/Design Drink → Add to Cart → Checkout → Payment → Confirmation
   - Decision points: Account vs Guest, Payment method, Pickup option
   
2. **Account Creation Flow**
   - Sign up → Email verification → Set preferences → Home
   
3. **Order Pickup Flow**
   - Order ready → QR code generation → User arrives → QR scan → Pickup
   
4. **Manager Dashboard Flow**
   - Login → Dashboard → Select report → View data → Export (optional)

#### 6.4 Technology Stack & Justifications
**Programming Languages:**
- **Python**: Backend development
  - Justification: Django framework, AI/ML libraries (Scikit-Learn), extensive ecosystem
  - Alternatives considered: Node.js (less mature ML support), Java (more verbose)
  
- **JavaScript/TypeScript**: Frontend development
  - Justification: React Native compatibility, large ecosystem
  - Alternatives considered: Dart/Flutter (smaller team expertise), native Swift/Kotlin (more development overhead)

**Frameworks:**
- **Django**: Backend framework
  - Justification: Built-in admin, ORM, security features, rapid development
  - Alternatives considered: Flask (more manual setup), FastAPI (less mature ecosystem)
  
- **React Native**: Frontend framework
  - Justification: Cross-platform, component reusability, hot reload
  - Alternatives considered: Native apps (more development time), Flutter (team expertise)

**Libraries:**
- **Django REST Framework**: API development
- **Stripe Python SDK**: Payment processing
- **Mapbox GL JS**: Mapping and geolocation
- **Scikit-Learn**: Machine learning
- **Anthropic SDK**: Claude API integration
- **Firebase Admin SDK**: Push notifications
- **PostgreSQL adapter (psycopg2)**: Database connectivity

**Justification for each**: Cost, performance, maintainability, team expertise, community support

#### 6.5 Third-Party Integrations
**Detailed integration specifications for each:**

1. **Stripe Payment Processing**
   - Integration type: REST API + Webhooks
   - Authentication: API keys (secret + publishable)
   - Key endpoints: Payment Intents, Webhooks
   - Error handling: Retry logic, fallback mechanisms
   - Security: Webhook signature verification, PCI-DSS compliance
   - Alternatives considered: Square, PayPal (justification for Stripe choice)

2. **Mapbox Geolocation**
   - Integration type: REST API + Client SDK
   - Authentication: Bearer tokens
   - Key features: Geocoding, routing, proximity detection
   - Rate limits: 600 req/min (free tier)
   - Fallback: Time-based pickup when unavailable
   - Alternatives considered: Google Maps, Apple MapKit

3. **Firebase Cloud Messaging (FCM)**
   - Integration type: REST API / Admin SDK
   - Authentication: Service account credentials
   - Features: Push notifications, device token management
   - Fallback: Email notifications
   - Alternatives considered: OneSignal, AWS SNS

4. **Claude AI (Anthropic)**
   - Integration type: REST API
   - Authentication: API key
   - Features: Complaint handling, drink recommendations
   - Rate limits: 50K tokens/min
   - Timeout handling: 10-second timeout, fallback to canned responses
   - Alternatives considered: GPT-4, local models

5. **Scikit-Learn**
   - Integration type: In-process Python library
   - Features: Content-based filtering, demand forecasting
   - Model storage: Serialized models on disk
   - Alternatives considered: TensorFlow, cloud ML services

6. **Django Email (SMTP)**
   - Integration type: SMTP protocol
   - Provider: TBD (SendGrid, AWS SES, etc.)
   - Features: Account verification, password reset
   - Alternatives considered: Twilio SendGrid API, Mailgun

#### 6.6 Deployment Plan
**Deployment Strategy:**
- **Containerization**: Docker containers for Django app
- **Orchestration**: Docker Compose for local, Kubernetes for production (optional)
- **Cloud Services**: 
  - Frontend: CDN (AWS CloudFront, Netlify, or Vercel)
  - Backend: Cloud hosting (AWS EC2, DigitalOcean, Heroku)
  - Database: Managed PostgreSQL (AWS RDS, Heroku Postgres)
  
**Deployment Environments:**
1. **Development**
   - Local Docker setup
   - Hot reload enabled
   - Debug mode active
   
2. **Staging**
   - Production-like environment
   - Test data
   - Integration testing
   
3. **Production**
   - Optimized builds
   - SSL/TLS certificates
   - Monitoring enabled
   - Backup procedures

**CI/CD Pipeline:**
- **Continuous Integration**: 
  - Automated testing on pull requests
  - Code quality checks (linting, formatting)
  - Security scanning
- **Continuous Deployment**:
  - Automated deployment to staging
  - Manual approval for production
  - Rollback procedures

**Deployment Steps:**
1. Code freeze and final testing
2. Database migrations
3. Build and push Docker images
4. Deploy to staging for validation
5. Production deployment (blue-green or rolling)
6. Post-deployment verification
7. Monitoring and rollback plan

**Backup & Recovery:**
- Database backups: Daily automated backups, 30-day retention
- Disaster recovery: RTO (Recovery Time Objective) < 4 hours
- Data retention policies

---

## Cross-Cutting Concerns (All Team Members)

### Consistency Requirements
- **Naming Conventions**: 
  - Classes: PascalCase (e.g., `OrderService`)
  - Methods: camelCase (e.g., `createOrder()`)
  - Database tables: snake_case (e.g., `order_items`)
- **Documentation Standards**: 
  - Inline comments for complex logic
  - Method documentation (docstrings)
  - API documentation (OpenAPI/Swagger)

### Task Assignment Matrix
**Tasks identified, prioritized, and assigned to feature teams:**

| Task | Priority | Assigned Team | Dependencies |
|------|----------|---------------|--------------|
| User authentication system | Must Have | Backend | Database schema |
| Order creation flow | Must Have | Backend + Frontend | User auth, Catalog |
| Payment integration | Must Have | Backend | Order system |
| Database schema implementation | Must Have | Backend | None |
| UI prototypes | Must Have | Frontend | None |
| AI recommendation engine | Should Have | Backend | User preferences |
| Geolocation integration | Should Have | Frontend + Backend | Mapbox API |
| Admin dashboard | Must Have | Frontend + Backend | User management |
| Manager dashboard | Must Have | Frontend + Backend | Revenue, Inventory |
| Security implementation | Must Have | Backend | All subsystems |
| Performance optimization | Should Have | Backend | All subsystems |
| Automated testing | Should Have | All teams | All features |

---

## Document Quality Checklist

Before finalizing, ensure:
- [ ] All UML diagrams are clear, legible, and consistent with written descriptions
- [ ] All design decisions include alternatives considered and rationale
- [ ] Database tables are normalized to at least 3NF
- [ ] All classes follow Single Responsibility Principle
- [ ] Inheritance is used appropriately (not overcomplicated)
- [ ] Composition is used where objects work together
- [ ] Security risks are identified with mitigation strategies
- [ ] Performance bottlenecks are addressed with solutions
- [ ] UI prototypes are included for all user types
- [ ] User flows are clearly described
- [ ] Technology choices are justified
- [ ] Deployment plan is detailed and feasible
- [ ] Third-party integrations are thoroughly explained
- [ ] Low-level design is consistent with high-level design
- [ ] Tasks are assigned to appropriate teams

---

## Team Member Responsibilities Summary

**Team Member 1**: System Architecture + User Management Subsystem
- Architecture overview, User Management classes, UML diagrams, design decisions

**Team Member 2**: Order Management + Payment Subsystems  
- Order classes, Payment classes, UML diagrams, Stripe integration details

**Team Member 3**: Catalog + Inventory + AI Recommendation Subsystems
- Catalog classes, Inventory classes, AI classes, UML diagrams, ML model details

**Team Member 4**: Database Design + Data Access Layer
- All table definitions, ERD, normalization, indexing, ORM patterns, performance

**Team Member 5**: Security + Performance + Monitoring
- Security risks/mitigations, encryption, compliance, performance bottlenecks, monitoring, testing

**Team Member 6**: UI/UX + Technology Stack + Deployment + Integrations
- UI prototypes, accessibility, user flows, tech stack justifications, deployment plan, third-party integrations

---

## Next Steps

1. **Team Meeting**: Review this structure and assign sections
2. **Template Creation**: Create a shared document template with section headers
3. **Parallel Work**: Each team member works on their assigned section
4. **Integration Meeting**: Review sections for consistency and completeness
5. **Final Review**: Ensure all assignment requirements are met
6. **Documentation**: Compile into final Low-Level Design document

---

**Note**: This structure ensures comprehensive coverage of all assignment requirements while allowing independent work. Regular team sync meetings are recommended to ensure consistency and address dependencies.
