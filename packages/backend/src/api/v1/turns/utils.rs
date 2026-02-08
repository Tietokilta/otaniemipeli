use crate::database::boards::{get_board_place, move_team};
use crate::database::games::{
    check_dice, end_game, get_full_game_data, get_game_by_id, get_team_latest_turn, place_visited,
};
use crate::database::team::set_team_double_tampere;
use crate::database::turns::{
    cancel_turn as db_cancel_turn, end_turn as db_end_turn, get_turn_with_drinks,
    set_drink_prep_status as db_set_drink_prep_status, set_end_place, set_turn_automixing,
    set_turn_confirmed, set_turn_drinks, start_turn as db_start_turn, update_turn_dice,
};
use crate::utils::errors::wrap_json;
use crate::utils::ids::{GameId, TurnId};
use crate::utils::state::{AppError, AppState};
use crate::utils::types::{
    BoardPlace, ChangeDiceBody, ConfirmTurnBody, EndTurn, GameData, PlaceThrow, PostStartTurn,
    SetDrinkPrepStatusBody, TeamLatestTurn, Turn, TurnDrinks,
};
use axum::extract::{Path, State};
use axum::Json;
use deadpool_postgres::Client;
use socketioxide::SocketIo;

/// Broadcasts game data to all clients subscribed to a game room.
pub async fn broadcast_game_update(io: &SocketIo, game_id: GameId, data: &GameData) {
    let room = format!("game:{}", game_id.0);
    if let Some(ns) = io.of("/referee") {
        if let Err(e) = ns.to(room).emit("game-update", data).await {
            tracing::error!("Failed to broadcast game update: {e}");
        }
    }
}

/// Result of computing turn movement and drinks.
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

    let is_double = dice1 == dice2;
    let double_multiplier = if is_double { 2 } else { 1 };
    let throw = (dice1 as i8, dice2 as i8);

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

    let turn_drinks = place_after
        .drinks
        .to_turn_drinks(visited, double_multiplier * double_tampere_multiplier);

    Ok(TurnComputeResult {
        place_after,
        turn_drinks,
    })
}

/// Starts a new turn, optionally with dice. Returns the created turn.
pub async fn process_start_turn(
    client: &Client,
    turn_start_data: PostStartTurn,
) -> Result<Turn, AppError> {
    let game_id = turn_start_data.game_id;
    let team_id = turn_start_data.team_id;

    if let (Some(dice1), Some(dice2)) = (turn_start_data.dice1, turn_start_data.dice2) {
        check_dice(dice1, dice2)?;
    }

    let team_data = get_team_latest_turn(client, game_id, team_id).await?;
    let turn = db_start_turn(client, turn_start_data.clone()).await?;

    if let (Some(dice1), Some(dice2)) = (turn_start_data.dice1, turn_start_data.dice2) {
        let result = compute_turn_result(client, game_id, &team_data, dice1, dice2).await?;
        set_end_place(client, result.place_after.place_number, turn.turn_id).await?;
        set_turn_drinks(client, turn.turn_id, result.turn_drinks).await?;
    }

    Ok(turn)
}

/// Changes dice for an existing turn and recomputes movement/drinks.
pub async fn process_change_dice(
    client: &Client,
    turn_id: TurnId,
    dice1: i32,
    dice2: i32,
) -> Result<Turn, AppError> {
    check_dice(dice1, dice2)?;

    let turn = update_turn_dice(client, turn_id, dice1, dice2).await?;

    let team_data = get_team_latest_turn(client, turn.game_id, turn.team_id).await?;

    let result = compute_turn_result(client, turn.game_id, &team_data, dice1, dice2).await?;

    set_end_place(client, result.place_after.place_number, turn.turn_id).await?;
    set_turn_drinks(client, turn.turn_id, result.turn_drinks).await?;

    Ok(turn)
}

/// Confirms a turn: sets confirmed_at, replaces drinks, and applies side effects.
pub async fn process_confirm_turn(
    client: &Client,
    turn_id: TurnId,
    drinks: TurnDrinks,
) -> Result<Turn, AppError> {
    let turn = get_turn_with_drinks(client, turn_id).await?;

    let (Some(location), Some(dice1), Some(dice2)) = (turn.location, turn.dice1, turn.dice2) else {
        return Err(AppError::Validation(
            "Turn must have location and dice to be confirmed".to_string(),
        ));
    };

    let game = get_game_by_id(client, turn.game_id).await?;
    let team_data = get_team_latest_turn(client, turn.game_id, turn.team_id).await?;

    let Some(place_before) = team_data.location else {
        return Err(AppError::Validation(
            "Team must have a location before confirming turn".to_string(),
        ));
    };

    set_turn_confirmed(client, turn_id).await?;
    set_turn_drinks(client, turn_id, drinks.clone()).await?;
    set_turn_automixing(client, turn_id, &drinks).await?;

    let place_after = get_board_place(client, game.board.id, location).await?;

    let is_double = dice1 == dice2;
    if place_before.area == "normal" && place_after.area == "tampere" && is_double {
        set_team_double_tampere(client, turn.team_id, true).await?;
    } else if place_after.area == "normal" && team_data.team.double_tampere {
        set_team_double_tampere(client, turn.team_id, false).await?;
    }

    if place_after.end {
        end_game(client, turn.game_id).await?;
    }

    if drinks.drinks.is_empty() && !place_after.end {
        db_end_turn(
            client,
            &EndTurn {
                team_id: turn.team_id,
                game_id: turn.game_id,
            },
        )
        .await?;
    }

    Ok(turn)
}

/// Confirms a penalty turn: sets confirmed_at, sets drinks, and applies mixing logic.
pub async fn process_confirm_penalty(
    client: &Client,
    turn_id: TurnId,
    drinks: TurnDrinks,
) -> Result<Turn, AppError> {
    let turn = get_turn_with_drinks(client, turn_id).await?;

    if !turn.penalty {
        return Err(AppError::Validation(
            "Turn is not a penalty turn".to_string(),
        ));
    }

    if drinks.drinks.is_empty() {
        return Err(AppError::Validation(
            "Penalty turn must have drinks assigned".to_string(),
        ));
    }

    set_turn_confirmed(client, turn_id).await?;
    set_turn_drinks(client, turn_id, drinks.clone()).await?;
    set_turn_automixing(client, turn_id, &drinks).await?;

    Ok(turn)
}

// REST handlers

/// POST /turns - Start a new turn. Returns the created turn.
pub async fn start_turn(
    State(state): State<AppState>,
    Json(data): Json<PostStartTurn>,
) -> Result<Json<Turn>, AppError> {
    let game_id = data.game_id;
    let client = state.db.get().await?;
    let turn = process_start_turn(&client, data).await?;
    let game_data = get_full_game_data(&client, game_id).await?;
    broadcast_game_update(&state.io, game_id, &game_data).await;
    wrap_json(Ok(turn))
}

/// PUT /turns/{turn_id}/dice - Change dice values.
pub async fn change_dice(
    State(state): State<AppState>,
    Path(turn_id): Path<TurnId>,
    Json(data): Json<ChangeDiceBody>,
) -> Result<(), AppError> {
    let client = state.db.get().await?;
    let turn = process_change_dice(&client, turn_id, data.dice1, data.dice2).await?;
    let game_data = get_full_game_data(&client, turn.game_id).await?;
    broadcast_game_update(&state.io, turn.game_id, &game_data).await;
    Ok(())
}

/// POST /turns/{turn_id}/confirm - Confirm a turn.
pub async fn confirm_turn(
    State(state): State<AppState>,
    Path(turn_id): Path<TurnId>,
    Json(data): Json<ConfirmTurnBody>,
) -> Result<(), AppError> {
    let client = state.db.get().await?;
    let turn = process_confirm_turn(&client, turn_id, data.drinks).await?;
    let game_data = get_full_game_data(&client, turn.game_id).await?;
    broadcast_game_update(&state.io, turn.game_id, &game_data).await;
    Ok(())
}

/// DELETE /turns/{turn_id} - Cancel a turn.
pub async fn cancel_turn(
    State(state): State<AppState>,
    Path(turn_id): Path<TurnId>,
) -> Result<(), AppError> {
    let client = state.db.get().await?;
    let turn = get_turn_with_drinks(&client, turn_id).await?;
    db_cancel_turn(&client, turn_id).await?;
    let game_data = get_full_game_data(&client, turn.game_id).await?;
    broadcast_game_update(&state.io, turn.game_id, &game_data).await;
    Ok(())
}

/// POST /turns/{turn_id}/end - End a turn.
pub async fn end_turn(
    State(state): State<AppState>,
    Path(turn_id): Path<TurnId>,
) -> Result<(), AppError> {
    let client = state.db.get().await?;
    let turn = get_turn_with_drinks(&client, turn_id).await?;
    db_end_turn(
        &client,
        &EndTurn {
            team_id: turn.team_id,
            game_id: turn.game_id,
        },
    )
    .await?;
    let game_data = get_full_game_data(&client, turn.game_id).await?;
    broadcast_game_update(&state.io, turn.game_id, &game_data).await;
    Ok(())
}

/// POST /turns/{turn_id}/penalty - Confirm a penalty turn.
pub async fn confirm_penalty(
    State(state): State<AppState>,
    Path(turn_id): Path<TurnId>,
    Json(data): Json<ConfirmTurnBody>,
) -> Result<(), AppError> {
    let client = state.db.get().await?;
    let turn = process_confirm_penalty(&client, turn_id, data.drinks).await?;
    let game_data = get_full_game_data(&client, turn.game_id).await?;
    broadcast_game_update(&state.io, turn.game_id, &game_data).await;
    Ok(())
}

/// PUT /turns/{turn_id}/prep-status - Update the drink preparation status.
pub async fn set_drink_prep_status(
    State(state): State<AppState>,
    Path(turn_id): Path<TurnId>,
    Json(data): Json<SetDrinkPrepStatusBody>,
) -> Result<(), AppError> {
    let client = state.db.get().await?;
    let turn = get_turn_with_drinks(&client, turn_id).await?;
    db_set_drink_prep_status(&client, turn_id, data.status).await?;
    let game_data = get_full_game_data(&client, turn.game_id).await?;
    broadcast_game_update(&state.io, turn.game_id, &game_data).await;
    Ok(())
}
