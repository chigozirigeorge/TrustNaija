// ============================================================
// Authentication handlers
// ============================================================

use axum::{extract::State, Json};
use serde_json::Value;
use redis::AsyncCommands;

use crate::{AppState, error::{AppError, AppResult}, middleware::auth::AuthUser, models::user::{AuthResponse, RegisterRequest, User, UserProfile, VerifyOtpRequest}, services::auth_service::AuthService, utils::hash::{hash_identifier, mask_phone}};

/// POST /auth/register
///
/// Step 1 of phone auth: provide phone number, receive OTP via WhatsApp.
///
/// Request: { "phone": "08012345678" }
/// Response: { "message": "OTP sent via WhatsApp" }
pub async fn initiate_registration(
    State(state): State<AppState>,
    Json(req): Json<RegisterRequest>,
) -> AppResult<Json<serde_json::Value>> {
    let mut redis = state.redis.clone();

    // Generate OTP and store in Redis
    let phone = AuthService::initiate_otp(&mut redis, &req.phone).await?;

    // Send OTP via WhatsApp
    let otp: Option<String> = redis.get(crate::routes::whatsapp::otp_key(&hash_identifier(&phone)))
        .await
        .ok();

    if let Some(otp_code) = otp {
        let whatsapp_phone = if phone.starts_with('+') {
            phone.clone()
        } else {
            format!("+{}", phone)
        };

        let otp_message = format!(
            "🔐 *TrustNaija OTP Code*\n\n\
             Your One-Time Password:\n\n\
             🔑 *{}*\n\n\
             Valid for 5 minutes.\n\n\
             Reply: VERIFY {} {}",
            otp_code, phone, otp_code
        );

        match crate::routes::whatsapp::send_whatsapp_message(&whatsapp_phone, &otp_message).await {
            Ok(_) => {
                tracing::info!("OTP sent via WhatsApp to {}", mask_phone(&phone));
            }
            Err(e) => {
                tracing::warn!("Failed to send OTP via WhatsApp: {}", e);
            }
        }
    }

    Ok(Json(serde_json::json!({
        "message": "📱 OTP sent to your WhatsApp registered account! Make sure you're using the WhatsApp number linked to this phone number.",
        "phone": crate::utils::hash::mask_phone(&req.phone),
        "warning": "⚠️ Please register with your WhatsApp-registered phone number for seamless authentication."
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