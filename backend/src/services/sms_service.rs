// ============================================================
// services/sms_service.rs - Termii SMS integration
//
// Termii API docs: https://developers.termii.com/messaging
//
// This service handles:
//   1. Sending plain SMS notifications
//   2. Sending OTP tokens via Termii's OTP API
//   3. Verifying OTP tokens
//   4. Logging all SMS sends (without storing content)
// ============================================================

use reqwest::Client;
use uuid::Uuid;

use crate::config::AppConfig;
use crate::error::{AppError, AppResult};
use crate::models::sms::{
    SendSmsRequest, SmsMessageType, TermiiOtpRequest, TermiiOtpResponse,
    TermiiSendRequest, TermiiVerifyOtpRequest, TermiiVerifyResponse,
};
use crate::utils::normalize::normalize_phone;
use crate::utils::hash::hash_identifier;

pub struct SmsService {
    pub config: AppConfig,
    pub http: Client,
}

impl SmsService {
    pub fn new(config: AppConfig, http: Client) -> Self {
        Self { config, http }
    }

    /// Send a plain text SMS to a Nigerian phone number via Termii.
    ///
    /// Phone numbers are normalized to E.164 before sending.
    /// We do NOT store the message content — only the recipient hash
    /// and message type are logged for audit purposes.
    pub async fn send_sms(
        &self,
        db: &sqlx::PgPool,
        req: SendSmsRequest,
    ) -> AppResult<String> {
        // Normalize phone to E.164 format
        let to = normalize_phone(&req.to)
            .ok_or_else(|| AppError::BadRequest(format!("Invalid phone number: {}", req.to)))?;

        let recipient_hash = hash_identifier(&to);

        // Build Termii request
        let termii_req = TermiiSendRequest {
            to: to.clone(),
            from: self.config.termii_sender_id.clone(),
            sms: req.message.clone(),
            r#type: "plain".into(),
            api_key: self.config.termii_api_key.clone(),
            channel: self.config.termii_channel.clone(),
        };

        // Send to Termii API
        let resp = self
            .http
            .post(format!("{}/sms/send", self.config.termii_base_url))
            .json(&termii_req)
            .send()
            .await
            .map_err(|e| AppError::SmsService(format!("Termii request failed: {}", e)))?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(AppError::SmsService(format!(
                "Termii API error ({}): {}",
                status, body
            )));
        }

        let message_id = resp
            .json::<serde_json::Value>()
            .await
            .ok()
            .and_then(|v| v["message_id"].as_str().map(String::from))
            .unwrap_or_else(|| Uuid::new_v4().to_string());

        // Log SMS send (no message content stored)
        sqlx::query::<_>(
            r#"
            INSERT INTO sms_notifications (recipient_hash, message_type, termii_message_id, status)
            VALUES ($1, $2, $3, 'sent')
            "#
        )
        .bind(recipient_hash)
        .bind(req.message_type.to_string(),)
        .bind(message_id.clone())
        .execute(db)
        .await?;

        tracing::info!(
            "SMS sent via Termii to {} (type: {})",
            crate::utils::hash::mask_phone(&to),
            req.message_type
        );

        Ok(message_id)
    }

    /// Send an OTP via Termii's dedicated OTP token API and WhatsApp.
    /// Returns the pin_id needed for verification.
    /// 
    /// The OTP is sent via both SMS (Termii) and WhatsApp for better delivery.
    pub async fn send_otp(&self, phone: &str) -> AppResult<String> {
        let to = normalize_phone(phone)
            .ok_or_else(|| AppError::BadRequest("Invalid phone number".into()))?;

        let req = TermiiOtpRequest {
            api_key: self.config.termii_api_key.clone(),
            message_type: "NUMERIC".into(),
            to: to.clone(),
            from: self.config.termii_sender_id.clone(),
            channel: self.config.termii_channel.clone(),
            pin_attempts: 3,
            pin_time_to_live: 5, // 5 minutes
            pin_length: 6,
            pin_placeholder: "<otp>".into(),
            message_text: "Your TrustNaija code is <otp>. Valid 5 mins. Do NOT share.".into(),
            pin_type: "NUMERIC".into(),
        };

        let resp = self
            .http
            .post(format!("{}/sms/otp/send", self.config.termii_base_url))
            .json(&req)
            .send()
            .await
            .map_err(|e| AppError::SmsService(format!("Termii OTP request failed: {}", e)))?;

        if !resp.status().is_success() {
            return Err(AppError::SmsService("Failed to send OTP via Termii".into()));
        }

        let otp_resp = resp
            .json::<TermiiOtpResponse>()
            .await
            .map_err(|e| AppError::SmsService(format!("Failed to parse Termii OTP response: {}", e)))?;

        let pin_id = otp_resp
            .pin_id
            .ok_or_else(|| AppError::SmsService("Termii did not return pin_id".into()))?;

        // Also send OTP via WhatsApp for better delivery and user experience
        let otp_message = format!(
            "🔐 *TrustNaija OTP Code*\n\n\
             Your One-Time Password:\n\n\
             🔑 *{}*\n\n\
             Valid for 5 minutes.\n\n\
             Do not share this code with anyone.\n\n\
             Reply: VERIFY {} <OTP>",
            pin_id, to
        );

        // Send via WhatsApp (fire and forget - don't fail if WhatsApp send fails)
        let access_token = std::env::var("ACCESS_TOKEN").ok();
        let phone_number_id = std::env::var("PHONE_NUMBER_ID").ok();
        
        if let (Some(token), Some(phone_id)) = (access_token, phone_number_id) {
            let whatsapp_payload = serde_json::json!({
                "messaging_product": "whatsapp",
                "to": to,
                "type": "text",
                "text": {
                    "body": otp_message
                }
            });

            let _ = self
                .http
                .post(format!(
                    "https://graph.instagram.com/v18.0/{}/messages",
                    phone_id
                ))
                .header("Authorization", format!("Bearer {}", token))
                .json(&whatsapp_payload)
                .send()
                .await
                .map_err(|e| {
                    tracing::warn!("Failed to send OTP via WhatsApp: {}", e);
                    e
                });
        }

        Ok(pin_id)
    }

    /// Verify a Termii OTP token.
    /// Returns true if verified successfully.
    pub async fn verify_otp(&self, pin_id: &str, otp: &str) -> AppResult<bool> {
        let req = TermiiVerifyOtpRequest {
            api_key: self.config.termii_api_key.clone(),
            pin_id: pin_id.into(),
            pin: otp.into(),
        };

        let resp = self
            .http
            .post(format!("{}/sms/otp/verify", self.config.termii_base_url))
            .json(&req)
            .send()
            .await
            .map_err(|e| AppError::SmsService(format!("Termii verify request failed: {}", e)))?;

        if !resp.status().is_success() {
            return Ok(false);
        }

        let verify_resp = resp
            .json::<TermiiVerifyResponse>()
            .await
            .map_err(|_| AppError::SmsService("Failed to parse verify response".into()))?;

        Ok(verify_resp.verified.unwrap_or(false))
    }

    /// Send a scam alert to a phone number (e.g., after USSD lookup).
    /// Formats a risk-level message and sends via Termii.
    pub async fn send_scam_alert(
        &self,
        db: &sqlx::PgPool,
        phone: &str,
        identifier_type: &str,
        identifier_display: &str,
        risk_score: i16,
    ) -> AppResult<()> {
        let message = crate::utils::otp::ussd_alert_message(
            identifier_type,
            identifier_display,
            risk_score,
        );

        self.send_sms(
            db,
            SendSmsRequest {
                to: phone.into(),
                message,
                message_type: SmsMessageType::ScamAlert,
            },
        )
        .await?;

        Ok(())
    }
}
