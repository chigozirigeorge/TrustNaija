use std::env::VarError;

/// Unified application error  types with HTTPS mapping

use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use thiserror::Error;

/// Top level application error enum.
/// Each variant maps to an appropraite HTTP status code
#[derive(Debug, Error)]
pub enum AppError {
    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Bad request: {0}")]
    BadRequest(String),

    #[error("Unauthorized: {0}")]
    Unauthorized(String),

    #[error("Forbidden: {0}")]
    Forbidden(String),

    #[error("Rate limit Exceeded")]
    RateLimitExceeded,

    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("Redis Error: {0}")]
    Redis(#[from] redis::RedisError),

    #[error("Sms service error: {0}")]
    SmsService(String),

    #[error("Validation Error: {0}")]
    Validation(String),

    #[error("Internal error: {0}")]
    Internal(String),
}

/// Implement IntoResponse so AppError can be returned from handlers directly
/// This produces consistent JSON Error responses
impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, code, message) = match  &self {
            AppError::NotFound(msg) => (StatusCode::NOT_FOUND, "NOT_FOUND", msg.clone()),
            AppError::BadRequest(msg) => (StatusCode::BAD_REQUEST, "Bad_REQUEST", msg.clone()),
            AppError::Unauthorized(msg) => (StatusCode::UNAUTHORIZED, "UNAUTHORIZED", msg.clone()),
            AppError::Forbidden(msg) => (StatusCode::FORBIDDEN, "FORBIDDEN", msg.clone()),
            AppError::RateLimitExceeded => (
                StatusCode::TOO_MANY_REQUESTS,
                "RATE_LIMIT_EXCEEDED",
                "Too many request. please slow down".into(),
            ),
            AppError::Validation(msg) => {
                (StatusCode::UNPROCESSABLE_ENTITY, "VALIDATION_ERROR", msg.clone())
            }
            AppError::Database(e) => {
                tracing::error!("Database error: {:?}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, "DATABASE_ERROR", "A database error occurred".into())
            }
            AppError::Redis(e) => {
                tracing::error!("Redis error: {:?}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, "CACHE_ERROR", "A caching error occurred".into())
            }
            AppError::SmsService(msg) => {
                tracing::error!("Sms error: {}", msg);
                (StatusCode::BAD_GATEWAY, "SMS_SERVICE_ERROR", msg.clone())
            }
            AppError::Internal(msg) => {
                tracing::error!("Internal error: {}", msg);
                (StatusCode::INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "An internal error occurred".into())
            }
        };

        let body = Json(json!({
            "error": {
                "code": code,
                "message": message
            }
        }));

        (status, body).into_response()
    }
}

impl From<VarError> for AppError {
    fn from(e: VarError) -> Self {
        AppError::Internal(format!("Internal Server error {}", e))
    }
}

impl From<reqwest::Error> for AppError {
    fn from(e: reqwest::Error) -> Self {
        AppError::Internal(format!("HTTP request failed: {}", e))
    }
}

/// Convenience type alias for handler results
pub type AppResult<T> = Result<T, AppError>;

