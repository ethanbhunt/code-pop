# Section 3: Catalog, Inventory & AI Recommendation Subsystems


## Table of Contents

1. [Overview](#1-overview)
2. [Catalog Subsystem](#2-catalog-subsystem)
3. [Inventory Management Subsystem](#3-inventory-management-subsystem)
4. [AI Recommendation Subsystem](#4-ai-recommendation-subsystem)
5. [Database Schema](#5-database-schema)
6. [Integration Points](#6-integration-points)
7. [Performance & Security](#7-performance--security)
8. [Implementation Tasks](#8-implementation-tasks)

---

## 1. Overview

This section details three interconnected subsystems that manage product catalog, inventory tracking, and AI-powered recommendations for the CodePop platform.

### 1.1 Subsystem Responsibilities

| Subsystem | Primary Responsibility | Dependencies |
|-----------|----------------------|--------------|
| **Catalog** | Product management, drink creation, pricing | Inventory (ingredient availability) |
| **Inventory** | Stock tracking, alerts, supply coordination | Catalog (ingredient data), Orders (deduction) |
| **AI Recommendation** | Personalized suggestions, chatbot support | Catalog (drink data), User preferences |

### 1.2 Technology Stack

- **Backend:** Django REST Framework with PostgreSQL
- **ML Libraries:** Scikit-Learn (recommendations), Hugging Face Transformers (chatbot)
- **Caching:** Redis (planned for CSV data and inventory queries)
- **Data Formats:** PostgreSQL ArrayField for ingredients, CSV for ML training data

---

## 2. Catalog Subsystem

### 2.1 Subsystem Overview

**Purpose:** Manage drink products, custom drink creation, ingredient selection, and pricing calculations.

**Key Features:**
- Seasonal menu drinks (pre-built by business)
- Custom drink builder with real-time validation
- Ingredient composition (syrups, sodas, add-ins)
- Dynamic pricing based on customization
- User favorites and ratings

**Integration Points:**
- Fetches ingredient availability from Inventory
- Provides drink data to Order Management  
- Feeds drink properties to AI Recommendation

### 2.2 Class Architecture

#### 2.2.1 CatalogService

**Responsibilities:** Orchestrate catalog operations and coordinate between repository, validation, and pricing.

**Fields:**
```python
- productRepository: ProductRepository
- inventoryService: InventoryService
- customizationService: CustomizationService
```

**Methods:**
```python
+ getProducts(filters: dict) -> List[Drink]
+ getProductById(drinkId: int) -> Drink
+ searchProducts(query: str) -> List[Drink]
+ getAvailableProducts(storeId: int) -> List[Drink]
+ createCustomDrink(drinkData: dict, userId: int) -> Drink
+ updateDrink(drinkId: int, updates: dict) -> Drink
+ deleteDrink(drinkId: int) -> bool
+ addToFavorites(userId: int, drinkId: int) -> bool
+ removeFromFavorites(userId: int, drinkId: int) -> bool
```

**Design Rationale:** CatalogService follows the Single Responsibility Principle by focusing solely on business logic orchestration, delegating data access to ProductRepository and validation to CustomizationService.

#### 2.2.2 ProductRepository

**Responsibilities:** Data access layer for drink entities, abstracting Django ORM operations.

**Fields:**
```python
- dbConnection: DatabaseConnection
```

**Methods:**
```python
+ findAll() -> QuerySet[Drink]
+ findById(drinkId: int) -> Drink
+ findByCategory(category: str) -> QuerySet[Drink]
+ findByUserId(userId: int) -> QuerySet[Drink]
+ findPreBuiltDrinks() -> QuerySet[Drink]  # User_Created=False
+ findCustomDrinks() -> QuerySet[Drink]    # User_Created=True
+ save(drink: Drink) -> Drink
+ update(drinkId: int, fields: dict) -> Drink
+ delete(drinkId: int) -> bool
+ bulkFetch(drinkIds: List[int]) -> QuerySet[Drink]
```

**Implementation Notes:** Uses Django ORM with `select_related()` for user favorites and `prefetch_related()` for many-to-many relationships. Implements repository pattern to isolate business logic from database queries.

#### 2.2.3 DrinkBuilder

**Responsibilities:** Construct valid drink objects with ingredient composition validation.

**Fields:**
```python
- validationRules: ValidationRules
- pricingCalculator: PricingCalculator
- ingredientValidator: IngredientValidator
```

**Methods:**
```python
+ buildDrink(ingredients: dict, metadata: dict) -> Drink
+ validateIngredients(ingredients: dict) -> ValidationResult
+ validateSize(size: str) -> bool
+ validateIceLevel(ice: str) -> bool
+ addSyrup(drinkId: int, syrupName: str) -> Drink
+ addAddIn(drinkId: int, addinName: str) -> Drink
+ removeSyrup(drinkId: int, syrupName: str) -> Drink
+ setBaseSize(drinkId: int, size: str) -> Drink
```

**Validation Rules:**
- **Size:** Must be one of `['16oz', '24oz', '32oz']`
- **Ice Level:** Must be one of `['none', 'light', 'regular', 'extra']`
- **Base Soda:** Required (minimum 1)
- **Syrups:** Optional (0-10 maximum to prevent unreasonable orders)
- **Add-ins:** Optional (0-5 maximum)

#### 2.2.4 CustomizationService

**Responsibilities:** Handle ingredient selection, availability checking, and customization logic.

**Fields:**
```python
- ingredientRepository: IngredientRepository
- inventoryService: InventoryService
- validationService: ValidationService
```

**Methods:**
```python
+ addIngredient(drinkId: int, ingredientName: str, type: str) -> bool
+ removeIngredient(drinkId: int, ingredientName: str) -> bool
+ validateCustomization(ingredients: dict) -> ValidationResult
+ checkIngredientAvailability(ingredientName: str, storeId: int) -> bool
+ getIngredientsByType(type: str) -> List[Ingredient]
+ getSuggestedPairings(baseIngredients: List[str]) -> List[str]
```

**Design Decision:** Chose aggregation over inheritance. CustomizationService *uses* ValidationService rather than extending it, allowing flexible validation rule changes without affecting customization logic.

#### 2.2.5 PricingCalculator

**Responsibilities:** Calculate drink prices based on ingredients and business rules.

**Fields:**
```python
- basePriceRules: dict
- ingredientCostMap: dict
```

**Methods:**
```python
+ calculatePrice(drink: Drink) -> float
+ calculateBasePrice(size: str) -> float
+ calculateIngredientCost(ingredients: List[str]) -> float
+ applyDiscounts(price: float, discountRules: dict) -> float
```

**Pricing Algorithm:**
```python
if drink.User_Created:
    price = 2.00  # Base custom drink price
    syrup_count = len(drink.SyrupsUsed) if drink.SyrupsUsed else 0
    addin_count = len(drink.AddIns) if drink.AddIns else 0
    ingredient_cost = (syrup_count + addin_count) * 0.30
    total = price + ingredient_cost
else:
    total = drink.Price  # Pre-set seasonal menu price
return round(total, 2)
```

**Design Rationale:** Separated pricing logic from drink creation to support future dynamic pricing strategies (happy hour discounts, loyalty points) without modifying core catalog classes.

### 2.3 Database Schema - Drinks Table

**Table Name:** `drinks`

| Column | Data Type | Constraints | Purpose |
|--------|-----------|-------------|---------|
| DrinkID | SERIAL | PRIMARY KEY | Auto-incrementing unique identifier |
| Name | VARCHAR(255) | NOT NULL | Display name (e.g., "Coke Float") |
| SyrupsUsed | TEXT[] | NULLABLE | PostgreSQL array of syrup names |
| SodaUsed | TEXT[] | NOT NULL | PostgreSQL array of soda base names |
| AddIns | TEXT[] | NULLABLE | PostgreSQL array of add-in names |
| Rating | NUMERIC(3,2) | NULLABLE, CHECK (0 <= Rating <= 5) | Average user rating |
| Price | NUMERIC(6,2) | NOT NULL, CHECK (Price >= 0) | Price in USD |
| Size | VARCHAR(10) | DEFAULT 'm' | Size code (16oz/24oz/32oz) |
| Ice | VARCHAR(20) | DEFAULT 'normal' | Ice level preference |
| User_Created | BOOLEAN | NOT NULL | True=custom, False=seasonal menu |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation time |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Last modification time |

**Relationships:**
- **ManyToMany with User (Favorites):** Junction table `drink_favorites` with columns `user_id`, `drink_id`
- **OneToMany from Drink to OrderItem:** Referenced by order_items.drink_id foreign key

**Indexes:**
```sql
CREATE INDEX idx_drinks_user_created ON drinks(User_Created);
CREATE INDEX idx_drinks_price ON drinks(Price);
CREATE INDEX idx_drinks_rating ON drinks(Rating DESC) WHERE Rating IS NOT NULL;
CREATE INDEX idx_drinks_syrups_gin ON drinks USING GIN(SyrupsUsed);  -- For ingredient search
CREATE INDEX idx_drinks_addins_gin ON drinks USING GIN(AddIns);      -- PostgreSQL GIN index
```

**Normalization (3NF):**
- ✅ **1NF:** Atomic values (arrays allowed in PostgreSQL), primary key exists
- ✅ **2NF:** No partial dependencies (single-column primary key)
- ✅ **3NF:** No transitive dependencies (Price doesn't depend on Size, pre-calculated)

**Design Decision: ArrayField vs Junction Tables**

**Chosen Approach:** PostgreSQL ArrayField for ingredient storage

**Alternative 1:** Junction tables (drink_syrups, drink_addins)
```sql
CREATE TABLE drink_syrups (
    drink_id INT REFERENCES drinks(DrinkID),
    syrup_name VARCHAR(100),
    PRIMARY KEY (drink_id, syrup_name)
);
```

**Alternative 2:** JSONB field
```sql
CREATE TABLE drinks (
    ...
    ingredients JSONB  -- e.g., {"syrups": ["vanilla"], "addins": ["cream"]}
);
```

**Rationale for ArrayField:**
- **Advantages:**
  - Simpler queries: `SELECT * FROM drinks WHERE 'vanilla' = ANY(SyrupsUsed)`
  - No JOIN operations required for ingredient retrieval
  - Flexible: easy to add/remove ingredients without schema changes
  - Native PostgreSQL indexing with GIN indexes
- **Trade-offs:**
  - Harder referential integrity (no FK to inventory.ItemName)
  - Denormalized (ingredient names repeated across records)
- **Mitigation:** Strict validation in Django serializer ensures only valid ingredients from inventory catalog

**Justification:** For MVP, query simplicity and development speed prioritized over perfect normalization. Future refactoring to junction tables possible if referential integrity becomes critical.

### 2.4 Seed Data

**Pre-built Seasonal Drinks:**

1. **Coke Float** - $5.99
   - Base: Coke
   - Syrups: Vanilla
   - Add-ins: Cream

2. **Seasonal Depression** - $4.99
   - Base: Rootbeer
   - Syrups: Cinnamon, Chocolate, Pumpkin Spice, Cucumber
   - Add-ins: Candy Sprinkles

3. **I've Heard It Both Ways** - $2.50
   - Base: Dr. Pepper
   - Syrups: Pineapple, Bubble Gum, Cotton Candy
   - Add-ins: Lime Wedge

4. **Fall Girlie** - $2.50
   - Base: Dr. Pepper
   - Syrups: Pumpkin Spice, Salted Caramel
   - Add-ins: Whip, Candy Sprinkles

5. **Red Rizz** - $2.50
   - Base: Big Red
   - Syrups: Peach, Cranberry
   - Add-ins: Peach Puree

6. **#Lemons** - $2.50
   - Base: Lemonade
   - Syrups: Huckleberry

**Ingredient Inventory:**
- **19 Sodas:** Mtn. Dew, Dr. Pepper, Sprite, Coke (regular & diet), Pepsi, Rootbeer, Fanta (Orange, Grape, Strawberry), Big Red, Lemonade, Gatorade, Red Bull, Monster
- **48 Syrups:** Coconut, Pineapple, Strawberry, Vanilla, Chocolate, Pumpkin Spice, Salted Caramel, Lavender, Peppermint, Blue Raspberry, etc.
- **12 Add-ins:** Cream, Whip, Coconut Cream, Lime Wedge, Lemon Wedge, Peach Puree, Strawberry Puree, Candy Sprinkles, Fresh Mango, Fresh Strawberries

### 2.5 UML Class Diagram - Catalog Subsystem

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CatalogService                             │
├─────────────────────────────────────────────────────────────────────┤
│ - productRepository: ProductRepository                              │
│ - inventoryService: InventoryService                                │
│ - customizationService: CustomizationService                        │
├─────────────────────────────────────────────────────────────────────┤
│ + getProducts(filters: dict): List[Drink]                          │
│ + createCustomDrink(data: dict, userId: int): Drink                │
│ + updateDrink(id: int, updates: dict): Drink                       │
│ + addToFavorites(userId: int, drinkId: int): bool                  │
└──────────────┬────────────────────────────────┬─────────────────────┘
               │ uses                           │ uses
               ▼                                ▼
┌────────────────────────────────┐   ┌──────────────────────────────┐
│     ProductRepository          │   │   CustomizationService       │
├────────────────────────────────┤   ├──────────────────────────────┤
│ - dbConnection                 │   │ - validationService          │
├────────────────────────────────┤   │ - inventoryService           │
│ + findById(id): Drink          │   ├──────────────────────────────┤
│ + save(drink): Drink           │   │ + validateCustomization()    │
│ + findPreBuiltDrinks()         │   │ + checkAvailability()        │
└────────────┬───────────────────┘   └──────────────────────────────┘
             │ returns
             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                            <<Entity>> Drink                         │
├─────────────────────────────────────────────────────────────────────┤
│ - DrinkID: int                                                      │
│ - Name: string                                                      │
│ - SyrupsUsed: List[string]                                          │
│ - SodaUsed: List[string]                                            │
│ - AddIns: List[string]                                              │
│ - Rating: float                                                     │
│ - Price: float                                                      │
│ - Size: string                                                      │
│ - Ice: string                                                       │
│ - User_Created: boolean                                             │
├─────────────────────────────────────────────────────────────────────┤
│ + calculateIngredientCount(): int                                   │
│ + toJSON(): dict                                                    │
└─────────────────────────────────────────────────────────────────────┘
             △
             │ composed by
             │
┌────────────┴───────────────┐         ┌──────────────────────────────┐
│      DrinkBuilder          │         │    PricingCalculator         │
├────────────────────────────┤         ├──────────────────────────────┤
│ - pricingCalculator        │─────────│ - basePriceRules: dict       │
│ - validationRules          │   uses  │ - ingredientCostMap: dict    │
├────────────────────────────┤         ├──────────────────────────────┤
│ + buildDrink(): Drink      │         │ + calculatePrice(): float    │
│ + validateIngredients()    │         │ + calculateBaseCost()        │
└────────────────────────────┘         └──────────────────────────────┘

**Relationships:**
- CatalogService **aggregates** ProductRepository, CustomizationService (composition)
- DrinkBuilder **uses** PricingCalculator (dependency)
- ProductRepository **returns** Drink entities
- Drink is a data entity (no business logic, just data + simple methods)
```

---

## 3. Inventory Management Subsystem

### 3.1 Subsystem Overview

**Purpose:** Track stock levels across stores, manage thresholds, coordinate supply hubs, and automate reordering.

**Key Features:**
- Real-time inventory tracking per store
- Threshold-based low-stock alerts
- Multi-store supply hub network (7 regional hubs)
- Automated inventory deduction on order fulfillment
- Physical item tracking (cups, lids, straws)

**Integration Points:**
- Provides ingredient availability to Catalog
- Deducts stock on Order completion
- Coordinates with Supply Hub network for restocking
- Feeds data to AI Demand Prediction

### 3.2 Class Architecture

#### 3.2.1 InventoryService

**Responsibilities:** Orchestrate inventory operations, coordinate stock updates, and manage alerts.

**Fields:**
```python
- inventoryRepository: InventoryRepository
- stockAlertService: StockAlertService
- supplyHubService: SupplyHubService
- orderService: OrderService
```

**Methods:**
```python
+ updateInventory(itemId: int, quantity: int) -> Inventory
+ deductInventory(itemName: str, quantity: int, storeId: int) -> bool
+ resetInventory(itemId: int) -> Inventory  # Restock to threshold
+ checkStockLevel(itemName: str, storeId: int) -> int
+ getLowStockItems(storeId: int) -> List[Inventory]
+ requestRestock(itemName: str, quantity: int, storeId: int) -> StockTransfer
+ getInventoryReport(storeId: int) -> InventoryReport
+ bulkDeduct(items: List[tuple], storeId: int) -> bool  # For order fulfillment
```

**Transaction Handling:**
```python
@transaction.atomic
def bulkDeduct(self, items: List[tuple], storeId: int) -> bool:
    """
    Atomically deduct multiple items with rollback on insufficient stock.
    items: [(itemName, quantity), ...]
    """
    for item_name, qty in items:
        inventory = self.inventoryRepository.findByName(item_name, storeId)
        if inventory.Quantity < qty:
            raise InsufficientStockError(f"{item_name} out of stock")
        inventory.Quantity -= qty
        inventory.save()
        
        if inventory.Quantity <= inventory.ThresholdLevel:
            self.stockAlertService.sendAlert(inventory)
    return True
```

#### 3.2.2 InventoryRepository

**Responsibilities:** Data access for inventory entities.

**Fields:**
```python
- dbConnection: DatabaseConnection
```

**Methods:**
```python
+ findByItemName(name: str, storeId: int) -> Inventory
+ findAllByStore(storeId: int) -> QuerySet[Inventory]
+ findBelowThreshold(storeId: int) -> QuerySet[Inventory]
+ updateQuantity(itemId: int, newQuantity: int) -> Inventory
+ bulkUpdate(updates: List[dict]) -> bool
+ save(inventory: Inventory) -> Inventory
+ delete(itemId: int) -> bool
```

#### 3.2.3 StockAlertService

**Responsibilities:** Monitor thresholds and trigger notifications for low stock.

**Fields:**
```python
- notificationService: NotificationService
- thresholdRules: dict
- alertChannels: List[str]  # ['email', 'push', 'dashboard']
```

**Methods:**
```python
+ checkThresholds(storeId: int) -> List[Alert]
+ sendAlert(inventory: Inventory) -> bool
+ updateThreshold(itemId: int, newThreshold: int) -> bool
+ getAlertHistory(storeId: int, days: int) -> List[Alert]
+ suppressAlert(itemId: int, duration: timedelta) -> bool  # Snooze alerts
```

**Alert Trigger Logic:**
```python
def checkThresholds(self, storeId: int):
    low_stock = self.inventoryRepository.findBelowThreshold(storeId)
    alerts = []
    
    for item in low_stock:
        alert_level = 'CRITICAL' if item.Quantity == 0 else 'WARNING'
        alerts.append({
            'item': item.ItemName,
            'current': item.Quantity,
            'threshold': item.ThresholdLevel,
            'level': alert_level,
            'recommended_order': item.ThresholdLevel * 2  # 2x safety stock
        })
        
        self.notificationService.notify(
            recipients=['store_manager', 'logistics_manager'],
            message=f"Low stock: {item.ItemName}",
            urgency=alert_level
        )
    
    return alerts
```

#### 3.2.4 SupplyHubService

**Responsibilities:** Coordinate supply distribution from regional hubs to stores.

**Fields:**
```python
- hubRepository: SupplyHubRepository
- transferRepository: StockTransferRepository
- routingAlgorithm: RoutingAlgorithm
```

**Methods:**
```python
+ requestSupply(itemName: str, quantity: int, storeId: int) -> StockTransfer
+ findNearestHub(storeId: int) -> SupplyHub
+ calculateDeliveryTime(fromHubId: int, toStoreId: int) -> timedelta
+ getHubInventory(hubId: int) -> List[HubInventory]
+ scheduleDelivery(transferId: int, deliveryTime: datetime) -> bool
+ trackShipment(transferId: int) -> ShipmentStatus
```

**Hub Selection Algorithm:**
```python
def findNearestHub(self, storeId: int) -> SupplyHub:
    """
    1. Get store region (A-G based on location)
    2. Check regional hub capacity
    3. If unavailable, search hubs within 1000 miles
    4. Sort by distance and availability
    """
    store = Store.objects.get(id=storeId)
    regional_hub = SupplyHub.objects.get(region=store.region)
    
    if regional_hub.has_capacity():
        return regional_hub
    
    # Cross-region fulfillment (up to 1000 miles)
    nearby_hubs = SupplyHub.objects.filter(
        location__distance_lt=(store.location, 1000)  # Miles
    ).order_by('location__distance')
    
    return nearby_hubs.first()
```

#### 3.2.5 SupplyCoordinator

**Responsibilities:** Automate supply requests based on inventory levels and demand predictions.

**Fields:**
```python
- inventoryService: InventoryService
- supplyHubService: SupplyHubService
- demandPredictor: DemandPredictionService
```

**Methods:**
```python
+ autoReorder(storeId: int) -> List[StockTransfer]
+ calculateReorderQuantity(itemName: str, storeId: int) -> int
+ optimizeBatchOrders(storeId: int) -> BatchOrder
+ getPredictedDemand(itemName: str, days: int) -> float
+ scheduleAutomatedRestocking(storeId: int, frequency: str) -> bool
```

**Auto-Reorder Logic:**
```python
def autoReorder(self, storeId: int):
    low_stock_items = self.inventoryService.getLowStockItems(storeId)
    transfers = []
    
    for item in low_stock_items:
        # Get AI demand prediction for next 7 days
        predicted_demand = self.demandPredictor.predict(item.ItemName, days=7)
        safety_stock = item.ThresholdLevel
        reorder_qty = predicted_demand + safety_stock - item.Quantity
        
        if reorder_qty > 0:
            transfer = self.supplyHubService.requestSupply(
                itemName=item.ItemName,
                quantity=reorder_qty,
                storeId=storeId
            )
            transfers.append(transfer)
    
    return transfers
```

### 3.3 Database Schema - Inventory Tables

#### 3.3.1 Inventory Table

**Table Name:** `inventory`

| Column | Data Type | Constraints | Purpose |
|--------|-----------|-------------|---------|
| InventoryID | SERIAL | PRIMARY KEY | Unique identifier |
| ItemName | VARCHAR(100) | NOT NULL | Ingredient/item name |
| ItemType | VARCHAR(50) | NOT NULL, CHECK | 'Soda', 'Syrup', 'Add In', 'Physical' |
| Quantity | INTEGER | NOT NULL, CHECK (Quantity >= 0) | Current stock level |
| ThresholdLevel | INTEGER | NOT NULL, CHECK (ThresholdLevel >= 0) | Reorder point |
| UnitCost | NUMERIC(6,2) | NULLABLE | Cost per unit (for revenue calc) |
| StoreID | INTEGER | NOT NULL, FOREIGN KEY(stores) | Multi-store support |
| LastUpdated | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Auto-updated on changes |
| LastRestockedAt | TIMESTAMP | NULLABLE | Last restock timestamp |

**Indexes:**
```sql
CREATE INDEX idx_inventory_store ON inventory(StoreID);
CREATE INDEX idx_inventory_type ON inventory(ItemType);
CREATE INDEX idx_inventory_low_stock ON inventory(Quantity) WHERE Quantity <= ThresholdLevel;
CREATE INDEX idx_inventory_name_store ON inventory(ItemName, StoreID);  -- Composite for lookups
```

#### 3.3.2 Supply Hubs Table (NEW - Required)

**Table Name:** `supply_hubs`

| Column | Data Type | Constraints | Purpose |
|--------|-----------|-------------|---------|
| HubID | SERIAL | PRIMARY KEY | Unique hub identifier |
| Region | CHAR(1) | NOT NULL, UNIQUE, CHECK | Region code ('A'-'G') |
| LocationName | VARCHAR(100) | NOT NULL | City name (e.g., "Chicago") |
| Latitude | NUMERIC(9,6) | NOT NULL | GPS coordinate |
| Longitude | NUMERIC(9,6) | NOT NULL | GPS coordinate |
| MaxCapacity | INTEGER | NOT NULL | Max units storable |
| CurrentLoad | INTEGER | DEFAULT 0 | Current inventory count |
| OperatingStatus | VARCHAR(20) | DEFAULT 'active' | 'active', 'maintenance', 'offline' |
| CreatedAt | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation |

**Data:**
```sql
INSERT INTO supply_hubs (Region, LocationName, Latitude, Longitude, MaxCapacity) VALUES
('A', 'Chicago', 41.8781, -87.6298, 100000),
('B', 'Newark NJ', 40.7357, -74.1724, 100000),
('C', 'Logan UT', 41.7370, -111.8338, 80000),
('D', 'Dallas', 32.7767, -96.7970, 100000),
('E', 'Atlanta', 33.7490, -84.3880, 100000),
('F', 'Phoenix', 33.4484, -112.0740, 90000),
('G', 'Boise', 43.6150, -116.2023, 70000);
```

#### 3.3.3 Stock Transfers Table (NEW - Required)

**Table Name:** `stock_transfers`

| Column | Data Type | Constraints | Purpose |
|--------|-----------|-------------|---------|
| TransferID | SERIAL | PRIMARY KEY | Unique transfer ID |
| FromHubID | INTEGER | NOT NULL, FOREIGN KEY(supply_hubs) | Source hub |
| ToStoreID | INTEGER | NOT NULL, FOREIGN KEY(stores) | Destination store |
| ItemName | VARCHAR(100) | NOT NULL | Item being transferred |
| Quantity | INTEGER | NOT NULL, CHECK (Quantity > 0) | Units transferred |
| Status | VARCHAR(20) | DEFAULT 'pending' | 'pending', 'in_transit', 'delivered', 'failed' |
| RequestedAt | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Request timestamp |
| DeliveredAt | TIMESTAMP | NULLABLE | Actual delivery time |
| EstimatedDelivery | TIMESTAMP | NOT NULL | Predicted delivery |
| Priority | VARCHAR(10) | DEFAULT 'normal' | 'critical', 'high', 'normal', 'low' |

**Indexes:**
```sql
CREATE INDEX idx_transfers_store ON stock_transfers(ToStoreID);
CREATE INDEX idx_transfers_status ON stock_transfers(Status);
CREATE INDEX idx_transfers_requested ON stock_transfers(RequestedAt DESC);
```

#### 3.3.4 Stores Table (NEW - Required)

**Table Name:** `stores`

| Column | Data Type | Constraints | Purpose |
|--------|-----------|-------------|---------|
| StoreID | SERIAL | PRIMARY KEY | Unique store identifier |
| StoreName | VARCHAR(100) | NOT NULL | Store display name |
| Region | CHAR(1) | NOT NULL, CHECK | Assigned region ('A'-'G') |
| Address | VARCHAR(255) | NOT NULL | Physical address |
| Latitude | NUMERIC(9,6) | NOT NULL | GPS coordinate |
| Longitude | NUMERIC(9,6) | NOT NULL | GPS coordinate |
| OperatingStatus | VARCHAR(20) | DEFAULT 'operational' | 'operational', 'maintenance', 'closed' |
| OpenedAt | DATE | NOT NULL | Store opening date |

**Normalization Check (3NF):**
- ✅ **1NF:** All columns atomic, primary key exists
- ✅ **2NF:** No partial dependencies (single PK)
- ✅ **3NF:** No transitive dependencies (Region doesn't determine Location; both are independent attributes)

### 3.4 UML Class Diagram - Inventory Subsystem

```
┌─────────────────────────────────────────────────────────────────────┐
│                       InventoryService                              │
├─────────────────────────────────────────────────────────────────────┤
│ - inventoryRepository: InventoryRepository                          │
│ - stockAlertService: StockAlertService                              │
│ - supplyHubService: SupplyHubService                                │
├─────────────────────────────────────────────────────────────────────┤
│ + updateInventory(itemId, qty): Inventory                          │
│ + deductInventory(itemName, qty, storeId): bool                    │
│ + getLowStockItems(storeId): List[Inventory]                       │
│ + bulkDeduct(items, storeId): bool                                 │
└──────────┬──────────────────────┬────────────────────┬─────────────┘
           │ uses                 │ uses               │ uses
           ▼                      ▼                    ▼
┌──────────────────────┐  ┌──────────────────┐  ┌────────────────────┐
│ InventoryRepository  │  │ StockAlertService│  │ SupplyHubService   │
├──────────────────────┤  ├──────────────────┤  ├────────────────────┤
│ + findByName()       │  │ + checkThresholds│  │ + requestSupply()  │
│ + findBelowThreshold │  │ + sendAlert()    │  │ + findNearestHub() │
└──────────┬───────────┘  └─────────┬────────┘  └─────────┬──────────┘
           │ returns               │ monitors            │ coordinates
           ▼                       ▼                     ▼
┌──────────────────────────────────────────┐  ┌────────────────────────┐
│       <<Entity>> Inventory               │  │  <<Entity>> SupplyHub  │
├──────────────────────────────────────────┤  ├────────────────────────┤
│ - InventoryID: int                       │  │ - HubID: int           │
│ - ItemName: string                       │  │ - Region: char         │
│ - ItemType: string                       │  │ - LocationName: string │
│ - Quantity: int                          │  │ - MaxCapacity: int     │
│ - ThresholdLevel: int                    │  │ - CurrentLoad: int     │
│ - StoreID: int [FK]                      │  ├────────────────────────┤
├──────────────────────────────────────────┤  │ + hasCapacity(): bool  │
│ + isOutOfStock(): bool                   │  │ + getDistanceTo(): int │
│ + needsRestock(): bool                   │  └────────────────────────┘
└──────────────────────────────────────────┘
           △
           │ generates
           │
┌──────────┴────────────────────────────────────────────────────┐
│                    SupplyCoordinator                          │
├───────────────────────────────────────────────────────────────┤
│ - supplyHubService: SupplyHubService                          │
│ - demandPredictor: DemandPredictionService                    │
├───────────────────────────────────────────────────────────────┤
│ + autoReorder(storeId): List[StockTransfer]                  │
│ + calculateReorderQuantity(itemName, storeId): int           │
│ + optimizeBatchOrders(storeId): BatchOrder                   │
└───────────────────────────────────────────────────────────────┘
           │ creates
           ▼
┌─────────────────────────────────────────────────────────┐
│            <<Entity>> StockTransfer                     │
├─────────────────────────────────────────────────────────┤
│ - TransferID: int                                       │
│ - FromHubID: int [FK]                                   │
│ - ToStoreID: int [FK]                                   │
│ - ItemName: string                                      │
│ - Quantity: int                                         │
│ - Status: string                                        │
├─────────────────────────────────────────────────────────┤
│ + updateStatus(newStatus): void                        │
│ + estimateDelivery(): datetime                         │
└─────────────────────────────────────────────────────────┘

**Relationships:**
- InventoryService **aggregates** StockAlertService, SupplyHubService
- InventoryRepository **returns** Inventory entities
- StockAlertService **monitors** Inventory levels
- SupplyHubService **coordinates** SupplyHub entities
- SupplyCoordinator **creates** StockTransfer records
```

---

## 4. AI Recommendation Subsystem

### 4.1 Subsystem Overview

**Purpose:** Provide personalized drink recommendations and AI-powered customer service through conversational chatbot.

**Key Features:**
- Content-based filtering for personalized suggestions
- Cold-start capability (works for new users)
- Conversational chatbot for complaints and refunds
- AI demand prediction for supply forecasting (NEW)

**Integration Points:**
- Fetches user preferences from User Management
- Queries drink catalog for recommendations
- Accesses order history for complaint resolution
- Provides demand forecasts to Inventory Management

### 4.2 Class Architecture

#### 4.2.1 RecommendationService

**Responsibilities:** Orchestrate recommendation generation and coordinate AI models.

**Fields:**
```python
- contentBasedModel: ContentBasedFilter
- userPreferenceService: PreferenceService
- catalogService: CatalogService
- cacheManager: CacheManager
```

**Methods:**
```python
+ getPersonalizedRecommendations(userId: int, count: int) -> List[Drink]
+ getRandomRecommendation() -> Drink
+ generateFromPreferences(preferences: List[str]) -> dict
+ refreshRecommendations(userId: int) -> bool
+ trainModel(updatedData: DataFrame) -> bool
+ getCachedRecommendation(userId: int) -> Drink | None
```

**Algorithm Flow:**
```python
def getPersonalizedRecommendations(self, userId: int, count: int = 3):
    # 1. Check cache first
    cached = self.cacheManager.get(f"rec_{userId}")
    if cached:
        return cached
    
    # 2. Fetch user preferences
    preferences = self.userPreferenceService.getPreferences(userId)
    if not preferences:
        # Fallback for no preferences
        preferences = ["mango", "peach", "vanilla", "salted caramel"]
    
    # 3. Generate recommendations using content-based filtering
    drink_ingredients = self.contentBasedModel.generateDrink(preferences)
    
    # 4. Create drink object
    drink = self.catalogService.createCustomDrink(drink_ingredients, userId)
    
    # 5. Cache for 1 hour
    self.cacheManager.set(f"rec_{userId}", drink, ttl=3600)
    
    return drink
```

#### 4.2.2 ContentBasedFilter

**Responsibilities:** Implement Scikit-Learn content-based recommendation algorithm.

**Fields:**
```python
- cvVectorizer: CountVectorizer
- similarityMatrix: np.ndarray
- syrupData: DataFrame
- sodaData: DataFrame
- addinData: DataFrame
```

**Methods:**
```python
+ generateDrink(preferences: List[str]) -> dict
+ findSimilarSyrups(syrupName: str, topN: int) -> List[str]
+ findBestSoda(syrupTypes: List[str], sodaPrefs: List[str]) -> str
+ findBestAddins(syrupTypes: str, sodaType: str, addinPrefs: List[str]) -> List[str]
+ loadCSVData(filePath: str) -> DataFrame
+ computeSimilarity(data: DataFrame, column: str) -> np.ndarray
```

**Scikit-Learn Implementation:**

```python
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import pandas as pd

class ContentBasedFilter:
    def __init__(self):
        self.cvVectorizer = CountVectorizer()
        self.syrupData = pd.read_csv('backend/Syrups.csv')
        self.sodaData = pd.read_csv('backend/Sodas.csv')
        self.addinData = pd.read_csv('backend/AddIns.csv')
    
    def findSimilarSyrups(self, syrupName: str, topN: int = 5) -> List[str]:
        """
        Use cosine similarity on syrup 'type' field to find similar flavors.
        Example: "strawberry" (type: "fruit berry cool") 
                 → similar: raspberry, blackberry, pomegranate
        """
        # Extract type field as text corpus
        count_matrix = self.cvVectorizer.fit_transform(self.syrupData['type'])
        
        # Compute cosine similarity matrix (n x n)
        similarity_matrix = cosine_similarity(count_matrix)
        
        # Get index of target syrup
        idx = self.syrupData[self.syrupData['name'] == syrupName].index[0]
        
        # Get similarity scores for this syrup
        similarity_scores = list(enumerate(similarity_matrix[idx]))
        
        # Sort by similarity (descending)
        sorted_syrups = sorted(similarity_scores, key=lambda x: x[1], reverse=True)
        
        # Return top N (excluding self at index 0)
        top_indices = [i[0] for i in sorted_syrups[1:topN+1]]
        return self.syrupData.iloc[top_indices]['name'].tolist()
    
    def findBestSoda(self, syrupTypes: List[str], sodaPrefs: List[str]) -> str:
        """
        Find soda that best matches syrup flavor profiles.
        Uses best-match-flavors column in Sodas.csv.
        """
        # Combine syrup types into single string
        combined_types = " ".join(set(syrupTypes))
        
        # Temporarily append to soda dataframe for comparison
        temp_df = self.sodaData.copy()
        temp_row = {'name': 'user_syrups', 'best-match-flavors': combined_types}
        temp_df = temp_df.append(temp_row, ignore_index=True)
        
        # Compute similarity
        count_matrix = self.cvVectorizer.fit_transform(temp_df['best-match-flavors'])
        similarity_matrix = cosine_similarity(count_matrix)
        
        # Get similarity to user's syrup combination (last row)
        user_idx = len(temp_df) - 1
        scores = list(enumerate(similarity_matrix[user_idx][:-1]))
        sorted_sodas = sorted(scores, key=lambda x: x[1], reverse=True)
        
        # If user has soda preferences, pick best match from those
        if sodaPrefs:
            for idx, score in sorted_sodas:
                if temp_df.iloc[idx]['name'] in sodaPrefs:
                    return temp_df.iloc[idx]['name']
        
        # Otherwise return top match
        return temp_df.iloc[sorted_sodas[0][0]]['name']
    
    def generateDrink(self, preferences: List[str]) -> dict:
        """
        Main algorithm: preferences → complete drink recommendation.
        """
        # 1. Separate preferences by type
        syrup_prefs = [p for p in preferences if p in self.syrupData['name'].values]
        soda_prefs = [p for p in preferences if p in self.sodaData['name'].values]
        addin_prefs = [p for p in preferences if p in self.addinData['name'].values]
        
        # 2. Select 1-2 random syrup preferences
        selected_syrups = random.sample(syrup_prefs, min(2, len(syrup_prefs)))
        
        # 3. Find similar syrups using content-based filtering
        all_syrups = []
        for syrup in selected_syrups:
            similar = self.findSimilarSyrups(syrup, topN=3)
            all_syrups.extend(similar)
        
        # Pick 2 syrups from combined pool
        final_syrups = random.sample(all_syrups, min(2, len(all_syrups)))
        
        # 4. Find best matching soda
        syrup_types = [self._getType(s, 'syrup') for s in final_syrups]
        best_soda = self.findBestSoda(syrup_types, soda_prefs)
        
        # 5. Find matching add-ins (0-2)
        addins = self.findBestAddins(syrup_types, best_soda, addin_prefs)
        
        return {
            'SyrupsUsed': final_syrups,
            'SodaUsed': [best_soda],
            'AddIns': addins,
            'Size': '24oz',
            'Ice': 'regular'
        }
```

**Design Rationale:**
- **Chosen:** Content-based filtering with cosine similarity
- **Alternatives:**
  - **Collaborative Filtering (User-User):** Requires large user base, doesn't work for new users
  - **Collaborative Filtering (Item-Item):** Needs extensive rating data
  - **Matrix Factorization (SVD):** Overkill for ingredient matching problem
  - **Deep Learning (Neural CF):** Training complexity, data requirements
- **Justification:** Content-based works immediately without needing other users' data, solves cold-start problem, leverages ingredient properties encoded in CSV files

#### 4.2.3 AIChatbotService

**Responsibilities:** Handle customer service conversations, complaint routing, refunds, and remakes.

**Fields:**
```python
- model: AutoModelForCausalLM
- tokenizer: AutoTokenizer
- orderService: OrderService
- paymentService: PaymentService
- conversationHistory: dict
```

**Methods:**
```python
+ processMessage(userId: int, message: str, context: dict) -> ChatResponse
+ detectIntent(message: str) -> Intent
+ handleComplaint(orderId: int, issueType: str) -> Resolution
+ processRefund(orderId: int) -> bool
+ processDrinkRemake(orderId: int, drinkIds: List[int]) -> Order
+ generateResponse(input: str, grounding: str) -> str
+ validateResponse(response: str) -> bool
```

**State Machine for Complaint Handling:**

```python
class ComplaintStateMachine:
    STATES = {
        'INIT': 'Determine if refund or remake',
        'GET_ORDER': 'Request order number',
        'CONFIRM_DRINKS': 'Select which drinks to remake',
        'ACCEPT_TERMS': 'User must confirm action',
        'COMPLETE': 'Navigate to completion page'
    }
    
    KEYWORDS = {
        'WRONG_DRINK': ['wrong drink', 'incorrect', 'bad drink', 'mistake', 
                        'too sweet', 'wrong flavor', 'flat', 'warm'],
        'REFUND': ['refund', 'money back', 'compensation', 'not satisfied']
    }
    
    def processMessage(self, userInput: str, currentPhase: str, context: dict):
        if 'cancel' in userInput.lower():
            return {'phase': 'INIT', 'message': 'Process cancelled'}
        
        if currentPhase == 'INIT':
            if self._matchKeywords(userInput, 'REFUND'):
                return {'phase': 'GET_ORDER', 'flow': 'REFUND', 
                        'message': 'Provide order number for refund'}
            elif self._matchKeywords(userInput, 'WRONG_DRINK'):
                return {'phase': 'GET_ORDER', 'flow': 'REMAKE',
                        'message': 'Provide order number to remake drink'}
        
        elif currentPhase == 'GET_ORDER':
            order_num = self._extractOrderNumber(userInput)
            if not order_num:
                return {'phase': 'GET_ORDER', 
                        'message': 'Please provide valid order number'}
            
            # Fetch order details
            order = Order.objects.filter(OrderID=order_num).first()
            if not order:
                return {'phase': 'GET_ORDER',
                        'message': 'Order not found. Try again.'}
            
            # Show order details
            drink_list = self._formatDrinkList(order.Drinks.all())
            return {'phase': 'CONFIRM_DRINKS', 'order_num': order_num,
                    'message': f'Found your order:\n{drink_list}\n' 
                              'Which drinks to remake? (or say "all")'}
        
        elif currentPhase == 'CONFIRM_DRINKS':
            drink_nums = self._extractDrinkNumbers(userInput)
            # Create new order with remade drinks
            new_order = self._createRemakeOrder(context['order_num'], drink_nums)
            return {'phase': 'ACCEPT_TERMS', 'new_order_id': new_order.OrderID,
                    'message': 'Say "I accept" to confirm remake'}
        
        elif currentPhase == 'ACCEPT_TERMS':
            if 'i accept' in userInput.lower():
                return {'phase': 'COMPLETE', 'order_id': context['new_order_id'],
                        'message': 'Drinks being remade! Check order status.'}
```

**DialoGPT Implementation:**

```python
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch

class AIChatbotService:
    def __init__(self):
        self.tokenizer = AutoTokenizer.from_pretrained("microsoft/DialoGPT-medium")
        self.model = AutoModelForCausalLM.from_pretrained("microsoft/DialoGPT-medium")
    
    def generateResponse(self, userInput: str, grounding: str = "") -> str:
        """
        Generate conversational response using DialoGPT.
        Grounding provides context: "you are a customer service agent, answer: "
        """
        full_input = grounding + userInput if grounding else userInput
        
        # Tokenize input
        input_ids = self.tokenizer.encode(
            full_input + self.tokenizer.eos_token, 
            return_tensors='pt'
        )
        
        # Create attention mask
        attention_mask = torch.ones_like(input_ids)
        
        # Generate response
        chat_history = self.model.generate(
            input_ids,
            max_length=1000,
            pad_token_id=self.tokenizer.eos_token_id,
            temperature=1.0,      # Moderate randomness
            top_k=50,             # Consider top 50 tokens
            top_p=0.9,            # Nucleus sampling
            do_sample=True,
            attention_mask=attention_mask
        )
        
        # Decode response (excluding input)
        response = self.tokenizer.decode(
            chat_history[:, input_ids.shape[-1]:][0],
            skip_special_tokens=True
        )
        
        return response
```

**Design Decision: DialoGPT vs Claude API**

**Chosen:** DialoGPT (microsoft/DialoGPT-medium)

**Alternative:** Claude API by Anthropic (mentioned in requirements)

**Comparison:**

| Factor | DialoGPT | Claude API |
|--------|----------|------------|
| **Cost** | Free (open-source) | Paid ($8-24 per 1M tokens) |
| **Latency** | Local inference (~500ms) | API call (~1-2s + network) |
| **Quality** | Good for simple conversations | Excellent, nuanced responses |
| **Customization** | Can fine-tune | Prompt engineering only |
| **Offline** | Works offline | Requires internet |
| **Model Size** | 350M parameters | Unknown (proprietary) |

**Justification:**
- For MVP, DialoGPT sufficient for structured complaint handling (state machine handles flow)
- Cost-effective for startup phase (no API fees)
- State machine ensures correct workflow regardless of response quality
- Can upgrade to Claude in production if response quality becomes critical
- **Trade-off:** Less natural language understanding, requires more rigid prompt engineering

#### 4.2.4 DemandPredictionService (NEW - Required)

**Responsibilities:** Forecast demand for inventory items using historical sales data.

**Fields:**
```python
- model: RandomForestRegressor  # Scikit-Learn
- historicalData: DataFrame
- featureExtractor: FeatureExtractor
```

**Methods:**
```python
+ predictDemand(itemName: str, storeId: int, days: int) -> float
+ trainModel(historicalCSV: str) -> bool
+ importHistoricalData(csvPath: str) -> DataFrame
+ extractFeatures(data: DataFrame) -> np.ndarray
+ evaluateModel() -> dict  # Returns MAE, RMSE metrics
+ generateReorderRecommendations(storeId: int) -> List[ReorderRec]
```

**Algorithm (Scikit-Learn Random Forest):**

```python
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
import pandas as pd

class DemandPredictionService:
    def __init__(self):
        self.model = RandomForestRegressor(n_estimators=100, random_state=42)
        self.historicalData = None
    
    def trainModel(self, csvPath: str):
        """
        Train on historical sales data CSV.
        Expected columns: date, item_name, store_id, quantity_sold, 
                          day_of_week, is_weekend, temperature, promotions
        """
        df = pd.read_csv(csvPath)
        
        # Feature engineering
        df['date'] = pd.to_datetime(df['date'])
        df['month'] = df['date'].dt.month
        df['day_of_week'] = df['date'].dt.dayofweek
        df['is_weekend'] = df['day_of_week'].isin([5, 6]).astype(int)
        
        # Encode categorical variables
        df = pd.get_dummies(df, columns=['item_name', 'store_id'])
        
        # Split features and target
        X = df.drop(['quantity_sold', 'date'], axis=1)
        y = df['quantity_sold']
        
        # Train-test split
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Train model
        self.model.fit(X_train, y_train)
        
        # Evaluate
        train_score = self.model.score(X_train, y_train)
        test_score = self.model.score(X_test, y_test)
        
        return {'train_r2': train_score, 'test_r2': test_score}
    
    def predictDemand(self, itemName: str, storeId: int, days: int = 7):
        """
        Predict total demand for item over next N days.
        """
        # Generate feature vectors for next N days
        today = pd.Timestamp.now()
        future_dates = pd.date_range(today, periods=days)
        
        predictions = []
        for date in future_dates:
            features = self._extractFeatures(itemName, storeId, date)
            daily_pred = self.model.predict([features])[0]
            predictions.append(daily_pred)
        
        # Return total predicted demand
        return sum(predictions)
    
    def generateReorderRecommendations(self, storeId: int):
        """
        For each item below threshold, recommend reorder quantity based on 
        7-day demand forecast + safety stock.
        """
        low_stock = Inventory.objects.filter(
            StoreID=storeId,
            Quantity__lte=F('ThresholdLevel')
        )
        
        recommendations = []
        for item in low_stock:
            predicted_demand = self.predictDemand(item.ItemName, storeId, days=7)
            safety_stock = item.ThresholdLevel
            current_stock = item.Quantity
            
            reorder_qty = predicted_demand + safety_stock - current_stock
            
            if reorder_qty > 0:
                recommendations.append({
                    'item': item.ItemName,
                    'current_stock': current_stock,
                    'predicted_demand': round(predicted_demand, 0),
                    'recommended_order': round(reorder_qty, 0),
                    'urgency': 'HIGH' if current_stock == 0 else 'MEDIUM'
                })
        
        return recommendations
```

**CSV Import Format:**

```csv
date,item_name,store_id,quantity_sold,temperature,promotions,day_of_week,is_weekend
2026-01-01,Coke,1,45,72,0,3,0
2026-01-01,Vanilla Syrup,1,32,72,0,3,0
2026-01-02,Coke,1,67,75,1,4,0
2026-01-06,Coke,1,120,78,0,1,1
```

**Features:**
- Date-based: month, day of week, weekend flag
- Item-specific: item name (one-hot encoded)
- Store-specific: store ID (one-hot encoded)
- External factors: temperature, promotions

### 4.3 Database Schema - AI Tables

#### 4.3.1 Preferences Table (Existing)

**Table Name:** `preferences`

| Column | Data Type | Constraints | Purpose |
|--------|-----------|-------------|---------|
| PreferenceID | SERIAL | PRIMARY KEY | Unique identifier |
| UserID | INTEGER | NOT NULL, FOREIGN KEY(users) | User who created preference |
| Preference | VARCHAR(100) | NOT NULL | Ingredient name (validated) |

**Normalization (1NF):** One preference per row (not comma-separated list)

**Validation:** Django serializer ensures only valid ingredients from inventory catalog

#### 4.3.2 Drink Recommendations Table (NEW - Analytics)

**Table Name:** `drink_recommendations`

| Column | Data Type | Constraints | Purpose |
|--------|-----------|-------------|---------|
| RecommendationID | SERIAL | PRIMARY KEY | Unique identifier |
| UserID | INTEGER | NOT NULL, FOREIGN KEY(users) | User who received rec |
| DrinkID | INTEGER | NULLABLE, FOREIGN KEY(drinks) | Recommended drink (if accepted) |
| Score | NUMERIC(5,4) | NULLABLE | Similarity score |
| Accepted | BOOLEAN | DEFAULT false | User added to cart? |
| GeneratedAt | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Recommendation time |

**Purpose:** Track recommendation performance for model improvement

### 4.4 UML Class Diagram - AI Recommendation Subsystem

```
┌─────────────────────────────────────────────────────────────────────┐
│                    RecommendationService                            │
├─────────────────────────────────────────────────────────────────────┤
│ - contentBasedModel: ContentBasedFilter                             │
│ - userPreferenceService: PreferenceService                          │
│ - cacheManager: CacheManager                                        │
├─────────────────────────────────────────────────────────────────────┤
│ + getPersonalizedRecommendations(userId, count): List[Drink]       │
│ + generateFromPreferences(prefs): dict                              │
│ + trainModel(data): bool                                            │
└────────────┬────────────────────────────┬───────────────────────────┘
             │ uses                       │ uses
             ▼                            ▼
┌───────────────────────────┐   ┌────────────────────────────────────┐
│   ContentBasedFilter      │   │      AIChatbotService              │
├───────────────────────────┤   ├────────────────────────────────────┤
│ - cvVectorizer            │   │ - model: DialoGPT                  │
│ - syrupData: DataFrame    │   │ - tokenizer: AutoTokenizer         │
│ - sodaData: DataFrame     │   │ - stateMachine                     │
├───────────────────────────┤   ├────────────────────────────────────┤
│ + generateDrink()         │   │ + processMessage(): ChatResponse   │
│ + findSimilarSyrups()     │   │ + handleComplaint(): Resolution    │
│ + findBestSoda()          │   │ + processRefund(): bool            │
│ + computeSimilarity()     │   │ + processDrinkRemake(): Order      │
└───────────────────────────┘   └────────────────────────────────────┘
             │                              │
             │ reads CSV                    │ accesses
             ▼                              ▼
┌───────────────────────────┐   ┌────────────────────────────────────┐
│    CSV Data Files         │   │      ComplaintStateMachine         │
├───────────────────────────┤   ├────────────────────────────────────┤
│ - Syrups.csv              │   │ + currentPhase: string             │
│ - Sodas.csv               │   │ + context: dict                    │
│ - AddIns.csv              │   ├────────────────────────────────────┤
└───────────────────────────┘   │ + detectIntent(): Intent           │
                                 │ + transitionState(): State         │
                                 │ + extractOrderNumber(): int        │
                                 └────────────────────────────────────┘
             
┌─────────────────────────────────────────────────────────────────────┐
│                 DemandPredictionService (NEW)                       │
├─────────────────────────────────────────────────────────────────────┤
│ - model: RandomForestRegressor                                      │
│ - historicalData: DataFrame                                         │
├─────────────────────────────────────────────────────────────────────┤
│ + predictDemand(item, store, days): float                          │
│ + trainModel(csvPath): bool                                         │
│ + generateReorderRecommendations(storeId): List[ReorderRec]        │
└─────────────────────────────────────────────────────────────────────┘

**Relationships:**
- RecommendationService **uses** ContentBasedFilter for drink generation
- RecommendationService **aggregates** AIChatbotService for customer support
- ContentBasedFilter **depends on** CSV data files for similarity computation
- AIChatbotService **composes** ComplaintStateMachine for conversation flow
- DemandPredictionService **standalone** service used by SupplyCoordinator
```

---

## 5. Database Schema Summary

### 5.1 Entity Relationship Diagram (ERD)

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│    users     │────────<│ preferences  │         │   drinks     │
│              │  1:N    │              │         │              │
│ - id (PK)    │         │ - UserID(FK) │         │ - DrinkID(PK)│
└──────┬───────┘         │ - Preference │         │ - Name       │
       │                 └──────────────┘         │ - SyrupsUsed │
       │ 1:N                                      │ - Price      │
       │                                          └──────┬───────┘
       │                 ┌──────────────┐                │
       │                 │ drink_       │                │ M:N
       └────────────────<│ favorites    │>───────────────┘
                         │ (junction)   │
                         └──────────────┘

┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   stores     │────────<│  inventory   │         │ supply_hubs  │
│              │  1:N    │              │         │              │
│ - StoreID(PK)│         │ - StoreID(FK)│<───┐    │ - HubID (PK) │
│ - Region     │         │ - ItemName   │    │    │ - Region     │
└──────────────┘         │ - Quantity   │    │    └──────┬───────┘
                         │ - Threshold  │    │           │
                         └──────────────┘    │ M:N       │ 1:N
                                             │           │
                         ┌──────────────┐    │           │
                         │ stock_       │<───┴───────────┘
                         │ transfers    │
                         │              │
                         │ - FromHub(FK)│
                         │ - ToStore(FK)│
                         └──────────────┘

┌──────────────┐         ┌──────────────┐
│   orders     │────────<│ order_items  │
│              │  1:N    │              │
│ - OrderID(PK)│         │ - DrinkID(FK)│
│ - UserID(FK) │         │ - OrderID(FK)│
└──────────────┘         └──────────────┘
```

### 5.2 Normalization Verification (3NF)

**Checklist:**
- ✅ **1NF:** All tables have atomic values, primary keys defined
- ✅ **2NF:** No partial dependencies (all PKs are single column or properly designed)
- ✅ **3NF:** No transitive dependencies verified:
  - `drinks.Price` does NOT depend on `drinks.Size` (pre-calculated)
  - `inventory.LastUpdated` auto-updates (not derived from other fields)
  - `stock_transfers.Status` is independent attribute (not derived)
  - `supply_hubs.Region` and `LocationName` are independent (region doesn't determine name uniquely)

---

## 6. Integration Points

### 6.1 Catalog ↔ Inventory Integration

**Use Case:** Validate ingredient availability during drink creation

**Implementation:**
```python
class CustomizationService:
    def validateIngredients(self, ingredients: dict, storeId: int):
        for ingredient_type, items in ingredients.items():
            for item_name in items:
                inventory = InventoryRepository.findByName(item_name, storeId)
                if not inventory or inventory.Quantity == 0:
                    raise IngredientUnavailableError(
                        f"{item_name} is out of stock at this location"
                    )
        return True
```

**API Endpoint:**
```
GET /backend/inventory/?store_id=1&available_only=true
```

### 6.2 Inventory ↔ Orders Integration (CRITICAL - MISSING)

**Use Case:** Automatically deduct inventory when order is completed

**Required Implementation:**

```python
class OrderCompletionService:
    @transaction.atomic
    def fulfillOrder(self, orderId: int):
        order = Order.objects.select_for_update().get(id=orderId)
        
        # Extract ingredients from all drinks in order
        ingredients = self._extractIngredients(order.Drinks.all())
        
        # Prepare deduction list
        deductions = []
        for ingredient, quantity in ingredients.items():
            deductions.append((ingredient, quantity))
        
        # Bulk deduct with rollback on failure
        try:
            InventoryService.bulkDeduct(deductions, order.StoreID)
        except InsufficientStockError as e:
            # Rollback order, notify customer
            order.OrderStatus = 'failed'
            order.save()
            NotificationService.notifyCustomer(
                order.UserID, 
                f"Order failed: {e.message}"
            )
            raise
        
        # Mark order as fulfilled
        order.OrderStatus = 'completed'
        order.save()
```

**Current Status:** ❌ Not implemented (manual PATCH endpoint only)

**Priority:** ⚠️ CRITICAL - Must implement before production

### 6.3 AI ↔ Preferences Integration

**Use Case:** Fetch user preferences for personalized recommendations

**Implementation:**
```python
# In RecommendationService
preferences = Preference.objects.filter(UserID=userId).values_list('Preference', flat=True)
preferences_list = list(preferences)

# Pass to AI model
drink = ContentBasedFilter.generateDrink(preferences_list)
```

**API Flow:**
```
1. Frontend: GET /backend/generate/<user_id>/
2. Backend: Fetch preferences from database
3. Backend: Call drinkAI.generate_soda(preferences)
4. Backend: Return drink JSON
5. Frontend: Display in AIAlert modal
```

### 6.4 Supply Hub ↔ Inventory Integration (NEW)

**Use Case:** Automate restock requests from stores to regional hubs

**Implementation:**
```python
class AutoRestockJob:
    """
    Cron job running daily at 2 AM to check inventory and request supplies.
    """
    def run(self):
        all_stores = Store.objects.filter(OperatingStatus='operational')
        
        for store in all_stores:
            # Get low stock items
            low_stock = InventoryService.getLowStockItems(store.StoreID)
            
            if not low_stock:
                continue
            
            # Find nearest hub
            hub = SupplyHubService.findNearestHub(store.StoreID)
            
            # Create transfer requests
            for item in low_stock:
                # Get AI demand prediction
                predicted_demand = DemandPredictionService.predictDemand(
                    item.ItemName, store.StoreID, days=7
                )
                
                # Calculate order quantity
                reorder_qty = predicted_demand + item.ThresholdLevel - item.Quantity
                
                if reorder_qty > 0:
                    StockTransfer.objects.create(
                        FromHubID=hub.HubID,
                        ToStoreID=store.StoreID,
                        ItemName=item.ItemName,
                        Quantity=reorder_qty,
                        Priority='HIGH' if item.Quantity == 0 else 'NORMAL',
                        EstimatedDelivery=timezone.now() + timedelta(days=2)
                    )
```

---

## 7. Performance & Security

### 7.1 Performance Bottlenecks

#### Bottleneck 1: CSV File I/O on Every AI Request

**Problem:**
- AI recommendation reads 3 CSV files (Syrups.csv, Sodas.csv, AddIns.csv) on every request
- File I/O overhead: ~50-100ms per read
- Total: ~150-300ms added latency per recommendation

**Current Load:**
- Expected: 10-50 recommendations/second during peak

**Solution:**
```python
import redis
import pickle

class CSVCacheManager:
    def __init__(self):
        self.redis_client = redis.Redis(host='localhost', port=6379)
        self.ttl = 3600  # 1 hour
    
    def getCachedCSV(self, filename: str) -> DataFrame:
        cache_key = f"csv_{filename}"
        cached = self.redis_client.get(cache_key)
        
        if cached:
            return pickle.loads(cached)
        
        # Load from file
        df = pd.read_csv(filename)
        
        # Cache serialized dataframe
        self.redis_client.setex(
            cache_key, 
            self.ttl, 
            pickle.dumps(df)
        )
        
        return df
```

**Impact:**
- Reduces latency from ~300ms to ~5ms (in-memory read)
- 60x performance improvement

**Priority:** HIGH - Implement before production launch

#### Bottleneck 2: N+1 Query Problem in Cart Page

**Problem:**
- Frontend fetches each drink individually in loop
- 5 drinks = 5 separate API calls

**Current Code:**
```javascript
// CartPage.js
for (let drinkId of checkoutList) {
    const response = await fetch(`${BASE_URL}/backend/drinks/${drinkId}/`);
    const drink = await response.json();
    drinks.push(drink);
}
```

**Solution:**
```python
# Backend: Add bulk fetch endpoint
class DrinkBulkView(APIView):
    def get(self, request):
        ids = request.GET.get('ids', '').split(',')
        drinks = Drink.objects.filter(DrinkID__in=ids)
        serializer = DrinkSerializer(drinks, many=True)
        return Response(serializer.data)

# Frontend: Single request
const ids = checkoutList.join(',');
const response = await fetch(`${BASE_URL}/backend/drinks/bulk/?ids=${ids}`);
const drinks = await response.json();
```

**Impact:**
- Reduces requests from N to 1
- Latency: ~50ms per request × 5 = 250ms → 50ms (5x improvement)

**Priority:** MEDIUM

#### Bottleneck 3: Dynamic CSV Writes (Thread Safety)

**Problem:**
- `drinkAI.py` writes temporary rows to CSV files during similarity computation
- Not thread-safe: concurrent requests cause race conditions
- Potential data corruption

**Current Code:**
```python
# Temporarily append row to CSV
rows.append(new_row)
with open(csv_path, 'w') as file:
    writer.writerows(rows)

# ... compute similarity ...

# Remove row
rows.pop(-1)
with open(csv_path, 'w') as file:
    writer.writerows(rows)
```

**Solution:**
```python
def findBestSoda(self, syrupTypes: List[str], sodaPrefs: List[str]):
    """
    Use in-memory DataFrame only, avoid file writes.
    """
    # Create temporary DataFrame (copy)
    temp_df = self.sodaData.copy()
    
    # Append row in memory
    temp_df = temp_df.append({
        'name': 'user_syrups',
        'best-match-flavors': ' '.join(syrupTypes)
    }, ignore_index=True)
    
    # Compute on in-memory data (no file I/O)
    count_matrix = self.cvVectorizer.fit_transform(temp_df['best-match-flavors'])
    similarity = cosine_similarity(count_matrix)
    
    # ... rest of logic ...
    
    # temp_df discarded after function (no file modification)
```

**Impact:**
- Eliminates file I/O (faster)
- Thread-safe (no shared file state)
- Prevents data corruption

**Priority:** HIGH - Critical for multi-threaded production

#### Bottleneck 4: Multi-Store Inventory Aggregation

**Problem:**
- Super Admin dashboard queries all stores' inventory
- 100 stores × 80 items = 8,000 rows to aggregate

**Query:**
```python
# Slow: Full table scan
inventory = Inventory.objects.all()
```

**Solution:**
```sql
-- Create materialized view refreshed every 5 minutes
CREATE MATERIALIZED VIEW inventory_summary AS
SELECT 
    ItemName,
    ItemType,
    SUM(Quantity) as TotalQuantity,
    COUNT(DISTINCT StoreID) as StoresInStock,
    AVG(ThresholdLevel) as AvgThreshold
FROM inventory
GROUP BY ItemName, ItemType;

CREATE INDEX idx_inv_summary_name ON inventory_summary(ItemName);

-- Refresh job
REFRESH MATERIALIZED VIEW CONCURRENTLY inventory_summary;
```

**Django ORM:**
```python
from django.db import connection

def getInventorySummary():
    with connection.cursor() as cursor:
        cursor.execute("SELECT * FROM inventory_summary")
        return cursor.fetchall()
```

**Impact:**
- Query time: 5-10 seconds → 50ms (100x improvement)

**Priority:** MEDIUM (implement when multi-store deployed)

### 7.2 Security Risks & Mitigations

#### Risk 1: CSV Injection via Ingredient Names

**Attack Vector:**
- Malicious user creates preference with CSV formula: `=CMD|'/C calc'!A1`
- When exported to CSV, executes code on admin's machine

**Mitigation:**
```python
# In PreferenceSerializer
class PreferenceSerializer(serializers.ModelSerializer):
    ALLOWED_INGREDIENTS = [
        'coconut', 'pineapple', 'strawberry', ... # 80+ items
    ]
    
    def validate_Preference(self, value):
        normalized = value.lower().strip()
        
        # Whitelist validation
        if normalized not in self.ALLOWED_INGREDIENTS:
            raise serializers.ValidationError(
                f"Invalid ingredient: {value}"
            )
        
        # Additional CSV injection check
        dangerous_chars = ['=', '+', '-', '@', '|', '\t']
        if any(char in value for char in dangerous_chars):
            raise serializers.ValidationError(
                "Invalid characters in preference"
            )
        
        return normalized
```

**Status:** ✅ Already implemented in serializers.py

#### Risk 2: Inventory Manipulation

**Attack Vector:**
- Unauthorized PATCH to `/backend/inventory/<id>/` with arbitrary quantities
- Attacker increases stock to hide theft or manipulate reports

**Current Issue:**
```python
# No authentication check
class InventoryUpdate(RetrieveUpdateAPIView):
    queryset = Inventory.objects.all()
    serializer_class = InventorySerializer
    # MISSING: permission_classes
```

**Mitigation:**
```python
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import permission_classes

class IsStoreManager(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_staff

class InventoryUpdate(RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated, IsStoreManager]
    
    def update(self, request, *args, **kwargs):
        # Audit logging
        AuditLog.objects.create(
            user=request.user,
            action='INVENTORY_UPDATE',
            item_id=kwargs['pk'],
            old_quantity=self.get_object().Quantity,
            new_quantity=request.data.get('Quantity'),
            timestamp=timezone.now()
        )
        
        # Add reasonable limits
        new_qty = int(request.data.get('Quantity', 0))
        if new_qty > 10000:  # Max reasonable stock
            return Response(
                {'error': 'Quantity exceeds maximum allowed'},
                status=400
            )
        
        return super().update(request, *args, **kwargs)
```

**Priority:** ⚠️ CRITICAL - Implement immediately

#### Risk 3: AI Model Poisoning

**Attack Vector:**
- Attacker creates 1000s of preferences with rare ingredients
- Biases recommendations toward unavailable items

**Mitigation:**
```python
class PreferenceRateLimiter:
    MAX_PREFS_PER_USER = 50
    MAX_PREFS_PER_HOUR = 10
    
    def checkLimit(self, userId: int):
        # Total limit
        count = Preference.objects.filter(UserID=userId).count()
        if count >= self.MAX_PREFS_PER_USER:
            raise PermissionDenied("Maximum preferences reached")
        
        # Rate limit (last hour)
        recent = Preference.objects.filter(
            UserID=userId,
            created_at__gte=timezone.now() - timedelta(hours=1)
        ).count()
        
        if recent >= self.MAX_PREFS_PER_HOUR:
            raise ThrottledException("Too many preferences created")
```

**Priority:** MEDIUM

#### Risk 4: DialoGPT Inappropriate Responses

**Attack Vector:**
- User provides offensive prompts
- DialoGPT generates inappropriate business responses

**Mitigation:**
```python
class ResponseFilter:
    BANNED_WORDS = ['profanity1', 'profanity2', ...]  # Load from config
    FALLBACK_RESPONSES = [
        "I'm sorry, I didn't understand that. Can you rephrase?",
        "Let me connect you with a manager for assistance.",
        "Please use the contact form for this type of request."
    ]
    
    def validateResponse(self, response: str) -> str:
        # Check for banned words
        for word in self.BANNED_WORDS:
            if word in response.lower():
                return random.choice(self.FALLBACK_RESPONSES)
        
        # Check response length (too short = likely error)
        if len(response) < 10:
            return self.FALLBACK_RESPONSES[0]
        
        # Check for code/script injection attempts
        dangerous_patterns = ['<script>', 'javascript:', 'eval(']
        if any(pattern in response.lower() for pattern in dangerous_patterns):
            return self.FALLBACK_RESPONSES[0]
        
        return response
```

**Implementation:**
```python
def generateResponse(self, userInput: str):
    raw_response = self.model.generate(...)
    filtered_response = self.responseFilter.validateResponse(raw_response)
    return filtered_response
```

**Priority:** HIGH - Implement before chatbot launch

---

## 8. Implementation Tasks

### 8.1 Task Prioritization (MoSCoW)

| Task | Priority | Team | Effort | Dependencies |
|------|----------|------|--------|--------------|
| Multi-store database schema | MUST | Database | 1 week | None |
| Supply hub network implementation | MUST | Backend | 3 weeks | Multi-store schema |
| Automated inventory deduction | MUST | Backend | 1 week | Order system |
| AI demand prediction service | MUST | Backend | 2 weeks | Historical data |
| Redis caching for CSV data | SHOULD | Backend | 1 week | Redis setup |
| Bulk drink fetch endpoint | SHOULD | Backend | 2 days | None |
| Inventory permissions & audit | MUST | Backend | 1 week | Auth system |
| Logistics Manager dashboard | MUST | Frontend | 2 weeks | Supply hub API |
| Manager low-stock alerts | SHOULD | Frontend | 1 week | Notification system |
| Response filtering for chatbot | SHOULD | Backend | 1 week | Chatbot system |

### 8.2 Detailed Task Breakdown

#### Task 1: Multi-Store Database Schema (CRITICAL)

**Assigned to:** Database Team  
**Duration:** 1 week  
**Priority:** MUST HAVE

**Subtasks:**
1. Create migration for `stores` table
2. Create migration for `supply_hubs` table
3. Create migration for `stock_transfers` table
4. Add `StoreID` foreign key to `inventory` table
5. Add `StoreID` foreign key to `orders` table
6. Create indexes on new foreign keys
7. Populate 7 supply hubs seed data
8. Create 20 stores in Region C (Logan UT)
9. Create 5+ stores in neighboring regions
10. Run migration on development database
11. Verify data integrity

**Acceptance Criteria:**
- All tables created with correct schema
- Foreign key constraints working
- Seed data populated
- No data loss in existing tables

#### Task 2: Supply Hub Network Implementation (CRITICAL)

**Assigned to:** Backend Team (Primary)  
**Duration:** 3 sprint weeks  
**Priority:** MUST HAVE  
**Dependencies:** Multi-store schema

**Subtasks:**

**Week 1: Core Models & Repositories**
1. Create `SupplyHub` model class
2. Create `StockTransfer` model class
3. Create `Store` model class
4. Implement `SupplyHubRepository`
5. Implement `StockTransferRepository`
6. Write unit tests for repositories

**Week 2: Service Layer**
7. Implement `SupplyHubService` class
   - `findNearestHub(storeId)` method
   - `requestSupply(itemName, quantity, storeId)` method
   - `calculateDeliveryTime()` method
8. Implement `SupplyCoordinator` class
   - `autoReorder()` logic
   - `optimizeBatchOrders()` logic
9. Integrate with `InventoryService`
10. Write integration tests

**Week 3: API Endpoints & Documentation**
11. Create `/api/supply-hubs/` endpoint (GET list)
12. Create `/api/supply-hubs/<id>/inventory/` endpoint
13. Create `/api/stock-transfers/` endpoint (POST create, GET list)
14. Create `/api/stock-transfers/<id>/` endpoint (PATCH update status)
15. Write API documentation (Swagger)
16. End-to-end testing

**Acceptance Criteria:**
- Hub selection algorithm works correctly (regional + 1000-mile fallback)
- Stock transfers created and tracked
- API endpoints functional and documented
- 90%+ test coverage

#### Task 3: Automated Inventory Deduction (CRITICAL)

**Assigned to:** Backend Team  
**Duration:** 1 week  
**Priority:** MUST HAVE  
**Dependencies:** Order completion system

**Subtasks:**
1. Design `OrderCompletionService` class
2. Implement `extractIngredients()` method
   - Parse all drinks in order
   - Count ingredient quantities (handle duplicates)
3. Implement transaction-wrapped `fulfillOrder()` method
4. Add rollback logic for insufficient stock
5. Integrate with `InventoryService.bulkDeduct()`
6. Add order failure notifications
7. Write unit tests (mock inventory)
8. Write integration tests (real database)
9. Test edge cases:
   - Out of stock mid-order
   - Concurrent order race conditions
   - Partial fulfillment scenarios

**Acceptance Criteria:**
- Inventory deducted atomically on order completion
- Rollback works correctly on failure
- No race conditions (use `select_for_update()`)
- Customer notified on order failure

#### Task 4: AI Demand Prediction Service (CRITICAL)

**Assigned to:** Backend Team (ML Focus)  
**Duration:** 2 weeks  
**Priority:** MUST HAVE  
**Dependencies:** Historical sales data

**Subtasks:**

**Week 1: Model Development**
1. Design `DemandPredictionService` class
2. Create CSV import format specification
3. Generate synthetic historical data (6 months)
4. Implement feature engineering:
   - Date features (day of week, month, weekend)
   - One-hot encoding for items and stores
   - External factors (temperature, promotions)
5. Train RandomForestRegressor model
6. Evaluate model (R², MAE, RMSE)
7. Tune hyperparameters (GridSearchCV)

**Week 2: Integration & API**
8. Implement `predictDemand()` method
9. Implement `generateReorderRecommendations()` method
10. Create `/api/demand-predictions/<item_name>/` endpoint
11. Create `/api/reorder-recommendations/<store_id>/` endpoint
12. Integrate with `SupplyCoordinator.autoReorder()`
13. Create CSV import endpoint for logistics managers
14. Write documentation and usage guide

**Acceptance Criteria:**
- Model achieves R² > 0.7 on test set
- Predictions available via API
- CSV import functional for logistics managers
- Integration with supply coordination working

#### Task 5: Redis Caching for CSV Data (OPTIMIZATION)

**Assigned to:** Backend Team  
**Duration:** 1 week  
**Priority:** SHOULD HAVE

**Subtasks:**
1. Set up Redis server (Docker container)
2. Install redis-py library
3. Implement `CSVCacheManager` class
4. Modify `ContentBasedFilter` to use cache
5. Implement cache invalidation strategy
6. Add cache warming on application startup
7. Write cache hit/miss logging
8. Load test (measure performance improvement)
9. Document Redis configuration

**Acceptance Criteria:**
- AI recommendation latency reduced by 50%+
- Cache hit rate > 95%
- Fallback to file I/O on cache miss

#### Task 6: Logistics Manager Dashboard (CRITICAL)

**Assigned to:** Frontend Team  
**Duration:** 2 weeks  
**Priority:** MUST HAVE  
**Dependencies:** Supply hub API

**Subtasks:**

**Week 1: UI Components**
1. Create `LogisticsDash.js` page
2. Implement hub inventory overview cards
3. Create interactive map (Mapbox) showing:
   - 7 supply hubs with markers
   - Store locations
   - Delivery routes
4. Implement stock transfer list/table
5. Add filtering by region, status, priority

**Week 2: Functionality & Features**
6. CSV import component for demand data
7. Demand prediction charts (Chart.js)
8. Reorder recommendations panel
9. Approve/reject transfer requests
10. Real-time status updates (WebSocket or polling)
11. Export reports to CSV

**Acceptance Criteria:**
- Dashboard displays all 7 hubs correctly
- Map shows stores and routes
- CSV import works correctly
- Logistics manager can approve transfers

#### Task 7: Inventory Permissions & Audit Logging (CRITICAL)

**Assigned to:** Backend Team (Security Focus)  
**Duration:** 1 week  
**Priority:** MUST HAVE

**Subtasks:**
1. Create `AuditLog` model
2. Create `IsStoreManager` permission class
3. Add authentication to inventory endpoints
4. Implement audit logging in `InventoryUpdate` view
5. Add quantity validation limits
6. Create `/api/audit-logs/` endpoint (read-only)
7. Write security tests (unauthorized access attempts)
8. Document security model

**Acceptance Criteria:**
- Only authenticated managers can update inventory
- All changes logged with user, timestamp, old/new values
- Invalid quantities rejected
- Audit logs viewable by admins

---

## 9. Design Decision Summary

### Decision 1: ArrayField vs Junction Tables

**Context:** How to store drink ingredients (syrups, add-ins)?

**Options:**
1. **PostgreSQL ArrayField** (chosen)
2. Junction tables (drink_syrups, drink_addins)
3. JSONB field

**Decision:** ArrayField

**Rationale:**
- Simpler queries (no JOINs for ingredient retrieval)
- Flexible (add/remove ingredients without migrations)
- PostgreSQL GIN indexing supports fast searches
- **Trade-off:** Harder referential integrity, denormalized
- **Acceptable for MVP:** Validation in Django serializer sufficient

---

### Decision 2: Content-Based vs Collaborative Filtering

**Context:** Which ML algorithm for drink recommendations?

**Options:**
1. **Content-Based Filtering with Scikit-Learn** (chosen)
2. User-user Collaborative Filtering
3. Item-item Collaborative Filtering
4. Matrix Factorization (SVD)

**Decision:** Content-Based Filtering

**Rationale:**
- **Solves cold-start problem:** Works for new users immediately
- **Data requirements:** Only needs ingredient properties (type, flavor)
- **Personalization:** Based on user's own preferences, not other users
- **Trade-off:** Doesn't capture popularity trends (can add CF later)
- **Startup-friendly:** No need for large user base to train

---

### Decision 3: DialoGPT vs Claude API

**Context:** Which AI model for customer service chatbot?

**Options:**
1. **DialoGPT (microsoft/DialoGPT-medium)** (chosen)
2. Claude API by Anthropic
3. GPT-4 API by OpenAI
4. Fine-tuned local model

**Decision:** DialoGPT

**Rationale:**
- **Cost:** Free vs paid ($8-24 per 1M tokens for Claude)
- **Latency:** Local inference (~500ms) vs API call (~1-2s)
- **MVP viability:** State machine handles flow, response quality less critical
- **Upgrade path:** Can switch to Claude in production if needed
- **Trade-off:** Less natural responses (mitigated by structured state machine)

---

### Decision 4: CSV Files vs Database for Ingredient Metadata

**Context:** Where to store ingredient properties (type, flavor categories)?

**Options:**
1. **CSV files (Syrups.csv, Sodas.csv, AddIns.csv)** (chosen)
2. Database tables (IngredientProperties)
3. Hardcoded in application

**Decision:** CSV files

**Rationale:**
- **Version control:** Easy to track changes in Git
- **No migrations:** Can update properties without schema changes
- **ML-friendly:** Scikit-Learn reads CSV directly
- **Quick edits:** Non-developers can update via Excel
- **Trade-off:** File I/O overhead (mitigated by Redis caching)

---

### Decision 5: Multi-Store Architecture

**Context:** How to support 100+ stores nationwide?

**Options:**
1. **Centralized database, multi-tenant model** (chosen for Phase 1)
2. Distributed databases per store
3. Microservices per region

**Decision:** Centralized multi-tenant (with future decentralization)

**Rationale:**
- **Simpler for MVP:** Single database, add StoreID foreign keys
- **Consistent data:** No synchronization complexity
- **Cost-effective:** Single infrastructure
- **Future-proof:** Can migrate to distributed model later
- **Trade-off:** Single point of failure (mitigated by replication)