// src/routes/notifications.js
import express from "express"
import { asyncHandler } from "../middleware/errorHandler.js"
import { authenticate, requireManager } from "../middleware/auth.js"
import * as notificationService from "../services/notificationService.js"
import * as reorderService from "../services/reorderService.js"

const router = express.Router()

router.get("/", authenticate, asyncHandler(async (req, res) => {
  const notifications = await notificationService.listAllNotifications()
  res.json({ status: "success", count: notifications.length, data: notifications })
}))

router.post("/", authenticate, asyncHandler(async (req, res) => {
  const { message, type, global } = req.body
  const notification = await notificationService.createNotification(req.user.userId, message, type, global)
  res.status(201).json({ status: "created", data: notification })
}))

router.get("/filter_by_time", authenticate, asyncHandler(async (req, res) => {
  const { start, end } = req.query
  const notifications = await notificationService.filterNotificationsByTimeRange(start, end)
  res.json({ status: "success", count: notifications.length, data: notifications })
}))

/**
 * POST /backend/notifications/reorder — must be registered before /:id so "reorder" is not captured as an id.
 */
router.post("/reorder", authenticate, requireManager, asyncHandler(async (req, res) => {
  const { storeId, inventoryId } = req.body

  if (!storeId || !inventoryId) {
    return res.status(400).json({
      error: "Missing required fields: storeId, inventoryId",
      code: "MISSING_FIELDS"
    })
  }

  if (req.user.enum !== "super_admin" && !req.user.assignedStores.includes(storeId)) {
    return res.status(403).json({
      error: "Access denied to this store",
      code: "STORE_ACCESS_DENIED"
    })
  }

  const notification = await reorderService.createReorderNotification(
    storeId,
    inventoryId,
    req.body.itemName || "Unknown Item",
    req.body.threshold || 0,
    req.body.currentQuantity || 0
  )

  res.status(201).json({
    status: "created",
    data: notification
  })
}))

/**
 * GET /backend/notifications/reorder?storeId=:storeId&status=:status
 */
router.get("/reorder", authenticate, asyncHandler(async (req, res) => {
  const offset = parseInt(req.query.offset || 0)
  const limit = Math.min(parseInt(req.query.limit || 50), 100)
  const storeId = parseInt(req.query.storeId)
  const status = req.query.status || null

  if (!storeId) {
    return res.status(400).json({
      error: "storeId parameter required",
      code: "MISSING_STORE_ID"
    })
  }

  if (req.user.enum !== "super_admin") {
    if (req.user.enum !== "customer" && !req.user.assignedStores.includes(storeId)) {
      return res.status(403).json({
        error: "Access denied to this store",
        code: "STORE_ACCESS_DENIED"
      })
    }
  }

  const result = await reorderService.getReorderNotifications(storeId, status, offset, limit)

  res.json(result)
}))

router.get("/:id", authenticate, asyncHandler(async (req, res) => {
  const notification = await notificationService.getNotificationById(parseInt(req.params.id, 10))
  res.json({ status: "success", data: notification })
}))

router.put("/:id", authenticate, asyncHandler(async (req, res) => {
  const notification = await notificationService.updateNotification(parseInt(req.params.id, 10), req.body)
  res.json({ status: "updated", data: notification })
}))

router.delete("/:id", authenticate, asyncHandler(async (req, res) => {
  await notificationService.deleteNotification(parseInt(req.params.id, 10))
  res.json({ status: "deleted" })
}))

router.get("/user/:userId", authenticate, asyncHandler(async (req, res) => {
  const notifications = await notificationService.getUserNotifications(parseInt(req.params.userId, 10))
  res.json({ status: "success", count: notifications.length, data: notifications })
}))

export default router
