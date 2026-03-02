from django.core.management.base import BaseCommand
from backend.models import (
    Region, Store, SupplyHub, Machine, MaintenanceLog, UserProfile,
    Inventory, Drink, Preference,
)
from django.contrib.auth.models import User
from django.utils import timezone
import random

# Region A–G per RequirementsDoc 2.2.1 and 2.4.1
REGIONS = [
    ('A', 'Region A', 'Chicago, IL'),
    ('B', 'Region B', 'New Jersey / New York'),
    ('C', 'Region C', 'Logan, UT'),
    ('D', 'Region D', 'Dallas, TX'),
    ('E', 'Region E', 'Atlanta, GA'),
    ('F', 'Region F', 'Phoenix, AZ'),
    ('G', 'Region G', 'Boise, ID'),
]


class Command(BaseCommand):
    help = 'Populates the database with initial data (regions, hubs, stores, users, inventory, drinks, machines)'

    def handle(self, *args, **kwargs):
        # 1. Regions and supply hubs (7 each)
        regions = {}
        hubs = {}
        for code, name, hub_city in REGIONS:
            r = Region.objects.create(Code=code, Name=name, HubCity=hub_city)
            regions[code] = r
            hub = SupplyHub.objects.create(Region=r, Name=f'Hub {code}', Location=hub_city)
            hubs[code] = hub

        # 2. Stores: 20 in Region C, 5+ in each other region (RequirementsDoc 2.4.2)
        default_store = None
        for code, region in regions.items():
            n = 20 if code == 'C' else 5
            for i in range(n):
                store = Store.objects.create(
                    Name=f'Store {code}-{i+1}',
                    Region=region,
                    Address=f'Address {code}-{i+1}',
                    IsActive=True,
                )
                if code == 'C' and i == 0:
                    default_store = store

        if default_store is None:
            default_store = Store.objects.first()

        # 3. Users: super, staff, test, test2 + 7 logistics + 1 repair (2.4.3)
        super_user = User.objects.create_superuser(
            username='super',
            email='supertest@test.com',
            password='password',
            first_name='Lemonjello',
            last_name='Smith',
        )
        staff_user = User.objects.create_user(
            username='staff',
            email='staff@codepop.com',
            password='password',
            first_name='Orlando',
            is_staff=True,
            is_superuser=False,
        )
        user1 = User.objects.create_user(
            username='test',
            email='test@test.com',
            password='password',
            first_name='Orangejello',
            last_name='Smith',
        )
        user2 = User.objects.create_user(
            username='test2',
            email='test@testing.com',
            password='password',
            first_name='Bob',
            last_name='Bobsford',
        )

        logistics_users = {}
        for code in regions:
            u = User.objects.create_user(
                username=f'logistics_{code.lower()}',
                email=f'logistics-{code}@codepop.com',
                password='password',
                first_name=f'Logistics {code}',
                is_staff=True,
                is_superuser=False,
            )
            logistics_users[code] = u

        repair_user = User.objects.create_user(
            username='repair_c',
            email='repair-c@codepop.com',
            password='password',
            first_name='Repair Region C',
            is_staff=True,
            is_superuser=False,
        )

        # 4. UserProfile: role and assignments
        UserProfile.objects.get_or_create(User=super_user, defaults={'Role': 'super'})
        UserProfile.objects.get_or_create(User=staff_user, defaults={'Role': 'manager'})
        UserProfile.objects.get_or_create(User=user1, defaults={'Role': 'user'})
        UserProfile.objects.get_or_create(User=user2, defaults={'Role': 'user'})
        for code, u in logistics_users.items():
            UserProfile.objects.get_or_create(
                User=u,
                defaults={'Role': 'logistics', 'AssignedHub': hubs[code], 'AssignedRegion': regions[code]},
            )
        UserProfile.objects.get_or_create(
            User=repair_user,
            defaults={'Role': 'repair', 'AssignedRegion': regions['C']},
        )

        # 5. Inventory (per default_store for backward compat; one set of items)
        sodas = [
            'Mtn. Dew', 'Diet Mtn. Dew', 'Dr. Pepper', 'Diet Dr. Pepper', 'Dr. Pepper Zero',
            'Dr Pepper Cream Soda', 'Sprite', 'Sprite Zero', 'Coke', 'Diet Coke', 'Coke Zero',
            'Pepsi', 'Diet Pepsi', 'Rootbeer', 'Fanta', 'Big Red', 'Powerade', 'Lemonade', 'Light Lemonade',
        ]
        syrups = [
            'Coconut', 'Pineapple', 'Strawberry', 'Raspberry', 'Blackberry', 'Blue Curacao', 'Passion Fruit',
            'Vanilla', 'Pomegranate', 'Peach', 'Grapefruit', 'Green Apple', 'Pear', 'Cherry', 'Cupcake',
            'Orange', 'Blood Orange', 'Mango', 'Cranberry', 'Blue Raspberry', 'Grape', 'Sour', 'Kiwi',
            'Chocolate', 'Milano', 'Huckleberry', 'Sweetened Lime', 'Mojito', 'Lemon Lime', 'Cinnamon',
            'Watermelon', 'Guava', 'Banana', 'Lavender', 'Cucumber', 'Salted Caramel', 'Choc Chip Cookie Dough',
            'Brown Sugar Cinnamon', 'Hazelnut', 'Pumpkin Spice', 'Peppermint', 'Irish Cream', 'Gingerbread',
            'White Chocolate', 'Butterscotch', 'Bubble Gum', 'Cotton Candy', 'Butterbrew Mix',
        ]
        add_ins = [
            'Cream', 'Coconut Cream', 'Whip', 'Lemon Wedge', 'Lime Wedge', 'French Vanilla Creamer',
            'Candy Sprinkles', 'Strawberry Puree', 'Peach Puree', 'Mango Puree', 'Raspberry Puree',
        ]
        physical_items = ['Large Cups', 'Med Cups', 'Small Cups', 'Large Lids', 'Small Lids', 'Straws']

        def gen_inv(item_name, item_type):
            q = random.randint(50, 100)
            t = max(1, q - random.randint(1, 10))
            return {
                'Store': default_store,
                'ItemName': item_name,
                'ItemType': item_type,
                'Quantity': q,
                'ThresholdLevel': t,
            }

        for s in sodas:
            Inventory.objects.create(**gen_inv(s, 'Soda'))
        for s in syrups:
            Inventory.objects.create(**gen_inv(s, 'Syrup'))
        for a in add_ins:
            Inventory.objects.create(**gen_inv(a, 'Add In'))
        for p in physical_items:
            Inventory.objects.create(**gen_inv(p, 'Physical'))

        # 6. Drinks
        drink_data = [
            {'Name': 'Coke Float', 'SyrupsUsed': ['Vanilla'], 'SodaUsed': ['Coke'], 'AddIns': ['Cream'], 'Price': 5.99, 'User_Created': False},
            {'Name': 'Seasonal Depression', 'SyrupsUsed': ['Cinnamon', 'Chocolate', 'Pumpkin Spice', 'Cucumber'], 'SodaUsed': ['Rootbeer'], 'AddIns': ['Candy Sprinkles'], 'Rating': 0.0, 'Price': 4.99, 'User_Created': False},
            {'Name': "I've Heard It Both Ways", 'SyrupsUsed': ['Pineapple', 'Bubble Gum', 'Cotton Candy'], 'SodaUsed': ['Dr. Pepper'], 'AddIns': ['Lime Wedge'], 'Price': 2.50, 'User_Created': False},
            {'Name': 'Fall Girlie', 'SyrupsUsed': ['Pumpkin Spice', 'Salted Caramel'], 'SodaUsed': ['Dr. Pepper'], 'AddIns': ['Whip', 'Candy Sprinkles'], 'Price': 2.50, 'User_Created': False},
            {'Name': 'Red Rizz', 'SyrupsUsed': ['Peach', 'Cranberry'], 'SodaUsed': ['Big Red'], 'AddIns': ['Peach Puree'], 'Price': 2.50, 'User_Created': False},
            {'Name': '#Lemons', 'SyrupsUsed': ['Huckleberry'], 'SodaUsed': ['Lemonade'], 'AddIns': [], 'Price': 2.50, 'User_Created': False},
        ]
        for d in drink_data:
            Drink.objects.create(**d)

        # 7. Preferences
        for uid, prefs in [
            (user1, ['mango', 'strawberry', 'mtn. dew']),
            (user2, ['peach', 'pumpkin_spice', 'dr. pepper']),
            (super_user, ['pear', 'cherry', 'cupcake', 'rootbeer']),
        ]:
            for p in prefs:
                Preference.objects.create(UserID=uid, Preference=p)

        # 8. Machines and maintenance logs (2 machines per store, a few logs)
        statuses = ['normal', 'warning', 'repair-start', 'repair-end', 'error', 'out-of-order', 'schedule-service']
        for store in Store.objects.all()[:15]:  # first 15 stores get machines
            for idx, mtype in enumerate(['soda_dispenser', 'syrup_station']):
                m = Machine.objects.create(
                    Store=store,
                    MachineType=mtype,
                    Model=f'Model-{idx+1}',
                    OperationalStartDate=timezone.now().date(),
                    CurrentStatus=random.choice(['normal', 'normal', 'warning']),
                )
                if m.CurrentStatus != 'normal':
                    MaintenanceLog.objects.create(Machine=m, Status=m.CurrentStatus, ResponsibleUser=repair_user, Notes='Initial status')
        # Add a couple more logs for first machine
        first_machine = Machine.objects.first()
        if first_machine:
            MaintenanceLog.objects.create(Machine=first_machine, Status='normal', ResponsibleUser=repair_user, Notes='Routine check')

        self.stdout.write(self.style.SUCCESS('Successfully populated: 7 regions, 7 hubs, 35+ stores, users (incl. logistics/repair), inventory, drinks, preferences, machines, maintenance logs.'))
