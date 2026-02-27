# CodePop Low-Level Design Document Structure

## Document Overview

This document outlines the structure for the Low-Level Design (LLD) document that builds upon the High-Level Design. The LLD provides detailed technical specifications, class-level designs, database schemas, and implementation details needed for development.

**Team Assignment Strategy**: The document is divided into 6 major sections, each assigned to one team member. Each section is designed to be independently workable with minimal dependencies, allowing parallel development.

---

## Document Structure

### **Section 1: System Architecture & User Management Subsystem** 
**Assigned to: Team Member 1**

#### 1.1 System Architecture Overview
- **Clear and concise description** of the overall system architecture
  - Client-server architecture details
  - Three-tier architecture (Frontend, Middleware/Backend, Database)
  - Component interaction patterns
  - Request/response flow diagrams
- **Architecture justification**: Why client-server over alternatives (microservices, serverless, etc.)
- **Technology stack summary** (detailed justifications in Section 6)

#### 1.2 User Management Subsystem
- **Subsystem Overview**
  - Purpose and responsibilities
  - Dependencies on other subsystems
  - Key interfaces
  
- **Detailed Class Breakdown** (Single Responsibility Principle)
  - `UserService` class
    - Fields: userRepository, authService, emailService
    - Methods: createUser(), authenticateUser(), updateUserProfile(), deleteUser()
    - Responsibilities: User CRUD operations, profile management
  - `AuthenticationService` class
    - Fields: tokenGenerator, sessionManager
    - Methods: login(), logout(), refreshToken(), validateToken()
    - Responsibilities: Authentication and session management
  - `UserRepository` class
    - Fields: dbConnection
    - Methods: findById(), findByEmail(), findByUsername(), save(), delete()
    - Responsibilities: Data access for User entities
  - `PreferenceService` class
    - Fields: preferenceRepository, userRepository
    - Methods: addPreference(), removePreference(), getUserPreferences()
    - Responsibilities: Managing user drink preferences
  - `GuestService` class
    - Fields: sessionStorage
    - Methods: createGuestSession(), getGuestSession()
    - Responsibilities: Managing guest user sessions

- **UML Class Diagram** for User Management Subsystem
  - All classes with fields and methods
  - Relationships: inheritance, composition, aggregation
  - Dependencies on external services (email, notifications)

- **Design Decisions & Alternatives**
  - Why Django's built-in User model vs custom User model
  - Token-based auth vs session-based auth
  - Guest user handling approach

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

### **Section 5: Security, Performance & Monitoring**
**Assigned to: Team Member 5**

#### 5.1 Security Architecture
- **Authentication & Authorization**
  - Django authentication system details
  - Role-based access control (RBAC) implementation
  - Permission system design
  - Token management (JWT vs Django sessions)
  - Password policies and hashing (Argon2 vs PBKDF2)

#### 5.2 Security Risks & Mitigations
**Identify and address:**
1. **SQL Injection**
   - Risk: Malicious SQL queries
   - Mitigation: Django ORM parameterization, input validation
   
2. **Cross-Site Scripting (XSS)**
   - Risk: Malicious script injection
   - Mitigation: React's built-in XSS protection, input sanitization
   
3. **Cross-Site Request Forgery (CSRF)**
   - Risk: Unauthorized actions
   - Mitigation: Django CSRF tokens, SameSite cookies
   
4. **Authentication Bypass**
   - Risk: Unauthorized access
   - Mitigation: Strong password policies, rate limiting, account lockout
   
5. **Sensitive Data Exposure**
   - Risk: Payment info, email, geolocation leaks
   - Mitigation: Encryption at rest and in transit, PCI-DSS compliance via Stripe
   
6. **Insecure Direct Object References**
   - Risk: Accessing other users' data
   - Mitigation: Authorization checks, user context validation
   
7. **Security Misconfiguration**
   - Risk: Exposed secrets, default credentials
   - Mitigation: Environment variables, secure defaults, security audits

#### 5.3 Data Protection
- **Encryption at Rest**
  - Database encryption (PostgreSQL TDE or application-level)
  - Sensitive field encryption (email, geolocation)
  - Encryption algorithms: AES-256
  - Key management strategy
  
- **Encryption in Transit**
  - TLS 1.3 for all communications
  - HTTPS enforcement
  - Certificate management
  - API endpoint security

- **Sensitive Data Handling**
  - Payment information: Never stored (Stripe tokens only)
  - Email addresses: Encrypted at rest
  - Geolocation: Encrypted, 24-hour retention policy
  - Passwords: Hashed with Argon2, never stored in plaintext

#### 5.4 Compliance
- **GDPR Compliance**
  - Right to access
  - Right to erasure (data deletion)
  - Data portability
  - Consent management
  
- **CCPA Compliance**
  - California privacy rights
  - Data disclosure requirements
  
- **PCI-DSS Compliance**
  - Stripe handles card data (we remain out of scope)
  - No card data storage

#### 5.5 System Performance
- **Performance Bottlenecks Identified**
  1. **Database Query Performance**
     - Risk: Slow queries during peak hours
     - Mitigation: Indexing, query optimization, connection pooling
     
  2. **Payment Processing Latency**
     - Risk: Stripe API delays
     - Mitigation: Async processing, retry logic, fallback mechanisms
     
  3. **AI Recommendation Latency**
     - Risk: Model inference time
     - Mitigation: Caching, pre-computation, timeout handling
     
  4. **Concurrent Order Processing**
     - Risk: Race conditions, inventory conflicts
     - Mitigation: Database transactions, optimistic locking
     
  5. **Geolocation API Rate Limits**
     - Risk: Mapbox API throttling
     - Mitigation: Caching, request batching, paid tier upgrade

- **Load Handling Strategy**
  - **Horizontal Scaling**: Multiple Django instances behind load balancer
  - **Database Scaling**: Read replicas for reporting queries
  - **Caching Strategy**: 
    - Redis for session storage
    - CDN for static assets
    - Application-level caching for frequently accessed data
  - **Auto-scaling**: Cloud-based auto-scaling configuration
  - **Load Testing**: Target metrics (requests/second, response time)

#### 5.6 Monitoring & Observability
- **Application Monitoring**
  - Error tracking (Sentry or similar)
  - Performance monitoring (APM tools)
  - Log aggregation (centralized logging)
  
- **Infrastructure Monitoring**
  - Server metrics (CPU, memory, disk)
  - Database performance metrics
  - Network latency monitoring
  
- **Business Metrics**
  - Order completion rate
  - Payment success rate
  - User engagement metrics
  
- **Alerting Strategy**
  - Critical alerts: Database down, payment failures
  - Warning alerts: High error rates, slow response times
  - Notification channels: Email, Slack, PagerDuty

#### 5.7 Automated Testing Strategy
- **Unit Testing**
  - Framework: Django TestCase, pytest
  - Coverage targets: 80%+ for critical paths
  - Test categories: Service layer, repository layer, utility functions
  
- **Integration Testing**
  - API endpoint testing
  - Database integration tests
  - External service mocking (Stripe, Mapbox, Claude)
  
- **End-to-End Testing**
  - Critical user flows
  - Payment flow testing
  - Order lifecycle testing
  
- **Performance Testing**
  - Load testing tools: Apache JMeter, Locust
  - Stress testing scenarios
  - Capacity planning

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
