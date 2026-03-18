// src/services/inventoryService.js
// Inventory management service

import { getInventoryDb, getNextId, getTimestamp } from "../utils/db.js"
import { validateInventoryItemType, validatePositiveInteger } from "../utils/validation.js"

export async function createInventoryItem(itemName, itemType, quantity, thresholdLevel) {
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

  const inventoryDb = getInventoryDb()
  const itemId = await getNextId(inventoryDb, "inventory")

  const item = {
    inventoryId: itemId,
    itemName,
    itemType,
    quantity: parseInt(quantity, 10),
    thresholdLevel: parseInt(thresholdLevel, 10),
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

  item.quantity = parseInt(newQuantity, 10)
  item.lastUpdated = getTimestamp()
  await inventoryDb.put(`inventory:${itemId}`, item)
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
  if (updates.thresholdLevel !== undefined) {
    item.thresholdLevel = parseInt(updates.thresholdLevel, 10)
  }

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

export async function getLowStockItems() {
  const inventoryDb = getInventoryDb()
  const allItems = await inventoryDb.all()
  const lowStock = []
  for (const entry of allItems) {
    const item = entry.value
    if (item && item.inventoryId && item.quantity <= item.thresholdLevel) {
      lowStock.push(item)
    }
  }
  return lowStock
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
      if (item.quantity <= item.thresholdLevel) {
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
