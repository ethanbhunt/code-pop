// ip_address.js - Store-Aware Peer Node Configuration
//
// This module provides store-specific peer node URLs based on selected store
// Supports bootstrap discovery and dynamic peer selection
// Supports both local development and mobile/IP-based configurations

/**
 * BOOTSTRAP_CONFIG - Bootstrap Node Configuration
 * The bootstrap node is the entry point for discovering stores and peers
 * 
 * For Local Development (Android Emulator):
 * - useLocalhost: true (maps to 127.0.0.1)
 * - machineIP: '10.0.2.2' (Android emulator bridge to host)
 * 
 * For Real Device (Network):
 * - useLocalhost: false
 * - machineIP: Your machine's IP (e.g., '192.168.1.100')
 */
export const BOOTSTRAP_CONFIG = {
  // On Android emulators, "localhost" points at the emulator itself.
  // Use the host bridge IP (10.0.2.2) to reach services running on your computer.
  useLocalhost: true,
  machineIP: '10.0.2.2',  // Default: Android emulator bridge
  bootstrapPort: 3000,
}

/**
 * Store-to-Peer Port Mapping
 * Each store is served by a specific peer node port
 * 
 * Store 1 (Downtown Café) → Peer 3001 (general peer)
 * Store 2 (Uptown Hub) → Peer 3002 (dedicated peer)
 * Store 3 (Westside Lounge) → Peer 3003 (dedicated peer)
 */
const STORE_PEER_PORTS = {
  1: 3001,  // Store 1: Downtown Café
  2: 3002,  // Store 2: Uptown Hub
  3: 3003,  // Store 3: Westside Lounge
}

/**
 * Machine/Server Configuration
 * 
 * For Local Development:
 * - Use 'localhost' (automatically maps to 127.0.0.1)
 * - Android emulator: use 10.0.2.2 to reach host machine
 * 
 * For Mobile/Network Development:
 * - Find your machine IP: ifconfig (macOS) or ipconfig (Windows)
 * - Example: 192.168.1.100
 * - Update MACHINE_IP below with your IP
 */

// Configuration: Change this to your setup
const CONFIG = {
  // For Android emulator: MUST use useLocalhost: false and machineIP: '10.0.2.2'
  // localhost in emulator resolves to the emulator itself, not the host machine
  useLocalhost: false,
  machineIP: '10.0.2.2',
  
  // For actual network IP (e.g., when testing on real mobile device)
  // useLocalhost: false,
  // machineIP: '192.168.1.100', // Change to your machine's IP
}

/**
 * Get the bootstrap node URL for store discovery
 * The bootstrap node provides the list of stores and their peer mappings
 * 
 * @returns {string} Full URL to the bootstrap node
 */
export function getBootstrapURL() {
  const host = BOOTSTRAP_CONFIG.useLocalhost ? 'localhost' : BOOTSTRAP_CONFIG.machineIP
  return `http://${host}:${BOOTSTRAP_CONFIG.bootstrapPort}`
}

/**
 * Get the appropriate base URL for the selected store
 * Falls back to general peer (3001) if store ID is invalid
 * 
 * @param {number} storeId - The selected store ID (1, 2, or 3)
 * @returns {string} Full URL to the store-specific peer node
 */
export function getStorePeerURL(storeId = 1) {
  const port = STORE_PEER_PORTS[storeId] || 3001 // Default to general peer
  const host = CONFIG.useLocalhost ? 'localhost' : CONFIG.machineIP
  return `http://${host}:${port}`
}

/**
 * Get the peer port for a specific store
 * 
 * @param {number} storeId - The store ID
 * @returns {number} The peer node port
 */
export function getStorePeerPort(storeId = 1) {
  return STORE_PEER_PORTS[storeId] || 3001
}

/**
 * Build BASE_URL dynamically based on stored store selection
 * Should be called whenever store selection changes
 */
import AsyncStorage from '@react-native-async-storage/async-storage'

let cachedBaseURL = getStorePeerURL(1) // Default to Store 1

/**
 * Fetch stores from bootstrap node
 * Returns list of available stores with peer information
 * 
 * @returns {Promise<Array>} Array of store objects with storeId, name, peerPort, etc.
 */
export async function fetchStoresFromBootstrap() {
  try {
    const bootstrapURL = getBootstrapURL()
    console.log(`[BOOTSTRAP] Fetching stores from ${bootstrapURL}/backend/stores`)
    
    const response = await fetch(`${bootstrapURL}/backend/stores`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      throw new Error(`Bootstrap returned status ${response.status}`)
    }
    
    const data = await response.json()
    console.log(`[BOOTSTRAP] Successfully fetched ${data.count} stores`)
    return data.data || []
  } catch (error) {
    console.error('[BOOTSTRAP] Failed to fetch stores:', error)
    throw error
  }
}

/**
 * Initialize BASE_URL from stored store selection
 * Call this on app startup
 * Falls back to Store 1 (peer 3001) if no selection stored
 */
export async function initializeBaseURL() {
  try {
    const selectedStoreId = await AsyncStorage.getItem('selectedStoreId')
    if (selectedStoreId) {
      cachedBaseURL = getStorePeerURL(parseInt(selectedStoreId))
      console.log(`[CONFIG] Using peer for store ${selectedStoreId}: ${cachedBaseURL}`)
    } else {
      // No store selected yet, use bootstrap for discovery
      console.log(`[CONFIG] No store selected, will show store selection`)
    }
  } catch (error) {
    console.warn('[CONFIG] Failed to initialize BASE_URL from storage:', error)
  }
}

/**
 * Update BASE_URL when store selection changes
 * Call this when user selects a different store
 */
export async function updateBaseURLForStore(storeId) {
  cachedBaseURL = getStorePeerURL(storeId)
  console.log(`[CONFIG] Switched to peer for store ${storeId}: ${cachedBaseURL}`)
}

/**
 * Get the current BASE_URL
 * Returns the URL for the currently selected store's peer node
 */
export function getBaseURL() {
  return cachedBaseURL
}

/**
 * Default BASE_URL export
 * Falls back to Store 1 peer on app startup
 * Update this dynamically as store selection changes
 */
let BASE_URL = getStorePeerURL(1)

// Update BASE_URL when store changes
export async function setStoreAndUpdateURL(storeId) {
  BASE_URL = getStorePeerURL(storeId)
  await AsyncStorage.setItem('lastUsedPeerPort', getStorePeerPort(storeId).toString())
  console.log(`[BASE_URL] Updated to store ${storeId} peer: ${BASE_URL}`)
  return BASE_URL
}

export { BASE_URL }

/**
 * Guest Mode Management
 * Tracks whether user is browsing in guest mode (no authentication)
 */

/**
 * Check if user is currently in guest mode
 * @returns {Promise<boolean>} True if guest mode, false if authenticated
 */
export async function isGuestMode() {
  try {
    const token = await AsyncStorage.getItem('userToken')
    return !token // No token = guest mode
  } catch (error) {
    console.warn('[CONFIG] Error checking guest mode:', error)
    return true // Default to guest if error
  }
}

/**
 * Configuration Reference
 * 
 * LOCAL DEVELOPMENT (Android Emulator):
 * - useLocalhost: true
 * - machineIP: '10.0.2.2'
 * - Base URLs:
 *   Store 1: http://localhost:3001 or http://10.0.2.2:3001
 *   Store 2: http://localhost:3002 or http://10.0.2.2:3002
 *   Store 3: http://localhost:3003 or http://10.0.2.2:3003
 * 
 * NETWORK DEVELOPMENT (Real Device):
 * - useLocalhost: false
 * - machineIP: '192.168.1.100' (your machine IP)
 * - Base URLs:
 *   Store 1: http://192.168.1.100:3001
 *   Store 2: http://192.168.1.100:3002
 *   Store 3: http://192.168.1.100:3003
 * 
 * PRODUCTION (Remote Servers):
 * - Change machineIP to remote server IPs
 * - Can have different IPs per store for load balancing
 * - Base URLs:
 *   Store 1: http://store1.example.com:3001
 *   Store 2: http://store2.example.com:3002
 *   Store 3: http://store3.example.com:3003
 */
