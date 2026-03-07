// ============================================================
// POST /report handler
// ============================================================

use axum::{extract::State, http::HeaderMap, Json};
use validator::Validate;

use crate::{AppState, error::{AppError, AppResult}, middleware::{auth::OptionalAuthUser, rate_limit::{check_rate_limit, report_rate_key}}, models::reports::{CreateReportRequest, CreateReportResponse}, services::report_service::ReportService};

/// POST /report
///
/// Submit a new scam report. Works for both authenticated users
/// and anonymous reporters (e.g., USSD, no-account web users).
///
/// Authenticated trusted reporters get auto-approval.
/// Others go through manual moderation queue.
///
/// Rate limit: 5 reports per hour per user/IP
pub async fn create_report(
    State(state): State<AppState>,
    OptionalAuthUser(claims): OptionalAuthUser,
    headers: HeaderMap,
    Json(req): Json<CreateReportRequest>
) -> AppResult<Json<CreateReportResponse>> {
    // Validate the input first
    req.validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;

    // Extract the IP for rate limiting and audit
    let ip = extract_ip(&headers);

    // Rate limit: Per user Id or per Ip if anonymous
    let rate_key = if let Some(ref c) = claims {
        report_rate_key(&c.sub)
    } else {
        report_rate_key(&ip.clone().unwrap_or_else(|| "anonymous".into()))
    };

    let mut redis = state.redis.clone();
    check_rate_limit(
        &mut redis, 
        &rate_key, 
        5, 
        3600).await?;

    // Determine reporter context
    let reporter_id = claims.as_ref().and_then(|c| c.sub.parse().ok());
    let is_trusted = claims
        .as_ref()
        .map(|_| {
            // TODO: fetch is_trusted from DB or embed in JWT claims
            false
        })
        .unwrap_or(false);

    let channel = if claims.is_some() { "web" } else {"web_anon"};

    // Create the report
    let response = ReportService::create_report(
        &state.db, 
        &req, 
        reporter_id, 
        is_trusted, 
        channel, 
        ip
    )
    .await?;

    Ok(Json(response))
}

/// Extract clients ip from X-forwarded_for or remote addr header
fn extract_ip(headers: &HeaderMap) -> Option<String> {
    headers
        .get("X-Forwarded-For")
        .or_else(|| headers.get("X-Real-IP"))
        .and_then(|v| v.to_str().ok())
        .map(|s| s.split(",").next().unwrap_or(s).trim().to_string())
}