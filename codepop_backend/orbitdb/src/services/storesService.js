// src/services/storesService.js
// Store management and metadata operations

import { getStoresDb } from "../utils/db.js"
import { getTimestamp } from "../utils/db.js"

/**
 * Get store by ID
 */
export async function getStoreById(storeId) {
  const db = getStoresDb()
  const store = await db.get(`store:${storeId}`)
  
  if (!store) {
    throw new Error(`Store ${storeId} not found`)
  }
  
  return store
}

/**
 * List all stores with pagination
 */
export async function listStores(offset = 0, limit = 50) {
  const db = getStoresDb()
  const allEntries = await db.all()
  
  // Filter out counter entries and sort by storeId
  const stores = allEntries
    .filter(entry => entry.key.startsWith("store:"))
    .sort((a, b) => a.value.storeId - b.value.storeId)
  
  // Apply pagination
  const paginatedStores = stores.slice(offset, offset + limit)
  
  return {
    count: stores.length,
    data: paginatedStores.map(entry => entry.value)
  }
}

/**
 * Create new store
 */
export async function createStore(data) {
  const db = getStoresDb()
  
  // Validate required fields
  if (!data.name || !data.address || !data.city || !data.region) {
    throw new Error("Missing required fields: name, address, city, region")
  }
  
  // Get next store ID
  let counterEntry = await db.get("counter:store")
  let nextId = 1
  
  if (counterEntry) {
    nextId = counterEntry + 1
  }
  
  // Create store object
  const store = {
    storeId: nextId,
    name: data.name,
    address: data.address,
    city: data.city,
    region: data.region,
    timezone: data.timezone || "America/New_York",
    coordinates: {
      lat: data.lat || 0,
      lng: data.lng || 0
    },
    manager: data.manager || null,
    staffCount: data.staffCount || 0,
    status: data.status || "operational",
    operatingHours: data.operatingHours || {
      monday: { open: "06:00", close: "22:00" },
      tuesday: { open: "06:00", close: "22:00" },
      wednesday: { open: "06:00", close: "22:00" },
      thursday: { open: "06:00", close: "22:00" },
      friday: { open: "06:00", close: "23:00" },
      saturday: { open: "07:00", close: "23:00" },
      sunday: { open: "07:00", close: "22:00" }
    },
    createdAt: getTimestamp(),
    updatedAt: getTimestamp()
  }
  
  // Save to database
  await db.put(`store:${store.storeId}`, store)
  await db.put("counter:store", nextId)
  
  return store
}

/**
 * Update store
 */
export async function updateStore(storeId, updates) {
  const db = getStoresDb()
  const store = await getStoreById(storeId)
  
  // Update fields
  const updated = {
    ...store,
    ...updates,
    storeId: store.storeId, // preserve ID
    createdAt: store.createdAt, // preserve creation date
    updatedAt: getTimestamp()
  }
  
  await db.put(`store:${storeId}`, updated)
  return updated
}

/**
 * Delete store
 */
export async function deleteStore(storeId) {
  const db = getStoresDb()
  await db.del(`store:${storeId}`)
}

/**
 * Get store count
 */
export async function getStoreCount() {
  const db = getStoresDb()
  const allEntries = await db.all()
  return allEntries.filter(entry => entry.key.startsWith("store:")).length
}
