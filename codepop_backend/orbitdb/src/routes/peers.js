// src/routes/peers.js
// REST API endpoints for peer registry and service discovery
//
// Endpoints:
// - GET /peers/list - Get all active peers
// - GET /peers/info - Get current peer info (for bootstrap/debug)
// - GET /peers/stats - Get registry statistics
// - POST /peers/register - Register this peer
// - POST /peers/heartbeat/:peerId - Update peer heartbeat
// - GET /peers/by-role/:role - Get peers by role
// - GET /peers/by-region/:region - Get peers by region

import express from "express"
import { asyncHandler } from "../middleware/errorHandler.js"
import {
  registerPeer,
  heartbeatPeer,
  getPeer,
  getAllPeers,
  getPeersByRole,
  getPeersByRegion,
  deregisterPeer,
  getRegistryStats,
  getRegistrySnapshot,
  checkPeerAllowed
} from "../services/registryService.js"

const router = express.Router()

/**
 * GET /peers/list
 * Get all active peers in the cluster
 */
router.get(
  "/list",
  asyncHandler(async (req, res) => {
    const peers = getAllPeers()
    res.json({
      count: peers.length,
      data: peers,
      timestamp: new Date().toISOString()
    })
  })
)

/**
 * GET /peers/info
 * Get debug info about the peer registry (snapshot)
 */
router.get(
  "/info",
  asyncHandler(async (req, res) => {
    const snapshot = getRegistrySnapshot()
    const stats = getRegistryStats()
    res.json({
      snapshot,
      stats,
      timestamp: new Date().toISOString()
    })
  })
)

/**
 * GET /peers/stats
 * Get registry statistics
 */
router.get(
  "/stats",
  asyncHandler(async (req, res) => {
    const stats = getRegistryStats()
    res.json({
      stats,
      timestamp: new Date().toISOString()
    })
  })
)

/**
 * POST /peers/register
 * Register a new peer in the registry
 *
 * Body: {
 *   peerId: string,
 *   role: string ('hub', 'store', 'bootstrap'),
 *   region: string ('north', 'south', 'east', etc.),
 *   apiPort: number,
 *   multiaddrs: array of strings
 * }
 */
router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const { peerId, role, region, apiPort, multiaddrs } = req.body

    if (!peerId) {
      return res.status(400).json({
        error: "peerId is required",
        code: "MISSING_PEER_ID"
      })
    }

    if (!role) {
      return res.status(400).json({
        error: "role is required (hub, store, bootstrap)",
        code: "MISSING_ROLE"
      })
    }

    // Check allowlist
    const allowlistCheck = checkPeerAllowed(peerId, role)
    if (!allowlistCheck.allowed) {
      return res.status(403).json({
        error: "Peer registration denied",
        reason: allowlistCheck.reason,
        code: "PEER_NOT_ALLOWED"
      })
    }

    const peer = registerPeer(peerId, {
      role,
      region: region || "unknown",
      apiPort: apiPort || null,
      multiaddrs: Array.isArray(multiaddrs) ? multiaddrs : [],
      permissions: allowlistCheck.permissions
    })

    res.status(201).json({
      message: "Peer registered successfully",
      peer,
      permissions: allowlistCheck.permissions,
      timestamp: new Date().toISOString()
    })
  })
)

/**
 * POST /peers/heartbeat/:peerId
 * Update heartbeat for a peer
 *
 * Called by peer every 30 seconds to indicate it's still alive
 */
router.post(
  "/heartbeat/:peerId",
  asyncHandler(async (req, res) => {
    const { peerId } = req.params

    const peer = heartbeatPeer(peerId)

    if (!peer) {
      return res.status(404).json({
        error: "Peer not found",
        code: "PEER_NOT_FOUND"
      })
    }

    res.json({
      message: "Heartbeat received",
      peer,
      timestamp: new Date().toISOString()
    })
  })
)

/**
 * GET /peers/by-role/:role
 * Get all peers with a specific role
 */
router.get(
  "/by-role/:role",
  asyncHandler(async (req, res) => {
    const { role } = req.params
    const peers = getPeersByRole(role)

    res.json({
      role,
      count: peers.length,
      data: peers,
      timestamp: new Date().toISOString()
    })
  })
)

/**
 * GET /peers/by-region/:region
 * Get all peers in a specific region
 */
router.get(
  "/by-region/:region",
  asyncHandler(async (req, res) => {
    const { region } = req.params
    const peers = getPeersByRegion(region)

    res.json({
      region,
      count: peers.length,
      data: peers,
      timestamp: new Date().toISOString()
    })
  })
)

/**
 * GET /peers/:peerId
 * Get a specific peer by ID
 */
router.get(
  "/:peerId",
  asyncHandler(async (req, res) => {
    const { peerId } = req.params
    const peer = getPeer(peerId)

    if (!peer) {
      return res.status(404).json({
        error: "Peer not found",
        code: "PEER_NOT_FOUND"
      })
    }

    res.json({
      peer,
      timestamp: new Date().toISOString()
    })
  })
)

/**
 * DELETE /peers/:peerId
 * Deregister a peer
 */
router.delete(
  "/:peerId",
  asyncHandler(async (req, res) => {
    const { peerId } = req.params
    const existed = deregisterPeer(peerId)

    if (!existed) {
      return res.status(404).json({
        error: "Peer not found",
        code: "PEER_NOT_FOUND"
      })
    }

    res.json({
      message: "Peer deregistered successfully",
      peerId,
      timestamp: new Date().toISOString()
    })
  })
)

export default router
