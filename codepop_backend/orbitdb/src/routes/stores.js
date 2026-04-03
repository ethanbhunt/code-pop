// src/routes/stores.js
// Store management endpoints

import express from "express"
import { authenticate, requireAdmin, requireSuperAdmin, requireStoreAccess } from "../middleware/auth.js"
import { errorHandler } from "../middleware/errorHandler.js"
import * as storesService from "../services/storesService.js"
import * as inventoryService from "../services/inventoryService.js"

const router = express.Router()

/**
 * GET /backend/stores
 * List all stores (super admin only)
 */
router.get("/", authenticate, requireSuperAdmin, async (req, res, next) => {
  try {
    const offset = parseInt(req.query.offset || 0)
    const limit = Math.min(parseInt(req.query.limit || 50), 100)
    
    const result = await storesService.listStores(offset, limit)
    
    res.json({
      status: "success",
      count: result.count,
      data: result.data
    })
  } catch (err) {
    next(err)
  }
})

/**
 * GET /backend/stores/:storeId/inventory
 * Get store-scoped inventory
 */
router.get("/:storeId/inventory", authenticate, async (req, res, next) => {
  try {
    const storeId = parseInt(req.params.storeId)
    
    // Verify user can access this store
    if (req.user.enum !== "super_admin") {
      if (req.user.enum !== "customer" && !req.user.assignedStores.includes(storeId)) {
        return res.status(403).json({
          error: "Access denied to this store",
          code: "STORE_ACCESS_DENIED"
        })
      }
    }
    
    const offset = parseInt(req.query.offset || 0)
    const limit = Math.min(parseInt(req.query.limit || 50), 100)
    
    const result = await inventoryService.getStoreInventory(storeId, offset, limit)
    
    res.json({
      status: "success",
      storeId: storeId,
      count: result.count,
      data: result.data
    })
  } catch (err) {
    next(err)
  }
})

/**
 * GET /backend/stores/:storeId
 * Get specific store details
 */
router.get("/:storeId", authenticate, async (req, res, next) => {
  try {
    const storeId = parseInt(req.params.storeId)
    
    // Super admin can see all stores
    if (req.user.enum !== "super_admin") {
      // Manager/admin must have store in assignedStores
      if (!req.user.assignedStores.includes(storeId)) {
        return res.status(403).json({
          error: "Access denied to this store",
          code: "STORE_ACCESS_DENIED"
        })
      }
    }
    
    const store = await storesService.getStoreById(storeId)
    
    res.json({
      status: "success",
      data: store
    })
  } catch (err) {
    next(err)
  }
})

/**
 * POST /backend/stores
 * Create new store (super admin only)
 */
router.post("/", authenticate, requireSuperAdmin, async (req, res, next) => {
  try {
    const store = await storesService.createStore({
      name: req.body.name,
      address: req.body.address,
      city: req.body.city,
      region: req.body.region,
      timezone: req.body.timezone,
      lat: req.body.lat,
      lng: req.body.lng,
      manager: req.body.manager,
      staffCount: req.body.staffCount,
      status: req.body.status,
      operatingHours: req.body.operatingHours
    })
    
    res.status(201).json({
      status: "created",
      data: store
    })
  } catch (err) {
    next(err)
  }
})

/**
 * PATCH /backend/stores/:storeId
 * Update store (super admin only)
 */
router.patch("/:storeId", authenticate, requireSuperAdmin, async (req, res, next) => {
  try {
    const storeId = parseInt(req.params.storeId)
    
    const updated = await storesService.updateStore(storeId, {
      name: req.body.name,
      address: req.body.address,
      city: req.body.city,
      region: req.body.region,
      timezone: req.body.timezone,
      manager: req.body.manager,
      staffCount: req.body.staffCount,
      status: req.body.status,
      operatingHours: req.body.operatingHours
    })
    
    res.json({
      status: "success",
      data: updated
    })
  } catch (err) {
    next(err)
  }
})

/**
 * DELETE /backend/stores/:storeId
 * Delete store (super admin only)
 */
router.delete("/:storeId", authenticate, requireSuperAdmin, async (req, res, next) => {
  try {
    const storeId = parseInt(req.params.storeId)
    
    await storesService.deleteStore(storeId)
    
    res.json({
      status: "success",
      message: "Store deleted successfully"
    })
  } catch (err) {
    next(err)
  }
})

export default router
