// ============================================================
// routes/ussd.rs - POST /ussd handler
//
// This endpoint is called by the USSD gateway (Africa's Talking,
// Boku, or local telco USSD aggregator) for every user interaction.
//
// CRITICAL REQUIREMENTS:
//   - Must respond in < 15 seconds (most gateways time out at 15s)
//   - Response format must match gateway expectations
//   - Session state is managed in Redis (5-minute TTL)
//
// USSD Code: *234*2#
//   *234*2*PHONENUMBER# for quick account lookup shortcut
//
// Rate Limiting:
//   - 10 USSD lookups per phone number per hour
//   - Prevents lookup abuse by automated systems
// ============================================================

use axum::{extract::State, Form, Json};

use crate::{AppState, error::AppResult, middleware::rate_limit::{check_rate_limit, phone_rate_key}, models::ussd::{UssdRequest, UssdResponse}, services::ussd_service::UssdService, utils::{hash::{hash_identifier, mask_phone}, normalize::normalize_phone}};

/// POST /ussd
///
/// Handles incoming USSD session requests from the gateway.
/// Accepts both JSON and form-encoded bodies (different gateways
/// use different formats — form is most common for USSD).
pub async fn handle_ussd(
    State(state): State<AppState>,
    // Many USSD gateways send form-encoded data
    Form(req): Form<UssdRequest>,
) -> AppResult<Json<UssdResponse>> {
    tracing::debug!(
        "USSD request: session={}, phone={}, text='{}'",
        req.session_id,
        mask_phone(&req.phone_number),
        req.text
    );

    // Rate limiting per phone number
    let phone_hash = normalize_phone(&req.phone_number)
        .map(|p| hash_identifier(&p))
        .unwrap_or_else(|| hash_identifier(&req.phone_number));

    let mut redis = state.redis.clone();
    if let Err(_) = check_rate_limit(
        &mut redis, 
        &phone_rate_key(&phone_hash, "ussd"), 
        state.config.ussd_rate_limit_hour, 
        3600
    )
    .await
    {
        return Ok(Json(UssdResponse::end(
            "Too many requests. please wait and try again later. TrustNaija"
        )));
    }

    // Process USSD session through state machine
    let mut redis_conn = state.redis.clone();
    let response = UssdService::handle(
        &state.db, 
        &mut redis_conn, 
        req, 
        state.config.risk_score_high, 
        state.config.risk_score_medium
    )
    .await
    .unwrap_or_else(|e| {
        tracing::error!("USSD handler error: {:?}", e);
        UssdResponse::end(
            "Service temporarily unavailable. please try again later\nDial *234*2# anytime"
        )
    });

    Ok(Json(response))
}
