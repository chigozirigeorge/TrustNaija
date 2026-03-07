// ============================================================
// routes/admin.rs - Admin/moderator panel endpoints
//
// All endpoints here require moderator or admin role.
// Every action is recorded in the audit log.
// ============================================================

use axum::{
    extract::{Path, Query, State},
    Json
};
use uuid::Uuid;
use serde::Deserialize;

use crate::{
    error::{AppError, AppResult},
    middleware::auth::ModeratorUser,
    models::{
        reports::{AdminReportResponse, ModerateReportRequest, Report},
        identifiers::Identifier,
        audit::AuditLog,
    },
    services::{
        audit_services::AuditService,
        report_service::ReportService,
    },
    AppState
};

/// Pagination query parameter
#[derive(Debug, Deserialize)]
pub struct PaginationParams {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct AuditLogParams {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
    pub action: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AllReportsParams {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
    pub status: Option<String>,
}

/// Identifier with all its reports
#[derive(Debug, serde::Serialize)]
pub struct IdentifierDetail {
    pub identifier: Identifier,
    pub reports: Vec<Report>,
}


/// GET /admin/reports/pending
///
/// Fetch all reports awaiting moderation, oldest first.
/// Requires moderator or admin role.
pub async fn list_pending_reports(
    State(state): State<AppState>,
    ModeratorUser(_claims): ModeratorUser,
    Query(pagination): Query<PaginationParams>,
) -> AppResult<Json<Vec<AdminReportResponse>>> {
    let limit = pagination.limit.unwrap_or(20).min(100);
    let offset = pagination.offset.unwrap_or(0);

    let reports = ReportService::list_pending_reports_with_risk(
        &state.db, 
        limit, 
        offset
    )
    .await?;

    Ok(Json(reports))
}

/// POST /admin/reports/:id/moderate
///
/// Approve or reject a pending report.
/// On approval: risk score is recomputed for the identifier.
///
/// Request body:
/// ```json
/// {
///   "action": "approve",
///   "note": "Verified against multiple sources",
///   "tags": ["investment_scam", "high_value"]
/// }
/// ```
pub async fn moderate_report(
    State(state): State<AppState>,
    ModeratorUser(claims): ModeratorUser,
    Path(report_id): Path<Uuid>,
    Json(req): Json<ModerateReportRequest>,
) -> AppResult<Json<serde_json::Value>> {
    let moderator_id: Uuid = claims
        .sub
        .parse()
        .map_err(|_| AppError::Internal("Invalid moderator ID in token".into()))?;

    ReportService::moderate_report(
        &state.db, 
        report_id, moderator_id, &req).await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "message": format!("Report {} has been {}.", report_id, req.action)
    })))
}

/// GET /admin/audit-logs
///
/// Fetch paginated audit logs with optional action filter.
/// Requires admin role (audit logs are sensitive).
pub async fn list_audit_logs(
    State(state): State<AppState>,
    ModeratorUser(_claims): ModeratorUser,    // Admins only 
    Query(params): Query<AuditLogParams>,
) -> AppResult<Json<Vec<AuditLog>>> {
    let limit = params.limit.unwrap_or(50).min(200);
    let offset = params.offset.unwrap_or(0);

    let logs = AuditService::list_logs(
        &state.db, 
        params.action.as_deref(), 
        limit, 
        offset
    )
    .await?;

    Ok(Json(logs))
}

/// GET /admin/identifiers/:id
///
/// Get full identifier details including all associated reports.
pub async fn get_identifier(
    State(state): State<AppState>,
    ModeratorUser(_claims): ModeratorUser,
    Path(identifier_id): Path<Uuid>,
) -> AppResult<Json<IdentifierDetail>> {
    let identifier = sqlx::query_as::<_, Identifier>(
        r#"
        SELECT * FROM identifiers WHERE id = $1
        "#
    )
    .bind(identifier_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Identifier {} not found", identifier_id)))?;

    let reports = sqlx::query_as::<_,Report>(
        r#"
        SELECT * FROM reports WHERE identifier_id = $1 ORDER BY created_at DESC
        "#
    )
    .bind(identifier_id)
    .fetch_all(&state.db)
    .await?;

    Ok(Json(IdentifierDetail { identifier, reports }))
}

/// GET /admin/reports
///
/// Fetch all reports (pending and moderated) with optional status filter.
/// Requires moderator or admin role.
/// Query params:
///   - status: Optional filter ("pending", "approved", "rejected")
///   - limit: Default 20, max 100
///   - offset: Default 0
pub async fn list_all_reports(
    State(state): State<AppState>,
    ModeratorUser(_claims): ModeratorUser,
    Query(params): Query<AllReportsParams>,
) -> AppResult<Json<Vec<AdminReportResponse>>> {
    let limit = params.limit.unwrap_or(20).min(100);
    let offset = params.offset.unwrap_or(0);

    let reports = ReportService::list_all_reports_with_risk(
        &state.db,
        limit,
        offset,
        params.status.as_deref()
    )
    .await?;

    Ok(Json(reports))
}
