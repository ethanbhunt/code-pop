// src/services/paymentService.js
// Payment transactions service

import { getPaymentsDb, getNextId, getTimestamp } from "../utils/db.js"
import { validatePaymentStatus, validateNumber } from "../utils/validation.js"

/**
 * Create a new payment transaction
 */
export async function createPayment(orderId, userId, amount, paymentMethod, stripeTokenId) {
  if (!orderId || !userId || amount === undefined || !paymentMethod) {
    throw new Error("OrderID, UserID, amount, and paymentMethod are required")
  }

  if (!validateNumber(amount) || parseFloat(amount) <= 0) {
    throw new Error("Amount must be a positive number")
  }

  const paymentsDb = getPaymentsDb()
  const paymentId = await getNextId(paymentsDb, "payment")

  const payment = {
    paymentId,
    orderId,
    userId,
    amount: parseFloat(amount),
    paymentMethod: paymentMethod.toLowerCase(),
    paymentStatus: "pending",
    stripeTokenId: stripeTokenId || null,
    refundStatus: null,
    refundAmount: null,
    createdAt: getTimestamp(),
    updatedAt: getTimestamp()
  }

  await paymentsDb.put(`payment:${paymentId}`, payment)

  return payment
}

/**
 * Get payment by ID
 */
export async function getPaymentById(paymentId) {
  const paymentsDb = getPaymentsDb()
  const payment = await paymentsDb.get(`payment:${paymentId}`)

  if (!payment) {
    throw new Error("Payment not found")
  }

  return payment
}

/**
 * List all payments with limit and offset
 */
export async function listAllPayments(limit = 100, offset = 0) {
  const paymentsDb = getPaymentsDb()
  const allPayments = await paymentsDb.all()

  const payments = []
  let count = 0

  for (const entry of allPayments) {
    const payment = entry.value
    if (payment && payment.paymentId) {
      if (count >= offset) {
        payments.push(payment)
      }
      count++
      if (payments.length >= limit) break
    }
  }

  return payments
}

/**
 * Get payments by status
 */
export async function getPaymentsByStatus(status) {
  if (!validatePaymentStatus(status)) {
    throw new Error("Invalid payment status")
  }

  const paymentsDb = getPaymentsDb()
  const allPayments = await paymentsDb.all()

  const payments = []
  for (const entry of allPayments) {
    const payment = entry.value
    if (payment && payment.paymentId && payment.paymentStatus === status.toLowerCase()) {
      payments.push(payment)
    }
  }

  return payments
}

/**
 * Get payments by user
 */
export async function getPaymentsByUser(userId) {
  if (!userId) {
    throw new Error("User ID is required")
  }

  const paymentsDb = getPaymentsDb()
  const allPayments = await paymentsDb.all()

  const payments = []
  for (const entry of allPayments) {
    const payment = entry.value
    if (payment && payment.paymentId && payment.userId === userId) {
      payments.push(payment)
    }
  }

  return payments
}

/**
 * Get payments by order
 */
export async function getPaymentsByOrder(orderId) {
  if (!orderId) {
    throw new Error("Order ID is required")
  }

  const paymentsDb = getPaymentsDb()
  const allPayments = await paymentsDb.all()

  const payments = []
  for (const entry of allPayments) {
    const payment = entry.value
    if (payment && payment.paymentId && payment.orderId === orderId) {
      payments.push(payment)
    }
  }

  return payments
}

/**
 * Update payment status
 */
export async function updatePaymentStatus(paymentId, newStatus) {
  const paymentsDb = getPaymentsDb()
  const payment = await paymentsDb.get(`payment:${paymentId}`)

  if (!payment) {
    throw new Error("Payment not found")
  }

  if (!validatePaymentStatus(newStatus)) {
    throw new Error("Invalid payment status")
  }

  payment.paymentStatus = newStatus.toLowerCase()
  payment.updatedAt = getTimestamp()

  await paymentsDb.put(`payment:${paymentId}`, payment)

  return payment
}

/**
 * Refund payment
 */
export async function refundPayment(paymentId, refundAmount) {
  const paymentsDb = getPaymentsDb()
  const payment = await paymentsDb.get(`payment:${paymentId}`)

  if (!payment) {
    throw new Error("Payment not found")
  }

  if (!validateNumber(refundAmount) || parseFloat(refundAmount) <= 0) {
    throw new Error("Refund amount must be a positive number")
  }

  if (parseFloat(refundAmount) > payment.amount) {
    throw new Error("Refund amount cannot exceed payment amount")
  }

  payment.refundStatus = "pending"
  payment.refundAmount = parseFloat(refundAmount)
  payment.updatedAt = getTimestamp()

  await paymentsDb.put(`payment:${paymentId}`, payment)

  return payment
}

/**
 * Confirm refund
 */
export async function confirmRefund(paymentId) {
  const paymentsDb = getPaymentsDb()
  const payment = await paymentsDb.get(`payment:${paymentId}`)

  if (!payment) {
    throw new Error("Payment not found")
  }

  if (!payment.refundAmount) {
    throw new Error("No pending refund for this payment")
  }

  payment.refundStatus = "completed"
  payment.updatedAt = getTimestamp()

  await paymentsDb.put(`payment:${paymentId}`, payment)

  return payment
}

/**
 * Get payments by date range
 */
export async function getPaymentsByDateRange(startDate, endDate) {
  if (!startDate || !endDate) {
    throw new Error("Start date and end date are required")
  }

  const start = new Date(startDate).getTime()
  const end = new Date(endDate).getTime()

  if (isNaN(start) || isNaN(end)) {
    throw new Error("Invalid date format")
  }

  if (start > end) {
    throw new Error("Start date must be before end date")
  }

  const paymentsDb = getPaymentsDb()
  const allPayments = await paymentsDb.all()

  const payments = []
  for (const entry of allPayments) {
    const payment = entry.value
    if (payment && payment.paymentId) {
      const paymentTime = new Date(payment.createdAt).getTime()
      if (paymentTime >= start && paymentTime <= end) {
        payments.push(payment)
      }
    }
  }

  return payments
}

/**
 * Delete payment
 */
export async function deletePayment(paymentId) {
  const paymentsDb = getPaymentsDb()
  const payment = await paymentsDb.get(`payment:${paymentId}`)

  if (!payment) {
    throw new Error("Payment not found")
  }

  await paymentsDb.del(`payment:${paymentId}`)

  return true
}
