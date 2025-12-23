use crate::login::utils::{
    create_user, end_all_sessions, end_session, exist_users, start_session, verify_session,
};
use crate::utils::state::AppState;
use axum::routing::{delete, post};
use axum::Router;

pub mod utils;

pub fn router() -> Router<AppState> {
    Router::new()
        .route(
            "/",
            post(start_session)
                .put(verify_session)
                .delete(end_session)
                .get(exist_users),
        )
        .route("/all", delete(end_all_sessions))
        .route("/create_user", post(create_user))
}
