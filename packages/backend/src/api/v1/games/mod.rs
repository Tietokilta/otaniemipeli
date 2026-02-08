use crate::utils::state::AppState;
use axum::routing::{get, post};
use axum::Router;

pub mod utils;
use self::utils::*;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(games_get).post(games_post))
        .route("/{game_id}/start", post(start_game))
        .route("/{game_id}/teams", post(create_team))
}
