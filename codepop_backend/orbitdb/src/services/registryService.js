// src/services/registryService.js
// Peer registry service for tracking active peers and their metadata
//
// Maintains a registry of all connected peer nodes with their:
// - Unique peer ID
// - Role (hub, store, bootstrap, etc.)
// - Region/Location
// - HTTP API port
// - Last heartbeat timestamp
// - Health status
// - Access control (write permissions)

/**
 * In-memory peer registry
 * Key: peerId, Value: { peerId, role, region, apiPort, multiaddrs, lastHeartbeat, status }
 */
const peerRegistry = new Map()

/**
 * Allowlist configuration loaded from file
 */
let allowlist = null
let allowlistPath = null

/**
 * Peers that haven't heartbeated for this long (ms) are considered dead
 */
const HEARTBEAT_TIMEOUT = 90000 // 90 seconds

/**
 * Check and cleanup dead peers periodically
 */
let cleanupInterval = null

/**
 * Register a new peer in the registry
 * @param {string} peerId - Unique peer identifier
 * @param {object} metadata - Peer metadata
 * @param {string} metadata.role - Peer role: 'hub', 'store', 'bootstrap', etc.
 * @param {string} metadata.region - Geographic region (e.g., 'east', 'west', 'north')
 * @param {number} metadata.apiPort - HTTP API port
 * @param {array} metadata.multiaddrs - libp2p multiaddresses for dialing
 * @returns {object} Registered peer info
 */
export function registerPeer(peerId, metadata) {
  if (!peerId || !metadata || !metadata.role) {
    throw new Error("peerId and metadata.role are required")
  }

  const peer = {
    peerId,
    role: metadata.role,
    region: metadata.region || "unknown",
    apiPort: metadata.apiPort || null,
    multiaddrs: metadata.multiaddrs || [],
    lastHeartbeat: Date.now(),
    status: "active",
    registeredAt: Date.now()
  }

  peerRegistry.set(peerId, peer)

  console.log(`[ registry ] Registered peer: ${peerId} (role: ${peer.role}, region: ${peer.region})`)
  console.log(`  Multiaddrs: ${peer.multiaddrs.slice(0, 2).join(", ")}${peer.multiaddrs.length > 2 ? ", ..." : ""}`)

  return peer
}

/**
 * Update peer heartbeat timestamp
 * @param {string} peerId - Peer ID to update
 * @returns {object} Updated peer info, or null if not found
 */
export function heartbeatPeer(peerId) {
  const peer = peerRegistry.get(peerId)
  if (!peer) {
    return null
  }

  peer.lastHeartbeat = Date.now()
  peer.status = "active"

  return peer
}

/**
 * Get a single peer by ID
 * @param {string} peerId - Peer ID to retrieve
 * @returns {object} Peer info, or null if not found
 */
export function getPeer(peerId) {
  return peerRegistry.get(peerId) || null
}

/**
 * Get all active peers
 * @returns {array} Array of active peers
 */
export function getAllPeers() {
  return Array.from(peerRegistry.values()).filter(p => p.status === "active")
}

/**
 * Get peers by role
 * @param {string} role - Role to filter by
 * @returns {array} Array of peers with that role
 */
export function getPeersByRole(role) {
  return Array.from(peerRegistry.values()).filter(
    p => p.role === role && p.status === "active"
  )
}

/**
 * Get peers by region
 * @param {string} region - Region to filter by
 * @returns {array} Array of peers in that region
 */
export function getPeersByRegion(region) {
  return Array.from(peerRegistry.values()).filter(
    p => p.region === region && p.status === "active"
  )
}

/**
 * Deregister a peer from the registry
 * @param {string} peerId - Peer ID to remove
 * @returns {boolean} True if peer was removed, false if not found
 */
export function deregisterPeer(peerId) {
  const existed = peerRegistry.has(peerId)
  if (existed) {
    peerRegistry.delete(peerId)
    console.log(`[ registry ] Deregistered peer: ${peerId}`)
  }
  return existed
}

/**
 * Mark peer as dead (failed heartbeat or connection error)
 * @param {string} peerId - Peer ID to mark as dead
 */
export function markPeerDead(peerId) {
  const peer = peerRegistry.get(peerId)
  if (peer) {
    peer.status = "dead"
    console.log(`[ registry ] Marked peer dead: ${peerId}`)
  }
}

/**
 * Get registry statistics
 * @returns {object} Registry stats: total, active, dead counts by role/region
 */
export function getRegistryStats() {
  const allPeers = Array.from(peerRegistry.values())
  const activePeers = allPeers.filter(p => p.status === "active")
  const deadPeers = allPeers.filter(p => p.status === "dead")

  const roleStats = {}
  const regionStats = {}

  activePeers.forEach(peer => {
    roleStats[peer.role] = (roleStats[peer.role] || 0) + 1
    regionStats[peer.region] = (regionStats[peer.region] || 0) + 1
  })

  return {
    total: allPeers.length,
    active: activePeers.length,
    dead: deadPeers.length,
    byRole: roleStats,
    byRegion: regionStats,
    lastCleanup: cleanupInterval ? new Date().toISOString() : null
  }
}

/**
 * Start periodic cleanup of dead peers (heartbeat timeout)
 * Call this on startup to enable automatic peer timeout
 * @param {number} interval - Check interval in ms (default 30000 = 30s)
 */
export function startCleanupInterval(interval = 30000) {
  if (cleanupInterval) {
    return // Already running
  }

  cleanupInterval = setInterval(() => {
    const now = Date.now()
    let removedCount = 0

    peerRegistry.forEach((peer, peerId) => {
      if (peer.status === "active" && now - peer.lastHeartbeat > HEARTBEAT_TIMEOUT) {
        console.log(
          `[ registry ] Timeout: peer ${peerId} (no heartbeat for ${Math.round(
            (now - peer.lastHeartbeat) / 1000
          )}s)`
        )
        markPeerDead(peerId)
        removedCount++
      }
    })

    if (removedCount > 0) {
      console.log(`[ registry ] Cleanup cycle: marked ${removedCount} peer(s) as dead`)
    }
  }, interval)

  console.log(`[ registry ] Cleanup interval started (${interval}ms)`)
}

/**
 * Stop the cleanup interval
 */
export function stopCleanupInterval() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval)
    cleanupInterval = null
    console.log("[ registry ] Cleanup interval stopped")
  }
}

/**
 * Clear all peers from registry (useful for testing)
 */
export function clearRegistry() {
  peerRegistry.clear()
  console.log("[ registry ] Registry cleared")
}

/**
 * Get peer registry as JSON (for debugging/diagnostics)
 * @returns {object} Registry snapshot
 */
export function getRegistrySnapshot() {
  const snapshot = {}
  peerRegistry.forEach((peer, peerId) => {
    snapshot[peerId] = {
      ...peer,
      lastHeartbeat: new Date(peer.lastHeartbeat).toISOString(),
      registeredAt: new Date(peer.registeredAt).toISOString()
    }
  })
  return snapshot
}

/**
 * Load allowlist from file
 * @param {string} filePath - Path to allowlist.json
 * @returns {object} Allowlist configuration
 * @throws {Error} If file cannot be read or parsed
 */
export function loadAllowlist(filePath) {
  try {
    const fs = require('fs')
    const content = fs.readFileSync(filePath, 'utf8')
    allowlist = JSON.parse(content)
    allowlistPath = filePath
    console.log(`[ registry ] Allowlist loaded from ${filePath}`)
    return allowlist
  } catch (err) {
    console.error(`[ registry ] Failed to load allowlist from ${filePath}:`, err.message)
    throw new Error(`Allowlist loading failed: ${err.message}`)
  }
}

/**
 * Check if a peer ID is allowed (matches allowlist)
 * @param {string} peerId - Peer ID to check
 * @param {string} role - Peer role
 * @returns {object} { allowed: boolean, reason: string, permissions: array }
 */
export function checkPeerAllowed(peerId, role = "store") {
  if (!allowlist) {
    // No allowlist loaded - allow all for backward compatibility
    return {
      allowed: true,
      reason: "No allowlist configured (allowing all peers)",
      permissions: ["*"]
    }
  }

  const trustedPeers = allowlist.trustedPeers || {}

  // Check exact match
  if (trustedPeers[peerId]) {
    const config = trustedPeers[peerId]
    return {
      allowed: true,
      reason: "Exact match in allowlist",
      permissions: config.writePermissions || []
    }
  }

  // Check wildcard patterns
  for (const [pattern, config] of Object.entries(trustedPeers)) {
    if (pattern.includes("*")) {
      const regex = new RegExp(`^${pattern.replace(/\*/g, ".*")}$`)
      if (regex.test(peerId)) {
        return {
          allowed: true,
          reason: `Matches pattern '${pattern}'`,
          permissions: config.writePermissions || []
        }
      }
    }
  }

  return {
    allowed: false,
    reason: `Peer not in allowlist: ${peerId}`,
    permissions: []
  }
}

/**
 * Get allowlist entry for a peer
 * @param {string} peerId - Peer ID
 * @returns {object} Allowlist entry or null
 */
export function getAllowlistEntry(peerId) {
  if (!allowlist) return null
  return allowlist.trustedPeers?.[peerId] || null
}

/**
 * Reload allowlist from file (for runtime updates)
 * @returns {object} Updated allowlist
 * @throws {Error} If reload fails
 */
export function reloadAllowlist() {
  if (!allowlistPath) {
    throw new Error("Allowlist path not set. Call loadAllowlist() first.")
  }
  return loadAllowlist(allowlistPath)
}
