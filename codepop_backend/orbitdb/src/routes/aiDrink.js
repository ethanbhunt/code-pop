// Mounted at /peer-ai-drink and /backend/generate (see peer-node.js).
import express from "express"
import { asyncHandler, ApiError } from "../middleware/errorHandler.js"
import * as preferenceService from "../services/preferenceService.js"
import { runDrinkAiBridge } from "../services/drinkAiRunner.js"

const router = express.Router()

async function runAiGenerateRoot(body, method) {
  return handleGenerate(null, body || {}, method)
}

async function runAiGenerateForUser(userId, body, method) {
  return handleGenerate(userId, body || {}, method)
}

async function handleGenerate(userId, body, method) {
  if (method === "POST" && body?.prompt != null && String(body.prompt).trim()) {
    return runDrinkAiBridge({
      mode: "prompt",
      prompt: String(body.prompt).trim(),
      user_created: Boolean(userId),
    })
  }

  if (userId) {
    const prefs = await preferenceService.getUserPreferences(userId)
    const user_prefs = prefs.map((p) => p.preference).filter(Boolean)
    return runDrinkAiBridge({
      mode: "account",
      user_prefs,
      user_created: true,
    })
  }

  return runDrinkAiBridge({ mode: "general", user_created: false })
}

router.get("/", asyncHandler(async (req, res) => {
  try {
    const data = await runAiGenerateRoot({}, "GET")
    res.json(data)
  } catch (e) {
    throw new ApiError(e.message || "AI drink generation failed", 503)
  }
}))

router.post("/", asyncHandler(async (req, res) => {
  try {
    const data = await runAiGenerateRoot(req.body || {}, "POST")
    res.json(data)
  } catch (e) {
    throw new ApiError(e.message || "AI drink generation failed", 503)
  }
}))

router.get("/:userId", asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.userId, 10)
  if (Number.isNaN(userId)) {
    throw new ApiError("Invalid user id", 400)
  }
  try {
    const data = await runAiGenerateForUser(userId, {}, "GET")
    res.json(data)
  } catch (e) {
    throw new ApiError(e.message || "AI drink generation failed", 503)
  }
}))

router.post("/:userId", asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.userId, 10)
  if (Number.isNaN(userId)) {
    throw new ApiError("Invalid user id", 400)
  }
  try {
    const data = await runAiGenerateForUser(userId, req.body || {}, "POST")
    res.json(data)
  } catch (e) {
    throw new ApiError(e.message || "AI drink generation failed", 503)
  }
}))

export default router
