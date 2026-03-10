// ============================================================
// services/meta_service.rs - Meta endpoint business logic
//
// Handles meta tag generation, crawler detection, rate limiting
// Provides security-hardened responses for social media sharing
// ============================================================

use std::collections::HashMap;
use crate::models::identifiers::RiskLevel;

/// Crawler detection patterns - comprehensive list of known crawlers and bots
pub struct CrawlerDetector;

impl CrawlerDetector {
    /// Common crawler and bot user agent patterns
    const CRAWLER_PATTERNS: &'static [&'static str] = &[
        // Social media crawlers
        "facebookexternalhit",
        "twitterbot",
        "whatsapp",
        "telegrambot",
        "linkedinbot",
        "pinterestbot",
        "slurp", // Yahoo
        
        // Search engine crawlers
        "googlebot",
        "bingbot",
        "yandex",
        "baiduspider",
        "duckduckbot",
        "sogou",
        "qwant",
        
        // Other crawlers
        "ia_archiver", // Archive.org
        "curl",
        "wget",
        "python",
        "scrapy",
        "nmap",
        "nessus",
        "nikto",
        "masscan",
        
        // Generic patterns
        "bot",
        "crawler",
        "spider",
        "scraper",
        "fetcher",
    ];

    /// Detect if a user agent is from a crawler/bot
    pub fn is_crawler(user_agent: &str) -> bool {
        let ua_lower = user_agent.to_lowercase();
        
        Self::CRAWLER_PATTERNS.iter().any(|pattern| {
            ua_lower.contains(*pattern)
        })
    }

    /// Get crawler type from user agent (for analytics)
    pub fn get_crawler_type(user_agent: &str) -> Option<String> {
        let ua_lower = user_agent.to_lowercase();
        
        let crawler_types = vec![
            ("facebookexternalhit", "Facebook"),
            ("twitterbot", "Twitter"),
            ("whatsapp", "WhatsApp"),
            ("telegrambot", "Telegram"),
            ("linkedinbot", "LinkedIn"),
            ("pinterestbot", "Pinterest"),
            ("googlebot", "Google"),
            ("bingbot", "Bing"),
            ("yandex", "Yandex"),
            ("baiduspider", "Baidu"),
            ("ia_archiver", "Archive.org"),
        ];
        
        for (pattern, crawler_name) in crawler_types {
            if ua_lower.contains(pattern) {
                return Some(crawler_name.to_string());
            }
        }
        
        if ua_lower.contains("bot") || ua_lower.contains("crawler") {
            return Some("Unknown Bot".to_string());
        }
        
        None
    }
}

/// Risk level to emoji mapping for various contexts
pub struct RiskDisplay;

impl RiskDisplay {
    /// Get emoji for risk level
    pub fn emoji(level: &RiskLevel) -> &'static str {
        match level {
            RiskLevel::Low => "🟢",
            RiskLevel::Medium => "🟡",
            RiskLevel::High => "🔴",
            RiskLevel::Critical => "⛔",
        }
    }

    /// Get warning message for risk level
    pub fn warning_message(level: &RiskLevel, report_count: i32) -> String {
        match level {
            RiskLevel::Low => {
                "No reports filed. Always exercise caution when transacting.".to_string()
            }
            RiskLevel::Medium => {
                format!(
                    "⚠️ {} reports filed. Verify identity before transacting.",
                    report_count
                )
            }
            RiskLevel::High => {
                format!(
                    "🔴 {} reports filed. Exercise extreme caution.",
                    report_count
                )
            }
            RiskLevel::Critical => {
                format!(
                    "⛔ {} reports filed. HIGH RISK - DO NOT TRANSACT!",
                    report_count
                )
            }
        }
    }

    /// Get color code for HTML output
    pub fn color_hex(level: &RiskLevel) -> &'static str {
        match level {
            RiskLevel::Low => "#0FA958",    // Green
            RiskLevel::Medium => "#FCC015",  // Yellow
            RiskLevel::High => "#D92D20",    // Red
            RiskLevel::Critical => "#7A0A1A", // Dark Red
        }
    }

    /// Get background color for HTML output
    pub fn bg_color_rgba(level: &RiskLevel) -> &'static str {
        match level {
            RiskLevel::Low => "rgba(15, 169, 88, 0.1)",
            RiskLevel::Medium => "rgba(252, 192, 21, 0.1)",
            RiskLevel::High => "rgba(217, 45, 32, 0.1)",
            RiskLevel::Critical => "rgba(122, 10, 26, 0.15)",
        }
    }
}

/// Rate limiting configuration for meta endpoint
pub struct RateLimitConfig {
    pub requests_per_minute: u32,
    pub requests_per_hour: u32,
    pub burst_size: u32,
}

impl Default for RateLimitConfig {
    fn default() -> Self {
        Self {
            requests_per_minute: 100,  // 100 req/min per IP
            requests_per_hour: 5000,   // 5000 req/hour per IP
            burst_size: 10,            // Allow bursts of 10 requests
        }
    }
}

/// Suspicious activity detection
pub struct SuspiciousActivityDetector;

impl SuspiciousActivityDetector {
    /// Patterns that indicate automated abuse
    const ABUSE_PATTERNS: &'static [&'static str] = &[
        "masscan",
        "nmap",
        "nessus",
        "nikto",
        "sqlmap",
        "burp",
        "zaproxy",
        "metasploit",
        "wfuzz",
        "dirbuster",
    ];

    /// Check if request appears to be from a security scanner or attack tool
    pub fn is_security_scan(user_agent: &str) -> bool {
        let ua_lower = user_agent.to_lowercase();
        Self::ABUSE_PATTERNS.iter().any(|pattern| ua_lower.contains(*pattern))
    }

    /// Generate alert event for suspicious activity
    pub fn should_alert(
        _ip: &str,
        user_agent: &str,
        _request_count_this_minute: u32,
    ) -> bool {
        Self::is_security_scan(user_agent)
    }
}

/// Cache key generation for meta responses
pub struct CacheKey;

impl CacheKey {
    pub fn meta_response(identifier_canonical: &str) -> String {
        format!("meta:response:{}", identifier_canonical)
    }

    pub fn meta_timestamp(identifier_canonical: &str) -> String {
        format!("meta:timestamp:{}", identifier_canonical)
    }
}

/// JSON Schema validation patterns
pub struct ValidationRules;

impl ValidationRules {
    pub fn max_identifier_length() -> usize {
        512
    }

    pub fn max_query_length() -> usize {
        256
    }

    /// Validate identifier format (basic)
    pub fn is_valid_identifier(identifier: &str) -> bool {
        !identifier.is_empty() && identifier.len() <= Self::max_identifier_length()
    }

    /// Check if identifier looks like it could be a valid type
    pub fn appears_valid(identifier: &str) -> bool {
        // Very basic validation - allow alphanumerics, common symbols
        identifier
            .chars()
            .all(|c| c.is_alphanumeric() || "+-_@.:/".contains(c))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_crawler_detection() {
        assert!(CrawlerDetector::is_crawler("facebookexternalhit/1.1"));
        assert!(CrawlerDetector::is_crawler("Twitterbot/1.0"));
        assert!(CrawlerDetector::is_crawler("Mozilla/5.0 (compatible; Googlebot/2.1)"));
        assert!(!CrawlerDetector::is_crawler("Mozilla/5.0 (Windows NT 10.0; Win64; x64)"));
    }

    #[test]
    fn test_suspicious_activity() {
        assert!(SuspiciousActivityDetector::is_security_scan("masscan/1.0"));
        assert!(SuspiciousActivityDetector::is_security_scan("nmap/7.92"));
        assert!(!SuspiciousActivityDetector::is_security_scan("Chrome/120.0"));
    }

    #[test]
    fn test_validation() {
        assert!(ValidationRules::is_valid_identifier("08012345678"));
        assert!(ValidationRules::is_valid_identifier("user@example.com"));
        assert!(!ValidationRules::is_valid_identifier(""));
    }
}
