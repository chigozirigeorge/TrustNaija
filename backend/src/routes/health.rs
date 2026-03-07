// ============================================================
// routes/health.rs - Health check endpoint
// ============================================================

use axum::{extract::State, Json};
use serde_json::Value;
use crate::AppState;

/// GET /health
///
/// Returns service status and connectivity to dependencies.
/// Used by load balancers and monitoring systems.
pub async fn health_check(State(state): State<AppState>) -> Json<Value> {
    // check DB connectivity
    let db_ok = sqlx::query::<_>(
        "SELECT 1"
    )
    .execute(&state.db)
    .await
    .is_ok();

    // check the redis connectivity
    let redis_ok = {
        let mut redis = state.redis.clone();
        redis::cmd("PING")
            .query_async::< String>(&mut redis)
            .await
            .map(|r| r == "PONG")
            .unwrap_or(false)
    };

    let status = if db_ok && redis_ok { "ok" } else { "degraded" };

    Json(serde_json::json!({
        "status": status,
        "service": "TrustNaija API",
        "version": env!("CARGO_PKG_VERSION"),
        "checks": {
            "database": if db_ok { "ok" } else { "error" },
            "redis": if redis_ok {"ok"} else { "error"}
        }
    }))
}