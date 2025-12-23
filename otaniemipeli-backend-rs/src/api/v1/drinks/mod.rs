use crate::utils::state::AppState;
use axum::routing::{delete, get};
use axum::Router;

pub mod utils;
use self::utils::*;

pub mod ingredients;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(drinks_get).post(drinks_post))
        .route("/{id}", delete(drink_delete))
        .merge(ingredients::router())
}
