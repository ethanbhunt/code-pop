// src/services/preferenceService.js
// User drink preferences service

import { getPreferencesDb, getNextId, getTimestamp } from "../utils/db.js"
import { validatePreference, validatePreferenceType, validateSweetness, validateTemperature } from "../utils/validation.js"

/**
 * Create a new user preference
 * @param {string} userId - User ID
 * @param {string} preference - Preference value (drink, syrup, ingredient, etc.)
 * @param {string} preferenceType - Type: 'favorite', 'allergic', 'dislike', 'recommended', 'ingredient_preference'
 * @param {string} sweetness - Optional: 'low', 'medium', 'high'
 * @param {string} temperature - Optional: 'hot', 'cold', 'iced'
 * @param {string} ingredientName - Optional: for ingredient_preference type
 */
export async function createPreference(userId, preference, preferenceType = "favorite", sweetness = null, temperature = null, ingredientName = null) {
  if (!userId || !preference) {
    throw new Error("User ID and preference are required")
  }

  if (!validatePreference(preference)) {
    throw new Error("Invalid preference value")
  }

  if (!validatePreferenceType(preferenceType)) {
    throw new Error("Invalid preference type")
  }

  if (sweetness && !validateSweetness(sweetness)) {
    throw new Error("Invalid sweetness level")
  }

  if (temperature && !validateTemperature(temperature)) {
    throw new Error("Invalid temperature")
  }

  const preferencesDb = getPreferencesDb()
  const preferenceId = await getNextId(preferencesDb, "preference")

  const prefObject = {
    preferenceId,
    userId,
    preference: preference.toLowerCase(),
    preferenceType: preferenceType.toLowerCase(),
    sweetness: sweetness ? sweetness.toLowerCase() : null,
    temperature: temperature ? temperature.toLowerCase() : null,
    ingredientName: ingredientName ? ingredientName.toLowerCase() : null,
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
export async function updatePreference(preferenceId, updates) {
  const preferencesDb = getPreferencesDb()
  const pref = await preferencesDb.get(`preference:${preferenceId}`)

  if (!pref) {
    throw new Error("Preference not found")
  }

  if (updates.preference !== undefined) {
    if (!validatePreference(updates.preference)) {
      throw new Error("Invalid preference value")
    }
    pref.preference = updates.preference.toLowerCase()
  }

  if (updates.preferenceType !== undefined) {
    if (!validatePreferenceType(updates.preferenceType)) {
      throw new Error("Invalid preference type")
    }
    pref.preferenceType = updates.preferenceType.toLowerCase()
  }

  if (updates.sweetness !== undefined) {
    if (updates.sweetness && !validateSweetness(updates.sweetness)) {
      throw new Error("Invalid sweetness level")
    }
    pref.sweetness = updates.sweetness ? updates.sweetness.toLowerCase() : null
  }

  if (updates.temperature !== undefined) {
    if (updates.temperature && !validateTemperature(updates.temperature)) {
      throw new Error("Invalid temperature")
    }
    pref.temperature = updates.temperature ? updates.temperature.toLowerCase() : null
  }

  if (updates.ingredientName !== undefined) {
    pref.ingredientName = updates.ingredientName ? updates.ingredientName.toLowerCase() : null
  }

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
