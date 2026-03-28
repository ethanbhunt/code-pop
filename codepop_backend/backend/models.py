from django.db import models
from django.contrib.auth.models import User
from django.contrib.postgres.fields import ArrayField
from django.utils import timezone


class Store(models.Model):
    StoreID = models.AutoField(primary_key=True)
    Name = models.CharField(max_length=120)
    Region = models.CharField(max_length=80)
    City = models.CharField(max_length=80)
    State = models.CharField(max_length=40, default='UT')
    Latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    Longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    Active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.Name} ({self.Region})"


class SupplyHub(models.Model):
    HubID = models.AutoField(primary_key=True)
    Name = models.CharField(max_length=120, unique=True)
    Region = models.CharField(max_length=80)
    Latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    Longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    MaxDeliveryRadiusMiles = models.PositiveIntegerField(default=1000)
    Active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.Name} ({self.Region})"

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
    Size = models.CharField(max_length=10, default="24oz")
    Ice = models.CharField(max_length=20, default="regular")
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
    StoreID = models.ForeignKey(Store, on_delete=models.CASCADE, null=True, blank=True, db_index=True)
    HubID = models.ForeignKey(SupplyHub, on_delete=models.CASCADE, null=True, blank=True, related_name='inventory_items')
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
    StoreID = models.ForeignKey(Store, on_delete=models.SET_NULL, null=True, blank=True, db_index=True)
    UserID = models.ForeignKey(User, on_delete=models.CASCADE, null=True)
    Drinks = models.ManyToManyField(Drink)
    OrderStatus = models.CharField(max_length=50, choices=ORDER_STATUS_CHOICES, default='pending')
    PaymentStatus = models.CharField(max_length=50, choices=PAYMENT_STATUS_CHOICES, default='pending')
    PickupTime = models.DateTimeField(null=True, blank=True)
    CreationTime = models.DateTimeField(auto_now_add=True)
    LockerCombo = models.BigIntegerField(null=True)
    StripeID = models.CharField(max_length=255, blank=True, null=True)
    
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
    TotalAmount = models.FloatField(default=0.0)
    SaleDate = models.DateTimeField(default=timezone.now)
    Refunded = models.BooleanField(default= False)

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


class StockTransfer(models.Model):
    TRANSFER_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('in_transit', 'In Transit'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    StockTransferID = models.AutoField(primary_key=True)
    HubID = models.ForeignKey(SupplyHub, on_delete=models.CASCADE, related_name='outgoing_transfers')
    StoreID = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='incoming_transfers')
    ItemName = models.CharField(max_length=100)
    ItemType = models.CharField(max_length=50, choices=Inventory.ITEM_TYPES)
    Quantity = models.PositiveIntegerField()
    Status = models.CharField(max_length=30, choices=TRANSFER_STATUS_CHOICES, default='pending')
    RequestedAt = models.DateTimeField(auto_now_add=True)
    UpdatedAt = models.DateTimeField(auto_now=True)

    def __str__(self):
        return (
            f"Transfer {self.StockTransferID}: {self.Quantity} {self.ItemName} "
            f"from {self.HubID.Name} to {self.StoreID.Name} ({self.Status})"
        )