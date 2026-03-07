// ============================================================
// routes/whatsapp.rs - WhatsApp webhook integration
// 
// Handles incoming messages from WhatsApp Business API
// Users can report scams, check status, and get support via WhatsApp
// ============================================================

use axum::{
    extract::{Query, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use crate::{error::AppResult, AppState};

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
#[derive(Debug, Deserialize)]
pub struct WhatsAppWebhookPayload {
    pub object: String,
    pub entry: Vec<WhatsAppEntry>,
}

#[derive(Debug, Deserialize)]
pub struct WhatsAppEntry {
    pub id: String,
    pub changes: Vec<WhatsAppChange>,
}

#[derive(Debug, Deserialize)]
pub struct WhatsAppChange {
    pub value: WhatsAppValue,
    pub field: String,
}

#[derive(Debug, Deserialize)]
pub struct WhatsAppValue {
    pub messaging_product: String,
    pub metadata: WhatsAppMetadata,
    pub messages: Option<Vec<WhatsAppMessage>>,
    pub statuses: Option<Vec<WhatsAppStatus>>,
}

#[derive(Debug, Deserialize)]
pub struct WhatsAppMetadata {
    pub display_phone_number: String,
    pub phone_number_id: String,
}

#[derive(Debug, Deserialize)]
pub struct WhatsAppMessage {
    pub from: String,
    pub id: String,
    pub timestamp: String,
    pub text: Option<WhatsAppText>,
    pub message_type: Option<String>,
    #[serde(rename = "type")]
    pub msg_type: String,
}

#[derive(Debug, Deserialize)]
pub struct WhatsAppText {
    pub body: String,
}

#[derive(Debug, Deserialize)]
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
/// Supports commands like:
///   - "REPORT" - Start a scam report
///   - "CHECK <identifier>" - Check risk score
///   - "STATUS <report_id>" - Check report status
pub async fn handle_webhook(
    State(_state): State<AppState>,
    Json(payload): Json<WhatsAppWebhookPayload>,
) -> AppResult<Json<serde_json::Value>> {
    // Validate the payload
    if payload.object != "whatsapp_business_account" {
        return Ok(Json(serde_json::json!({"success": false})));
    }

    // Process each entry
    for entry in payload.entry {
        for change in entry.changes {
            // Handle incoming messages
            if let Some(messages) = &change.value.messages {
                for message in messages {
                    tracing::info!(
                        "Received WhatsApp message from {}: {} (ID: {})",
                        message.from,
                        message.text.as_ref().map(|t| &t.body).unwrap_or(&"[non-text]".to_string()),
                        message.id
                    );

                    // Process message based on content
                    if let Some(text) = &message.text {
                        let command = text.body.trim().to_uppercase();
                        let response = match command.split_whitespace().next() {
                            Some("REPORT") => {
                                "📋 *Report a Scam*\n\n\
                                Please tell us:\n\
                                1. What type of scam? (investment, romance, phishing, etc)\n\
                                2. What identifier? (phone, website, wallet address)\n\
                                3. Description of what happened\n\
                                4. Amount lost (if any)"
                            }
                            Some("CHECK") => {
                                "🔍 *Check Risk Score*\n\n\
                                Usage: CHECK <phone_number or identifier>\n\
                                Example: CHECK +234801234567"
                            }
                            Some("STATUS") => {
                                "📊 *Report Status*\n\n\
                                Usage: STATUS <report_id>\n\
                                To check the status of your submitted report"
                            }
                            Some("HELP") | _ => {
                                "👋 *Welcome to TrustNaija*\n\n\
                                Available commands:\n\
                                • REPORT - Report a scam\n\
                                • CHECK - Check risk score\n\
                                • STATUS - Check report status\n\
                                • HELP - Show this message"
                            }
                        };

                        // TODO: Send response back to user via WhatsApp API
                        tracing::debug!("Would send response: {}", response);
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
    let access_token = std::env::var("ACCESS_TOKEN")?;
    let phone_number_id = std::env::var("PHONE_NUMBER_ID")?;

    let client = reqwest::Client::new();
    let url = format!(
        "https://graph.instagram.com/v18.0/{}/messages",
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

    let response = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", access_token))
        .json(&payload)
        .send()
        .await?;

    if !response.status().is_success() {
        tracing::error!("Failed to send WhatsApp message: {:?}", response.text().await);
    }

    Ok(())
}
