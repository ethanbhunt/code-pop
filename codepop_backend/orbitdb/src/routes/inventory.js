// src/routes/inventory.js
import express from "express"
import { asyncHandler } from "../middleware/errorHandler.js"
import { authenticate } from "../middleware/auth.js"
import * as inventoryService from "../services/inventoryService.js"

const router = express.Router()

router.get("/", authenticate, asyncHandler(async (req, res) => {
  const items = await inventoryService.listInventory()
  res.json({ status: "success", count: items.length, data: items })
}))

router.post("/", authenticate, asyncHandler(async (req, res) => {
  const { itemName, itemType, quantity, thresholdLevel } = req.body
  const item = await inventoryService.createInventoryItem(itemName, itemType, quantity, thresholdLevel)
  res.status(201).json({ status: "created", data: item })
}))

router.get("/report", authenticate, asyncHandler(async (req, res) => {
  const report = await inventoryService.generateInventoryReport()
  res.json({ status: "success", data: report })
}))

router.get("/:id", authenticate, asyncHandler(async (req, res) => {
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
