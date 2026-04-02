from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from .models import AuditLog, Inventory


class InventoryAuditSecurityTests(TestCase):
    def setUp(self):
        self.manager = User.objects.create_user(
            username='manager_user',
            password='password123',
            is_staff=True,
        )
        self.customer = User.objects.create_user(
            username='customer_user',
            password='password123',
        )

        self.manager_token = Token.objects.create(user=self.manager)
        self.customer_token = Token.objects.create(user=self.customer)

        self.inventory = Inventory.objects.create(
            ItemName='Coke',
            ItemType='Soda',
            Quantity=20,
            ThresholdLevel=5,
        )

        self.client = APIClient()

    def test_customer_cannot_mutate_inventory(self):
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.customer_token.key)

        response = self.client.patch(
            f'/backend/inventory/{self.inventory.InventoryID}/',
            {'used_quantity': 3},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_manager_inventory_update_creates_audit_log(self):
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.manager_token.key)

        response = self.client.patch(
            f'/backend/inventory/{self.inventory.InventoryID}/',
            {'used_quantity': 4},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertEqual(AuditLog.objects.count(), 1)
        audit = AuditLog.objects.first()
        self.assertEqual(audit.Action, 'deduct')
        self.assertEqual(audit.QuantityBefore, 20)
        self.assertEqual(audit.QuantityAfter, 16)

    def test_manager_can_read_audit_logs(self):
        AuditLog.objects.create(
            UserID=self.manager,
            Action='deduct',
            ItemName='Coke',
            ItemType='Soda',
            QuantityBefore=20,
            QuantityAfter=18,
        )

        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.manager_token.key)
        response = self.client.get('/backend/audit-logs/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_customer_cannot_read_audit_logs(self):
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.customer_token.key)
        response = self.client.get('/backend/audit-logs/')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
