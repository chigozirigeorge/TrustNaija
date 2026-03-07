use std::fmt;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

/// User roles for RBAC
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum UserRole {
    User,
    Moderator,
    Admin
}

impl fmt::Display for UserRole {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            UserRole::User => write!(f, "user"),
            UserRole::Moderator => write!(f, "moderator"),
            UserRole::Admin => write!(f, "admin"),
        }
    }
}

/// Database row for users table
#[derive(Debug, Clone, sqlx::FromRow)]
pub struct User {
    pub id: Uuid,
    pub phone_hash: String,
    pub email_hash: Option<String>,
    pub username: Option<String>,
    pub role: String,
    pub is_verified: bool,
    pub is_trusted: bool,
    pub report_count: i32,
    pub reputation_score: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub last_seen_at: Option<DateTime<Utc>>
}

/// JWT Claims Structure
#[derive(Debug, Serialize, Deserialize)]
pub struct JwtClaims {
    pub sub: String,    // User ID
    pub role: String,
    pub exp: usize,     // Expiry timestamp
    pub iat: usize,     // Issued at
}

/// Phone Registration/ Login request
#[derive(Debug, Deserialize, Validate)]
pub struct RegisterRequest {
    #[validate(length(min = 10, max = 15))]
    pub phone: String,
    pub username: Option<String>,
}

/// OTP verification request
#[derive(Debug, Deserialize)]
pub struct VerifyOtpRequest {
    pub phone: String,
    pub otp: String,
}

/// SUccessful Auth response
#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub token: String,
    pub user_id: Uuid,
    pub role: String,
    pub is_trusted: bool,
}

/// Public user profile (safe to return in API responses)
#[derive(Debug, Serialize)]
pub struct UserProfile {
    pub user_id: Uuid,
    pub username: Option<String>,
    pub role: String,
    pub is_trusted: bool,
    pub report_count: i32,
    pub reputation_score: i32,
    pub member_since: DateTime<Utc>
}

impl From<User> for UserProfile {
    fn from(u: User) -> Self {
       UserProfile { 
        user_id: u.id, 
        username: u.username, 
        role: u.role, 
        is_trusted: u.is_trusted, 
        report_count: u.report_count, 
        reputation_score: u.reputation_score, 
        member_since: u.created_at 
    } 
    }
}
