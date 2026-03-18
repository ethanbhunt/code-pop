// src/routes/preferences.js
// User preferences routes

import express from "express"
import { asyncHandler, ApiError, ValidationError, NotFoundError } from "../middleware/errorHandler.js"
import { authenticate } from "../middleware/auth.js"
import {
  createPreference,
  getPreferenceById,
  getUserPreferences,
  updatePreference,
  deletePreference,
  listAllPreferences
} from "../services/preferenceService.js"
import { validateRequiredFields } from "../utils/validation.js"

const router = express.Router()

/**
 * GET /backend/preferences/
 * List all preferences or user's preferences
 */
router.get(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.query.userId
    const limit = Math.min(parseInt(req.query.limit || "100"), 1000)

    let preferences
    if (userId) {
      // Get specific user's preferences
      preferences = await getUserPreferences(parseInt(userId, 10))
    } else {
      // List all (returns limited set)
      preferences = await listAllPreferences(limit)
    }

    res.json({
      status: "success",
      count: preferences.length,
      data: preferences
    })
  })
)

/**
 * POST /backend/preferences/
 * Create a new preference
 */
router.post(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const { preference, userId } = req.body

    // Use authenticated user's ID if not specified
    const targetUserId = userId || req.user.userId

    const missing = validateRequiredFields(req.body, ["preference"])
    if (missing.length > 0) {
      throw new ValidationError(`Missing required fields: ${missing.join(", ")}`)
    }

    const newPref = await createPreference(targetUserId, preference)

    res.status(201).json({
      status: "created",
      data: newPref
    })
  })
)

/**
 * GET /backend/preferences/:id
 * Get a specific preference
 */
router.get(
  "/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const preferenceId = parseInt(req.params.id, 10)
    if (isNaN(preferenceId)) {
      throw new ApiError("Invalid preference ID", 400)
    }

    const pref = await getPreferenceById(preferenceId)

    res.json({
      status: "success",
      data: pref
    })
  })
)

/**
 * PUT /backend/preferences/:id
 * Update a preference
 */
router.put(
  "/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const preferenceId = parseInt(req.params.id, 10)
    if (isNaN(preferenceId)) {
      throw new ApiError("Invalid preference ID", 400)
    }

    const { preference } = req.body

    if (!preference) {
      throw new ValidationError("Preference value is required")
    }

    const updated = await updatePreference(preferenceId, preference)

    res.json({
      status: "updated",
      data: updated
    })
  })
)

/**
 * DELETE /backend/preferences/:id
 * Delete a preference
 */
router.delete(
  "/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const preferenceId = parseInt(req.params.id, 10)
    if (isNaN(preferenceId)) {
      throw new ApiError("Invalid preference ID", 400)
    }

    await deletePreference(preferenceId)

    res.json({
      status: "deleted",
      message: "Preference has been deleted"
    })
  })
)

/**
 * GET /backend/users/:userId/preferences/
 * Get all preferences for a specific user
 */
router.get(
  "/user/:userId",
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = parseInt(req.params.userId, 10)
    if (isNaN(userId)) {
      throw new ApiError("Invalid user ID", 400)
    }

    const preferences = await getUserPreferences(userId)

    res.json({
      status: "success",
      count: preferences.length,
      data: preferences
    })
  })
)

export default router
