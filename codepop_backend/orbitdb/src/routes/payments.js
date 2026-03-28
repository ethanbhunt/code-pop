// src/routes/payments.js
import express from "express"
import { asyncHandler } from "../middleware/errorHandler.js"
import { authenticate, requireAdmin } from "../middleware/auth.js"
import * as paymentService from "../services/paymentService.js"

const router = express.Router()

// GET /backend/payments - List all payments (Admin only)
router.get("/", authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { status, startDate, endDate, offset = 0, limit = 50 } = req.query
  
  let payments = []
  
  if (startDate && endDate) {
    payments = await paymentService.getPaymentsByDateRange(startDate, endDate)
  } else if (status) {
    payments = await paymentService.getPaymentsByStatus(status)
  } else {
    payments = await paymentService.listAllPayments(parseInt(limit, 10), parseInt(offset, 10))
  }
  
  res.json({ status: "success", count: payments.length, data: payments })
}))

// POST /backend/payments - Create new payment
router.post("/", authenticate, asyncHandler(async (req, res) => {
  const { orderId, userId, amount, paymentMethod, stripeTokenId } = req.body
  
  if (!orderId || !userId || amount === undefined || !paymentMethod) {
    return res.status(400).json({
      error: "Missing required fields",
      code: "VALIDATION_ERROR",
      details: "orderId, userId, amount, and paymentMethod are required"
    })
  }
  
  const payment = await paymentService.createPayment(
    parseInt(orderId, 10),
    parseInt(userId, 10),
    amount,
    paymentMethod,
    stripeTokenId
  )
  
  res.status(201).json({ status: "created", data: payment })
}))

// GET /backend/payments/:id - Get specific payment (Admin only)
router.get("/:id", authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const payment = await paymentService.getPaymentById(parseInt(req.params.id, 10))
  res.json({ status: "success", data: payment })
}))

// PATCH /backend/payments/:id/refund - Refund payment (Admin only)
router.patch("/:id/refund", authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { refundAmount } = req.body
  
  const payment = await paymentService.refundPayment(
    parseInt(req.params.id, 10),
    refundAmount
  )
  
  res.json({ status: "success", data: payment })
}))

export default router
