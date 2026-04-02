// src/services/reorderService.js
// Auto-triggered reorder notifications

import { getNotificationsDb, getInventoryDb } from "../utils/db.js"
import { getTimestamp } from "../utils/db.js"

/**
 * Create reorder notification (auto-triggered when inventory crosses threshold)
 */
export async function createReorderNotification(storeId, inventoryId, itemName, threshold, currentQuantity) {
  const db = getNotificationsDb()
  
  // Get next notification ID
  let counterEntry = await db.get("counter:notification")
  let nextId = 1
  
  if (counterEntry) {
    nextId = counterEntry + 1
  }
  
  const notification = {
    notificationId: nextId,
    storeId: storeId,
    inventoryId: inventoryId,
    type: "reorder",
    title: `Low Stock Alert: ${itemName}`,
    message: `${itemName} at Store ${storeId} is below threshold (${currentQuantity} of ${threshold})`,
    status: "pending",
    threshold: threshold,
    currentQuantity: currentQuantity,
    createdAt: getTimestamp()
  }
  
  await db.put(`notification:${nextId}`, notification)
  await db.put("counter:notification", nextId)
  
  return notification
}

/**
 * Get reorder notifications for a store
 */
export async function getReorderNotifications(storeId, status = null, offset = 0, limit = 50) {
  const db = getNotificationsDb()
  const inventoryDb = getInventoryDb()
  
  const allEntries = await db.all()
  
  let notifications = allEntries
    .filter(entry => entry.key.startsWith("notification:") && 
            entry.value.type === "reorder" &&
            entry.value.storeId === storeId)
    .map(entry => entry.value)
  
  // Filter by status if provided
  if (status) {
    notifications = notifications.filter(n => n.status === status)
  }
  
  // Sort by creation date (newest first)
  notifications = notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  
  // Enrich with inventory item name
  for (const notification of notifications) {
    if (notification.inventoryId) {
      const item = await inventoryDb.get(`inventory:${notification.inventoryId}`)
      if (item) {
        notification.itemName = item.itemName
      }
    }
  }
  
  const paginatedNotifications = notifications.slice(offset, offset + limit)
  
  return {
    status: "success",
    storeId: storeId,
    count: notifications.length,
    data: paginatedNotifications
  }
}

/**
 * Mark reorder notification as acknowledged
 */
export async function acknowledgeReorderNotification(notificationId) {
  const db = getNotificationsDb()
  const notification = await db.get(`notification:${notificationId}`)
  
  if (!notification) {
    throw new Error(`Notification ${notificationId} not found`)
  }
  
  notification.status = "acknowledged"
  await db.put(`notification:${notificationId}`, notification)
  
  return notification
}

/**
 * Mark reorder notification as fulfilled
 */
export async function fulfillReorderNotification(notificationId) {
  const db = getNotificationsDb()
  const notification = await db.get(`notification:${notificationId}`)
  
  if (!notification) {
    throw new Error(`Notification ${notificationId} not found`)
  }
  
  notification.status = "fulfilled"
  await db.put(`notification:${notificationId}`, notification)
  
  return notification
}

/**
 * Check if notification already exists for this inventory item
 * (to avoid duplicate notifications)
 */
export async function hasOpenReorderNotification(inventoryId) {
  const db = getNotificationsDb()
  const allEntries = await db.all()
  
  return allEntries.some(entry =>
    entry.value.type === "reorder" &&
    entry.value.inventoryId === inventoryId &&
    entry.value.status === "pending"
  )
}
