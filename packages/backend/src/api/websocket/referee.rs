use crate::api::websocket::utils::{
    emit_db_error, emit_msg, emit_team_data, emit_teams, end_turn_handler, game_data_handler,
    get_db_client, get_drinks_handler, get_games_handler, run_emit_fn, start_turn_handler,
    verify_login_handler,
};
use crate::database::games::{get_games, post_game, start_game};
use crate::database::team::create_team;
use crate::database::turns::add_drinks_to_turn;
use crate::utils::socket::check_auth;
use crate::utils::state::AppState;
use crate::utils::types::{FirstTurnPost, PostGame, PostTurnDrinks, SocketAuth, Team, UserType};
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
            let client = match get_db_client(&state, &s).await {
                Some(c) => c,
                None => return,
            };
            if let Err(e) = post_game(&client, game).await {
                emit_db_error(&s, e).await;
                return;
            };
            run_emit_fn(&client, &s, "reply-games", |c| {
                Box::pin(async move { get_games(c).await })
            })
            .await;
        },
    );
    s.on(
    "start-game",
    |s: SocketRef<A>, Data(first_turn): Data<FirstTurnPost>, State(state): State<AppState>| async move {
      tracing::info!("Referee: start-game called");
      let client = match get_db_client(&state, &s).await {
        Some(c) => c,
        None => return,
      };
      match start_game(&client, first_turn).await {
        Ok(game) => {
          emit_msg(&s, "reply-game", &game).await;
        }
        Err(e) => {
          emit_db_error(&s, e).await;
        }
      }
    },
  );
    s.on("get-games", get_games_handler);
    s.on(
        "create-team",
        |s: SocketRef<A>, Data(team): Data<Team>, State(state): State<AppState>| async move {
            tracing::info!("Referee: create-team called");
            let client = match get_db_client(&state, &s).await {
                Some(c) => c,
                None => return,
            };
            let team: Team = match create_team(&client, team).await {
                Ok(team) => team,
                Err(e) => {
                    emit_db_error(&s, e).await;
                    return;
                }
            };
            emit_teams(&client, &s, team.game_id).await;
        },
    );
    s.on("get-drinks", get_drinks_handler);
    s.on("game-data", game_data_handler);
    s.on("start-turn", start_turn_handler);
    s.on("end-turn", end_turn_handler);
    s.on(
        "add-penalties",
        |s: SocketRef<A>,
         Data(turn_drinks): Data<PostTurnDrinks>,
         State(state): State<AppState>| async move {
            tracing::info!("Referee: add-penalties called");
            let client = match get_db_client(&state, &s).await {
                Some(c) => c,
                None => return,
            };
            if let Err(e) = add_drinks_to_turn(&client, turn_drinks.turn_drinks).await {
                emit_db_error(&s, e).await;
                return;
            }
            emit_team_data(&client, &s, turn_drinks.game_id).await;
        },
    );

    let ok = check_auth(&auth.token, &s, &state, UserType::Referee).await;
    tracing::info!("Referee: Connection verified: {}", ok);
    if !ok {
        let _ = s.disconnect();
        return;
    }
}
