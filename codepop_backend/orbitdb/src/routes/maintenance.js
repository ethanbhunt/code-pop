// src/routes/maintenance.js
// Machine maintenance and repair endpoints

import express from "express"
import {
  authenticate,
  requireRepair,
  requireAdminOrRepair,
  hasAdminPrivileges,
} from "../middleware/auth.js"
import * as maintenanceService from "../services/maintenanceService.js"
import * as storesService from "../services/storesService.js"

const router = express.Router()

/** Repair access is store-scoped: machine.storeId must be in req.user.assignedStores */
function repairHasStoreAccess(req, machine) {
  const sid = parseInt(String(machine.storeId), 10)
  if (!Number.isInteger(sid) || sid < 1) return false
  return (req.user.assignedStores ?? []).some(
    (id) => parseInt(String(id), 10) === sid
  )
}

/**
 * GET /backend/maintenance/machines
 * List machines for a store
 * Repair users see machines in stores they cover (assignedStores)
 * Managers see machines for their stores
 */
router.get("/machines", authenticate, async (req, res, next) => {
  try {
    const offset = parseInt(req.query.offset || 0)
    const limit = Math.min(parseInt(req.query.limit || 50), 100)
    
    let result
    
    if (req.user.userRole === "repair") {
      result = await maintenanceService.getMachinesForStores(req.user.assignedStores, offset, limit)
    } else if (req.user.userRole === "super_admin") {
      result = await maintenanceService.listAllMachines(offset, limit)
    } else if (hasAdminPrivileges(req.user.role) && !req.query.storeId) {
      // Orbit `admin` / `superadmin` role: list all machines when no storeId (dashboard BFF).
      result = await maintenanceService.listAllMachines(offset, limit)
    } else if (req.user.userRole === "manager" || req.user.userRole === "admin") {
      const storeId = parseInt(req.query.storeId)
      if (!storeId) {
        return res.status(400).json({
          error: "storeId parameter required",
          code: "MISSING_STORE_ID"
        })
      }

      if (!req.user.assignedStores.includes(storeId)) {
        return res.status(403).json({
          error: "Access denied to this store",
          code: "STORE_ACCESS_DENIED"
        })
      }

      result = await maintenanceService.listMachinesByStore(storeId, offset, limit)
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
 * Machines in stores the repair user covers (same as GET /machines for repair)
 */
router.get("/assignments/me", authenticate, requireRepair, async (req, res, next) => {
  try {
    const offset = parseInt(req.query.offset || 0)
    const limit = Math.min(parseInt(req.query.limit || 50), 100)
    
    const result = await maintenanceService.getMachinesForStores(req.user.assignedStores, offset, limit)
    
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
       if (!repairHasStoreAccess(req, machine)) {
         return res.status(403).json({
           error: "Machine is not in your assigned stores",
           code: "STORE_ACCESS_DENIED"
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
       if (!repairHasStoreAccess(req, machine)) {
         return res.status(403).json({
           error: "Machine is not in your assigned stores",
           code: "STORE_ACCESS_DENIED"
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
 * Create new machine (admin or repair; repair only for stores in assignedStores)
 */
router.post("/machines", authenticate, requireAdminOrRepair, async (req, res, next) => {
  try {
    const { storeId, name, model, status, serviceInterval } = req.body
    
    if (!storeId || !name || !model) {
      return res.status(400).json({
        error: "Missing required fields: storeId, name, model",
        code: "MISSING_FIELDS"
      })
    }

    const storeIdNum = parseInt(String(storeId), 10)
    if (!Number.isInteger(storeIdNum) || storeIdNum < 1) {
      return res.status(400).json({
        error: "Invalid storeId",
        code: "INVALID_STORE_ID"
      })
    }

    const hasStoreAccess = (req.user.assignedStores ?? []).some(
      (id) => parseInt(String(id), 10) === storeIdNum
    )

    if (req.user.userRole !== "super_admin" && !hasStoreAccess) {
      return res.status(403).json({
        error: "Access denied to this store",
        code: "STORE_ACCESS_DENIED"
      })
    }
    
    const machine = await maintenanceService.createMachine({
      storeId: storeIdNum,
      name,
      model,
      status,
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
