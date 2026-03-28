from collections import defaultdict

from django.db import transaction

from .models import Inventory, Order


class OrderCompletionService:
    INGREDIENT_FIELDS = (
        ('SodaUsed', 'Soda'),
        ('SyrupsUsed', 'Syrup'),
        ('AddIns', 'Add In'),
    )

    @staticmethod
    def _normalize(name):
        return (name or '').strip().lower()

    @classmethod
    def extract_ingredients(cls, order):
        """Aggregate ingredient counts across all drinks in the order."""
        aggregated = defaultdict(int)

        for drink in order.Drinks.all():
            for field_name, item_type in cls.INGREDIENT_FIELDS:
                values = getattr(drink, field_name, []) or []
                for value in values:
                    normalized = cls._normalize(value)
                    if normalized:
                        aggregated[(item_type, normalized)] += 1

        return aggregated

    @classmethod
    def _find_inventory_item(cls, order, item_type, normalized_name):
        query = Inventory.objects.select_for_update().filter(
            ItemType=item_type,
            ItemName__iexact=normalized_name,
        )

        # Prefer store-specific inventory when order is tied to a store.
        if order.StoreID:
            store_item = query.filter(StoreID=order.StoreID).first()
            if store_item:
                return store_item

        return query.first()

    @classmethod
    @transaction.atomic
    def fulfill_order(cls, order_id):
        order = Order.objects.select_for_update().get(pk=order_id)

        if order.OrderStatus == 'completed':
            return order

        if order.PaymentStatus not in ['paid', 'remade']:
            raise ValueError('Order payment must be paid or remade before fulfillment.')

        ingredients = cls.extract_ingredients(order)
        if not ingredients:
            raise ValueError('Order has no ingredients to deduct.')

        # Pre-check all requirements before mutating inventory.
        inventory_targets = []
        for (item_type, normalized_name), quantity in ingredients.items():
            inventory_item = cls._find_inventory_item(order, item_type, normalized_name)
            if not inventory_item:
                raise ValueError(f"Inventory item missing for {item_type}: {normalized_name}")
            if inventory_item.Quantity < quantity:
                raise ValueError(
                    f"Insufficient stock for {inventory_item.ItemName}. Required {quantity}, available {inventory_item.Quantity}."
                )
            inventory_targets.append((inventory_item, quantity))

        # Apply deductions once all checks pass.
        for inventory_item, quantity in inventory_targets:
            inventory_item.Quantity -= quantity
            inventory_item.save(update_fields=['Quantity', 'LastUpdated'])

        order.OrderStatus = 'completed'
        order.save(update_fields=['OrderStatus'])

        return order
