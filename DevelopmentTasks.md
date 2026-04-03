# CodePop Development Tasks

## Purpose
This document is the execution-focused backlog for the current delivery phase.

## Current Delivery Focus
- Normalize the frontend runtime around OrbitDB-backed endpoints and shared environment configuration.
- Finish container and Cloud Run scaffolding for the backend, dashboard, and OrbitDB peer services.
- Expand automated test coverage for the mobile app, dashboard, backend, and OrbitDB endpoints.
- Consolidate the remaining setup and deployment guidance into the canonical root docs.

## Delivery Snapshot
- Done: Fix backend route bindings and expose the fulfillment path cleanly.
- Done: Complete the must-have multi-store schema and APIs for stores, supply hubs, inventory, transfers, and audit logging.
- In progress: Finish OrbitDB peer/bootstrap sync, service discovery, and migration/sync plumbing.
- Done: Replace dashboard placeholder logistics and maintenance flows with real backend data.
- In progress: Complete the remaining mobile screens that are already in navigation but not fully functional.
- Done: Add the critical tests around fulfillment, inventory deduction, role dashboards, auth, and startup health.
- In progress: Tighten deployment docs and env handling for Docker, Cloud Build, and production secrets.

## MUST HAVE
- Task-001 Multi-store database schema
- Task-002 Supply hub network implementation
- Task-003 Automated inventory deduction
- Task-004 AI demand prediction service
- Task-005 Inventory permissions & audit logging
- Task-006 Logistics Manager dashboard
- Task-007 Decentralized sync & conflict resolution
- Task-008 Service discovery & peer handshake
- Task-009 Maintenance tracking & repair workflow
- Task-010 Inter-store PKI signature verification
- Task-011 Test data completion & seeder automation

## NEAR-TERM OPERATIONAL FOLLOW-UP
- Task-014 Manager low-stock alerts
- Task-015 Response filtering for chatbot

## Notes
- Redis caching, bulk drink fetch, fault-tolerance/audit hardening, repair optimization, accessibility hardening, saved payment methods, loyalty, social features, ratings, complaints, seasonal menu expansion, historical maintenance records, forecast analytics, CSV exports, and system-wide admin reports are intentionally deferred.
- Keep new work aligned to the production OrbitDB deployment path.
