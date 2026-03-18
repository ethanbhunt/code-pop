// bootstrap-node.js  –  Run first: node bootstrap-node.js
//
// This node:
//   1. Creates the OrbitDB keyvalue database
//   2. Writes its DB address + multiaddr to peer-info.json
//   3. Stays running so peer nodes can replicate from it

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
import { OrbitDBAccessController } from "@orbitdb/core"
import fs from "fs"

const HTTP_PORT = 3000
const LIBP2P_PORT = 4000
const REPO = "./repo-bootstrap"
const PEER_INFO_FILE = "./peer-info.json"

const app = express()
app.use(express.json())
app.use(express.static("public"))

async function start() {
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

    // Create (or reopen) the shared database
    // First open to get the address
    const db = await orbitdb.open("shared-db", { type: "keyvalue", AccessController: OrbitDBAccessController({ write: ["*"] }) })
    const dbAddress = db.address.toString()

    // Write peer info
    const peerInfo = {
        dbAddress,
        multiaddrs: libp2p.getMultiaddrs().map(a => a.toString()),
        peerId: libp2p.peerId.toString(),
    }
    fs.writeFileSync(PEER_INFO_FILE, JSON.stringify(peerInfo, null, 2))

    // Close and reopen by address so pubsub topic matches the peer node exactly
    await db.close()
    const sharedDb = await orbitdb.open(dbAddress, { type: "keyvalue" })

    console.log(`✓ Bootstrap node ready`)
    console.log(`  DB address : ${sharedDb.address}`)
    console.log(`  PeerId     : ${libp2p.peerId}`)
    console.log(`  Wrote peer info to ${PEER_INFO_FILE}`)

    sharedDb.events.on("update", (entry) => {
        console.log(`  [db:update] key=${entry.payload.key} value=${entry.payload.value}`)
    })

    // ── REST API ──────────────────────────────────────────────────────────────

    app.post("/set", async (req, res) => {
        try {
            const { key, value } = req.body
            await sharedDb.put(key, value)
            res.json({ status: "stored", key, value })
        } catch (err) {
            res.status(500).json({ error: err.message })
        }
    })

    app.get("/get/:key", async (req, res) => {
        try {
            const value = await sharedDb.get(req.params.key)
            res.json({ value: value ?? null })
        } catch (err) {
            res.status(500).json({ error: err.message })
        }
    })

    app.get("/all", async (req, res) => {
        try {
            const entries = await sharedDb.all()
            res.json({ entries })
        } catch (err) {
            res.status(500).json({ error: err.message })
        }
    })

    app.get("/info", (req, res) => {
        res.json(peerInfo)
    })

    app.listen(HTTP_PORT, () => {
        console.log(`  HTTP API   : http://localhost:${HTTP_PORT}`)
    })
}

start().catch(console.error)
