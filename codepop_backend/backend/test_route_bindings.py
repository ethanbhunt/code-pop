from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from .models import Drink, Inventory, Order


class AuthMeEndpointTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='me_user',
            password='password123',
            first_name='Test',
            last_name='User',
            is_staff=True,
        )
        self.token = Token.objects.create(user=self.user)
        self.client = APIClient()

    def test_auth_me_requires_authentication(self):
        response = self.client.get('/backend/auth/me/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_auth_me_returns_current_user(self):
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        response = self.client.get('/backend/auth/me/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user_id'], self.user.id)
        self.assertEqual(response.data['username'], 'me_user')
        self.assertEqual(response.data['is_manager'], True)


class FulfillmentRouteAliasTests(TestCase):
    def setUp(self):
        self.customer = User.objects.create_user(username='route_customer', password='password123')
        self.manager = User.objects.create_user(
            username='route_manager',
            password='password123',
            is_staff=True,
        )
        self.token = Token.objects.create(user=self.manager)

        drink = Drink.objects.create(
            Name='Route Test Drink',
            SodaUsed=['Coke'],
            SyrupsUsed=['Vanilla'],
            AddIns=['Cream'],
            User_Created=False,
            Price=3.50,
            Size='24oz',
            Ice='regular',
        )

        self.order = Order.objects.create(
            UserID=self.customer,
            OrderStatus='processing',
            PaymentStatus='paid',
            StripeID='pi_route_test',
        )
        self.order.Drinks.set([drink])

        Inventory.objects.create(ItemName='Coke', ItemType='Soda', Quantity=5, ThresholdLevel=1)
        Inventory.objects.create(ItemName='Vanilla', ItemType='Syrup', Quantity=5, ThresholdLevel=1)
        Inventory.objects.create(ItemName='Cream', ItemType='Add In', Quantity=5, ThresholdLevel=1)

        self.client = APIClient()

    def test_fulfillment_aliases_require_manager_auth(self):
        direct = self.client.post(f'/backend/orders/{self.order.OrderID}/fulfill/', {}, format='json')
        complete = self.client.post(f'/backend/orders/{self.order.OrderID}/complete/', {}, format='json')
        alias = self.client.post(f'/backend/fulfillment/orders/{self.order.OrderID}/', {}, format='json')

        self.assertEqual(direct.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(complete.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(alias.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_fulfillment_aliases_complete_order(self):
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)

        response = self.client.post(f'/backend/fulfillment/orders/{self.order.OrderID}/', {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.order.refresh_from_db()
        self.assertEqual(self.order.OrderStatus, 'completed')
