use crate::api::referee::utils::get_db_client;
use crate::database::games::{get_games, get_team_data};
use crate::utils::socket::check_auth;
use crate::utils::state::AppState;
use crate::utils::types::{Games, SocketAuth, UserType};
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
    s.on(
        "verify-login",
        |s: SocketRef<A>, Data(auth): Data<SocketAuth>, State(state): State<AppState>| async move {
            let token = auth.token.clone();
            match check_auth(&token, &s, &state, UserType::Secretary).await {
                true => {}
                false => {
                    let _ = s.disconnect();
                    return;
                }
            }
        },
    );
    s.on(
        "end-turn",
        |_: SocketRef<A>, Data(v): Data<Value>| async move {
            tracing::info!("RAW end-turn payload: {v}");
        },
    );
    s.on("get-games", |s: SocketRef<A>| async move {
        let client = match get_db_client(&state, &s).await {
            Some(c) => c,
            None => return,
        };
        let games = get_games(&client)
            .await
            .unwrap_or_else(|_| Games { games: Vec::new() });
        s.emit("reply-games", &games)
            .expect("Failed replying games");
    });
    s.on(
        "game_data",
        |s: SocketRef<A>, Data(game_id): Data<i32>, State(state): State<AppState>| async move {
            let client = match get_db_client(&state, &s).await {
                Some(c) => c,
                None => return,
            };
            match get_team_data(&client, game_id).await {
                Ok(game_data) => {
                    s.emit("reply-game", &game_data)
                        .expect("Failed replying game");
                }
                Err(e) => {
                    let _ = s.emit("response-error", &format!("db error: {e}"));
                }
            }
        },
    );
}
