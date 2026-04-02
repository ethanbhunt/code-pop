// src/routes/maintenance.js
// Machine maintenance and repair endpoints

import express from "express"
import { authenticate, requireRepair, requireManager, requireAdmin } from "../middleware/auth.js"
import * as maintenanceService from "../services/maintenanceService.js"
import * as storesService from "../services/storesService.js"

const router = express.Router()

/**
 * GET /backend/maintenance/machines
 * List machines for a store
 * Repair users see only machines assigned to them
 * Managers see machines for their stores
 */
router.get("/machines", authenticate, async (req, res, next) => {
  try {
    const offset = parseInt(req.query.offset || 0)
    const limit = Math.min(parseInt(req.query.limit || 50), 100)
    
    let result
    
    if (req.user.userRole === "repair") {
      // Repair users see only machines assigned to them
      result = await maintenanceService.getMachinesAssignedTo(req.user.userId, offset, limit)
    } else if (req.user.userRole === "manager" || req.user.userRole === "admin") {
      // Managers see machines for their stores
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
      
       result = await maintenanceService.listMachinesByStore(storeId, offset, limit)
     } else if (req.user.userRole === "super_admin") {
      // Super admin sees all machines
      result = await maintenanceService.listAllMachines(offset, limit)
    } else {
      return res.status(403).json({
        error: "Not authorized to view machines",
        code: "NOT_AUTHORIZED"
      })
    }
    
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
 * GET /backend/maintenance/assignments/me
 * Get machines assigned to current repair user
 */
router.get("/assignments/me", authenticate, requireRepair, async (req, res, next) => {
  try {
    const offset = parseInt(req.query.offset || 0)
    const limit = Math.min(parseInt(req.query.limit || 50), 100)
    
    const result = await maintenanceService.getMachinesAssignedTo(req.user.userId, offset, limit)
    
    // Enrich with store information
    for (const machine of result.data) {
      const store = await storesService.getStoreById(machine.storeId)
      machine.storeName = store.name
    }
    
    res.json({
      status: "success",
      userId: req.user.userId,
      role: "repair",
      count: result.count,
      data: result.data
    })
  } catch (err) {
    next(err)
  }
})

/**
 * POST /backend/maintenance/status-transitions
 * Record machine status transition with audit trail
 */
router.post("/status-transitions", authenticate, async (req, res, next) => {
  try {
    const { machineId, newStatus, reason, notes } = req.body
    
    if (!machineId || !newStatus || !reason) {
      return res.status(400).json({
        error: "Missing required fields: machineId, newStatus, reason",
        code: "MISSING_FIELDS"
      })
    }
    
    // Verify user can update this machine
    const machine = await maintenanceService.getMachineById(machineId)
    
     if (req.user.userRole === "repair") {
       // Repair users can only update machines assigned to them
       if (machine.assignedTo !== req.user.userId) {
         return res.status(403).json({
           error: "Not assigned to this machine",
           code: "NOT_ASSIGNED"
         })
       }
     } else if (req.user.userRole === "manager" || req.user.userRole === "admin") {
       // Managers can update machines in their stores
       if (!req.user.assignedStores.includes(machine.storeId)) {
         return res.status(403).json({
           error: "Access denied",
           code: "STORE_ACCESS_DENIED"
         })
       }
     } else if (req.user.userRole !== "super_admin") {
      return res.status(403).json({
        error: "Not authorized",
        code: "NOT_AUTHORIZED"
      })
    }
    
    const transition = await maintenanceService.recordStatusTransition(
      machineId,
      newStatus,
      req.user.userId,
      reason,
      notes
    )
    
    res.status(201).json({
      status: "created",
      data: transition
    })
  } catch (err) {
    next(err)
  }
})

/**
 * GET /backend/maintenance/history?machineId=:id&page=:n&limit=:m
 * Get machine maintenance history with pagination (default 25 per page)
 */
router.get("/history", authenticate, async (req, res, next) => {
  try {
    const machineId = parseInt(req.query.machineId)
    const page = parseInt(req.query.page || 1)
    const limit = parseInt(req.query.limit || 25)
    
    if (!machineId) {
      return res.status(400).json({
        error: "machineId parameter required",
        code: "MISSING_MACHINE_ID"
      })
    }
    
    // Verify user can access this machine
    const machine = await maintenanceService.getMachineById(machineId)
    
     if (req.user.userRole === "repair") {
       if (machine.assignedTo !== req.user.userId) {
         return res.status(403).json({
           error: "Not assigned to this machine",
           code: "NOT_ASSIGNED"
         })
       }
     } else if (req.user.userRole === "manager" || req.user.userRole === "admin") {
       if (!req.user.assignedStores.includes(machine.storeId)) {
         return res.status(403).json({
           error: "Access denied",
           code: "STORE_ACCESS_DENIED"
         })
       }
     } else if (req.user.userRole !== "super_admin") {
      return res.status(403).json({
        error: "Not authorized",
        code: "NOT_AUTHORIZED"
      })
    }
    
    const result = await maintenanceService.getMachineHistory(machineId, page, limit)
    
    res.json({
      status: "success",
      data: result
    })
  } catch (err) {
    next(err)
  }
})

/**
 * POST /backend/maintenance/machines
 * Create new machine (admin only)
 */
router.post("/machines", authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { storeId, name, model, status, assignedTo, serviceInterval } = req.body
    
    if (!storeId || !name || !model) {
      return res.status(400).json({
        error: "Missing required fields: storeId, name, model",
        code: "MISSING_FIELDS"
      })
    }
    
     // Verify store access
     if (req.user.userRole !== "super_admin" && !req.user.assignedStores.includes(storeId)) {
      return res.status(403).json({
        error: "Access denied to this store",
        code: "STORE_ACCESS_DENIED"
      })
    }
    
    const machine = await maintenanceService.createMachine({
      storeId,
      name,
      model,
      status,
      assignedTo,
      serviceInterval
    })
    
    res.status(201).json({
      status: "created",
      data: machine
    })
  } catch (err) {
    next(err)
  }
})

export default router
