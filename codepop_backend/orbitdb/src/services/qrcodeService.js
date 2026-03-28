// src/services/qrcodeService.js
// QR code management service

import { getQRCodesDb, getNextId, getTimestamp } from "../utils/db.js"
import { validateISODate, validatePositiveInteger } from "../utils/validation.js"
import crypto from "crypto"

/**
 * Create a new QR code for an order
 */
export async function createQRCode(orderId, userId, expirationTime) {
  if (!orderId || !userId) {
    throw new Error("OrderID and UserID are required")
  }

  if (!expirationTime) {
    throw new Error("Expiration time is required")
  }

  if (!validateISODate(expirationTime)) {
    throw new Error("Invalid expiration time format (must be ISO 8601)")
  }

  const qrcodesDb = getQRCodesDb()
  const qrcodeId = await getNextId(qrcodesDb, "qrcode")

  // Generate unique QR code data (can be a token or identifier)
  const qrcodeData = crypto.randomBytes(16).toString("hex")

  const qrcode = {
    qrcodeId,
    orderId,
    userId,
    qrcodeData,
    expirationTime,
    accessCount: 0,
    firstAccessedAt: null,
    lastAccessedAt: null,
    isExpired: false,
    createdAt: getTimestamp()
  }

  await qrcodesDb.put(`qrcode:${qrcodeId}`, qrcode)

  return qrcode
}

/**
 * Get QR code by ID
 */
export async function getQRCodeById(qrcodeId) {
  const qrcodesDb = getQRCodesDb()
  const qrcode = await qrcodesDb.get(`qrcode:${qrcodeId}`)

  if (!qrcode) {
    throw new Error("QR code not found")
  }

  return qrcode
}

/**
 * Get QR code by order ID
 */
export async function getQRCodeByOrderId(orderId) {
  if (!orderId) {
    throw new Error("Order ID is required")
  }

  const qrcodesDb = getQRCodesDb()
  const allQRCodes = await qrcodesDb.all()

  for (const entry of allQRCodes) {
    const qrcode = entry.value
    if (qrcode && qrcode.orderId === orderId) {
      return qrcode
    }
  }

  throw new Error("QR code not found for this order")
}

/**
 * List all QR codes with limit and offset
 */
export async function listAllQRCodes(limit = 100, offset = 0) {
  const qrcodesDb = getQRCodesDb()
  const allQRCodes = await qrcodesDb.all()

  const qrcodes = []
  let count = 0

  for (const entry of allQRCodes) {
    const qrcode = entry.value
    if (qrcode && qrcode.qrcodeId) {
      if (count >= offset) {
        qrcodes.push(qrcode)
      }
      count++
      if (qrcodes.length >= limit) break
    }
  }

  return qrcodes
}

/**
 * Validate QR code - check expiration and increment access count
 */
export async function validateQRCode(qrcodeId) {
  const qrcodesDb = getQRCodesDb()
  const qrcode = await qrcodesDb.get(`qrcode:${qrcodeId}`)

  if (!qrcode) {
    throw new Error("QR code not found")
  }

  const now = new Date().getTime()
  const expiration = new Date(qrcode.expirationTime).getTime()

  if (isNaN(expiration)) {
    throw new Error("Invalid expiration time")
  }

  // Check if expired
  if (now > expiration) {
    qrcode.isExpired = true
    await qrcodesDb.put(`qrcode:${qrcodeId}`, qrcode)
    throw new Error("QR code has expired")
  }

  // Update access tracking
  qrcode.accessCount += 1
  const now_iso = getTimestamp()
  if (!qrcode.firstAccessedAt) {
    qrcode.firstAccessedAt = now_iso
  }
  qrcode.lastAccessedAt = now_iso

  await qrcodesDb.put(`qrcode:${qrcodeId}`, qrcode)

  return qrcode
}

/**
 * Delete QR code
 */
export async function deleteQRCode(qrcodeId) {
  const qrcodesDb = getQRCodesDb()
  const qrcode = await qrcodesDb.get(`qrcode:${qrcodeId}`)

  if (!qrcode) {
    throw new Error("QR code not found")
  }

  await qrcodesDb.del(`qrcode:${qrcodeId}`)

  return true
}

/**
 * Get all expired QR codes
 */
export async function getExpiredQRCodes() {
  const qrcodesDb = getQRCodesDb()
  const allQRCodes = await qrcodesDb.all()

  const now = new Date().getTime()
  const expiredQRCodes = []

  for (const entry of allQRCodes) {
    const qrcode = entry.value
    if (qrcode && qrcode.qrcodeId) {
      const expiration = new Date(qrcode.expirationTime).getTime()
      if (!isNaN(expiration) && now > expiration) {
        expiredQRCodes.push(qrcode)
      }
    }
  }

  return expiredQRCodes
}

/**
 * Delete all expired QR codes
 */
export async function deleteExpiredQRCodes() {
  const qrcodesDb = getQRCodesDb()
  const expiredQRCodes = await getExpiredQRCodes()

  let deletedCount = 0
  for (const qrcode of expiredQRCodes) {
    await qrcodesDb.del(`qrcode:${qrcode.qrcodeId}`)
    deletedCount++
  }

  return deletedCount
}

/**
 * Get QR code by order user
 */
export async function getQRCodesByUser(userId) {
  if (!userId) {
    throw new Error("User ID is required")
  }

  const qrcodesDb = getQRCodesDb()
  const allQRCodes = await qrcodesDb.all()

  const qrcodes = []
  for (const entry of allQRCodes) {
    const qrcode = entry.value
    if (qrcode && qrcode.qrcodeId && qrcode.userId === userId) {
      qrcodes.push(qrcode)
    }
  }

  return qrcodes
}
