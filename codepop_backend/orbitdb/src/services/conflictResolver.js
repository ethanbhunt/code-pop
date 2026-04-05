// src/services/conflictResolver.js
// Business logic conflict detection and resolution
//
// Validates invariants during database writes to prevent:
// - Inventory going negative
// - Order revenue becoming negative or inconsistent
// - Invalid status transitions
// - Financial inconsistencies due to simultaneous writes
//
// When a conflict is detected:
// 1. Write is rejected or rolled back
// 2. Conflict is logged to AuditLog for compliance
// 3. Error is returned to client

/**
 * Validate inventory invariants
 * @param {object} inventoryItem - Inventory entry to validate
 * @returns {object} { valid: boolean, errors: array<string> }
 */
export function validateInventoryInvariants(inventoryItem) {
  const errors = []

  if (!inventoryItem || typeof inventoryItem !== "object") {
    return { valid: false, errors: ["Inventory item is not an object"] }
  }

  // Quantity must never be negative
  if (typeof inventoryItem.quantity === "number" && inventoryItem.quantity < 0) {
    errors.push(
      `Quantity cannot be negative: ${inventoryItem.quantity} (item: ${inventoryItem.itemName})`
    )
  }

  // Threshold must be non-negative
  if (typeof inventoryItem.thresholdLevel === "number" && inventoryItem.thresholdLevel < 0) {
    errors.push(
      `Threshold cannot be negative: ${inventoryItem.thresholdLevel} (item: ${inventoryItem.itemName})`
    )
  }

  // Quantity must be a number
  if (inventoryItem.quantity !== undefined && typeof inventoryItem.quantity !== "number") {
    errors.push(
      `Quantity must be a number: ${typeof inventoryItem.quantity} (item: ${inventoryItem.itemName})`
    )
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Validate order invariants
 * @param {object} order - Order entry to validate
 * @returns {object} { valid: boolean, errors: array<string> }
 */
export function validateOrderInvariants(order) {
  const errors = []

  if (!order || typeof order !== "object") {
    return { valid: false, errors: ["Order is not an object"] }
  }

  // Normalize status field name (status or orderStatus or OrderStatus)
  const status = order.status || order.orderStatus || order.OrderStatus
  const paymentStatus = order.paymentStatus || order.PaymentStatus

  // Valid order statuses
  const validStatuses = ["pending", "processing", "completed", "cancelled"]
  if (status && !validStatuses.includes(status.toLowerCase())) {
    errors.push(`Invalid order status: ${status}. Expected: ${validStatuses.join(", ")}`)
  }

  // Valid payment statuses
  const validPaymentStatuses = ["pending", "succeeded", "failed", "paid", "remade"]
  if (paymentStatus && !validPaymentStatuses.includes(paymentStatus.toLowerCase())) {
    errors.push(
      `Invalid payment status: ${paymentStatus}. Expected: ${validPaymentStatuses.join(", ")}`
    )
  }

  // Order ID must exist
  if (!order.orderId && !order.OrderID) {
    errors.push("Order must have an orderId")
  }

  // User ID must exist
  if (!order.userId && !order.UserID) {
    errors.push("Order must have a userId")
  }

  // Drinks array must exist and not be empty - be flexible with field names
  const drinks = order.drinks || order.Drinks || order.drinkIds || []
  if (!Array.isArray(drinks) || drinks.length === 0) {
    errors.push("Order must have at least one drink")
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Validate revenue invariants
 * @param {object} revenue - Revenue entry to validate
 * @returns {object} { valid: boolean, errors: array<string> }
 */
export function validateRevenueInvariants(revenue) {
  const errors = []

  if (!revenue || typeof revenue !== "object") {
    return { valid: false, errors: ["Revenue is not an object"] }
  }

  // Total amount must be non-negative (handle both 'totalAmount' and 'amount' field names)
  const amount = revenue.totalAmount !== undefined ? revenue.totalAmount : revenue.amount
  if (typeof amount === "number" && amount < 0) {
    errors.push(
      `Amount cannot be negative: ${amount} (order: ${revenue.orderId})`
    )
  }

  // Amount must be a number
  if (amount !== undefined && typeof amount !== "number") {
    errors.push(
      `Amount must be a number: ${typeof amount} (order: ${revenue.orderId})`
    )
  }

  // Order ID must exist
  if (!revenue.orderId) {
    errors.push("Revenue must have an orderId")
  }

  // Sale date should be valid if present
  if (revenue.saleDate && isNaN(Date.parse(revenue.saleDate))) {
    errors.push(`Invalid sale date: ${revenue.saleDate}`)
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Validate stock transfer invariants
 * @param {object} transfer - Stock transfer entry to validate
 * @returns {object} { valid: boolean, errors: array<string> }
 */
export function validateTransferInvariants(transfer) {
  const errors = []

  if (!transfer || typeof transfer !== "object") {
    return { valid: false, errors: ["Transfer is not an object"] }
  }

  // Valid statuses
  const validStatuses = ["pending", "approved", "in_transit", "completed", "cancelled"]
  if (transfer.status && !validStatuses.includes(transfer.status)) {
    errors.push(
      `Invalid transfer status: ${transfer.status}. Expected: ${validStatuses.join(", ")}`
    )
  }

  // Quantity must be positive
  if (typeof transfer.quantity === "number" && transfer.quantity <= 0) {
    errors.push(`Transfer quantity must be positive: ${transfer.quantity}`)
  }

  // Hub ID must exist
  if (!transfer.hubId) {
    errors.push("Transfer must have a hubId")
  }

  // Store ID must exist
  if (!transfer.storeId) {
    errors.push("Transfer must have a storeId")
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Detect merge conflict between two versions of the same object
 * @param {object} before - Previous value
 * @param {object} current - Current value (from another peer)
 * @param {string} entityType - Type of entity ('inventory', 'order', 'revenue', 'transfer')
 * @returns {object} { conflicted: boolean, conflicts: array<object> }
 */
export function detectMergeConflict(before, current, entityType) {
  const conflicts = []

  if (!before || !current) {
    return { conflicted: false, conflicts: [] }
  }

  // Inventory: Check quantity wasn't reduced simultaneously (could go negative)
  if (entityType === "inventory") {
    const beforeQty = before.quantity || 0
    const currentQty = current.quantity || 0

    // If current is lower than before, another peer might have reduced it too
    // This is only a conflict if we're about to reduce it further
    if (currentQty < beforeQty) {
      conflicts.push({
        field: "quantity",
        type: "concurrent_reduction",
        before: beforeQty,
        current: currentQty,
        message: "Quantity was reduced by another peer during this operation"
      })
    }
  }

  // Order: Check status wasn't changed simultaneously
  if (entityType === "order") {
    if (before.status !== current.status && before.status !== "pending") {
      conflicts.push({
        field: "status",
        type: "concurrent_status_change",
        before: before.status,
        current: current.status,
        message: "Order status was changed by another peer during this operation"
      })
    }

    // Payment status conflict
    if (before.paymentStatus !== current.paymentStatus) {
      conflicts.push({
        field: "paymentStatus",
        type: "concurrent_payment_change",
        before: before.paymentStatus,
        current: current.paymentStatus,
        message: "Payment status was changed by another peer during this operation"
      })
    }
  }

  return {
    conflicted: conflicts.length > 0,
    conflicts
  }
}

/**
 * Create audit log entry for a conflict
 * Useful for compliance and debugging
 * @param {object} auditDb - OrbitDB audit log database
 * @param {string} itemName - Item involved in conflict
 * @param {string} action - Action that caused conflict
 * @param {object} details - Additional details
 * @returns {promise}
 */
export async function logConflict(auditDb, itemName, action, details = {}) {
  const auditEntry = {
    timestamp: new Date().toISOString(),
    action: `conflict_detected_${action}`,
    itemName,
    itemType: "conflict",
    quantityBefore: details.before,
    quantityAfter: details.current,
    details: details.conflictData || [],
    userId: "system_conflict_resolver",
    resolved: details.resolved || false,
    resolutionStrategy: details.strategy || "rejected"
  }

  try {
    const auditId = `conflict:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`
    await auditDb.put(auditId, auditEntry)
  } catch (err) {
    console.error("[conflictResolver] Failed to log conflict:", err.message)
  }
}

/**
 * Merge two inventory updates intelligently
 * In case of simultaneous reductions, take the minimum to prevent going negative
 * @param {object} peer1_update - Update from peer 1
 * @param {object} peer2_update - Update from peer 2
 * @returns {object} Merged update
 */
export function mergeInventoryUpdates(peer1_update, peer2_update) {
  if (!peer1_update || !peer2_update) {
    return peer1_update || peer2_update
  }

  return {
    ...peer1_update,
    ...peer2_update,
    // For quantity: take the higher value (most conservative)
    // This prevents negative quantities if both peers reduced simultaneously
    quantity: Math.max(
      peer1_update.quantity !== undefined ? peer1_update.quantity : 0,
      peer2_update.quantity !== undefined ? peer2_update.quantity : 0
    )
  }
}

/**
 * Merge two order updates
 * Later timestamp wins for status changes
 * @param {object} peer1_update - Update from peer 1 with timestamp
 * @param {object} peer2_update - Update from peer 2 with timestamp
 * @returns {object} Merged update
 */
export function mergeOrderUpdates(peer1_update, peer2_update) {
  if (!peer1_update || !peer2_update) {
    return peer1_update || peer2_update
  }

  const timestamp1 = new Date(peer1_update.updatedAt || 0).getTime()
  const timestamp2 = new Date(peer2_update.updatedAt || 0).getTime()

  // Later update wins
  if (timestamp2 > timestamp1) {
    return { ...peer1_update, ...peer2_update }
  }

  return peer1_update
}

/**
 * Assert that an operation would not violate invariants
 * @param {object} item - Item to check
 * @param {string} entityType - Type of entity
 * @throws {Error} If invariants violated
 */
export function assertInvariants(item, entityType) {
  let validation

  switch (entityType) {
    case "inventory":
      validation = validateInventoryInvariants(item)
      break
    case "order":
      validation = validateOrderInvariants(item)
      break
    case "revenue":
      validation = validateRevenueInvariants(item)
      break
    case "transfer":
      validation = validateTransferInvariants(item)
      break
    default:
      return // Unknown type - skip validation
  }

  if (!validation.valid) {
    throw new Error(`Invariant violation (${entityType}): ${validation.errors.join("; ")}`)
  }
}

/**
 * Wrap a database write with conflict detection
 * Usage: const result = await conflictGuardedWrite(db, key, value, 'inventory')
 * @param {object} db - OrbitDB database
 * @param {string} key - Key to write
 * @param {object} newValue - New value
 * @param {string} entityType - Type of entity ('inventory', 'order', etc.)
 * @param {object} auditDb - Optional: audit database for logging conflicts
 * @returns {object} { success: boolean, value: object, conflict: boolean, errors: array }
 */
export async function conflictGuardedWrite(db, key, newValue, entityType, auditDb = null) {
  try {
    // Validate new value against invariants first
    assertInvariants(newValue, entityType)

    // Get current value to detect conflicts
    const currentValue = await db.get(key)

    // Detect merge conflicts
    if (currentValue && entityType !== "transfer") {
      const conflict = detectMergeConflict(currentValue, newValue, entityType)

      if (conflict.conflicted) {
        if (auditDb) {
          await logConflict(auditDb, key, "write_rejected", {
            before: currentValue,
            current: newValue,
            conflictData: conflict.conflicts,
            resolved: false,
            strategy: "rejected"
          })
        }

        return {
          success: false,
          value: null,
          conflicted: true,
          errors: conflict.conflicts.map(c => c.message)
        }
      }
    }

    // Write to database
    await db.put(key, newValue)

    return {
      success: true,
      value: newValue,
      conflicted: false,
      errors: []
    }
  } catch (err) {
    if (auditDb) {
      await logConflict(auditDb, key, "write_error", {
        error: err.message,
        resolved: false,
        strategy: "rejected"
      })
    }

    return {
      success: false,
      value: null,
      conflicted: false,
      errors: [err.message]
    }
  }
}
