// src/services/preferenceService.js
// User drink preferences service

import { getPreferencesDb, getNextId, getTimestamp } from "../utils/db.js"
import { validatePreference } from "../utils/validation.js"

/**
 * Create a new user preference
 */
export async function createPreference(userId, preference) {
  if (!userId || !preference) {
    throw new Error("User ID and preference are required")
  }

  if (!validatePreference(preference)) {
    throw new Error("Invalid preference value")
  }

  const preferencesDb = getPreferencesDb()
  const preferenceId = await getNextId(preferencesDb, "preference")

  const prefObject = {
    preferenceId,
    userId,
    preference: preference.toLowerCase(),
    createdAt: getTimestamp()
  }

  await preferencesDb.put(`preference:${preferenceId}`, prefObject)

  return prefObject
}

/**
 * Get preference by ID
 */
export async function getPreferenceById(preferenceId) {
  const preferencesDb = getPreferencesDb()
  const pref = await preferencesDb.get(`preference:${preferenceId}`)

  if (!pref) {
    throw new Error("Preference not found")
  }

  return pref
}

/**
 * Get all preferences for a user
 */
export async function getUserPreferences(userId) {
  if (!userId) {
    throw new Error("User ID is required")
  }

  const preferencesDb = getPreferencesDb()
  const allPrefs = await preferencesDb.all()

  const userPrefs = []
  for (const entry of allPrefs) {
    const pref = entry.value
    if (pref && pref.userId === userId) {
      userPrefs.push(pref)
    }
  }

  return userPrefs
}

/**
 * Update a preference
 */
export async function updatePreference(preferenceId, preference) {
  const preferencesDb = getPreferencesDb()
  const pref = await preferencesDb.get(`preference:${preferenceId}`)

  if (!pref) {
    throw new Error("Preference not found")
  }

  if (!validatePreference(preference)) {
    throw new Error("Invalid preference value")
  }

  pref.preference = preference.toLowerCase()
  await preferencesDb.put(`preference:${preferenceId}`, pref)

  return pref
}

/**
 * Delete a preference
 */
export async function deletePreference(preferenceId) {
  const preferencesDb = getPreferencesDb()
  const pref = await preferencesDb.get(`preference:${preferenceId}`)

  if (!pref) {
    throw new Error("Preference not found")
  }

  await preferencesDb.del(`preference:${preferenceId}`)

  return true
}

/**
 * List all preferences (admin)
 */
export async function listAllPreferences(limit = 100) {
  const preferencesDb = getPreferencesDb()
  const allPrefs = await preferencesDb.all()

  const prefs = []
  for (const entry of allPrefs) {
    const pref = entry.value
    if (pref && pref.preferenceId) {
      prefs.push(pref)
    }
    if (prefs.length >= limit) break
  }

  return prefs
}

/**
 * Delete all preferences for a user (when user is deleted)
 */
export async function deleteUserPreferences(userId) {
  const preferencesDb = getPreferencesDb()
  const allPrefs = await preferencesDb.all()

  let count = 0
  for (const entry of allPrefs) {
    const pref = entry.value
    if (pref && pref.userId === userId) {
      await preferencesDb.del(entry.key)
      count++
    }
  }

  return count
}
