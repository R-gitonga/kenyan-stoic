use crate::{app_state::AppState, handlers::health};
use axum::{Router, routing::get};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/health/live", get(health::live))
        .route("/health/ready", get(health::ready))
}
