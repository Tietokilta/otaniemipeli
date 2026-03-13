use crate::utils::state::AppState;
use axum::routing::{get, patch, post, put};
use axum::Router;

pub mod utils;
use self::utils::*;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(games_get).post(games_post))
        .route("/{game_id}/start", post(start_game))
        .route("/{game_id}/overlay", put(set_overlay_state))
        .route("/{game_id}/teams", post(create_team))
        .route(
            "/{game_id}/teams/{team_id}",
            patch(update_team).delete(delete_team),
        )
}
