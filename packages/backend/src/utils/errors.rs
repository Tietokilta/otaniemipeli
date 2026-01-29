use axum::Json;

use crate::utils::{state::AppError, types::PgError};

pub fn wrap_db_error<T>(result: Result<T, PgError>, context: &str) -> Result<Json<T>, AppError> {
    match result {
        Ok(value) => Ok(Json(value)),
        Err(e) => {
            tracing::error!("Database error: {}", e);
            Err(AppError::Database(context.to_string()))
        }
    }
}
