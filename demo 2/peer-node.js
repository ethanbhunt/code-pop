// peer-node.js  –  Run after bootstrap: PORT=3001 node peer-node.js
//
// This node:
//   1. Reads peer-info.json written by the bootstrap node
//   2. Dials the bootstrap node automatically on startup
//   3. Opens the SAME DB address — replication is automatic via gossipsub

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

const HTTP_PORT = parseInt(process.env.PORT || "3001")
const LIBP2P_PORT = HTTP_PORT + 1000          // e.g. 4001, 4002 …
const REPO = `./repo-peer-${HTTP_PORT}`
const PEER_INFO_FILE = "./peer-info.json"

const app = express()
app.use(express.json())
app.use(express.static("public"))

async function start() {
    // ── Read bootstrap peer info ──────────────────────────────────────────────
    if (!fs.existsSync(PEER_INFO_FILE)) {
        console.error(`✗ ${PEER_INFO_FILE} not found — start the bootstrap node first`)
        process.exit(1)
    }
    const bootstrapInfo = JSON.parse(fs.readFileSync(PEER_INFO_FILE, "utf8"))
    console.log(`✓ Read bootstrap info from ${PEER_INFO_FILE}`)
    console.log(`  Bootstrap DB : ${bootstrapInfo.dbAddress}`)

    // ── Build this peer's libp2p + Helia stack ────────────────────────────────
    const blockstore = new LevelBlockstore(`${REPO}/blocks`)
    const datastore = new LevelDatastore(`${REPO}/data`)
    await blockstore.open()
    await datastore.open()

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

    const helia = await createHelia({ libp2p, blockstore, datastore })
    const orbitdb = await createOrbitDB({ ipfs: helia, directory: `${REPO}/orbitdb` })

    // ── Dial bootstrap node ───────────────────────────────────────────────────
    // Pick the 127.0.0.1 address for local demo; in production use a public addr
    const bootstrapAddr = bootstrapInfo.multiaddrs.find(a => a.includes("127.0.0.1"))
        ?? bootstrapInfo.multiaddrs[0]

    console.log(`  Dialing bootstrap: ${bootstrapAddr}`)
    try {
        await libp2p.dial(multiaddr(bootstrapAddr))
        console.log(`  ✓ Connected to bootstrap node`)
    } catch (err) {
        console.error(`  ✗ Failed to dial bootstrap: ${err.message}`)
        process.exit(1)
    }

    // Wait for identify to finish exchanging protocol info
    await new Promise(r => setTimeout(r, 1000))

    // ── Open the SAME database as the bootstrap node ──────────────────────────
    // Using the bootstrap's exact address means OrbitDB will automatically
    // replicate all existing and future entries via gossipsub
    const db = await orbitdb.open(bootstrapInfo.dbAddress, { type: "keyvalue" })
    console.log(`  ✓ Opened shared DB: ${db.address}`)

    // Log incoming replication events
    db.events.on("update", (entry) => {
        console.log(`  [db:update] key=${entry.payload.key} value=${entry.payload.value}`)
    })

    libp2p.addEventListener("peer:connect", (evt) => {
        console.log(`  [peer:connect] ${evt.detail}`)
    })

    // Wait for initial sync of existing entries
    await new Promise(r => setTimeout(r, 2000))
    const existing = await db.all()
    console.log(`  Synced ${existing.length} existing entries from bootstrap`)

    // ── REST API ──────────────────────────────────────────────────────────────

    app.get("/info", (req, res) => {
        res.json({
            peerId: libp2p.peerId.toString(),
            addrs: libp2p.getMultiaddrs().map(a => a.toString()),
            dbAddress: db.address.toString(),
            connectedPeers: libp2p.getPeers().map(p => p.toString()),
        })
    })

    app.post("/set", async (req, res) => {
        try {
            const { key, value } = req.body
            await db.put(key, value)
            res.json({ status: "stored", key, value })
        } catch (err) {
            res.status(500).json({ error: err.message })
        }
    })

    app.get("/get/:key", async (req, res) => {
        try {
            const value = await db.get(req.params.key)
            res.json({ value: value ?? null })
        } catch (err) {
            res.status(500).json({ error: err.message })
        }
    })

    app.get("/all", async (req, res) => {
        try {
            const entries = await db.all()
            res.json({ entries })
        } catch (err) {
            res.status(500).json({ error: err.message })
        }
    })

    app.listen(HTTP_PORT, () => {
        console.log(`  HTTP API   : http://localhost:${HTTP_PORT}`)
    })
}

start().catch(console.error)
