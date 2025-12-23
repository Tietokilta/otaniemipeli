use crate::utils::state::AppState;
use axum::Router;

pub mod boards;
pub mod drinks;
pub mod games;
pub mod ingredients;

pub fn router() -> Router<AppState> {
    Router::new()
        .merge(ingredients::router())
        .nest("/drinks", drinks::router())
        .nest("/boards", boards::router())
        .nest("/games", games::router())
}
