// peer-node.js – Run after bootstrap: PORT=3001 node peer-node.js
//
// This peer node:
//   1. Reads peer-info.json written by the bootstrap node
//   2. Dials the bootstrap node automatically on startup
//   3. Opens all 8 databases – replication is automatic via gossipsub
//   4. Exposes a full REST API with middleware stack

import express from "express"
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
import qrcodeRoutes from "./src/routes/qrcodes.js"
import storeRoutes from "./src/routes/stores.js"
import auditRoutes from "./src/routes/auditLogs.js"
import maintenanceRoutes from "./src/routes/maintenance.js"
import logisticsRoutes from "./src/routes/logistics.js"
import adminRoutes from "./src/routes/admin.js"

const HTTP_PORT = parseInt(process.env.PORT || "3001")
const LIBP2P_PORT = parseInt(process.env.LIBP2P_PORT || String(HTTP_PORT + 1000))
const REPO = process.env.ORBITDB_REPO_DIR || `./repo-peer-${HTTP_PORT}`
const PEER_INFO_FILE = process.env.ORBITDB_PEER_INFO_FILE || "./peer-info.json"

const app = express()

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
    if (!fs.existsSync(PEER_INFO_FILE)) {
      console.error(`[ X ] ${PEER_INFO_FILE} not found — start the bootstrap node first`)
      process.exit(1)
    }
    const bootstrapInfo = JSON.parse(fs.readFileSync(PEER_INFO_FILE, "utf8"))
    console.log(`[ ^ ] Read bootstrap info from ${PEER_INFO_FILE}`)
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
    const bootstrapAddr = bootstrapInfo.multiaddrs.find(a => a.includes("127.0.0.1"))
      ?? bootstrapInfo.multiaddrs[0]

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
    app.use("/backend/qrcodes", qrcodeRoutes)
    app.use("/backend/stores", storeRoutes)
    app.use("/backend/audit-logs", auditRoutes)
    app.use("/backend/maintenance", maintenanceRoutes)
    app.use("/backend/logistics", logisticsRoutes)
    app.use("/backend/admin", adminRoutes)

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
      console.log(`   - Audit Logs`)
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
