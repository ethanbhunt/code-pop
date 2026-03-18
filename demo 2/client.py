"""
client.py  –  Demo client for the OrbitDB real-world setup

Start order:
  1. node bootstrap-node.js          (port 3000)
  2. PORT=3001 node peer-node.js     (port 3001)
  3. python3 client.py
"""

import requests
import time
import sys

NODES = {
    1: "http://localhost:3000",  # bootstrap
    2: "http://localhost:3001",  # peer
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def get_info(node: int) -> dict:
    try:
        r = requests.get(f"{NODES[node]}/info", timeout=5)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        print(f"  ✗ Could not reach node {node}: {e}")
        sys.exit(1)


def set_value(node: int, key: str, value: str) -> dict:
    r = requests.post(f"{NODES[node]}/set", json={"key": key, "value": value}, timeout=10)
    return r.json()


def get_value(node: int, key: str) -> any:
    r = requests.get(f"{NODES[node]}/get/{key}", timeout=5)
    return r.json().get("value")


def get_all(node: int) -> list:
    r = requests.get(f"{NODES[node]}/all", timeout=5)
    return r.json().get("entries", [])


def print_separator():
    print("\n" + "─" * 50 + "\n")
    
def show_full_state():
    print("Full DB state:")
    for n in [1, 2]:
        entries = get_all(n)
        label = "Bootstrap" if n == 1 else "Peer"
        print(f"\n  Node {n} ({label}) — {len(entries)} entries:")
        for e in entries:
            print(f"    {e['key']} = {e['value']}")


# ── Main ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":

    print_separator()
    print("OrbitDB Real-World Demo")
    print_separator()

    # Show both nodes' info
    for n in [1, 2]:
        info = get_info(n)
        label = "Bootstrap" if n == 1 else "Peer"
        print(f"Node {n} ({label})")
        print(f"  Peer ID    : {info['peerId']}")
        print(f"  DB address : {info.get('dbAddress', info.get('dbAddress'))}")
        peers = info.get("connectedPeers", [])
        print(f"  Connected peers: {len(peers)}")

    print_separator()

    # Write to node 1, read from node 2
    print("Test 1: Write to bootstrap node, read from peer node")
    set_value(1, "hello", "world")
    print("  Wrote hello=world to node 1")

    time.sleep(1)  # give gossipsub time to propagate

    val = get_value(2, "hello")
    print(f"  Read from node 2: hello = {val}")
    assert val == "world", f"Expected 'world', got '{val}'"
    print("  > Replication node1 → node2 works")

    print_separator()

    # Write to node 2, read from node 1
    print("Test 2: Write to peer node, read from bootstrap node")
    set_value(2, "ping", "pong")
    print("  Wrote ping=pong to node 2")

    time.sleep(1)

    val = get_value(1, "ping")
    print(f"  Read from node 1: ping = {val}")
    assert val == "pong", f"Expected 'pong', got '{val}'"
    print("  > Replication node2 → node1 works")

    print_separator()

    # Show full DB state on both nodes
    show_full_state()

    print_separator()

    # Interactive mode
    print("Interactive mode — write to any node, reads replicate automatically")
    print("Type 'quit' to exit\n")

    while True:
        try:
            node_input = input("Write to node (1 or 2, or 'quit'): ").strip()
            if node_input.lower() == "quit":
                break
            node = int(node_input)
            if node not in NODES:
                print("Invalid node number")
                continue

            key = input("Key   : ").strip()
            value = input("Value : ").strip()

            result = set_value(node, key, value)
            print(f" Stored on node {node}: {result}")

            time.sleep(1)

            other = 2 if node == 1 else 1
            replicated = get_value(other, key)
            print(f" Replicated to node {other}: {key} = {replicated}\n")
            
            print_separator()
            
            show_full_state()
            
            print_separator()

        except (KeyboardInterrupt, EOFError):
            break

    print("\nDone.")
