pub mod utils;

use self::utils::*;
use crate::utils::state::AppState;
use axum::routing::put;
use axum::Router;

pub fn router() -> Router<AppState> {
    Router::new().route("/", put(put_place_drinks))
}
