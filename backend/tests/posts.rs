use axum::{
    body::{Body, to_bytes},
    http::{Request, StatusCode},
};
use kenyan_stoic_api::{app_state::AppState, repositories::post, routes};
use serde_json::Value;
use sqlx::{PgPool, postgres::PgPoolOptions};
use tower::ServiceExt;

struct TestDatabase {
    pool: PgPool,
    admin: PgPool,
    schema: String,
}

impl TestDatabase {
    async fn new() -> Self {
        use std::{
            str::FromStr,
            time::{SystemTime, UNIX_EPOCH},
        };
        let url = std::env::var("DATABASE_URL")
            .expect("Run scripts/test-backend.ps1 or set a dedicated test DATABASE_URL");
        let options = sqlx::postgres::PgConnectOptions::from_str(&url)
            .expect("Invalid test database configuration");
        assert_eq!(
            options.get_database(),
            Some("kenyan_stoic_test"),
            "Tests require kenyan_stoic_test; refusing another database"
        );
        let admin = PgPoolOptions::new()
            .max_connections(1)
            .connect_with(options.clone())
            .await
            .expect("Test database connection failed");
        let suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let schema = format!("posts_test_{}_{}", std::process::id(), suffix);
        // The identifier is generated solely from numeric process/time values.
        sqlx::query(&format!("CREATE SCHEMA {schema}"))
            .execute(&admin)
            .await
            .unwrap();
        let connection_schema = schema.clone();
        let pool = PgPoolOptions::new()
            .max_connections(2)
            .after_connect(move |connection, _| {
                let statement = format!("SET search_path TO {connection_schema}");
                Box::pin(async move {
                    sqlx::query(&statement).execute(connection).await?;
                    Ok(())
                })
            })
            .connect_with(options)
            .await
            .unwrap();
        sqlx::migrate!("./migrations").run(&pool).await.unwrap();
        Self {
            pool,
            admin,
            schema,
        }
    }

    async fn cleanup(self) {
        self.pool.close().await;
        sqlx::query(&format!("DROP SCHEMA {} CASCADE", self.schema))
            .execute(&self.admin)
            .await
            .unwrap();
        self.admin.close().await;
    }
}

async fn insert_post(pool: &PgPool, slug: &str, published: bool) {
    sqlx::query("INSERT INTO posts (id, slug, title, body_markdown, kind, status, published_at) VALUES (gen_random_uuid(), $1, 'Sample title', 'Sample body', 'reflection', $2, CASE WHEN $2 = 'published' THEN now() ELSE NULL END)")
        .bind(slug).bind(if published { "published" } else { "draft" }).execute(pool).await.unwrap();
}

#[tokio::test]
async fn listing_is_private_paginated_and_stable() {
    let database = TestDatabase::new().await;
    let pool = database.pool.clone();
    let (_, empty) = request(pool.clone(), "/api/posts").await;
    assert_eq!(empty["total_pages"], 1);
    assert_eq!(empty["items"].as_array().unwrap().len(), 0);
    for index in 0..12 {
        insert_post(&pool, &format!("sample-{index}"), true).await;
    }
    insert_post(&pool, "secret-draft", false).await;
    sqlx::query(
        "UPDATE posts SET published_at = '2026-10-07T06:00:00Z' WHERE status = 'published'",
    )
    .execute(&pool)
    .await
    .unwrap();
    let (status, first) = request(pool.clone(), "/api/posts?page=1").await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(first["total_items"], 12);
    assert_eq!(first["total_pages"], 2);
    let (_, second) = request(pool.clone(), "/api/posts?page=2").await;
    let mut ids = Vec::new();
    for item in first["items"]
        .as_array()
        .unwrap()
        .iter()
        .chain(second["items"].as_array().unwrap())
    {
        assert_eq!(item.as_object().unwrap().len(), 6);
        assert_ne!(item["slug"], "secret-draft");
        ids.push(item["id"].as_str().unwrap().to_owned());
    }
    assert_eq!(first["items"].as_array().unwrap().len(), 10);
    assert_eq!(second["items"].as_array().unwrap().len(), 2);
    assert!(ids.windows(2).all(|pair| pair[0] > pair[1]));
    let (_, repeated) = request(pool.clone(), "/api/posts?page=1").await;
    assert_eq!(first, repeated);
    assert_eq!(
        request(pool.clone(), "/api/posts?page=3").await.0,
        StatusCode::NOT_FOUND
    );
    for page in [
        "0",
        "-1",
        "1.5",
        "abc",
        "9223372036854775807",
        "999999999999999999999",
    ] {
        assert_eq!(
            request(pool.clone(), &format!("/api/posts?page={page}"))
                .await
                .0,
            StatusCode::BAD_REQUEST
        );
    }
    pool.close().await;
    assert_eq!(
        request(pool, "/api/posts").await.0,
        StatusCode::SERVICE_UNAVAILABLE
    );
    database.cleanup().await;
}

async fn request(pool: PgPool, uri: &str) -> (StatusCode, Value) {
    let response = routes::router(AppState { pool })
        .oneshot(Request::builder().uri(uri).body(Body::empty()).unwrap())
        .await
        .unwrap();
    let status = response.status();
    let body = to_bytes(response.into_body(), 32_768).await.unwrap();
    (status, serde_json::from_slice(&body).unwrap())
}

#[tokio::test]
async fn published_piece_has_only_public_fields() {
    let database = TestDatabase::new().await;
    let pool = database.pool.clone();
    insert_post(&pool, "sample-public", true).await;
    let (status, body) = request(pool, "/api/posts/sample-public").await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["title"], "Sample title");
    assert_eq!(body["body_markdown"], "Sample body");
    assert_eq!(body.as_object().unwrap().len(), 7);
    assert!(body.get("status").is_none());
    assert!(body.get("created_at").is_none());
    assert!(body.get("updated_at").is_none());
    assert!(chrono::DateTime::parse_from_rfc3339(body["published_at"].as_str().unwrap()).is_ok());
    database.cleanup().await;
}

#[tokio::test]
async fn draft_is_indistinguishable_from_unknown_piece() {
    let database = TestDatabase::new().await;
    let pool = database.pool.clone();
    insert_post(&pool, "private-draft", false).await;
    let draft = request(pool.clone(), "/api/posts/private-draft").await;
    let missing = request(pool, "/api/posts/missing-piece").await;
    assert_eq!(draft.0, StatusCode::NOT_FOUND);
    assert_eq!(draft, missing);
    assert_eq!(draft.1["code"], "post_not_found");
    database.cleanup().await;
}

#[tokio::test]
async fn export_contains_only_published_content() {
    let database = TestDatabase::new().await;
    let pool = database.pool.clone();
    insert_post(&pool, "public-piece", true).await;
    insert_post(&pool, "private-piece", false).await;
    let rows = post::all_published(&pool).await.unwrap();
    assert_eq!(rows.len(), 1);
    assert_eq!(rows[0].slug, "public-piece");
    database.cleanup().await;
}

#[tokio::test]
async fn database_rejects_duplicate_slug_and_invalid_publication() {
    let database = TestDatabase::new().await;
    let pool = database.pool.clone();
    insert_post(&pool, "unique-piece", true).await;
    let duplicate = sqlx::query("INSERT INTO posts (id, slug, title, body_markdown, kind) VALUES (gen_random_uuid(), 'unique-piece', 'Title', 'Body', 'poem')")
        .execute(&pool).await.unwrap_err();
    assert_eq!(
        duplicate.as_database_error().unwrap().code().as_deref(),
        Some("23505")
    );
    let no_timestamp = sqlx::query("INSERT INTO posts (id, slug, title, body_markdown, kind, status) VALUES (gen_random_uuid(), 'missing-date', 'Title', 'Body', 'poem', 'published')")
        .execute(&pool).await.unwrap_err();
    assert_eq!(
        no_timestamp.as_database_error().unwrap().code().as_deref(),
        Some("23514")
    );
    for slug in ["Uppercase", "two--hyphens", "-leading", "trailing-"] {
        let invalid = sqlx::query("INSERT INTO posts (id, slug, title, body_markdown, kind) VALUES (gen_random_uuid(), $1, 'Title', 'Body', 'poem')")
            .bind(slug).execute(&pool).await.unwrap_err();
        assert_eq!(
            invalid.as_database_error().unwrap().code().as_deref(),
            Some("23514")
        );
    }
    database.cleanup().await;
}

#[tokio::test]
async fn invalid_slug_is_rejected_before_database_access() {
    let pool = PgPoolOptions::new()
        .connect_lazy("postgres://unused:unused@127.0.0.1:1/unused")
        .unwrap();
    pool.close().await;
    for slug in [
        "Uppercase",
        "two--hyphens",
        "-leading",
        "trailing-",
        &"a".repeat(161),
    ] {
        let (status, body) = request(pool.clone(), &format!("/api/posts/{slug}")).await;
        assert_eq!(status, StatusCode::BAD_REQUEST);
        assert_eq!(body["code"], "invalid_slug");
    }
}

#[tokio::test]
async fn closed_database_is_safe_unavailable_response() {
    let pool = PgPoolOptions::new()
        .connect_lazy("postgres://unused:unused@127.0.0.1:1/unused")
        .unwrap();
    pool.close().await;
    let (status, body) = request(pool.clone(), "/api/posts/valid-slug").await;
    assert_eq!(status, StatusCode::SERVICE_UNAVAILABLE);
    assert_eq!(body["code"], "database_unavailable");
    assert!(!body.to_string().contains("unused"));
    let response = routes::router(AppState { pool })
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/posts/valid-slug")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::METHOD_NOT_ALLOWED);
}
