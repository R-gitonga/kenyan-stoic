use crate::{app_state::AppState, handlers::post};
use axum::{Router, routing::get};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/posts", get(post::list))
        .route("/posts/{slug}", get(post::get_by_slug))
}
