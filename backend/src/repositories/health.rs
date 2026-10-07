use sqlx::PgPool;

pub async fn check_connection(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query_scalar::<_, i32>("SELECT 1")
        .fetch_one(pool)
        .await?;
    Ok(())
}
