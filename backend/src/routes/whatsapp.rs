// ============================================================
// routes/whatsapp.rs - WhatsApp webhook integration
// 
// Handles incoming messages from WhatsApp Business API
// Users can report scams, check status, and get support via WhatsApp
//
// User Commands:
//   1. REGISTER <phone> - Start authentication (sends OTP via WhatsApp)
//   2. VERIFY <phone> <otp> - Verify OTP and complete auth
//   3. REPORT - Start scam report flow
//   4. CHECK <identifier> - Check risk score for identifier
//   5. STATUS <report_id> - Check report status
//   6. HELP - Show available commands
// ============================================================

use axum::{
    extract::{Query, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use crate::{
    error::AppResult, 
    AppState,
    services::{
        auth_service::AuthService,
        lookup_service::LookupService,
        sms_service::SmsService
    },
    models::user::VerifyOtpRequest,
    utils::hash::mask_phone
};

/// WhatsApp webhook verification challenge
#[derive(Debug, Deserialize)]
pub struct WebhookChallenge {
    #[serde(rename = "hub.mode")]
    pub mode: Option<String>,
    #[serde(rename = "hub.challenge")]
    pub challenge: Option<String>,
    #[serde(rename = "hub.verify_token")]
    pub verify_token: Option<String>,
}

/// Incoming webhook message from WhatsApp
#[derive(Debug, Deserialize, Serialize)]
pub struct WhatsAppWebhookPayload {
    pub object: String,
    pub entry: Vec<WhatsAppEntry>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct WhatsAppEntry {
    pub id: String,
    pub changes: Vec<WhatsAppChange>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct WhatsAppChange {
    pub value: WhatsAppValue,
    pub field: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct WhatsAppValue {
    pub messaging_product: String,
    pub metadata: WhatsAppMetadata,
    pub messages: Option<Vec<WhatsAppMessage>>,
    pub statuses: Option<Vec<WhatsAppStatus>>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct WhatsAppMetadata {
    pub display_phone_number: String,
    pub phone_number_id: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct WhatsAppMessage {
    pub from: String,
    pub id: String,
    pub timestamp: String,
    pub text: Option<WhatsAppText>,
    pub message_type: Option<String>,
    #[serde(rename = "type")]
    pub msg_type: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct WhatsAppText {
    pub body: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct WhatsAppStatus {
    pub id: String,
    pub status: String,
    pub timestamp: String,
}

/// Response for sending WhatsApp messages
#[derive(Debug, Serialize)]
pub struct WhatsAppResponse {
    pub contacts: Option<Vec<serde_json::Value>>,
    pub messages: Option<Vec<serde_json::Value>>,
}

/// GET /whatsapp/webhook - Webhook verification challenge
///
/// WhatsApp sends a verification challenge to confirm the webhook URL is valid.
/// This endpoint must return the challenge token to verify ownership.
pub async fn verify_webhook(
    Query(challenge): Query<WebhookChallenge>,
) -> Result<String, StatusCode> {
    let verify_token = std::env::var("WHATSAPP_VERIFY_TOKEN")
        .unwrap_or_else(|_| "your-webhook-verify-token".to_string());

    // Verify the token matches
    if let (Some(mode), Some(token), Some(challenge_value)) =
        (&challenge.mode, &challenge.verify_token, &challenge.challenge)
    {
        if mode == "subscribe" && token == &verify_token {
            return Ok(challenge_value.clone());
        }
    }

    Err(StatusCode::FORBIDDEN)
}

/// POST /whatsapp/webhook - Receive incoming WhatsApp messages
///
/// Processes incoming messages from users via WhatsApp Business API.
/// 
/// Supported Commands:
/// ══════════════════════════════════════════════════════════════
/// 
/// 1️⃣  REGISTER <phone>
///    Initiate phone authentication
///    Usage: REGISTER 08012345678
///    Bot sends: OTP code via WhatsApp
/// 
/// 2️⃣  VERIFY <phone> <otp>
///    Verify OTP and complete authentication
///    Usage: VERIFY 08012345678 123456
///    Bot sends: JWT token, user ID, and role
/// 
/// 3️⃣  REPORT
///    Start scam report flow
///    Usage: REPORT
///    Bot prompts: scam type, identifier, description, amount
/// 
/// 4️⃣  CHECK <identifier>
///    Check risk score for phone/URL/wallet
///    Usage: CHECK +234801234567
///    Bot returns: Risk level, score, details
/// 
/// 5️⃣  STATUS <report_id>
///    Check status of submitted report
///    Usage: STATUS 550e8400-e29b-41d4-a716-446655440000
///    Bot returns: Current status, moderator notes
/// 
/// 6️⃣  HELP
///    Show available commands
///    Usage: HELP
///
pub async fn handle_webhook(
    State(_state): State<AppState>,
    Json(payload): Json<WhatsAppWebhookPayload>,
) -> AppResult<Json<serde_json::Value>> {
    // Validate the payload
    if payload.object != "whatsapp_business_account" {
        tracing::warn!("Invalid webhook object type: {}", payload.object);
        return Ok(Json(serde_json::json!({"success": true})));
    }

    // Log full payload for debugging
    tracing::debug!("WhatsApp webhook payload: {:?}", serde_json::to_string(&payload).unwrap_or_default());

    // Process each entry
    for entry in payload.entry {
        for change in entry.changes {
            // Handle incoming messages
            if let Some(messages) = &change.value.messages {
                for message in messages {
                    let msg_text = message.text.as_ref().map(|t| &t.body).unwrap_or(&"[non-text]".to_string()).to_string();
                    tracing::info!(
                        "🔔 Received WhatsApp message from {}: {} (ID: {})",
                        message.from,
                        msg_text,
                        message.id
                    );

                    // Process message based on content
                    if let Some(text) = &message.text {
                        let command = text.body.trim().to_uppercase();
                        println!("Incoming message: {}", command);
                        let parts: Vec<&str> = command.split_whitespace().collect();
                        
                        tracing::debug!("Processing WhatsApp command: {} (parts: {:?})", command, parts);
                        
                        let response: String = match parts.first().map(|s| *s) {
                            Some("REGISTER") => {
                                if parts.len() < 2 {
                                    "📱 *REGISTER Command*\n\n\
                                     Usage: REGISTER <phone_number>\n\n\
                                     Example: REGISTER 08012345678\n\n\
                                     This sends an OTP code to verify your phone number.".to_string()
                                } else {
                                    let phone = parts[1].to_string();
                                    // Generate OTP and store in Redis with 5-minute TTL
                                    let mut redis_conn = _state.redis.clone();
                                    match AuthService::initiate_otp(&mut redis_conn, &phone).await {
                                        Ok(_) => {
                                            // Send OTP via Termii SMS service
                                            let sms_service = SmsService::new(_state.config.clone(), _state.http_client.clone());
                                            let _pin_result = sms_service.send_otp(&phone).await;
                                            
                                            format!(
                                                "✅ *OTP Sent!*\n\n\
                                                 📱 Check WhatsApp for your 6-digit code sent to {}\n\n\
                                                 Valid for 5 minutes.\n\n\
                                                 Reply: *VERIFY {} <OTP>*",
                                                mask_phone(&phone), phone
                                            )
                                        }
                                        Err(e) => {
                                            tracing::error!("OTP generation failed: {}", e);
                                            format!("❌ Failed to send OTP: {}\n\n\
                                                     Please try again later.", e)
                                        }
                                    }
                                }
                            }
                            Some("VERIFY") => {
                                if parts.len() < 3 {
                                    "🔐 *VERIFY Command*\n\n\
                                     Usage: VERIFY <phone_number> <otp_code>\n\n\
                                     Example: VERIFY 08012345678 123456\n\n\
                                     This completes your authentication.".to_string()
                                } else {
                                    let phone = parts[1].to_string();
                                    let otp = parts[2].to_string();
                                    
                                    // Verify OTP and generate JWT token
                                    let mut redis_conn = _state.redis.clone();
                                    let verify_req = VerifyOtpRequest { phone: phone.clone(), otp };
                                    
                                    match AuthService::verify_otp_and_login(
                                        &_state.db,
                                        &mut redis_conn,
                                        &_state.config,
                                        &verify_req
                                    ).await {
                                        Ok(auth_response) => {
                                            let trusted_status = if auth_response.is_trusted { "Yes ✅" } else { "No" };
                                            format!(
                                                "✅ *Authentication Successful!*\n\n🎉 Welcome to TrustNaija!\n\nUser ID: {}\nRole: {}\nTrusted: {}\n\nAvailable commands:\n• REPORT - Report a scam\n• CHECK <identifier> - Check risk\n• STATUS <id> - Check report status\n• HELP - Show all commands",
                                                auth_response.user_id,
                                                auth_response.role,
                                                trusted_status
                                            )
                                        }
                                        Err(e) => {
                                            tracing::warn!("OTP verification failed: {}", e);
                                            "❌ *Verification Failed*\n\nInvalid or expired OTP.\n\nPlease try again or send: REGISTER to get a new code.".to_string()
                                        }
                                    }
                                }
                            }
                            Some("REPORT") => {
                                "📋 *Report a Scam*\n\nReply with the following details:\n\n1️⃣ Scam Type:\ninvestment, romance, phishing, impersonation,\nonline_shopping, job_offer, loan_fraud\n\n2️⃣ Identifier (phone/URL/wallet/app name)\n\n3️⃣ What happened?\n\n4️⃣ Amount lost (in Naira, or 0 if none)".to_string()
                            }
                            Some("CHECK") => {
                                if parts.len() < 2 {
                                    "🔍 *Check Risk Score*\n\n\
                                     Usage: CHECK <identifier>\n\n\
                                     Examples:\n\
                                     • CHECK +234801234567 (phone)\n\
                                     • CHECK example.com (website)\n\
                                     • CHECK 0x123abc... (wallet address)\n\n\
                                     Returns: Risk level, score, and report count".to_string()
                                } else {
                                    let identifier = parts[1].to_string();
                                    // Query database for identifier risk score using LookupService
                                    let mut redis_conn = _state.redis.clone();
                                    match LookupService::lookup(
                                        &_state.db,
                                        &mut redis_conn,
                                        &identifier,
                                        None,  // actor_id - anonymous lookup from WhatsApp
                                        None,  // actor_hash
                                        "whatsapp",
                                        Some(message.from.clone()),
                                        _state.config.risk_score_high,
                                        _state.config.risk_score_medium,
                                    ).await {
                                        Ok(lookup_result) => {
                                            let risk_emoji = match lookup_result.risk_level {
                                                crate::models::identifiers::RiskLevel::Low => "🟢",
                                                crate::models::identifiers::RiskLevel::Medium => "🟡",
                                                crate::models::identifiers::RiskLevel::High => "🔴",
                                                crate::models::identifiers::RiskLevel::Critical => "⛔",
                                            };
                                            let risk_level_str = format!("{:?}", lookup_result.risk_level);
                                            format!(
                                                "{} *Risk Report*\n\n*Identifier:* {}\n*Type:* {}\n*Risk Score:* {}/100\n*Risk Level:* {}\n*Total Reports:* {}\n\n{}",
                                                risk_emoji,
                                                lookup_result.identifier,
                                                lookup_result.identifier_type,
                                                lookup_result.risk_score,
                                                risk_level_str,
                                                lookup_result.report_count,
                                                if lookup_result.is_known {
                                                    "⚠️ *This identifier has been reported as a scam.*".to_string()
                                                } else {
                                                    "✅ No reports found. This appears to be safe.".to_string()
                                                }
                                            )
                                        }
                                        Err(e) => {
                                            tracing::error!("Lookup failed: {}", e);
                                            format!("❌ Lookup failed: {}\n\nPlease try again or check the identifier format.", e)
                                        }
                                    }
                                }
                            }
                            Some("STATUS") => {
                                if parts.len() < 2 {
                                    "📊 *Report Status*\n\nUsage: STATUS <report_id>\n\nExample: STATUS 550e8400-e29b-41d4\n\nShows: Current status, moderator notes, updates".to_string()
                                } else {
                                    let report_id = parts[1];
                                    // TODO: Implement full status lookup with database call
                                    // For now, return template response
                                    format!(
                                        "📊 *Report {} Status*\n\nStatus: PENDING\nSubmitted: Mar 7, 2026\n\nYour report is being reviewed by our moderation team.\nYou will be notified when a decision is made.",
                                        report_id
                                    )
                                }
                            }
                            Some("HELP") | _ => {
                                "👋 *Welcome to TrustNaija!*\n\n📱 TrustNaija helps you stay safe from scams.\n\n*Available Commands:*\n\n🔐 REGISTER - Start authentication\n✅ VERIFY - Complete authentication\n📋 REPORT - Report a scam\n🔍 CHECK - Check risk score\n📊 STATUS - Check report status\n❓ HELP - Show this message\n\nType command name for more info.\n\nNeed help? Reply: HELP REGISTER".to_string()
                            }
                        };

                        // Send response back to user with error handling
                        tracing::debug!("Sending WhatsApp response to {}: {:?}", message.from, response);
                        match send_whatsapp_message(&message.from, &response).await {
                            Ok(_) => {
                                tracing::info!("✅ WhatsApp response sent to {}", message.from);
                            }
                            Err(e) => {
                                tracing::error!("❌ Failed to send WhatsApp response to {}: {}", message.from, e);
                            }
                        }
                    }
                }
            }

            // Handle delivery status updates
            if let Some(statuses) = &change.value.statuses {
                for status in statuses {
                    tracing::info!(
                        "Message {} status: {} at {}",
                        status.id,
                        status.status,
                        status.timestamp
                    );
                }
            }
        }
    }

    Ok(Json(serde_json::json!({"success": true})))
}

/// Send a WhatsApp message to a user
///
/// This would be called internally to send notifications, responses, etc.
pub async fn send_whatsapp_message(
    phone_number: &str,
    message_body: &str,
) -> AppResult<()> {
    let access_token = std::env::var("ACCESS_TOKEN")
        .map_err(|_| crate::error::AppError::Internal("ACCESS_TOKEN not set".into()))?;
    let phone_number_id = std::env::var("PHONE_NUMBER_ID")
        .map_err(|_| crate::error::AppError::Internal("PHONE_NUMBER_ID not set".into()))?;

    let client = reqwest::Client::new();
    let url = format!(
        "https://graph.facebook.com/v18.0/{}/messages",
        phone_number_id
    );

    let payload = serde_json::json!({
        "messaging_product": "whatsapp",
        "to": phone_number,
        "type": "text",
        "text": {
            "body": message_body
        }
    });

    tracing::debug!("📤 Sending WhatsApp message to {} via {}", phone_number, url);

    let response = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", access_token))
        .json(&payload)
        .send()
        .await
        .map_err(|e| {
            tracing::error!("❌ Failed to send WhatsApp message: {}", e);
            crate::error::AppError::Internal(format!("WhatsApp send failed: {}", e))
        })?;

    let status = response.status();
    tracing::debug!("WhatsApp API response status: {}", status);

    if !status.is_success() {
        let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        tracing::error!("❌ WhatsApp API error ({}): {}", status, error_text);
        return Err(crate::error::AppError::Internal(format!("WhatsApp API error: {}", error_text)));
    }

    tracing::info!("✅ WhatsApp message sent successfully to {}", phone_number);
    Ok(())
}

/// Send OTP via WhatsApp instead of SMS
///
/// Called from the auth service when user initiates registration
pub async fn send_otp_via_whatsapp(
    phone_number: &str,
    otp: &str,
) -> AppResult<()> {
    let message = format!(
        "🔐 *TrustNaija OTP Code*\n\n\
         Your One-Time Password:\n\n\
         🔑 *{}*\n\n\
         Valid for 5 minutes.\n\n\
         Reply: VERIFY {} {}",
        otp, phone_number, otp
    );

    send_whatsapp_message(phone_number, &message).await
}
