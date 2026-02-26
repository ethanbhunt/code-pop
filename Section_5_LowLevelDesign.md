# Section 5: Security, Performance & Monitoring – Low-Level Design

**Document Version**: 1.0  
**Last Updated**: February 2026  
**Audience**: Internal Development Team  
**Scope**: Technical design for implementing security controls, performance optimization, and observability

---

## Executive Summary

CodePop requires a multi-layered approach to security, performance, and observability. This document defines the architectural design for:

1. **Security Architecture** – Role-based access control (RBAC), authentication flows, and token lifecycle management
2. **Security Controls** – Mitigation strategies for 7 OWASP-aligned threats (SQL injection, XSS, CSRF, auth bypass, data exposure, IDOR, misconfiguration)
3. **Data Protection** – Field-level encryption, key rotation, and sensitive data lifecycle management
4. **Compliance** – GDPR, CCPA, and PCI-DSS implementation patterns
5. **Performance** – Database optimization, async processing, caching, and horizontal scaling strategies
6. **Monitoring** – Observability stack architecture, metrics, thresholds, and alerting
7. **Testing** – Test pyramid, coverage targets, and CI/CD integration

**Implementation Order**: 5.1 → 5.2 → 5.3 → 5.4 → 5.5 → 5.6 → 5.7 (each section depends on previous work).

---

## 5.1 Security Architecture

### Authentication & Authorization Design

**Goal**: Implement secure user authentication with role-based access control (RBAC).

**User Model Structure**
```
User
├── id (primary key)
├── username (unique)
├── email (unique, encrypted at rest)
├── password_hash (Argon2id)
├── role (choice: super, manager, user)
├── is_active (boolean, for soft-deletes)
├── last_login (timestamp)
├── created_at (timestamp)
└── audit_trail (foreign key to AuditLog)
```

**Django Middleware Stack** (in order)
```
SecurityMiddleware
  ↓ (enforce HTTPS, set security headers)
SessionMiddleware
  ↓ (manage session cookies)
AuthenticationMiddleware
  ↓ (attach user to request.user)
MessageMiddleware
  ↓ (session-based messages)
CsrfViewMiddleware
  ↓ (CSRF token validation)
CustomRateLimitMiddleware
  ↓ (rate limiting for brute-force protection)
```

**RBAC Permission Matrix**
```
Role:        super      manager      user
├── Users
│  ├── Create     ✓          ✗          ✗
│  ├── Read       ✓          ✓ (own)    ✓ (own)
│  ├── Update     ✓          ✓ (own)    ✓ (own)
│  └── Delete     ✓          ✗          ✗
│
├── Orders
│  ├── Create     ✓          ✓          ✓
│  ├── Read       ✓          ✓ (own)    ✓ (own)
│  ├── Update     ✓          ✓ (own)    ✓ (own)
│  └── Cancel     ✓          ✓ (own)    ✓ (own)
│
├── Inventory
│  ├── View       ✓          ✓          ✗
│  ├── Update     ✓          ✓          ✗
│  └── Adjust     ✓          ✓          ✗
│
└── Reports
   ├── View       ✓          ✓          ✗
   └── Export     ✓          ✓          ✗
```

**Token Lifecycle Design**

For **web clients** (React): Django sessions
- Session cookie stored in browser (HttpOnly, Secure, SameSite=Strict)
- Server-side session store (PostgreSQL or Redis)
- No token required in headers

For **mobile clients** (Expo): JWT tokens
```
AccessToken (JWT)
├── Payload: {user_id, role, email, exp: 15min}
├── Signature: HS256 with SECRET_KEY
└── Usage: Authorization header (Bearer token)

RefreshToken (opaque)
├── Stored: HttpOnly cookie or secure storage
├── Lifetime: 7 days
└── Purpose: Obtain new access token
```

**Implementation Pattern**
```python
# Authentication flow
class LoginView(APIView):
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        
        # Validate input (rate limit, check if user exists)
        if not validate_input(username, password):
            log_failed_attempt(request.ip, username)
            return Response({'error': 'Invalid input'}, status=401)
        
        # Authenticate user
        user = User.objects.filter(username=username).first()
        if not user or not check_password(password, user.password_hash):
            log_failed_attempt(request.ip, username)
            return Response({'error': 'Invalid credentials'}, status=401)
        
        # Generate tokens (JWT for mobile, session for web)
        if request.headers.get('X-Client') == 'mobile':
            access_token = generate_jwt_token(user, expires_in=900)  # 15 min
            refresh_token = generate_jwt_token(user, expires_in=604800)  # 7 days
            return Response({
                'access_token': access_token,
                'refresh_token': refresh_token
            })
        else:
            create_session(request, user)
            return Response({'status': 'authenticated'})
```

**RBAC Authorization Decorator**
```python
def require_role(*allowed_roles):
    def decorator(view_func):
        def wrapper(request, *args, **kwargs):
            if not request.user.is_authenticated:
                log_unauthorized_access(request.path, 'not_authenticated')
                return Response({'error': 'Unauthorized'}, status=401)
            
            if request.user.role not in allowed_roles:
                log_unauthorized_access(request.user.id, request.path)
                return Response({'error': 'Forbidden'}, status=403)
            
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator

# Usage
@require_role('super', 'manager')
def delete_user(request, user_id):
    # Only super & manager can delete users
    user = User.objects.get(id=user_id)
    user.delete()
    return Response(status=204)
```

**Verification**
```python
# Test: Unauthorized user cannot access restricted endpoint
def test_rbac_unauthorized_access():
    user = create_test_user(role='user')
    response = client.delete(
        '/api/users/123',
        HTTP_AUTHORIZATION=f'Bearer {get_token(user)}'
    )
    assert response.status_code == 403

# Test: Correct role can access endpoint
def test_rbac_authorized_access():
    user = create_test_user(role='manager')
    response = client.delete(
        '/api/users/123',
        HTTP_AUTHORIZATION=f'Bearer {get_token(user)}'
    )
    assert response.status_code in [200, 204]
```

---

## 5.2 Security Controls & Risk Mitigation

### Threat Model Matrix

| Threat | Risk | Mitigation | Detection | Verification |
|--------|------|-----------|-----------|--------------|
| **1. SQL Injection** | Attacker executes malicious SQL queries | Use Django ORM (parameterized queries); no raw SQL; input validation via serializers | Code review for `.raw()`, `.execute()`; static analysis tool (bandit) | Test: inject SQL in search parameter; confirm query fails safely |
| **2. Cross-Site Scripting (XSS)** | Attacker injects malicious JS in forms/comments | React auto-escapes strings; DRF serializer validation; CSP headers | Code review for `dangerouslySetInnerHTML`; CSP violation logs | Test: submit `<script>alert('xss')</script>` in text field; confirm escaped |
| **3. Cross-Site Request Forgery (CSRF)** | Attacker tricks user into making unwanted request | Django CSRF middleware + token; SameSite cookies; HTTPS only | CSRF token present in POST forms; SameSite cookie set | Test: POST without CSRF token; confirm 403 error |
| **4. Authentication Bypass** | Attacker gains access without valid credentials | Strong password policy (12+ chars); rate limiting (5 attempts → 15min lockout); no default credentials | Failed login attempts logged; account lockout tracking; monitor auth logs | Test: brute-force login endpoint; confirm lockout after 5 attempts |
| **5. Sensitive Data Exposure** | Payment/email/location data leaked | Encryption at rest (AES-256); TLS in transit; PCI-DSS via Stripe; never log passwords | Data access audit log; encryption key access control; TLS certificate validation | Test: verify email field encrypted in DB; confirm TLS 1.3 only |
| **6. Insecure Direct Object References (IDOR)** | User accesses another user's data | Authorization check on every endpoint; validate user context; filter queries by user | Code review for missing auth checks; test coverage for access control | Test: user A tries to access user B's order; confirm 403 error |
| **7. Security Misconfiguration** | Secrets exposed; weak defaults; unpatched dependencies | Environment variables for secrets; secure defaults in settings.py; dependency scanning | Pre-commit hook (detect-secrets); dependency audit (Snyk); security audit | Test: verify SECRET_KEY not in code; check .env in .gitignore |

### Implementation Patterns

**Input Validation**
```python
# Use DRF serializers for validation
class UserSerializer(serializers.ModelSerializer):
    email = serializers.EmailField()
    password = serializers.CharField(
        min_length=12,
        validators=[
            validators.validate_password
        ]
    )
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'role']
    
    def validate_username(self, value):
        # Reject special characters, SQL keywords
        if not value.replace('_', '').isalnum():
            raise serializers.ValidationError(
                "Username must be alphanumeric"
            )
        return value
```

**Authorization Check Pattern**
```python
# Check user owns resource before accessing
class OrderDetailView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, order_id):
        order = Order.objects.get(id=order_id)
        
        # CRITICAL: Verify user owns order or is admin
        if order.user_id != request.user.id and \
           request.user.role not in ['super', 'manager']:
            log_unauthorized_access(
                request.user.id,
                'order_access',
                order_id
            )
            raise PermissionDenied()
        
        return Response(OrderSerializer(order).data)
```

**Structured Logging**
```python
import json
import logging

logger = logging.getLogger(__name__)

def log_failed_attempt(user_id, ip_address, reason):
    logger.warning(json.dumps({
        'event': 'authentication_failed',
        'user_id': user_id,
        'ip': ip_address,
        'reason': reason,
        'timestamp': utcnow().isoformat(),
        'request_id': get_request_id()
    }))

def log_unauthorized_access(user_id, resource, action):
    logger.warning(json.dumps({
        'event': 'unauthorized_access',
        'user_id': user_id,
        'resource': resource,
        'action': action,
        'timestamp': utcnow().isoformat()
    }))
```

---

## 5.3 Data Protection

### Encryption at Rest

**Field-Level Encryption** (use `django-cryptography`)
```python
from django_cryptography.fields import EncryptedCharField
from django_cryptography.fields import EncryptedDecimalField

class User(models.Model):
    email = EncryptedCharField(max_length=255)
    phone = EncryptedCharField(max_length=20, null=True)
    geolocation_lat = EncryptedDecimalField(null=True)
    geolocation_lng = EncryptedDecimalField(null=True)
    password_hash = models.CharField(max_length=255)
```

**Key Rotation Strategy**
```python
# Quarterly key rotation with versioning
from django.core.management.base import BaseCommand

class Command(BaseCommand):
    def handle(self, *args, **options):
        """
        1. Generate new master key (new version)
        2. Store old key as inactive
        3. Re-encrypt all fields with new key (background job)
        4. Archive old key with audit timestamp
        5. Destroy old key after 90 days
        """
        old_version = get_current_key_version()
        new_version = old_version + 1
        new_key = generate_key(version=new_version)
        
        store_key(new_key, version=new_version, status='active')
        
        # Async task: re-encrypt all EncryptedFields
        reencrypt_all_fields.delay(
            old_version=old_version,
            new_version=new_version
        )
        
        logger.info(json.dumps({
            'event': 'key_rotation_initiated',
            'old_version': old_version,
            'new_version': new_version,
            'timestamp': utcnow().isoformat()
        }))
```

### Encryption in Transit

**Django Settings**
```python
# settings.py
SECURE_SSL_REDIRECT = True  # Force HTTPS
SESSION_COOKIE_SECURE = True  # Only send over HTTPS
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# CSP Headers
SECURE_CONTENT_SECURITY_POLICY = {
    'default-src': ("'self'",),
    'script-src': ("'self'", "'unsafe-inline'"),
    'style-src': ("'self'", "'unsafe-inline'"),
}
```

### Sensitive Data Lifecycle

| Data Type | Storage | Encryption | Retention | Deletion |
|-----------|---------|-----------|-----------|----------|
| **Payment** | Stripe token only | N/A (Stripe handles) | Until order archived | Delete with order (1 year) |
| **Email** | User table | AES-256 (EncryptedCharField) | User lifetime | Delete on user erasure request |
| **Geolocation** | Location table | AES-256 | 24 hours | Auto-purge Celery task |
| **Password** | User table | Argon2id hash | User lifetime | Delete on password change |
| **Audit logs** | AuditLog table | Plaintext (sensitive events only) | 90 days | Auto-purge after retention |

---

## 5.4 Compliance Implementation

### GDPR Compliance

**Data Subject Access Request (DSAR) Endpoint**
```python
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

class GDPRDataExportView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Export user's personal data as JSON (right to access)
        """
        user = request.user
        data = {
            'user': {
                'id': user.id,
                'email': user.email,
                'created_at': user.created_at.isoformat()
            },
            'orders': [
                {
                    'id': o.id,
                    'total': float(o.total),
                    'created_at': o.created_at.isoformat()
                }
                for o in user.orders.all()
            ],
            'preferences': list(
                user.preferences.values('drink_id', 'rating')
            ),
            'audit_log': list(
                AuditLog.objects.filter(user=user).values(
                    'event', 'timestamp'
                )
            )
        }
        return Response(data)
```

**Right to Erasure (Deletion) Flow**
```python
class GDPRDeleteUserView(APIView):
    permission_classes = [IsAuthenticated]
    
    def delete(self, request):
        """
        Delete user and all associated data (right to erasure)
        """
        user = request.user
        user_id = user.id
        
        # 1. Log deletion request
        AuditLog.objects.create(
            user_id=user_id,
            event='user_deletion_requested',
            timestamp=utcnow()
        )
        
        # 2. Async task: cascade delete
        async_delete_user.delay(user_id=user_id)
        
        return Response({'status': 'deletion_in_progress'})

@shared_task
def async_delete_user(user_id):
    """Delete all user data"""
    user = User.objects.get(id=user_id)
    
    # Cascade delete with audit trail
    orders = Order.objects.filter(user=user)
    for order in orders:
        AuditLog.objects.create(
            event='order_deleted',
            user_id=user_id,
            timestamp=utcnow()
        )
        order.delete()
    
    preferences = Preference.objects.filter(user=user)
    preferences.delete()
    
    user.delete()
    AuditLog.objects.create(
        event='user_deleted',
        user_id=user_id,
        timestamp=utcnow()
    )
```

**Consent Management**
```python
class ConsentLog(models.Model):
    CONSENT_TYPES = [
        ('marketing', 'Marketing'),
        ('analytics', 'Analytics'),
        ('third_party', 'Third Party'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    consent_type = models.CharField(max_length=20, choices=CONSENT_TYPES)
    given = models.BooleanField()
    timestamp = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField()

# Every opt-in/opt-out is audited
def update_marketing_consent(user, consent):
    ConsentLog.objects.create(
        user=user,
        consent_type='marketing',
        given=consent,
        ip_address=get_client_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT')
    )
```

### CCPA Compliance

Similar to GDPR with CA-specific language:
- **Opt-out mechanism**: Add `do_not_sell` boolean to User model
- **Data disclosure**: Implement same DSAR endpoint with CCPA terminology
- **Verification**: Annual audit of opt-out requests

### PCI-DSS Status

**Compliance Statement**:
- We do NOT store, process, or transmit credit card data
- All payments processed via Stripe (PCI-DSS Level 1 certified)
- We store only Stripe payment tokens (low risk)
- **Annual attestation**: Update yearly with Stripe's compliance certification

---

## 5.5 Performance Architecture

### Database Query Optimization

**Indexing Strategy**
```python
class User(models.Model):
    username = models.CharField(
        max_length=150,
        db_index=True
    )
    email = EncryptedCharField(db_index=True)
    role = models.CharField(
        max_length=20,
        choices=[...],
        db_index=True
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True
    )
    
    class Meta:
        indexes = [
            models.Index(fields=['email', 'is_active']),
            models.Index(fields=['-created_at']),
        ]

class Order(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        db_index=True
    )
    status = models.CharField(max_length=20, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
```

**Query Optimization Patterns**
```python
# BAD: N+1 queries
orders = Order.objects.all()
for order in orders:
    print(order.user.email)  # One query per order!

# GOOD: Select related (foreign key)
orders = Order.objects.select_related('user')

# GOOD: Prefetch related (reverse FK)
users = User.objects.prefetch_related('orders')

# GOOD: Annotate for counts
users = User.objects.annotate(
    order_count=Count('orders')
)

# GOOD: Filter in database, not Python
recent_orders = Order.objects.filter(
    created_at__gte=utcnow() - timedelta(days=7)
)
```

**Connection Pooling** (pgbouncer)
```
# pgbouncer.ini
[databases]
codepop_database = \
    host=localhost \
    port=5432 \
    dbname=codepop_database

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 20
min_pool_size = 10
reserve_pool_size = 5
server_idle_timeout = 600
```

### Async Task Processing

**Payment Processing with Retries**
```python
from celery import shared_task
from celery.utils.log import get_task_logger
import stripe

logger = get_task_logger(__name__)

@shared_task(
    autoretry_for=(stripe.error.StripeError,),
    retry_kwargs={'max_retries': 3},
    bind=True
)
def process_payment(self, order_id):
    """
    Retry logic: exponential backoff (5s → 10s → 20s)
    """
    order = Order.objects.get(id=order_id)
    
    try:
        charge = stripe.Charge.create(
            amount=int(order.total * 100),
            currency='usd',
            source=order.stripe_token,
            idempotency_key=f"order_{order_id}"
        )
        
        order.status = 'paid'
        order.stripe_charge_id = charge.id
        order.save()
        
        logger.info(f"Payment succeeded for order {order_id}")
        
    except stripe.error.StripeError as exc:
        logger.error(f"Payment failed for order {order_id}: {str(exc)}")
        # Celery will retry automatically
        raise self.retry(exc=exc, countdown=5 * (2 ** self.request.retries))
```

### Caching Strategy

**Redis Caching with TTL**
```python
from django.views.decorators.cache import cache_page
from django.core.cache import cache

# Cache view output (60 seconds)
@cache_page(60)
def get_trending_drinks(request):
    return Response(Drink.objects.filter(trending=True).values())

# Cache in code (1 hour)
def get_user_recommendations(user_id):
    cache_key = f'recommendations:{user_id}'
    
    # Try cache first
    recommendations = cache.get(cache_key)
    if recommendations:
        return recommendations
    
    # Compute if not cached
    recommendations = ml_model.recommend(user_id)
    cache.set(cache_key, recommendations, timeout=3600)
    
    return recommendations

# Invalidate on update
def update_user_preference(user, preference):
    preference.save()
    cache.delete(f'recommendations:{user.id}')
```

### Concurrent Order Processing

**Optimistic Locking**
```python
from django.db.models import F

class Inventory(models.Model):
    drink = models.ForeignKey(Drink, on_delete=models.CASCADE)
    quantity = models.IntegerField()
    version = models.IntegerField(default=0)

def place_order(user, drink_id, quantity):
    """
    Update inventory with optimistic locking
    """
    inventory = Inventory.objects.get(drink_id=drink_id)
    original_version = inventory.version
    
    if inventory.quantity < quantity:
        raise ValueError("Out of stock")
    
    # Try to update
    updated = Inventory.objects.filter(
        id=inventory.id,
        version=original_version
    ).update(
        quantity=F('quantity') - quantity,
        version=F('version') + 1
    )
    
    if not updated:
        raise ValueError("Concurrent modification: retry order")
    
    # Create order
    Order.objects.create(
        user=user,
        drink_id=drink_id,
        quantity=quantity
    )
```

### Load Balancing & Scaling

**Horizontal Scaling with Nginx**
```
# nginx.conf (conceptual)
upstream django_app {
    server django_instance_1:8000;
    server django_instance_2:8000;
    server django_instance_3:8000;
}

server {
    listen 80;
    
    location / {
        proxy_pass http://django_app;
        proxy_set_header X-Forwarded-For $remote_addr;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        proxy_pass http://django_app;
    }
}
```

**Auto-Scaling Policy**
```
Scale Up:   if CPU > 70% for 2 minutes
Scale Down: if CPU < 30% for 5 minutes
Min instances: 2
Max instances: 10
Cooldown: 300 seconds between scaling events
```

---

## 5.6 Monitoring & Observability

### Observability Stack Architecture

**Layers**

| Layer | Tools | Purpose |
|-------|-------|---------|
| **Application** | Sentry, APM (DataDog/New Relic) | Error tracking, performance tracing, distributed tracing |
| **Infrastructure** | Prometheus, Grafana | Metrics collection, visualization, dashboards |
| **Logging** | Loki or ELK Stack | Centralized logs, search, aggregation |
| **Business** | Custom events/Mixpanel | Revenue, user engagement, conversion funnels |

**Instrumentation Points**
```
Request → Middleware (log start, set request ID)
        ↓
      View (log inputs, user context)
        ↓
      Serializer (log validation)
        ↓
      Service Layer (log business logic, timings)
        ↓
      Database (log queries, slow query alerts)
        ↓
      Cache (log hit/miss, TTL)
        ↓
      External API (log request/response, latency)
        ↓
      Response → Middleware (log status, duration, request ID)
```

### Key Metrics & Thresholds

**Application Metrics**
- Request latency: p95 < 200ms, p99 < 500ms
- Error rate: < 0.5%
- Payment success rate: > 95%
- Cache hit ratio: > 70% (recommendations)

**Infrastructure Metrics**
- Database connection pool: < 80% utilized
- Redis memory: < 80% used
- Disk space: > 10% free
- CPU per instance: < 70% average

**Business Metrics**
- Daily active users (DAU)
- Orders per day
- Payment success rate
- Average order value (AOV)
- User retention (30-day)

### Alerting Strategy

**Alert Severity Levels**
```
CRITICAL (Page PagerDuty immediately)
├── Database connection: 0 available
├── Payment failures: > 10% for 5 minutes
├── Error rate: > 5% for 5 minutes
├── Disk space: < 5% free
└── Redis down

WARNING (Email/Slack to #alerts)
├── High latency: p95 > 400ms for 10 minutes
├── Cache hit ratio: < 50% for 30 minutes
├── Slow queries: > 1 second execution time
└── Failed auth attempts: > 100/minute per IP

INFO (Dashboard only)
├── New deployments completed
├── Database backups finished
└── Routine metric drift (within 10%)
```

### Dashboard Structure (Conceptual)

**Overview Dashboard**
- SLO compliance (uptime %, latency %, error rate %)
- Request volume (RPS, trending)
- Top errors (exception type, frequency)
- Payment activity (success rate, transaction volume)

**Performance Dashboard**
- API latency histogram (p50, p95, p99)
- Database query times (slow query log)
- Cache hit/miss rates
- External API latencies (Stripe, Mapbox, Claude)

**Security Dashboard**
- Authentication failures (by user, IP)
- Authorization failures (denied requests)
- Suspicious activity (rate limit triggers)
- Data access audit log

**Business Dashboard**
- Revenue (daily, weekly, monthly)
- Order completion rate
- User growth (DAU, MAU)
- Conversion funnel (browse → search → order → pay)

---

## 5.7 Testing Strategy

### Test Pyramid & Coverage

```
              E2E Tests (critical user flows)
           ↑          ↑          ↑
         5%        5%        5%
     
          Integration Tests (40% coverage)
       ↑          ↑          ↑          ↑
     20%        20%        20%        20%
  
   Unit Tests (80% coverage of critical paths)
 ↑     ↑     ↑     ↑     ↑     ↑     ↑     ↑
Auth  Perm  Data  Valid Crypt Cache Async Error
10%   10%   10%   10%   10%   10%   15%   15%
```

### Test Organization

**File Structure**
```
/backend/tests/
├── __init__.py
├── conftest.py              # Shared fixtures
├── factories.py             # Factory Boy definitions
├── test_models.py           # Model tests
├── test_views.py            # API endpoint tests
├── test_serializers.py      # Serializer tests
├── test_auth.py             # Authentication tests
├── test_permissions.py      # RBAC tests
├── test_encryption.py       # Data protection tests
├── test_compliance.py       # GDPR/CCPA tests
├── test_performance.py      # Load/latency tests
└── fixtures/
    ├── users.json
    ├── orders.json
    └── ...
```

### Unit Test Patterns

**Authentication Tests**
```python
import pytest
from django.test import Client

@pytest.mark.django_db
def test_login_with_valid_credentials():
    from backend.models import User
    
    user = User.objects.create_user(
        username='alice',
        password='SecurePass123'
    )
    
    client = Client()
    response = client.post('/api/auth/login/', {
        'username': 'alice',
        'password': 'SecurePass123'
    })
    
    assert response.status_code == 200
    assert 'access_token' in response.json()

@pytest.mark.django_db
def test_login_with_invalid_password():
    from backend.models import User
    
    User.objects.create_user(
        username='alice',
        password='SecurePass123'
    )
    
    client = Client()
    response = client.post('/api/auth/login/', {
        'username': 'alice',
        'password': 'WrongPassword'
    })
    
    assert response.status_code == 401

@pytest.mark.django_db
def test_account_lockout_after_5_attempts():
    from backend.models import User
    
    user = User.objects.create_user(username='alice')
    client = Client()
    
    for _ in range(5):
        client.post('/api/auth/login/', {
            'username': 'alice',
            'password': 'WrongPassword'
        })
    
    response = client.post('/api/auth/login/', {
        'username': 'alice',
        'password': 'SecurePass123'
    })
    
    assert response.status_code == 429
```

**Authorization (RBAC) Tests**
```python
@pytest.mark.django_db
def test_user_cannot_delete_other_user():
    from backend.models import User
    
    user_a = User.objects.create_user(
        username='alice',
        role='user'
    )
    user_b = User.objects.create_user(
        username='bob',
        role='user'
    )
    
    client = Client()
    token = get_jwt_token(user_a)
    
    response = client.delete(
        f'/api/users/{user_b.id}/',
        HTTP_AUTHORIZATION=f'Bearer {token}'
    )
    
    assert response.status_code == 403

@pytest.mark.django_db
def test_manager_can_delete_user():
    from backend.models import User
    
    manager = User.objects.create_user(
        username='alice',
        role='manager'
    )
    user = User.objects.create_user(
        username='bob',
        role='user'
    )
    
    client = Client()
    token = get_jwt_token(manager)
    
    response = client.delete(
        f'/api/users/{user.id}/',
        HTTP_AUTHORIZATION=f'Bearer {token}'
    )
    
    assert response.status_code == 204
```

**Data Protection Tests**
```python
@pytest.mark.django_db
def test_email_encrypted_in_database():
    from backend.models import User
    from django.db import connection
    
    user = User.objects.create_user(
        username='alice',
        email='alice@example.com'
    )
    
    # Read raw from DB
    with connection.cursor() as cursor:
        cursor.execute(
            'SELECT email FROM auth_user WHERE id = %s',
            [user.id]
        )
        encrypted_email = cursor.fetchone()[0]
    
    # Should be encrypted (not plaintext)
    assert encrypted_email != 'alice@example.com'
    assert encrypted_email.startswith('$enc$')

@pytest.mark.django_db
def test_password_not_logged():
    """Ensure passwords don't appear in logs"""
    import logging
    
    with pytest.LogCaptureFixture.for_logger(
        logging.getLogger('backend')
    ) as logs:
        client = Client()
        response = client.post('/api/auth/login/', {
            'username': 'alice',
            'password': 'SecurePass123'
        })
    
    for record in logs.records:
        assert 'SecurePass123' not in record.message
```

### Integration Test Patterns

**API Endpoint Testing**
```python
@pytest.mark.django_db
def test_create_order_with_mocked_stripe():
    from unittest.mock import patch
    from backend.models import User, Drink, Order
    
    user = User.objects.create_user(username='alice')
    drink = Drink.objects.create(name='Cola', price=2.50)
    
    with patch('stripe.Charge.create') as mock_charge:
        mock_charge.return_value = {
            'id': 'ch_123',
            'status': 'succeeded'
        }
        
        client = Client()
        token = get_jwt_token(user)
        
        response = client.post(
            '/api/orders/',
            {
                'drink_id': drink.id,
                'quantity': 2,
                'payment_token': 'tok_visa'
            },
            HTTP_AUTHORIZATION=f'Bearer {token}'
        )
        
        assert response.status_code == 201
        assert mock_charge.called
```

**Database Integration Test**
```python
@pytest.mark.django_db
def test_order_creation_updates_inventory():
    from backend.models import User, Drink, Order, Inventory
    
    drink = Drink.objects.create(name='Cola', price=2.50)
    inventory = Inventory.objects.create(drink=drink, quantity=100)
    user = User.objects.create_user(username='alice')
    
    client = Client()
    token = get_jwt_token(user)
    
    response = client.post(
        '/api/orders/',
        {
            'drink_id': drink.id,
            'quantity': 5
        },
        HTTP_AUTHORIZATION=f'Bearer {token}'
    )
    
    inventory.refresh_from_db()
    assert inventory.quantity == 95
```

### E2E Test Patterns

**Critical User Flow**
```python
@pytest.mark.django_db
def test_end_to_end_order_flow():
    from backend.models import User, Drink
    
    # 1. Login
    client = Client()
    response = client.post('/api/auth/login/', {
        'username': 'alice',
        'password': 'SecurePass123'
    })
    token = response.json()['access_token']
    
    # 2. Browse drinks
    response = client.get(
        '/api/drinks/',
        HTTP_AUTHORIZATION=f'Bearer {token}'
    )
    assert response.status_code == 200
    drinks = response.json()
    assert len(drinks) > 0
    
    # 3. Add to cart
    response = client.post(
        '/api/cart/',
        {
            'drink_id': drinks[0]['id'],
            'quantity': 2
        },
        HTTP_AUTHORIZATION=f'Bearer {token}'
    )
    assert response.status_code == 201
    
    # 4. Checkout (place order)
    response = client.post(
        '/api/orders/',
        {
            'payment_token': 'tok_visa'
        },
        HTTP_AUTHORIZATION=f'Bearer {token}'
    )
    assert response.status_code == 201
    order = response.json()
    
    # 5. Verify order status
    response = client.get(
        f'/api/orders/{order["id"]}/',
        HTTP_AUTHORIZATION=f'Bearer {token}'
    )
    assert response.status_code == 200
    assert response.json()['status'] == 'pending'
```

### Performance Test Pattern (Locust)

```python
from locust import HttpUser, task, between

class CodePopUser(HttpUser):
    wait_time = between(1, 3)
    token = None
    
    @task(3)
    def browse_drinks(self):
        self.client.get(
            '/api/drinks/',
            headers={'Authorization': f'Bearer {self.token}'}
        )
    
    @task(1)
    def search_drink(self):
        self.client.get(
            '/api/drinks/?search=cola',
            headers={'Authorization': f'Bearer {self.token}'}
        )
    
    @task(1)
    def place_order(self):
        self.client.post(
            '/api/orders/',
            json={
                'drink_id': 1,
                'quantity': 1,
                'payment_token': 'tok_visa'
            },
            headers={'Authorization': f'Bearer {self.token}'}
        )
    
    def on_start(self):
        # Login once at start
        response = self.client.post(
            '/api/auth/login/',
            json={
                'username': 'load_test_user',
                'password': 'SecurePass123'
            }
        )
        self.token = response.json()['access_token']
```

### CI/CD Integration

**Pre-Commit Hooks**
```bash
# Check for secrets
detect-secrets scan --baseline .secrets.baseline

# Lint code
pylint backend/

# Type checking (optional)
mypy backend/
```

**PR Checks (GitHub Actions)**
```yaml
# Run on push to PR
- Run unit tests: pytest backend/tests/ --cov=backend
- Coverage report: Fail if < 80% on critical paths
- Security scan: bandit -r backend/
- Dependency check: pip-audit
```

**Pre-Merge Checks**
```bash
# Integration tests
pytest backend/tests/test_integration.py

# Security scanning
# OWASP ZAP automated scan (Docker)
```

**Post-Merge Deployment**
```bash
# Smoke tests on staging
pytest backend/tests/test_e2e.py

# Load test (baseline)
locust -f backend/tests/load_test.py --users=100 --run-time=5m --headless
```

---

## Implementation Dependencies

```
5.1 Security Architecture (FOUNDATION)
  ↓
  Implements: User model, auth middleware, RBAC
  
5.2 Security Controls (BUILD ON 5.1)
  ↓
  Depends on: Auth framework in place
  Implements: Input validation, authorization decorators
  
5.3 Data Protection (PARALLEL TO 5.2)
  ↓
  Depends on: User model structure
  Implements: Field encryption, key rotation
  
5.4 Compliance (BUILD ON 5.1-5.3)
  ↓
  Depends on: Auth, data protection in place
  Implements: GDPR/CCPA endpoints, audit logging
  
5.5 Performance (BUILD ON 5.1-5.4)
  ↓
  Depends on: All prior sections (full feature set)
  Implements: Caching, async tasks, load balancing
  
5.6 Monitoring (PARALLEL TO 5.5)
  ↓
  Depends on: All prior sections (instrumentation)
  Implements: Observability stack, dashboards, alerts
  
5.7 Testing (VALIDATES ALL)
  ↓
  Depends on: All prior sections
  Implements: Test suite, CI/CD, load/security tests
```

**Suggested Timeline**:
1. **Week 1-2**: 5.1 (auth) + 5.2 (security controls)
2. **Week 3**: 5.3 (data protection) + 5.4 (compliance)
3. **Week 4**: 5.5 (performance) + 5.6 (monitoring)
4. **Week 5**: 5.7 (testing) + refinement

---

## Quick-Start Guide

### Key Django Settings to Update
```python
# settings.py

# Security
SECRET_KEY = os.getenv('SECRET_KEY')
DEBUG = False
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', '').split(',')

SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000

# Authentication
AUTH_USER_MODEL = 'auth.CustomUser'

# Encryption
ENCRYPTION_KEY = os.getenv('ENCRYPTION_KEY')

# Caching (Redis)
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
        'OPTIONS': {'CLIENT_CLASS': 'django_redis.client.DefaultClient'}
    }
}

# Celery
CELERY_BROKER_URL = 'redis://127.0.0.1:6379/0'
CELERY_RESULT_BACKEND = 'redis://127.0.0.1:6379/0'

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'json': {
            '()': 'pythonjsonlogger.jsonlogger.JsonFormatter',
            'format': '%(timestamp)s %(level)s %(message)s'
        }
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'json'
        }
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO'
    }
}
```

### Install Dependencies
```bash
pip install django-cryptography==0.3.2
pip install djangorestframework-simplejwt==5.3.0
pip install django-ratelimit==4.1.0
pip install celery==5.3.4
pip install redis==5.0.1
pip install sentry-sdk==1.40.0
pip install pytest-django==4.7.0
pip install locust==2.20.0
```

### Run Tests
```bash
# All tests
pytest backend/tests/ -v

# Specific test file
pytest backend/tests/test_auth.py -v

# Coverage report
pytest backend/tests/ --cov=backend --cov-report=html

# Load test
locust -f backend/tests/load_test.py --users=100 --hatch-rate=10 --headless
```

---

## References

- [Django Security Documentation](https://docs.djangoproject.com/en/5.1/topics/security/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/)
- [GDPR Regulation](https://gdpr-info.eu/)
- [Stripe PCI Compliance](https://stripe.com/en-gb/resources/more/guide-pci-compliance)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [Celery Task Queue](https://docs.celeryproject.org/)
- [Prometheus Monitoring](https://prometheus.io/docs/introduction/overview/)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/sql-syntax.html)

---

**Document Status**: Complete  
**Next Steps**: Review with development team, begin implementation with Section 5.1
