// src/routes/inventory.js
import express from "express"
import { asyncHandler } from "../middleware/errorHandler.js"
import { authenticate, requireAdmin, optionalAuth, hasAdminPrivileges } from "../middleware/auth.js"
import * as inventoryService from "../services/inventoryService.js"

const router = express.Router()

router.get("/", optionalAuth, asyncHandler(async (req, res) => {
  const offset = parseInt(req.query.offset || 0)
  const limit = Math.min(parseInt(req.query.limit || 50), 100)
  
  // If storeId provided, return store-scoped inventory
  // Unauthenticated users can access this for drink creation
  if (req.query.storeId) {
    const storeId = parseInt(req.query.storeId)
    
    // Allow both authenticated and unauthenticated users to view store inventory for drink creation
    const result = await inventoryService.getStoreInventory(storeId, offset, limit)
    return res.json({ status: "success", storeId, count: result.count, data: result.data })
  }
  
  // Otherwise return all inventory (admin tier only)
  if (!req.user) {
    return res.status(403).json({
      error: "Not authorized to view all inventory",
      code: "NOT_AUTHORIZED"
    })
  }
  
  const rawRole = req.user.role
  const mergedRole = req.user.userRole
  if (!hasAdminPrivileges(rawRole) && !hasAdminPrivileges(mergedRole)) {
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
  
  // Admin role already verified by requireAdmin middleware
  // Allow all admin users to create inventory for any store
  
  const item = await inventoryService.createInventoryItem(
    storeId,
    itemName,
    itemType,
    quantity,
    thresholdLevel,
    costPerUnit,
    supplier
  )
  res.status(201).json({ status: "created", data: item })
}))

router.get("/report", authenticate, asyncHandler(async (req, res) => {
  const report = await inventoryService.generateInventoryReport()
  res.json({ status: "success", data: report })
}))

router.get("/:id", asyncHandler(async (req, res) => {
  const item = await inventoryService.getInventoryById(parseInt(req.params.id, 10))
  res.json({ status: "success", data: item })
}))

router.patch("/:id", authenticate, asyncHandler(async (req, res) => {
  const item = await inventoryService.updateInventoryItem(parseInt(req.params.id, 10), req.body)
  res.json({ status: "updated", data: item })
}))

router.delete("/:id", authenticate, asyncHandler(async (req, res) => {
  await inventoryService.deleteInventoryItem(parseInt(req.params.id, 10))
  res.json({ status: "deleted" })
}))

export default router
