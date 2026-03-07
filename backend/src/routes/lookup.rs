// ============================================================
// GET /lookup handler
// ============================================================

use axum::{
    extract::{Query, State},
    http::HeaderMap,
    Json,
};

use crate::{AppState, error::{AppError, AppResult}, middleware::{auth::OptionalAuthUser, rate_limit::{check_rate_limit, ip_rate_key}}, models::identifiers::{LookupRequest, LookupResponse}, services::lookup_service::LookupService, utils::hash::hash_identifier};

/// GET /lookup?identifier=08012345678
///
/// Returns the risk score, report count, tags, and first/last seen
/// dates for any phone number, URL, wallet address, or app package.
///
/// Works for both authenticated and anonymous users.
/// Rate limit: 30 req/min per IP.
///
/// Example requests:
///   GET /lookup?identifier=08012345678
///   GET /lookup?identifier=paystack-fakesite.com
///   GET /lookup?identifier=0xAbCd...
///   GET /lookup?identifier=com.fake.bankapp
pub async fn lookup_identifier(
    State(state): State<AppState>,
    OptionalAuthUser(claims): OptionalAuthUser,
    headers: HeaderMap,
    Query(query): Query<LookupRequest>
) -> AppResult<Json<LookupResponse>> {
    if query.identifier.trim().is_empty() {
        return Err(AppError::BadRequest(
            "Query parameter 'identifier' is required".into(),
        ));
    }

    // Extract IP for rate limiting
    let ip = headers
        .get("X-Forwarded-For")
        .and_then(|v| v.to_str().ok())
        .map(String::from)
        .unwrap_or_else(|| "unknown".into());

    // Rate limit: 30 requests per minutes per Ip
    let mut redis = state.redis.clone();
    check_rate_limit(
        &mut redis, 
        &ip_rate_key(&ip, "lookup"), 
        state.config.rate_limit_rpm, 
        60
    )
    .await?;

    // Actor info for audit log
    let actor_id = claims.as_ref().and_then(|c| c.sub.parse().ok());
    let actor_hash = if actor_id.is_none() {
        Some(hash_identifier(&ip))
    } else {
        None
    };

    let mut redis_conn = state.redis.clone();
    let response = LookupService::lookup(
        &state.db, 
        &mut redis_conn, 
        &query.identifier, 
        actor_id, 
        actor_hash,
        "web", 
        Some(ip), 
        state.config.risk_score_high, 
        state.config.risk_score_medium
    )
    .await?;

    Ok(Json(response))
}
