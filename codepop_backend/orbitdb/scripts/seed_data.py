#!/usr/bin/env python3
"""
CodePop Seeding Script

Populates the OrbitDB backend with test data:
- 3 test users (customer, staff, admin)
- 8 drinks menu items
- User preferences (favorites, allergies, dislikes)
- Inventory items

Usage:
    python3 seed_data.py --all           # Seed all data
    python3 seed_data.py --users         # Seed only users
    python3 seed_data.py --drinks        # Seed only drinks
    python3 seed_data.py --preferences   # Seed only preferences
    python3 seed_data.py --inventory     # Seed only inventory
    python3 seed_data.py --clear         # Delete all test data
    python3 seed_data.py --reset         # Clear and reseed all
"""

import sys
import json
import time
import urllib.request
import urllib.error
import argparse
from pathlib import Path

# Import seed configuration
sys.path.insert(0, str(Path(__file__).parent))
from seed_config import (
    SEED_USERS, SEED_DRINKS, SEED_PREFERENCES, SEED_INVENTORY,
    TEST_CREDENTIALS, SEED_CONFIG
)
from peer_config import (
    SEEDING_CONFIG, get_all_peer_urls, get_default_peer_url, print_peer_config
)


class CodePopSeeder:
    """Seeds CodePop backend with test data"""
    
    def __init__(self, base_url="http://localhost:3001"):
        self.base_url = base_url.rstrip("/")
        self.admin_token = {}
        self.user_tokens = {}  # Store tokens by username
        self.user_ids = {}      # Store user IDs by username
        
    def _make_request(self, method, endpoint, data=None, token=None):
        """Make HTTP request to backend"""
        url = f"{self.base_url}{endpoint}"
        headers = {"Content-Type": "application/json"}
        
        if token:
            headers["Authorization"] = f"Token {token}"
        
        body = None
        if data:
            body = json.dumps(data).encode('utf-8')
        
        try:
            req = urllib.request.Request(
                url,
                data=body,
                headers=headers,
                method=method
            )
            
            with urllib.request.urlopen(req, timeout=10) as response:
                response_data = response.read().decode('utf-8')
                return json.loads(response_data) if response_data else {}
                
        except urllib.error.HTTPError as e:
            error_body = e.read().decode('utf-8')
            try:
                error_data = json.loads(error_body)
                raise Exception(f"API Error ({e.code}): {error_data.get('error', 'Unknown')}")
            except json.JSONDecodeError:
                raise Exception(f"API Error ({e.code}): {error_body}")
        except urllib.error.URLError as e:
            raise Exception(f"Connection Error: {e.reason}")
    
    def health_check(self):
        """Check if backend is running"""
        try:
            response = self._make_request("GET", "/health")
            status = response.get("status")
            print(f"Backend health: {status}")
            return status == "healthy"
        except Exception as e:
            print(f"Backend unavailable: {e}")
            return False
    
    def clear_data(self):
        """Clear all test data (delete users and related data)"""
        print("\nClearing test data...")
        
        if not self.admin_token:
            print("Error: Not authenticated. Cannot clear data.")
            return False
        
        try:
            # Get all users
            response = self._make_request("GET", "/backend/users", token=self.admin_token)
            users = response.get("data", [])
            
            deleted_count = 0
            for user in users:
                # Check if this is a test user
                if any(tu["username"] == user.get("username") for tu in SEED_USERS):
                    try:
                        self._make_request("DELETE", f"/backend/users/delete/{user['userId']}", 
                                         token=self.admin_token)
                        deleted_count += 1
                        print(f"  Deleted user: {user['username']}")
                    except Exception as e:
                        print(f"  Failed to delete {user['username']}: {e}")
            
            print(f"Cleared {deleted_count} test users and their data")
            return True
            
        except Exception as e:
            print(f"Error clearing data: {e}")
            return False
    
    def seed_users(self):
        """Create test users"""
        print("\nSeeding users...")
        
        created_count = 0
        for user_data in SEED_USERS:
            try:
                response = self._make_request("POST", "/backend/auth/register", 
                                            data=user_data)
                user_info = response.get("data", {})
                token = user_info.get("token")
                user_id = user_info.get("userId")
                
                if token and user_id:
                    self.user_tokens[user_data["username"]] = token
                    self.user_ids[user_data["username"]] = user_id
                    
                    print(f"  Created user: {user_data['username']} (ID: {user_id})")
                    created_count += 1
                    
                    # Set admin token for later operations (use first admin role found)
                    if user_data.get("role") in ["admin", "superadmin"] and not self.admin_token:
                        self.admin_token = token
                else:
                    print(f"  Error creating {user_data['username']}: Invalid response format")
                    
            except Exception as e:
                error_msg = str(e)
                if "already exists" in error_msg or "Username already exists" in error_msg:
                    print(f"  User {user_data['username']} already exists (skipping)")
                    # Try to login to get token
                    try:
                        login_response = self._make_request("POST", "/backend/auth/login",
                                                          data={"username": user_data["username"],
                                                               "password": user_data["password"]})
                        login_data = login_response.get("data", {})
                        token = login_data.get("token")
                        user_id = login_data.get("userId")
                        if token and user_id:
                            self.user_tokens[user_data["username"]] = token
                            self.user_ids[user_data["username"]] = user_id
                            if user_data.get("role") in ["admin", "superadmin"] and not self.admin_token:
                                self.admin_token = token
                    except:
                        pass
                else:
                    print(f"  Error creating {user_data['username']}: {e}")
        
        print(f"Users seeded: {created_count}/{len(SEED_USERS)}")
        return created_count > 0
    
    def seed_drinks(self):
        """Create drinks menu"""
        print("\nSeeding drinks...")
        
        if not self.admin_token:
            print("Error: Need admin authentication to create drinks")
            return False
        
        created_count = 0
        for drink_data in SEED_DRINKS:
            try:
                response = self._make_request("POST", "/backend/drinks", 
                                            data=drink_data, token=self.admin_token)
                drink = response.get("data", {})
                drink_id = drink.get("drinkId", "?")
                drink_name = drink.get("name", drink_data.get("name", "Unknown"))
                print(f"  Created drink: {drink_name} (ID: {drink_id})")
                created_count += 1
                
            except Exception as e:
                if "already exists" in str(e):
                    print(f"  Drink {drink_data['name']} already exists (skipping)")
                else:
                    print(f"  Error creating {drink_data['name']}: {e}")
        
        print(f"Drinks seeded: {created_count}/{len(SEED_DRINKS)}")
        return created_count > 0
    
    def seed_preferences(self):
        """Create user preferences"""
        print("\nSeeding preferences...")
        
        created_count = 0
        for pref_data in SEED_PREFERENCES:
            username = pref_data["username"]
            
            if username not in self.user_tokens:
                print(f"  Warning: User {username} not found, skipping preference")
                continue
            
            try:
                token = self.user_tokens[username]
                
                # Build preference request - API expects 'preference' as main field
                request_data = {
                    "preference": pref_data["preference"]
                }
                
                # Add optional fields if present
                if "preferenceType" in pref_data:
                    request_data["preferenceType"] = pref_data["preferenceType"]
                
                if "sweetness" in pref_data:
                    request_data["sweetness"] = pref_data["sweetness"]
                
                if "temperature" in pref_data:
                    request_data["temperature"] = pref_data["temperature"]
                
                if "ingredientName" in pref_data:
                    request_data["ingredientName"] = pref_data["ingredientName"]
                
                response = self._make_request("POST", "/backend/preferences", 
                                            data=request_data, token=token)
                pref = response.get("data", {})
                pref_type = pref.get("preferenceType", "preference")
                print(f"  Created preference for {username}: {pref_data['preference']} ({pref_type})")
                created_count += 1
                
            except Exception as e:
                print(f"  Error creating preference for {username}: {e}")
        
        print(f"Preferences seeded: {created_count}/{len(SEED_PREFERENCES)}")
        return created_count > 0
    
    def seed_inventory(self):
        """Create inventory items"""
        print("\nSeeding inventory...")
        
        if not self.admin_token:
            print("Error: Need admin authentication to create inventory")
            return False
        
        created_count = 0
        for inv_data in SEED_INVENTORY:
            try:
                response = self._make_request("POST", "/backend/inventory", 
                                            data=inv_data, token=self.admin_token)
                item = response.get("data", {})
                item_name = item.get("itemName", inv_data.get("itemName", "Unknown"))
                quantity = item.get("quantity", inv_data.get("quantity", "?"))
                item_type = item.get("itemType", inv_data.get("itemType", ""))
                print(f"  Created inventory: {item_name} ({quantity} units, type: {item_type})")
                created_count += 1
                
            except Exception as e:
                error_str = str(e)
                if "already exists" in error_str:
                    print(f"  Inventory {inv_data['itemName']} already exists (skipping)")
                else:
                    print(f"  Error creating {inv_data['itemName']}: {e}")
        
        print(f"Inventory seeded: {created_count}/{len(SEED_INVENTORY)}")
        return created_count > 0
    
    def run_all(self):
        """Seed all data"""
        print("=" * 60)
        print("CodePop Backend Seeding")
        print("=" * 60)
        
        # Health check
        if not self.health_check():
            print("\nERROR: Backend is not running!")
            print("Please start the OrbitDB backend first:")
            print("  Terminal 1: npm run bootstrap")
            print("  Terminal 2: npm run peer")
            return False
        
        # Seed in order
        self.seed_users()
        time.sleep(0.5)
        self.seed_drinks()
        time.sleep(0.5)
        self.seed_preferences()
        time.sleep(0.5)
        self.seed_inventory()
        
        # Print summary
        self.print_summary()
        return True
    
    def print_summary(self):
        """Print test data summary and credentials"""
        print("\n" + "=" * 60)
        print("Seeding Complete!")
        print("=" * 60)
        
        print(f"\nTest Data Created:")
        print(f"  Users: {len(SEED_USERS)}")
        print(f"  Drinks: {len(SEED_DRINKS)}")
        print(f"  Preferences: {len(SEED_PREFERENCES)}")
        print(f"  Inventory Items: {len(SEED_INVENTORY)}")
        
        print("\nTest Credentials:")
        print("-" * 60)
        for role, creds in TEST_CREDENTIALS.items():
            print(f"\n{role.upper()} Account:")
            print(f"  Username: {creds['username']}")
            print(f"  Email:    {creds['email']}")
            print(f"  Password: {creds['password']}")
            print(f"  Note:     {creds['description']}")
        
        print("\nFrontend Base URL:")
        print(f"  Web:     http://localhost:19006")
        print(f"  Backend: http://localhost:3001")
        
        print("\nNext Steps:")
        print("  1. Start frontend: cd ../../codepop && npm start")
        print("  2. Press 'w' for web version")
        print("  3. Login with any of the above credentials")
        print("  4. Test the application!")
        print("\n" + "=" * 60)



class MultiPeerSeeder:
    """Seeds all peer nodes with identical data"""
    
    def __init__(self, peer_urls):
        self.peer_urls = peer_urls
        self.seeders = [CodePopSeeder(url) for url in peer_urls]
    
    def run_all(self):
        print("=" * 70)
        print(f"MULTI-PEER SEEDING: {len(self.peer_urls)} PEERS")
        print("=" * 70)
        
        if not self.seeders[0].health_check():
            print("ERROR: Backend is not running!")
            return False
        
        # Step 1: Seed users ONLY on the first peer
        # Users will automatically replicate to other peers via gossipsub
        print(f"\nSTEP 1: Register users on Peer 1 (will replicate to other peers)")
        print(f"{'='*70}")
        try:
            seeder_1 = self.seeders[0]
            seeder_1.seed_users()
            time.sleep(SEEDING_CONFIG["operation_delay"])
            print(f"✓ Users registered on {seeder_1.base_url}")
            print(f"  Users will replicate to other peers via gossipsub\n")
        except Exception as e:
            print(f"✗ Error registering users: {e}")
            return False
        
        # Step 2: Seed drinks, preferences, and inventory to ALL peers
        # This ensures all peers have identical non-user data
        print(f"STEP 2: Seed drinks, preferences, and inventory to all peers")
        print(f"{'='*70}\n")
        
        for i, seeder in enumerate(self.seeders, 1):
            print(f"PEER {i}/{len(self.seeders)}: {seeder.base_url}")
            try:
                # Skip users on all peers (they exist from peer 1 registration + replication)
                seeder.seed_drinks()
                time.sleep(SEEDING_CONFIG["operation_delay"])
                seeder.seed_preferences()
                time.sleep(SEEDING_CONFIG["operation_delay"])
                seeder.seed_inventory()
                time.sleep(SEEDING_CONFIG["operation_delay"])
                print(f"✓ Peer {i} seeded successfully (drinks, preferences, inventory)")
                if i < len(self.seeders):
                    time.sleep(SEEDING_CONFIG["peer_delay"])
            except Exception as e:
                print(f"✗ Error seeding peer {i}: {e}")
                return False
        
        print(f"\n{'='*70}")
        print(f"SUCCESS: All {len(self.seeders)} peers seeded!")
        print(f"{'='*70}")
        print(f"\nSeeding Summary:")
        print(f"  Peer 1 ({self.peer_urls[0]}): Users + Drinks + Preferences + Inventory")
        print(f"  Other Peers: Drinks + Preferences + Inventory")
        print(f"  (Users replicate via gossipsub to ensure consistency)")
        print(f"\nAll data is now available on all {len(self.seeders)} peer nodes!\n")
        return True


def main():
    parser = argparse.ArgumentParser(
       description="CodePop Backend Seeding Script",
       formatter_class=argparse.RawDescriptionHelpFormatter,
       epilog="""
Examples:
  python3 seed_data.py --all              Seed all data
  python3 seed_data.py --users            Seed only users
  python3 seed_data.py --drinks           Seed only drinks
  python3 seed_data.py --clear            Delete all test data
  python3 seed_data.py --reset            Clear and reseed all
       """
    )
    
    parser.add_argument("--all", action="store_true", 
                      help="Seed all data")
    parser.add_argument("--users", action="store_true",
                      help="Seed only users")
    parser.add_argument("--drinks", action="store_true",
                      help="Seed only drinks")
    parser.add_argument("--preferences", action="store_true",
                      help="Seed only preferences")
    parser.add_argument("--inventory", action="store_true",
                      help="Seed only inventory")
    parser.add_argument("--clear", action="store_true",
                      help="Delete all test data")
    parser.add_argument("--reset", action="store_true",
                      help="Clear and reseed all data")
    parser.add_argument("--url", default="http://localhost:3001",
                      help="Backend API URL (default: http://localhost:3001)")
    parser.add_argument("--all-peers", action="store_true",
                      help="Seed to all 3 peer nodes (3001, 3002, 3003) simultaneously")
    
    args = parser.parse_args()
    
    try:
       if args.all_peers:
           multi_seeder = MultiPeerSeeder(get_all_peer_urls())
           multi_seeder.run_all()
           sys.exit(0)
       
       seeder = CodePopSeeder(args.url)
       if args.reset:
           # Clear and reseed
           print("\n" + "=" * 60)
           print("RESET MODE: Clearing and reseeding all data")
           print("=" * 60)
           
           # First, seed users to get admin token for cleanup
           print("\nStep 1: Creating users for authentication...")
           seeder.seed_users()
           time.sleep(0.5)
           
           # Then clear existing test data
           if seeder.admin_token:
               print("\nStep 2: Clearing existing test data...")
               seeder.clear_data()
               time.sleep(0.5)
               
               print("\nStep 3: Reseeding all data...")
               seeder.seed_users()
               time.sleep(0.3)
               seeder.seed_drinks()
               time.sleep(0.3)
               seeder.seed_preferences()
               time.sleep(0.3)
               seeder.seed_inventory()
           
           seeder.print_summary()
           
       elif args.clear:
           seeder.seed_users()  # Need admin token
           if seeder.admin_token:
               seeder.clear_data()
               
       elif args.users:
           seeder.seed_users()
           print("\nUsers seeded successfully!")
           
       elif args.drinks:
           seeder.seed_users()  # Need admin token
           if seeder.admin_token:
               seeder.seed_drinks()
               
       elif args.preferences:
           seeder.seed_users()
           seeder.seed_preferences()
           
       elif args.inventory:
           seeder.seed_users()  # Need admin token
           if seeder.admin_token:
               seeder.seed_inventory()
               
       else:
           # Default: seed all
           seeder.run_all()
    
    except KeyboardInterrupt:
       print("\n\nSeeding cancelled by user")
       sys.exit(1)
    except Exception as e:
       print(f"\nFatal error: {e}")
       sys.exit(1)


if __name__ == "__main__":
    main()
