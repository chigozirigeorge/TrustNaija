// ============================================================
// routes/meta.rs - Secure meta endpoint for SEO & social sharing
//
// Provides dynamic meta tags for social media previews and SEO.
// Detects crawlers and serves HTML to bots, JSON to browsers.
// Includes rate limiting, input validation, XSS protection.
// ============================================================

use axum::{
    extract::{Query, State},
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use serde::{Deserialize, Serialize};
use redis::AsyncCommands;

use crate::{
    error::AppError,
    models::identifiers::Identifier,
    middleware::rate_limit::{check_rate_limit, ip_rate_key},
    services::meta_service::{CrawlerDetector, SuspiciousActivityDetector},
    routes::meta_audit,
    AppState,
};

/// Query parameters for meta endpoint
#[derive(Debug, Deserialize)]
pub struct MetaQuery {
    pub identifier: String,
}

/// Meta tags response for browsers
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MetaResponse {
    pub identifier: String,
    pub identifier_type: String,
    pub risk_score: i16,
    pub risk_level: String,
    pub report_count: i32,
    pub is_known: bool,
    pub og_title: String,
    pub og_description: String,
    pub og_image: String,
}

/// Response enum to handle both HTML and JSON
pub enum MetaResult {
    Html(String),
    Json(MetaResponse),
}

impl IntoResponse for MetaResult {
    fn into_response(self) -> Response {
        match self {
            MetaResult::Html(html) => (
                StatusCode::OK,
                [("Content-Type", "text/html; charset=utf-8")],
                html,
            )
                .into_response(),
            MetaResult::Json(json) => Json(json).into_response(),
        }
    }
}

/// Escape HTML special characters to prevent XSS
fn escape_html(s: &str) -> String {
    s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\"", "&quot;")
        .replace("'", "&#39;")
}

/// Detect if request is from a crawler/bot
fn is_crawler(user_agent: &str) -> bool {
    CrawlerDetector::is_crawler(user_agent)
}

/// Build secure HTML with escaped meta tags for crawlers
fn build_meta_html(
    identifier: &str,
    identifier_type: &str,
    risk_score: i16,
    risk_level: &str,
    report_count: i32,
    is_known: bool,
) -> String {
    let escaped_identifier = escape_html(identifier);
    let escaped_risk_level = escape_html(risk_level);

    let title = if is_known {
        format!("⚠️ Scam Alert: {} | Risk: {}", escaped_identifier, escaped_risk_level)
    } else {
        format!("Check: {} | TrustNaija", escaped_identifier)
    };

    let description = if is_known {
        format!(
            "Risk Score: {}/100 | {} | {} reports filed. Stay safe with TrustNaija.",
            risk_score, escaped_risk_level, report_count
        )
    } else {
        format!(
            "No reports found for {} | Safe to transact | TrustNaija fraud detection",
            escaped_identifier
        )
    };

    let image_url = format!(
        "https://trust-naija.vercel.app/risk-{}.png",
        risk_level.to_lowercase()
    );

    let canonical_url = format!(
        "https://trust-naija.vercel.app/lookup?q={}",
        urlencoding::encode(identifier)
    );

    format!(
        r#"<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <!-- Primary Meta Tags -->
    <title>{title}</title>
    <meta name="title" content="{title}">
    <meta name="description" content="{description}">
    <meta name="robots" content="index, follow">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="{canonical_url}">
    <meta property="og:title" content="{title}">
    <meta property="og:description" content="{description}">
    <meta property="og:image" content="{image_url}">
    <meta property="og:site_name" content="TrustNaija">
    <meta property="og:locale" content="en_NG">
    
    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:url" content="{canonical_url}">
    <meta name="twitter:title" content="{title}">
    <meta name="twitter:description" content="{description}">
    <meta name="twitter:image" content="{image_url}">
    
    <!-- WhatsApp -->
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    
    <!-- Security -->
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="referrer" content="strict-origin-when-cross-origin">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; frame-ancestors 'none'">
    
    <!-- Canonical -->
    <link rel="canonical" href="{canonical_url}">
    
    <!-- Redirect to lookup page -->
    <meta http-equiv="refresh" content="0; url={canonical_url}">
</head>
<body>
    <p>Redirecting to TrustNaija...</p>
</body>
</html>"#
    )
}

/// GET /meta?identifier=08012345678
///
/// Returns dynamic meta tags for social media sharing and SEO.
/// For crawlers (bots): returns HTML with meta tags
/// For browsers: returns JSON response
///
/// Rate limited: 100 requests/minute per IP
/// Input validated and XSS-escaped
pub async fn get_meta(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<MetaQuery>,
) -> Result<MetaResult, AppError> {
    // Extract IP for rate limiting
    let ip = headers
        .get("X-Forwarded-For")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .unwrap_or_else(|| "unknown".to_string());

    // Extract User-Agent
    let user_agent = headers
        .get("user-agent")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("unknown");

    // ──── RATE LIMITING ────────────────────────────────────────
    let mut redis = state.redis.clone();
    check_rate_limit(
        &mut redis,
        &ip_rate_key(&ip, "meta"),
        100, // 100 req/min per IP
        60,
    )
    .await?;

    // ──── SECURITY: DETECT SUSPICIOUS ACTIVITY ─────────────────
    if SuspiciousActivityDetector::should_alert(&ip, user_agent, 0) {
        tracing::warn!(
            "Suspicious activity detected from {} ({})",
            ip,
            user_agent
        );
        // Log abuse attempt
        let _ = meta_audit::log_abuse_attempt(&state, &ip, user_agent, "Security scanner detected").await;
    }

    // ──── INPUT VALIDATION ─────────────────────────────────────
    let identifier = query.identifier.trim();

    if identifier.is_empty() {
        return Err(AppError::BadRequest(
            "Query parameter 'identifier' is required".into(),
        ));
    }

    if identifier.len() > 512 {
        return Err(AppError::BadRequest(
            "Identifier too long (max 512 characters)".into(),
        ));
    }

    // ──── NORMALIZE & SANITIZE ────────────────────────────────
    let normalized = crate::utils::normalize::normalize_identifier(identifier)
        .map_err(|_| AppError::BadRequest("Invalid identifier format".into()))?;

    // ──── REDIS CACHE LOOKUP ───────────────────────────────────
    // Cache meta responses for 5 minutes to reduce database load
    let cache_key = format!("meta:{}", normalized.canonical);
    if let Ok(cached_json) = redis.get::<String, String>(cache_key.clone()).await {
        if let Ok(cached_response) = serde_json::from_str::<MetaResponse>(&cached_json) {
            tracing::debug!("Meta cache hit for {}", normalized.canonical);
            let crawler_type = CrawlerDetector::get_crawler_type(user_agent);
            let _ = meta_audit::log_meta_request(
                &state,
                &normalized.canonical,
                &ip,
                user_agent,
                crawler_type,
                "cached",
            ).await;

            if is_crawler(user_agent) {
                let html = build_meta_html(
                    &cached_response.identifier,
                    &cached_response.identifier_type,
                    cached_response.risk_score,
                    &cached_response.risk_level,
                    cached_response.report_count,
                    cached_response.is_known,
                );
                return Ok(MetaResult::Html(html));
            } else {
                return Ok(MetaResult::Json(cached_response));
            }
        }
    }

    // ──── DATABASE QUERY ───────────────────────────────────────
    let identifier_opt: Option<Identifier> = sqlx::query_as(
        r#"
        SELECT * FROM identifiers WHERE canonical_value = $1
        "#,
    )
    .bind(&normalized.canonical)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| {
        tracing::error!("Database error in meta endpoint: {}", e);
        AppError::Internal("Database error".into())
    })?;

    // ──── COUNT APPROVED REPORTS ───────────────────────────────
    let (approved_count,): (i64,) = if let Some(ref id) = identifier_opt {
        sqlx::query_as(
            r#"SELECT COUNT(*) FROM reports WHERE identifier_id = $1 AND status = 'approved'"#,
        )
        .bind(id.id)
        .fetch_one(&state.db)
        .await
        .unwrap_or((0,))
    } else {
        (0,)
    };

    // ──── BUILD RESPONSE ───────────────────────────────────────
    let (identifier_display, identifier_type, risk_score, risk_level, is_known, report_count) =
        if let Some(id) = identifier_opt {
            let level = crate::models::identifiers::RiskLevel::from_score(
                id.risk_score,
                state.config.risk_score_high,
                state.config.risk_score_medium,
            );
            let level_str = format!("{:?}", level);

            (
                normalized.canonical.clone(),
                normalized.identifier_type.clone(),
                id.risk_score,
                level_str,
                true,
                approved_count as i32,
            )
        } else {
            (
                normalized.canonical.clone(),
                normalized.identifier_type.clone(),
                0,
                "Low".to_string(),
                false,
                0,
            )
        };

    // Build JSON response for caching
    let json_response = MetaResponse {
        identifier: identifier_display.clone(),
        identifier_type: identifier_type.clone(),
        risk_score,
        risk_level: risk_level.clone(),
        report_count,
        is_known,
        og_title: if is_known {
            format!("⚠️ Scam Alert: {}", identifier_display)
        } else {
            format!("Check: {}", identifier_display)
        },
        og_description: if is_known {
            format!(
                "Risk: {}/100 ({}) | {} reports | TrustNaija",
                risk_score, risk_level, report_count
            )
        } else {
            "No reports found. Safe to transact.".to_string()
        },
        og_image: format!(
            "https://trust-naija.vercel.app/risk-{}.png",
            risk_level.to_lowercase()
        ),
    };

    // ──── CACHE RESPONSE (5 minutes TTL) ───────────────────────
    if let Ok(json_str) = serde_json::to_string(&json_response) {
        let _: () = redis.set_ex(cache_key.clone(), json_str, 300).await.unwrap_or_default();
    }

    // ──── AUDIT LOGGING ────────────────────────────────────────
    let crawler_type = CrawlerDetector::get_crawler_type(user_agent);
    let _ = meta_audit::log_meta_request(
        &state,
        &normalized.canonical,
        &ip,
        user_agent,
        crawler_type,
        "success",
    ).await;

    // ──── DETECT CRAWLER & RESPOND ─────────────────────────────
    if is_crawler(user_agent) {
        let html = build_meta_html(
            &json_response.identifier,
            &json_response.identifier_type,
            json_response.risk_score,
            &json_response.risk_level,
            json_response.report_count,
            json_response.is_known,
        );

        tracing::info!(
            "Crawler meta request for {} ({})",
            &json_response.identifier,
            user_agent
        );

        Ok(MetaResult::Html(html))
    } else {
        // Browser request - return JSON
        tracing::debug!(
            "Browser meta request for {} ({})",
            &json_response.identifier,
            user_agent
        );

        Ok(MetaResult::Json(json_response))
    }
}
