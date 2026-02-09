## 1. External Interfaces

### 1.1 Identify External Systems

CodePop integrates with seven external systems to deliver its complete feature set. These systems were selected based on market maturity, security compliance, cost-effectiveness, and developer ecosystem support.

| External System | Role | Criticality | Justification |
|-----------------|------|-------------|---------------|
| **Stripe** | Payment processing | Critical | Industry-leading payment processor with PCI-DSS Level 1 certification, extensive documentation, and React Native SDK. Alternatives considered: Square (less mobile-focused), Braintree (steeper learning curve), PayPal (poor developer experience). |
| **Mapbox** | Geolocation and mapping | High | Superior mobile SDK performance and customization vs Google Maps; more generous free tier. Alternatives: Google Maps Platform (higher cost), Apple MapKit (iOS only), OpenStreetMap (requires self-hosting). |
| **Firebase Cloud Messaging (FCM)** | Push notifications | High | Free, reliable cross-platform push notifications from Google. Native integration with Android; supports iOS via APNs. Alternatives: OneSignal (unnecessary third-party layer), AWS SNS (more complex), native APNs/FCM separately (redundant code). |
| **Claude (Anthropic API)** | AI assistant | Medium | State-of-the-art conversational AI with strong safety features; 200K context window supports rich drink recommendations with full ingredient lists. Alternatives: OpenAI GPT-4 (considered but higher cost per token), local models (insufficient quality), rule-based system (inflexible). |
| **Scikit-Learn** | ML library | Medium | Industry-standard Python ML library; runs in-process without API costs; mature demand forecasting capabilities. Alternatives: TensorFlow (overkill for tabular data), cloud ML services (adds latency and cost), manual forecasting (labor-intensive). |
| **Django Email (SMTP)** | Transactional email | High | Django's built-in email framework supports any SMTP provider, avoiding vendor lock-in. SMTP provider (SendGrid, AWS SES, etc.) selected at deployment. Alternatives: Twilio SendGrid API (vendor lock-in), Mailgun (similar but less configurable). |
| **PostgreSQL** | Data storage | Critical | Open-source relational database with ACID compliance, JSON support, and proven scalability. Django ORM provides excellent integration. Alternatives: MySQL (weaker JSON support), MongoDB (poor fit for transactional data), SQLite (insufficient for production). |

**External Interface Architecture Diagram:**

```
┌─────────────────────────────────────────────────────────────────┐
│                        CodePop System                           │
│                                                                 │
│  ┌──────────────┐              ┌─────────────────┐            │
│  │ React Native │              │  Django Backend │            │
│  │   Frontend   │◄────────────►│   (Python)      │            │
│  └──────────────┘              └─────────────────┘            │
│         │                              │                       │
└─────────┼──────────────────────────────┼───────────────────────┘
          │                              │
          │ ┌────────────────────────────┼─────────────────┐
          │ │                            │                 │
          ▼ ▼                            ▼                 ▼
    ┌─────────────┐              ┌─────────────┐    ┌──────────┐
    │   Mapbox    │              │   Stripe    │    │PostgreSQL│
    │ (Map/Geo)   │              │  (Payment)  │    │   (DB)   │
    └─────────────┘              └─────────────┘    └──────────┘
          │                              │                 │
          │                              │                 │
    ┌─────────────┐              ┌─────────────┐          │
    │     FCM     │              │   Claude    │          │
    │  (Push)     │              │   (AI)      │          │
    └─────────────┘              └─────────────┘          │
          │                              │                 │
          │                       ┌─────────────┐         │
          │                       │Scikit-Learn │         │
          │                       │ (In-Process)│         │
          │                       └─────────────┘         │
          │                              │                 │
    ┌─────────────┐                     │                 │
    │ SMTP Server │◄────────────────────┘                 │
    │ (Email)     │◄──────────────────────────────────────┘
    └─────────────┘

Legend: ◄─► = Bidirectional    ▼ = Unidirectional
```

### 1.2 Define Purpose of Each Integration

Each external system serves a specific architectural purpose within CodePop. These integrations enable core functionality that would be impractical or cost-prohibitive to build in-house.

| External System | Business Purpose | Technical Purpose | Alternative Approach Rejected |
|-----------------|------------------|-------------------|-------------------------------|
| **Stripe** | Accept customer payments securely without handling sensitive card data | Offload PCI-DSS compliance burden; provide payment method tokenization; handle refunds and disputes | Building in-house payment processing (requires PCI-DSS certification, card network agreements, fraud detection—infeasible for startup) |
| **Mapbox** | Enable location-based order pickup; show users nearby store locations | Provide real-time GPS tracking, geocoding, distance calculations, and interactive maps | Self-hosting maps (requires massive geographic data storage and map rendering infrastructure) |
| **FCM** | Notify customers when drinks are ready; send promotional messages | Cross-platform push notification delivery without maintaining device connections | Maintaining persistent WebSocket connections (drains battery, requires complex infrastructure, unreliable on mobile networks) |
| **Claude** | Provide intelligent customer support and personalized drink recommendations | Natural language understanding for complaints; context-aware recommendations considering allergies and preferences | Rule-based chatbot (inflexible, poor user experience) or human-only support (doesn't scale, high labor cost) |
| **Scikit-Learn** | Forecast ingredient demand to optimize inventory and reduce waste | Time-series forecasting and regression models for supply chain optimization | Manual forecasting spreadsheets (error-prone, time-consuming) or cloud ML APIs (adds latency and ongoing costs) |
| **Django Email** | Verify user accounts and enable password recovery | SMTP abstraction for vendor-neutral email delivery | No email verification (security risk, spam accounts) or hard-coded to single provider (vendor lock-in) |
| **PostgreSQL** | Store all application data persistently and reliably | ACID-compliant transactional storage with relational integrity and Django ORM integration | NoSQL database (poor fit for relational order/inventory data) or cloud-only database (vendor lock-in, higher cost) |

### 1.3 Identify Interface Type

Each integration uses an interface protocol appropriate to its data patterns, latency requirements, and security model.

| External System | Interface Type | Protocol Details | Authentication Method | Data Flow Pattern |
|-----------------|----------------|------------------|----------------------|-------------------|
| **Stripe** | RESTful HTTPS API + Webhooks | REST over TLS 1.3; JSON payloads; idempotent requests with idempotency keys | API keys (secret for server, publishable for client); HMAC-SHA256 webhook signatures | **Bidirectional**: Frontend initiates payment; Stripe pushes webhook events to backend for payment confirmation |
| **Mapbox** | RESTful HTTPS API + Client SDK | REST API for geocoding/routing; WebGL-based map SDK for rendering | Bearer token authentication (public token for client, secret token for server) | **Hybrid**: Client SDK renders maps using public token; backend queries directions API with private token |
| **FCM** | RESTful HTTPS API / Admin SDK | HTTP/2-based FCM v1 API; JSON message format; supports data and notification payloads | OAuth 2.0 with service account credentials (JSON key file) | **Unidirectional push**: Backend sends messages to FCM; FCM delivers to devices |
| **Claude** | RESTful HTTPS API | REST over TLS 1.3; streaming and non-streaming response modes; JSON request/response | API key in `x-api-key` header | **Request-response**: Backend sends prompt with conversation history; Claude returns AI-generated text |
| **Scikit-Learn** | In-process Python library | Direct function calls within Django process; NumPy array/Pandas DataFrame data structures | None (local library) | **In-process**: Django loads serialized model from disk; invokes prediction methods directly |
| **Django Email** | SMTP over TLS | SMTP protocol (RFC 5321) over TLS-encrypted connection (port 587 or 465) | Username/password or API key (provider-dependent) | **Unidirectional send**: Django sends SMTP commands to mail server; server delivers to recipient |
| **PostgreSQL** | Database wire protocol (PostgreSQL native) | Binary protocol over TCP/IP; parameterized queries via psycopg2 adapter | Username/password authentication; optionally certificate-based | **Synchronous query-response**: Django ORM sends SQL queries; PostgreSQL returns result sets |

**Why these protocols:**
- **REST APIs**: Stripe, Mapbox, FCM, Claude use REST because it's stateless, widely supported, and works across firewalls. Webhooks enable asynchronous payment confirmation without polling.
- **SMTP**: Email requires a standardized protocol for interoperability across providers; SMTP is the universal email transmission standard.
- **In-process library**: Scikit-Learn runs in-process to minimize latency (predictions in <10ms) and eliminate network dependencies for non-critical background forecasting.
- **Native database protocol**: PostgreSQL's binary protocol is far more efficient than layering a REST API over database queries.

### 1.4 Capture Security and Compliance Considerations

External integrations introduce security and compliance requirements that CodePop must satisfy. Each system has been evaluated for data sensitivity, regulatory compliance, and attack surface.

| External System | Security Controls | Compliance Requirements | Data Sensitivity | Attack Vectors Mitigated |
|-----------------|-------------------|-------------------------|------------------|--------------------------|
| **Stripe** | • Never store raw card data (use Stripe tokens only)<br>• TLS 1.3 for all API calls<br>• Verify webhook signatures with HMAC-SHA256<br>• Rotate API keys quarterly<br>• Environment-specific keys (dev/staging/prod) | **PCI-DSS**: Stripe handles Level 1 compliance; CodePop remains out of scope by never touching card data<br>**GDPR/CCPA**: Store only transaction IDs, not payment details | **High**: Payment information | • Card data interception (via TLS)<br>• Webhook spoofing (via signature verification)<br>• Key compromise (via rotation) |
| **Mapbox** | • Separate public/private tokens<br>• Public token scoped to map viewing only<br>• Location data encrypted at rest (AES-256)<br>• Delete location data 24 hours after order completion<br>• Explicit user opt-in before tracking | **GDPR/CCPA**: Location is PII; requires consent, disclosure in privacy policy, and data deletion on request<br>**Local privacy laws**: Comply with geolocation tracking regulations | **High**: Personally identifiable location data | • Unauthorized location access (via token scoping)<br>• Persistent tracking (via 24-hour deletion)<br>• Non-consensual tracking (via explicit opt-in) |
| **FCM** | • Service account credentials stored in environment variables<br>• Minimal permissions (messaging only, no Firebase DB access)<br>• Rotate credentials every 90 days<br>• Never put sensitive data in notification payloads<br>• Respect user opt-out immediately | **GDPR/CCPA**: Must obtain consent for marketing messages; transactional messages exempt<br>**CAN-SPAM**: Provide opt-out for promotional messages | **Low**: Device tokens are non-sensitive; notification content is public | • Credential exposure (via environment variables)<br>• Unauthorized message sending (via minimal permissions)<br>• Privacy violations (via non-sensitive payloads) |
| **Claude** | • Never send PII, payment info, or passwords to Claude<br>• Validate and sanitize user input (prevent prompt injection)<br>• System prompts prohibit revealing internal info<br>• Log all AI interactions for audit<br>• Rate-limit requests to prevent abuse<br>• Set response timeouts (10s) | **GDPR/CCPA**: AI may process user preferences (not PII); log retention limits apply<br>**AI safety**: Monitor for harmful outputs; human escalation path<br>**IP protection**: Never include proprietary algorithms in prompts | **Medium**: Dietary preferences and complaint text (not highly sensitive) | • Prompt injection attacks (via input validation)<br>• PII leakage (via content filtering)<br>• System disclosure (via system prompt restrictions)<br>• Abuse/DoS (via rate limiting) |
| **Scikit-Learn** | • Train only on anonymized aggregate data<br>• Remove PII from training datasets<br>• Model files stored with access controls<br>• Validate model outputs before serving<br>• Version control models to enable rollback | **GDPR/CCPA**: Training data must be anonymized; models must not memorize individual users<br>**Fairness**: Monitor for bias in recommendations | **Low**: Models trained on anonymized data | • Model inversion attacks (via anonymization)<br>• Data poisoning (via input validation)<br>• Biased predictions (via fairness monitoring) |
| **Django Email** | • SMTP credentials in environment variables only<br>• Enforce TLS for SMTP connections (reject plaintext)<br>• Use app-specific passwords, not primary credentials<br>• Rotate SMTP credentials quarterly<br>• Never send passwords or secrets via email | **CAN-SPAM**: Include unsubscribe link for marketing emails<br>**GDPR/CCPA**: User consent required for newsletters; email is PII | **Medium**: Email addresses are PII | • Credential theft (via environment variables)<br>• MITM attacks (via TLS enforcement)<br>• Spam/abuse (via CAN-SPAM compliance) |
| **PostgreSQL** | • TLS-encrypted connections required (reject plaintext)<br>• Least-privilege database user (no superuser)<br>• Separate read-only user for analytics<br>• Hash passwords with Argon2<br>• Encrypt sensitive fields at application level<br>• Firewall: database accessible only from app servers | **GDPR/CCPA**: Must support data deletion (right to erasure) and data export (portability)<br>**SOC 2** (future): Encrypt data at rest, audit logging | **Critical**: Contains all user data, orders, payments | • SQL injection (via Django ORM parameterization)<br>• Credential compromise (via least-privilege)<br>• Plaintext interception (via TLS)<br>• Unauthorized access (via firewall) |

**Overall Security Posture:**
- **Defense in depth**: TLS for transport, access controls for authentication, input validation for application layer, encryption for data at rest
- **Principle of least privilege**: API keys, database users, and service accounts granted minimal necessary permissions
- **Compliance by design**: GDPR, CCPA, and PCI-DSS requirements embedded from the start, not retrofitted

### 1.5 Identify Dependency Risks

External dependencies introduce availability, performance, and operational risks. Each system represents a potential point of failure requiring mitigation strategies.

| External System | Dependency Risk | Impact if Unavailable | Likelihood | Mitigation Strategy | Fallback Approach |
|-----------------|-----------------|----------------------|------------|---------------------|-------------------|
| **Stripe** | • API downtime<br>• Rate limiting during peak traffic<br>• API version deprecation<br>• Webhook delivery failure<br>• Key compromise | **Critical**: Customers cannot complete purchases; revenue loss | Low (99.99% uptime SLA) | • Graceful error messages: "Payment system temporarily unavailable"<br>• Queue failed payments for retry<br>• Webhook retry with exponential backoff<br>• Poll Stripe API as backup to webhooks<br>• Monitor Stripe status page<br>• Test against staging API before prod updates | Store order with `PAYMENT_PENDING` status; retry payment when Stripe recovers; notify user via email when payment succeeds |
| **Mapbox** | • API downtime<br>• Rate limit exhaustion (600 req/min free tier)<br>• GPS inaccuracy<br>• Network loss during transit<br>• Token compromise | **Medium**: Location-based pickup unavailable; fallback to time-based pickup | Medium (rate limits likely during growth) | • Cache distance calculations client-side<br>• Batch API requests<br>• Implement time-based pickup as fallback<br>• Upgrade to paid tier proactively<br>• Rotate tokens quarterly<br>• Client-side caching of map tiles | Automatically switch to time-based pickup ("Pick up in 15 minutes") when Mapbox unavailable; user experience degraded but functional |
| **FCM** | • Firebase/Google Cloud outage<br>• Invalid device tokens<br>• Notification delivery delays<br>• Firebase configuration errors<br>• App uninstalls leaving stale tokens | **Low**: Users don't receive push notifications; non-critical since order status visible in app | Medium (token invalidation common) | • Queue failed notifications for retry<br>• Remove invalid tokens on delivery failure<br>• Display in-app message as backup: "Your order is ready!"<br>• Test FCM in staging environment<br>• Monitor delivery rates (target >98%) | Email notification as fallback for order-ready events; in-app status always reflects truth regardless of push delivery |
| **Claude** | • Anthropic API downtime<br>• Rate limit exceeded (50K tokens/min)<br>• High inference latency (>10s)<br>• Inaccurate/unsafe responses<br>• Prompt injection attacks | **Low**: AI features unavailable; human escalation required | Medium (AI APIs less mature than payment/DB) | • Set 10-second timeout on requests<br>• Fallback to canned responses for common questions<br>• Easy "Talk to human" escalation button<br>• Queue requests during downtime<br>• Cache common recommendations<br>• Monitor API status and token usage<br>• Validate all outputs before displaying | Display pre-written FAQ responses for complaints; suggest top-5 popular drinks for recommendations; always provide "Contact support" option |
| **Scikit-Learn** | • Corrupted model file<br>• Retraining job failure<br>• Model staleness<br>• Insufficient training data for new products<br>• Feature engineering bugs | **Low**: Demand forecasts unavailable; managers use manual estimates | Medium (model drift inevitable) | • Model checksum validation before loading<br>• Maintain backup model versions<br>• Alert on retraining failures<br>• Rollback to previous model version<br>• Hybrid approach: rules + ML<br>• Version control all model code | Fall back to rule-based forecasting (e.g., "order 20% more than last week's sales"); managers can override predictions manually |
| **Django Email** | • SMTP server downtime<br>• Rate limiting (email provider)<br>• Emails marked as spam<br>• Credentials compromised<br>• Invalid user email addresses | **High**: Users cannot verify accounts or reset passwords | Medium (email deliverability challenging) | • Retry with exponential backoff<br>• Queue emails during outage<br>• Configure SPF, DKIM, DMARC records<br>• Monitor bounce rates<br>• Rotate credentials quarterly<br>• Validate email format before sending | Allow manual account verification by support team; implement SMS verification as future enhancement for critical accounts |
| **PostgreSQL** | • Database crash/corruption<br>• Connection pool exhaustion<br>• Slow queries degrading performance<br>• Disk space exhaustion<br>• Credential compromise<br>• Network connectivity loss | **Critical**: Entire application down; no operations possible | Low (mature, stable database) but HIGH impact | • Automated daily backups (pg_dump)<br>• Connection pooling with PgBouncer<br>• Monitor slow query log; optimize N+1 queries<br>• Disk usage alerts at 80%<br>• Database replication for failover<br>• Test backup restoration monthly<br>• Firewall restricts access to app servers only | **No fallback**: Database is critical dependency. Focus on redundancy (replication) and rapid recovery (tested backups with <4hr RTO) |

**Risk Prioritization:**
1. **Tier 1 (Critical)**: PostgreSQL, Stripe—system inoperable without these; require redundancy and rapid recovery
2. **Tier 2 (High)**: FCM, Django Email, Mapbox—degraded experience but core ordering still functions with fallbacks
3. **Tier 3 (Low)**: Claude, Scikit-Learn—optional features; easy workarounds available

**Dependency Monitoring:**
- Subscribe to status pages: Stripe, Mapbox, Firebase, Anthropic
- Implement health checks: probe each external API every 5 minutes
- Alert on-call engineer: if critical dependency unavailable >5 minutes or error rate >5%
- Post-mortem procedure: document all external dependency outages and improve mitigation

---

## 2. Appendices

### 2.1 Dependency Matrix & Risk Scoring

#### Criticality Ranking

| System | Criticality | Downtime Impact | Data Loss Impact | User-Facing |
|--------|-------------|-----------------|------------------|-------------|
| PostgreSQL | CRITICAL | Complete service unavailability | Catastrophic | Yes |
| Stripe | CRITICAL | Cannot process payments | Minor (data stored locally) | Yes |
| Firebase FCM | HIGH | Users don't get order notifications | None | Yes (non-critical) |
| Mapbox | MEDIUM | Time-based pickup only | None | Yes (optional) |
| Django Email | HIGH | Registration fails | None | Yes |
| Claude | LOW | Escalate to human agent | None | No (optional feature) |
| Scikit-Learn | MEDIUM | Generic recommendations | None | Yes (optional) |

#### Dependency Chain Risk

```
Stripe Payment Flow:
  ├─ Network/TLS Encryption (Critical)
  ├─ Stripe API Availability (Critical)
  ├─ Database Transaction (Critical)
  └─ Payment Webhook Processing (High)

User Location Flow:
  ├─ Device GPS (External)
  ├─ Mapbox API (High)
  ├─ Network Connectivity (Critical)
  └─ Database Store (Critical)

Notification Flow:
  ├─ Order Ready Logic (Critical)
  ├─ Firebase FCM API (High)
  ├─ Device Token Validity (Medium)
  └─ Network Connectivity (Critical)

Recommendation Engine:
   ├─ Claude API Availability (Low)
   ├─ Prompt/Response Validation (Medium)
   └─ Database Preference Lookup (Medium)
```

### 2.2 Security & Compliance Summary

#### Data Classification & Handling

| Data Type | Classification | Handling | Encryption | Retention |
|-----------|----------------|----------|-----------|-----------|
| User Password | CONFIDENTIAL | Hash with Argon2 | N/A (hashed) | Until account delete |
| Email Address | RESTRICTED | Encrypted at rest | AES-256 | Until account delete |
| Payment Info | RESTRICTED | Never stored (Stripe token only) | N/A (external) | Per Stripe retention |
| Geolocation | RESTRICTED | Encrypted; deleted after order | AES-256 | 24 hours post-order |
| Order History | INTERNAL | Database encryption | At rest | 7 years (compliance) |
| Revenue Data | INTERNAL | Encrypted; restricted access | AES-256 | 7 years (compliance) |
| Machine Status | INTERNAL | Not sensitive | Optional | Until replaced |
| Device Token (FCM) | INTERNAL | Secure tokens | TLS in transit | Until app uninstall |

#### Security Controls by Layer

**Network Layer**
- TLS 1.3 encryption for all API communications
- Certificate pinning for critical services (optional)
- VPN/private networks for database connections

**Application Layer**
- Input validation and sanitization
- SQL injection prevention (Django ORM + parameterized queries)
- CSRF protection (Django middleware)
- XSS prevention (framework built-in)
- Rate limiting on sensitive endpoints

**Authentication Layer**
- Session-based authentication (Django)
- Token-based API authentication (future services)
- Multi-factor authentication (optional enhancement)
- Password requirements enforcement

**Data Layer**
- Database encryption at rest
- Sensitive field encryption (application-level)
- Secure secrets management (environment variables)
- Regular security audit of data access

### 2.3 Monitoring & Observability

#### Key Metrics to Monitor

| System | Metric | Threshold | Alert Action |
|--------|--------|-----------|--------------|
| Stripe | Payment Success Rate | < 95% | Page oncall; check API status |
| Stripe | API Latency | > 5s | Log; monitor trend |
| Firebase | Notification Delivery Rate | < 98% | Page oncall; check FCM status |
| Mapbox | Distance Calc Latency | > 3s | Log; check API quota |
| Database | Connection Pool Utilization | > 80% | Alert; check for leaks |
| Database | Query Latency (p99) | > 5s | Investigate slow query log |
| Database | Disk Usage | > 80% | Alert; plan archival |
| Claude | Response Latency | > 10s | Log; consider timeout |
| Email | Delivery Failure Rate | > 1% | Alert; check SMTP provider |

#### Logging & Alerting

1. **Central Logging**: Collect all external API calls to centralized log service
2. **Metrics**: Track success rates, latencies, error codes for each external system
3. **Alerts**: PagerDuty/similar for critical system failures
4. **Dashboards**: Grafana dashboard showing health of all external dependencies
5. **Post-Mortems**: Document outages and lessons learned
