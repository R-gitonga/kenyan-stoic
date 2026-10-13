use crate::models::draft::{CreateDraft, Draft, DraftSummary};
use chrono::{DateTime, Utc};
use sqlx::{PgConnection, PgPool};
use uuid::Uuid;

pub async fn insert(
    connection: &mut PgConnection,
    input: &CreateDraft,
) -> Result<Option<Draft>, sqlx::Error> {
    sqlx::query_as::<_, Draft>("INSERT INTO posts (id, title, slug, excerpt, kind, body_markdown, status, published_at) VALUES ($1, $2, $3, $4, $5, $6, 'draft', NULL) ON CONFLICT (id) DO NOTHING RETURNING id, title, slug, excerpt, kind, body_markdown, status, published_at, created_at, updated_at")
        .bind(input.id).bind(&input.title).bind(&input.slug).bind(&input.excerpt).bind(input.kind.as_str()).bind(&input.body_markdown).fetch_optional(connection).await
}

pub async fn find_on(
    connection: &mut PgConnection,
    id: Uuid,
) -> Result<Option<Draft>, sqlx::Error> {
    sqlx::query_as::<_, Draft>("SELECT id, title, slug, excerpt, kind, body_markdown, status, published_at, created_at, updated_at FROM posts WHERE id = $1 AND status = 'draft'")
        .bind(id).fetch_optional(connection).await
}

pub async fn find(pool: &PgPool, id: Uuid) -> Result<Option<Draft>, sqlx::Error> {
    let mut connection = pool.acquire().await?;
    find_on(&mut connection, id).await
}

pub async fn update(
    connection: &mut PgConnection,
    input: &CreateDraft,
    expected: DateTime<Utc>,
) -> Result<Option<Draft>, sqlx::Error> {
    sqlx::query_as::<_, Draft>("UPDATE posts SET title = $2, slug = $3, excerpt = $4, kind = $5, body_markdown = $6, updated_at = GREATEST(clock_timestamp(), updated_at + interval '1 microsecond') WHERE id = $1 AND status = 'draft' AND updated_at = $7 RETURNING id, title, slug, excerpt, kind, body_markdown, status, published_at, created_at, updated_at")
        .bind(input.id).bind(&input.title).bind(&input.slug).bind(&input.excerpt).bind(input.kind.as_str()).bind(&input.body_markdown).bind(expected).fetch_optional(connection).await
}

pub async fn find_locked(
    connection: &mut PgConnection,
    id: Uuid,
) -> Result<Option<Draft>, sqlx::Error> {
    sqlx::query_as::<_, Draft>("SELECT id, title, slug, excerpt, kind, body_markdown, status, published_at, created_at, updated_at FROM posts WHERE id = $1 AND status = 'draft' FOR UPDATE")
        .bind(id).fetch_optional(connection).await
}

pub async fn list(pool: &PgPool, offset: i64) -> Result<(i64, Vec<DraftSummary>), sqlx::Error> {
    let mut transaction = pool.begin().await?;
    sqlx::query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY")
        .execute(&mut *transaction)
        .await?;
    let total = sqlx::query_scalar::<_, i64>("SELECT count(*) FROM posts WHERE status = 'draft'")
        .fetch_one(&mut *transaction)
        .await?;
    let items = sqlx::query_as::<_, DraftSummary>("SELECT id, title, slug, excerpt, kind, updated_at FROM posts WHERE status = 'draft' ORDER BY updated_at DESC, id DESC LIMIT 20 OFFSET $1").bind(offset).fetch_all(&mut *transaction).await?;
    transaction.commit().await?;
    Ok((total, items))
}
