use crate::{app_state::AppState, error::AppError, handlers::draft};
use axum::{
    Router,
    extract::{DefaultBodyLimit, Request, State},
    middleware::{self, Next},
    response::{IntoResponse, Response},
    routing::{get, post},
};
use std::net::SocketAddr;

#[derive(Clone)]
pub struct LocalAuthoring {
    host: String,
    origins: Vec<String>,
}

impl LocalAuthoring {
    pub fn new(address: SocketAddr, origins: Vec<String>) -> Result<Self, &'static str> {
        if !address.ip().is_loopback() || address.port() == 0 {
            return Err("Local authoring requires a loopback listener with a fixed port");
        }
        if origins.is_empty() {
            return Err("Configure at least one local frontend origin");
        }
        for origin in &origins {
            let uri = origin
                .parse::<axum::http::Uri>()
                .map_err(|_| "Invalid local frontend origin")?;
            let authority = uri
                .authority()
                .ok_or("Local origin needs a host and port")?;
            if uri.scheme_str() != Some("http")
                || !matches!(
                    uri.host(),
                    Some("localhost" | "127.0.0.1" | "[::1]" | "::1")
                )
                || authority.as_str().contains('@')
                || uri.port_u16().is_none_or(|port| port == 0)
                || *origin != format!("http://{authority}")
            {
                return Err(
                    "Local authoring origins must be exact HTTP loopback origins with a port and no path",
                );
            }
        }
        Ok(Self {
            host: address.to_string(),
            origins,
        })
    }
}

async fn local_only(
    State(config): State<LocalAuthoring>,
    request: Request,
    next: Next,
) -> Response {
    let headers = request.headers();
    // Same-origin browser GETs normally carry Referer, not Origin. Accept its
    // exact origin only for reads; writes always require the Origin header.
    let read_origin =
        if request.method() == axum::http::Method::GET && !headers.contains_key("origin") {
            headers
                .get("referer")
                .and_then(|value| value.to_str().ok())
                .and_then(|value| value.parse::<axum::http::Uri>().ok())
                .and_then(|uri| Some(format!("{}://{}", uri.scheme_str()?, uri.authority()?)))
        } else {
            None
        };
    let origin = headers
        .get("origin")
        .and_then(|value| value.to_str().ok())
        .or(read_origin.as_deref());
    let host = headers.get("host").and_then(|value| value.to_str().ok());
    let marker = headers
        .get("x-local-authoring")
        .and_then(|value| value.to_str().ok());
    if (headers.get_all("origin").iter().count() != 1 && read_origin.is_none())
        || headers.get_all("referer").iter().count() > 1
        || headers.get_all("host").iter().count() != 1
        || headers.get_all("x-local-authoring").iter().count() != 1
        || !config
            .origins
            .iter()
            .any(|allowed| Some(allowed.as_str()) == origin)
        || host != Some(config.host.as_str())
        || marker != Some("1")
    {
        return AppError::LocalAuthoringForbidden.into_response();
    }
    let mut response = next.run(request).await;
    response.headers_mut().insert(
        "cache-control",
        axum::http::HeaderValue::from_static("no-store"),
    );
    response
}

pub fn router(config: LocalAuthoring) -> Router<AppState> {
    Router::new()
        .route("/author/drafts", post(draft::create).get(draft::list))
        .route("/author/drafts/{id}", get(draft::get).put(draft::update))
        .layer(DefaultBodyLimit::max(512 * 1024))
        .route_layer(middleware::from_fn_with_state(config, local_only))
}
