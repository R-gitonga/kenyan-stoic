pub mod draft;
pub mod health;
pub mod post;
use crate::app_state::AppState;
use axum::Router;
use tower_http::trace::TraceLayer;

pub fn router(state: AppState) -> Router {
    router_with_authoring(state, None)
}

pub fn router_with_authoring(state: AppState, authoring: Option<draft::LocalAuthoring>) -> Router {
    let mut api = health::router().merge(post::router());
    if let Some(config) = authoring {
        api = api.merge(draft::router(config));
    }
    Router::new()
        .nest("/api", api)
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}
