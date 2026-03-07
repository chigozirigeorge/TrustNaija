// ============================================================
// Identifier lookup with Redis caching
//
// Lookup flow:
//   1. Normalize the input identifier
//   2. Check Redis cache (TTL: 60 seconds for hot lookups)
//   3. Query PostgreSQL if cache miss
//   4. Update cache and return
//   5. Write audit log
// ============================================================

use redis::{aio::ConnectionManager, AsyncCommands};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::AppResult,
    models::{self, identifiers::{
        Identifier, LookupResponse, RiskLevel
    }},
    services::audit_services::AuditService,
    utils::normalize::normalize_identifier,
};


/// Cache TTL for lookup results (seconds)
const LOOKUP_CACHE_TTL: u64 = 60;

/// Cache key prefix
fn cache_key(canonical: &str) -> String {
    format!("lookup:{}", canonical)
}

pub struct LookupService;

impl LookupService {
    /// Look up an identifier and return risk information.
    ///
    /// Returns a LookupResponse regardless of whether the identifier
    /// is known (is_known: false = no reports filed yet).
    pub async fn lookup(
        db: &PgPool,
        redis: &mut ConnectionManager,
        raw_identifier: &str,
        actor_id: Option<Uuid>,
        actor_hash: Option<String>,
        channel: &str,
        ip_address: Option<String>,
        high_threshold: u8,
        medium_threshold: u8,
    ) -> AppResult<LookupResponse> {
        // Normalize input 
        let normalized = normalize_identifier(raw_identifier)?;

        // Try Redis cache first
        let cache_key = cache_key(&normalized.canonical);
        if let Ok(cached) = redis.get::<_, String>(&cache_key).await {
            if let Ok(response) = serde_json::from_str::<LookupResponse>(&cached) {
                tracing::debug!("Cache Hit for identifier lookup: {}", &normalized.canonical[..normalized.canonical.len().min(20)]);
                return Ok(response);
            }
        }

        tracing::debug!("Cache Miss for identifier lookup, querying DB");

        // Query Postgresql for the identifier
        let identifier_opt = sqlx::query_as::<_, Identifier>(
            r#"
            SELECT * FROM identifiers WHERE canonical_value = $1
            "#
        )
        .bind(&normalized.canonical)
        .fetch_optional(db)
        .await?;

    // Build response 
    let response = if let Some(id) = identifier_opt {
        LookupResponse {
            identifier: normalized.canonical.clone(),
            identifier_type: normalized.identifier_type.clone(),
            risk_score: id.risk_score,
            risk_level: RiskLevel::from_score(id.risk_score, high_threshold, medium_threshold),
            report_count: id.report_count,
            first_seen_at: Some(id.first_seen_at),
            last_seen_at: Some(id.last_seen_at),
            tags: id.tags,
            is_known: true
        }
    } else {
        // Unknown identifier — safe result with zero score
            LookupResponse {
                identifier: normalized.canonical.clone(),
                identifier_type: normalized.identifier_type.clone(),
                risk_score: 0,
                risk_level: RiskLevel::Low,
                report_count: 0,
                first_seen_at: None,
                last_seen_at: None,
                tags: vec![],
                is_known: false,
            } 
    };

    // store in Rediss cache
    if let Ok(json) = serde_json::to_string(&response) {
        let _ = redis
            .set_ex::<_, _, ()>(&cache_key, json, LOOKUP_CACHE_TTL)
            .await;
    }

    // Audit log
    AuditService::log(
        db, 
        crate::models::audit::CreateAuditLog { 
            actor_id, 
            actor_hash, 
            action: match channel {
                "ussd" => models::audit::AuditAction::LOOKUP_USSD.into(),
                "api" =>  models::audit::AuditAction::LOOKUP_API.into(),
                _ => models::audit::AuditAction::LOOKUP_WEB.into()
            }, 
            entity_type: Some("identifier".into()), 
            entity_id: None,
            details: serde_json::json!({
                "identifier_type": normalized.identifier_type,
                "risk_score": response.risk_score,
                "is_known": response.is_known
            }), 
            ip_address, 
            channel: channel.into()
        }
    )
    .await?;

    Ok(response)
    }

    /// Invalidate the cache for a given canonical identifier.
    /// Called after a report is approved or score changes.
    pub async fn invalidate_cache(
        redis: &mut ConnectionManager,
        canonical: &str,
    ) -> AppResult<()> {
        let _: () = redis.del(cache_key(canonical)).await?;
        Ok(())
    }

}
