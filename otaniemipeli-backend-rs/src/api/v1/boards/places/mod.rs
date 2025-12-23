use crate::api::v1::boards::utils::board_place_post;
use crate::utils::state::AppState;
use axum::routing::{get, patch};
use axum::Router;

pub mod utils;
use self::utils::*;

pub mod drinks;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(places_get).post(places_post))
        .route("/{board_id}/coordinate", patch(coordinate_patch))
        .route("/{id}", get(board_places_get).post(board_place_post))
        .nest("/drinks", drinks::router())
}
