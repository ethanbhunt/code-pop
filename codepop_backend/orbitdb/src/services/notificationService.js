// src/services/notificationService.js
// Notifications service

import { getNotificationsDb, getNextId, getTimestamp } from "../utils/db.js"

export async function createNotification(userId, message, type, global = false) {
  if (!message || !type) {
    throw new Error("Message and type are required")
  }

  const notificationsDb = getNotificationsDb()
  const notificationId = await getNextId(notificationsDb, "notification")

  const notification = {
    notificationId,
    userId: global ? null : userId,
    message,
    timestamp: getTimestamp(),
    type,
    global: Boolean(global)
  }

  await notificationsDb.put(`notification:${notificationId}`, notification)
  return notification
}

export async function getNotificationById(notificationId) {
  const notificationsDb = getNotificationsDb()
  const notification = await notificationsDb.get(`notification:${notificationId}`)
  if (!notification) throw new Error("Notification not found")
  return notification
}

export async function getUserNotifications(userId) {
  const notificationsDb = getNotificationsDb()
  const allNotifications = await notificationsDb.all()
  const notifications = []

  for (const entry of allNotifications) {
    const notif = entry.value
    if (notif && notif.notificationId) {
      // Include user-specific and global notifications
      if (notif.userId === userId || notif.global) {
        notifications.push(notif)
      }
    }
  }

  return notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
}

export async function listAllNotifications(limit = 100) {
  const notificationsDb = getNotificationsDb()
  const allNotifications = await notificationsDb.all()
  const notifications = []

  for (const entry of allNotifications) {
    const notification = entry.value
    if (notification && notification.notificationId) {
      notifications.push(notification)
    }
    if (notifications.length >= limit) break
  }

  return notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
}

export async function filterNotificationsByTimeRange(startTime, endTime) {
  const notificationsDb = getNotificationsDb()
  const allNotifications = await notificationsDb.all()
  const start = new Date(startTime).getTime()
  const end = new Date(endTime).getTime()
  const filtered = []

  for (const entry of allNotifications) {
    const notif = entry.value
    if (notif && notif.notificationId) {
      const notifTime = new Date(notif.timestamp).getTime()
      if (notifTime >= start && notifTime <= end) {
        filtered.push(notif)
      }
    }
  }

  return filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
}

export async function updateNotification(notificationId, updates) {
  const notificationsDb = getNotificationsDb()
  const notification = await notificationsDb.get(`notification:${notificationId}`)
  if (!notification) throw new Error("Notification not found")

  if (updates.message) notification.message = updates.message
  if (updates.type) notification.type = updates.type

  await notificationsDb.put(`notification:${notificationId}`, notification)
  return notification
}

export async function deleteNotification(notificationId) {
  const notificationsDb = getNotificationsDb()
  const notification = await notificationsDb.get(`notification:${notificationId}`)
  if (!notification) throw new Error("Notification not found")
  await notificationsDb.del(`notification:${notificationId}`)
  return true
}

export async function deleteUserNotifications(userId) {
  const notificationsDb = getNotificationsDb()
  const allNotifications = await notificationsDb.all()
  let count = 0

  for (const entry of allNotifications) {
    const notif = entry.value
    if (notif && notif.userId === userId) {
      await notificationsDb.del(entry.key)
      count++
    }
  }

  return count
}
