from django.test import TestCase
from django.urls import reverse
from django.contrib.auth.models import User
from rest_framework.test import APIClient, APITestCase
from rest_framework import status
from rest_framework.authtoken.models import Token  # Import for token authentication
from unittest.mock import patch
from .models import Preference, Drink, Inventory, Notification, Order, Revenue
from django.utils import timezone
from datetime import timedelta
from .drinkAI import generate_soda
import csv
import os
from django.conf import settings

class PreferenceTests(TestCase):
    def setUp(self):
        # Create two test users
        self.user1 = User.objects.create_user(username='user1', password='password123')
        self.user2 = User.objects.create_user(username='user2', password='password123')

        # Create tokens for both users
        self.token1 = Token.objects.create(user=self.user1)
        self.token2 = Token.objects.create(user=self.user2)

        # Create preferences for both users
        Preference.objects.create(UserID=self.user1, Preference="mango")
        Preference.objects.create(UserID=self.user2, Preference="peach")

        # Set up the API client
        self.client = APIClient()

    def authenticate(self, token):
        """Helper method to set up token authentication"""
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token)

    def test_get_preferences_for_user1(self):
        # Use token authentication for user1
        self.authenticate(self.token1.key)

        # Make a request to retrieve preferences for user1
        response = self.client.get(f'/backend/users/{self.user1.id}/preferences/')

        # Check that the response status code is 200 OK
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Check that the returned data contains one preference
        self.assertEqual(len(response.data), 1)

        # Check that the preference belongs to user1 and is "Mango"
        self.assertEqual(response.data[0]['UserID'], self.user1.id)
        self.assertEqual(response.data[0]['Preference'], "mango")

    def test_get_preferences_for_user2(self):
        # Use token authentication for user2
        self.authenticate(self.token2.key)

        # Make a request to retrieve preferences for user2
        response = self.client.get(f'/backend/users/{self.user2.id}/preferences/')

        # Check that the response status code is 200 OK
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Check that the returned data contains one preference
        self.assertEqual(len(response.data), 1)

        # Check that the preference belongs to user2 and is "Peach"
        self.assertEqual(response.data[0]['UserID'], self.user2.id)
        self.assertEqual(response.data[0]['Preference'], "peach")

    def test_get_preferences_for_non_existent_user(self):
        # Use token authentication for user1
        self.authenticate(self.token1.key)

        # Attempt to retrieve preferences for a non-existent user
        response = self.client.get('/backend/users/999/preferences/')

        # Check that the response status code is 404 Not Found
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_create_preference(self):
        # Use token authentication for user1
        self.authenticate(self.token1.key)

        # Send a POST request to create a new preference for user1
        data = {'UserID': self.user1.id, 'Preference': "Strawberry"}
        response = self.client.post('/backend/preferences/', data, format='json')

        # Check that the response status code is 201 Created
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Check that the preference was created with the correct values
        self.assertEqual(Preference.objects.count(), 3)  # There should now be 3 preferences in total
        self.assertEqual(Preference.objects.filter(UserID=self.user1).count(), 2)  # Two preferences for user1
        self.assertEqual(
            list(Preference.objects.filter(UserID=self.user1).values_list('Preference', flat=True)),
            ["mango", "strawberry"]
        )

    def test_delete_preference(self):
        # Authenticate the user (user1 in this case)
        self.authenticate(self.token1.key)

        # Send a POST request to create a new preference for user1
        data = {'UserID': self.user1.id, 'Preference': "Strawberry"}
        response = self.client.post('/backend/preferences/', data, format='json')

        # Check that the response status code is 201 Created
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        # Get the preference object for user1 that we want to delete
        preference = Preference.objects.filter(UserID=self.user1).first()

        # Send a DELETE request to delete the preference
        response = self.client.delete(f'/backend/preferences/{preference.PreferenceID}/')

        # Check that the response status code is 204 No Content, indicating successful deletion
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        # Verify that the preference has been deleted from the database using the correct field name (PreferenceID)
        self.assertEqual(Preference.objects.filter(PreferenceID=preference.PreferenceID).count(), 0)

        # Confirm that only Strawberry is left in the User1 preference database
        self.assertEqual(
            list(Preference.objects.filter(UserID=self.user1).values_list('Preference', flat=True)),
            ["strawberry"]
        )

    def test_create_preference_with_invalid_value(self):
        # Authenticate the user (user1 in this case)
        self.authenticate(self.token1.key)

        # Send a POST request with an invalid preference value
        data = {'UserID': self.user1.id, 'Preference': "Mountain Dew"}  # Invalid value (should be "Mtn. Dew")
        response = self.client.post('/backend/preferences/', data, format='json')

        # Check that the response status code is 400 Bad Request
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Check that the correct error message is returned (ensure the invalid value is mentioned)
        self.assertIn("mountain dew is not a valid preference", str(response.data))

class DrinkTests(TestCase):
    def setUp(self):
        # Create two test users
        self.user1 = User.objects.create_user(username='user1', password='password123')
        self.user2 = User.objects.create_user(username='user2', password='password123')

        # Create tokens for both users
        self.token1 = Token.objects.create(user=self.user1)
        self.token2 = Token.objects.create(user=self.user2)

        # Create sample drinks for both users (dirty sodas)
        drink1 = Drink.objects.create(Name="Cola Vanilla", SodaUsed=["Cola"], SyrupsUsed=["Vanilla"], Ice="Regular", Size="24oz", User_Created=False, Price=1.99)
        drink2 = Drink.objects.create(Name="Lemonade Mint", SodaUsed=["Lemonade"], AddIns=["Mint"], Ice="None", Size="16oz", User_Created=False, Price=2.50)
        drink3 = Drink.objects.create(Name="Custom Cherry Soda", SodaUsed=["Cherry Soda"], Ice="Light", Size="32oz", User_Created=True, Price=3.50)

        # Add users to the Favorite field
        drink1.Favorite.add(self.user1)
        drink2.Favorite.add(self.user2)
        drink3.Favorite.add(self.user2)

        # Set up the API client
        self.client = APIClient()


    def authenticate(self, token):
        """Helper method to set up token authentication"""
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token)

    def test_get_drinks_for_user_created_false(self):
        """Test that only drinks where User_Created=False are listed"""
        self.authenticate(self.token1.key)
        response = self.client.get('/backend/drinks/')
        
        # Check that the response status code is 200 OK
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Check that only drinks with User_Created=False are returned
        self.assertEqual(len(response.data), 2)  # Two non-user-created drinks
        for drink in response.data:
            self.assertFalse(drink['User_Created'])

    def test_create_new_drink(self):
        """Test creating a new drink for the logged-in user with Ice and Size"""
        self.authenticate(self.token1.key)

        # Data for the new dirty soda (drink)
        data = {
            "Name": "Strawberry Soda",
            "SodaUsed": ["Strawberry Soda"],
            "SyrupsUsed": ["Vanilla"],
            "Ice": "Light",
            "Size": "32oz",
            "User_Created": False,
            "Price": 2.99
        }

        # Send a POST request to create the new drink
        response = self.client.post('/backend/drinks/', data, format='json')

        # Check that the response status code is 201 Created
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Retrieve the created drink and check its details
        drink = Drink.objects.get(Name="Strawberry Soda")
        self.assertEqual(drink.Price, 2.99)
        self.assertEqual(drink.Ice, "light")
        self.assertEqual(drink.Size, "32oz")

        # Add the user as a favorite after creating the drink
        drink.Favorite.add(self.user1)

        # Verify that the drink has been added to the favorites
        self.assertIn(self.user1, drink.Favorite.all())


    def test_update_existing_drink(self):
        """Test updating the price of an existing drink, and set Ice and Size"""
        self.authenticate(self.token1.key)

        # Retrieve a drink to update
        drink = Drink.objects.filter(User_Created=False).first()  # Non-user-created drink

        # Data for updating the drink
        data = {
            "Name": drink.Name,
            "SodaUsed": drink.SodaUsed,
            "SyrupsUsed": drink.SyrupsUsed,
            "Ice": "none",  # Updated ice value
            "Size": "16oz",  # Updated size
            "Price": 4.50,  # Updated price
            "User_Created": drink.User_Created  # Ensure the User_Created field is not changed
        }

        # Send a PUT request to update the drink
        response = self.client.put(f'/backend/drinks/{drink.DrinkID}/', data, format='json')

        # Check that the response status code is 200 OK
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Refresh the drink from the database to get the latest values
        drink.refresh_from_db()

        # Assert that the drink's details have been updated correctly
        self.assertEqual(drink.Price, 4.50)
        self.assertEqual(drink.Ice, "none")
        self.assertEqual(drink.Size, "16oz")

        # Add the user as a favorite after the update (if needed)
        drink.Favorite.add(self.user1)

        # Verify that the user was added to the favorites
        self.assertIn(self.user1, drink.Favorite.all())

    def test_delete_drink(self):
        """Test deleting a drink"""
        self.authenticate(self.token1.key)

        # Get a drink to delete (any drink created by user1)
        drink = Drink.objects.filter(Favorite=self.user1).first()

        # Send a DELETE request to delete the drink
        response = self.client.delete(f'/backend/drinks/{drink.DrinkID}/')

        # Check that the response status code is 204 No Content
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Drink.objects.filter(DrinkID=drink.DrinkID).count(), 0)

    def test_create_drink_without_auth(self):
        """Test creating a drink without being authenticated (should succed)"""
        data = {
            "Name": "Unauthorized Drink",
            "SodaUsed": ["Cola"],
            "User_Created": False,
            "Price": 2.00,
            "Ice": "Regular",
            "Size": "24oz"
        }

        # Send a POST request without authentication
        response = self.client.post('/backend/drinks/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_get_drinks_for_specific_user(self):
        """Test retrieving drinks based on a specific user's favorites"""
        self.authenticate(self.token2.key)
        response = self.client.get(f'/backend/users/{self.user2.id}/drinks/')
        
        # Check that the response status code is 200 OK
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)  # User2 has 2 favorite drinks
        drink_names = [drink['Name'] for drink in response.data]
        self.assertIn("Lemonade Mint", drink_names)
        self.assertIn("Custom Cherry Soda", drink_names)

    # New tests for Ice and Size validation
    def test_create_drink_with_invalid_ice_size(self):
        """Test creating a drink with invalid Ice and Size fields."""
        self.authenticate(self.token1.key)
        data = {
            "Name": "Invalid Drink",
            "SodaUsed": ["Cola"],
            "Ice": "Extra Heavy",  # Invalid Ice option
            "Size": "Super Large",  # Invalid Size option
            "User_Created": True,
            "Price": 2.00,
            "Favorite": self.user1.id
        }
        response = self.client.post('/backend/drinks/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Ice", response.data)
        self.assertIn("Size", response.data)

    def test_update_drink_with_invalid_ice_size(self):
        """Test updating a drink with invalid Ice and Size fields."""
        self.authenticate(self.token1.key)
        drink = Drink.objects.create(
            Name="Orange Soda",
            SodaUsed=["Fanta"],
            Ice="Regular",
            Size="24oz",
            User_Created=True,
            Price=2.00,
        )
        data = {
            "Name": "Updated Orange Soda",
            "SodaUsed": ["Fanta"],
            "Ice": "Boiling",  # Invalid Ice option
            "Size": "Huge",  # Invalid Size option
            "User_Created": True,
            "Price": 2.50,
        }

        response = self.client.put(f'/backend/drinks/{drink.DrinkID}/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Ice", response.data)
        self.assertIn("Size", response.data)

class InventoryTests(TestCase):
    def setUp(self):
        # Create two test users
        self.user1 = User.objects.create_user(username='user1', password='password123')
        self.user2 = User.objects.create_user(username='user2', password='password123')

        # Create tokens for both users
        self.token1 = Token.objects.create(user=self.user1)
        self.token2 = Token.objects.create(user=self.user2)

        # Create inventory items
        Inventory.objects.create(ItemName="Coke", ItemType="Soda", Quantity=10, ThresholdLevel=2)
        Inventory.objects.create(ItemName="Syrup A", ItemType="Syrup", Quantity=0, ThresholdLevel=5)
        Inventory.objects.create(ItemName="Cup", ItemType="Physical", Quantity=50, ThresholdLevel=10)

        # Set up the API client
        self.client = APIClient()

    def authenticate(self, token):
        """Helper method to set up token authentication"""
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token)

    def test_get_inventory_list(self):
        # Use token authentication for user1
        self.authenticate(self.token1.key)

        # Make a request to retrieve the inventory list
        response = self.client.get('/backend/inventory/')

        # Check that the response status code is 200 OK
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Check that the returned data contains the items that are not out of stock
        self.assertEqual(len(response.data), 2)  # There should be 2 items in stock (Coke and Cup)
        self.assertTrue(any(item['ItemName'] == "Coke" for item in response.data))
        self.assertTrue(any(item['ItemName'] == "Cup" for item in response.data))

    def test_get_inventory_report(self):
        # Use token authentication for user1
        self.authenticate(self.token1.key)

        # Make a request to retrieve the inventory report
        response = self.client.get('/backend/inventory/report/')

        # Check that the response status code is 200 OK
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Check that the report contains the correct items
        item_names = [item['ItemName'] for item in response.data['inventory_items']]
        self.assertIn("Coke", item_names)
        self.assertIn("Syrup A", item_names)
        self.assertIn("Cup", item_names)

    def test_update_inventory_success(self):
        # Authenticate the user
        self.authenticate(self.token1.key)

        # Use the correct item ID (for Coke, which was created in setUp)
        coke = Inventory.objects.get(ItemName="Coke")

        # Send a PATCH request to reduce the quantity by 5
        data = {'used_quantity': 5}
        response = self.client.patch(f'/backend/inventory/{coke.pk}/', data, format='json')

        # Assert the status code is 200 OK
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify the quantity is updated correctly
        coke.refresh_from_db()
        self.assertEqual(coke.Quantity, 5)


    def test_update_inventory_out_of_stock(self):
        self.authenticate(self.token1.key)

        # Use the correct ID for Syrup A (out of stock)
        syrup = Inventory.objects.get(ItemName="Syrup A")

        # Attempt to use 1 unit (should fail)
        data = {'used_quantity': 1}
        response = self.client.patch(f'/backend/inventory/{syrup.pk}/', data, format='json')

        # Assert 400 Bad Request with appropriate error
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['detail'], "'Syrup A' is already out of stock.")


    def test_update_inventory_insufficient_stock(self):
        self.authenticate(self.token1.key)

        # Use the correct ID for Coke
        coke = Inventory.objects.get(ItemName="Coke")

        # Attempt to use more than available (20 units)
        data = {'used_quantity': 20}
        response = self.client.patch(f'/backend/inventory/{coke.pk}/', data, format='json')

        # Assert 400 Bad Request with appropriate error
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['detail'], "Not enough stock available for 'Coke'.")


    def test_update_inventory_low_stock_warning(self):
        self.authenticate(self.token1.key)

        # Use the correct ID for Coke
        coke = Inventory.objects.get(ItemName="Coke")

        # Use 8 units, leaving only 2 (threshold level)
        data = {'used_quantity': 8}
        response = self.client.patch(f'/backend/inventory/{coke.pk}/', data, format='json')

        # Assert 200 OK with warning
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('warning', response.data)
        self.assertEqual(response.data['warning'], "'Coke' stock is below the threshold level.")

    def test_update_inventory_non_existent_item(self):
        # Use token authentication for user1
        self.authenticate(self.token1.key)

        # Send a PATCH request to update a non-existent inventory item
        data = {'used_quantity': 5}
        response = self.client.patch('/backend/inventory/999/', data, format='json')

        # Check that the response status code is 404 Not Found
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_inventory_subtract_quantity(self):
        # Authenticate the user
        self.authenticate(self.token1.key)

        # Use the correct item ID (for Coke, which was created in setUp)
        coke = Inventory.objects.get(ItemName="Coke")

        # Current quantity of Coke before the update
        initial_quantity = coke.Quantity

        # Send a PATCH request to reduce the quantity by 2
        data = {'used_quantity': 2}
        response = self.client.patch(f'/backend/inventory/{coke.pk}/', data, format='json')

        # Assert the status code is 200 OK
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify the quantity is updated correctly
        coke.refresh_from_db()  # Refresh the object from the database
        self.assertEqual(coke.Quantity, initial_quantity - 2)  # Check if 2 is subtracted

class NotificationTests(APITestCase):
    def setUp(self):
        # Create test users and tokens
        self.user1 = User.objects.create_user(username='user1', password='password123')
        self.user2 = User.objects.create_user(username='user2', password='password123')
        self.token1 = Token.objects.create(user=self.user1)
        self.token2 = Token.objects.create(user=self.user2)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token1.key}')

        # Create sample notifications for each user
        self.notification1 = Notification.objects.create(
            UserID=self.user1,
            Message="User1 notification",
            Timestamp=timezone.now() - timedelta(days=2),
            Type="info",
            Global=True
        )
        self.notification2 = Notification.objects.create(
            UserID=self.user1,
            Message="Another user1 notification",
            Timestamp=timezone.now() - timedelta(hours=5),
            Type="alert",
            Global=False
        )
        self.notification3 = Notification.objects.create(
            UserID=self.user2,
            Message="User2 notification",
            Timestamp=timezone.now() - timedelta(hours=1),
            Type="reminder",
            Global=False
        )

    def authenticate(self, token):
        """Helper function to set the token for authentication."""
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token)

    def test_list_notifications(self):
        """Test that authenticated users can list their notifications."""
        self.authenticate(self.token1.key)
        response = self.client.get(reverse('notification list and create'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        for notification in response.data:
            self.assertEqual(notification['UserID'], self.user1.id)

    def test_create_notification(self):
        """Test creating a new notification."""
        self.authenticate(self.token1.key)
        data = {
            "UserID": self.user1.id,
            "Message": "New notification for user1",
            "Type": "alert",
            "Global": False
        }
        response = self.client.post(reverse('notification list and create'), data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Notification.objects.count(), 4)
        new_notification = Notification.objects.get(Message="New notification for user1")
        self.assertEqual(new_notification.UserID, self.user1)

    def test_retrieve_notification(self):
        """Test retrieving a specific notification by ID."""
        self.authenticate(self.token1.key)
        response = self.client.get(reverse('notification operations', kwargs={"pk": self.notification1.NotificationID}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['Message'], "User1 notification")
        self.assertEqual(response.data['UserID'], self.user1.id)

    def test_update_notification(self):
        """Test updating an existing notification."""
        self.authenticate(self.token1.key)
        data = {
        "UserID": self.user1.id,  # Include the user ID if required
        "Message": "Updated message",
        "Type": "info",
        "Timestamp": self.notification1.Timestamp  # Include Timestamp if required
        }
        response = self.client.put(reverse('notification operations', kwargs={"pk": self.notification1.NotificationID}), data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.notification1.refresh_from_db()
        self.assertEqual(self.notification1.Message, "Updated message")

    def test_delete_notification(self):
        """Test deleting a notification."""
        self.authenticate(self.token1.key)
        response = self.client.delete(reverse('notification operations', kwargs={"pk": self.notification1.NotificationID}))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Notification.objects.filter(NotificationID=self.notification1.NotificationID).count(), 0)

    def test_filter_notifications_by_time_range(self):
        """Test filtering notifications by a specific time range."""
        self.authenticate(self.token1.key)
        start = (timezone.now() - timedelta(days=1)).isoformat()
        end = timezone.now().isoformat()

        response = self.client.get(reverse('notification filter by time'), {'start': start, 'end': end})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['Message'], "Another user1 notification")

    def test_access_notification_of_another_user(self):
        """Test that a user cannot access another user's notification."""
        self.authenticate(self.token1.key)
        response = self.client.get(reverse('notification operations', kwargs={"pk": self.notification3.NotificationID}))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_user_notifications_list_isolated_by_user(self):
        """Test that each user only sees their own notifications."""
        self.authenticate(self.token1.key)
        response = self.client.get(reverse('user notifications list', kwargs={"user_id": self.user1.id}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        for notification in response.data:
            self.assertEqual(notification['UserID'], self.user1.id)

        self.authenticate(self.token2.key)
        response = self.client.get(reverse('user notifications list', kwargs={"user_id": self.user2.id}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['UserID'], self.user2.id)

    def test_invalid_time_range(self):
        """Test invalid time range in filter by time endpoint."""
        self.authenticate(self.token1.key)
        response = self.client.get(reverse('notification filter by time'), {'start': 'invalid', 'end': 'invalid'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_notification_without_auth(self):
        """Test creating a notification without authentication (should fail)."""
        self.client.credentials()  # Clear authentication
        data = {
            "UserID": self.user1.id,
            "Message": "Unauthenticated notification",
            "Type": "alert",
            "Global": False
        }
        response = self.client.post(reverse('notification list and create'), data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

class OrderTests(TestCase):
    def setUp(self):
        # Create two test users
        self.user1 = User.objects.create_user(username='user1', password='password123')
        self.user2 = User.objects.create_user(username='user2', password='password123')

        # Create tokens for both users
        self.token1 = Token.objects.create(user=self.user1)
        self.token2 = Token.objects.create(user=self.user2)

        # Create sample drinks
        self.drink1 = Drink.objects.create(Name="Cola Vanilla", SodaUsed=["Cola"], SyrupsUsed=["Vanilla"], User_Created=False, Price=1.99)
        self.drink2 = Drink.objects.create(Name="Lemonade Mint", SodaUsed=["Lemonade"], AddIns=["Mint"], User_Created=False, Price=2.50)

        # Set up the API client
        self.client = APIClient()

    def authenticate(self, token):
        """Helper method to set up token authentication"""
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token)

    def test_create_order(self):
        """Test creating a new order for user1"""
        self.authenticate(self.token1.key)

        data = {
            "UserID": self.user1.id,
            "Drinks": [self.drink1.DrinkID, self.drink2.DrinkID],  # Include drink IDs
            "OrderStatus": "pending",
            "PaymentStatus": "pending",
            "StripeID": "dummy_stripe_id"
        }

        response = self.client.post('/backend/orders/', data, format='json')

        # Check that the response status code is 201 Created
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify that the order was created
        self.assertEqual(Order.objects.count(), 1)
        order = Order.objects.first()
        self.assertEqual(order.UserID, self.user1)
        self.assertEqual(list(order.Drinks.values_list('DrinkID', flat=True)), [self.drink1.DrinkID, self.drink2.DrinkID])

    def test_get_all_orders(self):
        """Test retrieving a list of all orders."""
        self.authenticate(self.token1.key)  # Authenticate the user

        # Create two orders for user1
        order1 = Order.objects.create(UserID=self.user1, OrderStatus="pending", PaymentStatus="pending")
        order2 = Order.objects.create(UserID=self.user1, OrderStatus="completed", PaymentStatus="paid")
        
        # Assign drinks to the orders
        order1.Drinks.set([self.drink1])  # Assign drink1 to order1
        order2.Drinks.set([self.drink2])  # Assign drink2 to order2

        # Make a GET request to retrieve all orders
        response = self.client.get('/backend/orders/')

        # Check that the response status code is 200 OK
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify that the number of orders returned matches the number created
        self.assertEqual(len(response.data), 2)  # Should return both orders

        # Verify the content of the returned data
        order_ids = [order['OrderID'] for order in response.data]
        self.assertIn(order1.OrderID, order_ids)  # Check if order1 is in the response
        self.assertIn(order2.OrderID, order_ids)  # Check if order2 is in the response

    def test_get_order(self):
        """Test retrieving an order"""
        self.authenticate(self.token1.key)

        # Create an order first
        order = Order.objects.create(UserID=self.user1, OrderStatus="pending", PaymentStatus="pending")
        order.Drinks.add(self.drink1)

        response = self.client.get(f'/backend/orders/{order.OrderID}/')

        # Check that the response status code is 200 OK
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify the returned order data
        self.assertEqual(response.data['OrderID'], order.OrderID)
        self.assertEqual(response.data['UserID'], self.user1.id)

    def test_get_orders_for_user(self):
        """Test retrieving orders for a specific user"""
        self.authenticate(self.token1.key)

        # Create two orders for user1 and assign drinks
        order1 = Order.objects.create(UserID=self.user1, OrderStatus="pending", PaymentStatus="pending")
        order1.Drinks.set([self.drink1, self.drink2])  # Assign drinks to the order

        order2 = Order.objects.create(UserID=self.user1, OrderStatus="completed", PaymentStatus="paid")
        order2.Drinks.set([self.drink1])  # Assign only one drink to this order

        response = self.client.get(f'/backend/users/{self.user1.id}/orders/')

        # Check that the response status code is 200 OK
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify the number of orders returned
        self.assertEqual(len(response.data), 2)

        # Verify the content of the returned data (optional but helpful)
        order_ids = [order['OrderID'] for order in response.data]
        self.assertIn(order1.OrderID, order_ids)
        self.assertIn(order2.OrderID, order_ids)


    def test_delete_order(self):
        """Test deleting an order"""
        self.authenticate(self.token1.key)

        # Create an order first
        order = Order.objects.create(UserID=self.user1, OrderStatus="pending", PaymentStatus="pending")
        order.Drinks.add(self.drink1)

        response = self.client.delete(f'/backend/orders/{order.OrderID}/')

        # Check that the response status code is 204 No Content
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        # Verify that the order has been deleted from the database
        self.assertEqual(Order.objects.filter(OrderID=order.OrderID).count(), 0)

    def test_create_order_without_auth(self):
        """Test creating an order without authentication"""
        data = {
            "UserID": self.user1.id,
            "Drinks": [self.drink1.DrinkID],
            "OrderStatus": "pending",
            "PaymentStatus": "pending",
            "StripeID": "dummy_stripe_id"
        }

        response = self.client.post('/backend/orders/', data, format='json')

        # Expect a 401 Unauthorized response
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_order_with_invalid_drink(self):
        """Test creating an order with a non-existent drink ID."""
        self.authenticate(self.token1.key)

        data = {
            "UserID": self.user1.id,
            "Drinks": [999],  # Invalid drink ID
            "OrderStatus": "pending",
            "PaymentStatus": "pending",
            "StripeID": "dummy_stripe_id"
        }

        response = self.client.post('/backend/orders/', data, format='json')

        # Expect a 400 Bad Request response
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Adjust the error message assertion based on the actual API response
        self.assertIn("invalid pk", str(response.data).lower())
        self.assertIn("does not exist", str(response.data).lower())

    def test_create_order_and_add_drink(self):
        """Test creating an order with one drink, then adding another drink."""
        self.authenticate(self.token1.key)

        # Create an initial order with one drink
        initial_data = {
            "UserID": self.user1.id,
            "Drinks": [self.drink1.DrinkID],  # Assuming drink1 exists
            "OrderStatus": "pending",
            "PaymentStatus": "pending",
            "StripeID": "dummy_stripe_id"
        }
        
        response = self.client.post('/backend/orders/', initial_data, format='json')

        # Check if the order was created successfully
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        order_id = response.data['OrderID']  # Assuming the order response contains an 'OrderID'

        # Now add another drink to the created order
        add_drink_data = {
            "AddDrinks": [self.drink2.DrinkID]  # Assuming drink2 exists
        }
        
        # Use the appropriate endpoint to add drinks with PATCH
        response = self.client.patch(f'/backend/orders/{order_id}/', add_drink_data, format='json')  # Updated to PATCH

        # Check if the drink was added successfully
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(self.drink2.DrinkID, response.data['Drinks'])  # Check if drink2 is now in the order


    def test_add_two_drinks_and_delete_one(self):
        """Test adding two drinks to an order, then deleting one of the drinks."""
        self.authenticate(self.token1.key)

        # Create an order with two drinks
        initial_data = {
            "UserID": self.user1.id,
            "Drinks": [self.drink1.DrinkID, self.drink2.DrinkID],  # Use "AddDrinks" to match the view
            "OrderStatus": "pending",
            "PaymentStatus": "pending",
            "StripeID": "dummy_stripe_id"
        }
        
        response = self.client.post('/backend/orders/', initial_data, format='json')
        
        # Check if the order was created successfully
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        order_id = response.data['OrderID']  # Assuming the order response contains an 'id'

        # Now delete one of the drinks from the order
        delete_drink_data = {
            "RemoveDrinks": [self.drink1.DrinkID]  # Use "RemoveDrinks" to match the view
        }
        
        response = self.client.patch(f'/backend/orders/{order_id}/', delete_drink_data, format='json')
        
        # Check if drink1 was removed successfully
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn(self.drink1.DrinkID, response.data['Drinks'])  # Ensure drink1 is no longer in the order
        self.assertIn(self.drink2.DrinkID, response.data['Drinks'])  # Ensure drink2 is still in the order

class RevenueTests(TestCase):
    def setUp(self):
        # Create users for authentication
        self.user1 = User.objects.create_user(username='user1', password='password123')
        self.user2 = User.objects.create_user(username='user2', password='password123')

        # Create tokens for both users
        self.token1 = Token.objects.create(user=self.user1)
        self.token2 = Token.objects.create(user=self.user2)

        # Create sample drinks
        self.drink1 = Drink.objects.create(Name="Cola Vanilla", SodaUsed=["Cola"], SyrupsUsed=["Vanilla"], User_Created=False, Price=1.99)
        self.drink2 = Drink.objects.create(Name="Lemonade Mint", SodaUsed=["Lemonade"], AddIns=["Mint"], User_Created=False, Price=2.50)

        # Create a sample order for testing revenue
        self.order = Order.objects.create(UserID=self.user1, OrderStatus="pending", PaymentStatus="pending")
        self.order.Drinks.set([self.drink1, self.drink2])

        # Set up the API client
        self.client = APIClient()

    def authenticate(self, token):
        """Helper method to set up token authentication"""
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token)

    def test_create_revenue(self):
        """Test creating a new revenue for an order"""
        self.authenticate(self.token1.key)

        data = {
            "OrderID": self.order.OrderID,  # Only OrderID, no TotalAmount required
        }

        response = self.client.post('/backend/revenues/', data, format='json')

        # Check that the response status code is 201 Created
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify that the revenue was created
        self.assertEqual(Revenue.objects.count(), 1)
        revenue = Revenue.objects.first()
        self.assertEqual(revenue.OrderID, self.order.OrderID)  # Check if OrderID is set correctly
        self.assertEqual(revenue.TotalAmount, 1.99 + 2.50)  # Total should be the sum of the drink prices

    def test_retrieve_revenue(self):
        """Test retrieving a revenue record"""
        # First, create a revenue record
        revenue = Revenue.objects.create(OrderID=self.order.OrderID, TotalAmount=1.99 + 2.50)

        self.authenticate(self.token1.key)

        response = self.client.get(f'/backend/revenues/{revenue.RevenueID}/')

        # Check that the response status code is 200 OK
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify the correct revenue details are returned
        self.assertEqual(response.data['RevenueID'], revenue.RevenueID)
        self.assertEqual(response.data['TotalAmount'], revenue.TotalAmount)

    def test_update_revenue_after_deleting_drink(self):
        """Test updating the revenue when a drink is removed from the order"""
        # First, create a revenue record
        revenue = Revenue.objects.create(OrderID=self.order.OrderID, TotalAmount=1.99 + 2.50)

        # Ensure the revenue was created with the correct total amount
        self.assertEqual(revenue.TotalAmount, 1.99 + 2.50)

        # Now, delete one drink from the order (let's remove drink1)
        self.authenticate(self.token1.key)

        delete_drink_data = {
            "RemoveDrinks": [self.drink1.DrinkID]  # Use "RemoveDrinks" to match the view
        }

        # Update the order by removing one drink
        response = self.client.patch(f'/backend/orders/{self.order.OrderID}/', delete_drink_data, format='json')

        # Check if the drink was removed successfully
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn(self.drink1.DrinkID, response.data['Drinks'])  # Ensure drink1 is no longer in the order
        self.assertIn(self.drink2.DrinkID, response.data['Drinks'])  # Ensure drink2 is still in the order

        # Refresh the revenue instance to recalculate the total
        # Now, update the revenue (this will trigger the recalculation of the total amount)
        update_data = {}

        response = self.client.put(f'/backend/revenues/{revenue.RevenueID}/', update_data, format='json')

        # Check if the total amount was recalculated correctly
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # The new total should only include the remaining drink (drink2)
        revenue.refresh_from_db()  # Reload the revenue from the database
        self.assertEqual(revenue.TotalAmount, 2.50)  # The new total should be just the price of drink2

    def test_delete_revenue(self):
        """Test deleting a revenue record"""
        # First, create a revenue record
        revenue = Revenue.objects.create(OrderID=self.order.OrderID, TotalAmount=1.99 + 2.50)

        self.authenticate(self.token1.key)

        response = self.client.delete(f'/backend/revenues/{revenue.RevenueID}/')

        # Check that the response status code is 204 No Content (successful deletion)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        # Verify that the revenue record was deleted
        self.assertEqual(Revenue.objects.count(), 0)

    def test_create_revenue_without_total_amount(self):
        """Test creating a revenue record without providing TotalAmount (it should be calculated automatically)"""
        self.authenticate(self.token1.key)

        data = {
            "OrderID": self.order.OrderID,  # Only OrderID, no TotalAmount required
        }

        response = self.client.post('/backend/revenues/', data, format='json')

        # Check that the response status code is 201 Created
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify that the total amount was automatically calculated
        revenue = Revenue.objects.first()
        self.assertEqual(revenue.TotalAmount, 1.99 + 2.50)  # Total should be the sum of the drink prices

    def test_update_revenue_to_zero(self):
        """Test updating the revenue total amount to 0."""
        # First, create a revenue record with an initial total amount
        revenue = Revenue.objects.create(OrderID=self.order.OrderID)

        # Authenticate the user for the update
        self.authenticate(self.token1.key)

        # Prepare the data to update TotalAmount to 0
        update_data = {
            "TotalAmount": 0.0  # Set the new total amount to 0
        }

        # Perform the PUT request to update the revenue record
        response = self.client.put(f'/backend/revenues/{revenue.RevenueID}/', update_data, format='json')

        # Check if the response status code is 200 OK, indicating a successful update
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Refresh the revenue instance from the database to get the latest data
        revenue.refresh_from_db()

        # Check if the TotalAmount was updated to 0.0
        self.assertEqual(revenue.TotalAmount, 0.0)


# Some Inner-method comments follow this format:
# Input: expected output
class AITests(TestCase):
    # Create users and add preferences
    def setUp(self):
        # Create users
        self.user1 = User.objects.create_user(username='user1', password='password123')
        self.user2 = User.objects.create_user(username='user2', password='password123')
        self.user3 = User.objects.create_user(username='user3', password='password123')

        self.user4 = User.objects.create_user(username='user4', password='password123')
        self.user5 = User.objects.create_user(username='user5', password='password123')

        self.user6 = User.objects.create_user(username='user6', password='password123')

        # Create tokens for users
        self.token1 = Token.objects.create(user=self.user1)
        self.token2 = Token.objects.create(user=self.user2)
        self.token3 = Token.objects.create(user=self.user3)

        self.token4 = Token.objects.create(user=self.user4)
        self.token5 = Token.objects.create(user=self.user5)

        self.token6 = Token.objects.create(user=self.user6)

        # Create preference list for every user (pref# corresponds to user#)
        # Syrup test users
        pref1 = ["user", "has", "no", "valid", "prefs", "somehow"]
        pref2 = ["invalid", "prefs", "except", "mango"]
        pref3 = ["mango", "cranberry", "blue raspberry", "grape", "sour", "kiwi", "chocolate milano"]

        # Soda test users and Addin test users (addins added later)
        pref4 = ["vanilla", "butterscotch", "coke"]
        pref5 = ["mango", "strawberry", "vanilla", "butterscotch", "coke", "sprite"]

        # "Everything" test user
        pref6 = ["mtn. dew", "diet mtn. dew", "dr. pepper", "diet dr. pepper", "dr. pepper zero",
            "dr pepper cream soda", "sprite", "sprite zero", "coke", "diet coke", "coke zero",
            "pepsi", "diet pepsi", "rootbeer", "fanta", "big red", "powerade", "lemonade",
            "light lemonade", "coconut", "pineapple", "passion fruit", "mango", "guava", "banana",
            "strawberry", "raspberry", "blackberry", "pomegranate", "cranberry", "grape", "kiwi", 
            "huckleberry", "peach", "watermelon", "green apple", "pear", "cherry", "orange", 
            "blood orange", "grapefruit", "sweetened lime", "lemon", "lime", "vanilla", "cupcake",
            "salted caramel", "chocolate milano", "cinnamon", "choc chip cookie dough", 
            "brown sugar cinnamon", "hazelnut", "white chocolate", "butterscotch", "blue raspberry", 
            "sour", "blue curacao", "bubble gum", "cotton candy", "mojito", "cucumber", "lavender",
            "pumpkin spice", "peppermint", "irish cream", "gingerbread", "butterbrew mix", "cream", 
            "coconut cream", "whip", "lemon wedge", "lime wedge", "french vanilla creamer", "candy",
            "sprinkles", "strawberry puree", "peach puree", "mango puree", "raspberry puree"]

        # Create preferences for every user (if your tests are running slow, this is why)
        for pref in pref1:
            Preference.objects.create(UserID=self.user1, Preference=pref)
        for pref in pref2:
            Preference.objects.create(UserID=self.user2, Preference=pref)
        for pref in pref3:
            Preference.objects.create(UserID=self.user3, Preference=pref)

        for pref in pref4:
            Preference.objects.create(UserID=self.user4, Preference=pref)
        for pref in pref5:
            Preference.objects.create(UserID=self.user5, Preference=pref)

        for pref in pref6:
            Preference.objects.create(UserID=self.user6, Preference=pref)

        # Set up the API client
        self.client = APIClient()


    def authenticate(self, token):
        """Helper method to set up token authentication"""
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token)

    # Used for checkOutput method
    def getCSVLength(self, file_path):
        with open(file_path, mode='r', newline='') as file:
            reader = csv.reader(file)
            rows = list(reader)  # Read all existing rows into a list
            file.close()

        return len(rows)
       
    # Authenticates user, gets preferences, and sends to AI (returns result)
    def authGetPrefAndSendToAI(self, token, user):
        # Use token authentication for user
        self.authenticate(token.key)

        # Make a request to retrieve preferences for user
        response = self.client.get(f'/backend/users/{user.id}/preferences/')

        # Check that the response status code is 200 OK
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Get user's preferences and send to AI
        preferences = list(Preference.objects.filter(UserID=user).values_list('Preference', flat=True))
        return generate_soda(preferences) # Returns dictionary


    def checkOutput(self, result):
        # Ensure AI outputs a dictionary (assuming syrups are all valid) with an array of 2 or 4 syrups, 1 soda, and 0-2 addins
        self.assertTrue(len(result["syrups"]) == 2 or len(result["syrups"]) == 4)
        self.assertEqual(len(result["soda"]), 1)
        self.assertTrue(len(result["addins"]) >= 0 and len(result["addins"]) < 3)

        # Ensure each item in the dictionary is valid
        syrupList = ["coconut", "pineapple", "passion fruit", "mango", "guava", "banana",
            "strawberry", "raspberry", "blackberry", "pomegranate", "cranberry", "grape", "kiwi", 
            "huckleberry", "peach", "watermelon", "green apple", "pear", "cherry", "orange", 
            "blood orange", "grapefruit", "sweetened lime", "lemon", "lime", "vanilla", "cupcake",
            "salted caramel", "chocolate milano", "cinnamon", "choc chip cookie dough", 
            "brown sugar cinnamon", "hazelnut", "white chocolate", "butterscotch", "blue raspberry", 
            "sour", "blue curacao", "bubble gum", "cotton candy", "mojito", "cucumber", "lavender",
            "pumpkin spice", "peppermint", "irish cream", "gingerbread", "butterbrew mix"]
        for i in range(len(result["syrups"])):
            self.assertTrue(result["syrups"][i] in syrupList)

        sodaList = ["mtn. dew", "diet mtn. dew", "dr. pepper", "diet dr. pepper", "dr. pepper zero",
            "dr pepper cream soda", "sprite", "sprite zero", "coke", "diet coke", "coke zero",
            "pepsi", "diet pepsi", "rootbeer", "fanta", "big red", "powerade", "lemonade",
            "light lemonade"]
        self.assertTrue(result["soda"][0] in sodaList)

        addInList = ["cream", "coconut cream", "whip", "lemon wedge", "lime wedge",
            "french vanilla creamer", "candy", "sprinkles", "strawberry puree", "peach puree",
            "mango puree", "raspberry puree"]
        for i in range(len(result["addins"])):
            self.assertTrue(result["addins"][i] in addInList)

        # Ensure size of csv file doesn't change
        syrup_file_path = os.path.join(settings.BASE_DIR, 'backend/Syrups.csv')
        syrup_length = self.getCSVLength(syrup_file_path)
        self.assertEqual(syrup_length, 49)
        soda_file_path = os.path.join(settings.BASE_DIR, 'backend/Sodas.csv')
        soda_length = self.getCSVLength(soda_file_path)
        self.assertEqual(soda_length, 20)
        addin_file_path = os.path.join(settings.BASE_DIR, 'backend/AddIns.csv')
        addin_length = self.getCSVLength(addin_file_path)
        self.assertEqual(addin_length, 13)


    # Different cases for inputting invalid and valid syrups into the AI
    def testCheckSyrupValidity(self):
        # no valid syrups in pref: empty dictionary
        result1 = self.authGetPrefAndSendToAI(self.token1, self.user1)
        self.assertEqual(result1, {})

        # 1 valid syrup in pref: not empty dictionary
        result2 = self.authGetPrefAndSendToAI(self.token2, self.user2)
        self.assertFalse(result2 == {})
        self.checkOutput(result2)

        # all syrups in pref are valid: not empty dictionary
        result3 = self.authGetPrefAndSendToAI(self.token3, self.user3)
        self.assertFalse(result3 == {})
        self.checkOutput(result3)


    # Different output cases depending on # of sodas in user preferences
    def testDiffNumSodaPreferences(self):
        # no test for 0 sodas in preferences since it could literally return any soda in the csv file

        # 1 soda in pref: soda in output dictionary == that soda in pref
        result4 = self.authGetPrefAndSendToAI(self.token4, self.user4)
        self.assertEqual(result4["soda"][0], "coke")
        self.checkOutput(result4)

        # 2+ soda in pref: soda in output dictionary == any of the 2+ (aka, must equal one of the preference sodas)
        result5 = self.authGetPrefAndSendToAI(self.token5, self.user5)
        self.assertTrue(result5["soda"][0] == "coke" or result5["soda"][0] == "sprite")
        self.checkOutput(result5)
        

    # Different output cases depending on # of addins in user preferences
    # Also good to test that the AI can handle newly added preferences
    def testDiffNumAddinPreferences(self):
        # no test for 0 addins in preferences since it could literally return any addin in the csv file

        # 1 addin in pref: addin in output dictionary == that addin in pref
        Preference.objects.create(UserID=self.user4, Preference="coconut cream")
        result4 = self.authGetPrefAndSendToAI(self.token4, self.user4)
        while (len(result4["addins"]) == 0): # don't want empty addin array
            result4 = self.authGetPrefAndSendToAI(self.token4, self.user4)

        self.assertTrue("coconut cream" in result4["addins"])
        self.checkOutput(result4)

        # 2+ addins in pref: addin(s) in output dictionary == any of the 2+ (assuming it isnt empty)
        Preference.objects.create(UserID=self.user5, Preference="coconut cream")
        Preference.objects.create(UserID=self.user5, Preference="lime wedge")
        result5 = self.authGetPrefAndSendToAI(self.token5, self.user5)
        while (len(result5["addins"]) == 0): # don't want empty addin array
            result5 = self.authGetPrefAndSendToAI(self.token5, self.user5)

        self.assertTrue("coconut cream" in result5["addins"] or "lime wedge" in result5["addins"])
        self.checkOutput(result5)


    # Ensure AI does not explode if it gets a preference list with literally everything in it
    def testPrefListSize(self):
        result6 = self.authGetPrefAndSendToAI(self.token6, self.user6)
        self.checkOutput(result6)
