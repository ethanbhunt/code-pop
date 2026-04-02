// src/routes/revenues.js
import express from "express"
import { asyncHandler } from "../middleware/errorHandler.js"
import { authenticate, requireAdmin } from "../middleware/auth.js"
import * as revenueService from "../services/revenueService.js"

const router = express.Router()

router.get("/", authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const revenues = await revenueService.listAllRevenues()
  res.json({ status: "success", count: revenues.length, data: revenues })
}))

router.post("/", authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { orderId, amount, description } = req.body
  const revenue = await revenueService.createRevenue(orderId, amount, description)
  res.status(201).json({ status: "created", data: revenue })
}))

router.get("/report", authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query
  const report = await revenueService.generateRevenueReport(startDate, endDate)
  res.json({ status: "success", data: report })
}))

router.get("/:id", authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const revenue = await revenueService.getRevenueById(parseInt(req.params.id, 10))
  res.json({ status: "success", data: revenue })
}))

router.put("/:id", authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const revenue = await revenueService.updateRevenue(parseInt(req.params.id, 10), req.body)
  res.json({ status: "updated", data: revenue })
}))

router.delete("/:id", authenticate, requireAdmin, asyncHandler(async (req, res) => {
  await revenueService.deleteRevenue(parseInt(req.params.id, 10))
  res.json({ status: "deleted" })
}))

export default router
