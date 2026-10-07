pub mod health;
pub mod post;
use crate::app_state::AppState;
use axum::Router;
use tower_http::trace::TraceLayer;

pub fn router(state: AppState) -> Router {
    Router::new()
        .nest("/api", health::router().merge(post::router()))
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}
