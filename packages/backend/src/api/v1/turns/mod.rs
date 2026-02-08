use crate::utils::state::AppState;
use axum::routing::{delete, post, put};
use axum::Router;

pub mod utils;
use self::utils::*;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", post(start_turn))
        .route("/{turn_id}/dice", put(change_dice))
        .route("/{turn_id}/confirm", post(confirm_turn))
        .route("/{turn_id}", delete(cancel_turn))
        .route("/{turn_id}/end", post(end_turn))
        .route("/{turn_id}/penalty", post(confirm_penalty))
}
