use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};

use crate::{AppState, services::ml_engine::{MLEngine, MLModel, DetectedPattern}, middleware::auth::AdminUser};

/// Request for anomaly detection
#[derive(Debug, Deserialize)]
pub struct AnomalyRequest {
    /// Hours to look back for patterns
    #[serde(default = "default_lookback")]
    pub lookback_hours: i64,
}

fn default_lookback() -> i64 {
    24
}

/// Response containing analysis results
#[derive(Debug, Serialize)]
pub struct AnalysisResponse {
    pub patterns: Vec<DetectedPattern>,
    pub anomalies_count: usize,
    pub high_risk_patterns: usize,
}

/// Health check for ML engine
#[tracing::instrument(skip(state))]
pub async fn ml_health(
    State(state): State<AppState>,
    AdminUser(_): AdminUser,
) -> impl IntoResponse {
    match sqlx::query("SELECT COUNT(*) FROM reports WHERE status = 'approved'")
        .fetch_one(&state.db)
        .await
    {
        Ok(_) => Json(serde_json::json!({
            "status": "healthy",
            "message": "ML engine ready"
        }))
        .into_response(),
        Err(e) => {
            tracing::error!("ML health check failed: {}", e);
            (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(serde_json::json!({
                    "status": "unhealthy",
                    "error": e.to_string()
                })),
            )
                .into_response()
        }
    }
}

/// Train the ML model on historical data
#[tracing::instrument(skip(state))]
pub async fn train_model(
    State(state): State<AppState>,
    AdminUser(_): AdminUser,
) -> impl IntoResponse {
    tracing::info!("Training ML model...");

    match MLModel::train_from_database(&state.db).await {
        Ok(model) => {
            let report_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM reports")
                .fetch_one(&state.db)
                .await
                .unwrap_or((0,));

            Json(serde_json::json!({
                "status": "success",
                "message": "Model trained successfully",
                "trained_on_reports": report_count.0,
                "timestamp": chrono::Utc::now(),
                "scam_types_learned": model.scam_type_distribution.len(),
            }))
            .into_response()
        }
        Err(e) => {
            tracing::error!("Model training failed: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "status": "error",
                    "error": e.to_string()
                })),
            )
                .into_response()
        }
    }
}

/// Analyze patterns in recent reports
#[tracing::instrument(skip(state))]
pub async fn analyze_patterns(
    State(state): State<AppState>,
    AdminUser(_): AdminUser,
    Query(req): Query<AnomalyRequest>,
) -> impl IntoResponse {
    tracing::info!("Analyzing patterns with {}h lookback", req.lookback_hours);

    // Train model on latest data
    let model = match MLModel::train_from_database(&state.db).await {
        Ok(m) => m,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "status": "error",
                    "error": e.to_string()
                })),
            )
                .into_response()
        }
    };

    let engine = MLEngine::new(model);

    match engine.detect_anomalies(&state.db, req.lookback_hours).await {
        Ok(patterns) => {
            let high_risk = patterns.iter().filter(|p| p.confidence > 0.7).count();

            Json(serde_json::json!({
                "status": "success",
                "patterns_detected": patterns.len(),
                "high_risk_patterns": high_risk,
                "patterns": patterns,
                "timestamp": chrono::Utc::now(),
            }))
            .into_response()
        }
        Err(e) => {
            tracing::error!("Pattern analysis failed: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "status": "error",
                    "error": e.to_string()
                })),
            )
                .into_response()
        }
    }
}

/// Get next predicted scam wave
#[tracing::instrument(skip(state))]
pub async fn predict_wave(
    State(state): State<AppState>,
    AdminUser(_): AdminUser,
) -> impl IntoResponse {
    tracing::info!("Predicting next scam wave...");

    let model = match MLModel::train_from_database(&state.db).await {
        Ok(m) => m,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "status": "error",
                    "error": e.to_string()
                })),
            )
                .into_response()
        }
    };

    let engine = MLEngine::new(model);

    match engine.predict_next_wave() {
        Some(prediction) => Json(serde_json::json!({
            "status": "success",
            "prediction": prediction,
            "timestamp": chrono::Utc::now(),
        }))
        .into_response(),
        None => Json(serde_json::json!({
            "status": "insufficient_data",
            "message": "Not enough historical data for prediction",
            "timestamp": chrono::Utc::now(),
        }))
        .into_response(),
    }
}

/// Get anomaly score for an identifier
#[tracing::instrument(skip(state))]
pub async fn check_anomaly(
    State(state): State<AppState>,
    AdminUser(_): AdminUser,
    Path(identifier): Path<String>,
) -> impl IntoResponse {
    tracing::info!("Computing anomaly score for: {}", identifier);

    let model = match MLModel::train_from_database(&state.db).await {
        Ok(m) => m,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "status": "error",
                    "error": e.to_string()
                })),
            )
                .into_response()
        }
    };

    let engine = MLEngine::new(model);

    match engine.compute_anomaly_score(&state.db, &identifier).await {
        Ok(score) => Json(serde_json::json!({
            "status": "success",
            "identifier": identifier,
            "anomaly_score": score.anomaly_score,
            "reason": score.reason,
            "is_anomalous": score.is_anomalous,
            "timestamp": chrono::Utc::now(),
        }))
        .into_response(),
        Err(e) => {
            tracing::error!("Anomaly computation failed: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "status": "error",
                    "error": e.to_string()
                })),
            )
                .into_response()
        }
    }
}

/// Get volume forecast for next 7 days
#[tracing::instrument(skip(state))]
pub async fn forecast_volumes(
    State(state): State<AppState>,
    AdminUser(_): AdminUser,
) -> impl IntoResponse {
    tracing::info!("Computing volume forecast...");

    let model = match MLModel::train_from_database(&state.db).await {
        Ok(m) => m,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "status": "error",
                    "error": e.to_string()
                })),
            )
                .into_response()
        }
    };

    let engine = MLEngine::new(model);
    let forecast = engine.forecast_volume();

    Json(serde_json::json!({
        "status": "success",
        "forecast": forecast,
        "period": "next_7_days",
        "timestamp": chrono::Utc::now(),
    }))
    .into_response()
}
