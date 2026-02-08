use crate::api::websocket::utils::{emit_app_error, get_db_client, verify_login_handler};
use crate::database::games::get_full_game_data;
use crate::utils::ids::GameId;
use crate::utils::socket::check_auth;
use crate::utils::state::AppState;
use crate::utils::types::{SocketAuth, UserType};
use serde::Deserialize;
use socketioxide::adapter::Adapter;
use socketioxide::extract::{Data, SocketRef, State};

#[derive(Deserialize)]
struct SubscribeRequest {
    game_id: GameId,
}

/// Handler for referee websocket connections.
/// Only handles verify-login and subscribe events.
/// All actions are now REST API calls.
pub async fn referee_on_connect<A: Adapter>(
    auth: Data<SocketAuth>,
    s: SocketRef<A>,
    State(state): State<AppState>,
) {
    // Verify authentication first
    let ok = check_auth(&auth.token, &s, &state, UserType::Referee).await;
    tracing::info!("Referee: Connection verified: {}", ok);
    if !ok {
        let _ = s.disconnect();
        return;
    }

    // Register event handlers
    s.on("verify-login", verify_login_handler);

    // Subscribe to game updates - joins room and sends initial game data
    s.on(
        "subscribe",
        |s: SocketRef<A>, Data(req): Data<SubscribeRequest>, State(state): State<AppState>| async move {
            let room = format!("game:{}", req.game_id.0);
            tracing::info!("Socket {} subscribing to room {}", s.id, room);

            s.join(room);

            // Send initial game data immediately
            let client = match get_db_client(&state).await {
                Ok(c) => c,
                Err(e) => return emit_app_error(&s, e),
            };

            match get_full_game_data(&client, req.game_id).await {
                Ok(data) => {
                    if let Err(e) = s.emit("game-update", &data) {
                        tracing::error!("Failed to emit initial game data: {e}");
                    }
                }
                Err(e) => emit_app_error(&s, e),
            }
        },
    );
}
