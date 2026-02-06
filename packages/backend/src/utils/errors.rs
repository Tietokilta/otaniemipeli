use axum::Json;

use crate::utils::state::AppError;

pub fn wrap_json<T>(result: Result<T, AppError>) -> Result<Json<T>, AppError> {
    result.map(Json)
}
