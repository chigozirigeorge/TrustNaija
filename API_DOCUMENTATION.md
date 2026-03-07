# TrustNaija API Documentation

Complete reference for all API endpoints, request formats, and responses.

---

## 1. Health Check

### `GET /health`

**Description:** Returns service status and connectivity to dependencies (database, Redis).

**Authentication:** None

**Request:** No body required

**Response:**
```json
{
  "status": "ok",
  "service": "TrustNaija API",
  "version": "0.1.0",
  "checks": {
    "database": "ok",
    "redis": "ok"
  }
}
```

**Status Values:**
- `"ok"` - All services operational
- `"degraded"` - One or more services down

---

## 2. Authentication APIs

### 2.1 `POST /auth/register`

**Description:** Step 1 of phone-based auth. Initiates OTP generation and sends it via SMS.

**Authentication:** None (public endpoint)

**Request Body:**
```json
{
  "phone": "08012345678",
  "username": "john_doe"  // optional
}
```

**Validation:**
- `phone`: 10-15 characters (required)
- `username`: Optional

**Response (200 OK):**
```json
{
  "message": "OTP sent to your phone number. Valid for 5 minutes.",
  "phone": "0801****5678"
}
```

**Errors:**
- `400 Bad Request` - Invalid phone format
- `500 Internal Server Error` - SMS sending failure

**Process:**
1. Normalizes Nigerian phone number to international format
2. Generates 6-digit OTP
3. Stores OTP in Redis (5-minute TTL)
4. Sends OTP via Termii SMS (production only)

---

### 2.2 `POST /auth/verify`

**Description:** Step 2 of phone auth. Verifies OTP and returns JWT token.

**Authentication:** None (public endpoint)

**Request Body:**
```json
{
  "phone": "08012345678",
  "otp": "123456"
}
```

**Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "role": "user",
  "is_trusted": false
}
```

**Errors:**
- `400 Bad Request` - Invalid phone format
- `401 Unauthorized` - OTP not found, expired, or invalid
- `500 Internal Server Error` - Database error

**Process:**
1. Validates phone format
2. Retrieves stored OTP from Redis
3. Performs constant-time comparison with provided OTP
4. If first login: creates new user record
5. Generates JWT token with 24-hour expiry
6. Returns token and user info

**Token Includes:**
- `sub` - User ID
- `role` - User role (user, moderator, admin)
- `exp` - Expiration timestamp
- `iat` - Issued at timestamp

---

### 2.3 `GET /me`

**Description:** Returns current authenticated user's profile.

**Authentication:** Required (Bearer token in `Authorization: Bearer <token>`)

**Request:** No body

**Response (200 OK):**
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "username": "john_doe",
  "role": "user",
  "is_trusted": false,
  "report_count": 5,
  "reputation_score": 45,
  "member_since": "2025-12-01T10:30:00Z"
}
```

**Errors:**
- `401 Unauthorized` - Missing or invalid token
- `404 Not Found` - User record deleted
- `500 Internal Server Error` - Database error

---

## 3. Lookup API

### `GET /lookup?identifier=<value>`

**Description:** Check risk score and report history for any phone, URL, wallet address, or app package.

**Authentication:** Optional (Bearer token) - anonymous lookups allowed

**Query Parameters:**
- `identifier` (required): Phone number, URL, wallet address, or app package name

**Examples:**
```
GET /lookup?identifier=08012345678
GET /lookup?identifier=https://fake-bank.com
GET /lookup?identifier=0xAbCdEf123456
GET /lookup?identifier=com.fake.bankapp
```

**Rate Limiting:** 30 requests/minute per IP

**Response (200 OK):**
```json
{
  "identifier": "08012345678",
  "identifier_type": "phone",
  "risk_score": 75,
  "risk_level": "HIGH",
  "report_count": 12,
  "first_seen_at": "2025-11-15T08:20:00Z",
  "last_seen_at": "2025-12-03T14:45:00Z",
  "tags": [
    "investment_scam",
    "ponzi_scheme",
    "high_value_targets"
  ],
  "is_known": true
}
```

**Risk Levels:**
- `"LOW"` - Score < 40 (medium_threshold)
- `"MEDIUM"` - Score >= 40 and < 70 (high_threshold)
- `"HIGH"` - Score >= 70 and < 90
- `"CRITICAL"` - Score >= 90

**Errors:**
- `400 Bad Request` - Empty or missing identifier
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Database error

**Process:**
1. Validates identifier is not empty
2. Checks rate limit (per IP)
3. Logs lookup in audit trail
4. Fetches identifier record and risk score
5. Returns risk level classification and report history

---

## 4. Report API

### `POST /report`

**Description:** Submit a new scam report. Works for authenticated users and anonymous reporters.

**Authentication:** Optional - both authenticated and anonymous reports accepted

**Request Body:**
```json
{
  "identifer": "08012345678",
  "identifier_type": "phone",
  "scam_type": "investment",
  "description": "Promised 100% returns on forex investment, then disappeared after I sent ₦500,000",
  "amount_lost_ngn": 500000,
  "reporter_phone": "09876543210"
}
```

**Field Validation:**
- `identifer`: 3-512 characters (required) [Note: typo in actual code - "identifer" not "identifier"]
- `identifier_type`: One of: `phone`, `url`, `wallet`, `app` (required)
- `scam_type`: One of:
  - `romance`
  - `investment`
  - `phishing`
  - `impersonation`
  - `online_shopping`
  - `job_offer`
  - `loan_fraud`
  - `sacco_fraud`
  - `other`
- `description`: Max 2000 characters (optional)
- `amount_lost_ngn`: Float in Nigerian Naira (optional, converted to kobo internally)
- `reporter_phone`: For anonymous/USSD reports (optional)

**Rate Limiting:** 5 reports/hour per user ID (or IP if anonymous)

**Response (200 OK):**
```json
{
  "report_id": "660e8400-e29b-41d4-a716-446655440001",
  "message": "Report submitted successfully",
  "risk_score": 65,
  "status": "pending"
}
```

**Status Values:**
- `"pending"` - Awaiting moderator review (default for untrusted reporters)
- `"approved"` - Auto-approved (for trusted reporters only)

**Errors:**
- `400 Bad Request` - Validation failure (missing required fields, invalid values)
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Database error

**Process:**
1. Validates all input fields
2. Checks rate limit (per user ID or IP)
3. Determines identifier type and normalizes value
4. Creates report record in database
5. Updates or creates identifier record
6. Recalculates risk score for identifier
7. For trusted reporters: auto-approves report
8. For others: places in moderation queue
9. Logs action in audit trail

---

## 5. SMS API

### `POST /send_sms`

**Description:** Send SMS notification via Termii. Restricted to API key authenticated clients.

**Authentication:** Required - `X-API-Key` header with admin API key

**Request Body:**
```json
{
  "to": "+2348012345678",
  "message": "Your TrustNaija alert: The number 08012345678 has been reported in 12 scam cases",
  "message_type": "scam_alert"
}
```

**Header:**
```
X-API-Key: your-admin-api-key
```

**Message Types:**
- `verification` / `otp` - OTP verification messages
- `scam_alert` - Fraud alerts
- `report_confirmation` - Report submission confirmation
- `report_status` - Report moderation status update
- `ussd_followup` - USSD session follow-up
- Default: `scam_alert` if omitted

**Response (200 OK):**
```json
{
  "success": true,
  "message_id": "termii-msg-1234567890"
}
```

**Errors:**
- `401 Unauthorized` - Missing or invalid API key
- `400 Bad Request` - Invalid phone number or empty message
- `500 Internal Server Error` - Termii API failure or database error

**Important:** Message content is NOT stored in database - only audit metadata is logged.

**Process:**
1. Validates API key
2. Normalizes phone number
3. Calls Termii API to send SMS
4. Stores message metadata in audit log (not the actual message)
5. Returns message ID from Termii

---

## 6. USSD API

### `POST /ussd`

**Description:** Handle incoming USSD session requests from gateway. USSD code: `*234*2#`

**Authentication:** None (USSD gateway authenticated at network level)

**Request Format:** Form-encoded (multipart/form-data or application/x-www-form-urlencoded)

**Request Body:**
```
session_id=unique-session-from-gateway
phone_number=234801234567
network_code=MTN
text=1
service_code=*234*2#
```

**Query Shortcut:** Users can dial `*234*2*PHONENUMBER#` for quick lookup

**Rate Limiting:** 10 USSD lookups per phone number per hour

**Response:**
```json
{
  "response_type": "CON",
  "message": "Welcome to TrustNaija!\nDial 1 to check a number\nDial 2 to submit a report"
}
```

**Response Types:**
- `"CON"` - Continue session (awaits further input)
- `"END"` - End session (terminates call)

**Message Constraints:**
- Maximum ~182 characters for most operators
- Must fit on 16-character display (some legacy phones)

**USSD Flow:**

**Step 1: Main Menu**
```
"Welcome to TrustNaija!
Dial 1 to check a number
Dial 2 to report a scam"
```
Response Type: `CON`

**Step 2: Enter Identifier (after pressing 1)**
```
"Enter the phone/URL/wallet to check:
(You will see risk level)"
```
Response Type: `CON`

**Step 3: Show Result (after entering identifier)**
```
"08012345678
Risk: HIGH (75/100)
Reports: 12
Dial 1 to report this
Dial 0 to go back"
```
Response Type: `CON`

**Step 4: Report Confirmation (after pressing 1)**
```
"Report this number as scam?
Dial 1 to confirm
Dial 0 to cancel"
```
Response Type: `CON`

**Step 5: Select Scam Type**
```
"Select scam type:
1=Romance 2=Investment
3=Phishing 4=Impersonation
5=Shopping 6=Other"
```
Response Type: `CON`

**Step 6: Report Submitted**
```
"Thank you! Your report has been
submitted for review.
-TrustNaija"
```
Response Type: `END`

**Errors:** On any error, returns:
```json
{
  "response_type": "END",
  "message": "Service temporarily unavailable. please try again later\nDial *234*2# anytime"
}
```

**Timeout:** Must respond within 15 seconds (gateway requirement)

**Session State:** Stored in Redis with 5-minute TTL

---

## 7. Admin/Moderator APIs

All admin endpoints require `Authorization: Bearer <token>` with moderator or admin role.

### 7.1 `GET /admin/reports/pending`

**Description:** Fetch all reports awaiting moderation, oldest first.

**Authentication:** Required - Moderator or Admin role

**Query Parameters:**
- `limit` (optional, default=20, max=100): Number of reports to return
- `offset` (optional, default=0): Pagination offset

**Examples:**
```
GET /admin/reports/pending?limit=50&offset=0
GET /admin/reports/pending?limit=20&offset=20
```

**Response (200 OK):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "identifier_id": "660e8400-e29b-41d4-a716-446655440001",
    "reporter_id": "770e8400-e29b-41d4-a716-446655440002",
    "reporter_hash": null,
    "scam_type": "investment",
    "description": "Promised guaranteed returns...",
    "amount_lost_ngn": 500000,
    "channel": "web",
    "status": "pending",
    "moderated_by": null,
    "moderated_at": null,
    "moderation_note": null,
    "created_at": "2025-12-01T10:30:00Z",
    "updated_at": "2025-12-01T10:30:00Z"
  },
  ...
]
```

**Errors:**
- `401 Unauthorized` - Missing/invalid token or insufficient role
- `500 Internal Server Error` - Database error

---

### 7.2 `POST /admin/reports/:id/moderate`

**Description:** Approve or reject a pending report. On approval, risk score is recomputed.

**Authentication:** Required - Moderator or Admin role

**URL Parameters:**
- `id` (required): UUID of the report to moderate

**Request Body:**
```json
{
  "action": "approve",
  "note": "Verified against multiple sources",
  "tags": [
    "investment_scam",
    "high_value_targets",
    "crypto_related"
  ]
}
```

**Action Values:**
- `"approve"` - Accept the report, update risk score
- `"reject"` - Dismiss the report as false/invalid

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Report 550e8400-e29b-41d4-a716-446655440000 has been approved."
}
```

**Errors:**
- `401 Unauthorized` - Missing/invalid token or insufficient role
- `404 Not Found` - Report not found
- `400 Bad Request` - Invalid action value
- `500 Internal Server Error` - Database error

**Process:**
1. Validates moderator authentication
2. Fetches report record
3. If action = "approve": 
   - Updates report status to "approved"
   - Recalculates risk score for identifier
   - Updates identifier tags
4. If action = "reject":
   - Updates report status to "rejected"
5. Records moderator ID and timestamp
6. Stores moderation note
7. Logs action in audit trail

---

### 7.3 `GET /admin/audit-logs`

**Description:** Fetch paginated audit logs with optional action filter. Requires admin role.

**Authentication:** Required - Admin role only

**Query Parameters:**
- `limit` (optional, default=50, max=200): Number of logs to return
- `offset` (optional, default=0): Pagination offset
- `action` (optional): Filter by action type (e.g., "lookup", "report_created", "report_moderated")

**Examples:**
```
GET /admin/audit-logs?limit=50&offset=0
GET /admin/audit-logs?action=report_created&limit=100
GET /admin/audit-logs?action=lookup&offset=50&limit=50
```

**Response (200 OK):**
```json
[
  {
    "id": "880e8400-e29b-41d4-a716-446655440003",
    "actor_id": "550e8400-e29b-41d4-a716-446655440000",
    "actor_hash": null,
    "action": "lookup",
    "resource_type": "identifier",
    "resource_id": "660e8400-e29b-41d4-a716-446655440001",
    "details": {
      "identifier": "08012345678",
      "identifier_type": "phone",
      "risk_score": 75
    },
    "ip_address": "192.168.1.100",
    "channel": "web",
    "created_at": "2025-12-03T14:45:00Z"
  },
  ...
]
```

**Errors:**
- `401 Unauthorized` - Missing/invalid token or insufficient role
- `500 Internal Server Error` - Database error

---

### 7.4 `GET /admin/identifiers/:id`

**Description:** Get full identifier details including all associated reports.

**Authentication:** Required - Moderator or Admin role

**URL Parameters:**
- `id` (required): UUID of the identifier

**Response (200 OK):**
```json
{
  "identifier": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "canonical_value": "08012345678",
    "identifier_type": "phone",
    "raw_hash": "a1b2c3d4e5f6...",
    "risk_score": 75,
    "report_count": 12,
    "first_seen_at": "2025-11-15T08:20:00Z",
    "last_seen_at": "2025-12-03T14:45:00Z",
    "tags": [
      "investment_scam",
      "ponzi_scheme",
      "high_value_targets"
    ],
    "metadata": {
      "last_lookup_risk": 75,
      "lookup_count": 250
    },
    "created_at": "2025-11-15T08:20:00Z",
    "updated_at": "2025-12-03T14:45:00Z"
  },
  "reports": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "identifier_id": "660e8400-e29b-41d4-a716-446655440001",
      "reporter_id": "770e8400-e29b-41d4-a716-446655440002",
      "scam_type": "investment",
      "description": "Promised guaranteed returns...",
      "amount_lost_ngn": 500000,
      "channel": "web",
      "status": "approved",
      "moderated_by": "880e8400-e29b-41d4-a716-446655440003",
      "moderated_at": "2025-12-01T11:20:00Z",
      "created_at": "2025-12-01T10:30:00Z"
    },
    ...
  ]
}
```

**Errors:**
- `401 Unauthorized` - Missing/invalid token or insufficient role
- `404 Not Found` - Identifier not found
- `500 Internal Server Error` - Database error

---

## Error Response Format

All errors follow this format:

```json
{
  "error": "BadRequest",
  "message": "Query parameter 'identifier' is required",
  "status": 400
}
```

**Common Error Codes:**
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Authentication required or failed
- `404 Not Found` - Resource not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error
- `502 Bad Gateway` - External API error (e.g., Termii)

---

## Authentication Methods

### 1. JWT Bearer Token (User Authentication)
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. API Key (Admin/Moderator APIs)
```
X-API-Key: your-admin-api-key
```

### 3. None (Public Endpoints)
- `/health`
- `/auth/register`
- `/auth/verify`
- `/lookup` (rate-limited by IP)
- `/report` (rate-limited by IP for anonymous)
- `/ussd` (gateway-authenticated)

---

## Rate Limiting

Implemented using Redis with configurable limits:

| Endpoint | Limit | Duration |
|----------|-------|----------|
| `/lookup` | 30 req/min | Per IP |
| `/report` | 5 req/hour | Per user ID or IP |
| `/ussd` | 10 lookups/hour | Per phone number |

**Rate Limit Response (429):**
```json
{
  "error": "TooManyRequests",
  "message": "Rate limit exceeded",
  "status": 429
}
```

---

## Data Types

### Phone Numbers
- Accepted formats: Nigerian numbers with or without country code
- Normalized to: `+234XXXXXXXXXX` format
- Hashed before storage for privacy

### Amounts (NGN)
- Input: Floating point in Nigerian Naira (₦)
- Storage: Converted to kobo (integer)
- Formula: `amount_ngn * 100 = amount_kobo`

### Timestamps
- Format: ISO 8601 (RFC 3339) - `YYYY-MM-DDTHH:MM:SSZ`
- Timezone: UTC always

### UUIDs
- Format: RFC 4122 version 4
- Example: `550e8400-e29b-41d4-a716-446655440000`

---

## Example cURL Requests

### Health Check
```bash
curl -X GET http://localhost:8080/health
```

### Register for OTP
```bash
curl -X POST http://localhost:8080/auth/register \
  -H "Content-Type: application/json" \
  -d '{"phone": "08012345678", "username": "john"}'
```

### Verify OTP
```bash
curl -X POST http://localhost:8080/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"phone": "08012345678", "otp": "123456"}'
```

### Lookup Number
```bash
curl -X GET "http://localhost:8080/lookup?identifier=08012345678" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Submit Report
```bash
curl -X POST http://localhost:8080/report \
  -H "Content-Type: application/json" \
  -d '{
    "identifer": "08012345678",
    "identifier_type": "phone",
    "scam_type": "investment",
    "description": "Fake forex broker",
    "amount_lost_ngn": 500000
  }'
```

### Send SMS (Admin Only)
```bash
curl -X POST http://localhost:8080/send_sms \
  -H "X-API-Key: your-admin-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+2348012345678",
    "message": "Your alert message",
    "message_type": "scam_alert"
  }'
```

### Submit USSD Request
```bash
curl -X POST http://localhost:8080/ussd \
  -d "session_id=12345&phone_number=234801234567&network_code=MTN&text=1&service_code=*234*2%23"
```

### Get Pending Reports
```bash
curl -X GET "http://localhost:8080/admin/reports/pending?limit=20" \
  -H "Authorization: Bearer YOUR_MODERATOR_TOKEN"
```
