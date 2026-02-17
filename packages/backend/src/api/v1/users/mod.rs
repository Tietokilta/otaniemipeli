use crate::utils::state::AppState;
use axum::routing::{delete, get};
use axum::Router;

pub mod utils;
use self::utils::*;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(users_get))
        .route("/{id}", delete(user_delete))
}
