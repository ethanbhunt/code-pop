// src/services/inventoryService.js
// Inventory management service

import { getInventoryDb, getNextId, getTimestamp } from "../utils/db.js"
import { validateInventoryItemType, validatePositiveInteger } from "../utils/validation.js"
import * as reorderService from "./reorderService.js"

export async function createInventoryItem(storeId, itemName, itemType, quantity, thresholdLevel, costPerUnit = null, supplier = null) {
  if (!itemName || !itemType) {
    throw new Error("Item name and type are required")
  }
  if (!validateInventoryItemType(itemType)) {
    throw new Error("Invalid item type")
  }
  if (!validatePositiveInteger(quantity)) {
    throw new Error("Quantity must be a positive integer")
  }
  if (!validatePositiveInteger(thresholdLevel)) {
    throw new Error("Threshold level must be a positive integer")
  }

  if (costPerUnit !== null && (isNaN(parseFloat(costPerUnit)) || parseFloat(costPerUnit) < 0)) {
    throw new Error("Cost per unit must be a positive number")
  }

  const inventoryDb = getInventoryDb()
  const itemId = await getNextId(inventoryDb, "inventory")

  const item = {
    inventoryId: itemId,
    storeId: storeId,
    itemName,
    itemType,
    quantity: parseInt(quantity, 10),
    minThreshold: parseInt(thresholdLevel, 10),
    costPerUnit: costPerUnit ? parseFloat(costPerUnit) : null,
    supplier: supplier || null,
    lastRestocked: getTimestamp(),
    lastUpdated: getTimestamp()
  }

  await inventoryDb.put(`inventory:${itemId}`, item)
  return item
}

export async function getInventoryById(itemId) {
  const inventoryDb = getInventoryDb()
  const item = await inventoryDb.get(`inventory:${itemId}`)
  if (!item) throw new Error("Inventory item not found")
  return item
}

export async function listInventory(limit = 100) {
  const inventoryDb = getInventoryDb()
  const allItems = await inventoryDb.all()
  const items = []
  for (const entry of allItems) {
    const item = entry.value
    if (item && item.inventoryId) {
      items.push(item)
    }
    if (items.length >= limit) break
  }
  return items
}

export async function updateInventoryQuantity(itemId, newQuantity) {
  const inventoryDb = getInventoryDb()
  const item = await inventoryDb.get(`inventory:${itemId}`)
  if (!item) throw new Error("Inventory item not found")

  if (!validatePositiveInteger(newQuantity) && newQuantity !== 0) {
    throw new Error("Quantity must be a non-negative integer")
  }

  const oldQuantity = item.quantity
  item.quantity = parseInt(newQuantity, 10)
  item.lastUpdated = getTimestamp()
  await inventoryDb.put(`inventory:${itemId}`, item)
  
  // Check if crossed threshold downward - auto-trigger reorder notification
  if (oldQuantity > item.minThreshold && item.quantity <= item.minThreshold) {
    // Check if notification already exists to avoid duplicates
    const hasNotif = await reorderService.hasOpenReorderNotification(itemId)
    if (!hasNotif) {
      await reorderService.createReorderNotification(
        item.storeId,
        itemId,
        item.itemName,
        item.minThreshold,
        item.quantity
      )
    }
  }
  
  return item
}

export async function updateInventoryItem(itemId, updates) {
  const inventoryDb = getInventoryDb()
  const item = await inventoryDb.get(`inventory:${itemId}`)
  if (!item) throw new Error("Inventory item not found")

  if (updates.itemName) item.itemName = updates.itemName
  if (updates.quantity !== undefined) {
    item.quantity = parseInt(updates.quantity, 10)
  }
  if (updates.minThreshold !== undefined) {
    item.minThreshold = parseInt(updates.minThreshold, 10)
  }
  if (updates.thresholdLevel !== undefined) {
    item.minThreshold = parseInt(updates.thresholdLevel, 10)
  }
  if (updates.costPerUnit !== undefined) {
    item.costPerUnit = updates.costPerUnit ? parseFloat(updates.costPerUnit) : null
  }
  if (updates.supplier !== undefined) {
    item.supplier = updates.supplier || null
  }

  item.lastUpdated = getTimestamp()
  await inventoryDb.put(`inventory:${itemId}`, item)
  return item
}

export async function restockItem(itemId, newQuantity) {
  const inventoryDb = getInventoryDb()
  const item = await inventoryDb.get(`inventory:${itemId}`)
  if (!item) throw new Error("Inventory item not found")

  if (!validatePositiveInteger(newQuantity) && newQuantity !== 0) {
    throw new Error("New quantity must be a non-negative integer")
  }

  item.quantity = parseInt(newQuantity, 10)
  item.lastRestocked = getTimestamp()
  item.lastUpdated = getTimestamp()

  await inventoryDb.put(`inventory:${itemId}`, item)
  return item
}

export async function deleteInventoryItem(itemId) {
  const inventoryDb = getInventoryDb()
  const item = await inventoryDb.get(`inventory:${itemId}`)
  if (!item) throw new Error("Inventory item not found")
  await inventoryDb.del(`inventory:${itemId}`)
  return true
}

export async function getLowStockItems(storeId = null) {
  const inventoryDb = getInventoryDb()
  const allItems = await inventoryDb.all()
  const lowStock = []
  for (const entry of allItems) {
    const item = entry.value
    if (item && item.inventoryId) {
      const threshold = item.minThreshold || item.thresholdLevel || 0
      if (item.quantity <= threshold) {
        if (storeId === null || item.storeId === storeId) {
          lowStock.push(item)
        }
      }
    }
  }
  return lowStock
}

export async function getStoreInventory(storeId, offset = 0, limit = 50) {
  const inventoryDb = getInventoryDb()
  const allItems = await inventoryDb.all()

  const sid = parseInt(storeId, 10)
  const storeItems = allItems
    .filter((entry) => {
      const v = entry.value
      if (!v || v.inventoryId == null) return false
      if (v.storeId === undefined || v.storeId === null) return false
      return parseInt(v.storeId, 10) === sid
    })
    .map((entry) => entry.value)

  // Multi-peer / repeated seeds can recreate the same logical item with different inventoryIds.
  // One row per (store, item name) — keep the newest record (highest id).
  const byItemName = new Map()
  for (const item of storeItems) {
    const key = String(item.itemName || "")
      .trim()
      .toLowerCase()
    if (!key) continue
    const prev = byItemName.get(key)
    if (!prev || item.inventoryId > prev.inventoryId) {
      byItemName.set(key, item)
    }
  }

  const uniqueSorted = Array.from(byItemName.values()).sort((a, b) =>
    String(a.itemName).localeCompare(String(b.itemName))
  )

  const paginatedItems = uniqueSorted.slice(offset, offset + limit)

  return {
    count: uniqueSorted.length,
    data: paginatedItems
  }
}

export async function generateInventoryReport() {
  const inventoryDb = getInventoryDb()
  const allItems = await inventoryDb.all()
  const items = []
  let totalValue = 0
  const lowStockItems = []

  for (const entry of allItems) {
    const item = entry.value
    if (item && item.inventoryId) {
      items.push(item)
      const threshold = item.minThreshold || item.thresholdLevel || 0
      if (item.quantity <= threshold) {
        lowStockItems.push(item)
      }
    }
  }

  return {
    totalItems: items.length,
    lowStockCount: lowStockItems.length,
    items,
    lowStockItems,
    generatedAt: getTimestamp()
  }
}
