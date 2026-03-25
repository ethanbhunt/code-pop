"""
CodePop OrbitDB Backend Client
A comprehensive Python client for the CodePop backend API.

Usage:
    # Start backend first:
    # Terminal 1: npm run bootstrap
    # Terminal 2: PORT=3001 npm run peer
    
    # Then run:
    # python3 client.py
"""

import json
import urllib.request
import urllib.error
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from enum import Enum


# ─────────────────────────────────────────────────────────────────────────────
# Data Models
# ─────────────────────────────────────────────────────────────────────────────

class User:
    """User model - flexible to handle various response formats"""
    def __init__(self, userId: int, username: str, email: str, firstName: str = "",
                 lastName: str = "", isStaff: bool = False, isSuperuser: bool = False,
                 token: Optional[str] = None, **kwargs):
        self.userId = userId
        self.username = username
        self.email = email
        self.firstName = firstName
        self.lastName = lastName
        self.isStaff = isStaff
        self.isSuperuser = isSuperuser
        self.token = token
        # Store any additional fields
        for key, value in kwargs.items():
            setattr(self, key, value)


@dataclass
class Drink:
    """Drink menu item"""
    drinkId: int
    name: str
    category: str
    description: str = ""
    price: float = 0.0
    isVegan: bool = False
    isGlutenFree: bool = False
    calories: int = 0
    rating: float = 0.0


@dataclass
class Order:
    """Order model"""
    orderId: int
    userId: int
    drinkIds: List[int]
    quantities: List[int]
    totalPrice: float
    orderStatus: str
    paymentStatus: str
    createdAt: str


@dataclass
class Preference:
    """User preference model"""
    preferenceId: int
    userId: int
    drinkId: Optional[int]
    preferenceType: str
    details: str = ""


class PreferenceType(Enum):
    """Preference type enumeration"""
    FAVORITE = "favorite"
    ALLERGIC = "allergic"
    DISLIKE = "dislike"
    RECOMMENDED = "recommended"
    INGREDIENT_PREFERENCE = "ingredient_preference"


class OrderStatus(Enum):
    """Order status enumeration"""
    PENDING = "pending"
    PREPARING = "preparing"
    READY = "ready"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


# ─────────────────────────────────────────────────────────────────────────────
# API Client
# ─────────────────────────────────────────────────────────────────────────────

class CodePopClient:
    """Main API client for CodePop backend"""

    def __init__(self, base_url: str = "http://localhost:3001", timeout: int = 10):
        """
        Initialize the CodePop API client.
        
        Args:
            base_url: The base URL of the backend API (default: localhost:3001)
            timeout: Request timeout in seconds (default: 10)
        """
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.token: Optional[str] = None
        self.user: Optional[User] = None

    def _make_request(
        self,
        method: str,
        endpoint: str,
        json_data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
        require_auth: bool = True
    ) -> Dict[str, Any]:
        """
        Make an HTTP request to the backend using urllib.
        
        Args:
            method: HTTP method (GET, POST, PUT, DELETE, PATCH)
            endpoint: API endpoint path (without base URL)
            json_data: JSON request body
            params: Query parameters
            require_auth: Whether this endpoint requires authentication
            
        Returns:
            Parsed JSON response
            
        Raises:
            Exception: If request fails or response is invalid
        """
        url = f"{self.base_url}{endpoint}"
        
        # Add query parameters
        if params:
            query_string = "&".join(f"{k}={v}" for k, v in params.items())
            url = f"{url}?{query_string}"

        headers = {"Content-Type": "application/json"}

        if require_auth:
            if not self.token:
                raise ValueError("Not authenticated. Please login first.")
            headers["Authorization"] = f"Token {self.token}"

        try:
            # Prepare request
            body = None
            if json_data:
                body = json.dumps(json_data).encode('utf-8')

            req = urllib.request.Request(
                url,
                data=body,
                headers=headers,
                method=method
            )

            # Make request
            with urllib.request.urlopen(req, timeout=self.timeout) as response:
                response_data = response.read().decode('utf-8')
                return json.loads(response_data)

        except urllib.error.HTTPError as e:
            # Handle HTTP errors
            try:
                error_response = e.read().decode('utf-8')
                error_data = json.loads(error_response)
                error_msg = error_data.get("error", "Unknown error")
                raise Exception(f"API Error ({e.code}): {error_msg}")
            except (json.JSONDecodeError, ValueError):
                raise Exception(f"API Error ({e.code}): {e.read().decode('utf-8')}")
        except urllib.error.URLError as e:
            raise Exception(f"Request failed: {str(e)}")
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON response from {endpoint}: {str(e)}")
        except Exception as e:
            raise Exception(f"Request failed: {str(e)}")

    # ─────────────────────────────────────────────────────────────────────────
    # Authentication
    # ─────────────────────────────────────────────────────────────────────────

    def register(self, username: str, email: str, password: str) -> User:
        """
        Register a new user.
        
        Args:
            username: Username (3-30 characters, alphanumeric + underscore)
            email: Valid email address
            password: Password (min 8 chars, must include uppercase, lowercase, number, special char)
            
        Returns:
            User object with authentication token
        """
        data = {
            "username": username,
            "email": email,
            "password": password
        }
        response = self._make_request("POST", "/backend/auth/register", json_data=data, require_auth=False)
        user_data = response["data"]
        self.token = user_data.get("token")
        self.user = User(**user_data)
        return self.user

    def login(self, username: str, password: str) -> User:
        """
        Login user and get authentication token.
        
        Args:
            username: Username or email
            password: User password
            
        Returns:
            User object with authentication token
        """
        data = {
            "username": username,
            "password": password
        }
        response = self._make_request("POST", "/backend/auth/login", json_data=data, require_auth=False)
        user_data = response["data"]
        self.token = user_data.get("token")
        self.user = User(**user_data)
        return self.user

    def logout(self) -> bool:
        """
        Logout current user and invalidate token.
        
        Returns:
            True if logout successful
        """
        response = self._make_request("POST", "/backend/auth/logout")
        self.token = None
        self.user = None
        return response.get("status") == "logged_out"

    def get_current_user(self) -> User:
        """
        Get current authenticated user profile.
        
        Returns:
            User object
        """
        response = self._make_request("GET", "/backend/auth/me")
        user_data = response["data"]
        self.user = User(**user_data)
        return self.user

    # ─────────────────────────────────────────────────────────────────────────
    # User Management
    # ─────────────────────────────────────────────────────────────────────────

    def get_user_profile(self) -> User:
        """
        Get current user's profile.
        
        Returns:
            User object
        """
        return self.get_current_user()

    def update_user_profile(
        self,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        email: Optional[str] = None
    ) -> User:
        """
        Update current user's profile.
        
        Args:
            first_name: First name
            last_name: Last name
            email: Email address
            
        Returns:
            Updated User object
        """
        data = {}
        if first_name is not None:
            data["firstName"] = first_name
        if last_name is not None:
            data["lastName"] = last_name
        if email is not None:
            data["email"] = email

        response = self._make_request("PUT", "/backend/auth/me", json_data=data)
        user_data = response["data"]
        self.user = User(**user_data)
        return self.user

    def delete_account(self) -> bool:
        """
        Delete current user account.
        
        Returns:
            True if account deleted
        """
        response = self._make_request("DELETE", "/backend/auth/me")
        self.token = None
        self.user = None
        return response.get("status") == "deleted"

    # ─────────────────────────────────────────────────────────────────────────
    # Drinks
    # ─────────────────────────────────────────────────────────────────────────

    def list_drinks(self, limit: int = 100) -> List[Dict[str, Any]]:
        """
        List all available drinks.
        
        Args:
            limit: Maximum number of drinks to return (default: 100)
            
        Returns:
            List of drink objects
        """
        response = self._make_request("GET", "/backend/drinks", params={"limit": limit})
        return response.get("data", [])

    def get_drink(self, drink_id: int) -> Optional[Dict[str, Any]]:
        """
        Get specific drink details.
        
        Args:
            drink_id: The drink ID
            
        Returns:
            Drink object
        """
        response = self._make_request("GET", f"/backend/drinks/{drink_id}")
        return response.get("data")

    def create_drink(
        self,
        name: str,
        category: str,
        price: float,
        description: str = "",
        is_vegan: bool = False,
        is_gluten_free: bool = False,
        calories: int = 0,
        syrups: Optional[List[str]] = None,
        ingredients: Optional[List[str]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Create a new drink (admin only).
        
        Args:
            name: Drink name
            category: Drink category (coffee, tea, smoothie, juice, other)
            price: Drink price
            description: Drink description
            is_vegan: Whether drink is vegan
            is_gluten_free: Whether drink is gluten-free
            calories: Calorie count
            syrups: List of syrups
            ingredients: List of ingredients
            
        Returns:
            Created drink object
        """
        data = {
            "name": name,
            "category": category,
            "price": price,
            "description": description,
            "isVegan": is_vegan,
            "isGlutenFree": is_gluten_free,
            "calories": calories,
        }
        if syrups:
            data["syrups"] = syrups
        if ingredients:
            data["ingredients"] = ingredients

        response = self._make_request("POST", "/backend/drinks", json_data=data)
        return response.get("data")

    def update_drink(self, drink_id: int, **kwargs) -> Optional[Dict[str, Any]]:
        """
        Update a drink (admin only).
        
        Args:
            drink_id: The drink ID
            **kwargs: Fields to update (name, price, description, etc.)
            
        Returns:
            Updated drink object
        """
        response = self._make_request("PUT", f"/backend/drinks/{drink_id}", json_data=kwargs)
        return response.get("data")

    def delete_drink(self, drink_id: int) -> bool:
        """
        Delete a drink (admin only).
        
        Args:
            drink_id: The drink ID
            
        Returns:
            True if deleted
        """
        response = self._make_request("DELETE", f"/backend/drinks/{drink_id}")
        return response.get("status") == "deleted"

    def add_favorite(self, drink_id: int) -> Dict[str, Any]:
        """
        Add a drink to user's favorites.
        
        Args:
            drink_id: The drink ID
            
        Returns:
            Updated drink object
        """
        response = self._make_request("POST", f"/backend/drinks/{drink_id}/favorite")
        return response.get("data")

    def remove_favorite(self, drink_id: int) -> Dict[str, Any]:
        """
        Remove a drink from user's favorites.
        
        Args:
            drink_id: The drink ID
            
        Returns:
            Updated drink object
        """
        response = self._make_request("DELETE", f"/backend/drinks/{drink_id}/favorite")
        return response.get("data")

    # ─────────────────────────────────────────────────────────────────────────
    # Preferences
    # ─────────────────────────────────────────────────────────────────────────

    def list_preferences(self, pref_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get user's preferences.
        
        Args:
            pref_type: Filter by type (favorite, allergic, dislike, etc.)
            
        Returns:
            List of preference objects
        """
        params = {}
        if pref_type:
            params["type"] = pref_type

        response = self._make_request("GET", "/backend/preferences", params=params)
        return response.get("data", [])

    def get_preference(self, preference_id: int) -> Optional[Dict[str, Any]]:
        """
        Get specific preference.
        
        Args:
            preference_id: The preference ID
            
        Returns:
            Preference object
        """
        response = self._make_request("GET", f"/backend/preferences/{preference_id}")
        return response.get("data")

    def create_preference(
        self,
        preference_type: str,
        drink_id: Optional[int] = None,
        ingredient_name: Optional[str] = None,
        sweetness: Optional[str] = None,
        temperature: Optional[str] = None,
        details: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Create a new preference.
        
        Args:
            preference_type: Type of preference (favorite, allergic, dislike, etc.)
            drink_id: Drink ID (required for drink preferences)
            ingredient_name: Ingredient name (for ingredient preferences)
            sweetness: Sweetness level (low, medium, high)
            temperature: Temperature (hot, cold, iced)
            details: Additional notes
            
        Returns:
            Created preference object
        """
        data = {
            "preferenceType": preference_type
        }
        if drink_id is not None:
            data["drinkId"] = drink_id
        if ingredient_name:
            data["ingredientName"] = ingredient_name
        if sweetness:
            data["sweetness"] = sweetness
        if temperature:
            data["temperature"] = temperature
        if details:
            data["details"] = details

        response = self._make_request("POST", "/backend/preferences", json_data=data)
        return response.get("data")

    def update_preference(
        self,
        preference_id: int,
        preference_type: Optional[str] = None,
        details: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Update a preference.
        
        Args:
            preference_id: The preference ID
            preference_type: Updated preference type
            details: Updated details
            **kwargs: Other fields to update
            
        Returns:
            Updated preference object
        """
        data = {}
        if preference_type:
            data["preferenceType"] = preference_type
        if details:
            data["details"] = details
        data.update(kwargs)

        response = self._make_request("PATCH", f"/backend/preferences/{preference_id}", json_data=data)
        return response.get("data")

    def delete_preference(self, preference_id: int) -> bool:
        """
        Delete a preference.
        
        Args:
            preference_id: The preference ID
            
        Returns:
            True if deleted
        """
        response = self._make_request("DELETE", f"/backend/preferences/{preference_id}")
        return response.get("status") == "deleted"

    # ─────────────────────────────────────────────────────────────────────────
    # Orders
    # ─────────────────────────────────────────────────────────────────────────

    def list_orders(self, status: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Get user's orders.
        
        Args:
            status: Filter by status (pending, preparing, ready, completed, cancelled)
            limit: Maximum number of orders to return
            
        Returns:
            List of order objects
        """
        params = {"limit": limit}
        if status:
            params["status"] = status

        response = self._make_request("GET", "/backend/orders", params=params)
        return response.get("data", [])

    def get_order(self, order_id: int) -> Dict[str, Any]:
        """
        Get specific order details.
        
        Args:
            order_id: The order ID
            
        Returns:
            Order object
        """
        response = self._make_request("GET", f"/backend/orders/{order_id}")
        return response.get("data")

    def create_order(
        self,
        drink_ids: List[int],
        quantities: List[int],
        special_instructions: Optional[str] = None,
        estimated_pickup_time: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a new order.
        
        Args:
            drink_ids: List of drink IDs to order
            quantities: List of quantities (parallel to drink_ids)
            special_instructions: Special instructions for the order
            estimated_pickup_time: Estimated pickup time (ISO-8601)
            
        Returns:
            Created order object
        """
        data = {
            "drinkIds": drink_ids,
            "quantities": quantities
        }
        if special_instructions:
            data["specialInstructions"] = special_instructions
        if estimated_pickup_time:
            data["estimatedPickupTime"] = estimated_pickup_time

        response = self._make_request("POST", "/backend/orders", json_data=data)
        return response.get("data")

    def update_order(
        self,
        order_id: int,
        drink_ids: Optional[List[int]] = None,
        quantities: Optional[List[int]] = None,
        special_instructions: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Update an order (only if pending).
        
        Args:
            order_id: The order ID
            drink_ids: Updated drink IDs
            quantities: Updated quantities
            special_instructions: Updated instructions
            
        Returns:
            Updated order object
        """
        data = {}
        if drink_ids is not None:
            data["drinkIds"] = drink_ids
        if quantities is not None:
            data["quantities"] = quantities
        if special_instructions is not None:
            data["specialInstructions"] = special_instructions

        response = self._make_request("PATCH", f"/backend/orders/{order_id}", json_data=data)
        return response.get("data")

    def cancel_order(self, order_id: int) -> bool:
        """
        Cancel an order (only if pending or preparing).
        
        Args:
            order_id: The order ID
            
        Returns:
            True if cancelled
        """
        response = self._make_request("DELETE", f"/backend/orders/{order_id}")
        return response.get("status") == "deleted"

    # ─────────────────────────────────────────────────────────────────────────
    # Notifications
    # ─────────────────────────────────────────────────────────────────────────

    def list_notifications(
        self,
        notification_type: Optional[str] = None,
        read: Optional[bool] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Get user's notifications.
        
        Args:
            notification_type: Filter by type (order, promotion, alert, system)
            read: Filter by read status
            limit: Maximum number to return
            
        Returns:
            List of notification objects
        """
        params = {"limit": limit}
        if notification_type:
            params["type"] = notification_type
        if read is not None:
            params["read"] = read

        response = self._make_request("GET", "/backend/notifications", params=params)
        return response.get("data", [])

    def get_unread_count(self) -> int:
        """
        Get count of unread notifications.
        
        Returns:
            Number of unread notifications
        """
        response = self._make_request("GET", "/backend/notifications/unread-count")
        return response.get("unreadCount", 0)

    def mark_notification_read(self, notification_id: int) -> Dict[str, Any]:
        """
        Mark notification as read.
        
        Args:
            notification_id: The notification ID
            
        Returns:
            Updated notification object
        """
        response = self._make_request("PATCH", f"/backend/notifications/{notification_id}/read")
        return response.get("data")

    def delete_notification(self, notification_id: int) -> bool:
        """
        Delete a notification.
        
        Args:
            notification_id: The notification ID
            
        Returns:
            True if deleted
        """
        response = self._make_request("DELETE", f"/backend/notifications/{notification_id}")
        return response.get("status") == "deleted"

    def clear_read_notifications(self) -> bool:
        """
        Delete all read notifications.
        
        Returns:
            True if cleared
        """
        response = self._make_request("DELETE", "/backend/notifications/clear-read")
        return response.get("status") == "success"

    # ─────────────────────────────────────────────────────────────────────────
    # Payments
    # ─────────────────────────────────────────────────────────────────────────

    def process_payment(
        self,
        order_id: int,
        amount: float,
        payment_method: str,
        stripe_token_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Process a payment for an order.
        
        Args:
            order_id: The order ID
            amount: Payment amount
            payment_method: Payment method (cash, card, mobile)
            stripe_token_id: Stripe token (required for card payments)
            
        Returns:
            Payment object
        """
        data = {
            "orderId": order_id,
            "amount": amount,
            "paymentMethod": payment_method
        }
        if stripe_token_id:
            data["stripeTokenId"] = stripe_token_id

        response = self._make_request("POST", "/backend/payments", json_data=data)
        return response.get("data")

    # ─────────────────────────────────────────────────────────────────────────
    # Inventory
    # ─────────────────────────────────────────────────────────────────────────

    def list_inventory(self, item_type: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        """
        List inventory items (admin only).
        
        Args:
            item_type: Filter by type (syrup, soda, supply, equipment)
            limit: Maximum number to return
            
        Returns:
            List of inventory objects
        """
        params = {"limit": limit}
        if item_type:
            params["type"] = item_type

        response = self._make_request("GET", "/backend/inventory", params=params)
        return response.get("data", [])

    def get_inventory_item(self, inventory_id: int) -> Dict[str, Any]:
        """
        Get specific inventory item.
        
        Args:
            inventory_id: The inventory ID
            
        Returns:
            Inventory object
        """
        response = self._make_request("GET", f"/backend/inventory/{inventory_id}")
        return response.get("data")

    # ─────────────────────────────────────────────────────────────────────────
    # QR Codes
    # ─────────────────────────────────────────────────────────────────────────

    def get_qrcode(self, qrcode_id: int) -> Dict[str, Any]:
        """
        Get specific QR code.
        
        Args:
            qrcode_id: The QR code ID
            
        Returns:
            QR code object
        """
        response = self._make_request("GET", f"/backend/qrcodes/{qrcode_id}")
        return response.get("data")

    def validate_qrcode(self, qrcode_id: int) -> Dict[str, Any]:
        """
        Validate and use a QR code to open fridge.
        
        Args:
            qrcode_id: The QR code ID
            
        Returns:
            Validation result with access info
        """
        response = self._make_request("GET", f"/backend/qrcodes/{qrcode_id}/validate")
        return response.get("data", response)

    def get_order_qrcode(self, order_id: int) -> Dict[str, Any]:
        """
        Get QR code for a specific order.
        
        Args:
            order_id: The order ID
            
        Returns:
            QR code object
        """
        response = self._make_request("GET", f"/backend/qrcodes/order/{order_id}")
        return response.get("data")

    # ─────────────────────────────────────────────────────────────────────────
    # Health & Info
    # ─────────────────────────────────────────────────────────────────────────

    def health_check(self) -> Dict[str, Any]:
        """
        Check if backend is healthy.
        
        Returns:
            Health status information
        """
        response = self._make_request("GET", "/health", require_auth=False)
        return response

    def get_info(self) -> Dict[str, Any]:
        """
        Get backend node information.
        
        Returns:
            Node info (peer ID, databases, etc.)
        """
        response = self._make_request("GET", "/info", require_auth=False)
        return response


# ─────────────────────────────────────────────────────────────────────────────
# Demo & Testing
# ─────────────────────────────────────────────────────────────────────────────

def print_separator():
    """Print a visual separator"""
    print("\n" + "─" * 80 + "\n")


def demo():
    """Run a demonstration of the CodePop client"""
    print_separator()
    print("CodePop Backend API Client - Demo")
    print_separator()

    # Initialize client
    client = CodePopClient("http://localhost:3001")

    try:
        # 1. Health check
        print("1. Health Check")
        health = client.health_check()
        print(f"   Status: {health.get('status')}")
        print(f"   Node Type: {health.get('nodeType')}")
        print(f"   Peer ID: {health.get('peerId', 'N/A')[:40]}...")

        print_separator()

        # 2. Register user
        print("2. Register New User")
        try:
            user = client.register("testuser", "test@example.com", "SecurePass123!")
            print(f"   Registered: {user.username}")
            print(f"   Email: {user.email}")
            print(f"   Token: {user.token[:20]}..." if user.token else "No token")
        except Exception as e:
            print(f"   Note: {e}")
            print("   Attempting to login instead...")
            user = client.login("testuser", "SecurePass123!")
            print(f"   Logged in: {user.username}")

        print_separator()

        # 3. Get current user
        print("3. Get Current User Profile")
        current_user = client.get_current_user()
        print(f"   User ID: {current_user.userId}")
        print(f"   Username: {current_user.username}")
        print(f"   Email: {current_user.email}")

        print_separator()

        # 4. List drinks
        print("4. List Available Drinks")
        drinks = client.list_drinks(limit=5)
        print(f"   Found {len(drinks)} drinks:")
        for drink in drinks[:3]:
            print(f"     - {drink.get('name', 'Unknown')} (${drink.get('price', 0):.2f})")

        print_separator()

        # 5. List preferences
        print("5. List User Preferences")
        prefs = client.list_preferences()
        print(f"   Found {len(prefs)} preferences:")
        for pref in prefs[:3]:
            print(f"     - {pref.get('preferenceType')}: {pref.get('details', 'N/A')}")

        print_separator()

        # 6. List orders
        print("6. List User Orders")
        orders = client.list_orders()
        print(f"   Found {len(orders)} orders:")
        for order in orders[:3]:
            print(f"     - Order #{order.get('orderId')}: {order.get('orderStatus')} (${order.get('totalPrice', 0):.2f})")

        print_separator()

        # 7. Get notifications
        print("7. Get Notifications")
        try:
            notifications = client.list_notifications()
            unread = client.get_unread_count()
            print(f"   Total notifications: {len(notifications)}")
            print(f"   Unread: {unread}")
        except Exception as e:
            print(f"   No notifications yet: {e}")

        print_separator()

        # 8. Logout
        print("8. Logout")
        if client.logout():
            print("   Successfully logged out")
        else:
            print("   Logout failed")

        print_separator()
        print("Demo completed successfully!")
        print_separator()

    except Exception as e:
        print(f"\nError during demo: {e}")
        print_separator()


if __name__ == "__main__":
    demo()
