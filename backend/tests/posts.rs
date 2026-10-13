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

fn authoring() -> routes::draft::LocalAuthoring {
    routes::draft::LocalAuthoring::new(
        "127.0.0.1:3000".parse().unwrap(),
        vec!["http://localhost:5173".into()],
    )
    .unwrap()
}

async fn author_request(
    pool: PgPool,
    method: &str,
    path: &str,
    body: Value,
) -> (StatusCode, Value) {
    let response = routes::router_with_authoring(AppState { pool }, Some(authoring()))
        .oneshot(
            Request::builder()
                .method(method)
                .uri(path)
                .header("host", "127.0.0.1:3000")
                .header("origin", "http://localhost:5173")
                .header("x-local-authoring", "1")
                .header("content-type", "application/json")
                .body(Body::from(body.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.headers()["cache-control"], "no-store");
    let status = response.status();
    let body = to_bytes(response.into_body(), 600_000).await.unwrap();
    (status, serde_json::from_slice(&body).unwrap())
}

fn draft_input() -> Value {
    serde_json::json!({"id": "00000000-0000-4000-8000-000000000020", "title": "  A private poem  ", "slug": "private-poem", "excerpt": "  A draft  ", "kind": "poem", "body_markdown": "  A line\nAnother line\n\nA stanza\n"})
}

#[tokio::test]
async fn draft_updates_persist_and_guard_concurrent_writers() {
    let database = TestDatabase::new().await;
    let pool = database.pool.clone();
    let (_, original) =
        author_request(pool.clone(), "POST", "/api/author/drafts", draft_input()).await;
    let path = "/api/author/drafts/00000000-0000-4000-8000-000000000020";
    let mut change = draft_input();
    change.as_object_mut().unwrap().remove("id");
    change["expected_updated_at"] = original["updated_at"].clone();
    change["title"] = "Edited poem".into();
    change["slug"] = "edited-poem".into();
    change["excerpt"] = "Edited excerpt".into();
    change["body_markdown"] = "New line\nSecond line\n\nStanza\n".into();
    let (status, updated) = author_request(pool.clone(), "PUT", path, change.clone()).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(updated["created_at"], original["created_at"]);
    assert_eq!(updated["id"], original["id"]);
    assert_eq!(updated["status"], "draft");
    assert!(updated["published_at"].is_null());
    assert_ne!(updated["updated_at"], original["updated_at"]);
    assert_eq!(updated["body_markdown"], change["body_markdown"]);
    let (_, retry) = author_request(pool.clone(), "PUT", path, change.clone()).await;
    assert_eq!(retry, updated);
    change["body_markdown"] = "Stale edit".into();
    let (status, stale) = author_request(pool.clone(), "PUT", path, change.clone()).await;
    assert_eq!(status, StatusCode::CONFLICT);
    assert_eq!(stale["code"], "draft_changed");
    assert_eq!(
        author_request(pool.clone(), "GET", path, Value::Null)
            .await
            .1,
        updated
    );
    change["expected_updated_at"] = updated["updated_at"].clone();
    let mut other = change.clone();
    other["body_markdown"] = "Another tab".into();
    let (one, two) = tokio::join!(
        author_request(pool.clone(), "PUT", path, change.clone()),
        author_request(pool.clone(), "PUT", path, other)
    );
    assert!(
        (one.0 == StatusCode::OK && two.0 == StatusCode::CONFLICT)
            || (two.0 == StatusCode::OK && one.0 == StatusCode::CONFLICT)
    );
    let current = author_request(pool.clone(), "GET", path, Value::Null)
        .await
        .1;
    change["expected_updated_at"] = current["updated_at"].clone();
    insert_post(&pool, "taken-slug", true).await;
    change["slug"] = "taken-slug".into();
    assert_eq!(
        author_request(pool.clone(), "PUT", path, change.clone())
            .await
            .0,
        StatusCode::CONFLICT
    );
    assert_eq!(
        author_request(pool.clone(), "GET", path, Value::Null)
            .await
            .1,
        current
    );
    change["slug"] = "valid-slug".into();
    let published_id: uuid::Uuid =
        sqlx::query_scalar("SELECT id FROM posts WHERE slug = 'taken-slug'")
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(
        author_request(
            pool.clone(),
            "PUT",
            &format!("/api/author/drafts/{published_id}"),
            change.clone()
        )
        .await
        .0,
        StatusCode::NOT_FOUND
    );
    change["status"] = "published".into();
    assert_eq!(
        author_request(pool.clone(), "PUT", path, change).await.0,
        StatusCode::BAD_REQUEST
    );
    assert_eq!(
        request(pool.clone(), "/api/posts/edited-poem").await.0,
        StatusCode::NOT_FOUND
    );
    assert_eq!(post::all_published(&pool).await.unwrap().len(), 1);
    database.cleanup().await;
}

#[tokio::test]
async fn local_draft_list_is_paginated_private_and_summary_only() {
    let database = TestDatabase::new().await;
    let pool = database.pool.clone();
    let (_, empty) = author_request(pool.clone(), "GET", "/api/author/drafts", Value::Null).await;
    assert_eq!(empty["total_items"], 0);
    assert_eq!(empty["total_pages"], 1);
    for index in 0..25 {
        insert_post(&pool, &format!("draft-{index}"), false).await;
    }
    insert_post(&pool, "public-piece", true).await;
    sqlx::query("UPDATE posts SET updated_at = '2026-10-13T06:00:00Z' WHERE status = 'draft'")
        .execute(&pool)
        .await
        .unwrap();
    let (_, first) = author_request(
        pool.clone(),
        "GET",
        "/api/author/drafts?page=1",
        Value::Null,
    )
    .await;
    let (_, second) = author_request(
        pool.clone(),
        "GET",
        "/api/author/drafts?page=2",
        Value::Null,
    )
    .await;
    assert_eq!(first["total_items"], 25);
    assert_eq!(first["total_pages"], 2);
    assert_eq!(first["items"].as_array().unwrap().len(), 20);
    assert_eq!(second["items"].as_array().unwrap().len(), 5);
    let ids: Vec<_> = first["items"]
        .as_array()
        .unwrap()
        .iter()
        .chain(second["items"].as_array().unwrap())
        .map(|item| {
            assert_eq!(item.as_object().unwrap().len(), 6);
            assert!(item.get("body_markdown").is_none());
            assert_ne!(item["slug"], "public-piece");
            item["id"].as_str().unwrap().to_owned()
        })
        .collect();
    assert!(ids.windows(2).all(|pair| pair[0] > pair[1]));
    for page in ["0", "-1", "oops", "9223372036854775807"] {
        assert_eq!(
            author_request(
                pool.clone(),
                "GET",
                &format!("/api/author/drafts?page={page}"),
                Value::Null
            )
            .await
            .0,
            StatusCode::BAD_REQUEST
        );
    }
    assert_eq!(
        author_request(
            pool.clone(),
            "GET",
            "/api/author/drafts?page=3",
            Value::Null
        )
        .await
        .0,
        StatusCode::NOT_FOUND
    );
    database.cleanup().await;
}

#[tokio::test]
async fn draft_persists_retries_and_remains_private() {
    let database = TestDatabase::new().await;
    let pool = database.pool.clone();
    let input = draft_input();
    let (status, saved) =
        author_request(pool.clone(), "POST", "/api/author/drafts", input.clone()).await;
    assert_eq!(status, StatusCode::CREATED);
    assert_eq!(saved["status"], "draft");
    assert!(saved["published_at"].is_null());
    assert_eq!(saved["title"], "A private poem");
    assert_eq!(saved["excerpt"], "A draft");
    assert_eq!(saved["body_markdown"], input["body_markdown"]);
    let (retry_status, retry) =
        author_request(pool.clone(), "POST", "/api/author/drafts", input).await;
    assert_eq!(retry_status, StatusCode::OK);
    assert_eq!(retry, saved);
    let (_, read) = author_request(
        pool.clone(),
        "GET",
        "/api/author/drafts/00000000-0000-4000-8000-000000000020",
        Value::Null,
    )
    .await;
    assert_eq!(read, saved);
    assert_eq!(
        request(pool.clone(), "/api/posts/private-poem").await.0,
        StatusCode::NOT_FOUND
    );
    assert_eq!(
        request(pool.clone(), "/api/posts").await.1["total_items"],
        0
    );
    assert!(post::all_published(&pool).await.unwrap().is_empty());
    let count: i64 = sqlx::query_scalar("SELECT count(*) FROM posts")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(count, 1);
    database.cleanup().await;
}

#[tokio::test]
async fn draft_validation_conflicts_and_published_ids_are_safe() {
    let database = TestDatabase::new().await;
    let pool = database.pool.clone();
    let mut input = draft_input();
    input["title"] = " \n ".into();
    let (status, error) = author_request(pool.clone(), "POST", "/api/author/drafts", input).await;
    assert_eq!(status, StatusCode::UNPROCESSABLE_ENTITY);
    assert!(error["fields"]["title"].is_string());
    for extra in ["status", "published_at", "created_at"] {
        let mut input = draft_input();
        input[extra] = "untrusted".into();
        assert_eq!(
            author_request(pool.clone(), "POST", "/api/author/drafts", input)
                .await
                .0,
            StatusCode::BAD_REQUEST
        );
    }
    for (field, value) in [
        ("slug", serde_json::json!("Bad--slug")),
        ("excerpt", serde_json::json!("x".repeat(1001))),
        ("body_markdown", serde_json::json!("é".repeat(50_001))),
    ] {
        let mut input = draft_input();
        input[field] = value;
        assert_eq!(
            author_request(pool.clone(), "POST", "/api/author/drafts", input)
                .await
                .0,
            StatusCode::UNPROCESSABLE_ENTITY
        );
    }
    let mut input = draft_input();
    input["kind"] = "invalid".into();
    assert_eq!(
        author_request(pool.clone(), "POST", "/api/author/drafts", input)
            .await
            .0,
        StatusCode::BAD_REQUEST
    );
    author_request(pool.clone(), "POST", "/api/author/drafts", draft_input()).await;
    let mut changed = draft_input();
    changed["body_markdown"] = "changed".into();
    assert_eq!(
        author_request(pool.clone(), "POST", "/api/author/drafts", changed)
            .await
            .0,
        StatusCode::CONFLICT
    );
    let mut conflict = draft_input();
    conflict["id"] = "00000000-0000-4000-8000-000000000021".into();
    assert_eq!(
        author_request(pool.clone(), "POST", "/api/author/drafts", conflict)
            .await
            .0,
        StatusCode::CONFLICT
    );
    insert_post(&pool, "published-piece", true).await;
    let id: uuid::Uuid = sqlx::query_scalar("SELECT id FROM posts WHERE slug = 'published-piece'")
        .fetch_one(&pool)
        .await
        .unwrap();
    let published = author_request(
        pool.clone(),
        "GET",
        &format!("/api/author/drafts/{id}"),
        Value::Null,
    )
    .await;
    let unknown = author_request(
        pool.clone(),
        "GET",
        "/api/author/drafts/00000000-0000-4000-8000-000000000099",
        Value::Null,
    )
    .await;
    assert_eq!(published, unknown);
    assert_eq!(published.0, StatusCode::NOT_FOUND);
    pool.close().await;
    assert_eq!(
        author_request(pool, "POST", "/api/author/drafts", draft_input())
            .await
            .0,
        StatusCode::SERVICE_UNAVAILABLE
    );
    database.cleanup().await;
}

#[tokio::test]
async fn local_authoring_rejects_untrusted_requests_before_database_access() {
    let pool = PgPoolOptions::new()
        .connect_lazy("postgres://unused:unused@127.0.0.1:1/unused")
        .unwrap();
    let default_response = routes::router(AppState { pool: pool.clone() })
        .oneshot(
            Request::builder()
                .uri("/api/author/drafts")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(default_response.status(), StatusCode::NOT_FOUND);
    for (origin, host, marker) in [
        (None, "127.0.0.1:3000", "1"),
        (Some("https://outside.example"), "127.0.0.1:3000", "1"),
        (Some("http://localhost:5173"), "outside.example:3000", "1"),
        (Some("http://localhost:5173"), "127.0.0.1:3000", "0"),
    ] {
        let mut builder = Request::builder()
            .method("POST")
            .uri("/api/author/drafts")
            .header("host", host)
            .header("x-local-authoring", marker);
        if let Some(origin) = origin {
            builder = builder.header("origin", origin);
        }
        let response =
            routes::router_with_authoring(AppState { pool: pool.clone() }, Some(authoring()))
                .oneshot(builder.body(Body::empty()).unwrap())
                .await
                .unwrap();
        assert_eq!(response.status(), StatusCode::FORBIDDEN);
    }
    let response =
        routes::router_with_authoring(AppState { pool: pool.clone() }, Some(authoring()))
            .oneshot(
                Request::builder()
                    .uri("/api/author/drafts/not-a-uuid")
                    .header("host", "127.0.0.1:3000")
                    .header("referer", "http://localhost:5173/dev/drafts/new")
                    .header("x-local-authoring", "1")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    for bytes in ["{not json}".to_owned(), "x".repeat(512 * 1024 + 1)] {
        let expected = if bytes.len() > 512 * 1024 {
            StatusCode::PAYLOAD_TOO_LARGE
        } else {
            StatusCode::BAD_REQUEST
        };
        let response =
            routes::router_with_authoring(AppState { pool: pool.clone() }, Some(authoring()))
                .oneshot(
                    Request::builder()
                        .method("POST")
                        .uri("/api/author/drafts")
                        .header("host", "127.0.0.1:3000")
                        .header("origin", "http://localhost:5173")
                        .header("x-local-authoring", "1")
                        .header("content-type", "application/json")
                        .body(Body::from(bytes))
                        .unwrap(),
                )
                .await
                .unwrap();
        assert_eq!(response.status(), expected);
    }
    pool.close().await;
}

#[test]
fn local_authoring_configuration_refuses_public_addresses_and_origins() {
    for address in ["0.0.0.0:3000", "192.168.1.10:3000", "127.0.0.1:0"] {
        assert!(
            routes::draft::LocalAuthoring::new(
                address.parse().unwrap(),
                vec!["http://localhost:5173".into()]
            )
            .is_err()
        );
    }
    for origin in [
        "https://outside.example",
        "http://localhost:5173/path",
        "http://user@localhost:5173",
        "http://localhost:5173/",
    ] {
        assert!(
            routes::draft::LocalAuthoring::new(
                "127.0.0.1:3000".parse().unwrap(),
                vec![origin.into()]
            )
            .is_err()
        );
    }
}

#[tokio::test]
async fn draft_list_and_update_share_local_access_restrictions() {
    let pool = PgPoolOptions::new()
        .connect_lazy("postgres://unused:unused@127.0.0.1:1/unused")
        .unwrap();
    for (method, path) in [
        ("GET", "/api/author/drafts"),
        (
            "PUT",
            "/api/author/drafts/00000000-0000-4000-8000-000000000020",
        ),
    ] {
        let default_response = routes::router(AppState { pool: pool.clone() })
            .oneshot(
                Request::builder()
                    .method(method)
                    .uri(path)
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(default_response.status(), StatusCode::NOT_FOUND);
        let denied =
            routes::router_with_authoring(AppState { pool: pool.clone() }, Some(authoring()))
                .oneshot(
                    Request::builder()
                        .method(method)
                        .uri(path)
                        .header("host", "127.0.0.1:3000")
                        .header("origin", "https://outside.example")
                        .header("x-local-authoring", "1")
                        .body(Body::empty())
                        .unwrap(),
                )
                .await
                .unwrap();
        assert_eq!(denied.status(), StatusCode::FORBIDDEN);
    }
    pool.close().await;
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
