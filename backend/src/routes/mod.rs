// ============================================================
// routes/mod.rs - Axum router setup with all routes and middleware
// ============================================================

pub mod admin;
pub mod auth;
pub mod lookup;
pub mod report;
pub mod ussd;
pub mod health;
pub mod sms;

use axum::{
    routing::{get, post},
    Router,
};
use tower_http::{
    cors::{Any, CorsLayer},
    trace::TraceLayer,
    limit::RequestBodyLimitLayer,
};
use crate::{AppState, routes::{admin::{get_identifier, list_audit_logs, list_all_reports, list_pending_reports, moderate_report}, auth::{get_profile, initiate_registration, verify_otp}, health::health_check, lookup::lookup_identifier, report::create_report, sms::send_sms, ussd::handle_ussd}};

/// Build the complete Axum application router
/// All routes, middleware layers, and CORS are configured here
pub fn create_router(state: AppState) -> Router {
    // Max request body: 1MB (10MB for evidence uploads handled seperately)
    let body_limit = RequestBodyLimitLayer::new(1_048_576);

    // CORS -- restrict in production
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    Router::new()
        // ── Health check (no auth) ─────────────────────────────
        .route("/health", get(health_check))
        .route("/", get(health_check))

        // ── Authentication ─────────────────────────────────────
        .route("/auth/register", post(initiate_registration))
        .route("/auth/verify", post(verify_otp))

        // ── Core API ─────────────────────────────────────
        .route("/report", post(create_report))
        .route("/lookup", get(lookup_identifier))

        // ── USSD Gateway ─────────────────────────────────────
        // USSD must respond within 15 seconds -- kept ultra-fast
        .route("/ussd", post(handle_ussd))

        // ── SMS (internal/ admin only) ─────────────────────────────────────
        .route("/send_sms", post(send_sms))

        // ── Admin Panel ──────────────────────────────────────────
        .route("/admin/reports/pending", get(list_pending_reports))
        .route("/admin/reports", get(list_all_reports))
        .route("/admin/reports/:id/moderate", post(moderate_report))
        .route("/admin/audit-logs", get(list_audit_logs))
        .route("/admin/identifiers/:id", get(get_identifier))

        // ── User Profile ──────────────────────────────────────────
        .route("/me", get(get_profile))

        // ── Middleware ──────────────────────────────────────────
        .layer(TraceLayer::new_for_http())
        .layer(cors)
        .layer(body_limit)
        .with_state(state)

}
