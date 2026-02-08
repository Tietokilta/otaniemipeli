use crate::database::login::check_session;
use crate::utils::types::PgError;
use axum::body::Body;
use axum::extract::State;
use axum::middleware::Next;
use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use deadpool_postgres::Pool;
use http::{Method, Request};
use serde::Serialize;
use socketioxide::SocketIo;
use thiserror::Error;

/// State for Axum routes - includes SocketIo for emitting from REST endpoints.
#[derive(Clone)]
pub struct AppState {
    pub db: Pool,
    pub io: SocketIo,
}

impl AppState {
    pub fn new(db: Pool, io: SocketIo) -> Self {
        Self { db, io }
    }
}

/// State for socketioxide handlers - only includes what websocket handlers need.
/// This avoids circular dependency since SocketIo is built with this state.
#[derive(Clone)]
pub struct SocketState {
    pub db: Pool,
}

impl SocketState {
    pub fn new(db: Pool) -> Self {
        Self { db }
    }
}

#[derive(Serialize)]
struct ErrorBody {
    error: String,
}

#[derive(Error, Debug)]
pub enum AppError {
    #[error("validation error: {0}")]
    Validation(String),
    #[error("database error: {0}")]
    Database(String),
    #[error("conflict: {0}")]
    Conflict(String),
    #[error("not found: {0}")]
    NotFound(String),
    // #[error("rate limited")]
    // RateLimited,
    #[error("internal error")]
    Internal,
    #[error("unauthorized: {0}")]
    Unauthorized(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        tracing::error!("AppError -> \n\t{:?}: \n\t\t{}", self_code(&self), self);

        let (status, msg) = match self {
            AppError::Validation(m) => (StatusCode::BAD_REQUEST, m),
            AppError::Database(m) => (StatusCode::INTERNAL_SERVER_ERROR, m),
            AppError::Conflict(m) => (StatusCode::CONFLICT, m),
            AppError::NotFound(m) => (StatusCode::NOT_FOUND, m),
            // AppError::RateLimited => (StatusCode::TOO_MANY_REQUESTS, "too many requests".into()),
            AppError::Internal => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "internal server error".into(),
            ),
            AppError::Unauthorized(m) => (StatusCode::UNAUTHORIZED, m),
        };
        (status, Json(ErrorBody { error: msg })).into_response()
    }
}

fn self_code(err: &AppError) -> &'static str {
    match err {
        AppError::Validation(_) => "Validation",
        AppError::Database(_) => "Database",
        AppError::Conflict(_) => "Conflict",
        AppError::NotFound(_) => "NotFound",
        // AppError::RateLimited => "RateLimited",
        AppError::Internal => "Internal",
        AppError::Unauthorized(_) => "Unauthorized",
    }
}

impl From<deadpool_postgres::PoolError> for AppError {
    fn from(e: deadpool_postgres::PoolError) -> Self {
        tracing::error!("{e}");
        AppError::Database("Database operations encountered an error!".into())
    }
}

impl From<PgError> for AppError {
    fn from(e: PgError) -> Self {
        tracing::error!("Database error: {}", e);
        AppError::Database(e.to_string())
    }
}

pub async fn auth_middleware(
    State(state): State<AppState>,
    req: Request<Body>,
    next: Next,
) -> Result<Response, StatusCode> {
    if req.method() == Method::GET {
        return Ok(next.run(req).await);
    }
    let client = match state.db.get().await {
        Ok(client) => client,
        Err(e) => {
            println!("{}", e);
            return Err(StatusCode::UNAUTHORIZED);
        }
    };
    match req.headers().get(http::header::AUTHORIZATION) {
        Some(auth_header) => match check_session(auth_header.to_str().unwrap(), &client).await {
            Ok(_) => Ok(next.run(req).await),
            Err(e) => {
                eprintln!("{e}");
                Err(StatusCode::INTERNAL_SERVER_ERROR)
            }
        },
        None => Err(StatusCode::UNAUTHORIZED),
    }
}
pub async fn all_middleware(req: Request<Body>, next: Next) -> Result<Response, StatusCode> {
    tracing::info!("{} {}", req.method(), req.uri().path());
    Ok(next.run(req).await)
}
