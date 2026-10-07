use crate::{
    app_state::AppState,
    error::AppError,
    models::health::{HealthResponse, ReadinessResponse},
    services,
};
use axum::{Json, extract::State};

pub async fn live() -> Json<HealthResponse> {
    Json(HealthResponse { status: "ok" })
}

pub async fn ready(State(state): State<AppState>) -> Result<Json<ReadinessResponse>, AppError> {
    services::health::readiness(&state.pool).await.map(Json)
}
