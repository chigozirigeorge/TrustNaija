// ============================================================
// Deterministic hashing for PII data
//
// SECURITY NOTE:
// We never store raw phone numbers, account numbers, or other
// PII. Instead we store SHA-256 hashes. This allows us to:
//   1. Deduplicate reports without exposing raw data
//   2. Look up identifiers without decryption
//   3. Comply with Nigerian NDPR data minimization rules
//
// For identifiers that need to be displayable (e.g. in risk
// results), we store the normalized canonical form which has
// already been stripped of personal info.
// ============================================================

use sha2::{Digest, Sha256};

/// Hash a string value with SHA-256, returning a hex-encoded string.
/// Used for: phone numbers, account numbers, email addresses.
///
/// # Example
/// ```
/// let hash = hash_identifier("+2348012345678");
/// // -> "a3f2c1..." (64 hex chars)
/// ```
pub fn hash_identifier(value: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(value.as_bytes());
    hex::encode(hasher.finalize())
}

/// Hash with a fixed application-level salt to prevent rainbow table attacks.
/// Use this for user account-level PII (phone used for login).
///
/// NOTE: The salt should ideally come from config, but for deterministic
/// lookup it must be constant (not per-user). For passwords, use argon2 instead.
pub fn hash_pii(value: &str, salt: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(format!("{}{}", salt, value).as_bytes());
    hex::encode(hasher.finalize())
}

/// Generate a short display-safe identifier from a phone number.
/// E.g. "+2348012345678" -> "0801****5678"
/// Used when we need to show something recognizable to the reporter.
pub fn mask_phone(phone: &str) -> String {
    if phone.len() < 8 {
        return "****".to_string();
    }
    // Show last 4 digits, mask the rest after country code
    let visible_end = &phone[phone.len() - 4..];
    format!("****{}", visible_end)
}

/// Mask a URL for display -- show only the domain
pub fn mask_url(canonical_url: &str) -> String {
    // canonical is already "domain.com/path" -> just show the host
    canonical_url
        .split("/")
        .next()
        .unwrap_or(canonical_url)
        .to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hash_is_deterministic() {
        let h1 = hash_identifier("+2348012345678");
        let h2 = hash_identifier("+2348012345678");
        assert_eq!(h1, h2);
        assert_eq!(h1.len(), 64); // SHA-256 hex = 64 chars
    }

    #[test]
    fn test_hash_different_inputs() {
        let h1 = hash_identifier("+2348012345678");
        let h2 = hash_identifier("+2348087654321");
        assert_ne!(h1, h2);
    }

    #[test]
    fn test_mask_phone() {
        assert_eq!(mask_phone("+2348012345678"), "****5678");
    }

    #[test]
    fn test_mask_url() {
        assert_eq!(mask_url("paystack.com/payment/link"), "paystack.com");
    }
}

