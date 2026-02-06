use crate::database::boards::move_team;
use crate::database::drinks::get_drinks_ingredients;
use crate::database::games::{check_dice, end_game, get_games, get_team_data, place_visited};
use crate::database::team::set_team_double_tampere;
use crate::database::turns::{add_drinks_to_turn, add_visited_place, end_turn, start_turn};
use crate::utils::ids::GameId;
use crate::utils::socket::check_auth;
use crate::utils::state::{AppError, AppState};
use crate::utils::types::{
    DrinksIngredients, EndTurn, GameData, Games, PlaceThrow, PostStartTurn, SocketAuth, UserType,
};
use deadpool_postgres::Client;
use serde::Serialize;
use socketioxide::adapter::{Adapter, Emitter};
use socketioxide::extract::{Data, SocketRef, State};
use socketioxide_core::adapter::CoreAdapter;

/// Server-to-client websocket responses with typed payloads.
/// Each variant maps to a specific event name.
#[derive(Serialize)]
#[serde(untagged)]
pub enum ServerResponse {
    Error(String),
    Drinks(DrinksIngredients),
    GameData(GameData),
    Games(Games),
    Verification(bool),
}

impl ServerResponse {
    /// Returns the event name for this response type
    fn event_name(&self) -> &'static str {
        match self {
            ServerResponse::Error(_) => "response-error",
            ServerResponse::Drinks(_) => "reply-drinks",
            ServerResponse::GameData(_) => "reply-game",
            ServerResponse::Games(_) => "reply-games",
            ServerResponse::Verification(_) => "verification-reply",
        }
    }
}

pub(crate) async fn get_db_client(state: &AppState) -> Result<Client, AppError> {
    Ok(state.db.get().await?)
}

pub fn emit_app_error(s: &SocketRef<impl Adapter>, error: AppError) {
    tracing::error!("{error}");
    emit_msg(s, ServerResponse::Error(format!("{error}")));
}

pub fn emit_msg(s: &SocketRef<impl Adapter>, response: ServerResponse) {
    let event = response.event_name();
    if let Err(err) = s.emit(event, &response) {
        tracing::error!("Failed emitting {event}: {err}")
    };
}

/// Emits data on success, or error message on failure
pub fn emit_result(s: &SocketRef<impl Adapter>, result: Result<ServerResponse, AppError>) {
    match result {
        Ok(data) => emit_msg(s, data),
        Err(e) => emit_app_error(s, e),
    }
}

pub async fn get_drinks_handler<A: CoreAdapter<Emitter>>(
    s: SocketRef<A>,
    State(state): State<AppState>,
) {
    tracing::info!("Referee: get-drinks called");
    let client = match get_db_client(&state).await {
        Ok(c) => c,
        Err(e) => return emit_app_error(&s, e),
    };
    emit_result(
        &s,
        get_drinks_ingredients(&client)
            .await
            .map(ServerResponse::Drinks),
    );
}

pub async fn game_data_handler<A: CoreAdapter<Emitter>>(
    s: SocketRef<A>,
    Data(game_id): Data<GameId>,
    State(state): State<AppState>,
) {
    tracing::info!("Referee: game_data called");
    let client = match get_db_client(&state).await {
        Ok(c) => c,
        Err(e) => return emit_app_error(&s, e),
    };
    emit_result(
        &s,
        get_team_data(&client, game_id)
            .await
            .map(ServerResponse::GameData),
    );
}

async fn process_start_turn(
    client: &Client,
    turn_start_data: PostStartTurn,
) -> Result<GameData, AppError> {
    check_dice(turn_start_data.dice1, turn_start_data.dice2)?;

    // If double, double the drinks or effects when needed
    let double = turn_start_data.dice1 == turn_start_data.dice2;
    let double = if double { 2 } else { 1 };
    let throw = (turn_start_data.dice1 as i8, turn_start_data.dice2 as i8);

    let game_data = get_team_data(client, turn_start_data.game_id).await?;
    let turn = start_turn(client, turn_start_data).await?;

    // See if the team has double Tampere active
    let team = game_data
        .teams
        .iter()
        .find(|t| t.team.team_id == turn.team_id)
        .expect("team should exist since turn was just created");
    let double_tampere = if team.team.double_tampere { 2 } else { 1 };

    let current_place = team.location.clone().ok_or_else(|| {
        AppError::NotFound(format!(
            "Team {} has no current location - cannot start turn",
            turn.team_id
        ))
    })?;

    let pl = PlaceThrow {
        place: current_place.clone(),
        throw,
        team_id: turn.team_id,
    };
    let place_after = move_team(client, pl).await?;

    // If moving to tampere on doubles then make team double drinks and if moving out of tampere
    // and team had double drinks then revert back to normal drinks
    if current_place.area == "normal" && place_after.area == "tampere" && double == 2 {
        set_team_double_tampere(client, turn.team_id, true).await?;
    } else if current_place.area == "tampere" && place_after.area == "normal" && double_tampere == 2
    {
        set_team_double_tampere(client, turn.team_id, false).await?;
    }

    let visited = place_visited(client, turn.game_id, place_after.place_number).await?;

    // Convert place drinks to turn drinks and apply double if needed
    let turn_drinks = place_after
        .drinks
        .to_turn_drinks(visited, double * double_tampere);

    let no_drinks = turn_drinks.drinks.is_empty();
    add_drinks_to_turn(client, turn.turn_id, turn_drinks).await?;

    // Update the turn with the new location
    // TODO: only do when confirmed, merge the updates
    add_visited_place(client, place_after.place_number, turn.turn_id).await?;

    // If the place ends the game, end it immediately
    // TODO: only do when confirmed, consider endgame beers
    if place_after.end {
        end_game(client, turn.game_id).await?;
    }

    // If no drinks awarded, end the turn immediately
    // TODO: only do when confirmed, merge the updates
    if no_drinks && !place_after.end {
        end_turn(
            client,
            &EndTurn {
                team_id: turn.team_id,
                game_id: turn.game_id,
            },
        )
        .await?;
    }

    get_team_data(client, turn.game_id).await
}

pub async fn start_turn_handler<A: CoreAdapter<Emitter>>(
    s: SocketRef<A>,
    Data(turn_start_data): Data<PostStartTurn>,
    State(state): State<AppState>,
) {
    tracing::info!("Referee: start-turn called");
    let client = match get_db_client(&state).await {
        Ok(c) => c,
        Err(e) => return emit_app_error(&s, e),
    };
    emit_result(
        &s,
        process_start_turn(&client, turn_start_data)
            .await
            .map(ServerResponse::GameData),
    );
}

async fn process_end_turn(client: &Client, et: EndTurn) -> Result<GameData, AppError> {
    end_turn(client, &et).await?;
    get_team_data(client, et.game_id).await
}

pub async fn end_turn_handler<A: CoreAdapter<Emitter>>(
    s: SocketRef<A>,
    Data(turn_data): Data<EndTurn>,
    State(state): State<AppState>,
) {
    tracing::info!("Referee: end-turn called");
    let client = match get_db_client(&state).await {
        Ok(c) => c,
        Err(e) => return emit_app_error(&s, e),
    };
    emit_result(
        &s,
        process_end_turn(&client, turn_data)
            .await
            .map(ServerResponse::GameData),
    );
}

pub async fn get_games_handler<A: CoreAdapter<Emitter>>(
    s: SocketRef<A>,
    State(state): State<AppState>,
) {
    tracing::info!("Referee: get-games called");
    let client = match get_db_client(&state).await {
        Ok(c) => c,
        Err(e) => return emit_app_error(&s, e),
    };
    emit_result(&s, get_games(&client).await.map(ServerResponse::Games));
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
    emit_msg(&s, ServerResponse::Verification(auth));
    if !auth {
        let _ = s.disconnect();
    }
}
