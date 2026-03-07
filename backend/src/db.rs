// ============================================================
// Database connection pool setup for PostgreSQL and Redis
// ============================================================

use std::time::Duration;

use anyhow::Result;
use sqlx::{PgPool, postgres::PgPoolOptions};
use redis::{Client, aio::ConnectionManager};

/// Create a PostgreSQL connection pool using SQLx.
/// Uses async connection handling via tokio runtime.
pub async fn create_pg_pool(database_url: &str, max_connections: u32) -> Result<PgPool> {
    let pool = PgPoolOptions::new()
        .max_connections(max_connections)
        .min_connections(2)
        .acquire_timeout(Duration::from_secs(10))
        .idle_timeout(Duration::from_secs(300))
        .connect(database_url)
        .await?;

    Ok(pool)
}

/// Create a Redis connection manager.
/// Uses a single multiplexed async connection - safe to clone across tasks.
pub async fn create_redis_client(redis_url: &str) -> Result<ConnectionManager> {
    let client = Client::open(redis_url)?;
    let manager = ConnectionManager::new(client).await?;
    Ok(manager)
}