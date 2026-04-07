// store-peer-config.js
// Configuration mapping stores to peer node ports
// This enables store-specific peer node assignment in a decentralized architecture

/**
 * Store-to-Peer Port Mapping
 * Each store can have one or more peer nodes associated with it
 * The frontend will select the appropriate peer based on selected store
 */
export const STORE_PEER_CONFIG = {
  // Store 1: Downtown Café - served by Peer Node 1 (general peer)
  1: {
    storeId: 1,
    storeName: "Downtown Café",
    defaultPort: 3001,
    peers: [
      { port: 3001, description: "General peer node (all stores)" }
    ]
  },
  
  // Store 2: Uptown Hub - served by Peer Node 2 (store-exclusive)
  2: {
    storeId: 2,
    storeName: "Uptown Hub",
    defaultPort: 3002,
    peers: [
      { port: 3002, description: "Dedicated peer for Store 2" }
    ]
  },
  
  // Store 3: Westside Lounge - served by Peer Node 3 (store-exclusive)
  3: {
    storeId: 3,
    storeName: "Westside Lounge",
    defaultPort: 3003,
    peers: [
      { port: 3003, description: "Dedicated peer for Store 3" }
    ]
  }
}

/**
 * Get the default peer port for a store
 * @param {number} storeId - The store ID
 * @returns {number} The peer port to connect to
 */
export function getStorePeerPort(storeId) {
  const storeConfig = STORE_PEER_CONFIG[storeId]
  if (!storeConfig) {
    console.warn(`Store ${storeId} not found in config, defaulting to port 3001`)
    return 3001
  }
  return storeConfig.defaultPort
}

/**
 * Get all available peer ports for a store (failover support)
 * @param {number} storeId - The store ID
 * @returns {number[]} Array of peer ports
 */
export function getStorePeerPorts(storeId) {
  const storeConfig = STORE_PEER_CONFIG[storeId]
  if (!storeConfig) {
    return [3001] // Default to general peer
  }
  return storeConfig.peers.map(peer => peer.port)
}

/**
 * Get store name from store ID
 * @param {number} storeId - The store ID
 * @returns {string} The store name
 */
export function getStoreName(storeId) {
  const storeConfig = STORE_PEER_CONFIG[storeId]
  return storeConfig ? storeConfig.storeName : `Store ${storeId}`
}

/**
 * Get all configured store IDs
 * @returns {number[]} Array of store IDs
 */
export function getAllStoreIds() {
  return Object.keys(STORE_PEER_CONFIG).map(id => parseInt(id))
}

export default STORE_PEER_CONFIG
