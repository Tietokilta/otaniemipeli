use crate::utils::state::AppState;
use axum::routing::get;
use axum::Router;

pub mod utils;
use self::utils::*;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/{game_id}", get(games_get))
        .route("/", get(games_get_all))
}
