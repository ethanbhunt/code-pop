from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from .models import Inventory, StockTransfer, Store, SupplyHub
from .supply_services import SupplyHubService


class SupplyHubServiceTests(TestCase):
    def setUp(self):
        self.store = Store.objects.create(
            Name='Logan Store',
            Region='Region C',
            City='Logan',
            State='UT',
            Latitude=41.736980,
            Longitude=-111.833836,
        )
        self.closest_hub = SupplyHub.objects.create(
            Name='Logan Hub',
            Region='Region C',
            Latitude=41.740000,
            Longitude=-111.820000,
            MaxDeliveryRadiusMiles=100,
        )
        self.far_hub = SupplyHub.objects.create(
            Name='Salt Lake Hub',
            Region='Region North',
            Latitude=40.760780,
            Longitude=-111.891045,
            MaxDeliveryRadiusMiles=1000,
        )

        Inventory.objects.create(
            HubID=self.closest_hub,
            ItemName='Coke',
            ItemType='Soda',
            Quantity=20,
            ThresholdLevel=5,
        )
        Inventory.objects.create(
            HubID=self.far_hub,
            ItemName='Coke',
            ItemType='Soda',
            Quantity=50,
            ThresholdLevel=5,
        )

    def test_find_nearest_hub(self):
        hub = SupplyHubService.findNearestHub(
            store_id=self.store.StoreID,
            item_name='Coke',
            item_type='Soda',
            quantity=5,
        )
        self.assertIsNotNone(hub)
        self.assertEqual(hub.HubID, self.closest_hub.HubID)

    def test_request_supply_creates_transfer_and_deducts_inventory(self):
        transfer = SupplyHubService.requestSupply(
            item_name='Coke',
            item_type='Soda',
            quantity=7,
            store_id=self.store.StoreID,
        )

        self.assertEqual(StockTransfer.objects.count(), 1)
        self.assertEqual(transfer.Status, 'pending')

        inventory = Inventory.objects.get(HubID=self.closest_hub, ItemName='Coke', ItemType='Soda')
        self.assertEqual(inventory.Quantity, 13)


class SupplyHubApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='supply_api_user', password='password123')
        self.token = Token.objects.create(user=self.user)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)

        self.store = Store.objects.create(
            Name='Region C Store',
            Region='Region C',
            City='Logan',
            State='UT',
            Latitude=41.736980,
            Longitude=-111.833836,
        )
        self.hub = SupplyHub.objects.create(
            Name='Region C Hub API',
            Region='Region C',
            Latitude=41.738000,
            Longitude=-111.834000,
        )

        self.inventory = Inventory.objects.create(
            HubID=self.hub,
            ItemName='Vanilla',
            ItemType='Syrup',
            Quantity=30,
            ThresholdLevel=10,
        )

    def test_list_supply_hubs(self):
        response = self.client.get('/backend/supply-hubs/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['Name'], 'Region C Hub API')

    def test_get_supply_hub_inventory(self):
        response = self.client.get(f'/backend/supply-hubs/{self.hub.HubID}/inventory/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['ItemName'], 'Vanilla')

    def test_create_stock_transfer(self):
        payload = {
            'StoreID': self.store.StoreID,
            'ItemName': 'Vanilla',
            'ItemType': 'Syrup',
            'Quantity': 5,
        }
        response = self.client.post('/backend/stock-transfers/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['Status'], 'pending')

    def test_update_stock_transfer_status(self):
        transfer = StockTransfer.objects.create(
            HubID=self.hub,
            StoreID=self.store,
            ItemName='Vanilla',
            ItemType='Syrup',
            Quantity=2,
            Status='pending',
        )

        response = self.client.patch(
            f'/backend/stock-transfers/{transfer.StockTransferID}/',
            {'Status': 'approved'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        transfer.refresh_from_db()
        self.assertEqual(transfer.Status, 'approved')
