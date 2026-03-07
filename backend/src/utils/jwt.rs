// ============================================================
// JWT token creation and validation
// ============================================================

use chrono::Utc;
use jsonwebtoken::{
    decode, encode, DecodingKey, EncodingKey, Header, Validation
};
use uuid::Uuid;

use crate::{
    error::AppError,
    models::user::JwtClaims,
};

/// Generate a signed JWT for an auathenticated user
pub fn create_token(
    user_id: Uuid,
    role: &str,
    secret: &str,
    expiry_hours: u64,
) -> Result<String, AppError> {
    let now = Utc::now().timestamp() as usize;
    let exp = now + (expiry_hours as usize * 3600);

    let claims = JwtClaims {
        sub: user_id.to_string(),
        role: role.to_string(),
        exp,
        iat: now
    };

    encode(
        &Header::default(), 
        &claims, 
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|e| AppError::Internal(format!("JWT encode error: {}", e)))
}

/// Validate and decode a JWT token.
/// Returns the claims if valid, or an appropriate error.
pub fn validate_token(token: &str, secret: &str) -> Result<JwtClaims, AppError> {
    decode::<JwtClaims>(
        token, 
        &DecodingKey::from_secret(secret.as_bytes()), 
        &Validation::default()
    )
    .map(|data| data.claims)
    .map_err(|e| match e.kind() {
        jsonwebtoken::errors::ErrorKind::ExpiredSignature => {
            AppError::Unauthorized("Token has expired".into())
        }
        _ => AppError::Unauthorized(format!("Invalid token: {}", e)),
    })
}