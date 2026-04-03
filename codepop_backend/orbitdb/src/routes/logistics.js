// src/routes/logistics.js
// Transfer and delivery management endpoints

import express from "express"
import { authenticate, requireManager, requireAdmin } from "../middleware/auth.js"
import * as logisticsService from "../services/logisticsService.js"
import * as storesService from "../services/storesService.js"

const router = express.Router()

function roleOf(req) {
  return String(req.user.userRole || req.user.role || req.user.enum || "").toLowerCase().replace(/\s+/g, "_")
}

function hasStoreAccess(req, storeId) {
  const role = roleOf(req)
  if (role === "super_admin" || role === "superadmin") {
    return true
  }
  return req.user.assignedStores.map((id) => parseInt(id, 10)).includes(parseInt(storeId, 10))
}

/**
 * POST /backend/logistics/transfers
 * Create transfer request
 */
router.post("/transfers", authenticate, requireManager, async (req, res, next) => {
  try {
    const { sourceStoreId, destStoreId, items, scheduledDate } = req.body
    
    if (!sourceStoreId || !destStoreId || !items || items.length === 0) {
      return res.status(400).json({
        error: "Missing required fields: sourceStoreId, destStoreId, items",
        code: "MISSING_FIELDS"
      })
    }
    
    // Verify user has access to source store
    if (!hasStoreAccess(req, sourceStoreId)) {
      return res.status(403).json({
        error: "Access denied to source store",
        code: "STORE_ACCESS_DENIED"
      })
    }
    
    const transfer = await logisticsService.createTransfer({
      sourceStoreId,
      destStoreId,
      items,
      scheduledDate,
      requestedBy: req.user.userId
    })
    
    res.status(201).json({
      status: "created",
      data: transfer
    })
  } catch (err) {
    next(err)
  }
})

/**
 * GET /backend/logistics/transfers?region=:region&storeId=:storeId&status=:status
 * List transfers with optional filtering
 */
router.get("/transfers", authenticate, requireManager, async (req, res, next) => {
  try {
    const offset = parseInt(req.query.offset || 0)
    const limit = Math.min(parseInt(req.query.limit || 50), 100)
    
    const filters = {}
    
    if (req.query.storeId) {
      filters.storeId = parseInt(req.query.storeId)
      
      // Verify access to store
      if (!hasStoreAccess(req, filters.storeId)) {
        return res.status(403).json({
          error: "Access denied to this store",
          code: "STORE_ACCESS_DENIED"
        })
      }
    }
    
    if (req.query.region) {
      filters.region = req.query.region
    }
    
    if (req.query.status) {
      filters.status = req.query.status
    }
    
    const result = await logisticsService.listTransfers(filters, offset, limit)
    
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
 * PATCH /backend/logistics/transfers/:transferId
 * Update transfer status
 */
router.patch("/transfers/:transferId", authenticate, requireManager, async (req, res, next) => {
  try {
    const transferId = parseInt(req.params.transferId)
    const { status } = req.body
    
    if (!status) {
      return res.status(400).json({
        error: "status parameter required",
        code: "MISSING_STATUS"
      })
    }
    
    const transfer = await logisticsService.getTransferById(transferId)
    
    // Verify access to source store
    if (!hasStoreAccess(req, transfer.sourceStoreId)) {
      return res.status(403).json({
        error: "Access denied",
        code: "STORE_ACCESS_DENIED"
      })
    }
    
    const updated = await logisticsService.updateTransferStatus(transferId, status)
    
    res.json({
      status: "success",
      data: updated
    })
  } catch (err) {
    next(err)
  }
})

/**
 * GET /backend/logistics/transfers/:transferId
 * Get specific transfer
 */
router.get("/transfers/:transferId", authenticate, requireManager, async (req, res, next) => {
  try {
    const transferId = parseInt(req.params.transferId)
    
    const transfer = await logisticsService.getTransferById(transferId)
    
    // Verify access
    if (!hasStoreAccess(req, transfer.sourceStoreId) && !hasStoreAccess(req, transfer.destStoreId)) {
      return res.status(403).json({
        error: "Access denied",
        code: "NOT_AUTHORIZED"
      })
    }
    
    res.json({
      status: "success",
      data: transfer
    })
  } catch (err) {
    next(err)
  }
})

/**
 * POST /backend/logistics/delivery-assignments
 * Create delivery assignment
 */
router.post("/delivery-assignments", authenticate, requireManager, async (req, res, next) => {
  try {
    const { transferId, driverId, vehicle, estimatedArrival, constraints } = req.body
    
    if (!transferId || !driverId) {
      return res.status(400).json({
        error: "Missing required fields: transferId, driverId",
        code: "MISSING_FIELDS"
      })
    }
    
    const transfer = await logisticsService.getTransferById(transferId)
    
    // Verify access to source store
    if (!hasStoreAccess(req, transfer.sourceStoreId)) {
      return res.status(403).json({
        error: "Access denied",
        code: "STORE_ACCESS_DENIED"
      })
    }
    
    const assignment = await logisticsService.createDeliveryAssignment({
      transferId,
      driverId,
      vehicle,
      estimatedArrival,
      constraints,
      createdBy: req.user.userId
    })
    
    res.status(201).json({
      status: "created",
      data: assignment
    })
  } catch (err) {
    next(err)
  }
})

/**
 * GET /backend/logistics/delivery-assignments
 * List delivery assignments with optional filtering
 */
router.get("/delivery-assignments", authenticate, requireManager, async (req, res, next) => {
  try {
    const offset = parseInt(req.query.offset || 0)
    const limit = Math.min(parseInt(req.query.limit || 50), 100)
    
    const filters = {}
    
    if (req.query.transferId) {
      filters.transferId = parseInt(req.query.transferId)
    }
    
    if (req.query.status) {
      filters.status = req.query.status
    }
    
    if (req.query.driverId) {
      filters.driverId = parseInt(req.query.driverId)
    }
    
    const result = await logisticsService.listAssignments(filters, offset, limit)
    
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
 * PATCH /backend/logistics/delivery-assignments/:assignmentId
 * Update delivery assignment
 */
router.patch("/delivery-assignments/:assignmentId", authenticate, requireManager, async (req, res, next) => {
  try {
    const assignmentId = parseInt(req.params.assignmentId)
    
    const assignment = await logisticsService.getAssignmentById(assignmentId)
    const transfer = await logisticsService.getTransferById(assignment.transferId)
    
    // Verify access
    if (!hasStoreAccess(req, transfer.sourceStoreId)) {
      return res.status(403).json({
        error: "Access denied",
        code: "STORE_ACCESS_DENIED"
      })
    }
    
    const updated = await logisticsService.updateAssignment(assignmentId, req.body)
    
    res.json({
      status: "success",
      data: updated
    })
  } catch (err) {
    next(err)
  }
})

export default router
