use crate::api::websocket::utils::{
    emit_msg, emit_team_data, emit_teams, end_turn_emit, end_turn_handler, game_data_handler,
    get_db_client, get_drinks_handler, get_games_handler, run_emit_fn,
    verify_login_handler,
};
use crate::database::drinks::get_drinks_ingredients;
use crate::database::games::{get_games, get_team_data};
use crate::utils::socket::check_auth;
use crate::utils::state::AppState;
use crate::utils::types::{EndTurn, Games, SocketAuth, UserType};
use serde_json::Value;
use socketioxide::adapter::Adapter;
use socketioxide::extract::{Data, SocketRef, State};

pub async fn secretary_on_connect<A: Adapter>(
    auth: Data<SocketAuth>,
    s: SocketRef<A>,
    State(state): State<AppState>,
) {
    let token = auth.token.clone();
    match check_auth(&token, &s, &state, UserType::Secretary).await {
        true => {}
        false => {
            let _ = s.disconnect();
            return;
        }
    }
    s.on("verify-login", verify_login_handler);
    s.on("get-games", get_games_handler);
    s.on("get-drinks", get_drinks_handler);
    s.on("game-data", game_data_handler);
    s.on("end-turn", end_turn_handler);
    let ok = check_auth(&auth.token, &s, &state, UserType::Secretary).await;
    if !ok {
        let _ = s.disconnect();
        return;
    }

    tracing::info!("Secretary: Connection authorized");
}
