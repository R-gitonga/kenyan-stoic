use crate::{error::AppError, models::health::ReadinessResponse, repositories};
use sqlx::PgPool;

pub async fn readiness(pool: &PgPool) -> Result<ReadinessResponse, AppError> {
    repositories::health::check_connection(pool)
        .await
        .map_err(|_| {
            // Do not log connection strings or driver errors that may contain credentials.
            tracing::warn!("Database readiness check failed");
            AppError::DatabaseUnavailable
        })?;
    Ok(ReadinessResponse {
        status: "ready",
        database: "connected",
    })
}
