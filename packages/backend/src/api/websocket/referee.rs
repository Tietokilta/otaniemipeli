use crate::api::websocket::utils::{
    emit_app_error, emit_db_error, emit_msg, emit_team_data, emit_teams, end_turn_emit,
    end_turn_handler, game_data_handler, get_db_client, get_drinks_handler, get_games_handler,
    run_emit_fn, verify_login_handler,
};
use crate::database::boards::move_team;
use crate::database::games::{
    check_dice, end_game, get_games, get_team_data, post_game, start_game,
};
use crate::database::team::{create_team, make_team_double, make_team_normal};
use crate::database::turns::{add_drinks_to_turn, add_visited_place, start_turn};
use crate::utils::socket::check_auth;
use crate::utils::state::AppState;
use crate::utils::types::{
    EndTurn, FirstTurnPost, PlaceThrow, PostGame, PostStartTurn, PostTurnDrinks, SocketAuth, Team,
    UserType,
};
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
    s.on(
        "start-turn",
        |s: SocketRef<A>,
         Data(turn_start_data): Data<PostStartTurn>,
         State(state): State<AppState>| async move {
            tracing::info!("Referee: start-turn called");

            let client = match get_db_client(&state, &s).await {
                Some(c) => c,
                None => return,
            };

            // Validate dice throw
            if let Err(e) = check_dice(turn_start_data.dice1, turn_start_data.dice2) {
                emit_app_error(&s, e).await;
                return;
            }

            // If double double the drinks or effects when needed
            let double = turn_start_data.dice1 == turn_start_data.dice2;

            // Get game data
            let game_data = match get_team_data(&client, turn_start_data.game_id).await {
                Ok(gd) => gd,
                Err(e) => {
                    emit_db_error(&s, e).await;
                    return;
                }
            };

            // Begin the turn
            let turn = match start_turn(&client, turn_start_data).await {
                Ok(turn) => turn,
                Err(e) => {
                    emit_db_error(&s, e).await;
                    return;
                }
            };

            // If team has area double e.g. in Tampere
            let team_double = match game_data
                .teams
                .iter()
                .find(|t| t.team.team_id == turn.team_id)
            {
                Some(team) => team.team.double,
                None => false,
            };
            let throw = (turn.dice1 as i8, turn.dice2 as i8);

            // find current place for that Team (avoid cloning whole game_data)
            let current_place = game_data
                .teams
                .iter()
                .find(|t| t.team.team_id == turn.team_id)
                .and_then(|t| t.location.clone())
                .unwrap();

            let pl = PlaceThrow {
                place: current_place.clone(),
                throw,
                team_id: turn.team_id,
            };

            let place_after = match move_team(&client, pl).await {
                Ok(p) => p,
                Err(e) => {
                    emit_app_error(&s, e).await;
                    return;
                }
            };

            // If moving to tampere on doubles then make team double drinks and if moving out of tampere
            // and team had double drinks then revert back to normal drinks
            if current_place.area == "normal" && place_after.area == "tampere" && double {
                match make_team_double(&client, turn.team_id).await {
                    Ok(_) => {}
                    Err(e) => {
                        emit_db_error(&s, e).await;
                    }
                };
            } else if current_place.area == "tampere" && place_after.area == "normal" && team_double
            {
                match make_team_normal(&client, turn.team_id).await {
                    Ok(_) => {}
                    Err(e) => {
                        emit_db_error(&s, e).await;
                    }
                };
            }

            // Convert place drinks to turn drinks and apply double if needed
            let turn_drinks = match place_after
                .drinks
                .to_turn_drinks(&client, turn.turn_id, turn.game_id, double || team_double)
                .await
            {
                Ok(td) => td,
                Err(e) => {
                    emit_app_error(&s, e).await;
                    return;
                }
            };
            let dr_empty = turn_drinks.drinks.is_empty();
            // Write turn drinks to database
            if let Err(e) = add_drinks_to_turn(&client, turn_drinks).await {
                emit_db_error(&s, e).await;
                return;
            }

            if let Err(e) = add_visited_place(&client, place_after.place_number, turn.turn_id).await
            {
                emit_db_error(&s, e).await;
                return;
            }
            if place_after.end {
                if let Err(e) = end_game(&client, turn.game_id).await {
                    emit_db_error(&s, e).await;
                    return;
                };
            }
            if dr_empty && !place_after.end {
                end_turn_emit(
                    &client,
                    &s,
                    EndTurn {
                        team_id: turn.team_id,
                        game_id: turn.game_id,
                    },
                )
                .await;
            }
            emit_team_data(&client, &s, turn.game_id).await;
        },
    );
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
