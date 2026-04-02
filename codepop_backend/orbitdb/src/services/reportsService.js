// src/services/reportsService.js
// Multi-store reporting and analytics

import { getOrdersDb, getRevenuesDb, getInventoryDb, getStoresDb } from "../utils/db.js"

/**
 * Get multi-store system report
 */
export async function getMultiStoreReport(storeIds = null, startDate = null, endDate = null) {
  const ordersDb = getOrdersDb()
  const revenuesDb = getRevenuesDb()
  const inventoryDb = getInventoryDb()
  const storesDb = getStoresDb()
  
  // Get all stores if not specified
  let stores = []
  if (storeIds && storeIds.length > 0) {
    for (const id of storeIds) {
      const store = await storesDb.get(`store:${id}`)
      if (store) stores.push(store)
    }
  } else {
    const allEntries = await storesDb.all()
    stores = allEntries
      .filter(entry => entry.key.startsWith("store:"))
      .map(entry => entry.value)
  }
  
  // Parse dates
  const fromDate = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30))
  const toDate = endDate ? new Date(endDate) : new Date()
  
  // Get all orders and revenues
  const allOrders = await ordersDb.all()
  const allRevenues = await revenuesDb.all()
  const allInventory = await inventoryDb.all()
  
  const storeReports = []
  let totalRevenue = 0
  let totalOrders = 0
  
  for (const store of stores) {
    const storeOrders = allOrders
      .filter(entry => entry.value.storeId === store.storeId && 
              new Date(entry.value.createdAt) >= fromDate &&
              new Date(entry.value.createdAt) <= toDate)
      .map(entry => entry.value)
    
    const storeRevenues = allRevenues
      .filter(entry => entry.value.storeId === store.storeId &&
              new Date(entry.value.createdAt) >= fromDate &&
              new Date(entry.value.createdAt) <= toDate)
      .map(entry => entry.value)
    
    const storeInventory = allInventory
      .filter(entry => entry.key.startsWith("inventory:") && entry.value.storeId === store.storeId)
      .map(entry => entry.value)
    
    const storeRevenueTotals = storeRevenues.reduce((acc, rev) => acc + (rev.amount || 0), 0)
    const lowStockItems = storeInventory.filter(item => item.quantity <= item.minThreshold).length
    const criticalItems = storeInventory.filter(item => item.quantity <= (item.minThreshold * 0.5)).length
    
    totalRevenue += storeRevenueTotals
    totalOrders += storeOrders.length
    
    const reportByPaymentMethod = {}
    storeRevenues.forEach(rev => {
      if (!reportByPaymentMethod[rev.paymentMethod]) {
        reportByPaymentMethod[rev.paymentMethod] = 0
      }
      reportByPaymentMethod[rev.paymentMethod] += rev.amount || 0
    })
    
    storeReports.push({
      storeId: store.storeId,
      storeName: store.name,
      city: store.city,
      region: store.region,
      period: `${startDate || 'Last 30 days'} to ${endDate || 'Today'}`,
      revenue: {
        total: storeRevenueTotals,
        byPaymentMethod: reportByPaymentMethod
      },
      orders: {
        total: storeOrders.length,
        completed: storeOrders.filter(o => o.status === "completed").length,
        cancelled: storeOrders.filter(o => o.status === "cancelled").length,
        pending: storeOrders.filter(o => o.status === "pending").length
      },
      inventory: {
        totalItems: storeInventory.length,
        lowStockItems: lowStockItems,
        criticalItems: criticalItems
      }
    })
  }
  
  return {
    storeReports: storeReports,
    aggregates: {
      totalRevenue: totalRevenue,
      totalOrders: totalOrders,
      storeCount: stores.length,
      topStore: storeReports.length > 0 
        ? storeReports.reduce((max, s) => s.revenue.total > max.revenue.total ? s : max).storeName
        : null
    }
  }
}

/**
 * Get store revenue report
 */
export async function getStoreRevenueReport(storeId, startDate = null, endDate = null) {
  const revenuesDb = getRevenuesDb()
  const storesDb = getStoresDb()
  
  // Get store info
  const store = await storesDb.get(`store:${storeId}`)
  if (!store) {
    throw new Error(`Store ${storeId} not found`)
  }
  
  // Parse dates
  const fromDate = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1))
  const toDate = endDate ? new Date(endDate) : new Date()
  
  // Get all revenues for store
  const allEntries = await revenuesDb.all()
  const revenues = allEntries
    .filter(entry => entry.value.storeId === storeId &&
            new Date(entry.value.createdAt) >= fromDate &&
            new Date(entry.value.createdAt) <= toDate)
    .map(entry => entry.value)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
  
  // Calculate totals
  const totalRevenue = revenues.reduce((acc, rev) => acc + (rev.amount || 0), 0)
  const totalTransactions = revenues.length
  
  // By payment method
  const byPaymentMethod = {}
  revenues.forEach(rev => {
    if (!byPaymentMethod[rev.paymentMethod]) {
      byPaymentMethod[rev.paymentMethod] = 0
    }
    byPaymentMethod[rev.paymentMethod] += rev.amount || 0
  })
  
  // By status
  const completedTransactions = revenues.filter(r => r.paymentStatus === "completed").length
  const failedTransactions = revenues.filter(r => r.paymentStatus === "failed").length
  
  // Daily breakdown
  const dailyBreakdown = {}
  revenues.forEach(rev => {
    const date = new Date(rev.createdAt).toISOString().split('T')[0]
    if (!dailyBreakdown[date]) {
      dailyBreakdown[date] = { revenue: 0, transactions: 0 }
    }
    dailyBreakdown[date].revenue += rev.amount || 0
    dailyBreakdown[date].transactions += 1
  })
  
  const dailyData = Object.entries(dailyBreakdown)
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
  
  return {
    status: "success",
    store: {
      storeId: store.storeId,
      storeName: store.name
    },
    period: `${startDate || 'Last month'} to ${endDate || 'Today'}`,
    data: {
      totalRevenue: totalRevenue,
      totalTransactions: totalTransactions,
      completedTransactions: completedTransactions,
      failedTransactions: failedTransactions,
      byPaymentMethod: byPaymentMethod,
      dailyBreakdown: dailyData
    }
  }
}
