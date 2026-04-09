// src/services/orderService.js
// Customer orders service

import { randomUUID } from "crypto"
import { getOrdersDb, getStoreOrdersDb, getNextId, getTimestamp } from "../utils/db.js"
import { validateOrderStatus, validatePaymentStatus } from "../utils/validation.js"

export async function createOrder(userId, storeId, drinkIds = [], quantities = {}, specialInstructions = "", estimatedPickupTime = null, orderToken = null) {
  // Always write to the global orders DB so GET /orders/:id works consistently.
  // Also write to the store-scoped orders DB (if available) for manager dashboards.
  const globalOrdersDb = getOrdersDb()
  const orderId = await getNextId(globalOrdersDb, "order")

  // Generate orderToken for guest orders if not provided
  const token = orderToken || randomUUID()

  const order = {
    orderId,
    userId,
    orderToken: token,  // Unique token for tracking (for guests and authenticated users)
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

  await globalOrdersDb.put(`order:${orderId}`, order)

  if (storeId) {
    try {
      const storeOrdersDb = getStoreOrdersDb(storeId)
      await storeOrdersDb.put(`order:${orderId}`, order)
    } catch {
      // Store-scoped DB may not exist on some peers; global DB is still authoritative.
    }
  }

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
  // Use store-specific orders database
  let storeOrders = []
  
  try {
    const storeOrdersDb = getStoreOrdersDb(storeId)
    const allOrders = await storeOrdersDb.all()
    
    storeOrders = allOrders
      .filter(entry => entry.value && entry.key.startsWith("order:"))
      .map(entry => entry.value)
      .sort((a, b) => new Date(b.creationTime) - new Date(a.creationTime))
  } catch (err) {
    // Fallback to global orders db if store-specific db doesn't exist
    const ordersDb = getOrdersDb()
    const allOrders = await ordersDb.all()
    
    storeOrders = allOrders
      .filter(entry => entry.value && entry.value.storeId === storeId)
      .map(entry => entry.value)
      .sort((a, b) => new Date(b.creationTime) - new Date(a.creationTime))
  }
  
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

  await ordersDb.put(`order:${orderId}`, order)

  // Best-effort keep store-scoped copy in sync for dashboards.
  if (order.storeId) {
    try {
      const storeOrdersDb = getStoreOrdersDb(order.storeId)
      await storeOrdersDb.put(`order:${orderId}`, order)
    } catch {
      // ignore
    }
  }

  return order
}

export async function deleteOrder(orderId) {
  const ordersDb = getOrdersDb()
  const order = await ordersDb.get(`order:${orderId}`)
  if (!order) throw new Error("Order not found")
  await ordersDb.del(`order:${orderId}`)
  return true
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
