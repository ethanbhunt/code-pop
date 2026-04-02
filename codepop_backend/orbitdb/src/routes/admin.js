// src/routes/admin.js
// Admin and reporting endpoints

import express from "express"
import { authenticate, requireAdmin } from "../middleware/auth.js"
import * as reportsService from "../services/reportsService.js"

const router = express.Router()

/**
 * GET /backend/admin/system-reports/multi-store
 * Get multi-store system report with aggregates
 */
router.get("/system-reports/multi-store", authenticate, requireAdmin, async (req, res, next) => {
  try {
    // Parse query parameters
    const storeIds = req.query.storeIds
      ? req.query.storeIds.split(",").map(id => parseInt(id))
      : null
    
    const startDate = req.query.startDate || null
    const endDate = req.query.endDate || null
    
    // Get multi-store report
    const report = await reportsService.getMultiStoreReport(storeIds, startDate, endDate)
    
    res.json({
      status: "success",
      data: report
    })
  } catch (err) {
    next(err)
  }
})

export default router
