use crate::api::v1::boards::utils::boards_post;
use crate::utils::state::AppState;
use axum::routing::get;
use axum::Router;

pub mod utils;
use self::utils::{boards_get, boards_get_id};

pub mod places;

pub fn router() -> Router<AppState> {
    Router::new()
        .nest("/places", places::router())
        .route("/{id}", get(boards_get_id))
        .route("/", get(boards_get).post(boards_post))
}
