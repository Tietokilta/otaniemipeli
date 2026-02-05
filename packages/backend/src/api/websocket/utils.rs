use crate::database::boards::move_team;
use crate::database::drinks::get_drinks_ingredients;
use crate::database::games::{check_dice, end_game, get_games, get_team_data};
use crate::database::team::{get_teams, set_team_double_tampere};
use crate::database::turns::{add_drinks_to_turn, add_visited_place, end_turn, start_turn};
use crate::utils::ids::GameId;
use crate::utils::socket::check_auth;
use crate::utils::state::{AppError, AppState};
use crate::utils::types::{
    EndTurn, PgError, PlaceThrow, PostStartTurn, SocketAuth, Teams, UserType,
};
use deadpool_postgres::Client;
use serde::Serialize;
use socketioxide::adapter::{Adapter, Emitter};
use socketioxide::extract::{Data, SocketRef, State};
use socketioxide_core::adapter::CoreAdapter;
use std::future::Future;
use std::pin::Pin;

pub(crate) async fn get_db_client(state: &AppState, s: &SocketRef<impl Adapter>) -> Option<Client> {
    match state.db.get().await {
        Ok(c) => Some(c),
        Err(e) => {
            tracing::error!("DB connection error: {}", e);
            if let Err(err) = s.emit("response-error", "Internal Server Error") {
                tracing::error!("Failed replying game data: {err}")
            };
            None
        }
    }
}
pub async fn emit_db_error(s: &SocketRef<impl Adapter>, error: PgError) {
    tracing::error!("{error}");
    if let Err(err) = s.emit("response-error", "Internal Server Error") {
        tracing::error!("Failed replying error message: {err}")
    };
}
pub async fn emit_app_error(s: &SocketRef<impl Adapter>, error: AppError) {
    tracing::error!("{error}");
    if let Err(err) = s.emit("response-error", &format!("{}", error)) {
        tracing::error!("Failed replying error message: {err}")
    };
}
pub async fn emit_msg<T: Serialize>(s: &SocketRef<impl Adapter>, event: &str, payload: &T) {
    if let Err(err) = s.emit(event, &payload) {
        tracing::error!("Failed replying game data: {err}")
    };
}
pub async fn run_emit_fn<T, F>(client: &Client, s: &SocketRef<impl Adapter>, event: &str, db_fn: F)
where
    T: Serialize,
    // HRTB: for any 'a, given &'a Client, you can produce a Future that lives at least 'a
    F: for<'a> Fn(&'a Client) -> Pin<Box<dyn Future<Output = Result<T, PgError>> + Send + 'a>>,
{
    match db_fn(client).await {
        Ok(data) => {
            emit_msg(s, event, &data).await;
        }
        Err(e) => {
            emit_db_error(s, e).await;
        }
    }
}
pub async fn emit_team_data(client: &Client, s: &SocketRef<impl Adapter>, game_id: GameId) -> () {
    match get_team_data(client, game_id).await {
        Ok(data) => {
            emit_msg(s, "reply-game", &data).await;
        }
        Err(e) => {
            emit_db_error(s, e).await;
        }
    }
}

pub async fn emit_teams(client: &Client, s: &SocketRef<impl Adapter>, game_id: GameId) {
    match get_teams(client, game_id).await {
        Ok(teams) => {
            // TODO: The frontend doesn't handle this, but the scripts need it.
            //  Should use reply-game?
            emit_msg(s, "reply-teams", &Teams { teams }).await;
        }
        Err(e) => {
            emit_db_error(s, e).await;
        }
    }
}

pub async fn end_turn_emit(client: &Client, s: &SocketRef<impl Adapter>, et: EndTurn) {
    if let Err(e) = end_turn(&client, &et).await {
        emit_app_error(&s, e).await;
    }
    emit_team_data(&client, &s, et.game_id).await
}

pub async fn get_drinks_handler<A: CoreAdapter<Emitter>>(
    s: SocketRef<A>,
    State(state): State<AppState>,
) {
    tracing::info!("Referee: get-drinks called");
    let client = match get_db_client(&state, &s).await {
        Some(c) => c,
        None => return,
    };
    run_emit_fn(&client, &s, "reply-drinks", |c| {
        Box::pin(async move { get_drinks_ingredients(c).await })
    })
    .await;
}

pub async fn game_data_handler<A: CoreAdapter<Emitter>>(
    s: SocketRef<A>,
    Data(game_id): Data<GameId>,
    State(state): State<AppState>,
) {
    tracing::info!("Referee: game_data called");
    let client = match get_db_client(&state, &s).await {
        Some(c) => c,
        None => return,
    };
    emit_team_data(&client, &s, game_id).await;
}

pub async fn start_turn_handler<A: CoreAdapter<Emitter>>(
    s: SocketRef<A>,
    Data(turn_start_data): Data<PostStartTurn>,
    State(state): State<AppState>,
) {
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
    let double = if double { 2 } else { 1 };
    let throw = (turn_start_data.dice1 as i8, turn_start_data.dice2 as i8);

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

    // See if the team has double Tampere active
    let double_tampere = game_data
        .teams
        .iter()
        .find(|t| t.team.team_id == turn.team_id)
        .expect("team should exist since turn was just created")
        .team
        .double_tampere;
    let double_tampere = if double_tampere { 2 } else { 1 };

    // find current place for that Team
    let current_place = match game_data
        .teams
        .iter()
        .find(|t| t.team.team_id == turn.team_id)
        .and_then(|t| t.location.clone())
    {
        Some(place) => place,
        None => {
            emit_app_error(
                &s,
                AppError::NotFound(format!(
                    "Team {} has no current location - cannot start turn",
                    turn.team_id
                )),
            )
            .await;
            return;
        }
    };

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
    if current_place.area == "normal" && place_after.area == "tampere" && double == 2 {
        match set_team_double_tampere(&client, turn.team_id, true).await {
            Ok(_) => {}
            Err(e) => {
                emit_db_error(&s, e).await;
            }
        };
    } else if current_place.area == "tampere" && place_after.area == "normal" && double_tampere == 2
    {
        match set_team_double_tampere(&client, turn.team_id, false).await {
            Ok(_) => {}
            Err(e) => {
                emit_db_error(&s, e).await;
            }
        };
    }

    // Convert place drinks to turn drinks and apply double if needed
    let turn_drinks = match place_after
        .drinks
        .to_turn_drinks(&client, turn.turn_id, turn.game_id, double * double_tampere)
        .await
    {
        Ok(td) => td,
        Err(e) => {
            emit_app_error(&s, e).await;
            return;
        }
    };

    let no_drinks = turn_drinks.drinks.is_empty();
    // Write turn drinks to database
    if let Err(e) = add_drinks_to_turn(&client, turn_drinks).await {
        emit_db_error(&s, e).await;
        return;
    }
    // Update the turn with the end location
    // TODO: only do when confirmed, merge the updates
    if let Err(e) = add_visited_place(&client, place_after.place_number, turn.turn_id).await {
        emit_db_error(&s, e).await;
        return;
    }
    // If the game ends in the current place, end the game
    // TODO: only do when confirmed, consider endgame beers
    if place_after.end {
        if let Err(e) = end_game(&client, turn.game_id).await {
            emit_db_error(&s, e).await;
            return;
        };
    }
    // If no drinks awarded, end the turn immediately
    // TODO: only do when confirmed, merge the updates
    if no_drinks && !place_after.end {
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
}

pub async fn end_turn_handler<A: CoreAdapter<Emitter>>(
    s: SocketRef<A>,
    Data(turn_data): Data<EndTurn>,
    State(state): State<AppState>,
) {
    tracing::info!("Referee: end-turn called");
    let client = match get_db_client(&state, &s).await {
        Some(c) => c,
        None => return,
    };
    end_turn_emit(&client, &s, turn_data).await;
}

pub async fn get_games_handler<A: CoreAdapter<Emitter>>(
    s: SocketRef<A>,
    State(state): State<AppState>,
) {
    tracing::info!("Referee: get-games called");
    let client = match get_db_client(&state, &s).await {
        Some(c) => c,
        None => return,
    };
    run_emit_fn(&client, &s, "reply-games", |c| {
        Box::pin(async move { get_games(c).await })
    })
    .await;
}
pub async fn verify_login_handler<A: CoreAdapter<Emitter>>(
    s: SocketRef<A>,
    Data(auth): Data<SocketAuth>,
    State(state): State<AppState>,
) {
    tracing::info!("Socket namespace: {}", s.ns());
    let u_type: UserType = match s.ns() {
        "/admin" => UserType::Admin,
        "/referee" => UserType::Referee,
        "/secretary" => UserType::Secretary,
        "/ie" => UserType::Ie,
        _ => {
            let _ = s.disconnect();
            return;
        }
    };
    let auth = check_auth(&auth.token, &s, &state, u_type).await;
    tracing::info!("{}: Connection verified: {}", s.ns(), auth);
    emit_msg(&s, "verification-reply", &auth).await;
    if !auth {
        let _ = s.disconnect();
    }
}
