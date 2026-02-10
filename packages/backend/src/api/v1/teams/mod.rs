use crate::utils::state::AppState;
use axum::routing::{post, put};
use axum::Router;

pub mod utils;
use self::utils::*;

pub fn router() -> Router<AppState> {
    Router::new()
        .route(
            "/{team_id}/moral-victory-eligible",
            put(set_moral_victory_eligible),
        )
        .route("/{team_id}/end-turn", post(end_turn))
        .route("/{team_id}/teleport", post(teleport_team))
}
