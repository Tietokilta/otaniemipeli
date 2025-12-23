pub mod utils;

use self::utils::*;
use crate::utils::state::AppState;
use axum::routing::post;
use axum::Router;

pub fn router() -> Router<AppState> {
    Router::new().route("/", post(post_place_drinks))
}
