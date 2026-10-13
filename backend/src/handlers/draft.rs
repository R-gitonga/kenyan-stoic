use crate::{
    app_state::AppState,
    error::AppError,
    models::draft::{CreateDraft, UpdateDraft},
    services::draft,
};
use axum::{
    Json,
    extract::{Path, Query, State, rejection::JsonRejection},
    http::StatusCode,
    response::{IntoResponse, Response},
};
use uuid::Uuid;

pub async fn create(
    State(state): State<AppState>,
    input: Result<Json<CreateDraft>, JsonRejection>,
) -> Result<Response, AppError> {
    let Json(input) = input.map_err(|error| {
        if error.status() == StatusCode::PAYLOAD_TOO_LARGE {
            AppError::PayloadTooLarge
        } else {
            AppError::InvalidDraftRequest
        }
    })?;
    let (saved, created) = draft::create(&state.pool, input).await?;
    Ok((
        if created {
            StatusCode::CREATED
        } else {
            StatusCode::OK
        },
        [("cache-control", "no-store")],
        Json(saved),
    )
        .into_response())
}

pub async fn get(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Response, AppError> {
    let id = Uuid::parse_str(&id).map_err(|_| AppError::InvalidDraftRequest)?;
    let saved = draft::get(&state.pool, id).await?;
    Ok(([("cache-control", "no-store")], Json(saved)).into_response())
}

pub async fn update(
    State(state): State<AppState>,
    Path(id): Path<String>,
    input: Result<Json<UpdateDraft>, JsonRejection>,
) -> Result<Response, AppError> {
    let id = Uuid::parse_str(&id).map_err(|_| AppError::InvalidDraftRequest)?;
    let Json(input) = input.map_err(|error| {
        if error.status() == StatusCode::PAYLOAD_TOO_LARGE {
            AppError::PayloadTooLarge
        } else {
            AppError::InvalidDraftRequest
        }
    })?;
    let saved = draft::update(&state.pool, id, input).await?;
    Ok(([("cache-control", "no-store")], Json(saved)).into_response())
}

#[derive(serde::Deserialize)]
pub struct DraftQuery {
    page: Option<String>,
}

pub async fn list(
    State(state): State<AppState>,
    query: Result<Query<DraftQuery>, axum::extract::rejection::QueryRejection>,
) -> Result<Response, AppError> {
    let Query(query) = query.map_err(|_| AppError::InvalidPage)?;
    let raw = query.page.as_deref().unwrap_or("1");
    if raw.is_empty() || !raw.bytes().all(|byte| byte.is_ascii_digit()) {
        return Err(AppError::InvalidPage);
    }
    let page = raw.parse::<i64>().map_err(|_| AppError::InvalidPage)?;
    Ok((
        [("cache-control", "no-store")],
        Json(draft::list(&state.pool, page).await?),
    )
        .into_response())
}
