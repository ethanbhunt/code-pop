import math

from django.db import transaction

from .models import Inventory, StockTransfer, Store, SupplyHub


class SupplyHubService:
    @staticmethod
    def _distance_miles(lat1, lon1, lat2, lon2):
        """Haversine distance in miles for store/hub nearest matching."""
        if None in (lat1, lon1, lat2, lon2):
            return float('inf')

        radius_miles = 3958.7613
        phi1 = math.radians(float(lat1))
        phi2 = math.radians(float(lat2))
        dphi = math.radians(float(lat2) - float(lat1))
        dlambda = math.radians(float(lon2) - float(lon1))

        a = (
            math.sin(dphi / 2) ** 2
            + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
        )
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return radius_miles * c

    @classmethod
    def findNearestHub(cls, store_id, item_name=None, item_type=None, quantity=1):
        store = Store.objects.get(pk=store_id)
        hubs = SupplyHub.objects.filter(Active=True)

        if item_name and item_type:
            hubs = hubs.filter(
                inventory_items__ItemName=item_name,
                inventory_items__ItemType=item_type,
                inventory_items__Quantity__gte=quantity,
            ).distinct()

        ranked_hubs = []
        for hub in hubs:
            distance = cls._distance_miles(
                store.Latitude,
                store.Longitude,
                hub.Latitude,
                hub.Longitude,
            )
            ranked_hubs.append((distance, hub))

        ranked_hubs.sort(key=lambda pair: pair[0])

        for distance, hub in ranked_hubs:
            if distance <= hub.MaxDeliveryRadiusMiles:
                return hub

        # Task fallback: if nothing is in regional radius, allow nearest candidate.
        return ranked_hubs[0][1] if ranked_hubs else None

    @classmethod
    @transaction.atomic
    def requestSupply(cls, item_name, quantity, store_id, item_type):
        hub = cls.findNearestHub(
            store_id=store_id,
            item_name=item_name,
            item_type=item_type,
            quantity=quantity,
        )
        if not hub:
            raise ValueError('No active supply hub can fulfill this request.')

        inventory = Inventory.objects.select_for_update().get(
            HubID=hub,
            ItemName=item_name,
            ItemType=item_type,
        )
        if inventory.Quantity < quantity:
            raise ValueError('Hub inventory is insufficient for this request.')

        inventory.Quantity -= quantity
        inventory.save(update_fields=['Quantity', 'LastUpdated'])

        return StockTransfer.objects.create(
            HubID=hub,
            StoreID=Store.objects.get(pk=store_id),
            ItemName=item_name,
            ItemType=item_type,
            Quantity=quantity,
            Status='pending',
        )
