use crate::{
    error::AppError,
    models::{
        draft::{CreateDraft, Draft, DraftPage, UpdateDraft},
        post::valid_slug,
    },
    repositories::draft,
    services::post::database_error,
};
use sqlx::PgPool;
use std::collections::BTreeMap;
use uuid::Uuid;

fn normalize_and_validate(mut input: CreateDraft) -> Result<CreateDraft, AppError> {
    input.title = input.title.trim().to_owned();
    input.excerpt = input.excerpt.trim().to_owned();
    let mut fields = BTreeMap::new();
    if input.id.is_nil() {
        fields.insert("id", "Use a non-empty composition ID.");
    }
    if input.title.is_empty() || input.title.chars().count() > 300 {
        fields.insert("title", "Enter a title of 1 to 300 characters.");
    }
    if !valid_slug(&input.slug) {
        fields.insert(
            "slug",
            "Use 1–160 lowercase letters, numbers, or single separating hyphens.",
        );
    }
    if input.excerpt.chars().count() > 1000 {
        fields.insert("excerpt", "Keep the excerpt within 1,000 characters.");
    }
    if input.body_markdown.trim().is_empty() || input.body_markdown.len() > 100_000 {
        fields.insert("body_markdown", "Enter writing within 100,000 UTF-8 bytes.");
    }
    if !fields.is_empty() {
        return Err(AppError::DraftValidation(fields));
    }
    Ok(input)
}

pub async fn create(pool: &PgPool, input: CreateDraft) -> Result<(Draft, bool), AppError> {
    let input = normalize_and_validate(input)?;
    let mut transaction = pool.begin().await.map_err(database_error)?;
    let inserted = draft::insert(&mut transaction, &input)
        .await
        .map_err(|error| {
            if matches!(&error, sqlx::Error::Database(error) if error.is_unique_violation()) {
                AppError::DraftConflict
            } else {
                database_error(error)
            }
        })?;
    let (saved, created) = match inserted {
        Some(row) => (row, true),
        None => {
            let row = draft::find_on(&mut transaction, input.id)
                .await
                .map_err(database_error)?
                .ok_or(AppError::DraftConflict)?;
            if !row.matches(&input) {
                return Err(AppError::DraftConflict);
            }
            (row, false)
        }
    };
    transaction.commit().await.map_err(database_error)?;
    Ok((saved, created))
}

pub async fn get(pool: &PgPool, id: Uuid) -> Result<Draft, AppError> {
    draft::find(pool, id)
        .await
        .map_err(database_error)?
        .ok_or(AppError::NotFound)
}

pub async fn update(pool: &PgPool, id: Uuid, input: UpdateDraft) -> Result<Draft, AppError> {
    let expected = input.expected_updated_at;
    let input = normalize_and_validate(CreateDraft {
        id,
        title: input.title,
        slug: input.slug,
        excerpt: input.excerpt,
        kind: input.kind,
        body_markdown: input.body_markdown,
    })?;
    let mut transaction = pool.begin().await.map_err(database_error)?;
    let saved = draft::update(&mut transaction, &input, expected)
        .await
        .map_err(|error| {
            if matches!(&error, sqlx::Error::Database(error) if error.is_unique_violation()) {
                AppError::DraftConflict
            } else {
                database_error(error)
            }
        })?;
    let saved = match saved {
        Some(saved) => saved,
        None => {
            let current = draft::find_locked(&mut transaction, id)
                .await
                .map_err(database_error)?
                .ok_or(AppError::NotFound)?;
            // A lost response can be retried safely if its content is already stored.
            if !current.matches(&input) {
                return Err(AppError::DraftChanged);
            }
            current
        }
    };
    transaction.commit().await.map_err(database_error)?;
    Ok(saved)
}

pub async fn list(pool: &PgPool, page: i64) -> Result<DraftPage, AppError> {
    let offset = page
        .checked_sub(1)
        .filter(|value| *value >= 0)
        .and_then(|value| value.checked_mul(20))
        .ok_or(AppError::InvalidPage)?;
    let (total_items, items) = draft::list(pool, offset).await.map_err(database_error)?;
    let total_pages = (total_items / 20 + i64::from(total_items % 20 != 0)).max(1);
    if page > total_pages {
        return Err(AppError::PageNotFound);
    }
    Ok(DraftPage {
        items,
        page,
        page_size: 20,
        total_items,
        total_pages,
    })
}
