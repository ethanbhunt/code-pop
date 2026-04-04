// src/routes/orders.js
import express from "express"
import { asyncHandler } from "../middleware/errorHandler.js"
import { authenticate } from "../middleware/auth.js"
import * as orderService from "../services/orderService.js"

const router = express.Router()

router.get("/", authenticate, asyncHandler(async (req, res) => {
  const offset = parseInt(req.query.offset || 0)
  const limit = Math.min(parseInt(req.query.limit || 50), 100)
  
  let result
  
  if (req.user.userRole === "customer") {
    // Customers see only their own orders
    const orders = await orderService.getUserOrders(req.user.userId)
    const paginatedOrders = orders.slice(offset, offset + limit)
    result = {
      count: orders.length,
      data: paginatedOrders
    }
  } else if (req.user.userRole === "manager" || req.user.userRole === "admin") {
    // Managers see orders from their stores
    const storeId = parseInt(req.query.storeId)
    if (!storeId) {
      return res.status(400).json({
        error: "storeId parameter required",
        code: "MISSING_STORE_ID"
      })
    }
    
    // Verify access to store
    if (!req.user.assignedStores.includes(storeId)) {
      return res.status(403).json({
        error: "Access denied to this store",
        code: "STORE_ACCESS_DENIED"
      })
    }
    
    result = await orderService.getStoreOrders(storeId, offset, limit)
  } else if (req.user.userRole === "super_admin") {
    // Super admin can see all orders or filtered by store
    if (req.query.storeId) {
      result = await orderService.getStoreOrders(parseInt(req.query.storeId), offset, limit)
    } else {
      const orders = await orderService.listAllOrders()
      const paginatedOrders = orders.slice(offset, offset + limit)
      result = {
        count: orders.length,
        data: paginatedOrders
      }
    }
  } else {
    return res.status(403).json({
      error: "Not authorized",
      code: "NOT_AUTHORIZED"
    })
  }
  
  res.json({ status: "success", count: result.count, data: result.data })
}))

router.post("/", authenticate, asyncHandler(async (req, res) => {
  const { storeId, drinkIds, quantities, specialInstructions, estimatedPickupTime } = req.body
  
  if (!storeId) {
    return res.status(400).json({
      error: "storeId is required",
      code: "MISSING_STORE_ID"
    })
  }
  
  // Customers can order from any store
  // Managers can create orders for their stores
  if (req.user.userRole === "manager" || req.user.userRole === "admin") {
    if (!req.user.assignedStores.includes(storeId)) {
      return res.status(403).json({
        error: "Access denied to this store",
        code: "STORE_ACCESS_DENIED"
      })
    }
  }
  
  const order = await orderService.createOrder(
    req.user.userId,
    storeId,
    drinkIds,
    quantities,
    specialInstructions,
    estimatedPickupTime
  )
  res.status(201).json({ status: "created", data: order })
}))

router.get("/:id", authenticate, asyncHandler(async (req, res) => {
  const order = await orderService.getOrderById(parseInt(req.params.id, 10))
  res.json({ status: "success", data: order })
}))

router.patch("/:id", authenticate, asyncHandler(async (req, res) => {
  const order = await orderService.updateOrder(parseInt(req.params.id, 10), req.body)
  res.json({ status: "updated", data: order })
}))

router.delete("/:id", authenticate, asyncHandler(async (req, res) => {
  await orderService.deleteOrder(parseInt(req.params.id, 10))
  res.json({ status: "deleted" })
}))

router.get("/user/:userId", authenticate, asyncHandler(async (req, res) => {
  const orders = await orderService.getUserOrders(parseInt(req.params.userId, 10))
  res.json({ status: "success", count: orders.length, data: orders })
}))

// POST /:id/live-status - Update live status for an order
router.post("/:id/live-status", authenticate, asyncHandler(async (req, res) => {
  const orderId = parseInt(req.params.id, 10)
  const { status } = req.body
  
  if (!status) {
    return res.status(400).json({
      error: "Status is required",
      code: "VALIDATION_ERROR"
    })
  }
  
  const order = await orderService.updateOrder(orderId, { 
    OrderStatus: status,
    lastStatusUpdate: new Date().toISOString()
  })
  
  res.json({ status: "success", data: order })
}))

export default router
