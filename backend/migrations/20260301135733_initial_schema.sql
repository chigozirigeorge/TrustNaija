-- Add migration script here
-- TrustNaija Initial Database Schema
-- Migration: 001_initial_schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For fuzzzy search

-- ============================================================
-- USERS TABLE
-- Stores platform users (web/mobile). No raw PII stored.
-- ============================================================
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_hash      VARCHAR(64) UNIQUE NOT NULL,    -- SHA-256 of normalized phone
    email_hash      VARCHAR(64) UNIQUE,             -- SHA-256 of email (optional)
    username        VARCHAR(50) UNIQUE,
    role            VARCHAR(20) NOT NULL DEFAULT 'user',    -- user | moderator | admin
    is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
    is_trusted      BOOLEAN NOT NULL DEFAULT FALSE,     -- Trusted reporter badge
    report_count    INTEGER NOT NULL DEFAULT 0,
    reputation_score    INTEGER NOT NULL DEFAULT 100,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at    TIMESTAMPTZ
);

CREATE INDEX idx_users_phone_hash ON users(phone_hash);
CREATE INDEX idx_users_role ON users(role);

-- ============================================================
-- IDENTIFIERS TABLE
-- Normalized canonical forms of reported entities.
-- E.g. phone: +2348012345678, url: domain.com, wallet: BTC:addr
-- ============================================================
CREATE TABLE identifiers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canonical_value VARCHAR(512) NOT NULL UNIQUE, -- Normalized form
    identifier_type VARCHAR(20) NOT NULL,          -- phone | url | wallet | app
    raw_hash        VARCHAR(64) NOT NULL,           -- SHA-256 of original input
    risk_score      SMALLINT NOT NULL DEFAULT 0,   -- 0-100
    report_count    INTEGER NOT NULL DEFAULT 0,
    first_seen_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    tags            TEXT[] DEFAULT '{}',            -- e.g. ['phishing','romance_scam']
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_identifiers_canonical ON identifiers(canonical_value);
CREATE INDEX idx_identifiers_type ON identifiers(identifier_type);
CREATE INDEX idx_identifiers_risk_score ON identifiers(risk_score DESC);
CREATE INDEX idx_identifiers_tags ON identifiers USING GIN(tags);

-- ============================================================
-- REPORTS TABLE
-- Individual scam reports submitted by users.
-- ============================================================
CREATE TABLE reports (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identifier_id   UUID NOT NULL REFERENCES identifiers(id) ON DELETE CASCADE,
    reporter_id     UUID REFERENCES users(id) ON DELETE SET NULL, -- NULL = anonymous
    reporter_hash   VARCHAR(64),    -- Hashed phone of anonymous/USSD reporter
    scam_type       VARCHAR(50) NOT NULL, -- romance | investment | phishing | impersonation | other
    description     TEXT,
    amount_lost_ngn BIGINT,         -- Amount lost in kobo (to avoid float)
    channel         VARCHAR(20) NOT NULL DEFAULT 'web', -- web | mobile | ussd | api
    status          VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending | approved | rejected
    moderated_by    UUID REFERENCES users(id),
    moderated_at    TIMESTAMPTZ,
    moderation_note TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_identifier ON reports(identifier_id);
CREATE INDEX idx_reports_reporter ON reports(reporter_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_scam_type ON reports(scam_type);
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);

-- ============================================================
-- EVIDENCE TABLE
-- File evidence (receipts, screenshots) for reports.
-- File bytes are stored externally (object storage).
-- ============================================================
CREATE TABLE evidence (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id       UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    uploader_id     UUID REFERENCES users(id),
    file_key        VARCHAR(512) NOT NULL,  -- Object storage key
    file_type       VARCHAR(100) NOT NULL,  -- MIME type
    file_size_bytes INTEGER NOT NULL,
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_evidence_report ON evidence(report_id);

-- ============================================================
-- AUDIT LOGS TABLE
-- Immutable log of all moderation actions and sensitive queries.
-- ============================================================
CREATE TABLE audit_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id    UUID REFERENCES users(id),
    actor_hash  VARCHAR(64),                -- For anonymous USSD actors
    action      VARCHAR(100) NOT NULL,       -- e.g. report.approve, lookup.ussd
    entity_type VARCHAR(50),                 -- report | identifier | user
    entity_id   UUID,
    details     JSONB DEFAULT '{}',          -- Additional context
    ip_address  VARCHAR(45),                 -- IPv4/IPv6
    channel     VARCHAR(20) DEFAULT 'web',   -- web | ussd | api | admin
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ============================================================
-- USSD SESSIONS TABLE
-- Tracks active USSD session state (TTL managed via Redis too).
-- ============================================================
CREATE TABLE ussd_sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id      VARCHAR(255) UNIQUE NOT NULL, -- From USSD gateway
    phone_hash      VARCHAR(64) NOT NULL,
    current_step    VARCHAR(50) NOT NULL DEFAULT 'menu',
    session_data    JSONB DEFAULT '{}',  -- Collected inputs during session
    is_complete     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes')
);

CREATE INDEX idx_ussd_sessions_session_id ON ussd_sessions(session_id);
CREATE INDEX idx_ussd_sessions_expires ON ussd_sessions(expires_at);

-- ============================================================
-- SMS NOTIFICATIONS TABLE
-- Log of all outbound SMS messages (no content stored).
-- ============================================================
CREATE TABLE sms_notifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_hash  VARCHAR(64) NOT NULL,   -- Hashed phone number
    message_type    VARCHAR(50) NOT NULL,   -- verification | alert | report_update
    termii_message_id VARCHAR(255),         -- Termii's message ID for tracking
    status          VARCHAR(20) NOT NULL DEFAULT 'sent', -- sent | delivered | failed
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sms_recipient ON sms_notifications(recipient_hash);
CREATE INDEX idx_sms_created ON sms_notifications(created_at DESC);

-- ============================================================
-- RATE LIMIT TRACKING (supplemental to Redis)
-- ============================================================
CREATE TABLE rate_limit_violations (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ip_address  VARCHAR(45),
    phone_hash  VARCHAR(64),
    endpoint    VARCHAR(100) NOT NULL,
    violation_count INTEGER NOT NULL DEFAULT 1,
    window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Update timestamp trigger function
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_identifiers_updated_at BEFORE UPDATE ON identifiers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ussd_sessions_updated_at BEFORE UPDATE ON ussd_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
