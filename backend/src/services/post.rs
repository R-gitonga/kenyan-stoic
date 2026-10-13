use crate::{error::AppError, models::post::PublicPost, repositories};
use sqlx::PgPool;

pub async fn list_published(
    pool: &PgPool,
    page: i64,
) -> Result<crate::models::post::PostPage, AppError> {
    let offset = page
        .checked_sub(1)
        .filter(|value| *value >= 0)
        .and_then(|value| value.checked_mul(10))
        .ok_or(AppError::InvalidPage)?;
    let (total_items, items) = repositories::post::published_page(pool, 10, offset)
        .await
        .map_err(database_error)?;
    let total_pages = (total_items / 10 + i64::from(total_items % 10 != 0)).max(1);
    if page > total_pages {
        return Err(AppError::PageNotFound);
    }
    Ok(crate::models::post::PostPage {
        items,
        page,
        page_size: 10,
        total_items,
        total_pages,
    })
}

pub(crate) fn database_error(error: sqlx::Error) -> AppError {
    tracing::error!("Published content query failed");
    match error {
        sqlx::Error::Database(_) | sqlx::Error::ColumnDecode { .. } | sqlx::Error::Decode(_) => {
            AppError::Internal
        }
        _ => AppError::DatabaseUnavailable,
    }
}

pub async fn get_published(pool: &PgPool, slug: &str) -> Result<PublicPost, AppError> {
    let row = repositories::post::find_published_by_slug(pool, slug)
        .await
        .map_err(|error| {
            tracing::error!("Published post lookup failed");
            match error {
                sqlx::Error::Database(_)
                | sqlx::Error::ColumnDecode { .. }
                | sqlx::Error::Decode(_) => AppError::Internal,
                _ => AppError::DatabaseUnavailable,
            }
        })?;
    row.map(PublicPost::from).ok_or(AppError::NotFound)
}
