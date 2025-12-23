use crate::utils::state::AppState;
use axum::routing::get;
use axum::Router;

pub mod utils;
use self::utils::*;

pub fn router() -> Router<AppState> {
    Router::new().route("/", get(games_get).post(games_post))
}
