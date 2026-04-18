// src/routes/orders.js
import express from "express"
import { asyncHandler } from "../middleware/errorHandler.js"
import { authenticate, optionalAuth } from "../middleware/auth.js"
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

router.post("/", asyncHandler(async (req, res) => {
  // Support both old and new field formats
  const {
    storeId,
    drinkIds,
    quantities,
    specialInstructions,
    estimatedPickupTime,
    orderToken,  // New field for guest order tracking
    // Old format fields
    UserID,
    Drinks,
    OrderStatus,
    PaymentStatus,
    StripeID,
    LockerCombo
  } = req.body
  
  // Use default store (1) if not provided
   const finalStoreId = storeId || 1
   
   // Convert old format to new format if needed
   const finalDrinkIds = drinkIds || Drinks || []
   const finalQuantities = quantities || (Drinks ? Drinks.map(() => 1) : [])
   
   // Managers can create orders for their stores (check access control)
   if (req.user && (req.user.userRole === "manager" || req.user.userRole === "admin")) {
     if (req.user.assignedStores && !req.user.assignedStores.includes(finalStoreId)) {
       return res.status(403).json({
         error: "Access denied to this store",
         code: "STORE_ACCESS_DENIED"
       })
     }
   }
   
   // Allow unauthenticated users (guests) and authenticated users
   const userId = req.user?.userId || null
   
   const order = await orderService.createOrder(
     userId,
     finalStoreId,
     finalDrinkIds,
     finalQuantities,
     specialInstructions,
     estimatedPickupTime,
     orderToken  // Pass order token to service
   )
  
  // Return response in a format that works with both old and new frontend
  res.status(201).json({
    status: "created",
    data: order,
    OrderID: order.orderId || order.id,  // Support both field names
  })
}))

router.post("/:id/fulfill", authenticate, asyncHandler(async (req, res) => {
  const orderId = parseInt(req.params.id, 10)
  const order = await orderService.getOrderById(orderId)
  const role = String(req.user.userRole || req.user.role || req.user.enum || "").toLowerCase()

  if (role !== "super_admin" && role !== "superadmin") {
    if (role !== "manager" && role !== "admin") {
      return res.status(403).json({
        error: "Manager or admin privileges required",
        code: "NOT_MANAGER"
      })
    }

    if (!req.user.assignedStores.includes(order.storeId)) {
      return res.status(403).json({
        error: "Access denied to this store",
        code: "STORE_ACCESS_DENIED"
      })
    }
  }

  const fulfilled = await orderService.fulfillOrder(orderId, {
    userId: req.user.userId,
    role: req.user.userRole || req.user.role || req.user.enum,
  })

  res.json({ status: "success", data: fulfilled })
}))

router.get("/:id", optionalAuth, asyncHandler(async (req, res) => {
  const orderId = parseInt(req.params.id, 10)
  const order = await orderService.getOrderById(orderId)

  // Authenticated users can view as before.
  if (req.user) {
    return res.json({ status: "success", data: order })
  }

  // Guest tracking requires matching orderToken.
  const providedToken = String(req.query.orderToken || "").trim()
  if (!providedToken || providedToken !== String(order.orderToken || "")) {
    return res.status(401).json({
      error: "Authentication required (provide a valid orderToken for guest tracking)",
      code: "NOT_AUTHENTICATED",
    })
  }

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
