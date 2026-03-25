// src/services/orderService.js
// Customer orders service

import { getOrdersDb, getNextId, getTimestamp } from "../utils/db.js"
import { validateOrderStatus, validatePaymentStatus } from "../utils/validation.js"

export async function createOrder(userId, drinkIds = [], quantities = {}, specialInstructions = "", estimatedPickupTime = null) {
  const ordersDb = getOrdersDb()
  const orderId = await getNextId(ordersDb, "order")

  const order = {
    orderId,
    userId,
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
