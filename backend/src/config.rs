use std::env;

/// Application configuration loaded from environment
use anyhow::{Context, Result};

/// Central application configuration
/// All values are loaded from the environment variables /.env file
#[derive(Debug, Clone)]
pub struct  AppConfig {
    // Server
    pub host: String,
    pub port: u16,
    pub environment: String,

    // Database
    pub database_url: String,
    pub database_max_connections: u32,

    // Redis
    pub redis_url: String,

    // JWT
    pub jwt_secret: String,
    pub jwt_expiry_hours: u64,

    // Termii SMS
    pub termii_api_key: String,
    pub termii_base_url: String,
    pub termii_sender_id: String,
    pub termii_channel: String,

    // Rate limiting
    pub rate_limit_rpm: u32,        // Request per minute (general)
    pub ussd_rate_limit_hour: u32,  // USSD lookups per phone per hour

    // Risk score threshhold
    pub risk_score_high: u8,    // >= this = HIGH risk
    pub risk_score_medium: u8,  // >= this = MEDIUM risk

    // Admin
    pub admin_api_key: String,
}


impl AppConfig {
/// Load configuration from environment variables.
/// Panics early with descriptive errors if required vars are missing.
    pub fn from_env() -> Result<Self> {
        Ok(AppConfig { 
            host: env::var("HOST").unwrap_or_else(|_| "0.0.0.0".into()), 
            port: env::var("PORT")
                .unwrap_or_else(|_| "8080".into())
                .parse()
                .context("PORT must be a valid u16")?, 
            environment: env::var("ENVIRONMENT").unwrap_or_else(|_| "development".into()), 
            database_url: env::var("DATABASE_URL").context("DATABASE_URL is required")?, 
            database_max_connections: env::var("DATABASE_MAX_CONNECTIONS")
                .unwrap_or_else(|_| "10".into())
                .parse()
                .context("DATABASE_MAX_CONNECTIONS must be a valid u32")?, 
            redis_url: env::var("REDIS_URL")
                .unwrap_or_else(|_| "redis://localhost:6379".into()), 
            jwt_secret: env::var("JWT_SECRET")
                .context("JWT_SECRET is required")?, 
            jwt_expiry_hours: env::var("JWT_EXPIRY_HOURS")
                .unwrap_or_else(|_| "24".into())
                .parse()
                .context("JWT_EXPIRY_HOURS must be a valid u64")?, 
            termii_api_key: std::env::var("TERMII_API_KEY").context("TERMII_API_KEY is required")?, 
            termii_base_url: std::env::var("TERMII_BASE_URL")
                .unwrap_or_else(|_| "https://api.ng.termii.com/api".into()), 
            termii_sender_id: std::env::var("TERMII_SENDER_ID")
                .unwrap_or_else(|_| "TrustNaija".into()), 
            termii_channel: std::env::var("TERMII_CHANNEL")
                .unwrap_or_else(|_| "generic".into()), 
            rate_limit_rpm: std::env::var("RATE_LIMIT_REQUESTS_PER_MINUTE")
                .unwrap_or_else(|_| "30".into())
                .parse()
                .unwrap_or(30), 
            ussd_rate_limit_hour: std::env::var("USSD_RATE_LIMIT_PER_HOUR")
                .unwrap_or_else(|_| "10".into())
                .parse()
                .unwrap_or(10), 
            risk_score_high: std::env::var("RISK_SCORE_HIGH_THRESHOLD")
                .unwrap_or_else(|_| "70".into())
                .parse()
                .unwrap_or(70), 
            risk_score_medium: std::env::var("RISK_SCORE_MEDIUM_THRESHOLD")
                .unwrap_or_else(|_| "40".into())
                .parse()
                .unwrap_or(40), 
            admin_api_key: std::env::var("ADMIN_API_KEY")
                .context("ADMIN_API_KEY is required")? 
        })
    }

    /// Returns true if running in production environmwent
    pub fn is_production(&self) -> bool {
        self.environment == "production"
    }
}
