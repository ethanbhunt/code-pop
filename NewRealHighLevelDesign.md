# CodePop External Interfaces Design Document

## Document Overview

This document defines the external systems, services, and platforms that CodePop integrates with to provide its complete functionality. It addresses the purpose of each integration, interface types, security and compliance considerations, and dependency risks.

**Purpose**: Enable developers, architects, and stakeholders to understand all external dependencies, their integration points, and critical risks to system stability and security.

**Scope**: Covers all third-party APIs, payment processors, messaging services, AI platforms, and geolocation services that CodePop relies upon.

**Audience**: Development team, system architects, DevOps personnel, security officers, and project stakeholders.

---

## 1. External Systems Overview

CodePop integrates with the following external systems:

| System | Type | Purpose | Status |
|--------|------|---------|--------|
| Stripe | Payment Processor | Process customer payments securely | Required (M) |
| Mapbox | Geolocation Service | Track user location and store proximity | Required (M) |
| Firebase Cloud Messaging (FCM) | Push Notification Service | Deliver order ready notifications | Required (M) |
| Claude (Anthropic API) | AI Assistant | Customer support, complaint handling, drink recommendations | Required (M) |
| Scikit-Learn | AI/ML Library | Demand prediction for supply chain optimization | Should Have (S) |
| Django Email Service | Email Notifications | Account confirmation emails | Required (M) |
| PostgreSQL Database | Data Storage | Primary application database | Required (M) |

---

## 2. External Systems - Detailed Integration Specifications

### 2.1 Payment Processing - Stripe

**Purpose**
Stripe handles all financial transactions for CodePop, including:
- Processing customer payments at order checkout
- Managing refunds for canceled orders
- Providing secure payment method storage (PCI-DSS compliant)
- Generating payment receipts and transaction records
- Supporting multiple payment methods (credit cards, Apple Pay, Google Pay)

**Integration Type**
- **Protocol**: RESTful HTTPS API
- **Authentication**: API keys (Secret and Publishable)
- **Communication**: Synchronous request-response over encrypted TLS connection
- **Payment Flow**:
  1. Frontend (React Native) collects payment method via Stripe Elements
  2. Frontend sends payment intent request to backend
  3. Backend creates PaymentIntent via Stripe API
  4. Frontend completes payment authentication with Stripe
  5. Backend receives webhook confirmation and updates order status
  6. Customer receives confirmation notification

**Interface Specifications**
- **Base URL**: `https://api.stripe.com/v1/`
- **Key Endpoints**:
  - `POST /payment_intents` - Create payment intent for order
  - `POST /refunds` - Process refund for canceled order
  - `GET /charges/{id}` - Retrieve charge details
  - `GET /customers/{id}` - Manage customer payment profiles
- **Data Format**: JSON request/response bodies
- **Rate Limits**: 100 requests/second for most endpoints
- **Webhook Events**: `payment_intent.succeeded`, `charge.refunded`, `charge.failed`

**Security & Compliance Considerations**

1. **PCI-DSS Compliance**
   - Stripe is Level 1 PCI-DSS certified
   - CodePop must never directly store or transmit raw card data
   - All payment information flows through Stripe's secure infrastructure
   - Store only Stripe Payment Method IDs, not raw card details

2. **Data Encryption**
   - All API communication uses TLS 1.3 encryption
   - Sensitive data (API keys) stored in environment variables, never in source code
   - API keys rotated periodically and restricted to necessary scopes

3. **Authentication**
   - API calls authenticated via Bearer token (Secret API Key)
   - Publishable API key used only on frontend, has limited capabilities
   - Webhook signatures verified using shared secret before processing

4. **Sensitive Data Handling**
   - Payment amounts stored in database (non-sensitive)
   - Transaction IDs and Stripe customer IDs stored for reference
   - Email receipts sent to customer after successful payment
   - Revenue reports accessible only to managers with proper role

**Dependency Risks**

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Stripe API downtime | Customers cannot complete purchases | Implement robust error handling; display user-friendly error messages; allow retry mechanism |
| Rate limiting | Payment processing delays during high traffic | Implement request queuing; batch refund operations during off-peak hours |
| API version deprecation | Breaking changes to payment flow | Monitor Stripe API changelog; maintain separate versioned endpoints; test updates in staging |
| Failed webhook delivery | Order status misalignment between systems | Implement webhook retry logic in Stripe; periodically reconcile payment status via polling; maintain order status state machine |
| Authentication/key compromise | Unauthorized access to payment data | Regularly rotate API keys; use environment-specific keys; monitor for suspicious activity; implement API key rollover strategy |

**Integration Checklist**
- [ ] Secret API key stored in environment variables
- [ ] Webhook endpoint configured and verified
- [ ] Error handling for failed payments implemented
- [ ] Refund processing workflow documented
- [ ] PCI-DSS compliance audit completed
- [ ] Payment method tokenization tested
- [ ] Webhook signature verification implemented
- [ ] Fallback payment retry logic implemented

---

### 2.2 Geolocation Service - Mapbox

**Purpose**
Mapbox provides location services to enable:
- Real-time tracking of user location when ordering
- Calculation of distance to nearest CodePop store
- Estimated pickup time based on geolocation
- Display of store locations on map interface
- Optional time-based pickup instead of location tracking

**Integration Type**
- **Protocol**: RESTful HTTPS API + SDK
- **Authentication**: API access tokens
- **Communication**: Asynchronous location updates via SDK; synchronous API calls for distance calculations
- **Location Flow**:
  1. User opts in to geolocation on payment page (required for location-based pickup)
  2. React Native app requests device location permission
  3. Frontend continuously tracks location via Mapbox SDK
  4. Backend receives periodic location updates for order preparation
  5. User notified when location is near store or at predetermined time
  6. Map displays store location and user position

**Interface Specifications**
- **Base URL**: `https://api.mapbox.com/`
- **Key Endpoints**:
  - `GET /geocoding/v5/mapbox.places/{query}.json` - Reverse geocoding for store locations
  - `GET /directions/v5/mapbox/{profile}/{coordinates}` - Calculate distance/route
  - `GET /matching/v5/mapbox/{profile}/{coordinates}` - Snap coordinates to roads
- **Data Format**: JSON request/response
- **Rate Limits**: 600 requests/minute (free tier); 50,000 requests/month included
- **SDK**: Mapbox GL JS for web, Mapbox Maps SDK for React Native

**Security & Compliance Considerations**

1. **Location Data Privacy**
   - Location data is sensitive personally identifiable information (PII)
   - User must explicitly opt-in to location tracking at payment page
   - Location is encrypted in transit (TLS) and at rest
   - Location data only retained while order is pending pickup
   - Location data deleted 24 hours after order completion

2. **Data Minimization**
   - Only store location coordinates necessary for pickup coordination
   - Do not store location history across multiple orders
   - Do not sell or share location data with third parties
   - User has option to disable geolocation and use time-based pickup instead

3. **Compliance**
   - GDPR compliant: Users must consent to location processing
   - CCPA compliant: Users can request location data deletion
   - Implement "right to be forgotten" for location data
   - Privacy policy must disclose location data usage

4. **Authentication**
   - Public access token for frontend (limited to map viewing)
   - Private access token for backend (distance/direction calculations)
   - Tokens rotated quarterly
   - Monitor for unauthorized token usage

**Dependency Risks**

| Risk | Impact | Mitigation |
|------|--------|-----------|
| GPS accuracy limitations | Inaccurate distance calculations | Use Mapbox road snapping; implement manual time override option; allow user correction |
| Location permission denied | Cannot track user for pickup notification | Gracefully fall back to time-based pickup; provide clear UX guidance for enabling location |
| Mapbox API rate limiting | Distance calculations fail during high traffic | Implement client-side caching of distances; batch requests; queue during high traffic periods |
| Network connectivity loss | Location updates fail while user in transit | Cache last known location; implement offline capability with sync on reconnection |
| Privacy regulation changes | Non-compliance with new location privacy laws | Monitor GDPR/CCPA updates; maintain audit logs of location processing; implement consent management system |

**Integration Checklist**
- [ ] Public token configured for frontend
- [ ] Private token stored securely in backend environment variables
- [ ] Location opt-in flow implemented at checkout
- [ ] Location permission request on mobile device tested
- [ ] Time-based fallback implemented
- [ ] Location data retention policy implemented (24-hour deletion)
- [ ] Privacy policy updated with location data disclosure
- [ ] Distance calculation caching implemented
- [ ] Offline location handling tested
- [ ] GDPR/CCPA compliance verification completed

---

### 2.3 Push Notifications - Firebase Cloud Messaging (FCM)

**Purpose**
Firebase Cloud Messaging enables:
- Real-time notifications when drinks are ready for pickup
- Event-based notifications (seasonal menu changes, birthdays, promotions)
- Opt-in preference notifications
- Cross-platform delivery (Android and iOS)
- Backend-initiated messaging to device

**Integration Type**
- **Protocol**: HTTPS REST API or Firebase Admin SDK
- **Authentication**: Service account credentials (JSON key file)
- **Communication**: One-way asynchronous messaging from backend to client
- **Notification Flow**:
  1. Mobile app requests FCM device token on first launch
  2. App registers token with CodePop backend
  3. User places order; backend schedules notification
  4. When order ready, backend sends message via FCM API
  5. FCM delivers notification to user's device
  6. User receives notification with drink ready status

**Interface Specifications**
- **Base URL**: `https://fcm.googleapis.com/`
- **Key Endpoints**:
  - `POST /v1/projects/{project}/messages:send` - Send message to device
  - `POST /iid/v1:batchRemoveInstance` - Unregister devices
- **Data Format**: JSON with FCM message schema
- **Rate Limits**: No hard limit for standard messages; quota enforced at Google Cloud level
- **SDK**: Firebase Admin SDK (Python available for Django backend)

**Security & Compliance Considerations**

1. **Authentication & Authorization**
   - Firebase project credentials stored in secure backend environment
   - Never expose FCM credentials in frontend code
   - Service account has minimal necessary permissions (messaging only)
   - Credentials rotated every 90 days

2. **Data in Transit**
   - All FCM API calls use TLS encryption
   - Device tokens transmitted over HTTPS only
   - Notification payloads encrypted at rest by Google

3. **Token Management**
   - Device tokens refreshed regularly (Android: automatic; iOS: manual check)
   - Invalidated tokens removed from database on delivery failure
   - Device tokens associated with user ID for targeting
   - Tokens deleted when user deletes account

4. **Message Content**
   - Notifications contain only non-sensitive information (order ready, status)
   - No sensitive data (payment info, account credentials) in notification body
   - Implement deep linking to securely open app to correct order

5. **User Consent**
   - Users opt-in to notifications on app setup
   - Option to disable notifications in app settings
   - Honor user's notification preferences immediately

**Dependency Risks**

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Google/Firebase downtime | Users don't receive order ready notifications | Implement fallback email notification; backup with SMS if available; alert user via UI |
| Invalid device tokens | Notifications fail to deliver | Monitor delivery failures; automatically remove failed tokens; implement token refresh strategy |
| Rate limiting | Bulk notifications delayed during rush | Distribute notifications over time; implement queue system; prioritize time-sensitive messages |
| Typos in Firebase config | Messages fail to send silently | Implement validation of Firebase project configuration; test messaging flow in staging |
| User device uninstalls app | Tokens remain active unnecessarily | Implement cleanup via APK uninstall tracking (Android) and silent notifications (iOS) |

**Integration Checklist**
- [ ] Firebase project created and configured
- [ ] Service account credentials generated and stored securely
- [ ] Firebase Admin SDK installed in Django backend
- [ ] Device token registration flow implemented
- [ ] Notification scheduling mechanism built
- [ ] Failed delivery handling implemented
- [ ] Token refresh strategy implemented
- [ ] User opt-in/opt-out preferences implemented
- [ ] Deep linking configured to open correct order
- [ ] Staging and production Firebase projects configured
- [ ] Message rate limiting strategy implemented

---

### 2.4 AI Chatbot - Claude (Anthropic API)

**Purpose**
Claude provides advanced conversational AI capabilities for:
- Responding to customer complaints and support requests with nuanced understanding
- Providing intelligent troubleshooting guidance
- Generating personalized drink recommendations based on user preferences and dietary restrictions
- Suggesting drinks based on user mood, occasion, or seasonal availability
- Learning context from conversation history for coherent multi-turn discussions
- Reducing human support staff workload
- Improving customer satisfaction through high-quality, contextual responses and recommendations

**Integration Type**
- **Protocol**: RESTful HTTPS API
- **Aomplaint/Support Flow**:
  1. User enters complaint or question on complaints page
  2. Frontend sanitizes input and sends to backend
  3. Backend validates input for malicious content
  4. Backend sends to Claude API with conversation history
  5. Claude generates contextual, conversational response
  6. Response displayed to user
  7. User can continue conversation or escalate to human agent

- **Drink Recommendation Flow**:
  1. User requests drink recommendation (via preferences page or AI suggest button)
  2. Frontend sends user preferences, dietary restrictions, and optional context (mood, occasion) to backend
  3. Backend retrieves available drinks and ingredients from database
  4. Backend sends request to Claude with drink options and user profile
  5. Claude generates personalized recommendation with explanation
  6. Recommendation displayed to user with option to add to cart or get alternative
  7. User feedback recorded for future personalization
  6. Response displayed to user
  7. User can continue conversation or escalate to human agent

**Interface Specifications**
- **Base URL**: `https://api.anthropic.com/v1/`
- **Model**: `claude-3-5-sonnet-20241022` (recommended for balance of speed/cost) or `claude-3-opus-20250219` (more capable for complex recommendations)
- **Key Endpoints**:
  - `POST /messages` - Send message and receive response
- **Data Format**: JSON with message array and system prompt
- **Rate Limits**: Varies by account tier; standard: 50,000 tokens/minute
- **SDK**: Official Anthropic Python SDK available
- **Token Usage**: Drink recommendations typically 200-500 tokens; complaint responses 300-800 tokens
- **Context Window**: 200K tokens (sufficient for storing full user preference history)

**Security & Compliance Considerations**

1. **Input Validation & Sanitization**
   - User input must be validated for length (max 8000 characters - Claude limit)
   - Filter for SQL injection attempts, script injection
   - Remove potentially sensitive information (email, phone, credit card numbers, passwords)
   - Log all user inputs for monitoring and audit trail
   - Implement system prompt injection prevention

2. **System Prompt Security**
   - Define clear system prompts for different use cases:
     - Support/complaint handling prompt
     - Drink recommendation prompt with ingredient/allergy awareness
   - Explicitly prevent Claude from disclosing system information
   - Include instructions to refuse requests for sensitive data
   - For recommendations, establish clear rules about allergen handling and disclaimer
   - Regularly audit system prompts for security gaps
   - Never include API keys or credentials in system prompt
   - Document how Claude handles edge cases (severe allergies, dietary restrictions)

3. **Data Privacy**
   - Chat conversations may be stored for moderation purposes per Anthropic policy
   - Anthropic's API privacy policy reviewed and understood
   - Do not send PII (passwords, payment info) or sensitive medical data to Claude API
   - User preferences and dietary restrictions can be sent as context for recommendations
   - If storing conversations/recommendations locally, encrypt them and retain only while needed
   - Implement data minimization: only send necessary context
   - For allergy/dietary data, handle with extra care per data classification

4. **Model Accuracy & Safety**
   - Claude is advanced but can still generate inaccurate information
   - **Critical for recommendations**: Always include disclaimer that recommendations do not replace personal dietary knowledge
   - For drink recommendations, validate suggested ingredients against available inventory
   - Clearly label AI responses as generated (not human staff)
   - Provide easy escalation path to human agent for serious issues
   - For allergy-related concerns, recommend user verify ingredients with staff
   - Implement feedback mechanism to flag problematic responses and recommendations
   - Regular audits of response quality, safety, and alignment with company brand
   - Monitor for jailbreak attempts or adversarial prompts
   - Test recommendations against common allergens and dietary restrictions

5. **API Security**
   - Anthropic API key stored in environment variables only
   - Separate keys for development, staging, production
   - Implement rate limiting on complaint and recommendation submissions (prevent abuse)
   - Monitor for unusual API usage patterns
   - Keys rotated every 90 days
**Dependency Risks**

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Anthropic API downtime | Users cannot submit complaints or get recommendations | Gracefully inform user of temporary unavailability; queue requests for later; provide fallback generic recommendations |
| Inaccurate drink recommendation | Customer orders unsuitable drink; potential allergy issues | Always include allergen disclaimer; validate recommended ingredients in inventory; easy feedback mechanism; monitor feedback closely |
| Inaccurate complaint response | Customer unsatisfied; complaints escalate | Clearly label as AI response; easy escalation path; monitor feedback; implement human review for low-quality responses |
| Claude recommends unavailable ingredient | User disappointed; poor experience | Validate all recommended ingredients against current inventory before returning; filter recommendations to available items |
| Claude refuses benign recommendation request | User frustrated by overly cautious AI | Refine system prompt with examples; test edge cases; provide alternative support channels |
| Prompt injection attacks | AI bypasses instructions; reveals system info | Strict input validation; test-based adversarial examples; monitor suspicious patterns; implement response validation |
| High inference latency | Recommendation/response slow; poor UX | Implement timeout with fallback (suggest popular drinks or queue request); cache common recommendation patterns |
| API rate limit exceeded | API requests rejected; service disruption | Implement queuing and backoff; monitor token usage; consider caching common recommendations; upgrade plan if needed |
| Cost escalation | API usage more expensive than expected | Monitor token usage daily by use case; implement response length limits; cache popular recommendations; track usage trends |

**Integration Checklist**
- [ ] Anthropic API account created and API key obtained
- [ ] API key stored securely in environment variables
- [ ] System prompts defined and tested (support + recommendation prompts)
- [ ] Drink recommendation system prompt includes allergen awareness
- [ ] Input validation and sanitization implemented
- [ ] Malicious content and prompt injection filtering implemented
- [ ] Rate limiting on complaint and recommendation requests implemented
- [ ] Response timeout mechanism implemented (10-15 seconds for complaints, 5-10 for recommendations)
- [ ] Fallback generic recommendation logic for API downtime
- [ ] Recommendation ingredient validation against inventory implemented
- [ ] Token usage monitoring and cost tracking by use case (support vs recommendations)
- [ ] Response quality monitoring dashboard created
- [ ] Feedback mechanism for flagging bad responses/recommendations implemented
- [ ] Recommendation feedback recorded for future model refinement
- [ ] Privacy policy updated regarding Claude API usage and recommendations
- [ ] Disclaimer added that AI recommendations don't replace personal knowledge
- [ ] Allergen disclaimer prominently displayed with recommendations
- [ ] Staging environment configured with test API key
- [ ] Conversation context management strategy documented
- [ ] Maximum message/conversation length limits defined
- [ ] A/B testing framework for recommendation quality evaluation
- [ ] Fallback popular drinks list for when Claude unavailable
- [ ] Maximum message/conversation length limits defined
- [ ] A/B testing framework for recommendation quality evaluation
- [ ] Fallback popular drinks list for when Claude unavailable

---

### 2.5 AI Models - Scikit-Learn

**Purpose**
Scikit-Learn powers CodePop's demand prediction and supply chain optimization:
- Demand prediction using historical inventory data (CSV imports)
- Supply optimization for logistics managers
- Popularity trend analysis for beverage offerings
- Machine learning models for forecasting ingredient usage patterns

**Note**: Drink recommendations are now handled by Claude (see section 2.4). Scikit-Learn focuses on backend supply chain analytics rather than customer-facing recommendations.

**Integration Type**
- **Protocol**: In-process Python library (no external API calls)
- **Data Format**: CSV files (for historical data import), pandas DataFrames, NumPy arrays
- **Training Data**: Historical order data, user preferences, inventory usage
- **Model Updates**: Periodic retraining on new data (nightly batch jobs)
- **Prediction Flow**:
  1. User opens drink recommendation page
  2. Backend loads trained Scikit-Learn model from disk
  3. Model receives user preference features
  4. Model generates ranked drink recommendations
  5. Top recommendations returned to frontend
  6. User can confirm suggestion or generate new one

**Interface Specifications**
- **Library Version**: Scikit-Learn 1.0+
- **Key Models**:
  - `sklearn.feature_extraction.text.TfidfVectorizer` - Ingredient vectorization
  - `sklearn.metrics.pairwise.cosine_similarity` - Content-based filtering
  - `sklearn.ensemble.RandomForestRegressor` - Demand prediction
  - `sklearn.preprocessing.StandardScaler` - Feature normalization
- **Dependencies**: NumPy, SciPy, Pandas
- **Model Persistence**: Pickle files or Joblib serialization
- **Training Pipeline**: Python scripts triggered by cron jobs (nightly)

**Security & Compliance Considerations**

1. **Training Data Privacy**
   - Models trained only on aggregate, anonymized user data
   - Remove personally identifiable information before training
   - Do not store individual user data in model features
   - Implement data minimization (only use features necessary for prediction)

2. **Model Transparency & Fairness**
   - Models should not discriminate based on protected characteristics
   - Monitor for bias in recommendations (e.g., minority flavor options underrepresented)
   - Implement fairness constraints in model training
   - Document model limitations and decision rules

3. **Model Integrity**
   - Models stored in secure location with access controls
   - Version control for all model files (track changes over time)
   - Validate model outputs before returning to users
   - Sanity checks: recommendations should include expected ingredients

4. **Prediction Confidence**
   - Monitor prediction confidence scores
   - Supplement low-confidence predictions with fallback recommendations
   - Log predictions for auditing and performance analysis

5. **Adversarial Input Prevention**
   - Validate user features before feeding to model
   - Limit number of recommendations generated per request
   - Monitor for unusual patterns in feature data

**Dependency Risks**

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Corrupted model file | Predictions fail or produce garbage | Implement model checksum validation; maintain backup model versions; test model before deployment |
| Retraining job failure | Model becomes stale; recommendations less accurate | Implement monitoring and alerting for retraining jobs; implement rollback to previous model; manual retraining trigger |
| Insufficient training data | Model performs poorly on new items | Start with rule-based recommendations for new drinks; implement hybrid approach combining rules and ML |
| Model overfitting | Recommendations too specific to training data; poor generalization | Use cross-validation during training; regularization techniques; test on holdout data before deployment |
| Inconsistent feature engineering | Model predictions inconsistent between versions | Document feature engineering pipeline; version control preprocessing code; validate features in production |

**Integration Checklist**
- [ ] Scikit-Learn and dependencies installed
- [ ] Training data prepared and anonymized
- [ ] Feature engineering pipeline documented
- [ ] Model training script created and tested
- [ ] Model validation metrics tracked (accuracy, precision, recall)
- [ ] Model serialization (Joblib) implemented
- [ ] Model versioning strategy established
- [ ] Prediction caching implemented for performance
- [ ] Fallback recommendations for edge cases implemented
- [ ] Nightly retraining job scheduled
- [ ] Model performance monitoring dashboard created
- [ ] Bias analysis and fairness metrics tracked
- [ ] A/B testing framework for model iterations implemented

---

### 2.6 Email Notifications - Django Built-in Service

**Purpose**
Django's email functionality provides:
- Account registration confirmation emails
- Password reset instructions
- Email-based notifications (optional)
- Transactional email verification
- SMTP integration with email provider

**Integration Type**
- **Protocol**: SMTP over TLS
- **Email Provider**: Configured via Django settings (Gmail, SendGrid, AWS SES, custom SMTP)
- **Communication**: Synchronous email sending (can be async with Celery)
- **Email Flow**:
  1. User registers account with email address
  2. Backend generates unique verification token
  3. Django send_mail() creates and sends confirmation email
  4. Email contains verification link with token
  5. User clicks link, token validated, account activated
  6. User can now log in

**Interface Specifications**
- **Django Settings**:
  - `EMAIL_BACKEND` - SMTP backend configuration
  - `EMAIL_HOST` - SMTP server address
  - `EMAIL_PORT` - SMTP port (587 for TLS, 465 for SSL)
  - `EMAIL_HOST_USER` - SMTP username
  - `EMAIL_HOST_PASSWORD` - SMTP password (stored in environment variables)
  - `EMAIL_USE_TLS` - Enable TLS encryption
  - `DEFAULT_FROM_EMAIL` - Sender address
- **Django Function**: `send_mail(subject, message, from_email, recipient_list)`
- **Alternative**: Celery async task queue for non-blocking email sending

**Security & Compliance Considerations**

1. **Authentication & Credentials**
   - SMTP credentials stored in environment variables only
   - Never commit credentials to version control
   - Use app-specific passwords (not user password)
   - Rotate credentials quarterly

2. **Email Content Security**
   - Verification tokens cryptographically secure (Django default)
   - Tokens expire after 24 hours (standard practice)
   - Include user-specific information in tokens (prevents reuse)
   - Never send passwords via email

3. **Data Protection**
   - Email addresses collected with user consent
   - Comply with CAN-SPAM (commercial email requirements)
   - Include unsubscribe option for non-transactional emails
   - Privacy policy discloses email usage

4. **SMTP Security**
   - TLS encryption enabled for SMTP connection
   - Verify SSL certificates to prevent MITM attacks
   - Monitor for email delivery failures
   - Log email sending for audit trail

5. **Compliance**
   - GDPR: Users consent to email contact; right to erasure respected
   - CCPA: Users can opt-out of email notifications
   - Implement email preference management

**Dependency Risks**

| Risk | Impact | Mitigation |
|------|--------|-----------|
| SMTP server downtime | Verification emails not sent; users cannot activate accounts | Implement retry logic with exponential backoff; queue emails for retry; alert admin |
| Email rate limiting | Bulk emails rejected or delayed | Implement email queuing with rate limiting; spread sending over time; use dedicated transactional email service |
| Credentials compromise | Unauthorized email sending; spam abuse | Rotate credentials immediately; implement IP whitelist on SMTP server; monitor for unusual sending patterns |
| Email deliverability issues | Emails marked as spam; users don't receive verification | Configure SPF, DKIM, DMARC records; monitor bounce rates; test emails in staging before production |
| User email invalid | Verification email fails to send | Validate email format before sending; implement bounce handling; prompt user for email correction |

**Integration Checklist**
- [ ] SMTP provider selected (SendGrid, AWS SES, etc.)
- [ ] SMTP credentials stored in environment variables
- [ ] Django EMAIL_BACKEND configured
- [ ] TLS encryption enabled for SMTP
- [ ] Verification email template created
- [ ] Token generation and validation implemented
- [ ] Email sending retry logic implemented
- [ ] SPF, DKIM, DMARC records configured
- [ ] Email delivery monitoring set up
- [ ] Bounce handling implemented
- [ ] Async email sending (Celery) considered for scalability
- [ ] Privacy policy updated with email disclosure
- [ ] Email unsubscribe mechanism implemented (if needed)

---

### 2.7 Database - PostgreSQL

**Purpose**
PostgreSQL is the primary data store for CodePop, storing:
- User accounts and authentication data
- Orders and transactions
- Inventory and supply information
- Machine maintenance data
- Revenue and financial records
- User preferences and ratings

**Integration Type**
- **Protocol**: PostgreSQL wire protocol (TCP/IP)
- **Client Library**: psycopg2 (Python PostgreSQL adapter)
- **ORM**: Django ORM (abstracts SQL)
- **Communication**: Persistent connection pool for efficiency
- **Data Access Pattern**:
  1. Django ORM translates Python code to SQL
  2. psycopg2 sends SQL to PostgreSQL server
  3. PostgreSQL executes query and returns results
  4. ORM maps results to Python objects
  5. Application uses Python objects

**Interface Specifications**
- **Default Port**: 5432
- **Connection Pool**: psycopg2 with connection pooling (PgBouncer optional)
- **Key Django Models** (mapped to tables):
  - `User` - User accounts and authentication
  - `Order` - Customer orders and status
  - `Inventory` - Store inventory items
  - `Drink` - Drink definitions
  - `Machine` - Machine maintenance tracking
  - `SupplyHub` - Regional supply hub information
  - `Store` - Location information for stores
  - `Payment` - Payment transaction records
- **Transactions**: ACID compliance; Django transaction.atomic() for multi-operation atomicity
- **Indexes**: Automatically created on primary/foreign keys; custom indexes on frequently queried columns

**Security & Compliance Considerations**

1. **Authentication & Authorization**
   - PostgreSQL user account with limited privileges (not root/superuser)
   - Separate read-only account for reporting/analytics (if needed)
   - Password authentication with strong, randomly generated passwords
   - No password authentication from untrusted networks

2. **Network Security**
   - PostgreSQL restricted to private network (not internet-facing)
   - SSL/TLS connections enforced (sslmode=require)
   - Firewall rules limit access to application servers only
   - Connection string secured in environment variables

3. **Data Encryption**
   - Passwords encrypted with Django's PBKDF2 or Argon2 hashing
   - Sensitive fields encrypted at application level (email, payment info optional)
   - Encryption keys stored separately from encrypted data
   - Regular key rotation procedure

4. **Backup & Recovery**
   - Automated daily backups using pg_dump
   - Backups stored securely (encrypted, off-site)
   - Recovery time objective (RTO) defined (< 4 hours)
   - Recovery point objective (RPO) defined (< 1 hour)
   - Regular restore testing to verify backup integrity

5. **Monitoring & Auditing**
   - Query logging for high-risk operations (DELETE, UPDATE on sensitive tables)
   - Connection monitoring to detect unauthorized access
   - Slow query logging to identify performance issues
   - Audit logs for user creation/deletion, role changes

6. **Compliance**
   - GDPR: Implement data erasure (DELETE) and right to portability
   - CCPA: Track data processing purposes; implement deletion requests
   - Data retention policies: Archive old data after defined period
   - Regular security audits of database configuration

**Dependency Risks**

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Database corruption | Data loss; application unavailability | Implement regular automated backups; test recovery procedures; use PostgreSQL replication for redundancy |
| Connection exhaustion | Application cannot connect; service unavailable | Implement connection pooling (PgBouncer); monitor connection usage; set connection limits |
| Slow queries | Poor application performance; user experience degradation | Monitor slow query log; create indexes on frequently queried columns; optimize N+1 queries |
| Disk space exhaustion | Database cannot accept new data | Monitor disk usage; implement data archival strategy; set up alerts for >80% capacity |
| Password/credential compromise | Unauthorized database access | Store credentials in environment variables; implement IP whitelisting; rotate passwords quarterly; monitor for suspicious queries |
| Query injection (SQL injection) | Unauthorized data access/modification | Use parameterized queries (Django ORM); input validation; regular security scanning |
| Network connectivity loss | Database unavailable; application errors | Implement connection retry logic; graceful error handling; failover to read replica if available |

**Integration Checklist**
- [ ] PostgreSQL server installed and configured
- [ ] Django database settings configured (host, port, credentials)
- [ ] psycopg2 package installed
- [ ] Connection pooling configured (optional: PgBouncer)
- [ ] Database user account created with limited privileges
- [ ] SSL/TLS connections enforced
- [ ] Database initialization and migrations tested
- [ ] Automated backup procedure configured
- [ ] Backup restoration tested monthly
- [ ] Slow query logging enabled
- [ ] Query audit logging for sensitive operations
- [ ] Monitoring alerts configured (disk space, connections, errors)
- [ ] Regular database optimization (VACUUM, ANALYZE)
- [ ] Django ORM queries reviewed for N+1 problems
- [ ] Indexes created on foreign keys and frequently queried columns
- [ ] Data retention and archival policy documented

---

## 3. Dependency Matrix & Risk Scoring

### Criticality Ranking

| System | Criticality | Downtime Impact | Data Loss Impact | User-Facing |
|--------|-------------|-----------------|------------------|-------------|
| PostgreSQL | CRITICAL | Complete service unavailability | Catastrophic | Yes |
| Stripe | CRITICAL | Cannot process payments | Minor (data stored locally) | Yes |
| Firebase FCM | HIGH | Users don't get order notifications | None | Yes (non-critical) |
| Mapbox | MEDIUM | Time-based pickup only | None | Yes (optional) |
| Django Email | HIGH | Registration fails | None | Yes |
| DialoGPT | LOW | Escalate to human agent | None | No (optional feature) |
| Scikit-Learn | MEDIUM | Generic recommendations | None | Yes (optional) |

### Dependency Chain Risk

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
  ├─ Scikit-Learn Model Load (Low)
  ├─ Model Prediction (Low)
  └─ Database Preference Lookup (Medium)
```

---

## 4. Failure Scenarios & Recovery Procedures

### Scenario 1: Stripe Payment Processor Unavailable

**Detection**: Webhook timeout or API errors when creating payment intent

**Immediate Response**:
1. Display user-friendly error message: "Payment system temporarily unavailable. Please try again in a few minutes."
2. Store order in database with status `PAYMENT_PENDING`
3. Queue payment processing for retry

**Recovery (1-2 hours)**:
1. Stripe operational again
2. Automated job processes queued payments
3. User receives confirmation notification
4. Order moves to preparation

**Long-term**: Document outage; implement fallback payment methods if dependency risk becomes too high

### Scenario 2: Firebase FCM Downtime

**Detection**: Notification sending returns errors; delivery rates drop

**Immediate Response**:
1. Catch FCM API errors gracefully
2. Log failed notifications for retry
3. Display on-screen message: "Order ready" (backup)
4. Queue for later FCM retry

**Recovery**:
1. FCM operational
2. Retry pending notifications
3. Users eventually notified

**Impact**: Users may arrive before receiving notification; non-critical

### Scenario 3: PostgreSQL Database Down

**Detection**: Django cannot connect; all queries fail

**Immediate Response**:
1. Orchestrate automatic database restart (if using Docker/Kubernetes)
2. Display error: "System temporarily unavailable"
3. Log incident for incident response team
4. Alert ops team

**Recovery**:
1. Restart database if hung process
2. Check disk space; archive old data if needed
3. Restore from backup if corruption detected
4. Verify data integrity
5. Resume application

**Prevention**:
- Monitor database availability continuously
- Implement automated backups and recovery
- Use read replicas for failover (if high availability needed)

### Scenario 4: Mapbox Geolocation Unavailable

**Detection**: Distance calculations fail; location API timeout

**Immediate Response**:
1. Catch Mapbox API errors
2. Fall back to time-based pickup
3. Disable location-based features on frontend
4. Store user location locally for later sync

**Recovery**:
1. Mapbox operational
2. Resume location-based features
3. Sync stored location data

**Impact**: Users use time-based pickup instead; limited functional impact

---

## 5. Security & Compliance Summary

### Data Classification & Handling

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

### Security Controls by Layer

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

---

## 6. Monitoring & Observability

### Key Metrics to Monitor

| System | Metric | Threshold | Alert Action |
|--------|--------|-----------|--------------|
| Stripe | Payment Success Rate | < 95% | Page oncall; check API status |
| Stripe | API Latency | > 5s | Log; monitor trend |
| Firebase | Notification Delivery Rate | < 98% | Page oncall; check FCM status |
| Mapbox | Distance Calc Latency | > 3s | Log; check API quota |
| Database | Connection Pool Utilization | > 80% | Alert; check for leaks |
| Database | Query Latency (p99) | > 5s | Investigate slow query log |
| Database | Disk Usage | > 80% | Alert; plan archival |
| DialoGPT | Response Latency | > 10s | Log; consider timeout |
| Email | Delivery Failure Rate | > 1% | Alert; check SMTP provider |

### Logging & Alerting

1. **Central Logging**: Collect all external API calls to centralized log service
2. **Metrics**: Track success rates, latencies, error codes for each external system
3. **Alerts**: PagerDuty/similar for critical system failures
4. **Dashboards**: Grafana dashboard showing health of all external dependencies
5. **Post-Mortems**: Document outages and lessons learned

---

## 7. Onboarding & Documentation

### For New Developers

1. **API Key Management**
   - How to obtain development/staging API keys
   - Where to store in local environment (.env file)
   - How to rotate keys

2. **Testing External Systems**
   - Stripe test mode and test card numbers
   - Mapbox test API keys
   - Firebase emulator for local testing
   - Mock/stub services for unit tests

3. **Common Issues & Troubleshooting**
   - Payment webhook not firing (check endpoint configuration)
   - Notifications not delivering (verify device token)
   - Distance calculations slow (check API quota, implement caching)
   - Email not sending (verify SMTP credentials, SPF/DKIM)

### For Operations

1. **Monitoring Setup**
   - Configure alerting for API failures
   - Create runbooks for each external system
   - Establish escalation procedures

2. **Incident Response**
   - Map external services to oncall engineers
   - Document fallback procedures
   - Coordinate with external vendors during outages

3. **Credential Management**
   - Inventory all API keys/credentials
   - Rotation schedule and procedures
   - Secure storage and access controls

---

## 8. Future Integrations & Recommendations

### Potential Future Systems

1. **SMS Notifications** (Twilio/Nexmo)
   - Fallback for push notifications
   - Alternative to email for verification

2. **Advanced Analytics** (Mixpanel, Segment)
   - User behavior tracking
   - Funnel analysis
   - A/B testing platform

3. **Real-time Chat Support** (Intercom, Zendesk)
   - Live agent support
   - Replace/supplement ClaudeAI

4. **Compliance & Monitoring** (DataDog, New Relic)
   - APM and infrastructure monitoring
   - Security event monitoring
   - Compliance automation

5. **Supply Chain Integration** (EDI with suppliers)
   - Automated orders to suppliers
   - Real-time inventory sync
   - Cross-hub coordination

### Recommendations for Scaling

1. **High Availability**
   - Database replication and failover
   - Multi-region deployment for external APIs
   - Load balancing for API calls

2. **Performance Optimization**
   - Cache external API responses (Mapbox distances, Stripe webhook data)
   - Asynchronous processing (Celery) for non-blocking operations
   - CDN for static content and media

3. **Cost Management**
   - Monitor API usage against quotas
   - Implement request deduplication
   - Batch operations where possible

---

## 9. Appendices

### A. API Key Management Checklist

- [ ] All API keys stored in environment variables (never in code)
- [ ] Separate keys for development, staging, production
- [ ] Keys rotated every 90 days
- [ ] Key access logged and monitored
- [ ] Compromised keys rotated immediately
- [ ] Unused keys deleted
- [ ] Key scopes minimized (only necessary permissions)
- [ ] Documented procedure for generating new keys

### B. Deployment Checklist

Before deploying to production:

- [ ] All external API endpoints verified working
- [ ] Webhook endpoints configured and tested
- [ ] Error handling for all external calls implemented
- [ ] Timeouts configured appropriately
- [ ] Retry logic implemented
- [ ] Fallback/degraded mode tested
- [ ] Monitoring and alerting configured
- [ ] Load testing with external services completed
- [ ] Credentials stored in secure environment variables
- [ ] Database backups automated and tested
- [ ] Incident response plan reviewed with team

### C. External Service Status Pages

- **Stripe**: https://status.stripe.com
- **Firebase/Google Cloud**: https://status.cloud.google.com
- **Mapbox**: https://status.mapbox.com
- **HuggingFace**: Monitor through API response codes

### D. Glossary

- **PCI-DSS**: Payment Card Industry Data Security Standard
- **GDPR**: General Data Protection Regulation (EU privacy law)
- **CCPA**: California Consumer Privacy Act
- **TLS**: Transport Layer Security (encryption protocol)
- **RTO**: Recovery Time Objective (max downtime acceptable)
- **RPO**: Recovery Point Objective (max data loss acceptable)
- **API Rate Limiting**: Restriction on number of requests per time period
- **Webhook**: Server-to-server callback for asynchronous events
- **JWT**: JSON Web Token (stateless authentication)

---

**Document Version**: 1.0  
**Last Updated**: February 1, 2026  
**Author**: Development Team  
**Next Review**: August 1, 2026
