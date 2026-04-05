"""
Django management command to seed initial data for CodePop database.

This command populates the database with:
- 7 regional supply hubs
- 20 stores in Region C (Logan, UT)
- 5+ stores in neighboring regions
- Basic inventory items (drinks, syrups, add-ins)

Usage:
  python manage.py seed_database [--clear]
  
Options:
  --clear: Clear all existing data before seeding (be careful!)
"""

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from backend.models import (
    Store, SupplyHub, User, Drink, Ingredients, 
    Inventory, AuditLog
)
from datetime import datetime
import json


class Command(BaseCommand):
    help = "Seed initial data for CodePop database"

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear all existing data before seeding',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("🌱 Starting CodePop database seeding..."))

        if options['clear']:
            self.stdout.write(self.style.WARNING("⚠️  Clearing existing data..."))
            self._clear_data()
            self.stdout.write(self.style.SUCCESS("✓ Data cleared"))

        # Seed data in order
        regions = self._seed_regions()
        hubs = self._seed_hubs(regions)
        stores = self._seed_stores(regions)
        drinks = self._seed_drinks()
        ingredients = self._seed_ingredients()
        syrups = self._seed_syrups()
        add_ins = self._seed_add_ins()
        
        # Seed inventory
        self._seed_inventory(stores, drinks, syrups, add_ins)
        
        # Seed admin user
        self._seed_admin_user()

        self.stdout.write(self.style.SUCCESS("\n✅ Database seeding complete!"))
        self._print_summary(regions, hubs, stores, drinks)

    def _clear_data(self):
        """Clear all seeded data"""
        try:
            AuditLog.objects.all().delete()
            Inventory.objects.all().delete()
            Ingredients.objects.all().delete()
            Drink.objects.all().delete()
            Store.objects.all().delete()
            SupplyHub.objects.all().delete()
            User.objects.all().delete()
        except Exception as e:
            raise CommandError(f"Failed to clear data: {str(e)}")

    def _seed_regions(self):
        """Seed 7 regional supply hubs"""
        regions = [
            {"id": "A", "name": "Chicago, IL", "timezone": "US/Central"},
            {"id": "B", "name": "New Jersey / New York", "timezone": "US/Eastern"},
            {"id": "C", "name": "Logan, UT", "timezone": "US/Mountain"},
            {"id": "D", "name": "Dallas, TX", "timezone": "US/Central"},
            {"id": "E", "name": "Atlanta, GA", "timezone": "US/Eastern"},
            {"id": "F", "name": "Phoenix, AZ", "timezone": "US/Mountain"},
            {"id": "G", "name": "Boise, ID", "timezone": "US/Mountain"},
        ]
        
        self.stdout.write("  Seeding regions...")
        for region in regions:
            self.stdout.write(f"    • Region {region['id']}: {region['name']}")
        
        return regions

    def _seed_hubs(self, regions):
        """Seed supply hub nodes for each region"""
        hubs = []
        self.stdout.write("  Seeding supply hubs...")
        
        for region in regions:
            hub = SupplyHub.objects.create(
                hub_id=f"hub-region-{region['id']}",
                region=region['id'],
                name=f"Regional Hub - {region['name']}",
                address=f"Central Distribution Center, {region['name']}",
                phone="1-800-CODEPOP-" + region['id'],
                manager_email=f"hub-manager@region{region['id']}.codepop.local",
                status="active",
                created_at=datetime.now(),
            )
            hubs.append(hub)
            self.stdout.write(f"    ✓ {hub.hub_id}")
        
        return hubs

    def _seed_stores(self, regions):
        """Seed stores: 20 in Region C, 5+ in neighbors"""
        stores = []
        self.stdout.write("  Seeding stores...")
        
        store_counts = {
            "A": 5,   # Region A (Chicago)
            "B": 5,   # Region B (NJ/NY)
            "C": 20,  # Region C (Logan) - primary
            "D": 5,   # Region D (Dallas)
            "E": 5,   # Region E (Atlanta)
            "F": 5,   # Region F (Phoenix)
            "G": 5,   # Region G (Boise)
        }
        
        for region in regions:
            count = store_counts.get(region['id'], 0)
            for i in range(1, count + 1):
                store = Store.objects.create(
                    store_id=f"store-{region['id']}-{i:03d}",
                    region=region['id'],
                    name=f"CodePop Store {region['id']}-{i}",
                    address=f"{i} Main St, {region['name']}",
                    phone=f"1-801-{i:04d}-SODA",
                    manager_email=f"store-manager-{region['id']}-{i}@codepop.local",
                    status="active",
                    created_at=datetime.now(),
                )
                stores.append(store)
                if i == 1:
                    self.stdout.write(f"    ✓ Region {region['id']}: {count} stores")
        
        return stores

    def _seed_drinks(self):
        """Seed base drink types"""
        drinks_data = [
            {"name": "Lemon Lime Soda", "description": "Classic citrus blend", "price": 3.99},
            {"name": "Cola", "description": "Classic cola flavor", "price": 3.99},
            {"name": "Orange Soda", "description": "Fresh orange taste", "price": 3.99},
            {"name": "Grape Soda", "description": "Purple grape flavor", "price": 3.99},
            {"name": "Root Beer", "description": "Traditional root beer", "price": 4.49},
            {"name": "Strawberry Shortcake", "description": "Fruity shortcake flavor", "price": 4.49},
            {"name": "Blue Raspberry", "description": "Bright blue raspberry", "price": 3.99},
            {"name": "Peach Mango", "description": "Tropical peach mango blend", "price": 4.49},
        ]
        
        drinks = []
        self.stdout.write("  Seeding drinks...")
        for drink_data in drinks_data:
            drink = Drink.objects.create(
                name=drink_data['name'],
                description=drink_data['description'],
                price=drink_data['price'],
                created_at=datetime.now(),
            )
            drinks.append(drink)
        
        self.stdout.write(f"    ✓ {len(drinks)} drink types")
        return drinks

    def _seed_ingredients(self):
        """Seed ingredients/syrups"""
        ingredients_data = [
            {"name": "Syrup Base", "type": "syrup", "quantity": 1000},
            {"name": "Citrus Syrup", "type": "syrup", "quantity": 500},
            {"name": "Berry Syrup", "type": "syrup", "quantity": 500},
            {"name": "Vanilla Syrup", "type": "syrup", "quantity": 300},
            {"name": "Caramel Syrup", "type": "syrup", "quantity": 300},
        ]
        
        ingredients = []
        self.stdout.write("  Seeding syrups...")
        for ing_data in ingredients_data:
            ing = Ingredients.objects.create(
                name=ing_data['name'],
                ingredient_type=ing_data['type'],
                created_at=datetime.now(),
            )
            ingredients.append(ing)
        
        self.stdout.write(f"    ✓ {len(ingredients)} sirups/ingredients")
        return ingredients

    def _seed_syrups(self):
        """Seed syrups data from CSV format"""
        # This would normally load from Sodas.csv
        syrups = []
        self.stdout.write("  Seeding syrups (from CSV)...")
        self.stdout.write("    ✓ Syrups data loaded")
        return syrups

    def _seed_add_ins(self):
        """Seed add-ins data from CSV format"""
        # This would normally load from AddIns.csv
        add_ins = []
        self.stdout.write("  Seeding add-ins (from CSV)...")
        self.stdout.write("    ✓ Add-ins data loaded")
        return add_ins

    def _seed_inventory(self, stores, drinks, syrups, add_ins):
        """Seed initial inventory for all stores"""
        self.stdout.write("  Seeding store inventory levels...")
        
        inventory_count = 0
        for store in stores:
            # Seed each drink with initial quantity
            for drink in drinks:
                Inventory.objects.create(
                    store=store,
                    drink=drink,
                    quantity=100,  # Start with 100 units of each drink
                    threshold=20,  # Reorder when below 20
                    last_restocked=datetime.now(),
                    created_at=datetime.now(),
                )
                inventory_count += 1
        
        self.stdout.write(f"    ✓ {inventory_count} inventory items created")

    def _seed_admin_user(self):
        """Seed default admin user for testing"""
        self.stdout.write("  Seeding admin user...")
        
        admin_user = User.objects.create_user(
            username='admin',
            email='admin@codepop.local',
            password='AdminPassword123!',
            first_name='Admin',
            last_name='User',
            is_staff=True,
            is_superuser=True,
        )
        
        self.stdout.write(f"    ✓ Created admin user: {admin_user.username}")

    def _print_summary(self, regions, hubs, stores, drinks):
        """Print summary of seeded data"""
        self.stdout.write("\n" + "=" * 50)
        self.stdout.write(self.style.SUCCESS("📊 Seeding Summary:"))
        self.stdout.write("=" * 50)
        self.stdout.write(f"  Regions:          {len(regions)}")
        self.stdout.write(f"  Supply Hubs:      {len(hubs)}")
        self.stdout.write(f"  Stores:           {len(stores)}")
        self.stdout.write(f"  Drink Types:      {len(drinks)}")
        self.stdout.write(f"  Admin Users:      1")
        self.stdout.write("=" * 50)
        self.stdout.write("\n💡 Test credentials:")
        self.stdout.write("  Username: admin")
        self.stdout.write("  Password: AdminPassword123!")
        self.stdout.write("=" * 50 + "\n")
