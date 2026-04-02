// src/routes/users.js
// User management routes (admin only)

import express from "express"
import { asyncHandler, ApiError, ForbiddenError } from "../middleware/errorHandler.js"
import { authenticate, requireAdmin } from "../middleware/auth.js"
import { getUserById, updateUser, deleteUser, listUsers } from "../services/authService.js"

const router = express.Router()

/**
 * GET /backend/users/
 * List all users (admin only)
 */
router.get(
  "/",
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit || "100"), 1000)
    const users = await listUsers(limit)

    res.json({
      status: "success",
      count: users.length,
      data: users
    })
  })
)

/**
 * GET /backend/users/:userId
 * Get specific user by ID (admin only)
 */
router.get(
  "/:userId",
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const userId = parseInt(req.params.userId, 10)
    if (isNaN(userId)) {
      throw new ApiError("Invalid user ID", 400)
    }

    const user = await getUserById(userId)

    res.json({
      status: "success",
      data: user
    })
  })
)

/**
 * PUT /backend/users/edit/:userId
 * Update user (admin only)
 */
router.put(
  "/edit/:userId",
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const userId = parseInt(req.params.userId, 10)
    if (isNaN(userId)) {
      throw new ApiError("Invalid user ID", 400)
    }

    const { firstName, lastName, email, role } = req.body
    console.log(req.body)
    const updates = {}

    if (firstName !== undefined) updates.firstName = firstName
    if (lastName !== undefined) updates.lastName = lastName
    if (email !== undefined) updates.email = email
    if (role !== undefined) updates.role = role
    const user = await updateUser(userId, updates)

    res.json({
      status: "updated",
      data: user
    })
  })
)

/**
 * DELETE /backend/users/delete/:userId
 * Delete user (admin only)
 */
router.delete(
  "/delete/:userId",
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const userId = parseInt(req.params.userId, 10)
    if (isNaN(userId)) {
      throw new ApiError("Invalid user ID", 400)
    }

    // Prevent admin from deleting themselves
    if (userId === req.user.userId) {
      throw new ForbiddenError("Cannot delete your own account")
    }

    await deleteUser(userId)

    res.json({
      status: "deleted",
      message: "User has been deleted"
    })
  })
)

export default router
