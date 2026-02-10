use crate::api::v1::turns::utils::broadcast_game_update;
use crate::database::games::get_full_game_data;
use crate::database::team::get_team_by_id;
use crate::database::team::set_team_moral_victory_eligible;
use crate::database::turns::{end_active_turns, teleport_team as db_teleport_team};
use crate::utils::errors::wrap_json;
use crate::utils::ids::TeamId;
use crate::utils::state::{AppError, AppState};
use crate::utils::types::{TeleportTeamBody, Turn};
use axum::extract::{Path, State};
use axum::Json;
use serde::Deserialize;

/// Request body for PUT /teams/{team_id}/moral-victory-eligible
#[derive(Deserialize)]
pub struct SetMoralVictoryEligibleBody {
    pub moral_victory_eligible: bool,
}

/// PUT /teams/{team_id}/moral-victory-eligible - Set moral victory eligibility.
pub async fn set_moral_victory_eligible(
    State(state): State<AppState>,
    Path(team_id): Path<TeamId>,
    Json(body): Json<SetMoralVictoryEligibleBody>,
) -> Result<(), AppError> {
    let client = state.db.get().await?;
    let team = get_team_by_id(&client, team_id).await?;
    set_team_moral_victory_eligible(&client, team_id, body.moral_victory_eligible).await?;
    let game_data = get_full_game_data(&client, team.game_id).await?;
    broadcast_game_update(&state.io, team.game_id, &game_data).await;
    Ok(())
}

/// POST /teams/{team_id}/end-turn - End a team's active turn.
pub async fn end_turn(
    State(state): State<AppState>,
    Path(team_id): Path<TeamId>,
) -> Result<(), AppError> {
    let client = state.db.get().await?;
    let team = get_team_by_id(&client, team_id).await?;
    end_active_turns(&client, team.game_id, team_id).await?;
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
