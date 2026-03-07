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
}

impl Display for IdentifierType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            IdentifierType::Phone => write!(f, "phone"),
            IdentifierType::Url => write!(f, "url"),
            IdentifierType::Wallet => write!(f, "wallet"),
            IdentifierType::App => write!(f, "app"),
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
