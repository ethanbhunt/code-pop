// src/services/logisticsService.js
// Transfer and delivery management

import { getLogisticsDb } from "../utils/db.js"
import { getTimestamp } from "../utils/db.js"

/**
 * Create transfer request
 */
export async function createTransfer(data) {
  const db = getLogisticsDb()
  
  if (!data.sourceStoreId || !data.destStoreId || !data.items || data.items.length === 0) {
    throw new Error("Missing required fields: sourceStoreId, destStoreId, items")
  }
  
  // Get next transfer ID
  let counterEntry = await db.get("counter:transfer")
  let nextId = 1
  
  if (counterEntry) {
    nextId = counterEntry + 1
  }
  
  const transfer = {
    transferId: nextId,
    sourceStoreId: data.sourceStoreId,
    destStoreId: data.destStoreId,
    items: data.items, // [{ inventoryId, quantity }]
    status: data.status || "pending",
    requestedBy: data.requestedBy || null,
    approvedBy: data.approvedBy || null,
    createdAt: getTimestamp(),
    scheduledDate: data.scheduledDate || null,
    deliveredDate: null,
    updatedAt: getTimestamp()
  }
  
  await db.put(`transfer:${nextId}`, transfer)
  await db.put("counter:transfer", nextId)
  
  return transfer
}

/**
 * Get transfer by ID
 */
export async function getTransferById(transferId) {
  const db = getLogisticsDb()
  const transfer = await db.get(`transfer:${transferId}`)
  
  if (!transfer) {
    throw new Error(`Transfer ${transferId} not found`)
  }
  
  return transfer
}

/**
 * Update transfer status
 */
export async function updateTransferStatus(transferId, newStatus) {
  const db = getLogisticsDb()
  const transfer = await getTransferById(transferId)
  
  transfer.status = newStatus
  transfer.updatedAt = getTimestamp()
  
  if (newStatus === "delivered") {
    transfer.deliveredDate = getTimestamp()
  }
  
  await db.put(`transfer:${transferId}`, transfer)
  return transfer
}

/**
 * List transfers with optional filtering
 */
export async function listTransfers(filters = {}, offset = 0, limit = 50) {
  const db = getLogisticsDb()
  const allEntries = await db.all()
  
  let transfers = allEntries
    .filter(entry => entry.key.startsWith("transfer:"))
    .map(entry => entry.value)
  
  // Apply filters
  if (filters.sourceStoreId) {
    transfers = transfers.filter(t => t.sourceStoreId === filters.sourceStoreId)
  }
  if (filters.destStoreId) {
    transfers = transfers.filter(t => t.destStoreId === filters.destStoreId)
  }
  if (filters.storeId) {
    // Either source or destination
    transfers = transfers.filter(t => t.sourceStoreId === filters.storeId || t.destStoreId === filters.storeId)
  }
  if (filters.status) {
    transfers = transfers.filter(t => t.status === filters.status)
  }
  if (filters.region) {
    // This would require store lookup - for now, store in transfer
    // In future, could join with stores-db
  }
  
  // Sort by creation date
  transfers = transfers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  
  const paginatedTransfers = transfers.slice(offset, offset + limit)
  
  return {
    count: transfers.length,
    data: paginatedTransfers
  }
}

/**
 * Create delivery assignment
 */
export async function createDeliveryAssignment(data) {
  const db = getLogisticsDb()
  
  if (!data.transferId || !data.driverId) {
    throw new Error("Missing required fields: transferId, driverId")
  }
  
  // Get next assignment ID
  let counterEntry = await db.get("counter:assignment")
  let nextId = 1
  
  if (counterEntry) {
    nextId = counterEntry + 1
  }
  
  const assignment = {
    assignmentId: nextId,
    transferId: data.transferId,
    driverId: data.driverId,
    vehicle: data.vehicle || null,
    status: data.status || "scheduled",
    estimatedArrival: data.estimatedArrival || null,
    actualArrival: null,
    constraints: data.constraints || {
      maxWeight: 100,
      maxVolume: 50
    },
    createdBy: data.createdBy || null,
    createdAt: getTimestamp()
  }
  
  await db.put(`assignment:${nextId}`, assignment)
  await db.put("counter:assignment", nextId)
  
  return assignment
}

/**
 * Get delivery assignment by ID
 */
export async function getAssignmentById(assignmentId) {
  const db = getLogisticsDb()
  const assignment = await db.get(`assignment:${assignmentId}`)
  
  if (!assignment) {
    throw new Error(`Assignment ${assignmentId} not found`)
  }
  
  return assignment
}

/**
 * Update delivery assignment
 */
export async function updateAssignment(assignmentId, updates) {
  const db = getLogisticsDb()
  const assignment = await getAssignmentById(assignmentId)
  
  const updated = {
    ...assignment,
    ...updates
  }
  
  if (updates.status === "delivered") {
    updated.actualArrival = getTimestamp()
  }
  
  await db.put(`assignment:${assignmentId}`, updated)
  return updated
}

/**
 * List delivery assignments with optional filtering
 */
export async function listAssignments(filters = {}, offset = 0, limit = 50) {
  const db = getLogisticsDb()
  const allEntries = await db.all()
  
  let assignments = allEntries
    .filter(entry => entry.key.startsWith("assignment:"))
    .map(entry => entry.value)
  
  // Apply filters
  if (filters.transferId) {
    assignments = assignments.filter(a => a.transferId === filters.transferId)
  }
  if (filters.status) {
    assignments = assignments.filter(a => a.status === filters.status)
  }
  if (filters.driverId) {
    assignments = assignments.filter(a => a.driverId === filters.driverId)
  }
  
  // Sort by creation date
  assignments = assignments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  
  const paginatedAssignments = assignments.slice(offset, offset + limit)
  
  return {
    count: assignments.length,
    data: paginatedAssignments
  }
}
