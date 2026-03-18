// src/routes/orders.js
import express from "express"
import { asyncHandler } from "../middleware/errorHandler.js"
import { authenticate } from "../middleware/auth.js"
import * as orderService from "../services/orderService.js"

const router = express.Router()

router.get("/", authenticate, asyncHandler(async (req, res) => {
  const orders = await orderService.listAllOrders()
  res.json({ status: "success", count: orders.length, data: orders })
}))

router.post("/", authenticate, asyncHandler(async (req, res) => {
  const { drinkIds } = req.body
  const order = await orderService.createOrder(req.user.userId, drinkIds)
  res.status(201).json({ status: "created", data: order })
}))

router.get("/:id", authenticate, asyncHandler(async (req, res) => {
  const order = await orderService.getOrderById(parseInt(req.params.id, 10))
  res.json({ status: "success", data: order })
}))

router.patch("/:id", authenticate, asyncHandler(async (req, res) => {
  const order = await orderService.updateOrder(parseInt(req.params.id, 10), req.body)
  res.json({ status: "updated", data: order })
}))

router.delete("/:id", authenticate, asyncHandler(async (req, res) => {
  await orderService.deleteOrder(parseInt(req.params.id, 10))
  res.json({ status: "deleted" })
}))

router.get("/user/:userId", authenticate, asyncHandler(async (req, res) => {
  const orders = await orderService.getUserOrders(parseInt(req.params.userId, 10))
  res.json({ status: "success", count: orders.length, data: orders })
}))

export default router
