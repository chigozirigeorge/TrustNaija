// ============================================================
// Pattern correlation and risk scoring
//
// Risk Score Algorithm (0-100):
//
// Base components:
//   - Report count:        Up to 40 points (logarithmic curve)
//   - Report recency:      Up to 20 points (recent reports = higher risk)
//   - Scam type severity:  Up to 20 points (investment > romance > phishing)
//   - Reporter reputation: Up to 10 points (trusted reporters weight more)
//   - Amount lost:         Up to 10 points (higher losses = higher score)
//
// Total: 100 points max.
// Scores are recomputed asynchronously after each approved report.
// ============================================================

use chrono::{DateTime, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use crate::error::{AppResult, AppError};

/// Input used to compute risk score for an identifier
#[derive(Debug, sqlx::FromRow)]
pub struct RiskInputs {
    pub identifier_id: Uuid,
    pub total_reports: i64,
    pub approved_reports: i64,
    pub trusted_reporter_count: i64,
    pub most_recent_report: Option<DateTime<Utc>>,
    pub oldest_report: Option<DateTime<Utc>>,
    pub total_amount_lost_ngn: Option<i64>,   // In kobo
    pub scam_types: Vec<String>
}

/// Calculate a single report's contribution to the overall risk score.
/// This is stored in the reports table for audit trail purposes.
/// 
/// Returns a value 0-100 representing how much this specific report
/// contributes to the identifier's overall risk score.
pub fn calculate_report_contribution(
    scam_type: &str,
    amount_lost_ngn: Option<i64>,
    reporter_is_trusted: bool,
    days_since_report: i64,
) -> i16 {
    let mut contribution: f64 = 0.0;

    // Base contribution from scam type (0-30 pts)
    let type_weight = match scam_type {
        "investment" => 30.0,
        "impersonation" => 28.0,
        "phishing" => 25.0,
        "loan_fraud" => 25.0,
        "romance" => 20.0,
        "online_shopping" => 15.0,
        "job_offer" => 15.0,
        _ => 12.0
    };
    contribution += type_weight;

    // Recency bonus (0-20 pts)
    let recency = match days_since_report {
        0..=7 => 20.0,
        8..=30 => 15.0,
        31..=90 => 10.0,
        _ => 5.0,
    };
    contribution += recency;

    // Amount lost bonus (0-20 pts)
    if let Some(total_kobo) = amount_lost_ngn {
        let total_ngn = total_kobo / 100;
        let loss_score = match total_ngn {
            0..=10_000 => 5.0,
            10_001..=100_000 => 10.0,
            100_001..=500_000 => 15.0,
            _ => 20.0,
        };
        contribution += loss_score;
    }

    // Trusted reporter boost (0-10 pts)
    if reporter_is_trusted {
        contribution += 10.0;
    }

    // Cap at 100 (though it shouldn't reach this)
    (contribution.min(100.0) as i16)
}

/// Compute a risk score (0-100) from aggregated report data.
///
/// This function implements the core pattern correlation logic.
/// It is designed to be conservative — we'd rather have a lower
/// false-positive rate than alarm users unnecessarily.
pub fn compute_risk_score(inputs: &RiskInputs) -> i16 {
    if inputs.approved_reports == 0 {
        return 0;
    }

    let mut score: f64 = 0.0;

    // ── Component 1: Report Volume (0-40 pts) ─────────────────
    // Uses log scale so 1 report doesn't feel the same as 100.
    // log2(n) * 10, capped at 40
    let volume_score = (inputs.approved_reports as f64).log2() * 10.0;
    score += volume_score.min(40.0);

     // ── Component 2: Recency (0-20 pts) ───────────────────────
    // If most recent report was within 7 days → 20 pts
    // Within 30 days → 15 pts, 90 days → 10 pts, older → 5 pts
    if let Some(most_recent) = inputs.most_recent_report {
        let days_ago = (Utc::now() - most_recent).num_days();
        let recency = match days_ago {
            0..=7 => 20.0,
            8..=30 => 15.0,
            31..=90 => 10.0,
            _=> 5.0,
        };
        score += recency;
    }

    // ── Component 3: Scam Type Severity (0-20 pts) ────────────
    // investment/ponzi schemes and impersonation are most severe
    let severity = inputs
        .scam_types
        .iter()
        .map(|t| match t.as_str() {
            "investment" => 20.0,
            "impersonation" => 18.0,
            "phishing" => 15.0,
            "loan_fraud" => 15.0,
            "romance" => 12.0,
            "online_shopping" => 10.0,
            "job_offer" => 10.0,
            _ => 8.0
        })
        .fold(0.0_f64, f64::max);  // Take the worst scam type
    score += severity;

     // ── Component 4: Trusted Reporter Boost (0-10 pts) ────────
    // Reports from verified trusted reporters increase confidence
    let trusted_boost = match inputs.trusted_reporter_count {
        0 => 0.0,
        1 => 5.0,
        2..=4 => 7.0,
        _ => 10.0,
    };
    score += trusted_boost;

    // ── Component 5: Financial Loss (0-10 pts) ────────────────
    // Higher total losses correlate with more organized scams
    if let Some(total_kobo) = inputs.total_amount_lost_ngn {
        let total_ngn = total_kobo / 100;       // convert kobo to naira
        let loss_score = match total_ngn {
            0..=9_999 => 0.0,       // < 10k Naira
            10_000..=99_999 => 3.0,  // 10k -> 100k naira
            100_000..=999_999 => 6.0, // 100k -> 1M naira
            _ => 10.0,
        };
        score += loss_score;
    }

    // Clamp to 0-100 and return as i16
    score.round().clamp(0.0, 100.0) as i16
}

/// Recompute and update the risk score for an identifier in the database.
/// Called asynchronously after report approval.
pub async fn recompute_identifier_risk(
    db: &PgPool,
    identifier_id: Uuid,
) -> AppResult<i16> {
    // Gather all data needed for scoring in one query
    let inputs = sqlx::query_as::<_, RiskInputs>(
        r#"
        SELECT 
            r.identifier_id,
            COUNT(*) as "total_reports!",
            COUNT(*) FILTER (WHERE r.status = 'approved') as "approved_reports!",
            COUNT(u.id) FILTER (WHERE u.is_trusted = TRUE AND r.status = 'approved') as "trusted_reporter_count!",
            MAX(r.created_at) as "most_recent_report?",
            MIN(r.created_at) as "oldest_report?",
            SUM(r.amount_lost_ngn) as "total_amount_lost_ngn?",
            ARRAY_AGG(DISTINCT r.scam_type) FILTER (WHERE r.status = 'approved') as "scam_types!"
        FROM reports r
        LEFT JOIN users u ON u.id = r.reporter_id
        WHERE r.identifier_id = $1
        GROUP BY r.identifier_id
        "#
    )
    .bind(identifier_id)
    .fetch_optional(db)
    .await?;

    let new_score = if let Some(inputs) = inputs {
        let score = compute_risk_score(&inputs);
        tracing::info!(
            "Risk score for identifier {}: {} (approved_reports: {}, total_reports: {})",
            identifier_id,
            score,
            inputs.approved_reports,
            inputs.total_reports
        );
        score
    } else {
        tracing::warn!(
            "No reports found for identifier {}, setting risk_score to 0",
            identifier_id
        );
        0
    };

    // Update the identifier's risk score
    sqlx::query::<_>(
        "UPDATE identifiers SET risk_score = $1, updated_at = NOW() WHERE id = $2"
    )
    .bind(new_score)
    .bind(identifier_id)
    .execute(db)
    .await?;

    tracing::debug!(
        "Recomputed risk score for identifier {}: {}",
        identifier_id,
        new_score
    );

    Ok(new_score)
}

/// Compute immediate risk score including PENDING reports.
///
/// This is called immediately after a new report is submitted.
/// It includes pending reports so users see the impact right away.
/// The final score gets locked when an admin approves the report.
pub async fn compute_immediate_risk_score(
    db: &PgPool,
    identifier_id: Uuid,
) -> AppResult<i16> {
    // Gather all data including PENDING reports
    let inputs = sqlx::query_as::<_, RiskInputs>(
        r#"
        SELECT 
            r.identifier_id,
            COUNT(*) as total_reports,
            COUNT(*) FILTER (WHERE r.status = 'approved') as approved_reports,
            COUNT(u.id) FILTER (WHERE u.is_trusted = TRUE AND r.status = 'approved') as trusted_reporter_count,
            MAX(r.created_at) as most_recent_report,
            MIN(r.created_at) as oldest_report,
            SUM(r.amount_lost_ngn) as total_amount_lost_ngn,
            ARRAY_AGG(DISTINCT r.scam_type) FILTER (WHERE r.status = 'approved' OR r.status = 'pending') as scam_types
        FROM reports r
        LEFT JOIN users u ON u.id = r.reporter_id
        WHERE r.identifier_id = $1
        GROUP BY r.identifier_id
        "#
    )
    .bind(identifier_id)
    .fetch_optional(db)
    .await?;

    let new_score = if let Some(mut inputs) = inputs {
        // For immediate score: count all reports (approved + pending) but weight conservatively
        // We use approved_reports for the calculation but include pending in total
        let total_count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM reports WHERE identifier_id = $1"
        )
        .bind(identifier_id)
        .fetch_one(db)
        .await?;

        // Temporarily boost approved_reports to include pending ones (50% weight for pending)
        let pending_count = total_count - inputs.approved_reports;
        inputs.approved_reports = inputs.approved_reports + (pending_count / 2);

        let score = compute_risk_score(&inputs);
        tracing::info!(
            "Immediate risk score for identifier {}: {} (approved: {}, pending: {}, total: {})",
            identifier_id,
            score,
            inputs.approved_reports - (pending_count / 2),
            pending_count,
            total_count
        );
        score
    } else {
        tracing::warn!(
            "No reports found for identifier {}, setting immediate risk_score to 0",
            identifier_id
        );
        0
    };

    // Update the identifier's risk score in the database
    let update_result = sqlx::query::<_>(
        "UPDATE identifiers SET risk_score = $1, updated_at = NOW() WHERE id = $2"
    )
    .bind(new_score)
    .bind(identifier_id)
    .execute(db)
    .await;

    match update_result {
        Ok(result) => {
            tracing::debug!(
                "Updated immediate risk score for identifier {}: {} (rows affected: {})",
                identifier_id,
                new_score,
                result.rows_affected()
            );
        }
        Err(e) => {
            tracing::error!(
                "Failed to update risk score for identifier {}: {:?}",
                identifier_id,
                e
            );
            return Err(AppError::Database(e));
        }
    }

    Ok(new_score)
}


#[cfg(test)]
mod tests {
    use chrono::Duration;

    use super::*;

    fn make_inputs(reports: i64, days_ago: i64, scam_type: &str) -> RiskInputs {
        RiskInputs {
            identifier_id: Uuid::new_v4(),
            total_reports: reports,
            approved_reports: reports,
            trusted_reporter_count: 0,
            most_recent_report: Some(Utc::now() - Duration::days(days_ago)),
            oldest_report: Some(Utc::now() - Duration::days(days_ago + 10)),
            total_amount_lost_ngn: None,
            scam_types: vec![scam_type.into()],
        }
    }

    #[test]
    fn test_zero_reports_zero_score() {
        let mut inputs = make_inputs(0, 1, "other");
        inputs.approved_reports = 0;
        assert_eq!(compute_risk_score(&inputs), 0);
    }

    #[test]
    fn test_single_recent_report_medium_score() {
        let inputs = make_inputs(1, 2, "phishing");
        let score = compute_risk_score(&inputs);
        assert!(score > 30 && score < 60, "Score was {}", score);
    }

    #[test]
    fn test_high_volume_investment_scam() {
        let inputs = make_inputs(100, 1, "investment");
        let score = compute_risk_score(&inputs);
        assert!(score >= 70, "Expected high risk, got {}", score);
    }

    #[test]
    fn test_old_reports_lower_score() {
        let recent = make_inputs(5, 3, "phishing");
        let old = make_inputs(5, 200, "phishing");
        assert!(
            compute_risk_score(&recent) > compute_risk_score(&old),
            "Recent reports should score higher"
        );
    }
}
