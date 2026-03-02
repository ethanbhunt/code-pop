from django.urls import path
from rest_framework.authtoken.views import obtain_auth_token
from .views import CreateUserAPIView, LogoutUserAPIView, CustomAuthToken
from .views import StripePaymentIntentView
from .views import UserPreferenceLookup, PreferencesOperations
from .views import DrinkOperations, UserDrinksLookup
from .views import InventoryListAPIView, InventoryReportAPIView, InventoryUpdateAPIView
from .views import NotificationOperations, UserNotificationLookup
from .views import OrderOperations, UserOrdersLookup
from .customerAI import Chatbot
from .views import GenerateAIDrink
from .views import RevenueViewSet
from .views import UserOperations
from .views import emailAPI
from .views import (
    RegionListAPIView, StoreListAPIView, SupplyHubListAPIView,
    MachineListAPIView, MachineDetailAPIView, MaintenanceLogListAPIView,
    ShipmentListCreateAPIView, ShipmentDetailAPIView,
    GuestSessionCreateAPIView, GuestSessionGetAPIView,
)

#this ensures that the url calls the right function from the views for each type of request
preferences_list = PreferencesOperations.as_view({
    'get': 'list',
    'post': 'create'
})
#same as above ^
preferences_detail = PreferencesOperations.as_view({
    'get': 'retrieve',
    'put': 'update',
    'delete': 'destroy'
})

drink_list = DrinkOperations.as_view({
    'get': 'list',
    'post': 'create'
})

drink_detail = DrinkOperations.as_view({
    'get': 'retrieve',
    'put': 'update',
    'delete': 'destroy'
})

notification_list = NotificationOperations.as_view({
    'get': 'list',
    'post': 'create'
})

notification_detail = NotificationOperations.as_view({
    'get': 'retrieve',
    'put': 'update',
    'delete': 'destroy'
})

notification_filter_by_time = NotificationOperations.as_view({'get': 'filter_by_time'})

order_list = OrderOperations.as_view({
    'get': 'list',
    'post': 'create'
})

order_detail = OrderOperations.as_view({
    'get': 'retrieve',
    'put': 'update',
    'delete': 'destroy'
})

revenue_list = RevenueViewSet.as_view({'get': 'list', 'post': 'create'})

revenue_details = RevenueViewSet.as_view({'get': 'retrieve', 'put': 'update', 'delete': 'destroy'})

user_operations = UserOperations.as_view({
    'get': 'get',
    'post': 'edit',
    'delete': 'delete',
})


urlpatterns = [
    # Authentication related URLs
    # Endpoint for user login
    # - POST: Authenticates a user and returns an auth token.
    path('auth/login/', CustomAuthToken.as_view(), name='auth_user_login'),

    # Endpoint for user registration
    # - POST: Registers a new user and returns the user details.
    path('auth/register/', CreateUserAPIView.as_view(), name='auth_user_create'),

    # Endpoint for user logout
    # - POST: Logs out the user by invalidating the auth token.
    path('auth/logout/', LogoutUserAPIView.as_view(), name='auth_user_logout'),

    # Preference-related URLs
    # Endpoint to list all preferences or create a new preference
    # - GET: Retrieve a list of all preferences.
    # - POST: Create a new preference. Requires authentication and preference details in the request body.
    path('preferences/', preferences_list, name='preference_list_create'),  # List and create preferences

    # Endpoint to retrieve, update, or delete a specific preference by its primary key (ID)
    # - GET: Retrieve details of a specific preference.
    # - PUT: Update the specific preference.
    # - DELETE: Remove the specific preference from the database.
    path('preferences/<int:pk>/', preferences_detail, name='preference_detail'),  # Retrieve, update, or delete a preference

    # Retrieve preferences by UserID
    # Endpoint to list all preferences for a specific user identified by their user ID.
    # - GET: Retrieve a list of preferences for the specified user.
    path('users/<int:user_id>/preferences/', UserPreferenceLookup.as_view(), name='user_preferences_list'),

    # Drink URLs
    # Endpoint to list all drinks or create a new drink
    # - GET: Retrieve a list of drinks that are not user-created.
    # - POST: Create a new drink. Requires authentication and drink details in the request body.
    path('drinks/', drink_list, name='drink list and create'),

    # Endpoint to retrieve, update, or delete a specific drink by its primary key (ID)
    # - GET: Retrieve details of a specific drink.
    # - PUT: Update the specific drink.
    # - DELETE: Remove the specific drink from the database.
    path('drinks/<int:pk>/', drink_detail, name='drink operations'),

    # Retrieve Drinks by UserID
    path('users/<int:user_id>/drinks/', UserDrinksLookup.as_view(), name='user drink list'),

    #inventory related URLs
    # Endpoint to list all drinks created by a specific user identified by their user ID.
    # - GET: Retrieve a list of drinks for the specified user.
    path('users/<int:user_id>/drinks/', UserDrinksLookup.as_view(), name='user_preferences_list'),

    # Stripe payment
    path('create-payment-intent/', StripePaymentIntentView.as_view(), name='create-payment-intent'),

    # Inventory URLs
    # Endpoint to list all inventory items
    # - GET: Retrieve a list of all inventory items.
    # - POST: Create a new inventory item. Requires authentication and item details.
    path('inventory/', InventoryListAPIView.as_view(), name='inventory_list'),

    # Endpoint to generate an inventory report
    # - GET: Retrieve an inventory report.
    path('inventory/report/', InventoryReportAPIView.as_view(), name='inventory_report'),

    # Endpoint to retrieve, update, or delete a specific inventory item by its primary key (ID)
    # - GET: Retrieve details of a specific inventory item.
    # - PATCH: Update the quantity of the specific inventory item.
    # - DELETE: Remove the specific inventory item from the database.
    path('inventory/<int:pk>/', InventoryUpdateAPIView.as_view(), name='inventory_update'),

    # Notification related URLs
    path('notifications/', notification_list, name='notification list and create'),
    path('notifications/<int:pk>/', notification_detail, name='notification operations'),

    # Retrieve notifications by UserID
    path('users/<int:user_id>/notifications/', UserNotificationLookup.as_view(), name='user notifications list'),
    
     # Custom time-based notification filter
     # The request should have a start and end time specified in the params as follows
     # /backend/notifications/filter_by_time/?start=<start time in ISO 8601 format>&end=<end time in ISO 8601 format>
     # the date should be in ISO 8601 format
    path('notifications/filter_by_time/', notification_filter_by_time, name='notification filter by time'),

    #Order URLs

    # Endpoint to list all orders or create a new order.
    # - GET: Retrieve a list of all orders.
    # - POST: Create a new order. Requires authentication and order details in the request body.
    path('orders/', order_list, name='order_list_create'),

    # Endpoint to retrieve, update, or delete a specific order by its primary key (ID).
    # - GET: Retrieve details of a specific order.
    # - PATCH: Update the specific order (e.g., adding drinks).
    # - DELETE: Remove the specific order from the database.
    path('orders/<int:pk>/', order_detail, name='order_detail'),

    # Retrieve Orders by UserID

    # Endpoint to list all orders for a specific user identified by their user ID.
    # - GET: Retrieve a list of orders for the specified user.
    # - POST: Create a new order for the specified user. Requires authentication and order details.
    path('users/<int:user_id>/orders/', UserOrdersLookup.as_view(), name='user_orders_list_create'),

    # Endpoint to retrieve a specific order by its ID for a specific user.
    # - GET: Retrieve details of a specific order belonging to the specified user.
    # - DELETE: Remove the specific order from the database for the specified user.
    path('users/<int:user_id>/orders/<int:pk>/', order_detail, name='user_order_detail'),

    # Customer Service Chatbot
    # - POST: Send the User response and get back what the chatbot says
    path('chatbot/', Chatbot.as_view(), name='chatbot'),
    # Endpoint to call the drinkAI when the generate drink button is clicked
    # One for account users and one for general users
    # - GET: Retrive generated-drink information the AI sends back
    # For account users: expects a user_id to be provided
    path('generate/<int:user_id>/', GenerateAIDrink.as_view(), name='account_ai_drink'),
    
    # For general users: no user_id provided
    path('generate/', GenerateAIDrink.as_view(), name='general_ai_drink'),

    # Revenue related URLs
    # Endpoint to list all revenues or create a new revenue.
    # - GET: Retrieve a list of all revenues.
    # - POST: Create a new revenue. Requires authentication and revenue details in the request body.
    path('revenues/', revenue_list, name='revenue_list_create'),

    # Endpoint to retrieve, update, or delete a specific revenue by its primary key (ID).
    # - GET: Retrieve details of a specific revenue.
    # - PUT: Update the specific revenue.
    # - DELETE: Remove the specific revenue from the database.
    path('revenues/<int:pk>/', revenue_details, name='revenue_detail'),

    # Endpoint to do operations on user accounts for the Admin Dashboard
    # - GET: Retrieve a list of all users
    # - DELETE: Delete a user from the database
    # - PUT: Edit a user and update info in the database
    path('users/', user_operations, name='get_user_list'),
    path('users/delete/<int:user_id>/', user_operations, name='delete_user'),
    path('users/edit/<int:user_id>/', user_operations, name='edit_user'),

    path('email/<int:orderId>/', emailAPI.as_view(), name='Create Email'),

    # Multi-store, supply, maintenance, guest (RequirementsDoc / HLD)
    path('regions/', RegionListAPIView.as_view(), name='region_list'),
    path('stores/', StoreListAPIView.as_view(), name='store_list'),
    path('supply-hubs/', SupplyHubListAPIView.as_view(), name='supply_hub_list'),
    path('machines/', MachineListAPIView.as_view(), name='machine_list'),
    path('machines/<int:pk>/', MachineDetailAPIView.as_view(), name='machine_status'),
    path('maintenance-logs/', MaintenanceLogListAPIView.as_view(), name='maintenance_log_list'),
    path('shipments/', ShipmentListCreateAPIView.as_view(), name='shipment_list_create'),
    path('shipments/<int:pk>/', ShipmentDetailAPIView.as_view(), name='shipment_detail'),
    path('guest/session/', GuestSessionCreateAPIView.as_view(), name='guest_session_create'),
    path('guest/session/<str:session_id>/', GuestSessionGetAPIView.as_view(), name='guest_session_get'),
]
