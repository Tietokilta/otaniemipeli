pub mod referee;
pub mod secretary;
pub mod v1;

use crate::utils::state::{auth_middleware, AppState};
use axum::{middleware, Router};

pub fn router(state: AppState) -> Router<AppState> {
    Router::new()
        .nest("/v1", v1::router())
        .layer(middleware::from_fn_with_state(
            state.clone(),
            auth_middleware,
        ))
}
