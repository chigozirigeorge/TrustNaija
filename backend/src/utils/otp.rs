// ============================================================
// utils/otp.rs - OTP generation for phone verification
// ============================================================

use rand::{RngExt};

/// Generate a 6 digit numeric OTP
pub fn generate_otp() -> String {
    let otp: u32 = rand::rng().random_range(100_000..=999_999);
    println!("Otp is {}",&otp );
    otp.to_string()
}

/// Generate OTP message text for Text
pub fn otp_message(otp: &str) -> String {
    format!(
        "Your TrustNaija verification code is: {}. Valid for 5 minutes. Do not share this code with anyone",
        otp
    )
}

/// Generate USSD follow-up alert message
pub fn ussd_alert_message(identifier_type: &str, canonical: &str, risk_score: i16) -> String {
    let risk_label = match risk_score {
        90..=i16::MAX => "CRITICAL",
        70..=89 => "HIGH",
        40..=69 => "MEDIUM",
        _ => "LOW",
    };
    format!(
        "TrustNaija Alert: The {} '{}' has a {} risk score ({}/100). Stay safe! Reply STOP to opt out.",
        identifier_type,
        &canonical[..canonical.len().min(30)],
        risk_label,
        risk_score
    )
}
