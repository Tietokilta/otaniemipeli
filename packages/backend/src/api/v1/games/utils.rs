use crate::api::v1::turns::utils::broadcast_game_update;
use crate::database::games::{
    get_full_game_data, get_games, post_game, start_game as db_start_game,
};
use crate::database::team::{
    create_team as db_create_team, delete_team as db_delete_team,
    update_team_name as db_update_team_name,
};
use crate::utils::errors::wrap_json;
use crate::utils::ids::{GameId, TeamId};
use crate::utils::state::{AppError, AppState};
use crate::utils::types::{FirstTurnPost, Game, Games, PostGame, TeamNameUpdate};
use axum::extract::{Path, State};
use axum::Json;
use deadpool_postgres::Client;

pub async fn games_get(state: State<AppState>) -> Result<Json<Games>, AppError> {
    let client: Client = state.db.get().await?;
    wrap_json(get_games(&client).await)
}

pub async fn games_post(
    state: State<AppState>,
    Json(game): Json<PostGame>,
) -> Result<Json<Game>, AppError> {
    let client: Client = state.db.get().await?;
    wrap_json(post_game(&client, game).await)
}

/// POST /games/{game_id}/start - Start a game with initial penalty turn.
pub async fn start_game(
    State(state): State<AppState>,
    Path(game_id): Path<GameId>,
    Json(mut data): Json<FirstTurnPost>,
) -> Result<(), AppError> {
    data.game_id = game_id;
    let client = state.db.get().await?;
    let game = db_start_game(&client, data).await?;
    let game_data = get_full_game_data(&client, game.id).await?;
    broadcast_game_update(&state.io, game.id, &game_data).await;
    Ok(())
}

/// POST /games/{game_id}/teams - Create a team for a game.
pub async fn create_team(
    State(state): State<AppState>,
    Path(game_id): Path<GameId>,
    Json(data): Json<TeamNameUpdate>,
) -> Result<(), AppError> {
    let client = state.db.get().await?;
    let team = db_create_team(&client, game_id, data).await?;
    let game_data = get_full_game_data(&client, team.game_id).await?;
    broadcast_game_update(&state.io, team.game_id, &game_data).await;
    Ok(())
}

/// PATCH /games/{game_id}/teams/{team_id} - Update a team's name.
pub async fn update_team(
    State(state): State<AppState>,
    Path((game_id, team_id)): Path<(GameId, TeamId)>,
    Json(data): Json<TeamNameUpdate>,
) -> Result<(), AppError> {
    let client = state.db.get().await?;
    db_update_team_name(&client, team_id, data.team_name).await?;
    let game_data = get_full_game_data(&client, game_id).await?;
    broadcast_game_update(&state.io, game_id, &game_data).await;
    Ok(())
}

/// DELETE /games/{game_id}/teams/{team_id} - Delete a team.
pub async fn delete_team(
    State(state): State<AppState>,
    Path((game_id, team_id)): Path<(GameId, TeamId)>,
) -> Result<(), AppError> {
    let client = state.db.get().await?;
    db_delete_team(&client, team_id).await?;
    let game_data = get_full_game_data(&client, game_id).await?;
    broadcast_game_update(&state.io, game_id, &game_data).await;
    Ok(())
}
