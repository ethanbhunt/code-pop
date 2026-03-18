# OrbitDB Real-World Demo

A two-node OrbitDB setup that mirrors how you'd structure a real application:
automatic peering, shared database address, and continuous gossipsub replication.

## Key differences from the original demo

| Original demo | This demo |
|---|---|
| Each node creates its own DB | One shared DB address for all nodes |
| Manual `/connect` HTTP call needed | Peer node dials bootstrap automatically on startup |
| Manual merge triggered by Python | Gossipsub replicates writes automatically |
| Breaks when writing to node 2 | Bidirectional replication works correctly |

## Setup

```bash
npm install
```

## Running

Open three terminals:

**Terminal 1 — Bootstrap node** (creates the DB, writes `peer-info.json`)
```bash
node bootstrap-node.js
```

**Terminal 2 — Peer node** (reads `peer-info.json`, dials bootstrap, opens same DB)
```bash
PORT=3001 node peer-node.js
```

**Terminal 3 — Python client**
```bash
python3 client.py
```

## How it works

1. `bootstrap-node.js` creates the OrbitDB keyvalue database and writes its
   address + multiaddr to `peer-info.json`.

2. `peer-node.js` reads `peer-info.json` at startup, dials the bootstrap node
   over libp2p/TCP, then opens the **same DB address**. OrbitDB's gossipsub
   sync kicks in automatically — no manual `/connect` call needed.

3. Any write to either node propagates to the other via gossipsub within ~1
   second. The Python client verifies bidirectional replication.

## Adding more peer nodes

```bash
PORT=3002 node peer-node.js
PORT=3003 node peer-node.js
```

Each new peer reads the same `peer-info.json` and joins the same database.

## REST API (both nodes expose the same endpoints)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/info` | Node info, peer ID, DB address, connected peers |
| POST | `/set` | `{ key, value }` — write to the DB |
| GET | `/get/:key` | Read a single key |
| GET | `/all` | Read all entries |

## Production considerations

In a real application you would also want:

- **Persistent peer ID** — use a keychain so nodes keep the same identity across restarts
- **Public bootstrap node** — host the bootstrap node on a server with a static IP
- **Multiple bootstrap nodes** — avoid a single point of failure
- **Access control** — OrbitDB supports identity-based write access control
- **DHT** — for peer discovery without knowing addresses upfront
