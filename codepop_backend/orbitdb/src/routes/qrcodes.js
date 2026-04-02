// src/routes/qrcodes.js
import express from "express"
import { asyncHandler } from "../middleware/errorHandler.js"
import { authenticate, requireAdmin } from "../middleware/auth.js"
import * as qrcodeService from "../services/qrcodeService.js"
import * as orderService from "../services/orderService.js"

const router = express.Router()

// GET /backend/qrcodes - List all QR codes (Admin only)
router.get("/", authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { orderId, isExpired, offset = 0, limit = 50 } = req.query
  
  let qrcodes = []
  
  if (orderId) {
    const qrcode = await qrcodeService.getQRCodeByOrderId(parseInt(orderId, 10))
    qrcodes = [qrcode]
  } else {
    qrcodes = await qrcodeService.listAllQRCodes(parseInt(limit, 10), parseInt(offset, 10))
  }
  
  // Filter expired if requested
  if (isExpired !== undefined) {
    const filterExpired = isExpired === "true"
    qrcodes = qrcodes.filter(qr => {
      const now = new Date().getTime()
      const expiration = new Date(qr.expirationTime).getTime()
      const isExp = now > expiration
      return filterExpired ? isExp : !isExp
    })
  }
  
  res.json({ status: "success", count: qrcodes.length, data: qrcodes })
}))

// POST /backend/qrcodes - Create new QR code (Admin only)
router.post("/", authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { orderId, userId, expirationTime } = req.body
  
  if (!orderId || !userId || !expirationTime) {
    return res.status(400).json({
      error: "Missing required fields",
      code: "VALIDATION_ERROR",
      details: "orderId, userId, and expirationTime are required"
    })
  }
  
  const qrcode = await qrcodeService.createQRCode(
    parseInt(orderId, 10),
    parseInt(userId, 10),
    expirationTime
  )
  
  res.status(201).json({ status: "created", data: qrcode })
}))

// GET /backend/qrcodes/:id - Get specific QR code
router.get("/:id", authenticate, asyncHandler(async (req, res) => {
  const qrcode = await qrcodeService.getQRCodeById(parseInt(req.params.id, 10))
  
  // Check if user is admin or owns the QR code
  if (!req.user.isSuperuser && req.user.userId !== qrcode.userId) {
    return res.status(403).json({
      error: "Access denied",
      code: "NOT_ADMIN",
      details: "You can only view your own QR codes"
    })
  }
  
  res.json({ status: "success", data: qrcode })
}))

// GET /backend/qrcodes/:id/validate - Validate and use a QR code (open fridge)
router.get("/:id/validate", authenticate, asyncHandler(async (req, res) => {
  const qrcode = await qrcodeService.validateQRCode(parseInt(req.params.id, 10))
  
  // Check if user is admin or owns the QR code
  if (!req.user.isSuperuser && req.user.userId !== qrcode.userId) {
    return res.status(403).json({
      error: "Access denied",
      code: "NOT_ADMIN",
      details: "You can only use your own QR codes"
    })
  }
  
  res.json({
    status: "success",
    message: "QR code valid. Fridge unlocked.",
    data: {
      qrcodeId: qrcode.qrcodeId,
      orderId: qrcode.orderId,
      isExpired: qrcode.isExpired,
      accessCount: qrcode.accessCount
    }
  })
}))

// DELETE /backend/qrcodes/:id - Delete QR code (Admin only)
router.delete("/:id", authenticate, requireAdmin, asyncHandler(async (req, res) => {
  await qrcodeService.deleteQRCode(parseInt(req.params.id, 10))
  res.json({ status: "success", message: "QR code deleted successfully" })
}))

// GET /backend/qrcodes/order/:orderId - Get QR code for specific order
router.get("/order/:orderId", authenticate, asyncHandler(async (req, res) => {
  const qrcode = await qrcodeService.getQRCodeByOrderId(parseInt(req.params.orderId, 10))
  const order = await orderService.getOrderById(parseInt(req.params.orderId, 10))
  
  // Check if user is admin or owns the order
  if (!req.user.isSuperuser && req.user.userId !== order.userId) {
    return res.status(403).json({
      error: "Access denied",
      code: "NOT_ADMIN",
      details: "You can only view QR codes for your own orders"
    })
  }
  
  res.json({ status: "success", data: qrcode })
}))

export default router
