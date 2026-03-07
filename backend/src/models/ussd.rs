// ============================================================
// models/ussd.rs - USSD session model and request/response types
// ============================================================

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use uuid::Uuid;

/// Incoming USSD request from the gateway (e.g., Africa's Talking, Boku).
/// TrustNaija USSD code: *234*2*IDENTIFIER#
#[derive(Debug, Deserialize)]
pub struct UssdRequest {
    /// Unique session ID from the USSD gateway
    pub session_id: String,
    /// Callers phone number in the international format
    pub phone_number: String,
    /// Network code (MTN, AIRTEL, GLO, 9MOBILE)
    pub network_code: Option<String>,
    /// The full ussd text input so far, e.g "1*2348012345678"
    pub text: String,
    /// Service code dialed, e.g "*234*2#"
    pub service_code: String,
}


/// USSD response back to the gateway
#[derive(Debug, Serialize)]
pub struct UssdResponse {
    /// "CON" = continue (more input expected), "END" = terminate session
    pub response_type: String,
    /// Text to display on the caller's handset (max ~182 chars for most operators)
    pub message: String,
}

impl UssdResponse {
    /// Create a "continue" response — awaits further user input
    pub fn cont(message: impl Into<String>) -> Self {
        UssdResponse {
            response_type: "CON".into(),
            message: message.into(),
        }
    }

    /// Create an "end" response — terminates the USSD session
    pub fn end(message: impl Into<String>) -> Self {
        UssdResponse {
            response_type: "END".into(),
            message: message.into(),
        }
    }
}

/// USSD menu navigation steps
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum UssdStep {
    MainMenu,          // Show main options
    EnterIdentifier,   // Ask user to type the number/URL to check
    ShowResult,        // Show risk result
    ReportConfirm,     // Confirm they want to report
    ReportScamType,    // Select scam type
    ReportDone,        // Report submitted
}

impl Default for UssdStep {
    fn default() -> Self {
        UssdStep::MainMenu
    }
}

/// Database row for ussd_sessions table
#[derive(Debug, Clone, sqlx::FromRow)]
pub struct UssdSession {
    pub id: Uuid,
    pub session_id: String,
    pub phone_hash: String,
    pub current_step: String,
    pub session_data: Value,
    pub is_complete: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub expires_at: DateTime<Utc>,
}

/// USSD scam type menu options
pub const USSD_SCAM_TYPES: &[(&str, &str)] = &[
    ("1", "romance"),
    ("2", "investment"),
    ("3", "phishing"),
    ("4", "impersonation"),
    ("5", "online_shopping"),
    ("6", "other"),
];
