# Section 5: Security, Performance & Monitoring – Low-Level Design

**Document Version**: 1.0  
**Last Updated**: February 2026  
**Audience**: Internal Development Team  
**Scope**: Technical design for implementing security controls, performance optimization, and observability

---

## Executive Summary

CodePop is a **decentralized, multi-store, multi-role system** requiring comprehensive security, performance, and observability. This document defines the architectural design for:

1. **Security Architecture** – Multi-role RBAC (user, manager, admin, super admin, logistics manager, repair staff), authentication flows, decentralized inter-store communication security, and token lifecycle management
2. **Security Controls** – Mitigation strategies for 7 OWASP-aligned threats plus decentralized architecture risks (SQL injection, XSS, CSRF, auth bypass, data exposure, IDOR, misconfiguration, service discovery spoofing, man-in-the-middle attacks)
3. **Data Protection** – Field-level encryption, key rotation, geolocation lifecycle (24-hour deletion), sensitive data handling, and inter-store encryption
4. **Compliance** – GDPR (right to erasure), CCPA (opt-out), PCI-DSS (Stripe), AI safety monitoring (Claude), and fairness monitoring (Scikit-Learn recommendations)
5. **Performance** – Database optimization, async processing, caching strategies, decentralized synchronization, Firebase FCM integration, and horizontal scaling strategies
6. **Monitoring** – Observability stack architecture, metrics, thresholds, alerting for multi-store operations, and external dependency health checks
7. **Testing** – Test pyramid, coverage targets, CI/CD integration, and decentralized system testing strategies

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

**RBAC Permission Matrix** (Updated for Multi-Store, Multi-Role System)
```
Role:             super    admin   manager  logistics  repair  user
├── Users
│  ├── Create      ✓        ✓        ✗        ✗         ✗      ✗
│  ├── Read        ✓        ✓(own)   ✗        ✗         ✗      ✓(own)
│  ├── Update      ✓        ✓(own)   ✗        ✗         ✗      ✓(own)
│  ├── Delete      ✓        ✓(own)   ✗        ✗         ✗      ✗
│  └── Grant Perm  ✓        ✓        ✗        ✗         ✗      ✗
│
├── Orders
│  ├── Create      ✓        ✓        ✓        ✗         ✗      ✓
│  ├── Read        ✓        ✓(own)   ✓(own)   ✗         ✗      ✓(own)
│  ├── Update      ✓        ✓(own)   ✓(own)   ✗         ✗      ✓(own)
│  └── Cancel      ✓        ✓(own)   ✓(own)   ✗         ✗      ✓(own)
│
├── Inventory
│  ├── View        ✓        ✓        ✓        ✓         ✗      ✗
│  ├── Update      ✓        ✓        ✓        ✓         ✗      ✗
│  └── Adjust      ✓        ✓        ✓        ✓         ✗      ✗
│
├── Supply Hub
│  ├── View        ✓        ✗        ✗        ✓(region) ✗      ✗
│  ├── Coordinate  ✓        ✗        ✗        ✓(region) ✗      ✗
│  └── Forecast    ✓        ✗        ✗        ✓(region) ✗      ✗
│
├── Machines
│  ├── View        ✓        ✗        ✗        ✗         ✓      ✗
│  ├── Update      ✓        ✗        ✗        ✗         ✓      ✗
│  └── Schedule    ✓        ✗        ✗        ✗         ✓      ✗
│
├── Reports
│  ├── View        ✓        ✓        ✓        ✓(region) ✓      ✗
│  └── Export      ✓        ✓        ✓        ✓(region) ✓      ✗
│
└── AI Features
   ├── Claude      ✓        ✓        ✓        ✓         ✓      ✓
   ├── Scikit-Learn ✓       ✗        ✓        ✓         ✗      ✗
   └── Gemini      ✓        ✗        ✗        ✗         ✗      ✗
```

**New Roles Introduced**:
- **Super Admin**: System-wide access across all stores, can manage all regions
- **Admin**: Store-specific user/account management within assigned store
- **Logistics Manager**: Regional supply coordination, demand forecasting, cross-store inventory transfers
- **Repair Staff**: Machine maintenance scheduling, technician routing, status updates

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

### Threat Model Matrix (Updated for Decentralized Architecture)

| Threat | Risk | Mitigation | Detection | Verification |
|--------|------|-----------|-----------|--------------|
| **1. SQL Injection** | Attacker executes malicious SQL queries | Use Django ORM (parameterized queries); no raw SQL; input validation via serializers; validate CSV imports | Code review for `.raw()`, `.execute()`; static analysis tool (bandit); CSV schema validation | Test: inject SQL in search parameter; confirm query fails safely |
| **2. Cross-Site Scripting (XSS)** | Attacker injects malicious JS in forms/comments | React auto-escapes strings; DRF serializer validation; CSP headers; Claude prompt injection prevention | Code review for `dangerouslySetInnerHTML`; CSP violation logs; prompt validation logs | Test: submit `<script>alert('xss')</script>` in text field; confirm escaped |
| **3. Cross-Site Request Forgery (CSRF)** | Attacker tricks user into making unwanted request | Django CSRF middleware + token; SameSite cookies; HTTPS only; digital signatures for inter-store messages | CSRF token present in POST forms; SameSite cookie set; signature verification logs | Test: POST without CSRF token; confirm 403 error |
| **4. Authentication Bypass** | Attacker gains access without valid credentials | Strong password policy (12+ chars); rate limiting (5 attempts → 15min lockout); no default credentials | Failed login attempts logged; account lockout tracking; monitor auth logs | Test: brute-force login endpoint; confirm lockout after 5 attempts |
| **5. Sensitive Data Exposure** | Payment/email/location/geolocation data leaked | Encryption at rest (AES-256); TLS 1.3 in transit; geolocation auto-deleted 24hrs; PCI-DSS via Stripe; never log passwords | Data access audit log; encryption key access control; TLS certificate validation; geolocation purge logs | Test: verify email/geolocation encrypted in DB; confirm TLS 1.3 only |
| **6. Insecure Direct Object References (IDOR)** | User accesses another user's data or cross-store data | Authorization check on every endpoint; validate user context; filter queries by user + store; region-based access control | Code review for missing auth checks; test coverage for access control; cross-store isolation tests | Test: user A tries to access user B's order; store A tries to access store B's inventory |
| **7. Security Misconfiguration** | Secrets exposed; weak defaults; unpatched dependencies | Environment variables for secrets; secure defaults in settings.py; dependency scanning | Pre-commit hook (detect-secrets); dependency audit (Snyk); security audit | Test: verify SECRET_KEY not in code; check .env in .gitignore |
| **8. Decentralized Service Discovery Spoofing** | Fake store registers itself or intercepts peer discovery | Digital signatures (PKI) for all inter-store messages; certificate pinning for regional hubs; nonce-based handshakes | Signature verification on all incoming messages; failed verification logging; peer certificate validation logs | Test: attempt to register fake store; confirm signature verification fails |
| **9. Man-in-the-Middle (MITM) on Inter-Store Communication** | Attacker intercepts store-to-store data (inventory, orders, supply) | TLS 1.3 with certificate pinning; cryptographic signatures on sensitive messages; VPN for critical links | Signature verification logs; TLS handshake failures; certificate validation events | Test: attempt to intercept signed message; confirm validation fails |
| **10. Supply Chain Data Injection (CSV Imports)** | Malicious CSV files containing crafted SQL/formulas | CSV schema validation; data type enforcement; sanitize numeric/date fields; max file size limits | CSV parsing error logs; data validation failure counts; import audit trail | Test: upload CSV with SQL injection payload; confirm sanitization |
| **11. Claude Prompt Injection** | Attacker tricks Claude API into revealing system info or generating harmful content | Input validation (no system prompts in user input); sanitize complaint text; rate limit requests; response timeout (10s); log all interactions | Claude API error logs; timeout events; response validation failures; interaction audit log | Test: submit malicious prompt; confirm Claude doesn't execute system commands |
| **12. AI Fairness & Bias (Scikit-Learn)** | Recommendation model discriminates based on protected attributes | Train only on anonymized data; remove PII before model training; fairness monitoring; bias detection; human review of outputs | Model training logs showing PII removal; fairness metrics per demographic; bias alerts | Test: verify no user IDs in training data; confirm fairness metrics within threshold |

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

### Sensitive Data Lifecycle (Updated for New Features)

| Data Type | Storage | Encryption | Retention | Deletion | Special Handling |
|-----------|---------|-----------|-----------|----------|-----------------|
| **Payment** | Stripe token only | N/A (Stripe handles) | Until order archived | Delete with order (1 year) | PCI-DSS compliant; never store card numbers |
| **Email** | User table | AES-256 (EncryptedCharField) | User lifetime | Delete on user erasure request | GDPR/CCPA: right to erasure |
| **Geolocation** | Location table | AES-256 | 24 hours post-order | Auto-purge Celery task | GDPR: explicit opt-in required; 24hr deletion enforced |
| **Password** | User table | Argon2id hash | User lifetime | Delete on password change | Argon2id (not PBKDF2); never log plaintext |
| **Audit logs** | AuditLog table | Plaintext (sensitive events only) | 90 days | Auto-purge after retention | Track all user actions; signed to prevent tampering |
| **Inter-Store Messages** | Regional store nodes | TLS 1.3 + digital signatures (PKI) | Until processed | Auto-delete after sync confirmation | Cryptographically signed; nonce prevents replay |
| **CSV Import Data** | Temporary table | AES-256 for sensitive fields | During import only | Delete after validation | Schema validation; no raw data storage |
| **Machine Status Data** | Maintenance table | Unencrypted (low sensitivity) | Until replaced | Archive on machine retirement | Timestamps and repair staff audit trail |
| **Device Tokens (FCM)** | User devices table | Secure tokens | Until app uninstall | Delete on uninstall event | PII risk if exposed; validate on each send |
| **AI Training Data** | Anonymized tables | Encrypted at rest | For model lifecycle | Delete with model version | GDPR: anonymization required; no user IDs |
| **Claude Interaction Logs** | Audit table | AES-256 | 90 days (compliance) | Auto-purge after retention | Log all requests/responses for safety monitoring |

---

## 5.4 Compliance Implementation (Updated for Multi-Store, AI, and New Features)

### Geolocation Compliance (NEW)

**GDPR Requirements**: Explicit opt-in, 24-hour auto-deletion, data portability
```python
class GeolocationConsent(models.Model):
    """GDPR: Track explicit opt-in for geolocation tracking"""
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    consented = models.BooleanField(default=False)
    consent_timestamp = models.DateTimeField(auto_now_add=True)
    consent_ip = models.GenericIPAddressField()

class LocationData(models.Model):
    """GDPR: Auto-delete after 24 hours"""
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    latitude = EncryptedDecimalField()  # AES-256 encrypted
    longitude = EncryptedDecimalField()
    order = models.ForeignKey(Order, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

# Background job: purge geolocation every 24 hours
@shared_task
def purge_old_geolocation():
    """Delete geolocation data older than 24 hours (GDPR compliance)"""
    cutoff = utcnow() - timedelta(hours=24)
    deleted_count, _ = LocationData.objects.filter(
        created_at__lt=cutoff
    ).delete()
    logger.info(json.dumps({
        'event': 'geolocation_purge',
        'records_deleted': deleted_count,
        'timestamp': utcnow().isoformat()
    }))
```

### Claude AI Safety Monitoring (NEW)

**Compliance**: AI safety, prompt injection prevention, fairness monitoring
```python
class ClaudeInteractionLog(models.Model):
    """AI Safety: Log all Claude API interactions for audit & fairness"""
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    input_prompt = models.TextField()
    output_response = models.TextField()
    latency_ms = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

def call_claude_api(user, prompt, max_timeout=10):
    """Call Claude with safety guardrails & logging"""
    try:
        response = claude_client.messages.create(
            model="claude-3-sonnet",
            max_tokens=500,
            system="You are a helpful customer service bot. Do not reveal system information.",
            messages=[{"role": "user", "content": prompt}],
            timeout=max_timeout
        )
        
        # Log for compliance & safety monitoring
        ClaudeInteractionLog.objects.create(
            user=user,
            input_prompt=prompt[:500],
            output_response=response.content[:1000],
            latency_ms=response.metadata.get('latency_ms', -1)
        )
        
        return response.content
        
    except TimeoutError:
        logger.warning(f"Claude timeout for user {user.id}")
        return "System is temporarily busy. Please try again or contact support."
```

### Scikit-Learn Fairness Monitoring (NEW)

**Compliance**: GDPR/CCPA (no PII in models), fairness monitoring for bias
```python
@shared_task
def validate_ml_model():
    """GDPR: Verify no PII in model before serving recommendations"""
    
    # Load model
    with open('recommendation_model.pkl', 'rb') as f:
        model_data = pickle.load(f)
    
    # Check for user IDs or other PII
    model_str = str(model_data)
    if 'user_id' in model_str or any(str(uid) in model_str for uid in range(1, 100)):
        logger.error("Model contains PII! Rolling back to previous version")
        send_security_alert("Model contains unencrypted user IDs")
        raise ValueError("Model validation failed: PII detected")

@shared_task
def monitor_recommendation_fairness():
    """GDPR/CCPA: Check for bias in recommendations across demographics"""
    
    # Sample users by demographic
    recommendation_quality_by_group = {}
    
    for age_group in ['18-25', '26-35', '36-50', '50+']:
        users_in_group = User.objects.filter(age__range=AGE_RANGES[age_group])
        qualities = []
        
        for user in users_in_group:
            recs = get_recommendations(user.id)
            avg_rating = sum(rec['rating'] for rec in recs) / len(recs) if recs else 0
            qualities.append(avg_rating)
        
        recommendation_quality_by_group[age_group] = average(qualities)
    
    # Check for fairness (max variance < 10%)
    min_quality = min(recommendation_quality_by_group.values())
    max_quality = max(recommendation_quality_by_group.values())
    variance = (max_quality - min_quality) / max_quality if max_quality > 0 else 0
    
    if variance > 0.1:
        logger.warning(f"Fairness variance detected: {variance:.2%}")
        send_alert_to_ml_team("Fairness check failed; review training data for bias")
```

### Firebase Cloud Messaging (FCM) Compliance (NEW)

**Compliance**: CAN-SPAM (opt-out for marketing), consent logging
```python
class PushNotificationPreference(models.Model):
    """Track FCM opt-in/opt-out per notification type"""
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    order_updates = models.BooleanField(default=True)  # Critical: always on
    marketing = models.BooleanField(default=False)  # CAN-SPAM: requires opt-in
    
    class Meta:
        indexes = [
            models.Index(fields=['user']),
        ]

def send_push_notification(user_id, message_type, **kwargs):
    """Send FCM notification respecting user preferences"""
    user = User.objects.get(id=user_id)
    prefs = user.pushnotificationpreference
    
    # Check consent
    if message_type == 'marketing' and not prefs.marketing:
        logger.info(f"Skipping marketing notification for user {user_id} (not opted in)")
        return
    
    # Get device token
    device = UserDevice.objects.filter(user=user).first()
    if not device:
        logger.warning(f"No device token for user {user_id}")
        return
    
    try:
        # Send via FCM
        response = firebase_messaging.send(
            messaging.Message(
                token=device.fcm_token,
                data={'type': message_type, **kwargs}
            )
        )
        logger.info(f"FCM sent to user {user_id}: {response}")
        
    except firebase_admin.exceptions.InvalidArgumentError as e:
        # Invalid token: remove it
        logger.warning(f"Invalid FCM token for user {user_id}: {str(e)}")
        device.delete()
```

### Decentralized System Compliance (NEW)

**Inter-Store Message Signing** (prevent spoofing, ensure authenticity)
```python
import hashlib
import hmac
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import hashes, serialization

class InterStoreMessage(models.Model):
    """Signed messages between stores for inventory/order sync"""
    sender_store_id = models.CharField(max_length=50)
    recipient_store_id = models.CharField(max_length=50)
    message_type = models.CharField(max_length=50)  # 'inventory_sync', 'order_update', etc.
    payload = models.JSONField()  # Encrypted data
    signature = models.BinaryField()  # HMAC-SHA256 signature
    nonce = models.CharField(max_length=64)  # Prevent replay attacks
    created_at = models.DateTimeField(auto_now_add=True)
    processed = models.BooleanField(default=False)

def sign_inter_store_message(sender_store_id, payload, private_key):
    """Sign message with store's private key"""
    # Create JSON payload
    message_json = json.dumps(payload, sort_keys=True)
    
    # Sign with HMAC-SHA256
    signature = hmac.new(
        private_key.encode(),
        message_json.encode(),
        hashlib.sha256
    ).digest()
    
    # Generate nonce to prevent replay attacks
    nonce = secrets.token_hex(32)
    
    return {
        'payload': payload,
        'signature': signature.hex(),
        'nonce': nonce,
        'timestamp': utcnow().isoformat()
    }

def verify_inter_store_message(message, sender_store_id, public_key):
    """Verify message signature & nonce"""
    
    # Verify signature
    expected_signature = hmac.new(
        public_key.encode(),
        json.dumps(message['payload'], sort_keys=True).encode(),
        hashlib.sha256
    ).digest()
    
    if not hmac.compare_digest(expected_signature.hex(), message['signature']):
        logger.error(f"Signature verification failed from store {sender_store_id}")
        return False
    
    # Check nonce (prevent replay)
    if InterStoreMessage.objects.filter(nonce=message['nonce']).exists():
        logger.error(f"Duplicate nonce from store {sender_store_id}")
        return False
    
    # Check timestamp (message not older than 5 minutes)
    msg_time = datetime.fromisoformat(message['timestamp'])
    if (utcnow() - msg_time).total_seconds() > 300:
        logger.error(f"Stale message from store {sender_store_id}")
        return False
    
    return True
```

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

### External Service Integration Performance (NEW)

**Stripe Payment Processing**
```python
@shared_task(
    autoretry_for=(stripe.error.StripeError,),
    retry_kwargs={'max_retries': 3},
    bind=True
)
def process_stripe_payment(self, order_id):
    """Process payment with retry logic & webhook fallback"""
    order = Order.objects.get(id=order_id)
    
    try:
        charge = stripe.Charge.create(
            amount=int(order.total * 100),
            currency='usd',
            source=order.stripe_token,
            idempotency_key=f"order_{order_id}"  # Prevent double-charging
        )
        
        order.payment_status = 'completed'
        order.stripe_charge_id = charge.id
        order.save()
        
    except stripe.error.RateLimitError:
        # Stripe is rate limiting: retry with exponential backoff
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))
    
    except stripe.error.APIError as exc:
        logger.error(f"Stripe API error for order {order_id}: {str(exc)}")
        raise self.retry(exc=exc, countdown=5 * (2 ** self.request.retries))

# Webhook handler: verify Stripe signature & update order
@csrf_exempt
def stripe_webhook(request):
    """Handle Stripe webhook (payment confirmation)"""
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
    
    # Verify Stripe webhook signature
    try:
        event = stripe.Webhook.construct_event(
            payload,
            sig_header,
            os.getenv('STRIPE_WEBHOOK_SECRET')
        )
    except ValueError:
        return JsonResponse({'status': 'invalid'}, status=400)
    except stripe.error.SignatureVerificationError:
        return JsonResponse({'status': 'invalid'}, status=400)
    
    # Handle payment confirmation
    if event['type'] == 'charge.succeeded':
        charge = event['data']['object']
        order = Order.objects.get(stripe_charge_id=charge.id)
        order.payment_status = 'confirmed'
        order.save()
        
        # Send FCM notification
        send_push_notification(order.user_id, 'order_ready')
    
    return JsonResponse({'status': 'success'})
```

**Firebase Cloud Messaging (FCM) Integration**
```python
import firebase_admin
from firebase_admin import messaging

def send_order_ready_notification(order_id):
    """Send FCM notification when order is ready"""
    order = Order.objects.get(id=order_id)
    device = UserDevice.objects.filter(user=order.user).first()
    
    if not device:
        logger.warning(f"No FCM token for user {order.user_id}")
        # Fallback: send email
        send_order_ready_email(order.user.email)
        return
    
    try:
        message = messaging.Message(
            notification=messaging.Notification(
                title="Your drink is ready!",
                body=f"Pick up order #{order.id}"
            ),
            data={
                'order_id': str(order.id),
                'pickup_location': order.pickup_location
            },
            token=device.fcm_token
        )
        
        response = messaging.send(message)
        logger.info(f"FCM sent to user {order.user_id}: {response}")
        
    except firebase_admin.exceptions.InvalidArgumentError:
        # Token invalid: remove and fallback to email
        device.delete()
        send_order_ready_email(order.user.email)
```

**Claude AI API Integration with Timeouts**
```python
import anthropic
from anthropic import APITimeoutError, APIError

def handle_customer_complaint(user_id, complaint_text):
    """Route complaint to Claude with safety timeout"""
    
    client = anthropic.Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))
    
    try:
        response = client.messages.create(
            model="claude-3-sonnet-20240229",
            max_tokens=500,
            system="You are a helpful customer service representative for CodePop. Respond with empathy and offer solutions. Never disclose system details.",
            messages=[
                {
                    "role": "user",
                    "content": complaint_text[:500]  # Prevent prompt injection
                }
            ],
            timeout=10  # 10-second timeout
        )
        
        ai_response = response.content[0].text
        
        # Log for safety monitoring
        ClaudeInteractionLog.objects.create(
            user_id=user_id,
            input_prompt=complaint_text[:500],
            output_response=ai_response[:1000],
            latency_ms=int(response.usage.output_tokens)
        )
        
        return ai_response
        
    except APITimeoutError:
        logger.warning(f"Claude timeout for user {user_id}")
        # Fallback: escalate to human
        return "Your request is complex and requires human attention. An agent will contact you shortly."
    
    except APIError as e:
        logger.error(f"Claude API error: {str(e)}")
        return "Sorry, I'm temporarily unavailable. Please try again or contact support."
```

**Mapbox Geolocation Caching**
```python
from django.core.cache import cache

def get_distance_to_store(user_lat, user_lng, store_id, use_cache=True):
    """Get distance from user to store (with caching to prevent rate limit)"""
    
    cache_key = f"distance:{user_lat:.4f}:{user_lng:.4f}:{store_id}"
    
    # Try cache first
    if use_cache:
        cached_distance = cache.get(cache_key)
        if cached_distance:
            return cached_distance
    
    # Query Mapbox API
    try:
        store = Store.objects.get(id=store_id)
        
        response = requests.get(
            f"https://api.mapbox.com/directions/geojson",
            params={
                'coordinates': f"{user_lng},{user_lat};{store.longitude},{store.latitude}",
                'access_token': os.getenv('MAPBOX_PUBLIC_TOKEN')
            },
            timeout=3
        )
        
        if response.status_code == 200:
            distance = response.json()['routes'][0]['distance']
            
            # Cache for 1 hour
            cache.set(cache_key, distance, timeout=3600)
            
            return distance
        else:
            logger.warning(f"Mapbox error: {response.status_code}")
            # Fallback to time-based pickup
            return None
            
    except requests.Timeout:
        logger.warning(f"Mapbox timeout for user at ({user_lat}, {user_lng})")
        return None
```

### Decentralized Architecture & Load Balancing

**Horizontal Scaling with Nginx (Multi-Store)**
```
# nginx.conf (each store has replicas behind load balancer)
upstream store_app {
    server store_instance_1:8000;
    server store_instance_2:8000;
    server store_instance_3:8000;
}

# Inter-store communication (direct, secure connections)
upstream supply_hub_region_1 {
    server supply_hub_us_east:8000;
}

server {
    listen 443 ssl http2;
    
    location / {
        # Load balance customer requests
        proxy_pass http://store_app;
        proxy_set_header X-Forwarded-For $remote_addr;
    }
    
    location /api/inter-store/ {
        # Secure inter-store communication
        proxy_pass http://supply_hub_region_1;
        proxy_ssl_verify on;
        proxy_ssl_trusted_certificate /etc/nginx/certs/ca-bundle.crt;
        proxy_set_header X-Store-Signature $http_x_store_signature;
    }
    
    location /health {
        access_log off;
        proxy_pass http://store_app;
    }
}
```

**Auto-Scaling Policy (Per-Store, Considering Regional Load)**
```
Scale Up:   if CPU > 70% for 2 minutes OR network latency > 200ms
Scale Down: if CPU < 30% for 5 minutes
Min instances per store: 2 (high availability)
Max instances per store: 10
Regional limit: max 100 instances across all stores in region
Cooldown: 300 seconds between scaling events
Priority: critical services (payment, inventory) scale first
```

**Decentralized Data Synchronization Performance**
```python
@shared_task
def sync_inventory_with_regional_peers():
    """Periodically sync inventory with peer stores in same region"""
    
    local_store = Store.objects.get(id=os.getenv('STORE_ID'))
    peer_stores = Store.objects.filter(region=local_store.region).exclude(id=local_store.id)
    
    for peer in peer_stores:
        try:
            # Get local inventory snapshot
            inventory_snapshot = Inventory.objects.filter(
                store=local_store
            ).values('item_name', 'quantity', 'last_updated')
            
            # Sign message
            signed_message = sign_inter_store_message(
                sender_store_id=local_store.id,
                payload={'inventory': list(inventory_snapshot)},
                private_key=os.getenv('STORE_PRIVATE_KEY')
            )
            
            # Send to peer with 5-second timeout
            response = requests.post(
                f"{peer.api_url}/api/inter-store/inventory-sync",
                json=signed_message,
                timeout=5,
                verify=True  # Verify SSL certificate
            )
            
            if response.status_code == 200:
                logger.info(f"Inventory synced with {peer.store_name}")
            else:
                logger.warning(f"Sync failed with {peer.store_name}: {response.status_code}")
                
        except requests.Timeout:
            logger.warning(f"Timeout syncing with {peer.store_name}")
            # Retry in background
            sync_inventory_with_peer.apply_async(
                args=[peer.id],
                countdown=60
            )
        except Exception as e:
            logger.error(f"Error syncing with {peer.store_name}: {str(e)}")
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

### Key Metrics & Thresholds (Updated for Multi-Store & External Dependencies)

**Application Metrics**
- Request latency: p95 < 200ms, p99 < 500ms
- Error rate: < 0.5%
- Payment success rate (Stripe): > 95%
- Cache hit ratio: > 70% (recommendations, geolocation)

**External Service Health (NEW)**
- Stripe API availability: > 99.99% uptime (monitor status page)
- Stripe API latency: < 5s for charge operations
- Firebase FCM delivery rate: > 98%
- Mapbox API latency: < 3s for distance calculations
- Claude API timeout rate: < 2% (10s threshold)
- Scikit-Learn model latency: < 100ms for predictions

**Decentralized Architecture Metrics (NEW)**
- Inter-store message delivery success: > 99%
- Inventory sync latency between stores: < 30 seconds
- Regional supply hub responsiveness: < 5 seconds
- Service discovery heartbeat (peer detection): every 5 minutes
- Data synchronization conflicts: < 1% of sync operations

**Infrastructure Metrics**
- Database connection pool: < 80% utilized
- Redis memory: < 80% used
- Disk space: > 10% free
- CPU per instance: < 70% average
- Network latency to regional supply hub: < 100ms

**Business Metrics**
- Daily active users (DAU) per store
- Orders per day per store
- Payment success rate
- Geolocation opt-in rate (GDPR requirement)
- Average order value (AOV)
- User retention (30-day)
- AI recommendation accuracy (fairness parity < 10%)

### Alerting Strategy (Updated for External Dependencies & Multi-Store)

**Alert Severity Levels**
```
CRITICAL (Page PagerDuty immediately)
├── Database connection: 0 available
├── Payment failures (Stripe): > 10% for 5 minutes
├── Error rate: > 5% for 5 minutes
├── Disk space: < 5% free
├── Redis down
├── Stripe API unavailable: 0% success rate
├── Inter-store sync failing: > 5 consecutive failures
├── Supply hub unreachable (> 5 min)
└── Geolocation data breach detected (encryption compromised)

WARNING (Email/Slack to #alerts)
├── High latency: p95 > 400ms for 10 minutes
├── Cache hit ratio: < 50% for 30 minutes
├── Slow queries: > 1 second execution time
├── Failed auth attempts: > 100/minute per IP
├── Stripe API latency: > 5 seconds
├── FCM delivery rate: < 98%
├── Mapbox API latency: > 3 seconds
├── Claude timeout rate: > 2%
├── Inter-store sync latency: > 60 seconds
├── ML fairness variance: > 10% between demographics
└── Geolocation purge job failed (GDPR compliance risk)

INFO (Dashboard only)
├── New deployments completed
├── Database backups finished
├── Routine metric drift (within 10%)
├── Service discovery: new peer registered
├── Model retraining completed
└── CSV import job finished
```

### Dashboard Structure (Conceptual - Updated for Multi-Store & External Services)

**Overview Dashboard**
- SLO compliance (uptime %, latency %, error rate %)
- Request volume (RPS, trending) per store
- Top errors (exception type, frequency)
- Payment activity (success rate via Stripe, transaction volume)
- External service health: Stripe, Firebase FCM, Mapbox, Claude (green/red status)

**Performance Dashboard**
- API latency histogram (p50, p95, p99) per store
- Database query times (slow query log)
- Cache hit/miss rates (recommendations, geolocation)
- External API latencies: Stripe (< 5s), Mapbox (< 3s), Claude (< 10s), FCM delivery rate
- Decentralized sync latency between stores (< 30s target)
- Regional supply hub response times

**Security Dashboard**
- Authentication failures (by user, IP, store)
- Authorization failures (denied requests, cross-store access attempts)
- Suspicious activity (rate limit triggers, signature verification failures)
- Data access audit log (encrypted fields accessed)
- GDPR compliance: geolocation purge job status, consent tracking
- Inter-store message verification failures (potential MITM attacks)
- AI safety: Claude timeout events, fairness variance alerts

**Compliance Dashboard (NEW)**
- Geolocation consent rates by store
- Geolocation purge job status (24-hour deletion verification)
- Claude interaction logs (response quality, timeout events)
- ML fairness metrics (recommendation quality parity by demographic)
- Data subject access requests (DSAR) completion status
- CSV import audit trail (what was imported, by whom, when)

**Business Dashboard**
- Revenue (daily, weekly, monthly) per store + cross-store trends
- Order completion rate per store
- User growth (DAU, MAU) per store
- Conversion funnel (browse → search → order → pay) per store
- Top products by store/region
- Supply hub inventory levels by region
- Machine maintenance status per store (normal, warning, needs repair)

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

### Integration Test Patterns (NEW - External Services & Decentralized)

**Stripe Webhook Handling**
```python
@pytest.mark.django_db
def test_stripe_webhook_payment_confirmation():
    from backend.models import Order, Payment
    
    order = Order.objects.create(
        user=create_test_user(),
        total=10.00,
        stripe_token='tok_visa',
        payment_status='pending'
    )
    
    # Simulate Stripe webhook
    webhook_payload = {
        'type': 'charge.succeeded',
        'data': {
            'object': {
                'id': 'ch_123',
                'amount': 1000,
                'status': 'succeeded'
            }
        }
    }
    
    response = client.post(
        '/api/webhooks/stripe/',
        data=json.dumps(webhook_payload),
        content_type='application/json',
        HTTP_STRIPE_SIGNATURE='sig_test'
    )
    
    assert response.status_code == 200
    order.refresh_from_db()
    assert order.payment_status == 'confirmed'
```

**Inter-Store Message Signing & Verification**
```python
@pytest.mark.django_db
def test_inter_store_message_signature_verification():
    from backend.security import sign_inter_store_message, verify_inter_store_message
    
    # Store A sends inventory to Store B
    sender_store = Store.objects.create(id='store_a', region='us_east')
    recipient_store = Store.objects.create(id='store_b', region='us_east')
    
    payload = {
        'inventory': [
            {'item_name': 'Coke Syrup', 'quantity': 100},
            {'item_name': 'Vanilla Syrup', 'quantity': 50}
        ]
    }
    
    # Sign message
    signed = sign_inter_store_message('store_a', payload, 'private_key_a')
    
    # Verify signature (with public key)
    is_valid = verify_inter_store_message(signed, 'store_a', 'public_key_a')
    assert is_valid == True
    
    # Tampering should fail
    signed['payload']['inventory'][0]['quantity'] = 999
    is_valid = verify_inter_store_message(signed, 'store_a', 'public_key_a')
    assert is_valid == False
```

**CSV Import Validation**
```python
@pytest.mark.django_db
def test_csv_supply_import_validation():
    import csv
    import tempfile
    
    # Create test CSV
    csv_data = """date,item_name,quantity_used,store_location,region
2026-02-25,Coke Syrup,50,123 Main St,us_east
2026-02-25,Vanilla Syrup,30,123 Main St,us_east
2026-02-25,Ice,100,123 Main St,us_east"""
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
        f.write(csv_data)
        csv_path = f.name
    
    # Import via logistics manager endpoint
    manager = create_test_user(role='logistics_manager')
    
    with open(csv_path, 'rb') as f:
        response = client.post(
            '/api/supply/import/',
            {'csv_file': f},
            HTTP_AUTHORIZATION=f'Bearer {get_token(manager)}'
        )
    
    assert response.status_code == 201
    assert SupplyUsageLog.objects.count() == 3
```

**Claude API Timeout & Fallback**
```python
@pytest.mark.django_db
def test_claude_complaint_handler_timeout():
    from unittest.mock import patch, MagicMock
    from anthropic import APITimeoutError
    
    user = create_test_user()
    complaint = "I didn't get my drink!"
    
    with patch('anthropic.Anthropic.messages.create') as mock_claude:
        # Simulate timeout
        mock_claude.side_effect = APITimeoutError("Request timed out")
        
        response = client.post(
            '/api/complaints/',
            {'text': complaint},
            HTTP_AUTHORIZATION=f'Bearer {get_token(user)}'
        )
    
    assert response.status_code == 201
    # Should fallback gracefully
    assert 'human attention' in response.json()['ai_response'].lower()
```

**Geolocation Purge Compliance (GDPR)**
```python
@pytest.mark.django_db
def test_geolocation_24hour_purge():
    from django.utils import timezone
    
    user = create_test_user()
    order = Order.objects.create(user=user)
    
    # Create old geolocation data (25 hours old)
    old_time = timezone.now() - timedelta(hours=25)
    LocationData.objects.create(
        user=user,
        order=order,
        latitude=40.7128,
        longitude=-74.0060,
        created_at=old_time
    )
    
    # Create recent data (1 hour old)
    recent_time = timezone.now() - timedelta(hours=1)
    LocationData.objects.create(
        user=user,
        order=order,
        latitude=40.7128,
        longitude=-74.0060,
        created_at=recent_time
    )
    
    # Run purge task
    purge_old_geolocation()
    
    # Old data should be deleted, recent data should remain
    assert LocationData.objects.filter(created_at=old_time).count() == 0
    assert LocationData.objects.filter(created_at=recent_time).count() == 1
```

**Firebase FCM Fallback to Email**
```python
@pytest.mark.django_db
def test_fcm_fallback_to_email():
    from unittest.mock import patch
    import firebase_admin
    
    user = create_test_user()
    order = Order.objects.create(user=user)
    
    with patch('firebase_admin.messaging.send') as mock_fcm:
        # Simulate invalid FCM token
        mock_fcm.side_effect = firebase_admin.exceptions.InvalidArgumentError("Invalid token")
        
        send_order_ready_notification(order.id)
        
        # Should fallback to email
        assert len(mail.outbox) == 1
        assert 'ready' in mail.outbox[0].subject.lower()
```

### Performance Test Pattern (Locust) - Updated for Multi-Store

```python
from locust import HttpUser, task, between

class CodePopCustomer(HttpUser):
    """Simulate customer behavior across stores"""
    wait_time = between(1, 3)
    token = None
    store_id = None
    
    @task(3)
    def browse_drinks(self):
        self.client.get(
            '/api/drinks/',
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
        # Login
        response = self.client.post(
            '/api/auth/login/',
            json={'username': 'load_test_user', 'password': 'SecurePass123'}
        )
        self.token = response.json()['access_token']

class CodePopLogisticsManager(HttpUser):
    """Simulate logistics manager (supply coordination)"""
    wait_time = between(5, 15)
    token = None
    
    @task(1)
    def check_regional_inventory(self):
        self.client.get(
            '/api/supply-hub/inventory/',
            headers={'Authorization': f'Bearer {self.token}'}
        )
    
    @task(1)
    def upload_demand_forecast(self):
        # Simulate CSV upload
        self.client.post(
            '/api/supply/import/',
            {'csv_file': generate_test_csv()},
            headers={'Authorization': f'Bearer {self.token}'}
        )
    
    def on_start(self):
        response = self.client.post(
            '/api/auth/login/',
            json={'username': 'logistics_manager', 'password': 'SecurePass123'}
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
