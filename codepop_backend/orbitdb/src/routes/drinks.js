// src/routes/drinks.js
import express from "express"
import { asyncHandler, ApiError, ValidationError } from "../middleware/errorHandler.js"
import { authenticate } from "../middleware/auth.js"
import * as drinkService from "../services/drinkService.js"

const router = express.Router()

// GET /backend/drinks - List non-user-created drinks
router.get("/", authenticate, asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || "100"), 1000)
  const drinks = await drinkService.listMenuDrinks(limit)
  res.json({ status: "success", count: drinks.length, data: drinks })
}))

// POST /backend/drinks - Create drink
router.post("/", authenticate, asyncHandler(async (req, res) => {
  const drink = await drinkService.createDrink(req.body)
  res.status(201).json({ status: "created", data: drink })
}))

// GET /backend/drinks/:id - Get drink
router.get("/:id", authenticate, asyncHandler(async (req, res) => {
  const drink = await drinkService.getDrinkById(parseInt(req.params.id, 10))
  res.json({ status: "success", data: drink })
}))

// PUT /backend/drinks/:id - Update drink
router.put("/:id", authenticate, asyncHandler(async (req, res) => {
  const drink = await drinkService.updateDrink(parseInt(req.params.id, 10), req.body)
  res.json({ status: "updated", data: drink })
}))

// DELETE /backend/drinks/:id - Delete drink
router.delete("/:id", authenticate, asyncHandler(async (req, res) => {
  try {
    await drinkService.deleteDrink(parseInt(req.params.id, 10))
  } catch (error) {
    // Return success even if drink doesn't exist (idempotent delete)
    if (error.message === "Drink not found") {
      console.warn(`Attempted to delete non-existent drink ID: ${req.params.id}`)
      return res.json({ status: "deleted", note: "Drink not found but delete considered successful" })
    }
    throw error
  }
  res.json({ status: "deleted" })
}))

// POST /backend/drinks/:id/favorite - Add to favorites
router.post("/:id/favorite", authenticate, asyncHandler(async (req, res) => {
  const drink = await drinkService.addFavorite(parseInt(req.params.id, 10), req.user.userId)
  res.json({ status: "updated", data: drink })
}))

// DELETE /backend/drinks/:id/favorite - Remove from favorites
router.delete("/:id/favorite", authenticate, asyncHandler(async (req, res) => {
  const drink = await drinkService.removeFavorite(parseInt(req.params.id, 10), req.user.userId)
  res.json({ status: "updated", data: drink })
}))

// GET /backend/users/:userId/drinks - Get user's custom drinks
router.get("/user/:userId/drinks", authenticate, asyncHandler(async (req, res) => {
  const drinks = await drinkService.getUserDrinks(parseInt(req.params.userId, 10))
  res.json({ status: "success", count: drinks.length, data: drinks })
}))

export default router
