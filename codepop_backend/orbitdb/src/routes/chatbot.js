// POST /backend/chatbot — same contract as Django customerAI.Chatbot
import express from "express"
import { asyncHandler } from "../middleware/errorHandler.js"
import { processChatbotMessage } from "../services/chatbotService.js"

const router = express.Router()

router.post("/", asyncHandler(async (req, res) => {
  const data = await processChatbotMessage(req.body || {})
  res.json(data)
}))

export default router
