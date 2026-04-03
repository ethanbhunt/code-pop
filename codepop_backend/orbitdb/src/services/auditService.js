// src/services/auditService.js
// Audit logging for inventory and operational changes

import { getAuditLogsDb, getNextId, getTimestamp } from "../utils/db.js"

export async function recordAuditLog({
  entityType,
  entityId,
  action,
  actorUserId = null,
  actorRole = null,
  storeId = null,
  beforeValue = null,
  afterValue = null,
  reason = null,
}) {
  const db = getAuditLogsDb()
  const auditLogId = await getNextId(db, "auditLog")

  const auditLog = {
    auditLogId,
    entityType,
    entityId,
    action,
    actorUserId,
    actorRole,
    storeId,
    beforeValue,
    afterValue,
    reason,
    createdAt: getTimestamp(),
  }

  await db.put(`auditLog:${auditLogId}`, auditLog)
  return auditLog
}

export async function listAuditLogs({ storeId = null, entityType = null, offset = 0, limit = 100 } = {}) {
  const db = getAuditLogsDb()
  const allEntries = await db.all()

  let logs = allEntries
    .filter((entry) => entry.key.startsWith("auditLog:"))
    .map((entry) => entry.value)

  if (Number.isFinite(storeId)) {
    logs = logs.filter((log) => log.storeId === storeId)
  }

  if (entityType) {
    logs = logs.filter((log) => log.entityType === entityType)
  }

  logs = logs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  const paginatedLogs = logs.slice(offset, offset + limit)

  return {
    count: logs.length,
    data: paginatedLogs,
  }
}