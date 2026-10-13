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
    LocalAuthoringForbidden,
    InvalidDraftRequest,
    DraftConflict,
    DraftChanged,
    PayloadTooLarge,
    DraftValidation(std::collections::BTreeMap<&'static str, &'static str>),
}

#[derive(Serialize)]
struct ErrorBody {
    code: &'static str,
    message: &'static str,
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        if let Self::DraftValidation(fields) = &self {
            return (StatusCode::UNPROCESSABLE_ENTITY, Json(serde_json::json!({"code": "draft_validation", "message": "Check the highlighted fields.", "fields": fields}))).into_response();
        }
        let (status, code, message) = match self {
            Self::DraftChanged => (
                StatusCode::CONFLICT,
                "draft_changed",
                "This draft changed since you loaded it. Reload the saved version before saving again.",
            ),
            Self::LocalAuthoringForbidden => (
                StatusCode::FORBIDDEN,
                "local_authoring_forbidden",
                "Use the configured local authoring workflow.",
            ),
            Self::InvalidDraftRequest => (
                StatusCode::BAD_REQUEST,
                "invalid_draft_request",
                "Provide the required draft fields and a valid ID and writing type. Extra fields are not accepted.",
            ),
            Self::DraftConflict => (
                StatusCode::CONFLICT,
                "draft_conflict",
                "This slug or composition ID is already in use. Check the saved draft or choose another slug.",
            ),
            Self::PayloadTooLarge => (
                StatusCode::PAYLOAD_TOO_LARGE,
                "payload_too_large",
                "The draft request is too large.",
            ),
            Self::DraftValidation(_) => unreachable!(),
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
