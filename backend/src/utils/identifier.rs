// ============================================================
// Identifier type detection and validation utilities
// ============================================================

use regex::Regex;
use once_cell::sync::Lazy;
use crate::models::identifiers::IdentifierType;

/// Nigerian phone number patterns
static NIGERIAN_PHONE_REGEX: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^(?:\+234|0)[0-9]{10}$").unwrap()
});

/// URL patterns (basic)
static URL_REGEX: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^https?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(/.*)?$").unwrap()
});

/// Crypto wallet patterns (Ethereum, Bitcoin)
static WALLET_REGEX: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^(0x[a-fA-F0-9]{40}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$").unwrap()
});

/// App package name pattern
static APP_PACKAGE_REGEX: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^[a-z][a-z0-9]*(\.[a-z0-9]+)*$").unwrap()
});

/// Bank account pattern (8-10 digits)
static BANK_ACCOUNT_REGEX: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^\d{8,10}$").unwrap()
});

/// Twitter handle pattern (@username or username)
static TWITTER_REGEX: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^@?[A-Za-z0-9_]{1,15}$").unwrap()
});

/// Instagram handle pattern
static INSTAGRAM_REGEX: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^[A-Za-z0-9_]{1,30}$").unwrap()
});

/// TikTok handle pattern
static TIKTOK_REGEX: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^@?[A-Za-z0-9._]{1,24}$").unwrap()
});

/// LinkedIn username pattern
static LINKEDIN_REGEX: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^[a-z0-9-]{3,100}$").unwrap()
});

/// Telegram handle pattern
static TELEGRAM_REGEX: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^@?[A-Za-z0-9_]{5,32}$").unwrap()
});

/// Nigerian banks list
const NIGERIAN_BANKS: &[&str] = &[
    "access bank", "accessbank",
    "first bank", "firstbank",
    "gtbank", "guarantee trust",
    "zenith bank", "zenithbank",
    "united bank", "uba",
    "stanbic", "standard chartered",
    "fidelity bank", "fidelitybank",
    "wema bank", "wemabank",
    "polaris bank", "polarisbank",
    "fcmb", "first city",
    "eco bank", "ecobank",
    "jaiz bank", "jaizbank",
    "keystone", "keystonebank",
    "heritage bank", "heritagebank",
    "union bank", "unionbank",
    "abn amro", "abnbank",
    "citi bank", "citibank",
    "hsbc", "hsbc bank",
    "sterling bank", "sterlingbank",
    "providus bank", "providusbank",
    "titan trust", "titan",
    "premium trust", "premium",
    "kuda", "kudabank",
    "opay", "opay bank",
    "monie point", "moniepoint",
    "palmpay", "palmpaypay",
    "flutterwave", "flutter",
    "paystack", "paystack",
];

/// Detect identifier type from input string
pub fn detect_identifier_type(input: &str) -> Option<IdentifierType> {
    let trimmed = input.trim();
    
    // Phone number
    if NIGERIAN_PHONE_REGEX.is_match(trimmed) {
        return Some(IdentifierType::Phone);
    }
    
    // URL
    if URL_REGEX.is_match(trimmed) {
        return Some(IdentifierType::Url);
    }
    
    // Crypto wallet
    if WALLET_REGEX.is_match(trimmed) {
        return Some(IdentifierType::Wallet);
    }
    
    // App package
    if APP_PACKAGE_REGEX.is_match(trimmed) && trimmed.contains('.') {
        return Some(IdentifierType::App);
    }
    
    // Bank account (numeric)
    if BANK_ACCOUNT_REGEX.is_match(trimmed) {
        return Some(IdentifierType::BankAccount);
    }
    
    let lower = trimmed.to_lowercase();
    
    // Check if it's a Nigerian bank name
    for bank in NIGERIAN_BANKS {
        if lower.contains(bank) {
            return Some(IdentifierType::BankName);
        }
    }
    
    // Twitter (@username or username)
    if trimmed.starts_with("@") && trimmed.len() > 1 {
        if TWITTER_REGEX.is_match(trimmed) {
            return Some(IdentifierType::Twitter);
        }
    }
    
    // Instagram handle
    if INSTAGRAM_REGEX.is_match(trimmed) && !trimmed.contains('/') && !trimmed.contains('@') {
        // Could be Instagram, but also could be other things
        // We'll be conservative and require explicit typing for social media
        // unless it's in a specific format
    }
    
    // Telegram handle (@username)
    if trimmed.starts_with("@") && TELEGRAM_REGEX.is_match(trimmed) {
        return Some(IdentifierType::Telegram);
    }
    
    // TikTok handle
    if trimmed.starts_with("@") && TIKTOK_REGEX.is_match(trimmed) {
        return Some(IdentifierType::TikTok);
    }
    
    // LinkedIn username
    if LINKEDIN_REGEX.is_match(trimmed) && trimmed.len() >= 3 {
        // Could be LinkedIn, but we'll require explicit typing
    }
    
    // If nothing matched, could be a company name or generic text
    // Return None to require explicit type specification
    None
}

/// Validate an identifier against a specific type
pub fn validate_identifier(input: &str, identifier_type: &IdentifierType) -> bool {
    let trimmed = input.trim();
    
    match identifier_type {
        IdentifierType::Phone => NIGERIAN_PHONE_REGEX.is_match(trimmed),
        IdentifierType::Url => URL_REGEX.is_match(trimmed),
        IdentifierType::Wallet => WALLET_REGEX.is_match(trimmed),
        IdentifierType::App => APP_PACKAGE_REGEX.is_match(trimmed) && trimmed.contains('.'),
        IdentifierType::BankAccount => BANK_ACCOUNT_REGEX.is_match(trimmed),
        IdentifierType::BankName => {
            let lower = trimmed.to_lowercase();
            NIGERIAN_BANKS.iter().any(|bank| lower.contains(bank)) || trimmed.len() >= 3
        },
        IdentifierType::CompanyName => trimmed.len() >= 2 && trimmed.len() <= 200,
        IdentifierType::CompanyWebsite => URL_REGEX.is_match(trimmed),
        IdentifierType::Twitter => {
            let handle = if trimmed.starts_with("@") { &trimmed[1..] } else { trimmed };
            TWITTER_REGEX.is_match(&format!("@{}", handle))
        },
        IdentifierType::Instagram => INSTAGRAM_REGEX.is_match(trimmed),
        IdentifierType::TikTok => TIKTOK_REGEX.is_match(trimmed),
        IdentifierType::Facebook => trimmed.len() >= 3 && trimmed.len() <= 100,
        IdentifierType::WhatsApp => {
            // WhatsApp can be a phone number or business account ID
            NIGERIAN_PHONE_REGEX.is_match(trimmed) || (trimmed.len() >= 6 && trimmed.len() <= 50)
        },
        IdentifierType::Telegram => TELEGRAM_REGEX.is_match(trimmed),
        IdentifierType::LinkedIn => LINKEDIN_REGEX.is_match(trimmed),
    }
}

/// Normalize identifier for consistent storage
pub fn normalize_identifier(input: &str, identifier_type: &IdentifierType) -> String {
    let trimmed = input.trim();
    
    match identifier_type {
        IdentifierType::Phone => {
            // Normalize to +234XXXXXXXXXX format
            let digits: String = trimmed.chars().filter(|c| c.is_numeric()).collect();
            if digits.starts_with("0") {
                format!("+234{}", &digits[1..])
            } else if digits.len() == 10 {
                format!("+234{}", digits)
            } else {
                format!("+{}", digits)
            }
        },
        IdentifierType::Url => trimmed.to_lowercase(),
        IdentifierType::Wallet => trimmed.to_lowercase(),
        IdentifierType::App => trimmed.to_lowercase(),
        IdentifierType::BankAccount => trimmed.to_string(),
        IdentifierType::BankName => trimmed.to_lowercase(),
        IdentifierType::CompanyName => trimmed.to_string(),
        IdentifierType::CompanyWebsite => trimmed.to_lowercase(),
        IdentifierType::Twitter => {
            let handle = if trimmed.starts_with("@") { &trimmed[1..] } else { trimmed };
            format!("@{}", handle.to_lowercase())
        },
        IdentifierType::Instagram => trimmed.to_lowercase(),
        IdentifierType::TikTok => {
            let handle = if trimmed.starts_with("@") { &trimmed[1..] } else { trimmed };
            format!("@{}", handle.to_lowercase())
        },
        IdentifierType::Facebook => trimmed.to_lowercase(),
        IdentifierType::WhatsApp => {
            if NIGERIAN_PHONE_REGEX.is_match(trimmed) {
                let digits: String = trimmed.chars().filter(|c| c.is_numeric()).collect();
                if digits.starts_with("0") {
                    format!("+234{}", &digits[1..])
                } else if digits.len() == 10 {
                    format!("+234{}", digits)
                } else {
                    format!("+{}", digits)
                }
            } else {
                trimmed.to_lowercase()
            }
        },
        IdentifierType::Telegram => {
            let handle = if trimmed.starts_with("@") { &trimmed[1..] } else { trimmed };
            format!("@{}", handle.to_lowercase())
        },
        IdentifierType::LinkedIn => trimmed.to_lowercase(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_phone() {
        assert_eq!(
            detect_identifier_type("08012345678"),
            Some(IdentifierType::Phone)
        );
        assert_eq!(
            detect_identifier_type("+2348012345678"),
            Some(IdentifierType::Phone)
        );
    }

    #[test]
    fn test_detect_twitter() {
        assert_eq!(
            detect_identifier_type("@naija_dev"),
            Some(IdentifierType::Twitter)
        );
    }

    #[test]
    fn test_detect_bank() {
        assert_eq!(
            detect_identifier_type("GTBank"),
            Some(IdentifierType::BankName)
        );
    }

    #[test]
    fn test_normalize_phone() {
        assert_eq!(
            normalize_identifier("08012345678", &IdentifierType::Phone),
            "+2348012345678"
        );
    }

    #[test]
    fn test_normalize_twitter() {
        assert_eq!(
            normalize_identifier("naija_dev", &IdentifierType::Twitter),
            "@naija_dev"
        );
    }
}
