// ============================================================
// Scam report model and DTOs
// ============================================================

use std::fmt::Display;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

/// Scam type recognized by TrustNaija
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ScamType {
    Romance,
    Investment,         // Ponzi, Forex fraud, etc
    Phishing,           
    Impersonation,      // EFCC, Police, bank_staff
    OnlineShopping,
    JobOffer,
    LoanFraud,
    SaccoFraud,
    Other
}

impl Display for ScamType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = serde_json::to_value(self).unwrap();
        write!(f, "{}", s.as_str().unwrap_or("other"))
    }
}

/// Channel from which a report was submitted
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ReportChannel {
    Web,
    Mobile,
    Ussd,
    Api,
}

impl Display for ReportChannel {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = serde_json::to_value(self).unwrap();
        write!(f, "{}", s.as_str().unwrap_or("web"))
    }
}

/// Database row for reports table
#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct Report {
    pub id: Uuid,
    pub identifier_id: Uuid,
    pub reporter_id: Option<Uuid>,
    pub reporter_hash: Option<String>,
    pub scam_type: String,
    pub description: Option<String>,
    pub amount_lost_ngn: Option<i64>,     // Stored in kobo
    pub channel: String,
    pub status: String,
    pub moderated_by: Option<Uuid>,
    pub moderated_at: Option<DateTime<Utc>>,
    pub moderation_note: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    #[sqlx(default)]
    pub risk_contribution: i16,
}

/// Request body for POST/ report
#[derive(Debug, Deserialize, Validate)]
pub struct CreateReportRequest {
/// The phone number, Url, wallet_addresss, or app package name being reported
#[validate(length(min = 3, max = 512))]
pub identifer: String,

/// One of: phone, url, wallet, app, bank_account, bank_name, company_name, etc
pub identifier_type: String,

/// Type of scam
pub scam_type: String,

/// Optional free-text description of the scam
#[validate(length(max = 2000))]
pub description: Option<String>,

/// Amount lost in naira(will be converted to kobo internally)
pub amount_lost_ngn: Option<f64>,

/// Reporters phone number (for anonymous/ Ussd reports, hashed before storage)
pub reporter_phone: Option<String>,

/// Dependent field: Bank name when reporting bank_account
#[validate(length(min = 2, max = 100))]
pub bank_name: Option<String>,

/// Dependent field: Company website when reporting company_name
#[validate(length(min = 5, max = 512))]
pub company_website: Option<String>,
}

/// Response for report creation
#[derive(Debug, Serialize)]
pub struct CreateReportResponse {
    pub report_id: Uuid,
    pub message: String,
    pub risk_score: i16,
    pub status: String, // Pending | approved (auto- approved if trusted reporter)
}

/// Admin request to moderate a report
#[derive(Debug, Deserialize, Validate)]
pub struct ModerateReportRequest {
    pub action: String, // approve | reject
    #[validate(length(max = 500))]
    pub note: Option<String>,
    pub tags: Option<Vec<String>>
}

/// Moderation status values
pub const STATUS_PENDING: &str = "pending";
pub const STATUS_APPROVED: &str = "approved";
pub const STATUS_REJECTED: &str = "rejected";

/// Report response for admin endpoints (includes risk score)
#[derive(Debug, Clone, Serialize)]
pub struct AdminReportResponse {
    pub id: Uuid,
    pub identifier_id: Uuid,
    pub scam_type: String,
    pub description: Option<String>,
    pub amount_lost_ngn: Option<i64>,
    pub channel: String,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub risk_score: i16,  // Current risk score of the identifier
}

impl AdminReportResponse {
    /// Convert a Report and associated identifier risk score into an admin response
    pub fn from_report(report: Report, risk_score: i16) -> Self {
        Self {
            id: report.id,
            identifier_id: report.identifier_id,
            scam_type: report.scam_type,
            description: report.description,
            amount_lost_ngn: report.amount_lost_ngn,
            channel: report.channel,
            status: report.status,
            created_at: report.created_at,
            risk_score,
        }
    }
}