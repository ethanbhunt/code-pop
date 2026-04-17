#!/usr/bin/env python3
"""
Comprehensive test script for all CodePop endpoints
Tests all 12 new endpoints plus store-scoped functionality
"""

import requests
import json
import time
from datetime import datetime, timedelta

BASE_URL = "http://localhost:3001/backend"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    YELLOW = '\033[93m'
    END = '\033[0m'

class CodePopTester:
    def __init__(self):
        self.tokens = {}
        self.created_ids = {
            'stores': [],
            'machines': [],
            'transfers': [],
            'orders': [],
            'inventory': None
        }
        self.test_count = 0
        self.passed = 0
        self.failed = 0

    def log(self, message, color=Colors.BLUE):
        print(f"{color}[TEST] {message}{Colors.END}")

    def success(self, message):
        self.log(message, Colors.GREEN)
        self.passed += 1

    def error(self, message):
        self.log(message, Colors.RED)
        self.failed += 1

    def test(self, name, method, endpoint, data=None, auth_token=None, expected_status=None):
        """Make a test request"""
        self.test_count += 1
        url = f"{BASE_URL}{endpoint}"
        headers = {"Content-Type": "application/json"}
        
        if auth_token:
            headers["Authorization"] = f"Token {auth_token}"
        
        try:
            if method == "GET":
                response = requests.get(url, headers=headers)
            elif method == "POST":
                response = requests.post(url, json=data, headers=headers)
            elif method == "PATCH":
                response = requests.patch(url, json=data, headers=headers)
            elif method == "DELETE":
                response = requests.delete(url, headers=headers)
            else:
                self.error(f"{name}: Unknown method {method}")
                return None
            
            if expected_status and response.status_code != expected_status:
                self.error(f"{name}: Expected {expected_status}, got {response.status_code}")
                print(f"  Response: {response.text[:200]}")
                return None
            
            self.success(f"{name}")
            return response.json() if response.text else None
        except Exception as e:
            self.error(f"{name}: {str(e)}")
            return None

    def setup_users(self):
        """Create test users with different roles"""
        self.log("\n=== SETTING UP TEST USERS ===")
        
        users = [
            {"username": "customer1", "password": "TestPass123!", "email": "customer1@test.com", "userRole": "customer"},
            {"username": "manager1", "password": "TestPass123!", "email": "manager1@test.com", "userRole": "manager"},
            {"username": "repair1", "password": "TestPass123!", "email": "repair1@test.com", "userRole": "repair"},
            {"username": "admin1", "password": "TestPass123!", "email": "admin1@test.com", "userRole": "admin"},
            {"username": "super_admin1", "password": "TestPass123!", "email": "super_admin1@test.com", "userRole": "super_admin"},
        ]
        
        for user in users:
            response = self.test(
                f"Register {user['username']}",
                "POST",
                "/auth/register",
                data=user,
                expected_status=201
            )
            if response and "data" in response:
                token = response["data"].get("token")
                self.tokens[user['username']] = token
                self.log(f"  Token for {user['username']}: {token[:10]}...", Colors.YELLOW)

    def test_stores(self):
        """Test store management endpoints"""
        self.log("\n=== TESTING STORES (NEW) ===")
        
        # List stores
        response = self.test(
            "List all stores (super_admin)",
            "GET",
            "/stores",
            auth_token=self.tokens.get("super_admin1"),
            expected_status=200
        )
        
        # Get specific store
        if response:
            self.test(
                "Get store #1 (super_admin)",
                "GET",
                "/stores/1",
                auth_token=self.tokens.get("super_admin1"),
                expected_status=200
            )
        
        # Get store-scoped inventory
        self.test(
            "Get store #1 inventory (manager)",
            "GET",
            "/stores/1/inventory",
            auth_token=self.tokens.get("manager1"),
            expected_status=200
        )

    def test_inventory(self):
        """Test store-scoped inventory endpoints"""
        self.log("\n=== TESTING STORE-SCOPED INVENTORY ===")
        
        # Create inventory item for store 1
        response = self.test(
            "Create inventory item (admin)",
            "POST",
            "/inventory",
            data={
                "storeId": 1,
                "itemName": "Vanilla Syrup",
                "itemType": "Syrup",
                "quantity": 50,
                "thresholdLevel": 10,
                "costPerUnit": 12.50,
                "supplier": "Local Supplier Co."
            },
            auth_token=self.tokens.get("admin1"),
            expected_status=201
        )
        
        if response and "data" in response:
            inv_id = response["data"].get("inventoryId")
            self.created_ids['inventory'] = inv_id
            
            # Get store inventory with storeId parameter
            self.test(
                "Get store #1 inventory via inventory endpoint",
                "GET",
                "/inventory?storeId=1",
                auth_token=self.tokens.get("manager1"),
                expected_status=200
            )

    def test_orders_store_scoped(self):
        """Test store-scoped order endpoints"""
        self.log("\n=== TESTING STORE-SCOPED ORDERS ===")
        
        # Customer creates order for store 1
        response = self.test(
            "Create order for store #1 (customer)",
            "POST",
            "/orders",
            data={
                "storeId": 1,
                "drinkIds": [1],
                "quantities": [1],
                "specialInstructions": "extra hot"
            },
            auth_token=self.tokens.get("customer1"),
            expected_status=201
        )
        
        if response and "data" in response:
            order_id = response["data"].get("orderId")
            self.created_ids['orders'].append(order_id)
            
            # Manager views orders for their store
            self.test(
                "Manager views orders for store #1",
                "GET",
                "/orders?storeId=1",
                auth_token=self.tokens.get("manager1"),
                expected_status=200
            )
            
            # Customer views their own orders
            self.test(
                "Customer views own orders",
                "GET",
                "/orders",
                auth_token=self.tokens.get("customer1"),
                expected_status=200
            )

    def test_maintenance(self):
        """Test machine maintenance endpoints"""
        self.log("\n=== TESTING MAINTENANCE ENDPOINTS (NEW) ===")
        
        # Create machine
        response = self.test(
            "Create machine for store #1 (admin)",
            "POST",
            "/maintenance/machines",
            data={
                "storeId": 1,
                "name": "Front Espresso Machine",
                "model": "Rancilio Silvia",
                "status": "operational",
                "serviceInterval": 30
            },
            auth_token=self.tokens.get("admin1"),
            expected_status=201
        )
        
        if response and "data" in response:
            machine_id = response["data"].get("machineId")
            self.created_ids['machines'].append(machine_id)
            
            # Machines are store-scoped; repair access uses assignedStores (store 1 for dev repair users).
            
            # Repair user views machines in their stores
            self.test(
                "Repair user views machines in assigned stores",
                "GET",
                "/maintenance/assignments/me",
                auth_token=self.tokens.get("repair1"),
                expected_status=200
            )
            
            # Record status transition
            response = self.test(
                "Record machine status transition",
                "POST",
                "/maintenance/status-transitions",
                data={
                    "machineId": machine_id,
                    "newStatus": "in_service",
                    "reason": "Routine maintenance",
                    "notes": "Cleaned portafilter and seals"
                },
                auth_token=self.tokens.get("repair1"),
                expected_status=201
            )
            
            # Get machine history
            self.test(
                "Get machine history (paged)",
                "GET",
                f"/maintenance/history?machineId={machine_id}&page=1&limit=25",
                auth_token=self.tokens.get("repair1"),
                expected_status=200
            )
            
            # List machines for store
            self.test(
                "Manager views machines for store #1",
                "GET",
                "/maintenance/machines?storeId=1",
                auth_token=self.tokens.get("manager1"),
                expected_status=200
            )

    def test_logistics(self):
        """Test logistics and transfer endpoints"""
        self.log("\n=== TESTING LOGISTICS ENDPOINTS (NEW) ===")
        
        # Create transfer
        response = self.test(
            "Create transfer from store 1→2",
            "POST",
            "/logistics/transfers",
            data={
                "sourceStoreId": 1,
                "destStoreId": 2,
                "items": [
                    {"inventoryId": self.created_ids.get('inventory', 1), "quantity": 10}
                ],
                "scheduledDate": (datetime.now() + timedelta(days=1)).isoformat()
            },
            auth_token=self.tokens.get("manager1"),
            expected_status=201
        )
        
        if response and "data" in response:
            transfer_id = response["data"].get("transferId")
            self.created_ids['transfers'].append(transfer_id)
            
            # Update transfer status
            self.test(
                "Update transfer status to in_transit",
                "PATCH",
                f"/logistics/transfers/{transfer_id}",
                data={"status": "in_transit"},
                auth_token=self.tokens.get("manager1"),
                expected_status=200
            )
            
            # List transfers
            self.test(
                "List transfers for store #1",
                "GET",
                "/logistics/transfers?storeId=1",
                auth_token=self.tokens.get("manager1"),
                expected_status=200
            )
            
            # Create delivery assignment
            response = self.test(
                "Create delivery assignment",
                "POST",
                "/logistics/delivery-assignments",
                data={
                    "transferId": transfer_id,
                    "driverId": 2,  # Some user
                    "vehicle": "Van A",
                    "estimatedArrival": (datetime.now() + timedelta(hours=2)).isoformat(),
                    "constraints": {"maxWeight": 100, "maxVolume": 50}
                },
                auth_token=self.tokens.get("manager1"),
                expected_status=201
            )
            
            # List delivery assignments
            self.test(
                "List delivery assignments",
                "GET",
                f"/logistics/delivery-assignments?transferId={transfer_id}",
                auth_token=self.tokens.get("manager1"),
                expected_status=200
            )

    def test_reorder_notifications(self):
        """Test reorder notification endpoints"""
        self.log("\n=== TESTING REORDER NOTIFICATIONS (NEW) ===")
        
        # Create reorder notification
        self.test(
            "Create reorder notification",
            "POST",
            "/notifications/reorder",
            data={
                "storeId": 1,
                "inventoryId": self.created_ids.get('inventory', 1),
                "itemName": "Vanilla Syrup",
                "threshold": 10,
                "currentQuantity": 8
            },
            auth_token=self.tokens.get("manager1"),
            expected_status=201
        )
        
        # Get reorder notifications
        self.test(
            "Get reorder notifications for store #1",
            "GET",
            "/notifications/reorder?storeId=1&status=pending",
            auth_token=self.tokens.get("manager1"),
            expected_status=200
        )

    def test_admin_reports(self):
        """Test admin reporting endpoints"""
        self.log("\n=== TESTING ADMIN REPORTS (NEW) ===")
        
        # Get multi-store report
        self.test(
            "Get multi-store system report",
            "GET",
            "/admin/system-reports/multi-store?storeIds=1,2,3",
            auth_token=self.tokens.get("super_admin1"),
            expected_status=200
        )

    def test_revenues_store_scoped(self):
        """Test store-filtered revenue endpoints"""
        self.log("\n=== TESTING STORE-FILTERED REVENUE REPORTS ===")
        
        # Note: This requires actual revenue data, which would be created after orders are completed
        self.test(
            "Get revenue report for store #1",
            "GET",
            f"/revenues/report?storeId=1&startDate={(datetime.now() - timedelta(days=30)).date()}&endDate={datetime.now().date()}",
            auth_token=self.tokens.get("manager1"),
            expected_status=200
        )

    def run_all_tests(self):
        """Run all tests"""
        self.log("\n" + "="*60)
        self.log("CODEPOP COMPREHENSIVE ENDPOINT TESTS", Colors.BLUE)
        self.log("="*60)
        
        self.setup_users()
        self.test_stores()
        self.test_inventory()
        self.test_orders_store_scoped()
        self.test_maintenance()
        self.test_logistics()
        self.test_reorder_notifications()
        self.test_admin_reports()
        self.test_revenues_store_scoped()
        
        # Print summary
        self.log("\n" + "="*60)
        self.log("TEST SUMMARY", Colors.BLUE)
        self.log("="*60)
        self.log(f"Total Tests: {self.test_count}")
        self.success(f"Passed: {self.passed}")
        if self.failed > 0:
            self.error(f"Failed: {self.failed}")
        
        pass_rate = (self.passed / self.test_count * 100) if self.test_count > 0 else 0
        self.log(f"Pass Rate: {pass_rate:.1f}%\n", Colors.YELLOW)

if __name__ == "__main__":
    tester = CodePopTester()
    try:
        tester.run_all_tests()
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
    except Exception as e:
        print(f"\n\nTest failed with error: {e}")
        import traceback
        traceback.print_exc()
