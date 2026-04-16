// peer-node.js – Run after bootstrap: PORT=3001 node peer-node.js
//
// This peer node:
//   1. Reads peer-info.json written by the bootstrap node
//   2. Dials the bootstrap node automatically on startup
//   3. Opens all 8 databases – replication is automatic via gossipsub
//   4. Exposes a full REST API with middleware stack

import express from "express"
import dotenv from "dotenv"
import { createHelia } from "helia"
import { createLibp2p } from "libp2p"
import { tcp } from "@libp2p/tcp"
import { noise } from "@chainsafe/libp2p-noise"
import { yamux } from "@chainsafe/libp2p-yamux"
import { gossipsub } from "@chainsafe/libp2p-gossipsub"
import { identify } from "@libp2p/identify"
import { LevelBlockstore } from "blockstore-level"
import { LevelDatastore } from "datastore-level"
import { createOrbitDB } from "@orbitdb/core"
import { multiaddr } from "@multiformats/multiaddr"
import fs from "fs"
import { initializeOrbitDB, getAllDatabaseInfo } from "./src/utils/db.js"
import { errorHandler } from "./src/middleware/errorHandler.js"
import { authenticate, requireAdmin, optionalAuth } from "./src/middleware/auth.js"
import authRoutes from "./src/routes/auth.js"
import userRoutes from "./src/routes/users.js"
import preferenceRoutes from "./src/routes/preferences.js"
import drinkRoutes from "./src/routes/drinks.js"
import orderRoutes from "./src/routes/orders.js"
import inventoryRoutes from "./src/routes/inventory.js"
import notificationRoutes from "./src/routes/notifications.js"
import revenueRoutes from "./src/routes/revenues.js"
import paymentRoutes from "./src/routes/payments.js"
import stripeRoutes from "./src/routes/stripe.js"
import qrcodeRoutes from "./src/routes/qrcodes.js"
import storeRoutes from "./src/routes/stores.js"
import maintenanceRoutes from "./src/routes/maintenance.js"
import logisticsRoutes from "./src/routes/logistics.js"
import adminRoutes from "./src/routes/admin.js"
import * as stripeService from "./src/services/stripeService.js"
import { readPeerInfo } from "./src/utils/gcs.js"

const HTTP_PORT = parseInt(process.env.PORT || "3001")
const LIBP2P_PORT = HTTP_PORT + 1000
const REPO = `./repo-peer-${HTTP_PORT}`
const PEER_INFO_FILE = "./peer-info.json"

const app = express()

// Load local env vars (.env) for all peers (3001/3002/3003...).
dotenv.config()

// ── Middleware Stack ──────────────────────────────────────────────────────────

// Body parser
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ limit: "10mb", extended: true }))

// CORS for mobile app
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*")
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization")
  
  if (req.method === "OPTIONS") {
    return res.sendStatus(200)
  }
  next()
})

// Normalize trailing slashes - remove trailing slash for matching but keep query params
app.use((req, res, next) => {
  if (req.path.length > 1 && req.path.endsWith('/')) {
    const baseUrl = req.baseUrl || req.path
    const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''
    req.url = baseUrl.slice(0, -1) + queryString
  }
  next()
})

// Request logging
app.use((req, res, next) => {
  const startTime = Date.now()
  res.on("finish", () => {
    const duration = Date.now() - startTime
    console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`)
  })
  next()
})

// ── Startup ───────────────────────────────────────────────────────────────────

let libp2p = null
let orbitdb = null

async function start() {
  console.log(`\n[ ^ ] Starting CodePop Peer Node (port ${HTTP_PORT})...\n`)

  try {
    // ── Read bootstrap peer info ──────────────────────────────────────────────
    const bootstrapInfo = await readPeerInfo()
    console.log("[ ^ ] Read bootstrap info from GSC")

    console.log(`  Bootstrap DB addresses:`)
    Object.entries(bootstrapInfo.dbAddresses).forEach(([key, addr]) => {
      console.log(`    ${key}: ${addr.substring(0, 50)}...`)
    })
    console.log()

    // ── Build this peer's libp2p + Helia stack ────────────────────────────────
    console.log("[ ^ ] Initializing blockstore and datastore...")
    const blockstore = new LevelBlockstore(`${REPO}/blocks`)
    const datastore = new LevelDatastore(`${REPO}/data`)
    await blockstore.open()
    await datastore.open()
    console.log("[ ^ ] Blockstore and datastore initialized")

    console.log("[ ^ ] Setting up libp2p networking...")
    libp2p = await createLibp2p({
      addresses: { listen: [`/ip4/0.0.0.0/tcp/${LIBP2P_PORT}`] },
      transports: [tcp()],
      connectionEncryption: [noise()],
      streamMuxers: [yamux()],
      services: {
        pubsub: gossipsub({ allowPublishToZeroTopicPeers: true }),
        identify: identify(),
      },
    })
    console.log("[ ^ ] libp2p configured")

    console.log("[ ^ ] Initializing Helia and OrbitDB...")
    const helia = await createHelia({ libp2p, blockstore, datastore })
    orbitdb = await createOrbitDB({ ipfs: helia, directory: `${REPO}/orbitdb` })
    console.log("[ ^ ] Helia and OrbitDB initialized\n")

    // ── Dial bootstrap node ───────────────────────────────────────────────────
    const BOOTSTRAP_IP = process.env.BOOTSTRAP_IP
    const bootstrapAddr = bootstrapInfo.multiaddrs.find(a => a.includes(BOOTSTRAP_IP)) ?? bootstrapInfo.multiaddrs[0]

    console.log(`[ ^ ] Dialing bootstrap: ${bootstrapAddr}`)
    try {
      await libp2p.dial(multiaddr(bootstrapAddr))
      console.log(`[ ^ ] Connected to bootstrap node`)
    } catch (err) {
      console.error(`[ X ] Failed to dial bootstrap: ${err.message}`)
      process.exit(1)
    }

    // Wait for identify to finish
    await new Promise(r => setTimeout(r, 1000))

    // ── Initialize databases ──────────────────────────────────────────────────
    console.log("[ ^ ] Opening CodePop databases...")
    await initializeOrbitDB(orbitdb, bootstrapInfo.dbAddresses)

    // Wait for initial sync
    await new Promise(r => setTimeout(r, 2000))
    console.log("[ ^ ] Databases synchronized with bootstrap\n")

    // ── Peer connection events ────────────────────────────────────────────────
    libp2p.addEventListener("peer:connect", (evt) => {
      console.log(`  [peer:connect] ${evt.detail}`)
    })

    // ── REST API Endpoints ────────────────────────────────────────────────────
    console.log("[ ^ ] Setting up REST API endpoints...\n")

    // Health check (no auth required)
    app.get("/health", (req, res) => {
      res.json({
        status: "healthy",
        nodeType: "peer",
        peerId: libp2p.peerId.toString(),
        port: HTTP_PORT,
        timestamp: new Date().toISOString()
      })
    })

    // Node info (no auth required)
    app.get("/info", (req, res) => {
      res.json({
        nodeType: "peer",
        port: HTTP_PORT,
        peerId: libp2p.peerId.toString(),
        multiaddrs: libp2p.getMultiaddrs().map(a => a.toString()),
        connectedPeers: libp2p.getPeers().map(p => p.toString()),
        databases: getAllDatabaseInfo(),
        timestamp: new Date().toISOString()
      })
    })

    // ── Mount Route Handlers ──────────────────────────────────────────────────
    app.use("/backend/auth", authRoutes)
    app.use("/backend/users", userRoutes)
    app.use("/backend/preferences", preferenceRoutes)
    app.use("/backend/drinks", drinkRoutes)
    app.use("/backend/orders", orderRoutes)
    app.use("/backend/inventory", inventoryRoutes)
    app.use("/backend/notifications", notificationRoutes)
    app.use("/backend/revenues", revenueRoutes)
    app.use("/backend/payments", paymentRoutes)
    app.use("/backend/stripe", stripeRoutes)
    app.use("/backend/qrcodes", qrcodeRoutes)
    app.use("/backend/stores", storeRoutes)
    app.use("/backend/maintenance", maintenanceRoutes)
    app.use("/backend/logistics", logisticsRoutes)
    app.use("/backend/admin", adminRoutes)

    // ── Additional standalone endpoints ────────────────────────────────────────
    
    // POST /backend/create-payment-intent - Legacy endpoint used by older mobile code
    // Prefer: POST /backend/stripe/payment-sheet (creates PI tied to an orderId).
    app.post("/backend/create-payment-intent", optionalAuth, async (req, res) => {
      try {
        const { amount } = req.body
        
        if (!amount || amount <= 0) {
          return res.status(400).json({
            error: "Invalid amount",
            code: "VALIDATION_ERROR",
            details: "Amount must be a positive number"
          })
        }

        // Real Stripe TEST-mode intent (no real money).
        // This legacy endpoint cannot safely attach to an order, so we omit order metadata.
        const sheet = await stripeService.createPaymentSheetIntent({
          amountDollars: Number(amount),
          orderId: `legacy_${Date.now()}`,
          userId: req.user?.userId ?? null,
        })

        res.json({
          paymentIntent: sheet.paymentIntentClientSecret,
          paymentIntentId: sheet.paymentIntentId,
          ephemeralKey: sheet.ephemeralKeySecret,
          customer: sheet.customerId,
        })
      } catch (error) {
        console.error("Error creating payment intent:", error)
        res.status(500).json({
          error: "Failed to create payment intent",
          code: "PAYMENT_ERROR"
        })
      }
    })
    
     // GET /backend/generate - Generate random drink (public endpoint, no authentication required)
     app.get("/backend/generate", (req, res) => {
       try {
         // Return a random AI-generated drink with complete information
         // Valid sizes: 16oz, 24oz, 32oz
         const drinks = [
           { name: "Tropical Sunrise", syrupsUsed: ["Mango", "Orange"], sodaUsed: ["Sprite"], addIns: ["Lime"], price: 3.50, size: "24oz", ice: "regular" },
           { name: "Berry Blast", syrupsUsed: ["Strawberry", "Blueberry"], sodaUsed: ["Lemonade"], addIns: ["Mint"], price: 3.75, size: "16oz", ice: "light" },
           { name: "Vanilla Sky", syrupsUsed: ["Vanilla"], sodaUsed: ["Ginger Ale"], addIns: ["Whipped Cream"], price: 3.25, size: "24oz", ice: "regular" },
           { name: "Cherry Cola Dream", syrupsUsed: ["Cherry"], sodaUsed: ["Cola"], addIns: ["Vanilla"], price: 3.50, size: "32oz", ice: "extra" },
           { name: "Citrus Punch", syrupsUsed: ["Lemon", "Lime"], sodaUsed: ["Sprite"], addIns: ["Mint"], price: 3.50, size: "24oz", ice: "regular" }
         ]
         
         const randomDrink = drinks[Math.floor(Math.random() * drinks.length)]
         res.json(randomDrink)
       } catch (error) {
         console.error("Error generating drink:", error)
         res.status(500).json({
           error: "Failed to generate drink",
           code: "GENERATION_ERROR"
         })
       }
     })
    
     // GET /backend/generate/:userId - Generate user-specific AI drink
     app.get("/backend/generate/:userId", authenticate, (req, res) => {
       try {
         const userId = req.params.userId
         
         // Return a random AI-generated drink based on user preferences with complete information
         // Valid sizes: 16oz, 24oz, 32oz
         const drinks = [
           { name: "Tropical Sunrise", syrupsUsed: ["Mango", "Orange"], sodaUsed: ["Sprite"], addIns: ["Lime"], price: 3.50, size: "24oz", ice: "regular" },
           { name: "Berry Blast", syrupsUsed: ["Strawberry", "Blueberry"], sodaUsed: ["Lemonade"], addIns: ["Mint"], price: 3.75, size: "16oz", ice: "light" },
           { name: "Vanilla Sky", syrupsUsed: ["Vanilla"], sodaUsed: ["Ginger Ale"], addIns: ["Whipped Cream"], price: 3.25, size: "24oz", ice: "regular" },
           { name: "Cherry Cola Dream", syrupsUsed: ["Cherry"], sodaUsed: ["Cola"], addIns: ["Vanilla"], price: 3.50, size: "32oz", ice: "extra" },
           { name: "Citrus Punch", syrupsUsed: ["Lemon", "Lime"], sodaUsed: ["Sprite"], addIns: ["Mint"], price: 3.50, size: "24oz", ice: "regular" }
         ]
         
         const randomDrink = drinks[Math.floor(Math.random() * drinks.length)]
         res.json(randomDrink)
       } catch (error) {
         console.error("Error generating user-specific drink:", error)
         res.status(500).json({
           error: "Failed to generate drink",
           code: "GENERATION_ERROR"
         })
      }
    })
    
    // POST /backend/chatbot - Support chatbot endpoint (guest-friendly)
    app.post("/backend/chatbot", optionalAuth, (req, res) => {
      try {
        const { message, refund_phase, wrong_drink_phase, order_num, drink_nums } = req.body
        const userId = req.user?.userId ?? null
        
        if (!message) {
          return res.status(400).json({
            error: "Message is required",
            code: "VALIDATION_ERROR"
          })
        }
        
        const normalizedMessage = String(message ?? "").trim()
        const m = normalizedMessage.toLowerCase()

        const asPhase = (v) => {
          if (v == null) return "none"
          const s = String(v).trim().toLowerCase()
          return s === "" ? "none" : s
        }

        const extractFirstInt = (text) => {
          const match = String(text ?? "").match(/\b(\d{1,10})\b/)
          return match ? parseInt(match[1], 10) : null
        }

        const parseYesNo = (text) => {
          const t = String(text ?? "").toLowerCase()
          if (/\b(yes|yep|yeah|y|ok|okay|sure|refund|refunded)\b/.test(t)) return "yes"
          if (/\b(no|nope|nah|n)\b/.test(t)) return "no"
          return null
        }

        const wantsRefund = /\b(refund|money back|return)\b/.test(m)
        const wantsRemake = /\b(remake|redo|replace|new drink|re-make)\b/.test(m)
        const saysWrongDrink = /\b(wrong drink|wrong|not mine|not what i ordered|mixed up)\b/.test(m)

        let nextRefundPhase = asPhase(refund_phase)
        let nextWrongDrinkPhase = asPhase(wrong_drink_phase)
        let nextOrderNum = order_num ?? "none"
        let nextDrinkNums = drink_nums ?? "none"

        // If user types a clear intent anytime, route them there.
        if (wantsRefund && nextRefundPhase === "none" && nextWrongDrinkPhase === "none") {
          nextRefundPhase = "start"
        }
        if ((saysWrongDrink || wantsRemake) && nextRefundPhase === "none" && nextWrongDrinkPhase === "none") {
          nextWrongDrinkPhase = "start"
        }

        // Main conversation: refund flow
        let response = ""
        if (nextRefundPhase !== "none") {
          if (nextRefundPhase === "start") {
            response =
              "I can help with a refund. What is your order number? (Just type the number.)"
            nextRefundPhase = "await_order_num"
          } else if (nextRefundPhase === "await_order_num") {
            const parsed = extractFirstInt(normalizedMessage)
            if (!parsed) {
              response = "Please send just your order number (for example: 12)."
            } else {
              nextOrderNum = String(parsed)
              response =
                `Got it—order #${parsed}. What went wrong?\n- wrong drink\n- missing item\n- other`
              nextRefundPhase = "await_reason"
            }
          } else if (nextRefundPhase === "await_reason") {
            if (/\bwrong\b/.test(m)) {
              response =
                "Sorry about that. Do you want a remake or a refund? (type: remake or refund)"
              nextRefundPhase = "await_remake_or_refund"
            } else {
              response =
                "Thanks—do you want a refund for the whole order or just specific drinks? (type: whole or drinks)"
              nextRefundPhase = "await_scope"
            }
          } else if (nextRefundPhase === "await_scope") {
            if (/\bwhole\b/.test(m)) {
              response =
                "Understood. We’ll start processing a full refund. If you have any extra details, type them now."
              nextRefundPhase = "done"
            } else if (/\b(drink|drinks|item|items|specific)\b/.test(m)) {
              response =
                "Which drink number(s) from the order should we refund? (example: 1 or 1,2)"
              nextRefundPhase = "await_drink_nums"
            } else {
              response = "Please reply with: whole or drinks"
            }
          } else if (nextRefundPhase === "await_drink_nums") {
            const nums = normalizedMessage.replace(/[^\d, ]/g, "").trim()
            const hasDigit = /\d/.test(nums)
            if (!hasDigit) {
              response = "Please provide drink number(s), like: 1 or 1,2"
            } else {
              nextDrinkNums = nums
              response =
                "Thanks. We’ll process the refund for those drinks soon. Anything else you want to add?"
              nextRefundPhase = "done"
            }
          } else if (nextRefundPhase === "await_remake_or_refund") {
            if (wantsRemake) {
              response =
                "Okay—we can remake it. Please confirm: was the drink name on the order correct? (yes/no)"
              nextRefundPhase = "await_name_confirm"
            } else if (wantsRefund) {
              response =
                "Understood—we’ll start processing your refund soon. If you have any extra details, type them now."
              nextRefundPhase = "done"
            } else {
              response = "Please type: remake or refund"
            }
          } else if (nextRefundPhase === "await_name_confirm") {
            const yn = parseYesNo(normalizedMessage)
            if (!yn) {
              response = "Please reply yes or no."
            } else if (yn === "yes") {
              response =
                "Great. We’ll remake it and prioritize it. You’ll see an update shortly."
              nextRefundPhase = "done"
            } else {
              response =
                "No problem—what should the correct drink have been? (type the drink name)"
              nextRefundPhase = "await_correct_name"
            }
          } else if (nextRefundPhase === "await_correct_name") {
            response =
              "Thanks. We’ll remake the correct drink and prioritize it. You’ll see an update shortly."
            nextRefundPhase = "done"
          } else if (nextRefundPhase === "done") {
            response =
              "Anything else I can help with? (refund, wrong drink, or general question)"
          } else {
            // Unknown phase fallback
            response =
              "I can help with refunds or wrong drinks. What do you need today?"
            nextRefundPhase = "none"
          }
        } else if (nextWrongDrinkPhase !== "none") {
          // Wrong-drink flow (separate from refund flow)
          if (nextWrongDrinkPhase === "start") {
            response =
              "Sorry about the mix-up. What is your order number? (Just type the number.)"
            nextWrongDrinkPhase = "await_order_num"
          } else if (nextWrongDrinkPhase === "await_order_num") {
            const parsed = extractFirstInt(normalizedMessage)
            if (!parsed) {
              response = "Please send just your order number (for example: 12)."
            } else {
              nextOrderNum = String(parsed)
              response =
                `Thanks—order #${parsed}. Do you want us to remake the drink or issue a refund? (remake/refund)`
              nextWrongDrinkPhase = "await_remake_or_refund"
            }
          } else if (nextWrongDrinkPhase === "await_remake_or_refund") {
            if (wantsRemake) {
              response =
                "Got it. We’ll remake your drink. Any details we should know? (ice level, size, etc.)"
              nextWrongDrinkPhase = "done"
            } else if (wantsRefund) {
              response =
                "Understood. We’ll process your refund soon. Any details you want to add?"
              nextWrongDrinkPhase = "done"
            } else {
              response = "Please type: remake or refund"
            }
          } else if (nextWrongDrinkPhase === "done") {
            response =
              "Anything else I can help with? (refund, wrong drink, or general question)"
          } else {
            response =
              "I can help with wrong drinks. What is your order number?"
            nextWrongDrinkPhase = "await_order_num"
          }
        } else {
          response =
            "Hi—I’m Bob from support. Are you reaching out about a wrong drink, a remake, or a refund? (type: wrong, remake, or refund)"
        }
        
        res.json({
          status: "success",
          response: response,
          orderId: order_num,
          userId,
          refund_phase: nextRefundPhase,
          wrong_drink_phase: nextWrongDrinkPhase,
          order_num: nextOrderNum,
          drink_nums: nextDrinkNums,
          timestamp: new Date().toISOString()
        })
      } catch (error) {
        console.error("Error processing chatbot message:", error)
        res.status(500).json({
          error: "Failed to process chatbot message",
          code: "CHATBOT_ERROR"
        })
      }
    })
    
    // GET /backend/email/:orderNum - Send order confirmation email (public endpoint, no authentication required)
    app.get("/backend/email/:orderNum", (req, res) => {
      try {
        const orderNum = req.params.orderNum
        
        if (!orderNum) {
          return res.status(400).json({
            error: "Order number is required",
            code: "VALIDATION_ERROR"
          })
        }
        
        // Send email confirmation (mock implementation)
        res.json({
          status: "success",
          message: "Confirmation email sent",
          orderId: orderNum,
          timestamp: new Date().toISOString()
        })
      } catch (error) {
        console.error("Error sending email:", error)
        res.status(500).json({
          error: "Failed to send email",
          code: "EMAIL_ERROR"
        })
      }
    })

    // ── Test endpoints (direct database access) ────────────────────────────────
    app.get("/test/users/get/:key", authenticate, (req, res) => {
      res.json({
        message: "Test endpoint for getting users",
        key: req.params.key
      })
    })

    // ── Health check at root ──────────────────────────────────────────────────
    app.get("/", (req, res) => {
      res.json({
        name: "CodePop OrbitDB Backend",
        version: "1.0.0-beta",
        nodeType: "peer",
        port: HTTP_PORT,
        status: "running"
      })
    })

    // ── Error handler (must be last) ──────────────────────────────────────────
    app.use(errorHandler)

    // ── Start HTTP server ────────────────────────────────────────────────────
    app.listen(HTTP_PORT, () => {
      console.log(`[ ^ ] Peer node is ready!`)
      console.log(`   HTTP API: http://localhost:${HTTP_PORT}`)
      console.log(`   libp2p: /ip4/0.0.0.0/tcp/${LIBP2P_PORT}`)
      console.log(`\n[ ^ ] API Endpoints:`)
      console.log(`   GET  /health              - Health check`)
      console.log(`   GET  /info                - Node info`)
      console.log(`   GET  /                    - Server info`)
      console.log(`\n[ ^ ] Authentication:`)
      console.log(`   Use Authorization header: Token {tokenKey}`)
      console.log(`\n[ ^ ] All routes mounted and ready`)
      console.log(`   - Auth & Users`)
      console.log(`   - Preferences`)
      console.log(`   - Drinks`)
      console.log(`   - Orders (store-scoped)`)
      console.log(`   - Inventory (store-scoped)`)
      console.log(`   - Notifications (with reorder alerts)`)
      console.log(`   - Revenues`)
      console.log(`   - Payments`)
      console.log(`   - QR Codes`)
      console.log(`   - Stores Management`)
      console.log(`   - Maintenance & Machines`)
      console.log(`   - Logistics & Transfers`)
      console.log(`   - Admin Reports\n`)
    })

  } catch (err) {
    console.error("[ X ] Fatal error:", err)
    process.exit(1)
  }
}

// ── Graceful shutdown ─────────────────────────────────────────────────────────

process.on("SIGINT", async () => {
  console.log("\n\n[ ^ ] Shutting down peer node...")
  if (libp2p) {
    try {
      await libp2p.stop()
    } catch (err) {
      console.error("Error stopping libp2p:", err)
    }
  }
  process.exit(0)
})

start().catch(console.error)
