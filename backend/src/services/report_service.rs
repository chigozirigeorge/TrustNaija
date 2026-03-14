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
        lookup_service::LookupService,
        risk_engine::{recompute_identifier_risk, compute_immediate_risk_score},
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
        .await
        .map_err(|e| {
            tracing::error!("Failed to insert report: {:?}", e);
            e
        })?;

        tracing::info!("Report created successfully: id={}, identifier_id={}, status={}", report.id, identifier.id, report.status);

        // compute updated risk score immediately (includes pending reports)
        let risk_score = compute_immediate_risk_score(db, identifier.id).await?;

        // Handle dependent fields - create additional reports for related identifiers
        if req.identifier_type == "bank_account" && req.bank_name.is_some() {
            // Also create/update a bank_name identifier
            let bank_name = req.bank_name.as_ref().unwrap();
            let bank_normalized = format!("bank:{}", bank_name.to_lowercase());
            let bank_hash = hash_identifier(&bank_normalized);

            let bank_identifier: Identifier = sqlx::query_as::<_, Identifier>(
                r#"
                INSERT INTO identifiers (canonical_value, identifier_type, raw_hash)
                VALUES ($1, 'bank_name', $2)
                ON CONFLICT (canonical_value) DO UPDATE
                    SET last_seen_at = NOW(),
                        report_count = identifiers.report_count + 1,
                        updated_at = NOW()
                    RETURNING *
                "#
            )
            .bind(&bank_normalized)
            .bind(&bank_hash)
            .fetch_one(db)
            .await?;

            // Create a linked report for the bank
            let _ = sqlx::query_as::<_, Report>(
                r#"
                INSERT INTO reports 
                    (identifier_id, reporter_id, reporter_hash, scam_type, description, amount_lost_ngn, channel, status)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *
                "#
            )
            .bind(bank_identifier.id)
            .bind(reporter_id)
            .bind(reporter_hash.clone())
            .bind(req.scam_type.clone())
            .bind(req.description.clone())
            .bind(amount_kobo)
            .bind(channel)
            .bind(status)
            .fetch_one(db)
            .await?;

            let _ = compute_immediate_risk_score(db, bank_identifier.id).await;
        }

        if req.identifier_type == "company_name" && req.company_website.is_some() {
            // Also create/update a company_website identifier
            let website = req.company_website.as_ref().unwrap();
            let website_normalized = website.to_lowercase();
            let website_hash = hash_identifier(&website_normalized);

            let website_identifier: Identifier = sqlx::query_as::<_, Identifier>(
                r#"
                INSERT INTO identifiers (canonical_value, identifier_type, raw_hash)
                VALUES ($1, 'company_website', $2)
                ON CONFLICT (canonical_value) DO UPDATE
                    SET last_seen_at = NOW(),
                        report_count = identifiers.report_count + 1,
                        updated_at = NOW()
                    RETURNING *
                "#
            )
            .bind(&website_normalized)
            .bind(&website_hash)
            .fetch_one(db)
            .await?;

            // Create a linked report for the website
            let _ = sqlx::query_as::<_, Report>(
                r#"
                INSERT INTO reports 
                    (identifier_id, reporter_id, reporter_hash, scam_type, description, amount_lost_ngn, channel, status)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *
                "#
            )
            .bind(website_identifier.id)
            .bind(reporter_id)
            .bind(reporter_hash.clone())
            .bind(req.scam_type.clone())
            .bind(req.description.clone())
            .bind(amount_kobo)
            .bind(channel)
            .bind(status)
            .fetch_one(db)
            .await?;

            let _ = compute_immediate_risk_score(db, website_identifier.id).await;
        }

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
        redis: &mut redis::aio::ConnectionManager,
        report_id: Uuid,
        moderator_id: Uuid,
        req: &ModerateReportRequest,
        ip_address: Option<String>
    ) -> AppResult<()> {
        // Start transaction to ensure atomicity
        let mut tx = db.begin().await?;

        // Validate action
        let new_status = match req.action.as_str() {
            "approve" => STATUS_APPROVED,
            "reject" => STATUS_REJECTED,
            _ => {
                return Err(AppError::BadRequest("Action must be 'approve' or 'reject'".into()));
            }
        };

        // Fetch the report to get identifier_id (with locking to prevent race conditions)
        let report = sqlx::query_as::<_, Report>(
            r#"
            SELECT * FROM reports WHERE id = $1 FOR UPDATE
            "#
        )
        .bind(report_id)
        .fetch_optional(&mut *tx)
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
        .execute(&mut *tx)
        .await?;

        // Apply tags to identifier if provided
        if let Some(tags) = &req.tags {
            if !tags.is_empty() {
                sqlx::query::<_>(
                    r#"UPDATE identifiers SET tags = $1 WHERE id = $2"#
                )
                .bind(tags)
                .bind(report.identifier_id)
                .execute(&mut *tx)
                .await?;
            }
        }

        // Recompute the risk score on approval
        if new_status == STATUS_APPROVED {
            // Calculate this report's contribution to overall risk
            let reporter_is_trusted: bool = if let Some(reporter_id) = report.reporter_id {
                sqlx::query_scalar::<_, bool>("SELECT is_trusted FROM users WHERE id = $1")
                    .bind(reporter_id)
                    .fetch_optional(&mut *tx)
                    .await?
                    .unwrap_or(false)
            } else {
                false
            };
            
            let days_since = (chrono::Utc::now() - report.created_at).num_days();
            let contribution = crate::services::risk_engine::calculate_report_contribution(
                &report.scam_type,
                report.amount_lost_ngn,
                reporter_is_trusted,
                days_since,
            );
            
            // Store the contribution in the report
            sqlx::query::<_>("UPDATE reports SET risk_contribution = $1 WHERE id = $2")
                .bind(contribution)
                .bind(report_id)
                .execute(&mut *tx)
                .await?;
            
            tracing::info!(
                "Report {} approved with risk_contribution: {}",
                report_id,
                contribution
            );
        }

        // Commit transaction before cache invalidation (so DB is definitely updated)
        tx.commit().await?;

        // ──── OPERATIONS AFTER COMMIT (outside transaction) ────
        
        // Recompute risk if approved (happens after transaction is committed)
        if new_status == STATUS_APPROVED {
            // Recompute the overall identifier risk score
            if let Err(e) = recompute_identifier_risk(db, report.identifier_id).await {
                tracing::error!("Failed to recompute risk for identifier {}: {}", report.identifier_id, e);
                // Don't fail the moderation if risk recomputation fails
            }

            // Get the canonical identifier value for cache invalidation
            let identifier: Option<(String,)> = sqlx::query_as(
                "SELECT canonical_value FROM identifiers WHERE id = $1"
            )
            .bind(report.identifier_id)
            .fetch_optional(db)
            .await
            .unwrap_or(None);
            
            // Invalidate lookup cache so new risk score is fetched on next lookup
            if let Some((canonical,)) = identifier {
                let _ = LookupService::invalidate_cache(redis, &canonical).await;
            }
        }

        // Audit log with IP address and identifier info (after commit)
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
                    "note": req.note,
                    "identifier_id": report.identifier_id.to_string()
                }), 
                ip_address, 
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
        let rows = sqlx::query!(
            r#"
            SELECT r.id, r.identifier_id, r.scam_type, r.description, r.amount_lost_ngn,
                   r.channel, r.status, r.created_at, i.risk_score
            FROM reports r
            JOIN identifiers i ON r.identifier_id = i.id
            WHERE r.status = 'pending'
            ORDER BY r.created_at ASC
            LIMIT $1 OFFSET $2
            "#,
            limit,
            offset
        )
        .fetch_all(db)
        .await?;

        Ok(rows.into_iter().map(|row| {
            AdminReportResponse {
                id: row.id,
                identifier_id: row.identifier_id,
                scam_type: row.scam_type,
                description: row.description,
                amount_lost_ngn: row.amount_lost_ngn,
                channel: row.channel,
                status: row.status,
                created_at: row.created_at,
                risk_score: row.risk_score,
            }
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
            let rows = sqlx::query!(
                r#"
                SELECT r.id, r.identifier_id, r.scam_type, r.description, r.amount_lost_ngn,
                       r.channel, r.status, r.created_at, i.risk_score
                FROM reports r
                JOIN identifiers i ON r.identifier_id = i.id
                WHERE r.status = $1
                ORDER BY r.created_at DESC
                LIMIT $2 OFFSET $3
                "#,
                s,
                limit,
                offset
            )
            .fetch_all(db)
            .await?;
            
            rows.into_iter().map(|row| {
                AdminReportResponse {
                    id: row.id,
                    identifier_id: row.identifier_id,
                    scam_type: row.scam_type,
                    description: row.description,
                    amount_lost_ngn: row.amount_lost_ngn,
                    channel: row.channel,
                    status: row.status,
                    created_at: row.created_at,
                    risk_score: row.risk_score,
                }
            }).collect::<Vec<_>>()
        } else {
            let rows = sqlx::query!(
                r#"
                SELECT r.id, r.identifier_id, r.scam_type, r.description, r.amount_lost_ngn,
                       r.channel, r.status, r.created_at, i.risk_score
                FROM reports r
                JOIN identifiers i ON r.identifier_id = i.id
                ORDER BY r.created_at DESC
                LIMIT $1 OFFSET $2
                "#,
                limit,
                offset
            )
            .fetch_all(db)
            .await?;
            
            rows.into_iter().map(|row| {
                AdminReportResponse {
                    id: row.id,
                    identifier_id: row.identifier_id,
                    scam_type: row.scam_type,
                    description: row.description,
                    amount_lost_ngn: row.amount_lost_ngn,
                    channel: row.channel,
                    status: row.status,
                    created_at: row.created_at,
                    risk_score: row.risk_score,
                }
            }).collect::<Vec<_>>()
        };

        Ok(reports)
    }

    /// Get a single report by ID with its identifier's risk score
    pub async fn get_report_by_id(
        db: &PgPool,
        report_id: Uuid,
    ) -> AppResult<AdminReportResponse> {
        let row = sqlx::query!(
            r#"
            SELECT r.id, r.identifier_id, r.scam_type, r.description, r.amount_lost_ngn,
                   r.channel, r.status, r.created_at, i.risk_score
            FROM reports r
            JOIN identifiers i ON r.identifier_id = i.id
            WHERE r.id = $1
            "#,
            report_id
        )
        .fetch_one(db)
        .await
        .map_err(|_| AppError::NotFound(format!("Report {} not found", report_id)))?;

        Ok(AdminReportResponse {
            id: row.id,
            identifier_id: row.identifier_id,
            scam_type: row.scam_type,
            description: row.description,
            amount_lost_ngn: row.amount_lost_ngn,
            channel: row.channel,
            status: row.status,
            created_at: row.created_at,
            risk_score: row.risk_score,
        })
    }
}