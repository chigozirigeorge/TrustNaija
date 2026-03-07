// ============================================================
// Report submission and moderation logic
// ============================================================

use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::{AppError, AppResult},
    models::{
        audit::{AuditAction, CreateAuditLog}, identifiers::Identifier, reports::{
            AdminReportResponse, CreateReportRequest, CreateReportResponse, ModerateReportRequest, Report,
            STATUS_APPROVED, STATUS_PENDING, STATUS_REJECTED,
        }
    },
    services::{
        audit_services::AuditService,
        risk_engine::recompute_identifier_risk,
    },
    utils::{hash::hash_identifier, normalize::normalize_identifier}
};

pub struct ReportService;

impl ReportService {
    /// Submit a new scam report.
    ///
    /// Flow:
    ///   1. Normalize the identifier (phone/URL/wallet/app)
    ///   2. Upsert the identifier record
    ///   3. Create the report (status = pending unless trusted reporter)
    ///   4. Trigger async risk score recomputation if auto-approved
    ///   5. Write audit log
    pub async fn create_report(
        db: &PgPool,
        req: &CreateReportRequest,
        reporter_id: Option<Uuid>,
        is_trusted: bool,
        channel: &str,
        ip_address: Option<String>
    ) -> AppResult<CreateReportResponse> {
        // Normalize the identifier 
        let  normalized = normalize_identifier(&req.identifer)?;

        if normalized.identifier_type != req.identifier_type && !req.identifier_type.is_empty() {
            tracing::warn!(
                "Reported type '{}' doesn't match detected type '{}' for input '{}'",
                req.identifier_type,
                normalized.identifier_type,
                req.identifer
            );
        }

        let raw_hash = hash_identifier(&normalized.canonical);

        // Upset identifier f(insert or update last seen + count)
        let identifier: Identifier = sqlx::query_as::<_, Identifier>(
            r#"
            INSERT INTO identifiers (canonical_value, identifier_type, raw_hash)
            VALUES ($1, $2, $3)
            ON CONFLICT (canonical_value) DO UPDATE
                SET last_seen_at = NOW(),
                    report_count = identifiers.report_count + 1,
                    updated_at = NOW()
                RETURNING *
                "#
        )
        .bind(normalized.canonical)
        .bind(normalized.identifier_type.clone())
        .bind(raw_hash)
        .fetch_one(db)
        .await?;

        // Determine report status - trusted reporters get auto-approval
        let status = if is_trusted { STATUS_APPROVED } else { STATUS_PENDING };

        // Hash reporter phone if anonymous (USSD/no account)
        let reporter_hash = if reporter_id.is_none() {
            req.reporter_phone.as_deref().map(hash_identifier)
        } else {
            None
        };

        // Convert NGN to Kobo l(avoid floating point in storage)
        let amount_kobo = req.amount_lost_ngn.map(|n| (n * 100.0) as i64);

        // insert the report 
        let report = sqlx::query_as::<_, Report>(
            r#"
            INSERT INTO reports 
                (identifier_id, reporter_id, reporter_hash, scam_type, description, amount_lost_ngn, channel, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
            "#
        )
        .bind(identifier.id)
        .bind(reporter_id)
        .bind(reporter_hash.clone())
        .bind(req.scam_type.clone())
        .bind(req.description.clone())
        .bind(amount_kobo)
        .bind(channel)
        .bind(status)
        .fetch_one(db)
        .await?;

        // compute updated risk score (only if auto-approved)
        let risk_score = if status == STATUS_APPROVED {
            recompute_identifier_risk(db, identifier.id).await?
        } else {
            identifier.risk_score
        };

        AuditService::log(
            db, 
            CreateAuditLog {
                actor_id: reporter_id,
                actor_hash: reporter_hash,
                action: AuditAction::REPORT_CREATED.into(),
                entity_type: Some("report".into()),
                entity_id: Some(report.id),
                details: serde_json::json!({
                    "identifier_type": normalized.identifier_type,
                    "scam_type": req.scam_type,
                    "channel": channel,
                    "status": status,
                }),
                ip_address,
                channel: channel.into(),
            },
        )
        .await?;

        Ok(CreateReportResponse { 
            report_id: report.id, 
            message: format!(
                "Report submitted successfully. status: {}.",
                status
            ), 
            risk_score, 
            status: status.into() 
        })
    }

    /// Admin/moderator: approve or reject a report.
    ///
    /// On approval: recomputes risk score for the identifier.
    /// On rejection: decrements report count on identifier.
    pub async fn moderate_report(
        db: &PgPool,
        report_id: Uuid,
        moderator_id: Uuid,
        req: &ModerateReportRequest
    ) -> AppResult<()> {
        // Validate action
        let new_status = match req.action.as_str() {
            "approve" => STATUS_APPROVED,
            "reject" => STATUS_REJECTED,
            _ => {
                return Err(AppError::BadRequest("Action must be 'approve' or 'reject'".into()));
            }
        };

        // Fetch the report to get identifier_id
        let report = sqlx::query_as::<_, Report>(
            r#"
            SELECT * FROM reports WHERE id = $1
            "#
        )
        .bind(report_id)
        .fetch_optional(db)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Report {} not found", report_id)))?;

        if report.status != STATUS_PENDING {
            return Err(AppError::BadRequest(format!(
                "Report is already {}. Only pending reports can be moderated.",
                report.status
            )));
        }

        // Update report status
        sqlx::query::<_>(
            r#"
            UPDATE reports
            SET status = $1, moderated_by = $2, moderated_at = NOW(),
                moderation_note = $3, updated_at = NOW()
            WHERE id = $4
            "#
        )
        .bind(new_status)
        .bind(moderator_id)
        .bind(req.note.clone())
        .bind(report_id)
        .execute(db)
        .await?;

        // Apply tags to identifier if provided
        if let Some(tags) = &req.tags {
            if !tags.is_empty() {
                sqlx::query::<_>(
                    r#"UPDATE identifiers SET tags = $1 WHERE id = $2"#
                )
                .bind(tags)
                .bind(report.identifier_id)
                .execute(db)
                .await?;
            }
        }

        // Recompute the risk score on approval
        if new_status == STATUS_APPROVED {
            recompute_identifier_risk(db, report.identifier_id).await?;
        }

        // Audit log
        AuditService::log(
            db, 
            CreateAuditLog { 
                actor_id: Some(moderator_id), 
                actor_hash: None,
                action: if new_status == STATUS_APPROVED {
                    AuditAction::REPORT_APPROVED.into()
                } else {
                    AuditAction::REPORT_REJECTED.into()
                },
                entity_type: Some("report".into()), 
                entity_id: Some(report_id), 
                details: serde_json::json!({
                    "note": req.note
                }), 
                ip_address: None, 
                channel: "admin".into() 
            }
        )
        .await?;

        Ok(())
    }

    /// Fetch paginated list of pending reports for the moderation panel.
    pub async fn list_pending_reports(
        db: &PgPool,
        limit: i64,
        offset: i64,
    ) -> AppResult<Vec<Report>> {
        let reports = sqlx::query_as::<_, Report>(
            "SELECT * FROM reports WHERE status = 'pending' ORDER BY created_at ASC
            LIMIT $1 OFFSET $2",
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(db)
        .await?;
        Ok(reports)
    }

    /// Fetch all pending reports with their risk scores
    pub async fn list_pending_reports_with_risk(
        db: &PgPool,
        limit: i64,
        offset: i64,
    ) -> AppResult<Vec<AdminReportResponse>> {
        let reports = sqlx::query_as::<_, (Report, i16)>(
            r#"
            SELECT r.id, r.identifier_id, r.reporter_id, r.reporter_hash, r.scam_type,
                   r.description, r.amount_lost_ngn, r.channel, r.status,
                   r.moderated_by, r.moderated_at, r.moderation_note,
                   r.created_at, r.updated_at, i.risk_score
            FROM reports r
            JOIN identifiers i ON r.identifier_id = i.id
            WHERE r.status = 'pending'
            ORDER BY r.created_at ASC
            LIMIT $1 OFFSET $2
            "#
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(db)
        .await?;

        Ok(reports.into_iter().map(|(r, risk_score)| {
            AdminReportResponse::from_report(r, risk_score)
        }).collect())
    }

    /// Fetch all reports with their risk scores, optionally filtered by status
    pub async fn list_all_reports_with_risk(
        db: &PgPool,
        limit: i64,
        offset: i64,
        status: Option<&str>,
    ) -> AppResult<Vec<AdminReportResponse>> {
        let reports = if let Some(s) = status {
            sqlx::query_as::<_, (Report, i16)>(
                r#"
                SELECT r.id, r.identifier_id, r.reporter_id, r.reporter_hash, r.scam_type,
                       r.description, r.amount_lost_ngn, r.channel, r.status,
                       r.moderated_by, r.moderated_at, r.moderation_note,
                       r.created_at, r.updated_at, i.risk_score
                FROM reports r
                JOIN identifiers i ON r.identifier_id = i.id
                WHERE r.status = $1
                ORDER BY r.created_at DESC
                LIMIT $2 OFFSET $3
                "#
            )
            .bind(s)
            .bind(limit)
            .bind(offset)
            .fetch_all(db)
            .await?
        } else {
            sqlx::query_as::<_, (Report, i16)>(
                r#"
                SELECT r.id, r.identifier_id, r.reporter_id, r.reporter_hash, r.scam_type,
                       r.description, r.amount_lost_ngn, r.channel, r.status,
                       r.moderated_by, r.moderated_at, r.moderation_note,
                       r.created_at, r.updated_at, i.risk_score
                FROM reports r
                JOIN identifiers i ON r.identifier_id = i.id
                ORDER BY r.created_at DESC
                LIMIT $1 OFFSET $2
                "#
            )
            .bind(limit)
            .bind(offset)
            .fetch_all(db)
            .await?
        };

        Ok(reports.into_iter().map(|(r, risk_score)| {
            AdminReportResponse::from_report(r, risk_score)
        }).collect())
    }
}