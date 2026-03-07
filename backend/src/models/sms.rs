// ============================================================
// models/sms.rs - SMS notification types and Termii API models
// ============================================================

use std::fmt::Display;
use serde::{Deserialize, Serialize};

/// Internal request to send an sms via termii
#[derive(Debug)]
pub struct SendSmsRequest {
    /// Reciepients phone number (will be normalized before sending)
    pub to: String,
    /// Message body (plain text)
    pub message: String,
    /// type of notification (for audit logging)
    pub message_type: SmsMessageType,
}

/// Categories of SMS messages TrustNaija sends
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SmsMessageType {
    OtpVerification,
    ScamAlert,
    ReportConfirmation,
    ReportStatusUpdate,
    UssdFollowUp,
    WhatsappMessages
}

impl Display for SmsMessageType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = serde_json::to_value(self).unwrap();
        write!(f, "{}", s.as_str().unwrap_or("other"))
    }
}


// ============================================================
// Termii API Structures
// Reference: https://developers.termii.com/messaging
// ============================================================

/// Termii outbound message payload (POST /sms/send)
#[derive(Debug, Serialize)]
pub struct TermiiSendRequest {
    pub to: String,
    pub from: String,
    pub sms: String,
    pub r#type: String,      // "plain"
    pub api_key: String,
    pub channel: String,     // "generic" | "dnd" | "whatsapp"
}

/// Termii OTP token request (POST /sms/otp/send)
#[derive(Debug, Serialize)]
pub struct TermiiOtpRequest {
    pub api_key: String,
    pub message_type: String,    // "NUMERIC"
    pub to: String,
    pub from: String,
    pub channel: String,
    pub pin_attempts: u8,
    pub pin_time_to_live: u8,    // Minutes
    pub pin_length: u8,
    pub pin_placeholder: String, // "<otp>" in message template
    pub message_text: String,    // "Your TrustNaija code is <otp>"
    pub pin_type: String,        // "NUMERIC"
}

/// Termii OTP verification request (POST /sms/otp/verify)
#[derive(Debug, Serialize)]
pub struct TermiiVerifyOtpRequest {
    pub api_key: String,
    pub pin_id: String,
    pub pin: String,
}

/// Termii OTP send response
#[derive(Debug, Deserialize)]
pub struct TermiiOtpResponse {
    pub pin_id: Option<String>,
    pub to: Option<String>,
    pub sms_status: Option<String>,
}

/// Termii verify OTP response
#[derive(Debug, Deserialize)]
pub struct TermiiVerifyResponse {
    pub pinId: Option<String>,
    pub verified: Option<bool>,
    pub msisdn: Option<String>,
}

/// Termii balance/status response
#[derive(Debug, Deserialize)]
pub struct TermiiBalanceResponse {
    pub user: Option<String>,
    pub balance: Option<f64>,
    pub currency: Option<String>,
}

/// External POST /send_sms handler request body
#[derive(Debug, Deserialize)]
pub struct SendSmsApiRequest {
    /// Recipient phone (E.164 format preferred: +2348012345678)
    pub to: String,
    /// The SMS message content
    pub message: String,
    /// Optional: message category for audit trail
    pub message_type: Option<String>,
}


/// TODO write the whatsapp message struct 
pub struct Whatsapp {
    
}