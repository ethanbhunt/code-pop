"""
Peer Node Configuration for CodePop

Defines the peer nodes used for seeding and API access in the store-tied peer architecture.
Each store can be served by a dedicated peer node to distribute load and improve performance.

Architecture:
- Bootstrap Node (Port 3000): Creates and manages all 26 databases
- Peer 1 (Port 3001): General peer serving all stores + Store 1 data
- Peer 2 (Port 3002): Store 2 exclusive peer (inventory, orders, revenues)
- Peer 3 (Port 3003): Store 3 exclusive peer (inventory, orders, revenues)

All data is replicated across peers via gossipsub protocol.
"""

# ──────────────────────────────────────────────────────────────────
# PEER CONFIGURATION
# ──────────────────────────────────────────────────────────────────

# Host/IP Configuration
# For local development:
#   - localhost: Works on same machine
#   - 127.0.0.1: Same as localhost
# For network development:
#   - Your machine IP: e.g., 192.168.1.100, 10.0.0.50, etc.
# For Android emulator:
#   - 10.0.2.2: Special emulator bridge to host machine

HOST = "localhost"  # Change to your machine IP for network testing

# ──────────────────────────────────────────────────────────────────
# PEER NODES
# ──────────────────────────────────────────────────────────────────

PEER_NODES = {
    "peer_1": {
        "name": "Peer 1 (General)",
        "description": "General peer serving all stores",
        "host": HOST,
        "port": 3001,
        "url": f"http://{HOST}:3001",
        "stores": [1, 2, 3],  # Serves all stores
        "primary": True,  # Primary seeding peer
    },
    "peer_2": {
        "name": "Peer 2 (Store 2)",
        "description": "Dedicated peer for Store 2 (Uptown Hub)",
        "host": HOST,
        "port": 3002,
        "url": f"http://{HOST}:3002",
        "stores": [2],
        "primary": False,
    },
    "peer_3": {
        "name": "Peer 3 (Store 3)",
        "description": "Dedicated peer for Store 3 (Westside Lounge)",
        "host": HOST,
        "port": 3003,
        "url": f"http://{HOST}:3003",
        "stores": [3],
        "primary": False,
    },
}

# ──────────────────────────────────────────────────────────────────
# BOOTSTRAP NODE
# ──────────────────────────────────────────────────────────────────

BOOTSTRAP_NODE = {
    "name": "Bootstrap Node",
    "description": "Creates and manages all 26 databases",
    "host": HOST,
    "port": 3000,
    "url": f"http://{HOST}:3000",
}

# ──────────────────────────────────────────────────────────────────
# SEEDING CONFIGURATION
# ──────────────────────────────────────────────────────────────────

SEEDING_CONFIG = {
    # List of peer URLs to seed when using --all-peers flag
    "all_peers": [
        PEER_NODES["peer_1"]["url"],
        PEER_NODES["peer_2"]["url"],
        PEER_NODES["peer_3"]["url"],
    ],
    # Default peer for single-peer seeding
    "default_peer": PEER_NODES["peer_1"]["url"],
    # Delay between seeding operations (seconds)
    "operation_delay": 0.3,
    # Delay between peers (seconds)
    "peer_delay": 0.5,
}


# ──────────────────────────────────────────────────────────────────
# HELPER FUNCTIONS
# ──────────────────────────────────────────────────────────────────

def get_peer_url(peer_name):
    """Get URL for a specific peer by name"""
    return PEER_NODES.get(peer_name, {}).get("url")


def get_all_peer_urls():
    """Get URLs for all peer nodes"""
    return SEEDING_CONFIG["all_peers"]


def get_default_peer_url():
    """Get default peer URL for single-peer seeding"""
    return SEEDING_CONFIG["default_peer"]


def get_peer_info():
    """Get detailed information about all peers"""
    info = {
        "bootstrap": BOOTSTRAP_NODE,
        "peers": PEER_NODES,
        "seeding": SEEDING_CONFIG,
    }
    return info


def print_peer_config():
    """Print peer configuration"""
    print("\n" + "=" * 70)
    print("PEER NODE CONFIGURATION")
    print("=" * 70)
    
    print(f"\nHost: {HOST}")
    print(f"\nBootstrap Node:")
    print(f"  {BOOTSTRAP_NODE['name']}: {BOOTSTRAP_NODE['url']}")
    
    print(f"\nPeer Nodes:")
    for key, peer in PEER_NODES.items():
        primary = " [PRIMARY]" if peer.get("primary") else ""
        stores = ", ".join(map(str, peer.get("stores", [])))
        print(f"  {peer['name']}: {peer['url']}{primary}")
        print(f"    Stores: {stores}")
    
    print(f"\nSeeding:")
    print(f"  Default Peer: {SEEDING_CONFIG['default_peer']}")
    print(f"  All Peers: {', '.join(SEEDING_CONFIG['all_peers'])}")
    print(f"  Operation Delay: {SEEDING_CONFIG['operation_delay']}s")
    print(f"  Peer Delay: {SEEDING_CONFIG['peer_delay']}s")
    print("\n" + "=" * 70 + "\n")
