// ============================================================
// JWT authentication extractor
//
// Usage in handlers:
//   async fn my_handler(
//       State(state): State<AppState>,
//       AuthUser(claims): AuthUser,
//   ) -> ... { }
//
//   async fn admin_handler(
//       State(state): State<AppState>,
//       AdminUser(claims): AdminUser,  // Requires admin role
//   ) -> ... { }
// ============================================================

use axum::{
    async_trait,
    extract::FromRequestParts,
    http::{header::AUTHORIZATION, request::Parts, StatusCode},
};

use crate::{
    error::AppError,
    models::user::JwtClaims,
    utils::jwt::validate_token,
    AppState
};

/// Extractor for any authenticated user (any role)
pub struct AuthUser(pub JwtClaims);

#[async_trait]
impl FromRequestParts<AppState> for AuthUser {
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, Self::Rejection> {
        let token = extract_bearer_token(parts)?;
        let claims = validate_token(&token, &state.config.jwt_secret)?;
        Ok(AuthUser(claims))
    }
}

/// Helper: extract Bearer token from Authorization header
fn extract_bearer_token(parts: &Parts) -> Result<String, AppError> {
    let auth_header = parts
        .headers
        .get(AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .ok_or_else(|| AppError::Unauthorized("Authorization header required".into()))?;

    auth_header
        .strip_prefix("Bearer ")
        .map(String::from)
        .ok_or_else(|| AppError::Unauthorized("Authorization header must use Bearer scheme".into()))
}

/// Extractor that only allows moderator or admin roles
pub struct ModeratorUser(pub JwtClaims);

#[async_trait]
impl FromRequestParts<AppState> for ModeratorUser {
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, Self::Rejection> {
        let token = extract_bearer_token(parts)?;
        let claims = validate_token(&token, &state.config.jwt_secret)?;

        if claims.role != "moderator" && claims.role != "admin" {
            return Err(AppError::Forbidden(
                "Moderator or admin role required".into(),
            ));
        }

        Ok(ModeratorUser(claims))
    }
}

/// Extractor that only allows admin role
pub struct AdminUser(pub JwtClaims);

#[async_trait]
impl FromRequestParts<AppState> for AdminUser {
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, Self::Rejection> {
        let token = extract_bearer_token(&parts)?;
        let claims = validate_token(&token, &state.config.jwt_secret)?;

        if claims.role != "admin" {
            return Err(AppError::Forbidden("Admin role required".into()));
        }

        Ok(AdminUser(claims))
    }
}

/// Extractor for API key authentication (for admin panel or machine clients)
pub struct ApiKeyAuth;

#[async_trait]
impl FromRequestParts<AppState> for ApiKeyAuth {
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, Self::Rejection> {
        let api_key = parts
            .headers
            .get("X-API-Key")
            .and_then(|v| v.to_str().ok())
            .ok_or_else(|| AppError::Unauthorized("X-API-Key header required".into()))?;

        if api_key != state.config.admin_api_key {
            return Err(AppError::Forbidden("Invalid API key".into()));
        }

        Ok(ApiKeyAuth)
    }
}


/// Optional auth extractor — returns None for unauthenticated requests
/// (used for endpoints that support both auth and anonymous access)
pub struct OptionalAuthUser(pub Option<JwtClaims>);

#[async_trait]
impl FromRequestParts<AppState> for OptionalAuthUser {
    type Rejection = std::convert::Infallible;

    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, Self::Rejection> {
        let token_opt = parts
            .headers
            .get(AUTHORIZATION)
            .and_then(|v| v.to_str().ok())
            .and_then(|h| h.strip_prefix("Bearer ").map(String::from));

        let claims = token_opt.and_then(|token| {
            validate_token(&token, &state.config.jwt_secret).ok()
        });

        Ok(OptionalAuthUser(claims))
    }
}