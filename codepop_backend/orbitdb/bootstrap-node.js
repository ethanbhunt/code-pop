// bootstrap-node.js – Run first: node bootstrap-node.js
//
// This bootstrap node:
//   1. Creates all 8 OrbitDB keyvalue databases for CodePop entities
//   2. Writes DB addresses + multiaddr to peer-info.json
//   3. Exposes a simple REST API for node info
//   4. Stays running so peer nodes can replicate from it

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
import { createOrbitDB, OrbitDBAccessController } from "@orbitdb/core"
import fs from "fs"

const HTTP_PORT = 3000
const LIBP2P_PORT = 4000
const REPO = "./repo-bootstrap"
const PEER_INFO_FILE = "./peer-info.json"

const app = express()
app.use(express.json())

// Database names
const DB_NAMES = {
  users: "users-db",
  tokens: "tokens-db",
  preferences: "preferences-db",
  drinks: "drinks-db",
  inventory: "inventory-db",
  orders: "orders-db",
  notifications: "notifications-db",
  revenues: "revenues-db"
}

// Store database references
const databases = {}

async function start() {
  console.log("🚀 Starting CodePop Bootstrap Node...\n")

  try {
    // Initialize blockstore and datastore
    console.log("📦 Initializing blockstore and datastore...")
    const blockstore = new LevelBlockstore(`${REPO}/blocks`)
    const datastore = new LevelDatastore(`${REPO}/data`)
    await blockstore.open()
    await datastore.open()
    console.log("✓ Blockstore and datastore initialized")

    // Create libp2p instance
    console.log("🔗 Setting up libp2p networking...")
    const libp2p = await createLibp2p({
      addresses: { listen: [`/ip4/0.0.0.0/tcp/${LIBP2P_PORT}`] },
      transports: [tcp()],
      connectionEncryption: [noise()],
      streamMuxers: [yamux()],
      services: {
        pubsub: gossipsub({ allowPublishToZeroTopicPeers: true }),
        identify: identify(),
      },
    })
    console.log("✓ libp2p configured")

    // Create Helia and OrbitDB instances
    console.log("🌍 Initializing Helia and OrbitDB...")
    const helia = await createHelia({ libp2p, blockstore, datastore })
    const orbitdb = await createOrbitDB({
      ipfs: helia,
      directory: `${REPO}/orbitdb`
    })
    console.log("✓ Helia and OrbitDB initialized\n")

    // Create all databases
    console.log("📚 Creating CodePop databases...")
    const dbAddresses = {}

    for (const [key, dbName] of Object.entries(DB_NAMES)) {
      try {
        // Create database with PublicSignerOrbitDBAccessController
        // This allows anyone to write
        const db = await orbitdb.open(dbName, {
          type: "keyvalue",
          AccessController: OrbitDBAccessController({
            write: ["*"]  // Allow all to write
          })
        })
        databases[key] = db
        dbAddresses[key] = db.address.toString()
        console.log(`  ✓ ${dbName} created`)
        console.log(`    Address: ${dbAddresses[key].substring(0, 50)}...`)
      } catch (err) {
        console.error(`  ✗ Failed to create ${dbName}:`, err.message)
        // Try without AccessController if it fails
        try {
          const db = await orbitdb.open(dbName, { type: "keyvalue" })
          databases[key] = db
          dbAddresses[key] = db.address.toString()
          console.log(`  ✓ ${dbName} created (fallback)`)
        } catch (err2) {
          throw err
        }
      }
    }
    console.log()

    // Write peer info to file
    const peerInfo = {
      dbAddresses,
      multiaddrs: libp2p.getMultiaddrs().map(a => a.toString()),
      peerId: libp2p.peerId.toString(),
      timestamp: new Date().toISOString()
    }
    fs.writeFileSync(PEER_INFO_FILE, JSON.stringify(peerInfo, null, 2))
    console.log(`📝 Peer information written to ${PEER_INFO_FILE}`)
    console.log(`   Peer ID: ${libp2p.peerId.toString()}\n`)

    // Set up event listeners for all databases
    console.log("📡 Setting up database replication listeners...")
    Object.entries(databases).forEach(([key, db]) => {
      db.events.on("update", (entry) => {
        console.log(`  [${key}:update] key=${entry.payload.key}`)
      })
    })
    console.log()

    // REST API Endpoints
    console.log("🌐 Setting up REST API endpoints...\n")

    // Health check
    app.get("/health", (req, res) => {
      res.json({
        status: "healthy",
        nodeType: "bootstrap",
        peerId: libp2p.peerId.toString(),
        timestamp: new Date().toISOString()
      })
    })

    // Node info
    app.get("/info", (req, res) => {
      const dbInfo = {}
      Object.entries(databases).forEach(([key, db]) => {
        dbInfo[key] = {
          address: db.address.toString(),
          type: "keyvalue"
        }
      })
      res.json({
        nodeType: "bootstrap",
        peerId: libp2p.peerId.toString(),
        multiaddrs: libp2p.getMultiaddrs().map(a => a.toString()),
        databases: dbInfo,
        timestamp: new Date().toISOString()
      })
    })

    // Generic get endpoint (for testing)
    app.get("/:dbName/get/:key", async (req, res) => {
      try {
        const { dbName, key } = req.params
        if (!databases[dbName]) {
          return res.status(404).json({ error: "Database not found" })
        }
        const value = await databases[dbName].get(key)
        res.json({ key, value: value ?? null })
      } catch (err) {
        res.status(500).json({ error: err.message })
      }
    })

    // Generic set endpoint (for testing)
    app.post("/:dbName/set", async (req, res) => {
      try {
        const { dbName } = req.params
        const { key, value } = req.body
        if (!key || !value) {
          return res.status(400).json({
            error: "Missing required fields: key, value"
          })
        }
        if (!databases[dbName]) {
          return res.status(404).json({ error: "Database not found" })
        }
        await databases[dbName].put(key, value)
        res.json({ status: "stored", key, value })
      } catch (err) {
        res.status(500).json({ error: err.message })
      }
    })

    // Generic all endpoint (for testing)
    app.get("/:dbName/all", async (req, res) => {
      try {
        const { dbName } = req.params
        if (!databases[dbName]) {
          return res.status(404).json({ error: "Database not found" })
        }
        const entries = await databases[dbName].all()
        res.json({ count: entries.length, entries })
      } catch (err) {
        res.status(500).json({ error: err.message })
      }
    })

    // Start HTTP server
    app.listen(HTTP_PORT, () => {
      console.log(`✅ Bootstrap node is ready!`)
      console.log(`   HTTP API: http://localhost:${HTTP_PORT}`)
      console.log(`   libp2p: /ip4/0.0.0.0/tcp/${LIBP2P_PORT}`)
      console.log(`\n📖 API Endpoints:`)
      console.log(`   GET  /health              - Health check`)
      console.log(`   GET  /info                - Node info with all DB addresses`)
      console.log(`   GET  /:dbName/get/:key   - Get value from database`)
      console.log(`   POST /:dbName/set        - Set key/value in database`)
      console.log(`   GET  /:dbName/all        - List all entries in database`)
      console.log(`\n💡 Database names: ${Object.values(DB_NAMES).join(", ")}\n`)
    })

  } catch (err) {
    console.error("💥 Fatal error:", err)
    process.exit(1)
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n\n🛑 Shutting down bootstrap node...")
  // Close all databases
  for (const db of Object.values(databases)) {
    try {
      await db.close()
    } catch (err) {
      console.error("Error closing database:", err)
    }
  }
  process.exit(0)
})

start().catch(console.error)
