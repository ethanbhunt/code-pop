# CodePop Distributed Database Setup Guide

## 1. Purpose and Scope

This document explains how to set up the planned distributed database environment for CodePop after the frontend split into:

- a mobile ordering app for customer ordering
- a web app for manager, logistics, admin, and repair dashboards

Both frontends are clients of backend services. Neither frontend connects directly to any database.

## 2. Target Topology

### 2.1 Node Types

The distributed rollout uses separate backend nodes and separate databases for each operational site.

- Each store has its own backend service and its own local operational database.
- Each regional supply hub has its own backend service and its own hub database.
- Dashboard users access web services exposed by store nodes, hub nodes, or regional API gateways if one is introduced later.
- Mobile ordering users interact with the backend for their selected store.

### 2.2 Regional Layout

The required supply hubs are:

- Region A: Chicago, IL
- Region B: New Jersey / New York
- Region C: Logan, UT
- Region D: Dallas, TX
- Region E: Atlanta, GA
- Region F: Phoenix, AZ
- Region G: Boise, ID

The initial data model must support:

- 7 supply hubs total
- 20 stores in Region C
- at least 5 stores in neighboring regions
- cross-region hub fulfillment up to 1000 miles

### 2.3 Database Responsibility Model

Each node stores its own operational truth first, then synchronizes selected records to peers and hubs.

- Store databases own local orders, local inventory position, local machine status, local staff actions, and local audit logs.
- Hub databases own regional stock availability, inbound and outbound transfers, logistics planning records, and hub audit logs.
- Shared cross-node state is propagated through signed events, not by direct cross-database queries.

## 3. Planning Assumptions

The current repository does not yet implement the full distributed design. This guide therefore records the required setup steps and identifies future-state assumptions that must be implemented to make the deployment real.

Assumptions used in this guide:

- PostgreSQL remains the primary database engine for store and hub nodes.
- Django remains the backend platform that applies schema and enforces business rules.
- Every node exposes authenticated APIs for synchronization and service discovery.
- Synchronization is event-driven with durable local queues.
- Inter-node messages are signed and verified through a PKI-based trust model.

If the team changes the database engine, transport protocol, or trust model later, this guide must be updated before deployment.

## 4. Prerequisites

Before creating any distributed databases, prepare the following for every store node and every hub node.

### 4.1 Infrastructure Prerequisites

- A host or VM for each store node
- A host or VM for each regional hub node
- Stable hostnames or static IP addresses for every node
- TLS certificates for all backend endpoints
- Firewall rules that allow only approved store-to-store and store-to-hub traffic
- Secure time synchronization on every node because conflict resolution depends on timestamps

### 4.2 Software Prerequisites

- PostgreSQL installed and pinned to a team-approved major version
- Python, Django, and required backend dependencies installed on each node
- Migration tooling available on each node
- Backup tooling for PostgreSQL dump and restore operations
- Key management process for generating, distributing, rotating, and revoking node certificates

### 4.3 Environment Variables Per Node

Each node must have a local environment file or secret bundle containing at least:

- `NODE_ID`: unique node identifier
- `NODE_TYPE`: `store` or `hub`
- `REGION_ID`: one of `A` through `G`
- `STORE_ID` for store nodes only
- `HUB_ID` for hub nodes only
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `DB_HOST`
- `DB_PORT`
- `API_BASE_URL`
- `PEER_DISCOVERY_URL` or equivalent peer bootstrap list
- `PRIVATE_KEY_PATH`
- `PUBLIC_CERT_PATH`
- `TRUST_STORE_PATH`

## 5. Bootstrap Order

Provision a new environment in the following order. Do not change the order unless the implementation introduces automation that preserves the same dependencies.

1. Assign a node identity, region, and network address.
2. Generate node keys and issue node certificates.
3. Create the PostgreSQL instance for that node.
4. Create the node database and least-privilege database user.
5. Apply the shared base schema.
6. Apply the distributed multi-store schema extensions.
7. Seed required hub, store, and role metadata.
8. Register peer and hub directory records.
9. Enable local event queue tables and audit log tables.
10. Configure synchronization workers and retry settings.
11. Install trusted certificates for allowed peers.
12. Run service discovery and signed-handshake validation.
13. Run a synchronization test with a staged outage and replay.

## 6. Database Naming and Node Provisioning

### 6.1 Naming Convention

Use one database per operational node.

- Store database pattern: `codepop_store_<region>_<store_id>`
- Hub database pattern: `codepop_hub_<region>_<hub_id>`

Examples:

- `codepop_store_C_001`
- `codepop_store_C_020`
- `codepop_hub_C_001`

### 6.2 Database User Convention

Each node must use a dedicated database user with access limited to its own database.

- Store user pattern: `store_<region>_<store_id>_svc`
- Hub user pattern: `hub_<region>_<hub_id>_svc`

Do not reuse one shared PostgreSQL account across all nodes.

### 6.3 Required Schema Groups

Every node database must contain the following schema groups.

- Core application tables
- Multi-store ownership tables
- Synchronization and replay tables
- Audit and signature verification tables
- Peer directory and heartbeat tables

The current repository only partially defines these groups in code. The remaining groups are required by the backlog and requirements even if migrations do not yet exist.

## 7. Shared Schema Requirements

Apply the standard CodePop application schema first, then extend it for distributed operation.

### 7.1 Core Tables Expected on Store Nodes

Store nodes must contain tables for:

- users and roles needed for local operations
- preferences
- drinks and drink ingredients
- inventory
- orders and order items
- notifications
- machine maintenance and repair history
- local audit logs

### 7.2 Core Tables Expected on Hub Nodes

Hub nodes must contain tables for:

- hub inventory
- stock transfers
- supply requests
- logistics planning and recommendations
- regional maintenance coordination references if required later
- hub audit logs

### 7.3 Distributed Extension Tables

Add or reserve schema for the following entities:

- `stores`
- `supply_hubs`
- `stock_transfers`
- `peer_registry`
- `peer_heartbeats`
- `sync_events`
- `sync_event_attempts`
- `conflict_resolutions`
- `audit_log`
- `trusted_peers`
- `key_rotation_history`

### 7.4 Ownership Columns and Indexes

All operational records that can exist on more than one node must include ownership and routing fields.

Minimum required ownership columns:

- `store_id` where data belongs to one store
- `hub_id` where data belongs to one hub
- `region_id` for routing and reporting
- `created_at`
- `updated_at`
- `origin_node_id`
- `last_synced_at`
- `event_id` or equivalent idempotency identifier for synchronized changes

Create indexes on:

- `store_id`
- `hub_id`
- `region_id`
- `event_id`
- `created_at`
- `updated_at`
- any foreign keys introduced for distributed routing

## 8. Store Node Setup

Perform these steps for every store node.

### 8.1 Create the Database

1. Create a PostgreSQL database using the store naming convention.
2. Create a node-specific service account.
3. Grant only the privileges required for migrations, application access, and backup.
4. Block remote administrative access unless explicitly needed.

### 8.2 Apply Schema

1. Apply the base Django migrations.
2. Apply the multi-store schema migrations.
3. Apply maintenance, logistics, and audit schema migrations.
4. Verify that all ownership columns and indexes were created.

### 8.3 Seed Store Metadata

Insert or seed:

- store record
- region assignment
- assigned regional hub reference
- store status and onboarding state
- local manager and admin roles
- machine inventory baseline if known

### 8.4 Enable Local-Only Operational Tables

The store node must persist the following locally even while disconnected:

- order intake and completion state
- inventory deductions and adjustments
- local machine status transitions
- customer preferences when relevant to that store
- local audit trail
- offline sync queue entries

### 8.5 Register Peers

Each store must register:

- its assigned hub endpoint
- trusted in-region peer endpoints
- public key fingerprints for those peers
- heartbeat interval and retry policy

## 9. Hub Node Setup

Perform these steps for every regional hub node.

### 9.1 Create the Database

1. Create a PostgreSQL database using the hub naming convention.
2. Create a node-specific service account.
3. Grant only hub-specific privileges.
4. Restrict inbound database access to approved internal administrators and the local hub service.

### 9.2 Apply Schema

1. Apply the base Django migrations needed by shared modules.
2. Apply multi-store, logistics, and transfer-tracking migrations.
3. Apply sync, audit, and signature-verification migrations.
4. Verify hub indexes for routing, transfer status, and delivery range lookups.

### 9.3 Seed Hub Metadata

Insert or seed:

- hub record
- region assignment
- maximum delivery radius
- logistics manager role
- initial stock catalog
- neighboring region reachability rules

### 9.4 Register Regional Stores

For each hub, create or import directory records for all stores in its region, including:

- store ID
- region ID
- network endpoint
- certificate fingerprint
- operational status
- last heartbeat timestamp

## 10. Seed Data Requirements

The initial production-like rollout must seed the database network with at least the following business entities.

### 10.1 Supply Hubs

Create seven hub records, one for each required region.

### 10.2 Stores

Create:

- 20 stores in Region C
- at least 5 stores in neighboring regions

Each store record must include:

- store ID
- region ID
- assigned hub ID
- location metadata
- operational status
- API endpoint
- public certificate fingerprint

### 10.3 Staff Roles

Seed:

- one `logistics_manager` per hub
- one `repair_staff` for Region C
- required `manager`, `admin`, and `super_admin` records according to the access model

## 11. Synchronization and Event Queue Setup

Direct database replication is not the source of truth for business synchronization in this design. Each node publishes and receives signed events.

### 11.1 Event Queue Tables

Create a durable local event table on every node with at least:

- `event_id`
- `origin_node_id`
- `target_scope`
- `aggregate_type`
- `aggregate_id`
- `event_type`
- `payload`
- `created_at`
- `attempt_count`
- `last_attempt_at`
- `status`
- `signature`

Create an event-attempt table that tracks:

- event delivery target
- attempt timestamp
- response code
- failure reason
- next retry time

### 11.2 Business Domains That Must Sync

Configure synchronization for:

- inventory usage and adjustments
- stock transfers
- maintenance logs and machine status changes
- demand metrics and demand-prediction inputs
- peer heartbeat updates
- security and audit events where policy requires cross-node visibility

### 11.3 Retry Policy

Every node must implement:

- exponential backoff for failed deliveries
- idempotent replay using `event_id`
- dead-letter handling for events that exceed retry thresholds
- alerting when queue depth or replay age exceeds operational thresholds

## 12. Conflict Resolution Setup

The requirements call for timestamp-based or priority-based reconciliation. Because the exact tie-break implementation is not yet defined in code, configure the system with the following minimum policy.

### 12.1 Required Ordering Inputs

Every synchronized change must carry:

- `event_id`
- `origin_node_id`
- `origin_role`
- `created_at`
- `logical_priority`
- `aggregate_version` if versioning is added

### 12.2 Minimum Reconciliation Rules

1. Reject duplicate events by `event_id`.
2. Prefer the higher `logical_priority` when two valid updates conflict.
3. If priorities match, prefer the later trusted timestamp.
4. If timestamps also match, prefer the lexicographically lower `origin_node_id` as a deterministic fallback.
5. Record every resolved conflict in `conflict_resolutions` for auditability.

### 12.3 Data Classes That Need Explicit Rules

Create per-domain reconciliation rules for at least:

- inventory quantity adjustments
- stock transfer state transitions
- machine status transitions
- peer directory updates
- demand metric aggregates

## 13. Service Discovery and Peer Handshake Setup

The requirements and backlog expect automatic peer discovery for new stores.

### 13.1 Peer Directory Schema

Each node must store:

- peer node ID
- node type
- region ID
- endpoint URL
- certificate fingerprint
- public key identifier
- last heartbeat time
- node status

### 13.2 New Store Bootstrap Sequence

When a new store is opened:

1. Provision its database and apply the full schema.
2. Seed the store metadata and assigned hub reference.
3. Install the store certificate and trust store.
4. Submit a signed registration payload to the assigned hub and approved regional peers.
5. Validate the returned certificates before storing them.
6. Begin heartbeat publication.
7. Run a test sync event and verify acknowledgment.

### 13.3 Handshake Validation Requirements

A node must not accept operational updates from another node until it validates:

- certificate chain or trusted certificate mapping
- node identifier
- region and role permissions
- request signature
- freshness of timestamp or nonce

## 14. PKI and Trust Store Setup

Because all inter-store communications must be digitally signed, every node requires local trust configuration before it can join the network.

### 14.1 Required Trust Material

Each node must have:

- one private signing key
- one public certificate
- one trust store containing approved peer and hub certificates
- one revocation source or revocation list

### 14.2 Key Provisioning Steps

1. Generate a private key on the target node or in approved secure provisioning infrastructure.
2. Issue a node certificate tied to the node ID and role.
3. Store the private key in a restricted filesystem path or managed secret store.
4. Distribute the public certificate to trusted hubs and peers.
5. Record the certificate fingerprint in `trusted_peers`.

### 14.3 Rotation and Revocation

Document and automate the following where possible:

- certificate expiration dates
- scheduled rotation windows
- emergency key revocation
- removal of compromised peers from trust stores
- replay rejection for messages signed with revoked keys

## 15. Backup, Restore, and Recovery

Every node is operationally independent, so backup and recovery must also be independent.

### 15.1 Backup Policy

For each store and hub database:

- take regular logical backups
- protect backups with encryption at rest
- replicate backups to an off-node location
- retain backups according to team policy
- verify restore usability on a schedule

### 15.2 Restore Policy

When restoring a node:

1. Restore the latest valid database backup.
2. Restore the trust store and certificate material.
3. Restore or rebuild the pending sync queue.
4. Rejoin the node to peer discovery in read-only or limited-sync mode first.
5. Replay missed events.
6. Verify conflict logs before allowing full write traffic.

### 15.3 Rejoin After Extended Outage

If a store has been offline long enough to accumulate stale data:

1. Freeze outbound sync.
2. Pull the latest trusted directory and hub metadata.
3. Compare local high-water marks for event replay.
4. Replay missing inbound events.
5. Resolve conflicts using the configured reconciliation rules.
6. Resume normal traffic only after queue depth returns to baseline.

## 16. Verification Checklist

Do not mark a region or store as ready until all of the following checks pass.

### 16.1 Database Readiness

- The node database exists with the correct naming convention.
- The node service account is least-privilege.
- Base schema and distributed schema both applied successfully.
- Required ownership columns and indexes exist.

### 16.2 Seed Validation

- Seven supply hubs exist network-wide.
- Region C contains 20 stores.
- Neighboring regions contain at least 5 stores each where required.
- Required roles are present.

### 16.3 Trust Validation

- Node certificates are installed.
- Trust stores contain only approved peers.
- Signed handshake validation succeeds.
- Revoked or unknown peers are rejected.

### 16.4 Sync Validation

- Heartbeats are visible in peer directories.
- A test inventory event can be queued and delivered.
- The receiving node accepts the event exactly once.
- A simulated outage followed by replay succeeds.
- Conflict logging captures at least one forced conflict test.

### 16.5 Frontend Boundary Validation

- The mobile ordering app uses backend APIs for its selected store only.
- The web dashboard app uses backend APIs for hub, store, or regional views.
- No frontend credential bundle includes direct database access.

## 17. Implementation Gaps to Track

The following items are required by the distributed design but are not fully represented in the current repository implementation.

- concrete Django migrations for all distributed tables
- peer discovery protocol details
- signed handshake payload schema
- sync worker implementation
- dead-letter queue handling
- final logical-priority definitions per domain
- automated key rotation and revocation workflow

Treat this guide as the deployment target and implementation checklist for Task-001, Task-002, Task-007, Task-008, and Task-010.
