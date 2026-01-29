use crate::database::games::{get_team_data, get_team_datas};
use crate::utils::ids::GameId;
use crate::utils::state::{AppError, AppState};
use crate::utils::types::GameData;
use axum::extract::State;
use axum::Json;
use deadpool_postgres::Client;

pub async fn games_get(
    state: State<AppState>,
    Json(game_id): Json<GameId>,
) -> Result<Json<GameData>, AppError> {
    let client: Client = state.db.get().await?;
    match get_team_data(&client, game_id).await {
        Ok(g) => Ok(Json(g)),
        Err(e) => {
            eprintln!("{}", e);
            Err(AppError::Database(
                "The server encountered an unexpected error!"
                    .to_string(),
            ))
        }
    }
}
pub async fn games_get_all(state: State<AppState>) -> Result<Json<Vec<GameData>>, AppError> {
    let client: Client = state.db.get().await?;
    match get_team_datas(&client).await {
        Ok(drinks) => Ok(Json(drinks)),
        Err(e) => {
            eprintln!("{}", e);
            Err(AppError::Database(
                "The server encountered an unexpected error!"
                    .to_string(),
            ))
        }
    }
}
