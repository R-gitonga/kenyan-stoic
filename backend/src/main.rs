use kenyan_stoic_api::{app_state::AppState, config::Config, routes};
use sqlx::postgres::PgPoolOptions;
use std::{error::Error, time::Duration};
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error + Send + Sync>> {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .init();
    let config = Config::from_env()?;
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .acquire_timeout(Duration::from_secs(5))
        .connect(&config.database_url)
        .await
        .map_err(
            |_| "Could not connect to PostgreSQL; check DATABASE_URL and database availability",
        )?;
    tracing::info!("PostgreSQL connection established");
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .map_err(|_| "Database migration failed; inspect the schema and migration history")?;
    let listener = tokio::net::TcpListener::bind(config.listen_addr).await?;
    tracing::info!(address = %config.listen_addr, "API listening");
    axum::serve(listener, routes::router(AppState { pool: pool.clone() }))
        .with_graceful_shutdown(async {
            if tokio::signal::ctrl_c().await.is_err() {
                tracing::warn!("Shutdown signal listener failed");
            }
        })
        .await?;
    pool.close().await;
    Ok(())
}
