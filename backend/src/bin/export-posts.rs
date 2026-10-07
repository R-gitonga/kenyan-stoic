use kenyan_stoic_api::{config::Config, models::post::PublicPost, repositories::post};
use sqlx::postgres::PgPoolOptions;
use std::{
    error::Error,
    io::{self, Write},
    time::Duration,
};

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error + Send + Sync>> {
    let config = Config::from_env()?;
    let pool = PgPoolOptions::new()
        .max_connections(1)
        .acquire_timeout(Duration::from_secs(5))
        .connect(&config.database_url)
        .await
        .map_err(|_| "Could not connect to the publication database")?;
    let posts: Vec<PublicPost> = post::all_published(&pool)
        .await
        .map_err(|_| "Could not export published posts; apply migrations first")?
        .into_iter()
        .map(PublicPost::from)
        .collect();
    serde_json::to_writer(io::stdout().lock(), &posts)?;
    io::stdout().write_all(b"\n")?;
    pool.close().await;
    Ok(())
}
