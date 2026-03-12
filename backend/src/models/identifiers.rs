// Identifier (phone, URL, wallet, app) model

use std::fmt::Display;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Identifiers types suppoerted by TrustNaija
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type, PartialEq)]
#[sqlx(type_name = "VARCHAR")]
#[sqlx(rename_all = "lowercase")]
pub enum IdentifierType {
    #[serde(rename = "phone")]
    Phone,
    #[serde(rename = "url")]
    Url,
    #[serde(rename = "wallet")]
    Wallet,
    #[serde(rename = "app")]
    App,
    // Banking & Financial
    #[serde(rename = "bank_account")]
    BankAccount,
    #[serde(rename = "bank_name")]
    BankName,
    // Companies
    #[serde(rename = "company_name")]
    CompanyName,
    #[serde(rename = "company_website")]
    CompanyWebsite,
    // Social Media
    #[serde(rename = "twitter")]
    Twitter,
    #[serde(rename = "instagram")]
    Instagram,
    #[serde(rename = "tiktok")]
    TikTok,
    #[serde(rename = "facebook")]
    Facebook,
    #[serde(rename = "whatsapp")]
    WhatsApp,
    #[serde(rename = "telegram")]
    Telegram,
    #[serde(rename = "linkedin")]
    LinkedIn,
}

impl Display for IdentifierType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            IdentifierType::Phone => write!(f, "phone"),
            IdentifierType::Url => write!(f, "url"),
            IdentifierType::Wallet => write!(f, "wallet"),
            IdentifierType::App => write!(f, "app"),
            IdentifierType::BankAccount => write!(f, "bank_account"),
            IdentifierType::BankName => write!(f, "bank_name"),
            IdentifierType::CompanyName => write!(f, "company_name"),
            IdentifierType::CompanyWebsite => write!(f, "company_website"),
            IdentifierType::Twitter => write!(f, "twitter"),
            IdentifierType::Instagram => write!(f, "instagram"),
            IdentifierType::TikTok => write!(f, "tiktok"),
            IdentifierType::Facebook => write!(f, "facebook"),
            IdentifierType::WhatsApp => write!(f, "whatsapp"),
            IdentifierType::Telegram => write!(f, "telegram"),
            IdentifierType::LinkedIn => write!(f, "linkedin"),
        }
    }
}

/// Database row for the identifiers table
#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct Identifier {
    pub id: Uuid,
    pub canonical_value: String,
    pub identifier_type: String,
    pub raw_hash: String,
    pub risk_score: i16,
    pub report_count: i32,
    pub first_seen_at: DateTime<Utc>,
    pub last_seen_at: DateTime<Utc>,
    pub tags: Vec<String>,
    pub metadata: serde_json::Value,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl IdentifierType {
    /// Get the category of this identifier type
    pub fn category(&self) -> &'static str {
        match self {
            Self::Phone => "contact",
            Self::Url => "web",
            Self::Wallet => "crypto",
            Self::App => "app",
            Self::BankAccount | Self::BankName => "banking",
            Self::CompanyName | Self::CompanyWebsite => "company",
            Self::Twitter | Self::Instagram | Self::TikTok | Self::Facebook 
            | Self::WhatsApp | Self::Telegram | Self::LinkedIn => "social_media",
        }
    }

    /// Get human-readable label for this identifier type
    pub fn label(&self) -> &'static str {
        match self {
            Self::Phone => "Phone Number",
            Self::Url => "Website URL",
            Self::Wallet => "Crypto Wallet",
            Self::App => "App Package",
            Self::BankAccount => "Bank Account",
            Self::BankName => "Bank Name",
            Self::CompanyName => "Company Name",
            Self::CompanyWebsite => "Company Website",
            Self::Twitter => "Twitter Handle",
            Self::Instagram => "Instagram Account",
            Self::TikTok => "TikTok Account",
            Self::Facebook => "Facebook Account",
            Self::WhatsApp => "WhatsApp Business",
            Self::Telegram => "Telegram Channel",
            Self::LinkedIn => "LinkedIn Account",
        }
    }
}

/// Risk classification based on score threasholds
#[derive(Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "UPPERCASE")]
pub enum RiskLevel {
    Low,
    Medium,
    High,
    Critical,
}

impl RiskLevel {
    pub fn from_score(score: i16, high_threshold: u8, medium_threshold: u8) -> Self {
        match score {
            s if s >= 90 => RiskLevel::Critical,
            s if s >= high_threshold as i16 => RiskLevel::High,
            s if s >= medium_threshold as i16 => RiskLevel::Medium,
            _ => RiskLevel::Low
        }
    }
}

/// Public- facing lookup response Dto
#[derive(Debug, Serialize, Deserialize)]
pub struct LookupResponse {
    pub identifier: String,
    pub identifier_type: String,
    pub risk_score: i16,
    pub risk_level: RiskLevel,
    pub report_count: i32,
    pub first_seen_at: Option<DateTime<Utc>>,
    pub last_seen_at: Option<DateTime<Utc>>,
    pub tags: Vec<String>,
    pub is_known: bool,     // false = first lookup, no reports yet
}

/// Input for lookup requests
#[derive(Debug, Deserialize)]
pub struct LookupRequest {
    pub identifier: String
}
