// ============================================================
// routes/sms.rs - POST /send_sms handler
//
// This endpoint is restricted to API key authenticated clients
// (admin panel, internal services). It proxies SMS sends via Termii.
// ============================================================

use axum::{extract::State, Json};

use crate::error::AppResult;
use crate::middleware::auth::ApiKeyAuth;
use crate::models::sms::{SendSmsApiRequest, SendSmsRequest, SmsMessageType};
use crate::services::sms_service::SmsService;
use crate::AppState;

/// POST /send_sms
///
/// Send an SMS notification via Termii. Requires API key auth.
/// Message content is NOT stored — only audit metadata is logged.
///
/// Request body:
/// ```json
/// {
///   "to": "+2348012345678",
///   "message": "Your TrustNaija alert: ...",
///   "message_type": "scam_alert"  // optional
/// }
/// ```
pub async fn send_sms(
    State(state): State<AppState>,
    _auth: ApiKeyAuth, // Validates X-API-Key header
    Json(req): Json<SendSmsApiRequest>,
) -> AppResult<Json<serde_json::Value>> {
    let sms_service = SmsService::new(state.config.clone(), state.http_client.clone());

    let message_type = req
        .message_type
        .as_deref()
        .and_then(|t| match t {
            "verification" | "otp" => Some(SmsMessageType::OtpVerification),
            "scam_alert" => Some(SmsMessageType::ScamAlert),
            "report_confirmation" => Some(SmsMessageType::ReportConfirmation),
            "report_status" => Some(SmsMessageType::ReportStatusUpdate),
            "ussd_followup" => Some(SmsMessageType::UssdFollowUp),
            _ => None,
        })
        .unwrap_or(SmsMessageType::ScamAlert);

    let message_id = sms_service
        .send_sms(
            &state.db,
            SendSmsRequest {
                to: req.to,
                message: req.message,
                message_type,
            },
        )
        .await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "message_id": message_id
    })))
}
