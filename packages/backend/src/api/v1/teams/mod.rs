use crate::utils::state::AppState;
use axum::routing::{post, put};
use axum::Router;

pub mod utils;
use self::utils::*;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/{team_id}/moral-loss-level", put(set_moral_loss_level))
        .route("/{team_id}/end-turn", post(end_turn))
        .route("/{team_id}/teleport", post(teleport_team))
}
