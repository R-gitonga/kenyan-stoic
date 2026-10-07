use axum::{
    body::{Body, to_bytes},
    http::{Request, StatusCode},
};
use kenyan_stoic_api::{app_state::AppState, routes};
use sqlx::postgres::PgPoolOptions;
use std::time::Duration;
use tower::ServiceExt;

async fn disconnected_pool() -> sqlx::PgPool {
    let pool = PgPoolOptions::new()
        .acquire_timeout(Duration::from_millis(100))
        .connect_lazy("postgres://unused:unused@127.0.0.1:1/unused")
        .expect("Valid test URL");
    pool.close().await;
    pool
}

#[tokio::test]
async fn liveness_does_not_require_database() {
    let app = routes::router(AppState {
        pool: disconnected_pool().await,
    });
    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/health/live")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body = to_bytes(response.into_body(), 1024).await.unwrap();
    assert_eq!(&body[..], br#"{"status":"ok"}"#);
}

#[tokio::test]
async fn readiness_returns_safe_failure_when_pool_is_closed() {
    let app = routes::router(AppState {
        pool: disconnected_pool().await,
    });
    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/health/ready")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::SERVICE_UNAVAILABLE);
    let body = to_bytes(response.into_body(), 1024).await.unwrap();
    assert_eq!(
        &body[..],
        br#"{"code":"database_unavailable","message":"The database is temporarily unavailable."}"#
    );
}
