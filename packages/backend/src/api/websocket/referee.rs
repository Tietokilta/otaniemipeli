use crate::api::websocket::utils::{
    emit_app_error, emit_result, end_turn_handler, game_data_handler, get_db_client,
    get_drinks_handler, get_games_handler, start_turn_handler, verify_login_handler,
    ServerResponse,
};
use crate::database::games::{get_games, get_team_data, post_game, start_game};
use crate::database::team::create_team;
use crate::database::turns::{add_drinks_to_turn, create_penalty_turn};
use crate::utils::socket::check_auth;
use crate::utils::state::AppState;
use crate::utils::types::{FirstTurnPost, PostGame, PostPenalty, SocketAuth, Team, UserType};
use socketioxide::adapter::Adapter;
use socketioxide::extract::{Data, SocketRef, State};

pub async fn referee_on_connect<A: Adapter>(
    auth: Data<SocketAuth>,
    s: SocketRef<A>,
    State(state): State<AppState>,
) {
    s.on("verify-login", verify_login_handler);
    s.on(
        "create-game",
        |s: SocketRef<A>, Data(game): Data<PostGame>, State(state): State<AppState>| async move {
            tracing::info!("Referee: create-game called");
            let client = match get_db_client(&state).await {
                Ok(c) => c,
                Err(e) => return emit_app_error(&s, e),
            };
            if let Err(e) = post_game(&client, game).await {
                emit_app_error(&s, e);
                return;
            }
            emit_result(&s, get_games(&client).await.map(ServerResponse::Games));
        },
    );
    s.on(
        "start-game",
        |s: SocketRef<A>,
         Data(first_turn): Data<FirstTurnPost>,
         State(state): State<AppState>| async move {
            tracing::info!("Referee: start-game called");
            let client = match get_db_client(&state).await {
                Ok(c) => c,
                Err(e) => return emit_app_error(&s, e),
            };
            let game = match start_game(&client, first_turn).await {
                Ok(g) => g,
                Err(e) => return emit_app_error(&s, e),
            };
            emit_result(&s, get_team_data(&client, game.id).await.map(ServerResponse::GameData));
        },
    );
    s.on("get-games", get_games_handler);
    s.on(
        "create-team",
        |s: SocketRef<A>, Data(team): Data<Team>, State(state): State<AppState>| async move {
            tracing::info!("Referee: create-team called");
            let client = match get_db_client(&state).await {
                Ok(c) => c,
                Err(e) => return emit_app_error(&s, e),
            };
            let team = match create_team(&client, team).await {
                Ok(t) => t,
                Err(e) => {
                    emit_app_error(&s, e);
                    return;
                }
            };
            emit_result(
                &s,
                get_team_data(&client, team.game_id)
                    .await
                    .map(ServerResponse::GameData),
            );
        },
    );
    s.on("get-drinks", get_drinks_handler);
    s.on("game-data", game_data_handler);
    s.on("start-turn", start_turn_handler);
    s.on("end-turn", end_turn_handler);
    s.on(
        "add-penalties",
        |s: SocketRef<A>,
         Data(penalty): Data<PostPenalty>,
         State(state): State<AppState>| async move {
            tracing::info!("Referee: add-penalties called");
            let client = match get_db_client(&state).await {
                Ok(c) => c,
                Err(e) => return emit_app_error(&s, e),
            };
            // Create a new penalty turn with thrown_at and confirmed_at set
            let turn = match create_penalty_turn(&client, penalty.team_id, penalty.game_id).await {
                Ok(t) => t,
                Err(e) => {
                    emit_app_error(&s, e);
                    return;
                }
            };
            // Add the drinks to the turn
            let turn_drinks = penalty.drinks.to_turn_drinks(turn.turn_id);
            if let Err(e) = add_drinks_to_turn(&client, turn_drinks).await {
                emit_app_error(&s, e);
                return;
            }
            emit_result(&s, get_team_data(&client, penalty.game_id).await.map(ServerResponse::GameData));
        },
    );

    let ok = check_auth(&auth.token, &s, &state, UserType::Referee).await;
    tracing::info!("Referee: Connection verified: {}", ok);
    if !ok {
        let _ = s.disconnect();
        return;
    }
}
