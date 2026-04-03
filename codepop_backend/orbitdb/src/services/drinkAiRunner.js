// Spawns Python drink_ai_bridge.py (sklearn + CSV drink generator).
import { spawn } from "child_process"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BACKEND_PY_DIR = path.resolve(__dirname, "../../../backend")
const BRIDGE_SCRIPT = path.join(BACKEND_PY_DIR, "drink_ai_bridge.py")

function resolvePythonExecutable() {
  if (process.env.PYTHON) return process.env.PYTHON
  return process.platform === "win32" ? "python" : "python3"
}

/**
 * @param {Record<string, unknown>} payload Passed as JSON stdin to the bridge
 * @returns {Promise<Record<string, unknown>>}
 */
export function runDrinkAiBridge(payload) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(BRIDGE_SCRIPT)) {
      reject(new Error(`drink_ai_bridge.py not found at ${BRIDGE_SCRIPT}`))
      return
    }

    const cmd = resolvePythonExecutable()
    const proc = spawn(cmd, [BRIDGE_SCRIPT], {
      cwd: BACKEND_PY_DIR,
      env: {
        ...process.env,
        CODEPOP_DRINK_AI_BACKEND_DIR: BACKEND_PY_DIR,
        PYTHONUTF8: "1",
      },
    })

    let out = ""
    let err = ""
    proc.stdout.on("data", (d) => {
      out += d.toString()
    })
    proc.stderr.on("data", (d) => {
      err += d.toString()
    })
    proc.on("error", (e) => {
      reject(e)
    })
    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(err.trim() || `drink_ai_bridge exited with code ${code}`))
        return
      }
      try {
        resolve(JSON.parse(out.trim()))
      } catch {
        reject(new Error(`Invalid JSON from drink_ai_bridge: ${out.slice(0, 200)}`))
      }
    })

    proc.stdin.write(JSON.stringify(payload))
    proc.stdin.end()
  })
}
