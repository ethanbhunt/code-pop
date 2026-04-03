// src/routes/auditLogs.js

import express from "express"
import { asyncHandler } from "../middleware/errorHandler.js"
import { authenticate } from "../middleware/auth.js"
import { listAuditLogs } from "../services/auditService.js"

const router = express.Router()

router.get("/", authenticate, asyncHandler(async (req, res) => {
  const role = String(req.user.userRole || req.user.role || req.user.enum || "").toLowerCase()
  if (role !== "admin" && role !== "super_admin" && role !== "superadmin") {
    return res.status(403).json({
      error: "Admin privileges required",
      code: "NOT_ADMIN"
    })
  }

  const offset = parseInt(req.query.offset || 0, 10)
  const limit = Math.min(parseInt(req.query.limit || 100, 10), 200)
  const parsedStoreId = req.query.storeId !== undefined ? parseInt(req.query.storeId, 10) : null
  const storeId = Number.isFinite(parsedStoreId) ? parsedStoreId : null
  const entityType = req.query.entityType ? String(req.query.entityType) : null

  const result = await listAuditLogs({ storeId, entityType, offset, limit })
  res.json({ status: "success", ...result })
}))

export default router