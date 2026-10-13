use chrono::{DateTime, Utc};
use serde::Serialize;
use sqlx::FromRow;
use uuid::Uuid;

pub fn valid_slug(slug: &str) -> bool {
    !slug.is_empty()
        && slug.len() <= 160
        && !slug.starts_with('-')
        && !slug.ends_with('-')
        && !slug.contains("--")
        && slug
            .bytes()
            .all(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit() || byte == b'-')
}

#[derive(FromRow, Serialize)]
pub struct PostSummary {
    pub id: Uuid,
    pub slug: String,
    pub title: String,
    pub excerpt: String,
    pub kind: String,
    pub published_at: DateTime<Utc>,
}

#[derive(Serialize)]
pub struct PostPage {
    pub items: Vec<PostSummary>,
    pub page: i64,
    pub page_size: i64,
    pub total_items: i64,
    pub total_pages: i64,
}

#[derive(FromRow)]
pub struct PublishedPostRow {
    pub id: Uuid,
    pub slug: String,
    pub title: String,
    pub excerpt: String,
    pub body_markdown: String,
    pub kind: String,
    pub published_at: DateTime<Utc>,
}

#[derive(Serialize)]
pub struct PublicPost {
    pub id: Uuid,
    pub slug: String,
    pub title: String,
    pub excerpt: String,
    pub body_markdown: String,
    pub kind: String,
    pub published_at: DateTime<Utc>,
}

impl From<PublishedPostRow> for PublicPost {
    fn from(row: PublishedPostRow) -> Self {
        Self {
            id: row.id,
            slug: row.slug,
            title: row.title,
            excerpt: row.excerpt,
            body_markdown: row.body_markdown,
            kind: row.kind,
            published_at: row.published_at,
        }
    }
}
