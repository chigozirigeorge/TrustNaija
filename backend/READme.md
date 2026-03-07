# TrustNaija Backend

**Nigeria-first fraud intelligence platform** — report, verify, and get alerted about scammers.

---

## Architecture

```
                    ┌──────────────┐
  Web/Mobile ──────▶│  Axum API    │◀── Admin Panel
                    │  (Port 8080) │
  USSD Gateway ────▶│              │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
         PostgreSQL      Redis       Termii SMS
         (Reports,      (Cache,     (OTP, Alerts,
          Identifiers,   Sessions,   USSD follow-up)
          Audit Logs)    Rate Limits)
```

## Core Features

| Feature | Description |
|---|---|
| **Reporting** | Phone, URL, wallet, app package reporting |
| **Lookup API** | Risk score (0-100), report count, tags, first/last seen |
| **Normalization** | Auto-detects and canonicalizes all identifier types |
| **Risk Engine** | Pattern correlation with volume, recency, severity, and loss weighting |
| **USSD** | `*234*2#` for feature phone support — instant risk results on handset |
| **SMS (Termii)** | OTP verification, scam alerts, USSD follow-up |
| **Admin Panel** | Approve/reject reports, tag identifiers, view audit logs |
| **Audit Logs** | Immutable record of all moderation and sensitive queries |

---

## Quick Start

### Prerequisites
- Rust 1.82+
- Docker + Docker Compose
- Termii API key (https://termii.com)

### Development Setup

```bash
# Clone and navigate
git clone https://github.com/yourorg/trustnaija
cd trustnaija

# Copy env config
cp .env.example .env
# Edit .env with your Termii API key and secrets

# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Run database migrations
cargo run -- # Auto-runs migrations on startup

# Or run manually:
# sqlx migrate run
```

### Run the Server

```bash
cargo run
# Server starts on http://0.0.0.0:8080
```

### Run with Docker

```bash
docker-compose up --build
```

---

## API Reference

### Authentication

```bash
# Step 1: Request OTP
POST /auth/register
{ "phone": "08012345678" }

# Step 2: Verify OTP
POST /auth/verify
{ "phone": "08012345678", "otp": "123456" }
# Returns: { "token": "eyJ...", "user_id": "...", "role": "user" }
```

### Lookup

```bash
# Check a phone number
GET /lookup?identifier=08012345678

# Check a URL
GET /lookup?identifier=paystack-fakesite.com

# Check a wallet address
GET /lookup?identifier=0xAbCd1234...

# Check an app package
GET /lookup?identifier=com.fakebank.nigeria
```

**Response:**
```json
{
  "identifier": "+2348012345678",
  "identifier_type": "phone",
  "risk_score": 85,
  "risk_level": "HIGH",
  "report_count": 12,
  "first_seen_at": "2024-11-01T10:00:00Z",
  "last_seen_at": "2025-01-15T14:30:00Z",
  "tags": ["investment_scam", "romance_scam"],
  "is_known": true
}
```

### Report

```bash
POST /report
Authorization: Bearer <jwt>
{
  "identifier": "08012345678",
  "identifier_type": "phone",
  "scam_type": "investment",
  "description": "Promised 50% returns in 7 days. Ran off with 500k NGN.",
  "amount_lost_ngn": 500000
}
```

### USSD

```bash
# Gateway sends:
POST /ussd
Content-Type: application/x-www-form-urlencoded

session_id=sess_abc123&phone_number=%2B2348012345678&text=1%2A08012345678&service_code=%2A234%2A2%23
```

**Response:**
```json
{
  "response_type": "END",
  "message": "TrustNaija Result:\n08012345678\nRisk: HIGH RISK (85/100)\nReports: 12 report(s)\n\nGet SMS alert?\n1. Yes\n2. No"
}
```

### Send SMS (Admin)

```bash
POST /send_sms
X-API-Key: your-admin-api-key
{
  "to": "+2348012345678",
  "message": "TrustNaija Alert: The number you checked is HIGH RISK (85/100).",
  "message_type": "scam_alert"
}
```

---

## Risk Score Algorithm

| Component | Weight | Logic |
|---|---|---|
| Report volume | 0-40 pts | log₂(count) × 10, capped at 40 |
| Recency | 0-20 pts | 20 pts (<7 days), 15 (7-30d), 10 (30-90d), 5 (>90d) |
| Scam severity | 0-20 pts | investment=20, impersonation=18, phishing=15, romance=12 |
| Trusted reporters | 0-10 pts | 1 trusted=5, 2-4=7, 5+=10 |
| Financial loss | 0-10 pts | Based on total NGN lost across all reports |

**Risk levels:**
- `LOW` = 0-39
- `MEDIUM` = 40-69
- `HIGH` = 70-89
- `CRITICAL` = 90-100

---

## Security Design

- **No raw PII stored** — phone numbers, account numbers hashed with SHA-256
- **No SMS content stored** — only recipient hash, message type, and Termii message ID
- **Audit log** — all moderation actions and USSD queries are immutably recorded
- **Rate limiting** — per-IP and per-phone sliding window limits via Redis
- **JWT authentication** — short-lived tokens (24h default)
- **NDPR compliance** — data minimization by design

---

## Project Structure

```
trustnaija/
├── src/
│   ├── main.rs              # Entry point
│   ├── config.rs            # Environment config
│   ├── db.rs                # DB/Redis pool setup
│   ├── errors.rs            # Unified error types
│   ├── models/
│   │   ├── identifier.rs    # Identifier + lookup models
│   │   ├── report.rs        # Report models + DTOs
│   │   ├── user.rs          # User + JWT models
│   │   ├── audit.rs         # Audit log model
│   │   ├── ussd.rs          # USSD session models
│   │   └── sms.rs           # SMS + Termii models
│   ├── services/
│   │   ├── risk_engine.rs   # Risk score computation
│   │   ├── report_service.rs
│   │   ├── lookup_service.rs
│   │   ├── sms_service.rs   # Termii integration
│   │   ├── ussd_service.rs  # USSD state machine
│   │   ├── audit_service.rs
│   │   └── auth_service.rs  # Phone OTP auth
│   ├── routes/
│   │   ├── report.rs        # POST /report
│   │   ├── lookup.rs        # GET /lookup
│   │   ├── ussd.rs          # POST /ussd
│   │   ├── sms.rs           # POST /send_sms
│   │   ├── auth.rs          # POST /auth/*
│   │   ├── admin.rs         # Admin panel routes
│   │   └── health.rs        # GET /health
│   ├── middleware/
│   │   ├── auth.rs          # JWT extractors
│   │   └── rate_limit.rs    # Redis rate limiting
│   └── utils/
│       ├── normalize.rs     # Identifier normalization engine
│       ├── hash.rs          # SHA-256 PII hashing
│       ├── jwt.rs           # JWT creation/validation
│       └── otp.rs           # OTP generation + SMS templates
├── migrations/
│   └── 001_initial_schema.sql
├── Cargo.toml
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

---

## USSD Flow Diagram

```
User dials *234*2#
        │
        ▼
┌───────────────────────────┐
│ Welcome to TrustNaija     │
│ 1. Check a number/account │  ◀── User presses 1
│ 2. Report a scammer       │
│ 3. About TrustNaija       │
└───────────────────────────┘
        │ (1 selected)
        ▼
┌───────────────────────────┐
│ Enter the phone number,   │  ◀── User types 08012345678
│ account or URL to check:  │
└───────────────────────────┘
        │
        ▼
┌───────────────────────────┐
│ TrustNaija Result:        │
│ 08012345678               │
│ Risk: HIGH RISK (85/100)  │
│ Reports: 12 report(s)     │
│                           │
│ Get SMS alert?            │
│ 1. Yes  2. No             │  ◀── Press 1 for SMS details
└───────────────────────────┘
        │ (1 selected)
        ▼
┌───────────────────────────┐
│ Alert SMS will be sent    │
│ to your number shortly.   │ [END]
│ Thank you for using       │
│ TrustNaija!               │
└───────────────────────────┘
```

Shortcut: **`*234*2*08012345678#`** → Goes directly to result screen.

---

## Contributing

1. Fork the repo
2. Create feature branch: `git checkout -b feature/escrow-service`
3. Write tests for new functionality
4. Submit PR with description of changes

## License

MIT License — see LICENSE file.
