// ============================================================
// Redis-backed rate limiting
//
// Uses a sliding window counter in Redis.
// Different limits apply to different endpoints:
//   - General API: 30 req/min per IP
//   - USSD endpoint: 10 req/hour per phone
//   - Report endpoint: 5 reports/hour per phone/IP
// ============================================================

use redis::{aio::ConnectionManager, AsyncCommands};
use crate::error::{AppError, AppResult};

/// Check and increment rate limit counter.
///
/// Uses a Redis key with TTL for sliding window limiting.
/// Returns Ok(remaining) if within limit, Err(RateLimitExceeded) if exceeded.
pub async fn check_rate_limit(
    redis: &mut ConnectionManager,
    key: &str,
    max_requests: u32,
    window_seconds: u64,
) -> AppResult<u32> {
    // Atomic increment + set TTL if new key
    let count: u32 = redis.incr(key, 1).await?;

    if count == 1 {
        // First request in this window -- set TTL
        let _: () = redis.expire(key, window_seconds as i64).await?;
    }

    if count > max_requests {
        tracing::warn!("Rate limit exceeded for key: {}", key);
        return Err(AppError::RateLimitExceeded);
    }

    Ok(max_requests.saturating_sub(count))
}

/// Rate limit key for IP-based limiting
pub fn ip_rate_key(ip: &str, endpoint: &str) -> String {
    let window = chrono::Utc::now().timestamp() / 60;  // Per minutes window
    format!("rl:ip:{}:{}:{}", endpoint, ip, window)
}

/// Rate limit key phone-based limiting (USSD, reports)
pub fn phone_rate_key(phone_hash: &str, endpoint: &str) -> String {
    let window = chrono::Utc::now().timestamp() / 3600;   // Per hour window
    format!("rl:phone:{}:{}:{}", endpoint, phone_hash, window)
}

/// Rate limit key for report submission (Per user) 
pub fn report_rate_key(user_id_or_hash: &str) -> String {
    let window = chrono::Utc::now().timestamp() / 3600;    // Per Hour
    format!("rl:report:{}:{}", user_id_or_hash, window)
}
