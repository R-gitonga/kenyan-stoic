use crate::{app_state::AppState, error::AppError, models::post::PublicPost, services};
use axum::{
    Json,
    extract::{Path, Query, State},
};

#[derive(serde::Deserialize)]
pub struct PageQuery {
    page: Option<String>,
}

pub async fn list(
    State(state): State<AppState>,
    query: Result<Query<PageQuery>, axum::extract::rejection::QueryRejection>,
) -> Result<Json<crate::models::post::PostPage>, AppError> {
    let Query(query) = query.map_err(|_| AppError::InvalidPage)?;
    let raw = query.page.as_deref().unwrap_or("1");
    if raw.is_empty() || !raw.bytes().all(|byte| byte.is_ascii_digit()) {
        return Err(AppError::InvalidPage);
    }
    let page = raw.parse::<i64>().map_err(|_| AppError::InvalidPage)?;
    services::post::list_published(&state.pool, page)
        .await
        .map(Json)
}

pub use crate::models::post::valid_slug;

pub async fn get_by_slug(
    State(state): State<AppState>,
    Path(slug): Path<String>,
) -> Result<Json<PublicPost>, AppError> {
    if !valid_slug(&slug) {
        return Err(AppError::InvalidSlug);
    }
    services::post::get_published(&state.pool, &slug)
        .await
        .map(Json)
}
