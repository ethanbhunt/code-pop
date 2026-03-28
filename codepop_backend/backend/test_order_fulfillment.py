from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from .models import Drink, Inventory, Notification, Order


class OrderFulfillmentTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='fulfill_user', password='password123')
        self.manager = User.objects.create_user(
            username='fulfill_manager',
            password='password123',
            is_staff=True,
        )
        self.token = Token.objects.create(user=self.manager)

        self.drink = Drink.objects.create(
            Name='Coke Vanilla',
            SodaUsed=['Coke'],
            SyrupsUsed=['Vanilla'],
            AddIns=['Cream'],
            User_Created=False,
            Price=3.50,
            Size='24oz',
            Ice='regular',
        )

        self.order = Order.objects.create(
            UserID=self.user,
            OrderStatus='processing',
            PaymentStatus='paid',
            StripeID='test_pi',
        )
        self.order.Drinks.set([self.drink])

        Inventory.objects.create(ItemName='Coke', ItemType='Soda', Quantity=10, ThresholdLevel=2)
        Inventory.objects.create(ItemName='Vanilla', ItemType='Syrup', Quantity=10, ThresholdLevel=2)
        Inventory.objects.create(ItemName='Cream', ItemType='Add In', Quantity=10, ThresholdLevel=2)

        self.client = APIClient()

    def authenticate(self):
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)

    def test_fulfill_order_success_deducts_inventory(self):
        self.authenticate()

        response = self.client.post(f'/backend/orders/{self.order.OrderID}/fulfill/', {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.order.refresh_from_db()
        self.assertEqual(self.order.OrderStatus, 'completed')

        coke = Inventory.objects.get(ItemName='Coke', ItemType='Soda')
        vanilla = Inventory.objects.get(ItemName='Vanilla', ItemType='Syrup')
        cream = Inventory.objects.get(ItemName='Cream', ItemType='Add In')

        self.assertEqual(coke.Quantity, 9)
        self.assertEqual(vanilla.Quantity, 9)
        self.assertEqual(cream.Quantity, 9)

    def test_fulfill_rolls_back_on_insufficient_stock(self):
        self.authenticate()

        vanilla = Inventory.objects.get(ItemName='Vanilla', ItemType='Syrup')
        vanilla.Quantity = 0
        vanilla.save(update_fields=['Quantity'])

        response = self.client.post(f'/backend/orders/{self.order.OrderID}/fulfill/', {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        coke = Inventory.objects.get(ItemName='Coke', ItemType='Soda')
        cream = Inventory.objects.get(ItemName='Cream', ItemType='Add In')

        # No partial deduction should occur.
        self.assertEqual(coke.Quantity, 10)
        self.assertEqual(cream.Quantity, 10)

        self.assertEqual(Notification.objects.filter(UserID=self.user, Type='order_error').count(), 1)

    def test_fulfill_requires_authentication(self):
        response = self.client.post(f'/backend/orders/{self.order.OrderID}/fulfill/', {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
