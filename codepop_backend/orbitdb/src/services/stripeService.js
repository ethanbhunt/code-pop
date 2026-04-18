// src/services/stripeService.js
import Stripe from "stripe"

function requireTestKey(secretKey) {
  if (!secretKey) {
    const err = new Error("STRIPE_SECRET_KEY is not set")
    err.code = "STRIPE_NOT_CONFIGURED"
    throw err
  }

  // Hard safety: never allow live keys in dev repo by accident.
  if (!String(secretKey).startsWith("sk_test_")) {
    const err = new Error("Stripe must run in TEST mode (sk_test_...)")
    err.code = "STRIPE_LIVE_KEY_REJECTED"
    throw err
  }
}

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY
  requireTestKey(secretKey)
  return new Stripe(secretKey, { apiVersion: "2024-06-20" })
}

export function getStripePublishableKey() {
  const pk = process.env.STRIPE_PUBLISHABLE_KEY
  if (!pk) return null
  if (!String(pk).startsWith("pk_test_")) return null
  return pk
}

/**
 * Create a PaymentIntent + (optional) Customer/EphemeralKey for PaymentSheet.
 *
 * @param {{ amountDollars: number, orderId: number|string, userId?: number|string|null }} params
 */
export async function createPaymentSheetIntent({ amountDollars, orderId, userId }) {
  const stripe = getStripe()

  const amount = Math.round(Number(amountDollars) * 100)
  if (!Number.isFinite(amount) || amount <= 0) {
    const err = new Error("Amount must be a positive number")
    err.code = "VALIDATION_ERROR"
    throw err
  }

  if (!orderId) {
    const err = new Error("orderId is required")
    err.code = "VALIDATION_ERROR"
    throw err
  }

  // Create a lightweight customer for PaymentSheet.
  // (We are not persisting it to user profile yet; safe for test-mode.)
  const customer = await stripe.customers.create({
    metadata: {
      userId: userId != null ? String(userId) : "guest",
    },
  })

  const ephemeralKey = await stripe.ephemeralKeys.create(
    { customer: customer.id },
    // Stripe requires the API version on ephemeral key creation.
    { apiVersion: "2024-06-20" }
  )

  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: "usd",
    automatic_payment_methods: { enabled: true },
    metadata: {
      orderId: String(orderId),
      userId: userId != null ? String(userId) : "guest",
      environment: "test",
    },
  })

  return {
    paymentIntentId: paymentIntent.id,
    paymentIntentClientSecret: paymentIntent.client_secret,
    customerId: customer.id,
    ephemeralKeySecret: ephemeralKey.secret,
  }
}

export async function retrievePaymentIntent(paymentIntentId) {
  const stripe = getStripe()
  return stripe.paymentIntents.retrieve(paymentIntentId)
}

export async function refundPaymentIntent({ paymentIntentId, amountDollars = null, reason = "requested_by_customer" }) {
  const stripe = getStripe()
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ["latest_charge"] })

  const chargeId = typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge?.id
  if (!chargeId) {
    const err = new Error("PaymentIntent has no charge to refund")
    err.code = "NO_CHARGE"
    throw err
  }

  const refund = await stripe.refunds.create({
    charge: chargeId,
    ...(amountDollars != null
      ? { amount: Math.round(Number(amountDollars) * 100) }
      : {}),
    reason,
    metadata: {
      paymentIntentId: String(paymentIntentId),
      environment: "test",
    },
  })

  return { refundId: refund.id, status: refund.status }
}

