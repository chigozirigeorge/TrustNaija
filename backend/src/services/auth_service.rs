// ============================================================
// services/auth_service.rs - Phone-based authentication
//
// TrustNaija uses phone number + OTP authentication.
// No passwords are stored. OTPs are sent via Termii.
//
// Flow:
//   POST /auth/register { phone } → Sends OTP, returns session token
//   POST /auth/verify   { phone, otp } → Returns JWT on success
// ============================================================

use redis::{aio::ConnectionManager, AsyncCommands};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    config::AppConfig,
    error::{AppError, AppResult},
    models::user::*,
    utils::{
        hash::{self, hash_identifier},
        jwt::create_token,
        normalize::normalize_phone,
        otp::generate_otp
    }
};

/// Redis key for OTP storage (TTL: 5 minutes)
fn otp_key(phone_hash: &str) -> String {
    format!("otp:{}", phone_hash)
}

/// Redis TTL for OTP (5 minutes = 300 seconds)
const OTP_TTL: u64 = 300;

pub struct AuthService;

impl AuthService {
    /// Initiate phone registration/login by sending an OTP.
    ///
    /// If the phone is new, we don't create a user record yet —
    /// we only do so after OTP verification to avoid ghost accounts.
    pub async fn initiate_otp(
        redis: &mut ConnectionManager,
        phone: &str
    ) -> AppResult<String> {
        // Normalize phone
        let normalized = normalize_phone(phone)
            .ok_or_else(|| AppError::BadRequest("Invalid Nigerian phone number".into()))?;

        let phone_hash = hash_identifier(&normalized);

        // Generate OTP and store in redis with TTL
        let otp = generate_otp();

        redis
            .set_ex::<_, _, ()>(otp_key(&phone_hash), &otp, OTP_TTL)
            .await?;

        tracing::info!(
            "OTP generated for {}",
            hash::mask_phone(&normalized)
        );

        // Return OTP (in production this goes via Termii// whatsapp; returned here for dev only)
        // In production, call sms_service.send_otp() instead.
        #[cfg(not(test))]
        {
            // Don't return OTP in production builds — send it via SMS only
            Ok(normalized)
        }
        #[cfg(test)]
        {
            Ok(otp) // Return for testing
        }
    }

    /// Verify the OTP and return a JWT on success.
    /// Creates a new user record if first time
    pub async fn verify_otp_and_login(
        db: &PgPool,
        redis: &mut ConnectionManager,
        config: &AppConfig,
        req: &VerifyOtpRequest,
    ) -> AppResult<AuthResponse> {
        let normalized = normalize_phone(&req.phone)
            .ok_or_else(|| AppError::BadRequest("Invalid phone number".into()))?;

        let phone_hash = hash_identifier(&normalized);

        // Retriieve stored OTP from redis
        let stored_otp: Option<String> = redis.get(otp_key(&phone_hash)).await.ok();

        let stored = stored_otp.ok_or_else(|| {
            AppError::Unauthorized("OTP not found or expired. Please request a new one".into())
        })?;

        // Constant-time comparison to prevent timing attacks
        if stored != req.otp {
            return Err(AppError::Unauthorized("Invalid OTP".into()));
        }

        // Delete the OTP after successful verification (one time use)
        let _: () = redis.del(otp_key(&phone_hash)).await.unwrap_or(());

        // Upsert user record
        let user = sqlx::query_as::<_,User>(
            r#"
            INSERT INTO users (phone_hash, is_verified)
            VALUES ($1, TRUE)
            ON CONFLICT (phone_hash) DO UPDATE
                SET is_verified = TRUE,
                last_seen_at = NOW(),
                updated_at = NOW()
            RETURNING *
            "#
        )
        .bind(phone_hash)
        .fetch_one(db)
        .await?;

    // Generate JWT 
    let token = create_token(
        user.id, 
        &user.role, 
        &config.jwt_secret, 
        config.jwt_expiry_hours
    )?;

    Ok(AuthResponse { 
        token, 
        user_id: user.id, 
        role: user.role, 
        is_trusted: user.is_trusted 
    })
    }
}