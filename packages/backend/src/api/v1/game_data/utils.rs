use crate::database::games::{get_full_game_data, get_game_list};
use crate::utils::ids::GameId;
use crate::utils::state::{AppError, AppState};
use crate::utils::types::{Game, GameData};
use axum::extract::State;
use axum::Json;
use deadpool_postgres::Client;

pub async fn games_get(
    state: State<AppState>,
    Json(game_id): Json<GameId>,
) -> Result<Json<GameData>, AppError> {
    let client: Client = state.db.get().await?;
    match get_full_game_data(&client, game_id).await {
        Ok(g) => Ok(Json(g)),
        Err(e) => {
            eprintln!("{}", e);
            Err(AppError::Database(
                "The server encountered an unexpected error!".to_string(),
            ))
        }
    }
}

pub async fn games_get_all(state: State<AppState>) -> Result<Json<Vec<Game>>, AppError> {
    let client: Client = state.db.get().await?;
    match get_game_list(&client).await {
        Ok(drinks) => Ok(Json(drinks)),
        Err(e) => {
            eprintln!("{}", e);
            Err(AppError::Database(
                "The server encountered an unexpected error!".to_string(),
            ))
        }
    }
}
