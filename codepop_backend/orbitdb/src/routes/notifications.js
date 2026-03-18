// src/routes/notifications.js
import express from "express"
import { asyncHandler } from "../middleware/errorHandler.js"
import { authenticate } from "../middleware/auth.js"
import * as notificationService from "../services/notificationService.js"

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
