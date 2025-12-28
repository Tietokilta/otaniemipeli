use crate::database::boards::move_team;
use crate::database::drinks::get_drinks_ingredients;
use crate::database::games::{check_dice, get_games, get_team_data, post_game, start_game};
use crate::database::team::{create_team, get_teams};
use crate::database::turns::{add_drinks_to_turn, add_visited_place, end_turn, start_turn};
use crate::utils::socket::check_auth;
use crate::utils::state::AppState;
use crate::utils::types::{EndTurn, FirstTurnPost, Games, PlaceThrow, PostGame, PostStartTurn, PostTurnDrinks, SocketAuth, Team, Teams, UserType};
use deadpool_postgres::Client;
use socketioxide::adapter::Adapter;
use socketioxide::extract::{Data, SocketRef, State};

pub async fn referee_on_connect<A: Adapter>(
    auth: Data<SocketAuth>,
    s: SocketRef<A>,
    State(state): State<AppState>,
) {
    s.on(
        "verify-login",
        |s: SocketRef<A>, Data(auth): Data<SocketAuth>, State(state): State<AppState>| async move {
            tracing::info!("Referee: verify-login called");
            let auth = check_auth(&auth.token, &s, &state, UserType::Referee).await;
            if auth {
                tracing::info!("Referee: Connection successfully verified");
                if let Err(err) = s.emit("verification-reply", &true) {
                    tracing::error!("Failed replying game data: {err}")
                };
            } else {
                tracing::info!("Referee: Connection failed verification, disconnecting");
                if let Err(err) = s.emit("verification-reply", &false) {
                    tracing::error!("Failed replying game data: {err}")
                };
                let _ = s.disconnect();
            }
        },
    );
    s.on(
        "create-game",
        |s: SocketRef<A>, Data(game): Data<PostGame>, State(state): State<AppState>| async move {
            tracing::info!("Referee: create-game called");
            let client = match state.db.get().await {
                Ok(c) => c,
                Err(e) => {
                    if let Err(err) = s.emit("response-error", &format!("db pool error: {e}")) {
                        tracing::error!("Failed replying game data: {err}")
                    };
                    return;
                }
            };

            match post_game(&client, game).await {
                Ok(game) => {
                    if let Err(send) = s.emit("response", &game) {
                        eprintln!("send error: {send}");
                    } else {
                        let games = get_games(&client)
                            .await
                            .unwrap_or_else(|_| Games { games: Vec::new() });
                        if let Err(err) = s.emit("reply-games", &games) {
                            tracing::error!("Failed replying game data: {err}")
                        };
                    }
                }
                Err(e) => {
                    if let Err(err) = s.emit("response-error", &format!("db error: {e}")) {
                        tracing::error!("Failed replying game data: {err}")
                    };
                }
            }
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
                    if let Err(err) = s.emit("reply-game", &game) {
                        tracing::error!("Failed replying game data: {err}")
                    };
                }
                Err(e) => {
                    if let Err(err) = s.emit("response-error", &format!("db error: {e}")) {
                        tracing::error!("Failed replying game data: {err}")
                    };
                }
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
            let games = get_games(&client)
                .await
                .unwrap_or_else(|_| Games { games: Vec::new() });
            if let Err(err) = s.emit("reply-games", &games) {
                tracing::error!("Failed replying game data: {err}")
            };
        },
    );
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
                    if let Err(err) = s.emit("response-error", &format!("db error: {e}")) {
                        tracing::error!("Failed replying game data: {err}")
                    };
                    return;
                }
            };
            let teams: Teams = match get_teams(&client, team.game_id).await {
                Ok(teams) => Teams { teams },
                Err(e) => {
                    if let Err(err) = s.emit("response-error", &format!("db error: {e}")) {
                        tracing::error!("Failed replying game data: {err}")
                    };
                    return;
                }
            };
            if let Err(err) = s.emit("reply-teams", &teams) {
                tracing::error!("Failed replying game data: {err}")
            };
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
            let teams: Teams = match get_teams(&client, game_id).await {
                Ok(teams) => Teams { teams },
                Err(e) => {
                    if let Err(err) = s.emit("response-error", &format!("db error: {e}")) {
                        tracing::error!("Failed replying game data: {err}")
                    };
                    return;
                }
            };
            if let Err(err) = s.emit("reply-teams", &teams) {
                tracing::error!("Failed replying game data: {err}")
            };
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
            match get_drinks_ingredients(&client).await {
                Ok(drinks) => {
                    if let Err(err) = s.emit("reply-drinks", &drinks) {
                        tracing::error!("Failed replying game data: {err}")
                    };
                }
                Err(e) => {
                    if let Err(err) = s.emit("response-error", &format!("db error: {e}")) {
                        tracing::error!("Failed replying game data: {err}")
                    };
                }
            }
        },
    );
    s.on(
        "game-data",
        |s: SocketRef<A>, Data(game_id): Data<i32>, State(state): State<AppState>| async move {
            tracing::info!("Referee: game-data called");
            let client = match get_db_client(&state, &s).await {
                Some(c) => c,
                None => return,
            };

            match get_team_data(&client, game_id).await {
                Ok(game_data) => {
                    if let Err(err) = s.emit("reply-game", &game_data) {
                        tracing::error!("Failed replying game data: {err}")
                    };
                }
                Err(e) => {
                    if let Err(err) = s.emit("response-error", &format!("db error: {e}")) {
                        tracing::error!("Failed replying game data: {err}")
                    };
                }
            }
        },
    );
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
            if let Err(e) = check_dice(turn_start_data.dice1, turn_start_data.dice2) {
                if let Err(err) = s.emit("response-error", &format!("dice error: {e}")) {
                    tracing::error!("Failed replying game data: {err}")
                };
                return;
            }
            match start_turn(&client, turn_start_data).await {
                Ok(turn) => match get_team_data(&client, turn.game_id).await {
                    Ok(mut game_data) => {
                        let throw = (turn.dice1 as i8, turn.dice2 as i8);

                        // find current place for that Team (avoid cloning whole game_data)
                        let current_place = game_data
                            .teams
                            .iter()
                            .find(|t| t.team.team_id == turn.team_id)
                            .and_then(|t| t.location.clone()) // Option<BoardPlace>
                            .unwrap();

                        let pl = PlaceThrow {
                            place: current_place,
                            throw,
                            team_id: turn.team_id,
                        };

                        let place_after = match move_team(&client, pl).await {
                            Ok(p) => p,
                            Err(e) => {
                                if let Err(err) =
                                    s.emit("response-error", &format!("db error: {e}"))
                                {
                                    tracing::error!("Failed replying game data: {err}")
                                };
                                return;
                            }
                        };
                        match add_visited_place(
                            &client,
                            turn.game_id,
                            place_after.place_number,
                            turn.team_id,
                        )
                        .await
                        {
                            Ok(_) => {}
                            Err(e) => {
                                if let Err(err) =
                                    s.emit("response-error", &format!("db error: {e}"))
                                {
                                    tracing::error!("Failed replying game data: {err}")
                                };
                                return;
                            }
                        }

                        // write it back into the right Team
                        if let Some(team_state) = game_data
                            .teams
                            .iter_mut()
                            .find(|t| t.team.team_id == turn.team_id)
                        {
                            team_state.location = Some(place_after);
                        }

                        if let Err(err) = s.emit("reply-game", &game_data) {
                            tracing::error!("Failed replying game data: {err}");
                        }
                    }
                    Err(e) => {
                        if let Err(err) = s.emit("response-error", &format!("db error: {e}")) {
                            tracing::error!("Failed replying game data: {err}")
                        };
                    }
                },
                Err(e) => {
                    if let Err(err) = s.emit("response-error", &format!("db error: {e}")) {
                        tracing::error!("Failed replying game data: {err}")
                    };
                }
            }
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
            match end_turn(&client, turn_data.team_id, turn_data.game_id).await {
                Ok(turn) => match get_team_data(&client, turn.game_id).await {
                    Ok(game_data) => {
                        if let Err(err) = s.emit("reply-game", &game_data) {
                            tracing::error!("Failed replying game data: {err}")
                        };
                    }
                    Err(e) => {
                        if let Err(err) = s.emit("response-error", &format!("db error: {e}")) {
                            tracing::error!("Failed replying game data: {err}")
                        };
                    }
                },
                Err(e) => {
                    if let Err(err) = s.emit("response-error", &format!("db error: {e}")) {
                        tracing::error!("Failed replying game data: {err}")
                    };
                }
            }
        },
    );
    s.on("add-penalties", |s: SocketRef<A>, Data(turn_drinks): Data<PostTurnDrinks>, State(state): State<AppState>| async move {
        println!("Referee: add-penlties called");
        let client = match get_db_client(&state, &s).await {
            Some(c) => c,
            None => return,
        };
        match add_drinks_to_turn(&client, turn_drinks.turn_drinks).await {
            Ok(_) => {
                match get_team_data(&client, turn_drinks.game_id).await {
                    Ok(game_data) => {
                        if let Err(err) = s.emit("reply-game", &game_data) {
                            tracing::error!("Failed replying game data: {err}")
                        };
                    }
                    Err(e) => {
                        if let Err(err) = s.emit("response-error", &format!("db error: {e}")) {
                            tracing::error!("Failed replying game data: {err}")
                        };
                    }
                }
            }
            Err(e) => {
                if let Err(err) = s.emit("response-error", &format!("db error: {e}")) {
                    tracing::error!("Failed replying game data: {err}")
                };
            }
        }}
    );

    let ok = check_auth(&auth.token, &s, &state, UserType::Referee).await;
    if !ok {
        let _ = s.disconnect();
        return;
    }

    tracing::info!("Referee: Connection authorized");
}
pub(crate) async fn get_db_client(state: &AppState, s: &SocketRef<impl Adapter>) -> Option<Client> {
    match state.db.get().await {
        Ok(c) => Some(c),
        Err(e) => {
            if let Err(err) = s.emit("response-error", &format!("db pool error: {e}")) {
                tracing::error!("Failed replying game data: {err}")
            };
            None
        }
    }
}
