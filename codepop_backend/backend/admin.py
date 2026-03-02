from django.contrib import admin
from .models import (
    Region, Store, SupplyHub, Machine, MaintenanceLog, Shipment, UserProfile, GuestSession,
    Preference, Drink, Inventory, Notification, Order, Revenue,
)

admin.site.register(Region)
admin.site.register(Store)
admin.site.register(SupplyHub)
admin.site.register(Machine)
admin.site.register(MaintenanceLog)
admin.site.register(Shipment)
admin.site.register(UserProfile)
admin.site.register(GuestSession)
admin.site.register(Preference)
admin.site.register(Drink)
admin.site.register(Inventory)
admin.site.register(Notification)
admin.site.register(Order)
admin.site.register(Revenue)
