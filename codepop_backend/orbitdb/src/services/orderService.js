// src/services/orderService.js
// Customer orders service

import { getOrdersDb, getNextId, getTimestamp } from "../utils/db.js"
import { validateOrderStatus, validatePaymentStatus } from "../utils/validation.js"
import { assertInvariants, validateOrderInvariants } from "./conflictResolver.js"
import * as drinkService from "./drinkService.js"
import * as inventoryService from "./inventoryService.js"

function buildIngredientCounts(drink, quantity = 1) {
  const counts = new Map()
  const ingredients = [
    ...(Array.isArray(drink.sodas) ? drink.sodas : []),
    ...(Array.isArray(drink.syrups) ? drink.syrups : []),
    ...(Array.isArray(drink.addIns) ? drink.addIns : []),
    ...(Array.isArray(drink.ingredients) ? drink.ingredients : []),
  ]

  for (const ingredient of ingredients) {
    const key = String(ingredient || "").trim().toLowerCase()
    if (!key) continue
    counts.set(key, (counts.get(key) || 0) + quantity)
  }

  return counts
}

function mergeCounts(target, source) {
  for (const [key, value] of source.entries()) {
    target.set(key, (target.get(key) || 0) + value)
  }
}

export async function createOrder(userId, storeId, drinkIds = [], quantities = {}, specialInstructions = "", estimatedPickupTime = null) {
  const ordersDb = getOrdersDb()
  const orderId = await getNextId(ordersDb, "order")

  const order = {
    orderId,
    userId,
    storeId,
    drinkIds: Array.isArray(drinkIds) ? drinkIds : [],
    quantities: quantities || {},
    specialInstructions: specialInstructions || "",
    estimatedPickupTime: estimatedPickupTime || null,
    orderStatus: "pending",
    paymentStatus: "pending",
    pickupTime: null,
    completedAt: null,
    creationTime: getTimestamp(),
    lockerCombo: null,
    stripeId: null
  }

  // Validate invariants before write
  const validation = validateOrderInvariants(order)
  if (!validation.valid) {
    throw new Error(`Order invariant violation: ${validation.errors.join("; ")}`)
  }

  await ordersDb.put(`order:${orderId}`, order)
  return order
}

export async function getOrderById(orderId) {
  const ordersDb = getOrdersDb()
  const order = await ordersDb.get(`order:${orderId}`)
  if (!order) throw new Error("Order not found")
  return order
}

export async function getUserOrders(userId) {
  const ordersDb = getOrdersDb()
  const allOrders = await ordersDb.all()
  const orders = []
  for (const entry of allOrders) {
    const order = entry.value
    if (order && order.userId === userId) {
      orders.push(order)
    }
  }
  return orders
}

export async function getStoreOrders(storeId, offset = 0, limit = 50) {
  const ordersDb = getOrdersDb()
  const allOrders = await ordersDb.all()
  
  const storeOrders = allOrders
    .filter(entry => entry.value && entry.value.storeId === storeId)
    .map(entry => entry.value)
    .sort((a, b) => new Date(b.creationTime) - new Date(a.creationTime))
  
  const paginatedOrders = storeOrders.slice(offset, offset + limit)
  
  return {
    count: storeOrders.length,
    data: paginatedOrders
  }
}

export async function listAllOrders(limit = 100) {
  const ordersDb = getOrdersDb()
  const allOrders = await ordersDb.all()
  const orders = []
  for (const entry of allOrders) {
    const order = entry.value
    if (order && order.orderId) {
      orders.push(order)
    }
    if (orders.length >= limit) break
  }
  return orders
}

export async function updateOrder(orderId, updates) {
  const ordersDb = getOrdersDb()
  const order = await ordersDb.get(`order:${orderId}`)
  if (!order) throw new Error("Order not found")

  if (updates.drinkIds !== undefined) {
    order.drinkIds = Array.isArray(updates.drinkIds) ? updates.drinkIds : []
  }
  if (updates.quantities !== undefined) {
    order.quantities = updates.quantities || {}
  }
  if (updates.specialInstructions !== undefined) {
    order.specialInstructions = updates.specialInstructions || ""
  }
  if (updates.estimatedPickupTime !== undefined) {
    order.estimatedPickupTime = updates.estimatedPickupTime
  }
  if (updates.orderStatus !== undefined) {
    if (!validateOrderStatus(updates.orderStatus)) {
      throw new Error("Invalid order status")
    }
    order.orderStatus = updates.orderStatus.toLowerCase()
  }
  if (updates.paymentStatus !== undefined) {
    if (!validatePaymentStatus(updates.paymentStatus)) {
      throw new Error("Invalid payment status")
    }
    order.paymentStatus = updates.paymentStatus.toLowerCase()
  }
  if (updates.pickupTime !== undefined) {
    order.pickupTime = updates.pickupTime
  }
  if (updates.completedAt !== undefined) {
    order.completedAt = updates.completedAt
  }
  if (updates.lockerCombo !== undefined) {
    order.lockerCombo = updates.lockerCombo
  }
  if (updates.stripeId !== undefined) {
    order.stripeId = updates.stripeId
  }

  // Validate invariants before write
  const validation = validateOrderInvariants(order)
  if (!validation.valid) {
    throw new Error(`Order invariant violation: ${validation.errors.join("; ")}`)
  }

  await ordersDb.put(`order:${orderId}`, order)
  return order
}

export async function deleteOrder(orderId) {
  const ordersDb = getOrdersDb()
  const order = await ordersDb.get(`order:${orderId}`)
  if (!order) throw new Error("Order not found")
  await ordersDb.del(`order:${orderId}`)
  return true
}

export async function fulfillOrder(orderId, actor = null) {
  const order = await getOrderById(orderId)

  if (String(order.orderStatus || "").toLowerCase() === "completed") {
    return order
  }

  const orderQuantities = order.quantities || {}
  const ingredientCounts = new Map()

  for (const drinkId of order.drinkIds || []) {
    const drink = await drinkService.getDrinkById(drinkId)
    const quantity = Number(orderQuantities[drinkId] ?? orderQuantities[String(drinkId)] ?? 1)
    mergeCounts(ingredientCounts, buildIngredientCounts(drink, Number.isFinite(quantity) && quantity > 0 ? quantity : 1))
  }

  const inventoryItems = await inventoryService.getStoreInventory(order.storeId, 0, 1000)
  const matchingInventory = new Map()

  for (const item of inventoryItems.data) {
    const key = String(item.itemName || "").trim().toLowerCase()
    if (key) {
      matchingInventory.set(key, item)
    }
  }

  for (const [ingredientName, requiredQuantity] of ingredientCounts.entries()) {
    const inventoryItem = matchingInventory.get(ingredientName)
    if (!inventoryItem) {
      throw new Error(`Inventory item not found for ingredient: ${ingredientName}`)
    }
    if (inventoryItem.quantity < requiredQuantity) {
      throw new Error(`Insufficient inventory for ${inventoryItem.itemName}`)
    }
  }

  for (const [ingredientName, requiredQuantity] of ingredientCounts.entries()) {
    const inventoryItem = matchingInventory.get(ingredientName)
    await inventoryService.updateInventoryQuantity(
      inventoryItem.inventoryId,
      inventoryItem.quantity - requiredQuantity,
      actor
    )
  }

  const updatedOrder = await updateOrder(orderId, {
    orderStatus: "completed",
    paymentStatus: order.paymentStatus || "paid",
    completedAt: getTimestamp(),
  })

  return updatedOrder
}

export async function addDrinkToOrder(orderId, drinkId) {
  const ordersDb = getOrdersDb()
  const order = await ordersDb.get(`order:${orderId}`)
  if (!order) throw new Error("Order not found")
  if (!order.drinkIds.includes(drinkId)) {
    order.drinkIds.push(drinkId)
    await ordersDb.put(`order:${orderId}`, order)
  }
  return order
}

export async function removeDrinkFromOrder(orderId, drinkId) {
  const ordersDb = getOrdersDb()
  const order = await ordersDb.get(`order:${orderId}`)
  if (!order) throw new Error("Order not found")
  order.drinkIds = order.drinkIds.filter(id => id !== drinkId)
  await ordersDb.put(`order:${orderId}`, order)
  return order
}
