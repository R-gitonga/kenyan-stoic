use crate::models::post::{PostSummary, PublishedPostRow};
use sqlx::PgPool;

pub async fn all_published(pool: &PgPool) -> Result<Vec<PublishedPostRow>, sqlx::Error> {
    sqlx::query_as::<_, PublishedPostRow>(
        "SELECT id, slug, title, excerpt, body_markdown, kind, published_at FROM posts WHERE status = 'published' ORDER BY published_at DESC, id DESC"
    ).fetch_all(pool).await
}

pub async fn published_page(
    pool: &PgPool,
    limit: i64,
    offset: i64,
) -> Result<(i64, Vec<PostSummary>), sqlx::Error> {
    let mut transaction = pool.begin().await?;
    sqlx::query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY")
        .execute(&mut *transaction)
        .await?;
    let total =
        sqlx::query_scalar::<_, i64>("SELECT count(*) FROM posts WHERE status = 'published'")
            .fetch_one(&mut *transaction)
            .await?;
    let items = sqlx::query_as::<_, PostSummary>("SELECT id, slug, title, excerpt, kind, published_at FROM posts WHERE status = 'published' ORDER BY published_at DESC, id DESC LIMIT $1 OFFSET $2")
        .bind(limit).bind(offset).fetch_all(&mut *transaction).await?;
    transaction.commit().await?;
    Ok((total, items))
}

pub async fn find_published_by_slug(
    pool: &PgPool,
    slug: &str,
) -> Result<Option<PublishedPostRow>, sqlx::Error> {
    sqlx::query_as::<_, PublishedPostRow>(
        "SELECT id, slug, title, excerpt, body_markdown, kind, published_at
         FROM posts WHERE slug = $1 AND status = 'published'",
    )
    .bind(slug)
    .fetch_optional(pool)
    .await
}
