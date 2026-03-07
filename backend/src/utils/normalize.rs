// ============================================================
// Normalization engine
//
// Converts raw user inputs into canonical forms for consistent
// storage and deduplication. E.g.:
//   "08012345678" -> "+2348012345678" (phone)
//   "Http://PAYSTACK.COM/pay" -> "paystack.com/pay" (URL)
//   " 0x1A2B..." -> "ETH:0x1a2b..." (wallet)
// ============================================================

use once_cell::sync::Lazy;
use regex::Regex;
use url::Url;
use crate::error::AppError;

/// Normalize result: canonical form + detected type
#[derive(Debug, Clone)]
pub struct NormalizationResult {
    pub canonical: String,
    pub identifier_type: String,
}

// Precompiled regexes for performance
static NIGERIAN_PHONE_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^(?:\+?234|0)(7[0-9]|8[0-9]|9[0-9])[0-9]{8}$").unwrap()
});
static ETH_WALLET_RE: Lazy<Regex> = Lazy::new(|| 
    Regex::new(r"^0x[0-9a-fA-F]{40}$").unwrap());
static BTC_WALLET_RE: Lazy<Regex> = Lazy::new(|| 
    Regex::new(r"^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$").unwrap());
static USDT_TRC20_RE: Lazy<Regex> = Lazy::new(|| 
    Regex::new(r"^T[a-zA-Z0-9]{33}$").unwrap());
static APP_PACKAGE_RE: Lazy<Regex> = Lazy::new(|| 
    Regex::new(r"^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$").unwrap());


/// Normalize a Nigerian phone number to E.164 international format.
/// Handles prefixes: 0, +234, 234.
/// Returns None if not a valid Nigerian phone number.
pub fn normalize_phone(raw: &str) -> Option<String> {
    // Strip spaces and dashes
    let clean: String = raw.chars().filter(|c| c.is_ascii_digit() || *c == '+').collect();

    if !NIGERIAN_PHONE_RE.is_match(&clean) {
        return None;
    }

    // convert to E.164: +234XXXXXXXX
    let digits: String = clean.chars().filter(|c| c.is_ascii_digit()).collect();
    let normalized = if digits.starts_with("234") {
        format!("+{}", digits)
    } else if digits.starts_with('0') {
        format!("+234{}", &digits[1..])
    } else {
        format!("+234{}", digits)
    };

    Some(normalized)
}

/// Normalize a URL to canonical form.
/// - Strips scheme (http/https) for storage, lowercases host
/// - Removes trailing slashes and query params (unless path-significant)
/// - Returns the canonical "domain.com/path" form.
pub fn normalize_url(raw: &str) -> Option<String> {
    // Try parsing as URL directly, or with https:// prefix
    let to_parse = if raw.starts_with("http://") || raw.starts_with("https://") {
        raw.to_string()
    } else if raw.contains('.') {
        format!("https://{}", raw)
    } else {
        return None;
    };

    let parsed = Url::parse(&to_parse).ok()?;
    let host = parsed.host_str()?.to_lowercase();

    // Must have a valid TLD
    if !host.contains('.') {
        return None;
    }

    // Build canonical: host + path (without query/fragment)
    let path = parsed.path().trim_end_matches("/");
    let canonical = if path.is_empty() {
        host
    } else {
        format!("{}{}", host, path)
    };

    Some(canonical)
}

/// Normalize a cryptocurrency wallet address.
/// Prefixes with network identifier: ETH:, BTC:, USDT_TRC20:
/// Returns None if not a recognized wallet format.
pub fn normalize_wallet(raw: &str) -> Option<String> {
    // Remove whitespaces
    let clean = raw.trim();

    // Ethereum/ Erc-20 (also BSC, Polygon addresses look identical)
    if ETH_WALLET_RE.is_match(clean) {
        return Some(format!("ETH:{}", clean.to_lowercase()));
    }

    // Bitcoin (Legacy + Bech32)
    if BTC_WALLET_RE.is_match(clean) {
        return Some(format!("BTC:{}", clean));
    }

    // USDT TRC20 (TRON)
    if USDT_TRC20_RE.is_match(clean) {
        return Some(format!("TRC20:{}", clean));
    }

    None
}

/// Normalize an Android app package name.
/// Converts to lowercase and validates format.
/// E.g. "com.fakebank.nigeria" -> "com.fakebank.nigeria"
pub fn normalize_app_package(raw: &str) -> Option<String> {
    let clean = raw.trim().to_lowercase();
    if APP_PACKAGE_RE.is_match(&clean) {
        Some(clean)
    } else {
        None
    }
}

/// Validate that a given type string matches a recognized identifier type.
pub fn validate_identifier_type(t: &str) -> bool {
    matches!(t, "phone" | "url" | "wallet" | "app")
}

/// Auto-detect and normalize an identifier from raw user input.
/// Returns the canonical form and its detected type.
pub fn normalize_identifier(raw: &str) -> Result<NormalizationResult, AppError> {
    let trimmed = raw.trim();

    if trimmed.is_empty() {
        return Err(AppError::BadRequest("Identifier cannot be empty".into()));
    }

    //try each type in order
    if let Some(phone) = normalize_phone(trimmed) {
        return Ok(NormalizationResult { 
            canonical: phone, 
            identifier_type: "phone".into(), 
        });
    }

    if let Some(url) = normalize_url(trimmed) {
        return Ok(NormalizationResult { 
            canonical: url, 
            identifier_type: "url".into(), 
        });
    }

    if let Some(wallet) = normalize_wallet(trimmed) {
        return Ok(NormalizationResult { 
            canonical: wallet, 
            identifier_type: "wallet".into(), 
        });
    }

    if let Some(app) = normalize_app_package(trimmed) {
        return Ok(NormalizationResult { 
            canonical: app, 
            identifier_type: "app".into(), 
        });
    }

    Err(AppError::BadRequest(format!(
        "Could not recognize identifier format: '{}'. Expected phone, URL, wallet, or app package.",
        &trimmed[..trimmed.len().min(50)]
    )))
}




#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normalize_phone_local() {
        assert_eq!(
            normalize_phone("08012345678"),
            Some("+2348012345678".into())
        );
    }

    #[test]
    fn test_normalize_phone_international() {
        assert_eq!(
            normalize_phone("+2348012345678"),
            Some("+2348012345678".into())
        );
    }

    #[test]
    fn test_normalize_url_strips_scheme() {
        let result = normalize_url("https://PAYSTACK.COM/pay/link123");
        assert_eq!(result, Some("paystack.com/pay/link123".into()));
    }

    #[test]
    fn test_normalize_url_without_scheme() {
        let result = normalize_url("fakebank.ng/transfer");
        assert_eq!(result, Some("fakebank.ng/transfer".into()));
    }

    #[test]
    fn test_normalize_eth_wallet() {
        let addr = "0xAbCd1234AbCd1234AbCd1234AbCd1234AbCd1234";
        let result = normalize_wallet(addr);
        assert!(result.unwrap().starts_with("ETH:0x"));
    }

    #[test]
    fn test_normalize_app_package() {
        assert_eq!(
            normalize_app_package("com.FakeBank.Nigeria"),
            Some("com.fakebank.nigeria".into())
        );
    }

    #[test]
    fn test_auto_detect_phone() {
        let result = normalize_identifier("08012345678").unwrap();
        assert_eq!(result.identifier_type, "phone");
    }

    #[test]
    fn test_auto_detect_url() {
        let result = normalize_identifier("https://scam-site.com").unwrap();
        assert_eq!(result.identifier_type, "url");
    }
}

