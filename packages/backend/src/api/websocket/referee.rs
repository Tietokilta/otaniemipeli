use crate::api::websocket::utils::{
    emit_app_error, emit_msg, get_db_client, verify_login_handler, ServerResponse,
};
use crate::database::games::get_full_game_data;
use crate::utils::ids::GameId;
use crate::utils::socket::check_auth_any;
use crate::utils::state::SocketState;
use crate::utils::types::{SocketAuth, UserType};
use serde::Deserialize;
use socketioxide::adapter::Adapter;
use socketioxide::extract::{Data, SocketRef, State};

#[derive(Deserialize)]
struct SubscribeRequest {
    game_id: GameId,
}

/// Allowed user types for websocket connections.
const ALLOWED_TYPES: &[UserType] = &[
    UserType::Admin,
    UserType::Referee,
    UserType::Ie,
    UserType::Secretary,
];

/// Handler for websocket connections.
/// Accepts Admin, Referee, Ie, and Secretary users.
/// Only handles verify-login and subscribe events.
/// All actions are now REST API calls.
pub async fn referee_on_connect<A: Adapter>(
    s: SocketRef<A>,
    Data(auth): Data<SocketAuth>,
    State(state): State<SocketState>,
) {
    // Register event handlers FIRST (before async auth check) to avoid race conditions
    // where client sends events before handlers are registered
    s.on("verify-login", verify_login_handler);
    s.on(
        "subscribe",
        |s: SocketRef<A>, Data(req): Data<SubscribeRequest>, State(state): State<SocketState>| async move {
            let room = format!("game:{}", req.game_id.0);
            s.join(room);

            // Send initial game data immediately
            let client = match get_db_client(&state).await {
                Ok(c) => c,
                Err(e) => return emit_app_error(&s, e),
            };

            match get_full_game_data(&client, req.game_id).await {
                Ok(data) => emit_msg(&s, ServerResponse::GameUpdate(data)),
                Err(e) => emit_app_error(&s, e),
            }
        },
    );

    // Verify authentication - allow Admin, Referee, Ie, and Secretary
    if !check_auth_any(&auth.token, &s, &state, ALLOWED_TYPES).await {
        let _ = s.disconnect();
    }
}
