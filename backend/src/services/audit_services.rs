//Immutable audit logging
//
// All moderation actions, USSD queries, and sensitive data
// access are recorded here. Audit logs are never deleted.

use sqlx::PgPool;
use crate::error::AppResult;
use crate::models::audit::{AuditLog, CreateAuditLog};

pub struct AuditService;

impl AuditService {
/// Insert an immutable audit log entry.
/// Silently logs on error (we never want audit failures to
/// prevent the primary operation from completing.
    pub async fn log(db: &PgPool, entry: CreateAuditLog) -> AppResult<()> {
        let result = sqlx::query::<_>(
            r#"
            INSERT INTO audit_logs (actor_id, actor_hash, action, entity_type, entity_id, details, ip_address, channel)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            "#
        )
        .bind(entry.actor_id)
        .bind(entry.actor_hash)
        .bind(entry.action)
        .bind(entry.entity_type)
        .bind(entry.entity_id)
        .bind(entry.details)
        .bind(entry.ip_address)
        .bind(entry.channel)
        .execute(db)
        .await;

    if let Err(e) = result {
        // Log the error but dont fail the primary operations
        tracing::error!("Audit log insertion failed: {:?}", e);
    }

    Ok(())
    }

    /// Fetch paginated audit logs for admin review.
    pub async fn list_logs(
        db: &PgPool,
        action_filter: Option<&str>,
        limit: i64,
        offset: i64,
    ) -> AppResult<Vec<AuditLog>> {
        let logs = if let Some(action) = action_filter {
            sqlx::query_as::<_, AuditLog>(
                r#"
                SELECT * FROM audit_logs WHERE action = $1 
                ORDER BY created_at DESC
                LIMIT $2 OFFSET $3
                "#
            )
            .bind(action)
            .bind(limit)
            .bind(offset)
            .fetch_all(db)
            .await?
        } else {
            sqlx::query_as::<_, AuditLog>(
                r#"
                SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2
                "#
            )
            .bind(limit)
            .bind(offset)
            .fetch_all(db)
            .await?
        };

        Ok(logs)
    }
}