#!/usr/bin/env node

/**
 * add-store.js - CLI tool to add new stores dynamically
 * 
 * Usage:
 *   node add-store.js --name "Store Name" --address "123 Main St" --city "City" --region "Region" --timezone "America/New_York"
 * 
 * Or interactive mode:
 *   node add-store.js
 */

import readline from "readline"
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

const PEER_INFO_FILE = "./peer-info.json"
const REPO = "./repo-cli-store"
const LIBP2P_PORT = 5000

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer)
    })
  })
}

async function main() {
  console.log("\n[ ^ ] CodePop Add Store CLI\n")

  try {
    // Check if peer-info.json exists
    if (!fs.existsSync(PEER_INFO_FILE)) {
      console.error(`[ X ] ${PEER_INFO_FILE} not found — start the bootstrap node first`)
      process.exit(1)
    }

    const bootstrapInfo = JSON.parse(fs.readFileSync(PEER_INFO_FILE, "utf8"))
    console.log("[ ^ ] Connected to bootstrap node\n")

    // Parse command line arguments
    const args = process.argv.slice(2)
    let storeData = {}

    if (args.length > 0) {
      // Parse --key value pairs
      for (let i = 0; i < args.length; i += 2) {
        const key = args[i].replace("--", "")
        const value = args[i + 1]
        storeData[key] = value
      }
    } else {
      // Interactive mode
      console.log("[ ^ ] Enter store details (or press Ctrl+C to cancel):\n")

      storeData.name = await prompt("Store Name: ")
      storeData.address = await prompt("Address: ")
      storeData.city = await prompt("City: ")
      storeData.region = await prompt("Region (e.g., Northeast): ")
      storeData.timezone = await prompt("Timezone (e.g., America/New_York): ")

      const lat = await prompt("Latitude (optional): ")
      const lng = await prompt("Longitude (optional): ")

      if (lat && lng) {
        storeData.lat = parseFloat(lat)
        storeData.lng = parseFloat(lng)
      }
    }

    // Validate required fields
    if (!storeData.name || !storeData.address || !storeData.city || !storeData.region) {
      console.error("\n[ X ] Missing required fields: name, address, city, region")
      process.exit(1)
    }

    console.log("\n[ ^ ] Initializing connection to bootstrap...\n")

    // Initialize blockstore and datastore
    const blockstore = new LevelBlockstore(`${REPO}/blocks`)
    const datastore = new LevelDatastore(`${REPO}/data`)
    await blockstore.open()
    await datastore.open()

    // Create libp2p
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

    // Create Helia and OrbitDB
    const helia = await createHelia({ libp2p, blockstore, datastore })
    const orbitdb = await createOrbitDB({ ipfs: helia, directory: `${REPO}/orbitdb` })

    // Dial bootstrap
    const bootstrapAddr = bootstrapInfo.multiaddrs.find(a => a.includes("127.0.0.1"))
      ?? bootstrapInfo.multiaddrs[0]

    console.log(`[ ^ ] Dialing bootstrap: ${bootstrapAddr}`)
    try {
      await libp2p.dial(multiaddr(bootstrapAddr))
      console.log("[ ^ ] Connected to bootstrap\n")
    } catch (err) {
      console.error(`[ X ] Failed to connect to bootstrap: ${err.message}`)
      process.exit(1)
    }

    // Wait for identify
    await new Promise(r => setTimeout(r, 1000))

    // Open stores database
    console.log("[ ^ ] Opening stores database...")
    const storesDb = await orbitdb.open(bootstrapInfo.dbAddresses.stores, { type: "keyvalue" })
    console.log("[ ^ ] Connected to stores database\n")

    // Get next store ID
    let nextId = 1
    const counterEntry = await storesDb.get("counter:store")
    if (counterEntry) {
      nextId = counterEntry + 1
    }

    // Create store object
    const store = {
      storeId: nextId,
      name: storeData.name,
      address: storeData.address,
      city: storeData.city,
      region: storeData.region,
      timezone: storeData.timezone || "America/New_York",
      coordinates: {
        lat: storeData.lat || 0,
        lng: storeData.lng || 0
      },
      manager: null,
      staffCount: 0,
      status: "operational",
      operatingHours: {
        monday: { open: "06:00", close: "22:00" },
        tuesday: { open: "06:00", close: "22:00" },
        wednesday: { open: "06:00", close: "22:00" },
        thursday: { open: "06:00", close: "22:00" },
        friday: { open: "06:00", close: "23:00" },
        saturday: { open: "07:00", close: "23:00" },
        sunday: { open: "07:00", close: "22:00" }
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Save store to database
    console.log(`[ ^ ] Saving store...`)
    await storesDb.put(`store:${store.storeId}`, store)
    await storesDb.put("counter:store", nextId)

    console.log(`\n[ ^ ] ✓ Store created successfully!\n`)
    console.log(`   Store ID: ${store.storeId}`)
    console.log(`   Name: ${store.name}`)
    console.log(`   Address: ${store.address}`)
    console.log(`   City: ${store.city}`)
    console.log(`   Region: ${store.region}`)
    console.log(`   Timezone: ${store.timezone}\n`)

    // Cleanup
    await storesDb.close()
    await libp2p.stop()
    process.exit(0)

  } catch (err) {
    console.error("[ X ] Error:", err.message)
    process.exit(1)
  }
}

main()
