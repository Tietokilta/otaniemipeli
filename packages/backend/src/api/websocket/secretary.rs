use crate::api::websocket::utils::{emit_msg, emit_team_data, emit_teams, end_turn_emit, get_db_client, run_emit_fn};
use crate::database::games::{get_games, get_team_data};
use crate::utils::socket::check_auth;
use crate::utils::state::AppState;
use crate::utils::types::{EndTurn, Games, SocketAuth, UserType};
use serde_json::Value;
use socketioxide::adapter::Adapter;
use socketioxide::extract::{Data, SocketRef, State};
use crate::database::drinks::get_drinks_ingredients;

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
      let auth = check_auth(&auth.token, &s, &state, UserType::Referee).await;
      tracing::info!("Referee: Connection verified: {}", auth);
      emit_msg(&s, "verification-reply", &auth).await;
      if !auth {
        let _ = s.disconnect();
      }
    },
  );
  s.on(
    "get-games",
    |s: SocketRef<A>, State(state): State<AppState>| async move {
      tracing::info!("Referee: get-games called");
      let client = match get_db_client(&state, &s).await {
        Some(c) => c,
        None => return,
      };
      run_emit_fn(&client, &s, "reply-games", |c| {
        Box::pin(async move { get_games(c).await })
      })
        .await;
    },
  );
  s.on(
    "get-teams",
    |s: SocketRef<A>, Data(game_id): Data<i32>, State(state): State<AppState>| async move {
      tracing::info!("Referee: get-teams called");
      let client = match get_db_client(&state, &s).await {
        Some(c) => c,
        None => return,
      };
      emit_teams(&client, &s, game_id).await;
    },
  );
  s.on(
    "get-drinks",
    |s: SocketRef<A>, State(state): State<AppState>| async move {
      tracing::info!("Referee: get-drinks called");
      let client = match get_db_client(&state, &s).await {
        Some(c) => c,
        None => return,
      };
      run_emit_fn(&client, &s, "reply-drinks", |c| {
        Box::pin(async move { get_drinks_ingredients(c).await })
      })
        .await;
    },
  );
  s.on(
    "game-data",
    |s: SocketRef<A>, Data(game_id): Data<i32>, State(state): State<AppState>| async move {
      tracing::info!("Referee: game_data called");
      let client = match get_db_client(&state, &s).await {
        Some(c) => c,
        None => return,
      };
      emit_team_data(&client, &s, game_id).await;
    },
  );
  s.on(
    "end-turn",
    |s: SocketRef<A>, Data(turn_data): Data<EndTurn>, State(state): State<AppState>| async move {
      tracing::info!("Referee: end-turn called");
      let client = match get_db_client(&state, &s).await {
        Some(c) => c,
        None => return,
      };
      end_turn_emit(&client, &s, turn_data).await;
    },
  );
  let ok = check_auth(&auth.token, &s, &state, UserType::Secretary).await;
  if !ok {
    let _ = s.disconnect();
    return;
  }

  tracing::info!("Secretary: Connection authorized");
}
