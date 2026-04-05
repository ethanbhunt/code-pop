// src/services/revenueService.js
// Revenue tracking service

import { getRevenuesDb, getNextId, getTimestamp } from "../utils/db.js"
import { validateRevenueInvariants } from "./conflictResolver.js"

export async function createRevenue(orderId, amount, description = "") {
  if (!orderId || !amount) {
    throw new Error("Order ID and amount are required")
  }

  const parsedAmount = parseFloat(amount)
  if (isNaN(parsedAmount) || parsedAmount < 0) {
    throw new Error("Amount must be a positive number")
  }

  const revenuesDb = getRevenuesDb()
  const revenueId = await getNextId(revenuesDb, "revenue")

  const revenue = {
    revenueId,
    orderId,
    amount: parsedAmount,
    timestamp: getTimestamp(),
    description
  }

  // Validate invariants before write
  const validation = validateRevenueInvariants(revenue)
  if (!validation.valid) {
    throw new Error(`Revenue invariant violation: ${validation.errors.join("; ")}`)
  }

  await revenuesDb.put(`revenue:${revenueId}`, revenue)
  return revenue
}

export async function getRevenueById(revenueId) {
  const revenuesDb = getRevenuesDb()
  const revenue = await revenuesDb.get(`revenue:${revenueId}`)
  if (!revenue) throw new Error("Revenue record not found")
  return revenue
}

export async function listAllRevenues(limit = 100) {
  const revenuesDb = getRevenuesDb()
  const allRevenues = await revenuesDb.all()
  const revenues = []

  for (const entry of allRevenues) {
    const revenue = entry.value
    if (revenue && revenue.revenueId) {
      revenues.push(revenue)
    }
    if (revenues.length >= limit) break
  }

  return revenues.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
}

export async function getRevenueByOrderId(orderId) {
  const revenuesDb = getRevenuesDb()
  const allRevenues = await revenuesDb.all()

  for (const entry of allRevenues) {
    const revenue = entry.value
    if (revenue && revenue.orderId === orderId) {
      return revenue
    }
  }

  return null
}

export async function updateRevenue(revenueId, updates) {
  const revenuesDb = getRevenuesDb()
  const revenue = await revenuesDb.get(`revenue:${revenueId}`)
  if (!revenue) throw new Error("Revenue record not found")

  if (updates.amount !== undefined) {
    const amount = parseFloat(updates.amount)
    if (isNaN(amount) || amount < 0) {
      throw new Error("Amount must be a positive number")
    }
    revenue.amount = amount
  }

  if (updates.description !== undefined) {
    revenue.description = updates.description
  }

  await revenuesDb.put(`revenue:${revenueId}`, revenue)
  return revenue
}

export async function deleteRevenue(revenueId) {
  const revenuesDb = getRevenuesDb()
  const revenue = await revenuesDb.get(`revenue:${revenueId}`)
  if (!revenue) throw new Error("Revenue record not found")
  await revenuesDb.del(`revenue:${revenueId}`)
  return true
}

export async function generateRevenueReport(startDate, endDate) {
  const revenuesDb = getRevenuesDb()
  const allRevenues = await revenuesDb.all()
  const start = startDate ? new Date(startDate).getTime() : 0
  const end = endDate ? new Date(endDate).getTime() : Date.now()

  let totalRevenue = 0
  let transactionCount = 0
  const revenues = []

  for (const entry of allRevenues) {
    const revenue = entry.value
    if (revenue && revenue.revenueId) {
      const revTime = new Date(revenue.timestamp).getTime()
      if (revTime >= start && revTime <= end) {
        revenues.push(revenue)
        totalRevenue += revenue.amount
        transactionCount++
      }
    }
  }

  return {
    totalRevenue,
    transactionCount,
    averageTransaction: transactionCount > 0 ? totalRevenue / transactionCount : 0,
    startDate: new Date(start).toISOString(),
    endDate: new Date(end).toISOString(),
    revenues: revenues.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  }
}
