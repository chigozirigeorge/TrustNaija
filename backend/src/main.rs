// ============================================================
// TrustNaija - Nigeria-first Fraud Intelligence Platform
// main.rs - Application entry point
// ============================================================

mod models;
mod error;
mod config;
mod services;
mod utils;
mod db;
mod middleware;
mod routes;

use redis::aio::ConnectionManager;
use sqlx::PgPool;
use std::{net::SocketAddr, time};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

use crate::{
    config::AppConfig,
    db::{create_pg_pool, create_redis_client}, routes::create_router,
    
};

/// Application state shared accross all handlers via Arc.
#[derive(Clone)]
pub struct AppState {
    pub config: AppConfig,
    pub db: PgPool,
    pub redis: ConnectionManager,
    pub http_client: reqwest::Client
}

#[tokio::main]
async fn main() -> anyhow::Result<()>{
    // Load .env file in non-production environments
    let _ = dotenvy::dotenv();

    // Initiate structured logging
    tracing_subscriber::registry()
        .with(EnvFilter::try_from_default_env().unwrap_or_else(|_| {
            "trustnaija=debug, tower_http=debug, axum=trace".into()
        }))
        .with(tracing_subscriber::fmt::layer().json())
        .init();

    tracing::info!("Starting TrustNaija backend ...");

    // Load configuration from environment
    let config = AppConfig::from_env().unwrap();
    tracing::info!("Configuration loaded. Environment: {}", config.environment);

    // Connect to PostgreSQL
    let db = create_pg_pool(&config.database_url, config.database_max_connections).await.unwrap();
    tracing::info!("PostgreSQL connection pool established");

    // Run pending migrations
    sqlx::migrate!("./migrations").run(&db).await.unwrap();
    tracing::info!("Database migration applied");

    // Connect to Redis
    let redis = create_redis_client(&config.redis_url).await.unwrap();
    tracing::info!("Redis connection established");

    // Shared HTTP client for outbound API calls (Termii, etc)
    let http_client = reqwest::Client::builder()
        .timeout(time::Duration::from_secs(10))
        .user_agent("TrustNaija/1.0")
        .build()
        .unwrap();

    // Build shared application state
    let state = AppState {
        config: config.clone(),
        db,
        redis,
        http_client,
    };

    // Build the Axum router with all routes and middleware
    let app = create_router(state);

    // Bind and serve
    let addr: SocketAddr = format!("{}:{}", config.host, config.port).parse().unwrap();
    tracing::info!("TrustNaija listening on {}", addr);
    println!("TrustNaija listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();

    Ok(())
}
