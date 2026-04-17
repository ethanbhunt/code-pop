// src/services/maintenanceService.js
// Machine and maintenance management

import { getMaintenanceDb } from "../utils/db.js"
import { getTimestamp } from "../utils/db.js"

/**
 * Create new machine
 */
export async function createMachine(data) {
  const db = getMaintenanceDb()
  
  if (!data.storeId || !data.name || !data.model) {
    throw new Error("Missing required fields: storeId, name, model")
  }
  
  // Get next machine ID
  let counterEntry = await db.get("counter:machine")
  let nextId = 1
  
  if (counterEntry) {
    nextId = counterEntry + 1
  }
  
  const machine = {
    machineId: nextId,
    storeId: data.storeId,
    name: data.name,
    model: data.model,
    status: data.status || "operational",
    lastServiceDate: data.lastServiceDate || null,
    serviceInterval: data.serviceInterval || 30,
    createdAt: getTimestamp(),
    updatedAt: getTimestamp()
  }
  
  await db.put(`machine:${nextId}`, machine)
  await db.put("counter:machine", nextId)
  
  return machine
}

/**
 * Get machine by ID
 */
export async function getMachineById(machineId) {
  const db = getMaintenanceDb()
  const machine = await db.get(`machine:${machineId}`)
  
  if (!machine) {
    throw new Error(`Machine ${machineId} not found`)
  }
  
  return machine
}

/**
 * List machines for a store
 */
export async function listMachinesByStore(storeId, offset = 0, limit = 50) {
  const db = getMaintenanceDb()
  const allEntries = await db.all()
  
  const machines = allEntries
    .filter(entry => entry.key.startsWith("machine:") && entry.value.storeId === storeId)
    .sort((a, b) => a.value.machineId - b.value.machineId)
  
  const paginatedMachines = machines.slice(offset, offset + limit)
  
  return {
    count: machines.length,
    data: paginatedMachines.map(entry => entry.value)
  }
}

/**
 * List all machines
 */
export async function listAllMachines(offset = 0, limit = 50) {
  const db = getMaintenanceDb()
  const allEntries = await db.all()
  
  const machines = allEntries
    .filter(entry => entry.key.startsWith("machine:"))
    .sort((a, b) => a.value.machineId - b.value.machineId)
  
  const paginatedMachines = machines.slice(offset, offset + limit)
  
  return {
    count: machines.length,
    data: paginatedMachines.map(entry => entry.value)
  }
}

/**
 * Machines belong to a store; repair staff see machines whose storeId is in storeIds.
 * @param {number[]} storeIds
 */
export async function getMachinesForStores(storeIds, offset = 0, limit = 50) {
  const db = getMaintenanceDb()
  const idSet = new Set(
    (storeIds ?? []).map((id) => parseInt(String(id), 10)).filter((n) => Number.isInteger(n) && n > 0)
  )
  if (idSet.size === 0) {
    return { count: 0, data: [] }
  }

  const allEntries = await db.all()

  const machines = allEntries
    .filter(
      (entry) =>
        entry.key.startsWith("machine:") && idSet.has(parseInt(String(entry.value.storeId), 10))
    )
    .sort((a, b) => a.value.machineId - b.value.machineId)

  const paginatedMachines = machines.slice(offset, offset + limit)

  return {
    count: machines.length,
    data: paginatedMachines.map((entry) => entry.value)
  }
}

/**
 * Update machine status
 */
export async function updateMachineStatus(machineId, updates) {
  const db = getMaintenanceDb()
  const machine = await getMachineById(machineId)
  
  const updated = {
    ...machine,
    ...updates,
    updatedAt: getTimestamp()
  }
  
  await db.put(`machine:${machineId}`, updated)
  return updated
}

/**
 * Record status transition with audit trail
 */
export async function recordStatusTransition(machineId, newStatus, actor, reason, notes) {
  const db = getMaintenanceDb()
  const machine = await getMachineById(machineId)
  
  const oldStatus = machine.status
  
  // Create transition record
  let counterEntry = await db.get("counter:transition")
  let nextId = 1
  
  if (counterEntry) {
    nextId = counterEntry + 1
  }
  
  const transition = {
    transitionId: nextId,
    machineId: machineId,
    oldStatus: oldStatus,
    newStatus: newStatus,
    actor: actor,
    reason: reason,
    notes: notes || "",
    timestamp: getTimestamp()
  }
  
  // Save transition
  await db.put(`transition:${nextId}`, transition)
  await db.put("counter:transition", nextId)
  
  // Update machine status
  machine.status = newStatus
  machine.updatedAt = getTimestamp()
  await db.put(`machine:${machineId}`, machine)
  
  return transition
}

/**
 * Get machine history with pagination (default 25 per page)
 */
export async function getMachineHistory(machineId, page = 1, limit = 25) {
  const db = getMaintenanceDb()
  const allEntries = await db.all()
  
  const transitions = allEntries
    .filter(entry => entry.key.startsWith("transition:") && entry.value.machineId === machineId)
    .sort((a, b) => new Date(b.value.timestamp) - new Date(a.value.timestamp))
  
  const offset = (page - 1) * limit
  const paginatedTransitions = transitions.slice(offset, offset + limit)
  
  return {
    machineId: machineId,
    page: page,
    pageSize: limit,
    totalRecords: transitions.length,
    data: paginatedTransitions.map(entry => entry.value)
  }
}

