// src/routes/stripe.js
import express from "express"
import { asyncHandler } from "../middleware/errorHandler.js"
import { optionalAuth, authenticate, requireAdmin } from "../middleware/auth.js"
import * as stripeService from "../services/stripeService.js"
import * as orderService from "../services/orderService.js"
import * as paymentService from "../services/paymentService.js"

const router = express.Router()

// GET /backend/stripe/config - return publishable key (test-mode only)
router.get("/config", optionalAuth, asyncHandler(async (req, res) => {
  const publishableKey = stripeService.getStripePublishableKey()
  res.json({ status: "success", publishableKey })
}))

// POST /backend/stripe/payment-sheet - create PI + ephemeral key for PaymentSheet
router.post("/payment-sheet", optionalAuth, asyncHandler(async (req, res) => {
  const { amount, orderId } = req.body

  const amountDollars = Number(amount)
  const finalOrderId = parseInt(orderId, 10)
  if (!finalOrderId || !Number.isFinite(amountDollars) || amountDollars <= 0) {
    return res.status(400).json({
      error: "Invalid amount or orderId",
      code: "VALIDATION_ERROR",
      details: "amount (dollars) and orderId are required",
    })
  }

  // Create Stripe PI first (so we can persist its id even if DB write fails later).
  const sheet = await stripeService.createPaymentSheetIntent({
    amountDollars,
    orderId: finalOrderId,
    userId: req.user?.userId ?? null,
  })

  // Persist onto order + payments db (best-effort; keep checkout working even if this fails).
  try {
    await orderService.updateOrder(finalOrderId, {
      stripeId: sheet.paymentIntentId,
      paymentStatus: "pending",
    })

    await paymentService.createPayment(
      finalOrderId,
      req.user?.userId ?? 0,
      amountDollars,
      "stripe",
      null
    )
  } catch (err) {
    console.warn("[stripe] Non-fatal persistence error:", err?.message || err)
  }

  res.json({
    paymentIntent: sheet.paymentIntentClientSecret,
    paymentIntentId: sheet.paymentIntentId,
    customer: sheet.customerId,
    ephemeralKey: sheet.ephemeralKeySecret,
  })
}))

// POST /backend/stripe/confirm - server-side verify PI status and update order/paymentStatus
router.post("/confirm", optionalAuth, asyncHandler(async (req, res) => {
  const { orderId, paymentIntentId } = req.body
  const finalOrderId = parseInt(orderId, 10)

  if (!finalOrderId || !paymentIntentId) {
    return res.status(400).json({
      error: "orderId and paymentIntentId are required",
      code: "VALIDATION_ERROR",
    })
  }

  const pi = await stripeService.retrievePaymentIntent(paymentIntentId)

  // Map Stripe status -> our order paymentStatus
  const nextPaymentStatus =
    pi.status === "succeeded" ? "paid" :
    pi.status === "processing" ? "processing" :
    pi.status === "requires_payment_method" ? "failed" :
    "pending"

  const updatedOrder = await orderService.updateOrder(finalOrderId, {
    stripeId: paymentIntentId,
    paymentStatus: nextPaymentStatus,
  })

  res.json({
    status: "success",
    stripe: { id: pi.id, status: pi.status, amount: pi.amount, currency: pi.currency },
    order: updatedOrder,
  })
}))

// POST /backend/stripe/refund - refund PI (admin only)
router.post("/refund", authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { orderId, paymentIntentId, amount, reason } = req.body
  const finalOrderId = parseInt(orderId, 10)

  if (!finalOrderId || !paymentIntentId) {
    return res.status(400).json({
      error: "orderId and paymentIntentId are required",
      code: "VALIDATION_ERROR",
    })
  }

  const refund = await stripeService.refundPaymentIntent({
    paymentIntentId,
    amountDollars: amount != null ? Number(amount) : null,
    reason: reason || "requested_by_customer",
  })

  const updatedOrder = await orderService.updateOrder(finalOrderId, {
    paymentStatus: "refunded",
  })

  res.json({
    status: "success",
    refund,
    order: updatedOrder,
  })
}))

// POST /backend/stripe/remake - mark order as remade (admin only)
router.post("/remake", authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { orderId } = req.body
  const finalOrderId = parseInt(orderId, 10)

  if (!finalOrderId) {
    return res.status(400).json({
      error: "orderId is required",
      code: "VALIDATION_ERROR",
    })
  }

  const updatedOrder = await orderService.updateOrder(finalOrderId, {
    paymentStatus: "remade",
    orderStatus: "processing",
  })

  res.json({ status: "success", order: updatedOrder })
}))

export default router

