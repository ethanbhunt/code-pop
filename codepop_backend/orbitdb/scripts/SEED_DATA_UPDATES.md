# Seed Data Script Updates

## Summary of Changes

The seed data scripts have been completely updated to correctly reflect and use the actual API endpoints and data structures in the OrbitDB backend.

### Key Changes Made

#### 1. **seed_config.py - Configuration Data**

**Users**
- Updated to match actual roles in system: `superadmin`, `manager`, `admin`, `customer`
- Added a customer account for regular user testing
- Removed unused user variations (`customer_jane`, `staff_bob`, `admin_alex`)

**Drinks**
- Removed unsupported fields: `category`
- Updated to use correct API fields:
  - `sodas` (array) - replaces old format
  - `syrups` (array) - syrup selections
  - `addIns` (array) - additional items like whip, foam
  - `ingredients` (array) - base ingredients
  - Kept: `description`, `price`, `isVegan`, `isGlutenFree`, `calories`, `rating`

**Preferences**
- Complete restructure to match API schema
- Changed from: `drink_name`, `ingredient_name`, `preference_type`
- Changed to: `preference` (main field), `preferenceType`, `sweetness`, `temperature`, `ingredientName`
- `preference` field accepts values like: `"vanilla"`, `"caramel"`, `"mtn. dew"`, `"whip"`, `"extra ice"`, etc.
- `preferenceType` can be: `"favorite"`, `"allergic"`, `"dislike"`, `"recommended"`, `"ingredient_preference"`
- Added proper structure with `username` to link preferences to users

**Inventory**
- Added required `storeId` field
- Changed field name: `thresholdLevel` (was `minThreshold` in some docs)
- Updated `itemType` values to match API: `"Soda"`, `"Syrup"`, `"Add In"`, `"Physical"`
- Kept optional fields: `supplier`, `costPerUnit`

**Test Credentials**
- Updated to reflect actual test users:
  - `superadmin` with role `superadmin`
  - `manager` with role `manager`
  - `admin` with role `admin`

#### 2. **seed_data.py - Seeding Script**

**Error Handling**
- Added `urllib.error.URLError` handling for connection errors
- Improved error messages and validation

**User Seeding**
- Fixed token and user ID extraction from response
- Improved admin token selection (uses first user with admin/superadmin role)
- Better validation of response format

**Preference Seeding**
- Complete rewrite to match new API format
- Now correctly builds request with `preference` as main field
- Properly handles optional fields: `preferenceType`, `sweetness`, `temperature`, `ingredientName`
- No longer tries to match drink names or create complex mappings

**Drink Seeding**
- Improved response handling and error messages
- Better extraction of drink ID from response

**Inventory Seeding**
- Updated to include `storeId` in all requests
- Improved output formatting showing item type and quantity

### API Endpoints Used

```
POST /backend/auth/register        - Create new user
POST /backend/drinks              - Create drink
POST /backend/preferences         - Create preference
POST /backend/inventory          - Create inventory item
GET  /backend/users              - List users (for cleanup)
DELETE /backend/users/delete/:id - Delete user (for cleanup)
GET  /health                     - Health check
```

### Field Name Conventions Now Correctly Applied

**User Fields:**
- `userId`, `username`, `email`, `password`, `firstName`, `lastName`, `role`

**Drink Fields:**
- `name`, `description`, `price`, `sodas` (array), `syrups` (array), `addIns` (array), `ingredients` (array)
- `isVegan`, `isGlutenFree`, `calories`, `rating`

**Preference Fields:**
- `preference` (required, string value), `preferenceType` (optional)
- `sweetness`, `temperature`, `ingredientName` (optional context fields)

**Inventory Fields:**
- `storeId` (required), `itemName`, `itemType`, `quantity`, `thresholdLevel`
- `supplier`, `costPerUnit` (optional)

### How to Use

1. Start the OrbitDB backend:
   ```bash
   cd codepop_backend/orbitdb
   
   # Terminal 1: Start bootstrap node
   npm run bootstrap
   
   # Terminal 2: Start peer node
   npm run peer
   ```

2. Run the seed script:
   ```bash
   # Terminal 3: Seed all data (creates new users/data or skips if exists)
   cd scripts
   python3 seed_data.py --all
   
   # Or seed specific components
   python3 seed_data.py --users      # Seed only users
   python3 seed_data.py --drinks     # Seed only drinks (requires users)
   python3 seed_data.py --preferences # Seed only preferences
   python3 seed_data.py --inventory   # Seed only inventory (requires users)
   ```

3. Clear existing test data:
   ```bash
   python3 seed_data.py --clear
   ```

4. Reset and reseed everything (recommended if you have existing data):
   ```bash
   python3 seed_data.py --reset
   ```

### Key Features

- **Smart User Creation**: If users already exist, the script logs in to get auth tokens instead of failing
- **Automatic Admin Detection**: First user with admin/superadmin role is used for protected operations
- **Graceful Error Handling**: Skips existing data and continues seeding instead of failing completely
- **Clear Command**: Deletes all test users and their associated data when needed
- **Reset Mode**: Clears everything and reseeds in one command

### Test Credentials After Seeding

- Use the test credentials defined in `seed_config.py`.

### Data Created

- **Users**: 4 (superadmin, manager, admin, customer with different roles)
- **Drinks**: 8 (coffee, tea, smoothie, juice varieties)
- **Preferences**: 9 (2-3 per user covering favorites, dislikes, recommendations)
- **Inventory**: 5 items (syrups, milk options, espresso beans)

### Backward Compatibility Notes

The drinks endpoint supports both old and new field names:
- `syrups` or `syrupsUsed` - both accepted
- `sodas` or `sodaUsed` - both accepted

However, the seed data now uses the standard `syrups` and `sodas` field names.

### What Was Fixed

1. ✅ Correct API endpoint paths with `/backend/` prefix
2. ✅ Correct request/response field names matching actual API
3. ✅ Proper preference structure using valid whitelist values only
4. ✅ Required `storeId` for inventory items
5. ✅ Correct enumeration values for `preferenceType`, `itemType`, etc.
6. ✅ Better error handling and validation
7. ✅ Consistent field naming conventions (camelCase for IDs and compound names)
8. ✅ Proper token extraction from authentication responses
9. ✅ Passwords now meet 8-character minimum requirement
10. ✅ Smart user creation with login fallback for existing users
11. ✅ Graceful handling of backend issues with helpful error messages

### Backend Issues Fixed

✅ **Inventory Endpoint Bug** - FIXED in `src/routes/inventory.js`
  - Was using non-existent `req.user.enum` and `req.user.assignedStores` fields
  - Now correctly uses `req.user.role` from auth middleware
  - Full details in `ENDPOINT_DISCREPANCIES.md`
