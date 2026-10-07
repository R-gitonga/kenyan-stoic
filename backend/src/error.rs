use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde::Serialize;

pub enum AppError {
    DatabaseUnavailable,
    NotFound,
    InvalidSlug,
    Internal,
    InvalidPage,
    PageNotFound,
}

#[derive(Serialize)]
struct ErrorBody {
    code: &'static str,
    message: &'static str,
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, code, message) = match self {
            Self::InvalidPage => (
                StatusCode::BAD_REQUEST,
                "invalid_page",
                "Use a positive whole-number page within the supported range.",
            ),
            Self::PageNotFound => (
                StatusCode::NOT_FOUND,
                "page_not_found",
                "This page could not be found.",
            ),
            Self::DatabaseUnavailable => (
                StatusCode::SERVICE_UNAVAILABLE,
                "database_unavailable",
                "The database is temporarily unavailable.",
            ),
            Self::NotFound => (
                StatusCode::NOT_FOUND,
                "post_not_found",
                "This piece could not be found.",
            ),
            Self::InvalidSlug => (
                StatusCode::BAD_REQUEST,
                "invalid_slug",
                "Use a slug of 1 to 160 lowercase letters, numbers, or single hyphens.",
            ),
            Self::Internal => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "internal_error",
                "The request could not be completed.",
            ),
        };
        (status, Json(ErrorBody { code, message })).into_response()
    }
}
