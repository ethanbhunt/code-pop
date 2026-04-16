import dotenv from "dotenv"
dotenv.config()
import { Storage } from "@google-cloud/storage"
const storage = new Storage()
const BUCKET = process.env.GCS_BUCKET
const CONFIG_FILE = "peer-info.json"

export async function writePeerInfo(peerInfo) {
  if (!BUCKET) throw new Error("GCS_BUCKET is not set in .env")
  const file = storage.bucket(BUCKET).file(CONFIG_FILE)
  await file.save(JSON.stringify(peerInfo, null, 2), {
    contentType: "application/json",
  })
  console.log('[ ^ ] Peer info written to GCS bucket: ${BUCKET}')
}

export async function readPeerInfo(retries = 15, delayMs = 4000) {
  const file = storage.bucket(BUCKET).file(CONFIG_FILE)
  for (let i = 0; i < retries; i++) {
    try {
      const [contents] = await file.download()
      return JSON.parse(contents.toString())
    } catch {
      console.log("[ ^ ] Waiting for bootstrap peer-info... (${i + 1}/${retries})")
      await new Promise(r => setTimeout(r, delayMs))
    }
  }
  throw new Error("Could not read peer-info from GCS after retries")
}
