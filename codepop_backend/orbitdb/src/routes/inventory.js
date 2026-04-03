// src/routes/inventory.js
import express from "express"
import { asyncHandler } from "../middleware/errorHandler.js"
import { authenticate, requireAdmin } from "../middleware/auth.js"
import * as inventoryService from "../services/inventoryService.js"

const router = express.Router()

router.get("/", authenticate, asyncHandler(async (req, res) => {
  const offset = parseInt(req.query.offset || 0)
  const limit = Math.min(parseInt(req.query.limit || 50), 100)
  
  // If storeId provided, return store-scoped inventory
  if (req.query.storeId) {
    const storeId = parseInt(req.query.storeId)
    
    // Verify access
    if (req.user.enum !== "super_admin") {
      if (req.user.enum !== "customer" && !req.user.assignedStores.includes(storeId)) {
        return res.status(403).json({
          error: "Access denied to this store",
          code: "STORE_ACCESS_DENIED"
        })
      }
    }
    
    const result = await inventoryService.getStoreInventory(storeId, offset, limit)
    return res.json({ status: "success", storeId, count: result.count, data: result.data })
  }
  
  // Otherwise return all inventory (admin/super_admin only)
  if (req.user.enum !== "super_admin" && req.user.enum !== "admin") {
    return res.status(403).json({
      error: "Not authorized to view all inventory",
      code: "NOT_AUTHORIZED"
    })
  }
  
  const items = await inventoryService.listInventory()
  const paginatedItems = items.slice(offset, offset + limit)
  res.json({ status: "success", count: items.length, data: paginatedItems })
}))

router.post("/", authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { storeId, itemName, itemType, quantity, thresholdLevel, costPerUnit, supplier } = req.body
  
  if (!storeId) {
    return res.status(400).json({
      error: "storeId is required",
      code: "MISSING_STORE_ID"
    })
  }
  
  // Verify store access
  if (req.user.enum !== "super_admin" && !req.user.assignedStores.includes(storeId)) {
    return res.status(403).json({
      error: "Access denied to this store",
      code: "STORE_ACCESS_DENIED"
    })
  }
  
  const item = await inventoryService.createInventoryItem(
    storeId,
    itemName,
    itemType,
    quantity,
    thresholdLevel,
    costPerUnit,
    supplier,
    {
      userId: req.user.userId,
      role: req.user.userRole || req.user.role || req.user.enum,
    }
  )
  res.status(201).json({ status: "created", data: item })
}))

router.get("/report", authenticate, asyncHandler(async (req, res) => {
  const report = await inventoryService.generateInventoryReport()
  res.json({ status: "success", data: report })
}))

router.get("/:id", authenticate, asyncHandler(async (req, res) => {
  const item = await inventoryService.getInventoryById(parseInt(req.params.id, 10))
  res.json({ status: "success", data: item })
}))

router.patch("/:id", authenticate, asyncHandler(async (req, res) => {
  const item = await inventoryService.updateInventoryItem(parseInt(req.params.id, 10), req.body, {
    userId: req.user.userId,
    role: req.user.userRole || req.user.role || req.user.enum,
  })
  res.json({ status: "updated", data: item })
}))

router.delete("/:id", authenticate, asyncHandler(async (req, res) => {
  await inventoryService.deleteInventoryItem(parseInt(req.params.id, 10), {
    userId: req.user.userId,
    role: req.user.userRole || req.user.role || req.user.enum,
  })
  res.json({ status: "deleted" })
}))

export default router
