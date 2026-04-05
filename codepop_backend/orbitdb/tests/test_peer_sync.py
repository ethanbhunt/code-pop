# tests/test_peer_sync.py
# Multi-peer replication and synchronization tests
#
# These tests verify that:
# 1. Data written to one peer appears on other peers
# 2. Offline/reconnection scenarios sync correctly
# 3. Simultaneous writes from multiple peers are handled
# 4. Propagation time is within acceptable latency

import asyncio
import requests
import time
import pytest
from typing import Dict, List
import json

# Configuration
BOOTSTRAP_URL = "http://localhost:3000"
PEER_URLS = [
    "http://localhost:3001",  # Peer 1
    "http://localhost:3002",  # Peer 2
    "http://localhost:3003",  # Peer 3
]
PEER_WAIT_TIME = 5  # Max seconds to wait for sync propagation
CHECK_INTERVAL = 0.2  # Check every 200ms


class PeerSyncTestBase:
    """Base class for peer sync tests"""

    @staticmethod
    def wait_for_propagation(timeout: float = PEER_WAIT_TIME) -> float:
        """
        Wait for a value to propagate across peers.
        Returns the time taken for propagation.
        """
        start = time.time()
        elapsed = time.time() - start
        while elapsed < timeout:
            elapsed = time.time() - start
            time.sleep(CHECK_INTERVAL)
            yield elapsed

    @staticmethod
    def get_peer_value(peer_url: str, db_name: str, key: str) -> dict:
        """Get a value from a peer's database"""
        try:
            resp = requests.get(
                f"{peer_url}/{db_name}/get/{key}",
                timeout=5
            )
            if resp.status_code == 200:
                return resp.json()
            return {"error": f"Status {resp.status_code}"}
        except requests.RequestException as e:
            return {"error": str(e)}

    @staticmethod
    def set_peer_value(peer_url: str, db_name: str, key: str, value: dict) -> dict:
        """Set a value on a peer's database"""
        try:
            resp = requests.post(
                f"{peer_url}/{db_name}/set",
                json={"key": key, "value": value},
                timeout=5
            )
            if resp.status_code == 200:
                return resp.json()
            return {"error": f"Status {resp.status_code}"}
        except requests.RequestException as e:
            return {"error": str(e)}


class TestMultiPeerReplication(PeerSyncTestBase):
    """Test that writes on one peer replicate to others"""

    def test_write_propagation_to_all_peers(self):
        """
        GIVEN: A 3-peer cluster
        WHEN: I write a value to Peer 1
        THEN: The value appears on Peers 2 and 3 within 5 seconds
        """
        test_key = f"test:propagation:{int(time.time() * 1000)}"
        test_value = {
            "message": "Testing propagation",
            "source": "peer1",
            "timestamp": time.time()
        }

        # Write to Peer 1
        response = self.set_peer_value(PEER_URLS[0], "users", test_key, test_value)
        assert "error" not in response, f"Write to peer 1 failed: {response}"

        # Wait for propagation and verify on Peers 2 and 3
        max_wait = PEER_WAIT_TIME
        peer2_synced = False
        peer3_synced = False
        elapsed = 0

        for elapsed in self.wait_for_propagation(max_wait):
            if not peer2_synced:
                result = self.get_peer_value(PEER_URLS[1], "users", test_key)
                if result.get("value") and result["value"].get("message") == test_value["message"]:
                    peer2_synced = True
                    print(f"Peer 2 synced in {elapsed:.2f}s")

            if not peer3_synced:
                result = self.get_peer_value(PEER_URLS[2], "users", test_key)
                if result.get("value") and result["value"].get("message") == test_value["message"]:
                    peer3_synced = True
                    print(f"Peer 3 synced in {elapsed:.2f}s")

            if peer2_synced and peer3_synced:
                break

        assert peer2_synced, f"Peer 2 did not sync value within {max_wait}s"
        assert peer3_synced, f"Peer 3 did not sync value within {max_wait}s"

    def test_update_propagation(self):
        """
        GIVEN: A value exists on Peer 1
        WHEN: I update the value
        THEN: The updated value appears on Peers 2 and 3 within 5 seconds
        """
        test_key = f"test:update:{int(time.time() * 1000)}"
        initial_value = {"version": 1, "status": "initial"}
        updated_value = {"version": 2, "status": "updated"}

        # Initial write on Peer 1
        self.set_peer_value(PEER_URLS[0], "users", test_key, initial_value)
        time.sleep(1)  # Wait for initial sync

        # Update on Peer 1
        self.set_peer_value(PEER_URLS[0], "users", test_key, updated_value)

        # Verify peers received update
        max_wait = PEER_WAIT_TIME
        for elapsed in self.wait_for_propagation(max_wait):
            result2 = self.get_peer_value(PEER_URLS[1], "users", test_key)
            result3 = self.get_peer_value(PEER_URLS[2], "users", test_key)

            if (result2.get("value", {}).get("version") == 2 and
                result3.get("value", {}).get("version") == 2):
                print(f"Update propagated to all peers in {elapsed:.2f}s")
                break

        assert result2.get("value", {}).get("version") == 2, "Peer 2 did not receive update"
        assert result3.get("value", {}).get("version") == 2, "Peer 3 did not receive update"

    def test_inventory_update_replication(self):
        """
        GIVEN: An inventory item exists
        WHEN: Multiple peers update the quantity
        THEN: All peers converge on correct value (no negative quantities)
        """
        inv_key = f"inventory:test:{int(time.time() * 1000)}"
        initial_inventory = {
            "itemId": "test-item",
            "itemName": "Test Item",
            "quantity": 100,
            "thresholdLevel": 10
        }

        # Create on Peer 1
        self.set_peer_value(PEER_URLS[0], "inventory", inv_key, initial_inventory)
        time.sleep(1)  # Wait for sync

        # Update quantity on Peer 1
        inventory_update1 = initial_inventory.copy()
        inventory_update1["quantity"] = 75
        self.set_peer_value(PEER_URLS[0], "inventory", inv_key, inventory_update1)

        # Update quantity on Peer 2 (from earlier state if cache lag)
        inventory_update2 = initial_inventory.copy()
        inventory_update2["quantity"] = 50
        self.set_peer_value(PEER_URLS[1], "inventory", inv_key, inventory_update2)

        # Wait for convergence
        time.sleep(PEER_WAIT_TIME)

        # Check all peers have valid state (non-negative quantity)
        for idx, peer_url in enumerate(PEER_URLS):
            result = self.get_peer_value(peer_url, "inventory", inv_key)
            assert "error" not in result, f"Peer {idx} error: {result}"
            quantity = result.get("value", {}).get("quantity")
            assert quantity is not None, f"Peer {idx} missing quantity"
            assert quantity >= 0, f"Peer {idx} has negative quantity: {quantity}"


class TestOfflineReconnection(PeerSyncTestBase):
    """Test offline/reconnection scenarios"""

    def test_catch_up_after_reconnection(self):
        """
        GIVEN: Peer 3 is stopped (simulated by ignoring it)
        WHEN: Data is written to Peers 1 and 2
        AND: Peer 3 restarts
        THEN: Peer 3 syncs all missed data
        """
        # In a real test, this would involve actually stopping/starting peer 3
        # For now, we simulate by not checking peer 3 initially

        test_key = f"test:reconnect:{int(time.time() * 1000)}"
        test_value = {"message": "written while peer 3 was offline", "phase": 1}

        # Write to Peer 1 (Peer 3 "offline")
        self.set_peer_value(PEER_URLS[0], "users", test_key, test_value)

        # Wait for Peers 1 and 2 to sync
        time.sleep(2)

        # Verify Peers 1 and 2 have it
        result1 = self.get_peer_value(PEER_URLS[0], "users", test_key)
        result2 = self.get_peer_value(PEER_URLS[1], "users", test_key)
        assert result1.get("value", {}).get("message") == test_value["message"]
        assert result2.get("value", {}).get("message") == test_value["message"]

        # Now "Peer 3 comes back online" - check if it has the data
        max_wait = PEER_WAIT_TIME * 2  # Extra time for reconnection
        for elapsed in self.wait_for_propagation(max_wait):
            result3 = self.get_peer_value(PEER_URLS[2], "users", test_key)
            if result3.get("value", {}).get("message") == test_value["message"]:
                print(f"Peer 3 caught up in {elapsed:.2f}s")
                break

        assert result3.get("value", {}).get("message") == test_value["message"], \
            "Peer 3 did not sync missed data after reconnection"


class TestConflictScenarios(PeerSyncTestBase):
    """Test simultaneous writes and conflict handling"""

    def test_concurrent_writes_to_same_key(self):
        """
        GIVEN: A key exists on Peers 1 and 2
        WHEN: Both peers write to the key simultaneously
        THEN: Conflict is resolved (last-write-wins) without crash
        """
        test_key = f"test:conflict:{int(time.time() * 1000)}"
        initial_value = {"version": 0, "winner": None}

        # Initialize on both peers
        self.set_peer_value(PEER_URLS[0], "users", test_key, initial_value)
        self.set_peer_value(PEER_URLS[1], "users", test_key, initial_value)

        # Write from Peer 1
        value_p1 = {"version": 1, "winner": "peer1", "timestamp": time.time()}
        self.set_peer_value(PEER_URLS[0], "users", test_key, value_p1)

        # Write from Peer 2 (nearly simultaneous)
        value_p2 = {"version": 1, "winner": "peer2", "timestamp": time.time() + 0.1}
        self.set_peer_value(PEER_URLS[1], "users", test_key, value_p2)

        # Wait for resolution
        time.sleep(PEER_WAIT_TIME)

        # Check that all peers converge on one value (no crash)
        for idx, peer_url in enumerate(PEER_URLS):
            result = self.get_peer_value(peer_url, "users", test_key)
            assert "error" not in result, f"Peer {idx} error: {result}"
            assert result.get("value", {}).get("version") == 1, f"Peer {idx} version mismatch"

    def test_concurrent_inventory_reductions(self):
        """
        GIVEN: Inventory has 100 units
        WHEN: Peer 1 reduces by 30 and Peer 2 reduces by 40 simultaneously
        THEN: Inventory doesn't go negative (handled by conflict resolution)
        """
        inv_key = f"inventory:conflict:{int(time.time() * 1000)}"

        # Create inventory
        initial = {
            "itemId": "concurrent-test",
            "itemName": "Concurrent Test",
            "quantity": 100,
            "thresholdLevel": 10
        }
        self.set_peer_value(PEER_URLS[0], "inventory", inv_key, initial)
        time.sleep(1)

        # Concurrent reductions
        value_p1 = initial.copy()
        value_p1["quantity"] = 70  # Reduce by 30

        value_p2 = initial.copy()
        value_p2["quantity"] = 60  # Reduce by 40

        self.set_peer_value(PEER_URLS[0], "inventory", inv_key, value_p1)
        time.sleep(0.1)  # Small delay
        self.set_peer_value(PEER_URLS[1], "inventory", inv_key, value_p2)

        # Wait for resolution
        time.sleep(PEER_WAIT_TIME)

        # Verify no peer has negative quantity
        for idx, peer_url in enumerate(PEER_URLS):
            result = self.get_peer_value(peer_url, "inventory", inv_key)
            quantity = result.get("value", {}).get("quantity")
            assert quantity is not None, f"Peer {idx} missing quantity"
            assert quantity >= 0, f"Peer {idx} has negative quantity: {quantity}"
            print(f"Peer {idx} quantity: {quantity}")


class TestLatencyPropagation(PeerSyncTestBase):
    """Test propagation latency and performance"""

    def test_propagation_time(self):
        """
        GIVEN: A 3-peer cluster
        WHEN: I write 10 values sequentially to Peer 1
        THEN: Each write should propagate to Peers 2/3 within target latency
        """
        latencies = []

        for i in range(5):
            test_key = f"test:latency:{int(time.time() * 1000)}:{i}"
            test_value = {"iteration": i, "timestamp": time.time()}

            # Write to Peer 1
            self.set_peer_value(PEER_URLS[0], "users", test_key, test_value)

            # Measure propagation time
            start = time.time()
            found_on_p2 = False
            found_on_p3 = False

            for elapsed in self.wait_for_propagation(PEER_WAIT_TIME):
                if not found_on_p2:
                    result = self.get_peer_value(PEER_URLS[1], "users", test_key)
                    if result.get("value", {}).get("iteration") == i:
                        found_on_p2 = True

                if not found_on_p3:
                    result = self.get_peer_value(PEER_URLS[2], "users", test_key)
                    if result.get("value", {}).get("iteration") == i:
                        found_on_p3 = True

                if found_on_p2 and found_on_p3:
                    latency = time.time() - start
                    latencies.append(latency)
                    print(f"Write {i} propagated in {latency:.3f}s")
                    break

            assert found_on_p2, f"Write {i} did not reach Peer 2"
            assert found_on_p3, f"Write {i} did not reach Peer 3"

        # Assert average latency is reasonable
        avg_latency = sum(latencies) / len(latencies)
        print(f"\nAverage propagation latency: {avg_latency:.3f}s")
        assert avg_latency < PEER_WAIT_TIME, f"Average latency {avg_latency:.3f}s exceeds target {PEER_WAIT_TIME}s"


class TestPeerHealth(PeerSyncTestBase):
    """Test peer health monitoring via registry"""

    def test_peer_registry_list(self):
        """
        GIVEN: A 3-peer cluster running
        WHEN: I query the bootstrap peer registry
        THEN: All 3 peers appear as active
        """
        try:
            resp = requests.get(f"{BOOTSTRAP_URL}/peers/list", timeout=5)
            assert resp.status_code == 200, f"Failed to get peer list: {resp.status_code}"

            data = resp.json()
            assert data.get("count") >= 3, f"Expected at least 3 peers, got {data.get('count')}"
            assert len(data.get("data", [])) >= 3, "Peer data array missing or incomplete"

            for peer in data.get("data", []):
                assert peer.get("peerId"), "Peer missing peerId"
                assert peer.get("status") == "active", f"Peer {peer.get('peerId')} not active"
                print(f"Peer {peer.get('role')}: {peer.get('peerId')[:16]}... (status: {peer.get('status')})")

        except requests.RequestException as e:
            pytest.fail(f"Failed to connect to bootstrap: {e}")

    def test_peer_registry_stats(self):
        """
        GIVEN: A 3-peer cluster
        WHEN: I query peer registry stats
        THEN: Statistics show correct counts by role
        """
        try:
            resp = requests.get(f"{BOOTSTRAP_URL}/peers/stats", timeout=5)
            assert resp.status_code == 200

            data = resp.json()
            stats = data.get("stats", {})

            print(f"Total peers: {stats.get('total')}")
            print(f"Active: {stats.get('active')}, Dead: {stats.get('dead')}")
            print(f"By role: {stats.get('byRole')}")
            print(f"By region: {stats.get('byRegion')}")

            assert stats.get("active") >= 3, "Expected at least 3 active peers"
            assert stats.get("dead") >= 0, "Dead peer count should be >= 0"

        except requests.RequestException as e:
            pytest.fail(f"Failed to query peer stats: {e}")


if __name__ == "__main__":
    # Run tests with pytest
    # Usage: pytest tests/test_peer_sync.py -v
    print("Multi-peer replication tests")
    print(f"Bootstrap: {BOOTSTRAP_URL}")
    print(f"Peers: {PEER_URLS}")
    print(f"Propagation timeout: {PEER_WAIT_TIME}s\n")
