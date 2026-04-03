from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from .models import Store


class DeploymentSmokeTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='smoke_user', password='password123')
        self.token = Token.objects.create(user=self.user)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)

    def test_health_check_is_available_without_auth(self):
        anonymous_client = APIClient()
        response = anonymous_client.get('/backend/health/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'ok')

    def test_authenticated_user_can_create_and_read_stores(self):
        payload = {
            'Name': 'Test Store',
            'Region': 'Region C',
            'City': 'Logan',
            'State': 'UT',
            'Latitude': 41.73698,
            'Longitude': -111.833836,
            'Active': True,
        }

        create_response = self.client.post('/backend/stores/', payload, format='json')
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Store.objects.count(), 1)

        store_id = create_response.data['StoreID']
        detail_response = self.client.get(f'/backend/stores/{store_id}/')
        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_response.data['Name'], 'Test Store')
