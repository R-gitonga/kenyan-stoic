use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum WritingKind {
    Reflection,
    Poem,
    Other,
}
impl WritingKind {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Reflection => "reflection",
            Self::Poem => "poem",
            Self::Other => "other",
        }
    }
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CreateDraft {
    pub id: Uuid,
    pub title: String,
    pub slug: String,
    pub excerpt: String,
    pub kind: WritingKind,
    pub body_markdown: String,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct UpdateDraft {
    pub title: String,
    pub slug: String,
    pub excerpt: String,
    pub kind: WritingKind,
    pub body_markdown: String,
    pub expected_updated_at: DateTime<Utc>,
}

#[derive(FromRow, Serialize)]
pub struct DraftSummary {
    pub id: Uuid,
    pub title: String,
    pub slug: String,
    pub excerpt: String,
    pub kind: String,
    pub updated_at: DateTime<Utc>,
}

#[derive(Serialize)]
pub struct DraftPage {
    pub items: Vec<DraftSummary>,
    pub page: i64,
    pub page_size: i64,
    pub total_items: i64,
    pub total_pages: i64,
}

#[derive(FromRow, Serialize)]
pub struct Draft {
    pub id: Uuid,
    pub title: String,
    pub slug: String,
    pub excerpt: String,
    pub kind: String,
    pub body_markdown: String,
    pub status: String,
    pub published_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Draft {
    pub fn matches(&self, input: &CreateDraft) -> bool {
        self.title == input.title
            && self.slug == input.slug
            && self.excerpt == input.excerpt
            && self.kind == input.kind.as_str()
            && self.body_markdown == input.body_markdown
    }
}
