use crate::database::login::check_session;
use crate::utils::types::{PgError, SessionInfo};
use axum::body::Body;
use axum::extract::{FromRequestParts, OptionalFromRequestParts, State};
use axum::middleware::Next;
use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use deadpool_postgres::Pool;
use http::request::Parts;
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
    // #[error("internal error")]
    // Internal,
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
            // AppError::Internal => (
            //     StatusCode::INTERNAL_SERVER_ERROR,
            //     "internal server error".into(),
            // ),
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
        // AppError::Internal => "Internal",
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
        // Unique constraint violation (Postgres error code 23505)
        if let Some(db_err) = e.as_db_error() {
            if db_err.code() == &tokio_postgres::error::SqlState::UNIQUE_VIOLATION {
                return AppError::Conflict(db_err.detail().unwrap_or("already exists").to_string());
            }
        }
        tracing::error!("Database error: {}", e);
        AppError::Database(e.to_string())
    }
}

/// Extracts and validates a session from the Authorization header.
/// Returns UNAUTHORIZED if the session is invalid, None if the header is missing.
impl OptionalFromRequestParts<AppState> for SessionInfo {
    type Rejection = StatusCode;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Option<Self>, Self::Rejection> {
        let client = state.db.get().await.map_err(|e| {
            tracing::error!("{e}");
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

        let Some(auth_header) = parts.headers.get(http::header::AUTHORIZATION) else {
            return Ok(None);
        };

        let hash = auth_header.to_str().map_err(|_| StatusCode::UNAUTHORIZED)?;

        check_session(hash, &client)
            .await
            .map(|session| Some(session))
            .map_err(|e| match e {
                AppError::Unauthorized(_) => StatusCode::UNAUTHORIZED,
                _ => {
                    tracing::error!("{e}");
                    StatusCode::INTERNAL_SERVER_ERROR
                }
            })
    }
}

/// Extracts and validates a session from the Authorization header.
/// Returns UNAUTHORIZED if the header is missing or the session is invalid.
impl FromRequestParts<AppState> for SessionInfo {
    type Rejection = StatusCode;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        match <SessionInfo as OptionalFromRequestParts<AppState>>::from_request_parts(parts, state)
            .await?
        {
            Some(session) => Ok(session),
            None => Err(StatusCode::UNAUTHORIZED),
        }
    }
}

/// Middleware that validates session on non-GET requests and inserts SessionInfo as an extension.
pub async fn auth_middleware(
    State(_state): State<AppState>,
    session: Option<SessionInfo>,
    mut req: Request<Body>,
    next: Next,
) -> Result<Response, StatusCode> {
    if req.method() == Method::GET {
        return Ok(next.run(req).await);
    }
    let session = session.ok_or(StatusCode::UNAUTHORIZED)?;
    req.extensions_mut().insert(session);
    Ok(next.run(req).await)
}

pub async fn all_middleware(req: Request<Body>, next: Next) -> Result<Response, StatusCode> {
    tracing::info!("{} {}", req.method(), req.uri().path());
    Ok(next.run(req).await)
}
