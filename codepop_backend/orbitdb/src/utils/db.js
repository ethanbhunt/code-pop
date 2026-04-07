// src/utils/db.js
// OrbitDB database singleton and accessors
// Provides centralized access to all CodePop databases

let orbitdb = null
let databases = {}

// Initialize OrbitDB and databases (called from peer-node.js)
export async function initializeOrbitDB(orbitdbInstance, dbAddresses) {
  orbitdb = orbitdbInstance
  
  // Open all databases using addresses from bootstrap
  try {
    databases.users = await orbitdb.open(dbAddresses.users, { type: "keyvalue" })
    databases.tokens = await orbitdb.open(dbAddresses.tokens, { type: "keyvalue" })
    databases.preferences = await orbitdb.open(dbAddresses.preferences, { type: "keyvalue" })
    databases.drinks = await orbitdb.open(dbAddresses.drinks, { type: "keyvalue" })
    databases.inventory = await orbitdb.open(dbAddresses.inventory, { type: "keyvalue" })
    databases.orders = await orbitdb.open(dbAddresses.orders, { type: "keyvalue" })
    databases.notifications = await orbitdb.open(dbAddresses.notifications, { type: "keyvalue" })
    databases.revenues = await orbitdb.open(dbAddresses.revenues, { type: "keyvalue" })
    databases.payments = await orbitdb.open(dbAddresses.payments, { type: "keyvalue" })
    databases.auditLogs = await orbitdb.open(dbAddresses.auditLogs, { type: "keyvalue" })
    databases.qrcodes = await orbitdb.open(dbAddresses.qrcodes, { type: "keyvalue" })
    databases.stores = await orbitdb.open(dbAddresses.stores, { type: "keyvalue" })
    databases.maintenance = await orbitdb.open(dbAddresses.maintenance, { type: "keyvalue" })
    databases.logistics = await orbitdb.open(dbAddresses.logistics, { type: "keyvalue" })
    
    // Open store-scoped databases
    console.log("[ ^ ] Initializing store-scoped databases...")
    for (const [key, address] of Object.entries(dbAddresses)) {
      if (key.includes('store-')) {
        databases[key] = await orbitdb.open(address, { type: "keyvalue" })
      }
    }
    
    console.log("[ ^ ]  All databases initialized")
    return true
  } catch (err) {
    console.error("Error initializing databases:", err)
    throw err
  }
}

// Database accessors (throw if not initialized)
export function getUsersDb() {
  if (!databases.users) throw new Error("Users database not initialized")
  return databases.users
}

export function getTokensDb() {
  if (!databases.tokens) throw new Error("Tokens database not initialized")
  return databases.tokens
}

export function getPreferencesDb() {
  if (!databases.preferences) throw new Error("Preferences database not initialized")
  return databases.preferences
}

export function getDrinksDb() {
  if (!databases.drinks) throw new Error("Drinks database not initialized")
  return databases.drinks
}

export function getInventoryDb() {
  if (!databases.inventory) throw new Error("Inventory database not initialized")
  return databases.inventory
}

export function getOrdersDb() {
  if (!databases.orders) throw new Error("Orders database not initialized")
  return databases.orders
}

export function getNotificationsDb() {
  if (!databases.notifications) throw new Error("Notifications database not initialized")
  return databases.notifications
}

export function getRevenuesDb() {
  if (!databases.revenues) throw new Error("Revenues database not initialized")
  return databases.revenues
}

export function getPaymentsDb() {
  if (!databases.payments) throw new Error("Payments database not initialized")
  return databases.payments
}

export function getAuditLogsDb() {
  if (!databases.auditLogs) throw new Error("Audit logs database not initialized")
  return databases.auditLogs
}

export function getQRCodesDb() {
  if (!databases.qrcodes) throw new Error("QR Codes database not initialized")
  return databases.qrcodes
}

export function getStoresDb() {
  if (!databases.stores) throw new Error("Stores database not initialized")
  return databases.stores
}

export function getMaintenanceDb() {
  if (!databases.maintenance) throw new Error("Maintenance database not initialized")
  return databases.maintenance
}

export function getLogisticsDb() {
  if (!databases.logistics) throw new Error("Logistics database not initialized")
  return databases.logistics
}

// Store-scoped database accessors
export function getStoreOrdersDb(storeId) {
  const dbKey = `store-${storeId}-orders`
  if (!databases[dbKey]) throw new Error(`Store ${storeId} orders database not initialized`)
  return databases[dbKey]
}

export function getStoreInventoryDb(storeId) {
  const dbKey = `store-${storeId}-inventory`
  if (!databases[dbKey]) throw new Error(`Store ${storeId} inventory database not initialized`)
  return databases[dbKey]
}

export function getStoreRevenuesDb(storeId) {
  const dbKey = `store-${storeId}-revenues`
  if (!databases[dbKey]) throw new Error(`Store ${storeId} revenues database not initialized`)
  return databases[dbKey]
}

// Helper: Get all database info (for /info endpoint)
export function getAllDatabaseInfo() {
  return {
    users: databases.users?.address.toString() || "not initialized",
    tokens: databases.tokens?.address.toString() || "not initialized",
    preferences: databases.preferences?.address.toString() || "not initialized",
    drinks: databases.drinks?.address.toString() || "not initialized",
    inventory: databases.inventory?.address.toString() || "not initialized",
    orders: databases.orders?.address.toString() || "not initialized",
    notifications: databases.notifications?.address.toString() || "not initialized",
    revenues: databases.revenues?.address.toString() || "not initialized",
    payments: databases.payments?.address.toString() || "not initialized",
    auditLogs: databases.auditLogs?.address.toString() || "not initialized",
    qrcodes: databases.qrcodes?.address.toString() || "not initialized",
    stores: databases.stores?.address.toString() || "not initialized",
    maintenance: databases.maintenance?.address.toString() || "not initialized",
    logistics: databases.logistics?.address.toString() || "not initialized"
  }
}

// Helper: Get all entries from a database (with optional filter)
export async function getAllEntries(db, filter = null) {
  try {
    const entries = await db.all()
    if (!filter) return entries
    
    return entries.filter(entry => filter(entry))
  } catch (err) {
    console.error("Error fetching all entries:", err)
    throw err
  }
}

// Helper: Get entry by key with retry logic
export async function getEntryWithRetry(db, key, maxRetries = 3) {
  let lastError
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await db.get(key)
    } catch (err) {
      lastError = err
      if (i < maxRetries - 1) {
        await new Promise(r => setTimeout(r, 100 * (i + 1)))
      }
    }
  }
  
  throw lastError
}

// Helper: Put entry with retry logic
export async function putEntryWithRetry(db, key, value, maxRetries = 3) {
  let lastError
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await db.put(key, value)
    } catch (err) {
      lastError = err
      if (i < maxRetries - 1) {
        await new Promise(r => setTimeout(r, 100 * (i + 1)))
      }
    }
  }
  
  throw lastError
}

// Helper: Delete entry with retry logic
export async function deleteEntryWithRetry(db, key, maxRetries = 3) {
  let lastError
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await db.del(key)
    } catch (err) {
      lastError = err
      if (i < maxRetries - 1) {
        await new Promise(r => setTimeout(r, 100 * (i + 1)))
      }
    }
  }
  
  throw lastError
}

// Helper: Check if entry exists
export async function entryExists(db, key) {
  try {
    const value = await db.get(key)
    return value !== undefined && value !== null
  } catch {
    return false
  }
}

// Helper: Count entries in database
export async function countEntries(db) {
  try {
    const entries = await db.all()
    return entries.length
  } catch (err) {
    console.error("Error counting entries:", err)
    return 0
  }
}

// Helper: Get next auto-increment ID from counter
export async function getNextId(db, entityType) {
  const counterKey = `counter:${entityType}`
  try {
    let counter = await db.get(counterKey)
    if (counter === undefined || counter === null) {
      counter = { count: 0 }
    } else if (typeof counter === "string") {
      counter = JSON.parse(counter)
    }
    
    const nextId = counter.count + 1
    await db.put(counterKey, { count: nextId })
    return nextId
  } catch (err) {
    console.error(`Error getting next ID for ${entityType}:`, err)
    throw err
  }
}

// Helper: Format timestamp in ISO 8601
export function getTimestamp() {
  return new Date().toISOString()
}
