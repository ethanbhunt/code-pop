// src/routes/auth.js
// Authentication routes: register, login, logout

import express from "express"
import { asyncHandler, ApiError, ValidationError } from "../middleware/errorHandler.js"
import { authenticate } from "../middleware/auth.js"
import {
  registerUser,
  loginUser,
  logoutUser,
  getUserById,
  updateUser,
  deleteUser,
  listUsers
} from "../services/authService.js"
import { validateRequiredFields } from "../utils/validation.js"

const router = express.Router()

/**
 * POST /backend/auth/register
 * Register a new user
 */
router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const { username, password, email, firstName, lastName } = req.body

    // Validate required fields
    const missing = validateRequiredFields(req.body, ["username", "password", "email"])
    if (missing.length > 0) {
      throw new ValidationError(`Missing required fields: ${missing.join(", ")}`)
    }

    const user = await registerUser(username, password, email, firstName || "", lastName || "")

    res.status(201).json({
      status: "created",
      data: user
    })
  })
)

/**
 * POST /backend/auth/login
 * Login user and get token
 */
router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { username, password } = req.body

    const missing = validateRequiredFields(req.body, ["username", "password"])
    if (missing.length > 0) {
      throw new ValidationError(`Missing required fields: ${missing.join(", ")}`)
    }

    const user = await loginUser(username, password)

    res.json({
      status: "authenticated",
      data: user
    })
  })
)

/**
 * POST /backend/auth/logout
 * Logout user and invalidate token
 * Requires: Authentication header
 */
router.post(
  "/logout",
  authenticate,
  asyncHandler(async (req, res) => {
    const tokenKey = req.token

    if (!tokenKey) {
      throw new ApiError("Token not found in request", 401)
    }

    await logoutUser(tokenKey)

    res.json({
      status: "logged_out",
      message: "Successfully logged out"
    })
  })
)

/**
 * GET /backend/auth/me
 * Get current authenticated user
 * Requires: Authentication header
 */
router.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await getUserById(req.user.userId)

    res.json({
      status: "success",
      data: user
    })
  })
)

/**
 * PUT /backend/auth/me
 * Update current authenticated user profile
 * Requires: Authentication header
 */
router.put(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    const { firstName, lastName, email } = req.body
    const userId = req.user.userId

    const updates = {}
    if (firstName !== undefined) updates.firstName = firstName
    if (lastName !== undefined) updates.lastName = lastName
    if (email !== undefined) updates.email = email

    if (Object.keys(updates).length === 0) {
      throw new ValidationError("No fields to update")
    }

    const user = await updateUser(userId, updates)

    res.json({
      status: "updated",
      data: user
    })
  })
)

/**
 * DELETE /backend/auth/me
 * Delete current authenticated user account
 * Requires: Authentication header
 */
router.delete(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user.userId

    await deleteUser(userId)

    res.json({
      status: "deleted",
      message: "User account has been deleted"
    })
  })
)

export default router
