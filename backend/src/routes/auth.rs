// ============================================================
// Authentication handlers
// ============================================================

use axum::{extract::State, Json};
use serde_json::Value;

use crate::{AppState, error::{AppError, AppResult}, middleware::auth::AuthUser, models::user::{AuthResponse, RegisterRequest, User, UserProfile, VerifyOtpRequest}, services::{auth_service::AuthService, sms_service::SmsService}, utils::hash::{hash_identifier, mask_phone}};

/// POST /auth/register
///
/// Step 1 of phone auth: provide phone number, receive OTP via SMS.
///
/// Request: { "phone": "08012345678" }
/// Response: { "message": "OTP sent to your phone" }
pub async fn initiate_registration(
    State(state): State<AppState>,
    Json(req): Json<RegisterRequest>,
) -> AppResult<Json<serde_json::Value>> {
    let mut redis = state.redis.clone();

    // Generate OTP and store in Redis
    let _phone = AuthService::initiate_otp(&mut redis, &req.phone).await?;

    // Send OTP via Termii in production
    if state.config.is_production() {
        let sms_service = SmsService::new(state.config.clone(), state.http_client.clone());
        let pin_id = sms_service.send_otp(&req.phone).await?;

        // Store pin_id in Redis for later verification
        let pin_key = format!("termii_pin:{}", crate::utils::hash::hash_identifier(&req.phone));
        let mut redis = state.redis.clone();
        redis::cmd("SETEX")
            .arg(&pin_key)
            .arg(300_u64) // 5 minute TTL
            .arg(&pin_id)
            .query_async::<()>(&mut redis)
            .await
            .ok();
    }

    Ok(Json(serde_json::json!({
        "message": "OTP sent to your phone number. Valid for 5 minutes.",
        "phone": crate::utils::hash::mask_phone(&req.phone)
    })))
}

/// POST /auth/verify
///
/// Step 2 of phone auth: verify OTP and receive JWT.
///
/// Request: { "phone": "08012345678", "otp": "123456" }
/// Response: { "token": "eyJ...", "user_id": "uuid", "role": "user" }
pub async fn verify_otp(
    State(state): State<AppState>,
    Json(req): Json<VerifyOtpRequest> 
) -> AppResult<Json<AuthResponse>> {
    let mut redis = state.redis.clone();

    let auth_response = AuthService::verify_otp_and_login(
        &state.db, &mut redis, &state.config, &req).await?;

    Ok(Json(auth_response))
}

/// GET /me
///
/// Returns the current authenticated user's profile.
pub async fn get_profile(
    State(state): State<AppState>,
    AuthUser(claims): AuthUser,
) -> AppResult<Json<UserProfile>> {
    let user_id: uuid::Uuid = claims
        .sub
        .parse()
        .map_err(|_| AppError::Internal("Invalid user ID in token".into()))?;

    let user = sqlx::query_as::<_, User>(
        "SELECT * FROM users WHERE id = $1"
    )
    .bind(user_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("User not found".into()))?;

    Ok(Json(UserProfile::from(user)))
}