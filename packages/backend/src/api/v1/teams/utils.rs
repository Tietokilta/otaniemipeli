use crate::api::v1::turns::utils::broadcast_game_update;
use crate::database::boards::get_board_place;
use crate::database::games::{end_game, get_full_game_data, get_game_by_id};
use crate::database::team::get_team_by_id;
use crate::database::team::set_team_moral_loss_level;
use crate::database::turns::{end_active_turns, teleport_team as db_teleport_team};
use crate::utils::errors::wrap_json;
use crate::utils::ids::TeamId;
use crate::utils::state::{AppError, AppState};
use crate::utils::types::{TeleportTeamBody, Turn};
use axum::extract::{Path, State};
use axum::Json;
use serde::Deserialize;

/// Request body for PUT /teams/{team_id}/moral-loss-level
#[derive(Deserialize)]
pub struct SetMoralLossLevelBody {
    pub moral_loss_level: i32,
}

/// PUT /teams/{team_id}/moral-loss-level - Set moral loss level.
pub async fn set_moral_loss_level(
    State(state): State<AppState>,
    Path(team_id): Path<TeamId>,
    Json(body): Json<SetMoralLossLevelBody>,
) -> Result<(), AppError> {
    let client = state.db.get().await?;
    let team = get_team_by_id(&client, team_id).await?;
    set_team_moral_loss_level(&client, team_id, body.moral_loss_level).await?;
    let game_data = get_full_game_data(&client, team.game_id).await?;
    broadcast_game_update(&state.io, team.game_id, &game_data).await;
    Ok(())
}

/// POST /teams/{team_id}/end-turn - End a team's active turn.
/// If the team is on the game-ending place, also ends the game.
pub async fn end_turn(
    State(state): State<AppState>,
    Path(team_id): Path<TeamId>,
) -> Result<(), AppError> {
    let client = state.db.get().await?;
    let team = get_team_by_id(&client, team_id).await?;
    let turns = end_active_turns(&client, team.game_id, team_id).await?;

    // If any ended turn was on a game-ending place, end the game
    let game = get_game_by_id(&client, team.game_id).await?;
    for turn in &turns {
        if let Some(place_number) = turn.place_number {
            let place = get_board_place(&client, game.board.id, place_number).await?;
            if place.end {
                end_game(&client, team.game_id).await?;
                break;
            }
        }
    }

    let game_data = get_full_game_data(&client, team.game_id).await?;
    broadcast_game_update(&state.io, team.game_id, &game_data).await;
    Ok(())
}

/// POST /teams/{team_id}/teleport - Teleport a team to a specific location.
/// Creates a turn that is instantly confirmed, delivered, and ended with no drinks.
pub async fn teleport_team(
    State(state): State<AppState>,
    Path(team_id): Path<TeamId>,
    Json(data): Json<TeleportTeamBody>,
) -> Result<Json<Turn>, AppError> {
    let client = state.db.get().await?;
    let team = get_team_by_id(&client, team_id).await?;
    let turn = db_teleport_team(&client, team.game_id, team_id, data.location).await?;
    let game_data = get_full_game_data(&client, team.game_id).await?;
    broadcast_game_update(&state.io, team.game_id, &game_data).await;
    wrap_json(Ok(turn))
}
