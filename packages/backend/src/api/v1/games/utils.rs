use crate::database::games::{get_games, post_game};
use crate::utils::errors::wrap_json;
use crate::utils::state::{AppError, AppState};
use crate::utils::types::{Game, Games, PostGame};
use axum::extract::State;
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
