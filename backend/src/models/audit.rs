/// Audit log model for moderation and USSD tracking

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use uuid::Uuid;

/// Database row for audit_logs table
#[derive(Debug, Deserialize, Serialize, sqlx::FromRow)]
pub struct AuditLog {
    pub id: Uuid,
    pub actor_id: Option<Uuid>,
    pub actor_hash: Option<String>,
    pub action: String,
    pub entity_type: Option<String>,
    pub entity_id: Option<Uuid>,
    pub details: Value,
    pub ip_address: Option<String>,
    pub channel: String,
    pub created_at: DateTime<Utc>
}

/// Response struct for API (converts UUID to string for JSON)
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AuditLogResponse {
    pub id: Uuid,
    pub actor_id: Option<Uuid>,
    pub actor_hash: Option<String>,
    pub action: String,
    pub entity_type: Option<String>,
    pub entity_id: Option<String>,  // String for JSON
    pub details: Value,
    pub ip_address: Option<String>,
    pub channel: String,
    pub created_at: DateTime<Utc>
}

impl From<AuditLog> for AuditLogResponse {
    fn from(log: AuditLog) -> Self {
        AuditLogResponse {
            id: log.id,
            actor_id: log.actor_id,
            actor_hash: log.actor_hash,
            action: log.action,
            entity_type: log.entity_type,
            entity_id: log.entity_id.map(|id| id.to_string()),
            details: log.details,
            ip_address: log.ip_address,
            channel: log.channel,
            created_at: log.created_at,
        }
    }
}

/// Known audit action constants - prevents typos accross codebase
pub struct AuditAction;

impl AuditAction {
    // Report actions
    pub const REPORT_CREATED: &'static str = "report.created";
    pub const REPORT_APPROVED: &'static str = "report.approved";
    pub const REPORT_REJECTED: &'static str = "report.rejected";

    // Lookup actions
    pub const LOOKUP_WEB: &'static str = "lookup.web";
    pub const LOOKUP_USSD: &'static str = "lookup.ussd";
    pub const LOOKUP_API: &'static str = "lookup.api";

    // User actions
    pub const USER_REGISTERED: &'static str = "user.registered";
    pub const USER_VERIFIED: &'static str = "user.verified";
    pub const USER_ROLE_CHANGED: &'static str = "user.role_changed";

    // USSD actions
    pub const USSD_SESSION_STARTED: &'static str = "ussd.session_started";
    pub const USSD_SESSION_COMPLETED: &'static str = "ussd.session_completed";

    // SMS actions
    pub const SMS_SENT: &'static str = "sms.sent";
}

/// Struct for creating audit log entries
#[derive(Debug, Serialize, Deserialize)]
pub struct CreateAuditLog {
    pub actor_id: Option<Uuid>,
    pub actor_hash: Option<String>,
    pub action: String,
    pub entity_type: Option<String>,
    pub entity_id: Option<Uuid>,
    pub details: Value,
    pub ip_address: Option<String>,
    pub channel: String
}
