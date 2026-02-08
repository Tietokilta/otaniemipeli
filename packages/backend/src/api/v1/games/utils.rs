use crate::api::v1::turns::utils::broadcast_game_update;
use crate::database::games::{
    get_full_game_data, get_games, post_game, start_game as db_start_game,
};
use crate::database::team::create_team as db_create_team;
use crate::utils::errors::wrap_json;
use crate::utils::ids::GameId;
use crate::utils::state::{AppError, AppState};
use crate::utils::types::{FirstTurnPost, Game, Games, PostGame, Team};
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
    Json(mut data): Json<Team>,
) -> Result<(), AppError> {
    data.game_id = game_id;
    let client = state.db.get().await?;
    let team = db_create_team(&client, data).await?;
    let game_data = get_full_game_data(&client, team.game_id).await?;
    broadcast_game_update(&state.io, team.game_id, &game_data).await;
    Ok(())
}
