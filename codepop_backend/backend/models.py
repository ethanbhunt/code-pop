from django.db import models
from django.contrib.auth.models import User
from django.contrib.postgres.fields import ArrayField
from django.utils import timezone


# --- Multi-store, supply, and maintenance (RequirementsDoc / HLD) ---

class Region(models.Model):
    """Geographic region for supply hubs and stores (e.g. A–G)."""
    RegionID = models.AutoField(primary_key=True)
    Code = models.CharField(max_length=10, unique=True)  # A, B, C, ...
    Name = models.CharField(max_length=255)
    HubCity = models.CharField(max_length=255, blank=True)  # e.g. Chicago IL, Logan UT

    def __str__(self):
        return f"{self.Code}: {self.Name}"


class Store(models.Model):
    """Store location; orders and inventory are scoped per store."""
    StoreID = models.AutoField(primary_key=True)
    Name = models.CharField(max_length=255)
    Region = models.ForeignKey(Region, on_delete=models.PROTECT, related_name='stores')
    Address = models.CharField(max_length=500, blank=True)
    Latitude = models.FloatField(null=True, blank=True)
    Longitude = models.FloatField(null=True, blank=True)
    IsActive = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.Name} ({self.Region.Code})"


class SupplyHub(models.Model):
    """Regional supply hub (one per region A–G)."""
    HubID = models.AutoField(primary_key=True)
    Region = models.OneToOneField(Region, on_delete=models.PROTECT, related_name='supply_hub')
    Name = models.CharField(max_length=255)
    Location = models.CharField(max_length=255)  # e.g. Chicago IL
    IsActive = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.Name} ({self.Region.Code})"


# Shared choices for machine maintenance status (RequirementsDoc 2.3.2)
MAINTENANCE_STATUS_CHOICES = [
    ('normal', 'Normal'),
    ('warning', 'Warning'),
    ('repair-start', 'Repair started'),
    ('repair-end', 'Repair ended'),
    ('error', 'Error'),
    ('out-of-order', 'Out of order'),
    ('schedule-service', 'Scheduled service'),
]


class Machine(models.Model):
    """Operational machine at a store (drink prep, etc.)."""
    MAINTENANCE_STATUS_CHOICES = MAINTENANCE_STATUS_CHOICES  # alias for views/serializers
    MachineID = models.AutoField(primary_key=True)
    Store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='machines')
    MachineType = models.CharField(max_length=100)  # e.g. soda_dispenser, syrup_pump
    Model = models.CharField(max_length=255, blank=True)
    OperationalStartDate = models.DateField(null=True, blank=True)
    CurrentStatus = models.CharField(max_length=50, choices=MAINTENANCE_STATUS_CHOICES, default='normal')

    def __str__(self):
        return f"{self.MachineType} @ {self.Store.Name} ({self.CurrentStatus})"


class MaintenanceLog(models.Model):
    """Log entry for machine status change (audit trail)."""
    LogID = models.AutoField(primary_key=True)
    Machine = models.ForeignKey(Machine, on_delete=models.CASCADE, related_name='maintenance_logs')
    Status = models.CharField(max_length=50, choices=MAINTENANCE_STATUS_CHOICES)
    Timestamp = models.DateTimeField(default=timezone.now)
    ResponsibleUser = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='maintenance_actions')
    Notes = models.TextField(blank=True)

    def __str__(self):
        return f"{self.Machine} -> {self.Status} @ {self.Timestamp}"


class Shipment(models.Model):
    """In-transit shipment from hub to store."""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_transit', 'In transit'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
    ]
    ShipmentID = models.AutoField(primary_key=True)
    Hub = models.ForeignKey(SupplyHub, on_delete=models.PROTECT, related_name='shipments')
    Store = models.ForeignKey(Store, on_delete=models.PROTECT, related_name='shipments')
    Status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='pending')
    EstimatedDelivery = models.DateTimeField(null=True, blank=True)
    CreatedAt = models.DateTimeField(auto_now_add=True)
    Notes = models.TextField(blank=True)

    def __str__(self):
        return f"Hub {self.Hub.Region.Code} -> {self.Store.Name} ({self.Status})"


class UserProfile(models.Model):
    """Extended role for CodePop (logistics_manager, repair_staff, etc.)."""
    ROLE_CHOICES = [
        ('user', 'User'),
        ('manager', 'Manager'),
        ('admin', 'Admin'),
        ('super', 'Super'),
        ('logistics', 'Logistics manager'),
        ('repair', 'Repair staff'),
    ]
    ProfileID = models.AutoField(primary_key=True)
    User = models.OneToOneField(User, on_delete=models.CASCADE, related_name='codepop_profile')
    Role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='user')
    AssignedRegion = models.ForeignKey(Region, on_delete=models.SET_NULL, null=True, blank=True, related_name='staff')  # for logistics/repair
    AssignedHub = models.ForeignKey(SupplyHub, on_delete=models.SET_NULL, null=True, blank=True, related_name='staff')

    def __str__(self):
        return f"{self.User.username} ({self.Role})"


class GuestSession(models.Model):
    """Server-side guest session for cart/preferences before login."""
    SessionID = models.CharField(max_length=64, unique=True, db_index=True)
    CreatedAt = models.DateTimeField(auto_now_add=True)
    CartSnapshot = models.JSONField(null=True, blank=True)  # optional cart data

    def __str__(self):
        return f"Guest {self.SessionID[:8]}..."


# --- Original models (with Store FK where needed) ---

class Preference(models.Model):
    # Primary key will be automatically created as 'id' unless you specify otherwise
    # You can also explicitly declare PreferenceID if needed
    PreferenceID = models.AutoField(primary_key=True)

    # Foreign key referencing the User model
    UserID = models.ForeignKey(User, on_delete=models.CASCADE)

    # Preference field with a string data type
    Preference = models.CharField(max_length=100, blank=False, null=False)

    def __str__(self):
        return f'Preference {self.PreferenceID} for User {self.UserID}: {self.Preference}'
    
class Drink(models.Model):
    DrinkID = models.AutoField(primary_key=True)
    Name = models.CharField(max_length=255)
    SyrupsUsed = ArrayField(models.CharField(max_length=255), blank=True, null=True)
    SodaUsed = ArrayField(models.CharField(max_length=255))
    AddIns = ArrayField(models.CharField(max_length=255), blank=True, null=True)
    Rating = models.FloatField(null=True, blank=True)
    Price = models.FloatField()
    Size = models.CharField(default="m")
    Ice = models.CharField(default="normal")
    User_Created = models.BooleanField()
    Favorite = models.ManyToManyField('auth.User', blank=True)

    def addFavorite(self, userToAdd):
        self.Favorite.add(User.objects.filter(id = userToAdd))

    def removeFavorite(self, userToRemove):
        self.Favorite.remove(User.objects.filter(id = userToRemove))

    def __str__(self):
        return self.Name
    
class Inventory(models.Model):
    ITEM_TYPES = [
        ('Soda', 'Soda'),
        ('Syrup', 'Syrup'),
        ('Add In', 'Add In'),
        ('Physical', 'Physical'),
    ]

    InventoryID = models.AutoField(primary_key=True)
    Store = models.ForeignKey(Store, on_delete=models.CASCADE, null=True, blank=True, related_name='inventory_items')  # null = legacy global inventory
    ItemName = models.CharField(max_length=100)
    ItemType = models.CharField(max_length=50, choices=ITEM_TYPES)
    Quantity = models.PositiveIntegerField()
    ThresholdLevel = models.PositiveIntegerField()
    LastUpdated = models.DateTimeField(auto_now=True)

    def is_out_of_stock(self):
        """Check if the item is out of stock (Quantity <= 0)."""
        return self.Quantity <= 0

    def __str__(self):
        return f"{self.ItemName} - {self.ItemType} (Qty: {self.Quantity})"

class Notification(models.Model):
    NotificationID = models.AutoField(primary_key=True)
    UserID = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    Message = models.CharField(max_length=500)  # Adjust max_length as needed
    Timestamp = models.DateTimeField(default=timezone.now)  # Sets timestamp to the creation date/time
    Type = models.CharField(max_length=50)  # Adjust max_length as needed
    Global = models.BooleanField(default=False)

    def __str__(self):
        return f"Notification for {self.UserID.username}: {self.Message[:50]} at time {self.Timestamp}"
    
class Order(models.Model):
    ORDER_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
        ('remade', 'Remade')
    ]

    OrderID = models.AutoField(primary_key=True)
    UserID = models.ForeignKey(User, on_delete=models.CASCADE, null=True)
    Store = models.ForeignKey(Store, on_delete=models.PROTECT, null=True, blank=True, related_name='orders')
    Drinks = models.ManyToManyField(Drink)
    OrderStatus = models.CharField(max_length=50, choices=ORDER_STATUS_CHOICES, default='pending')
    PaymentStatus = models.CharField(max_length=50, choices=PAYMENT_STATUS_CHOICES, default='pending')
    PickupTime = models.DateTimeField(null=True, blank=True)
    CreationTime = models.DateTimeField(auto_now_add=True)
    LockerCombo = models.BigIntegerField(null=True)
    StripeID = models.CharField(max_length=255, blank=True, default='')
    
    def add_drinks(self, drink_ids):
        # Assuming you have a ManyToMany field for drinks in your Order model
        for drink_id in drink_ids:
            drink = Drink.objects.get(DrinkID=drink_id)  # Assuming you have a Drink model
            self.Drinks.add(drink)  # Add the drink to the order
        self.save()  # Save the changes to the order
            
    def remove_drinks(self, drink_ids):
        """Remove drinks from the order."""
        for drink_id in drink_ids:
            drink = Drink.objects.get(DrinkID=drink_id)
            self.Drinks.remove(drink)  # Remove the drink from the order
        self.save()
        
    def __str__(self):
        return f"Order {self.OrderID} by User {self.UserID}"

class Revenue(models.Model):
    RevenueID = models.AutoField(primary_key=True)
    OrderID = models.IntegerField(default=1)
    Store = models.ForeignKey(Store, on_delete=models.SET_NULL, null=True, blank=True, related_name='revenues')
    TotalAmount = models.FloatField(default=0.0)
    SaleDate = models.DateTimeField(default=timezone.now)
    Refunded = models.BooleanField(default=False)

    def calculate_total_amount(self):
        """Calculate the total revenue for the order by summing the price of each drink."""
        try:
            order = Order.objects.get(OrderID=self.OrderID)
            total = sum(drink.Price for drink in order.Drinks.all())
            self.TotalAmount = total
            return total
        except Order.DoesNotExist:
            self.TotalAmount = 0  # Handle the case where the order doesn't exist
            return 0

    def save(self, *args, **kwargs):
        """Override the save method to automatically calculate the total amount unless explicitly set to 0."""
        if self.TotalAmount is None:  # Only calculate if TotalAmount is not set
            self.calculate_total_amount()
        super(Revenue, self).save(*args, **kwargs)

    def __str__(self):
        """Return a human-readable string representation of the revenue."""
        try:
            return f"Revenue {self.RevenueID} for Order {self.OrderID}: ${self.TotalAmount:.2f}"
        except Order.DoesNotExist:
            return f"Revenue {self.RevenueID} for unknown Order {self.OrderID}: ${self.TotalAmount:.2f}"