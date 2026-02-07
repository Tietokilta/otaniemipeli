use crate::database::boards::{get_board_place, move_team};
use crate::database::drinks::get_drinks_ingredients;
use crate::database::games::{
    check_dice, end_game, get_full_game_data, get_game_by_id, get_games, get_team_latest_turn,
    place_visited,
};
use crate::database::team::set_team_double_tampere;
use crate::database::turns::{
    cancel_turn, end_turn, get_turn_with_drinks, set_end_place, set_turn_confirmed,
    set_turn_drinks, set_turn_mixed_if_no_mixing, start_turn, update_turn_dice,
};
use crate::utils::ids::GameId;
use crate::utils::socket::check_auth;
use crate::utils::state::{AppError, AppState};
use crate::utils::types::{
    BoardPlace, CancelTurn, ChangeDice, ConfirmTurn, DrinksIngredients, EndTurn, GameData, Games,
    PlaceThrow, PostStartTurn, SocketAuth, TeamLatestTurn, TurnDrinks, UserType,
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
        get_full_game_data(&client, game_id)
            .await
            .map(ServerResponse::GameData),
    );
}

/// Result of computing turn movement and drinks
pub struct TurnComputeResult {
    pub place_after: BoardPlace,
    pub turn_drinks: TurnDrinks,
}

/// Computes the destination and drinks for a turn based on dice values.
/// Does NOT apply side effects (double_tampere, end_game) - those happen on confirm.
pub async fn compute_turn_result(
    client: &Client,
    game_id: GameId,
    team: &TeamLatestTurn,
    dice1: i32,
    dice2: i32,
) -> Result<TurnComputeResult, AppError> {
    check_dice(dice1, dice2)?;

    // If double, double the drinks or effects when needed
    let is_double = dice1 == dice2;
    let double_multiplier = if is_double { 2 } else { 1 };
    let throw = (dice1 as i8, dice2 as i8);

    // See if the team has double Tampere active
    let double_tampere_multiplier = if team.team.double_tampere { 2 } else { 1 };

    let current_place = team.location.clone().ok_or_else(|| {
        AppError::NotFound(format!(
            "Team {} has no current location - cannot compute movement",
            team.team.team_id
        ))
    })?;

    let pl = PlaceThrow {
        place: current_place,
        throw,
        team_id: team.team.team_id,
    };
    let place_after = move_team(client, pl).await?;

    let visited = place_visited(client, game_id, place_after.place_number).await?;

    // Convert place drinks to turn drinks and apply multipliers
    let turn_drinks = place_after
        .drinks
        .to_turn_drinks(visited, double_multiplier * double_tampere_multiplier);

    Ok(TurnComputeResult {
        place_after,
        turn_drinks,
    })
}

/// Starts a new turn, optionally with dice.
/// If dice provided, computes movement and sets drinks (but doesn't apply side effects).
/// If no dice, just creates the turn record.
async fn process_start_turn(
    client: &Client,
    turn_start_data: PostStartTurn,
) -> Result<GameData, AppError> {
    let game_id = turn_start_data.game_id;
    let team_id = turn_start_data.team_id;

    // Validate dice if provided
    if let (Some(dice1), Some(dice2)) = (turn_start_data.dice1, turn_start_data.dice2) {
        check_dice(dice1, dice2)?;
    }

    // Get lightweight team data (only need team info and location)
    let team_data = get_team_latest_turn(client, game_id, team_id).await?;

    // Create the turn (with or without dice)
    let turn = start_turn(client, turn_start_data.clone()).await?;

    // If dice were provided, compute movement and set drinks
    if let (Some(dice1), Some(dice2)) = (turn_start_data.dice1, turn_start_data.dice2) {
        let result = compute_turn_result(client, game_id, &team_data, dice1, dice2).await?;

        // Update the turn with the computed location
        set_end_place(client, result.place_after.place_number, turn.turn_id).await?;

        // Set the drinks for the turn
        set_turn_drinks(client, turn.turn_id, result.turn_drinks).await?;
    }

    get_full_game_data(client, game_id).await
}

/// Changes dice for an existing turn and recomputes movement/drinks.
pub async fn process_change_dice(
    client: &Client,
    change_dice: ChangeDice,
) -> Result<GameData, AppError> {
    check_dice(change_dice.dice1, change_dice.dice2)?;

    // Update the dice values
    let turn = update_turn_dice(
        client,
        change_dice.turn_id,
        change_dice.dice1,
        change_dice.dice2,
    )
    .await?;

    // Get lightweight team data (only need team info and location)
    let team_data = get_team_latest_turn(client, change_dice.game_id, turn.team_id).await?;

    // Recompute movement and drinks
    let result = compute_turn_result(
        client,
        change_dice.game_id,
        &team_data,
        change_dice.dice1,
        change_dice.dice2,
    )
    .await?;

    // Replace the drinks for the turn
    set_turn_drinks(client, turn.turn_id, result.turn_drinks).await?;

    // Update the turn with the new location
    set_end_place(client, result.place_after.place_number, turn.turn_id).await?;

    get_full_game_data(client, change_dice.game_id).await
}

/// Confirms a turn: sets confirmed_at, replaces drinks, and applies side effects.
pub async fn process_confirm_turn(
    client: &Client,
    confirm_data: ConfirmTurn,
) -> Result<GameData, AppError> {
    // Get turn directly by ID (lightweight - single row)
    let turn = get_turn_with_drinks(client, confirm_data.turn_id).await?;

    let (Some(location), Some(dice1), Some(dice2)) = (turn.location, turn.dice1, turn.dice2) else {
        return Err(AppError::Validation(
            "Turn must have location and dice to be confirmed".to_string(),
        ));
    };

    // Get game for board_id and team data (lightweight - single team)
    let game = get_game_by_id(client, confirm_data.game_id).await?;
    let team_data = get_team_latest_turn(client, confirm_data.game_id, turn.team_id).await?;

    let Some(place_before) = team_data.location else {
        return Err(AppError::Validation(
            "Team must have a location before confirming turn".to_string(),
        ));
    };

    // Set confirmed_at
    set_turn_confirmed(client, confirm_data.turn_id).await?;

    // Replace the drinks with the provided drinks
    set_turn_drinks(client, confirm_data.turn_id, confirm_data.drinks.clone()).await?;

    // If no drinks require mixing, mark as mixed immediately
    set_turn_mixed_if_no_mixing(client, confirm_data.turn_id, &confirm_data.drinks).await?;

    // Get the place the team landed on
    let place_after = get_board_place(client, game.board.id, location).await?;

    // Update double Tampere status based on landing place and dice
    let is_double = dice1 == dice2;
    if place_before.area == "normal" && place_after.area == "tampere" && is_double {
        set_team_double_tampere(client, turn.team_id, true).await?;
    } else if place_after.area == "normal" && team_data.team.double_tampere {
        set_team_double_tampere(client, turn.team_id, false).await?;
    }

    // End game if place ends it
    if place_after.end {
        end_game(client, confirm_data.game_id).await?;
    }

    // If no drinks awarded, end the turn immediately
    if confirm_data.drinks.drinks.is_empty() && !place_after.end {
        end_turn(
            client,
            &EndTurn {
                team_id: turn.team_id,
                game_id: confirm_data.game_id,
            },
        )
        .await?;
    }

    get_full_game_data(client, confirm_data.game_id).await
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
    get_full_game_data(client, et.game_id).await
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

async fn process_cancel_turn(client: &Client, data: CancelTurn) -> Result<GameData, AppError> {
    cancel_turn(client, data.turn_id).await?;
    get_full_game_data(client, data.game_id).await
}

pub async fn cancel_turn_handler<A: CoreAdapter<Emitter>>(
    s: SocketRef<A>,
    Data(cancel_data): Data<CancelTurn>,
    State(state): State<AppState>,
) {
    tracing::info!("Referee: cancel-turn called");
    let client = match get_db_client(&state).await {
        Ok(c) => c,
        Err(e) => return emit_app_error(&s, e),
    };
    emit_result(
        &s,
        process_cancel_turn(&client, cancel_data)
            .await
            .map(ServerResponse::GameData),
    );
}

/// Confirms a penalty turn: sets confirmed_at/thrown_at, sets drinks, and applies mixing logic.
/// Unlike normal turns, penalty turns don't have movement or double Tampere logic.
async fn process_confirm_penalty(
    client: &Client,
    confirm_data: ConfirmTurn,
) -> Result<GameData, AppError> {
    // Get turn directly by ID
    let turn = get_turn_with_drinks(client, confirm_data.turn_id).await?;

    if !turn.penalty {
        return Err(AppError::Validation(
            "Turn is not a penalty turn".to_string(),
        ));
    }

    if confirm_data.drinks.drinks.is_empty() {
        return Err(AppError::Validation(
            "Penalty turn must have drinks assigned".to_string(),
        ));
    }

    // Set confirmed_at (and thrown_at if not set)
    set_turn_confirmed(client, confirm_data.turn_id).await?;

    // Replace the drinks with the provided drinks
    set_turn_drinks(client, confirm_data.turn_id, confirm_data.drinks.clone()).await?;

    // If no drinks require mixing, mark as mixed immediately
    set_turn_mixed_if_no_mixing(client, confirm_data.turn_id, &confirm_data.drinks).await?;

    get_full_game_data(client, confirm_data.game_id).await
}

pub async fn confirm_penalty_handler<A: CoreAdapter<Emitter>>(
    s: SocketRef<A>,
    Data(confirm_data): Data<ConfirmTurn>,
    State(state): State<AppState>,
) {
    tracing::info!("Referee: confirm-penalty called");
    let client = match get_db_client(&state).await {
        Ok(c) => c,
        Err(e) => return emit_app_error(&s, e),
    };
    emit_result(
        &s,
        process_confirm_penalty(&client, confirm_data)
            .await
            .map(ServerResponse::GameData),
    );
}

pub async fn change_dice_handler<A: CoreAdapter<Emitter>>(
    s: SocketRef<A>,
    Data(change_dice_data): Data<ChangeDice>,
    State(state): State<AppState>,
) {
    tracing::info!("Referee: change-dice called");
    let client = match get_db_client(&state).await {
        Ok(c) => c,
        Err(e) => return emit_app_error(&s, e),
    };
    emit_result(
        &s,
        process_change_dice(&client, change_dice_data)
            .await
            .map(ServerResponse::GameData),
    );
}

pub async fn confirm_turn_handler<A: CoreAdapter<Emitter>>(
    s: SocketRef<A>,
    Data(confirm_data): Data<ConfirmTurn>,
    State(state): State<AppState>,
) {
    tracing::info!("Referee: confirm-turn called");
    let client = match get_db_client(&state).await {
        Ok(c) => c,
        Err(e) => return emit_app_error(&s, e),
    };
    emit_result(
        &s,
        process_confirm_turn(&client, confirm_data)
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
