// ============================================================
// Audit logging module for meta endpoint requests
// Tracks crawler activity, rate limit violations, and abuse patterns
// ============================================================

use chrono::Utc;
use uuid::Uuid;
use crate::AppState;

/// Log meta endpoint access for audit trail
pub async fn log_meta_request(
    state: &AppState,
    identifier: &str,
    ip: &str,
    user_agent: &str,
    crawler_type: Option<String>,
    status: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    let _ = sqlx::query(
        r#"
        INSERT INTO audit_logs (
            id, user_id, action, resource_type, resource_id,
            details, ip_address, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(Option::<Uuid>::None)
    .bind("META_LOOKUP")
    .bind("identifier")
    .bind(identifier)
    .bind(format!(
        "{{\"user_agent\": \"{}\", \"crawler\": {:?}, \"status\": \"{}\"}}",
        user_agent, crawler_type, status
    ))
    .bind(ip)
    .bind(Utc::now())
    .execute(&state.db)
    .await;

    Ok(())
}

/// Log suspected abuse or security violations
pub async fn log_abuse_attempt(
    state: &AppState,
    ip: &str,
    user_agent: &str,
    reason: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    let _ = sqlx::query(
        r#"
        INSERT INTO audit_logs (
            id, user_id, action, resource_type, resource_id,
            details, ip_address, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(Option::<Uuid>::None)
    .bind("SECURITY_ALERT")
    .bind("meta_endpoint")
    .bind(ip)
    .bind(format!(
        "{{\"reason\": \"{}\", \"user_agent\": \"{}\"}}",
        reason, user_agent
    ))
    .bind(ip)
    .bind(Utc::now())
    .execute(&state.db)
    .await;

    Ok(())
}
