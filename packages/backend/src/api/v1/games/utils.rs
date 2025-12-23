use crate::database::games::{get_games, post_game};
use crate::utils::state::{AppError, AppState};
use crate::utils::types::{Games, PostGame};
use axum::extract::State;
use axum::Json;
use deadpool_postgres::Client;

pub async fn games_get(state: State<AppState>) -> Result<Json<Games>, AppError> {
    let client: Client = state.db.get().await?;
    match get_games(&client).await {
        Ok(drinks) => Ok(Json(drinks)),
        Err(e) => {
            eprintln!("{}", e);
            Err(AppError::Database(
                "The server encountered an unexpected error!"
                    .parse()
                    .unwrap(),
            ))
        }
    }
}

pub async fn games_post(
    state: State<AppState>,
    Json(game): Json<PostGame>,
) -> Result<Json<PostGame>, AppError> {
    let client: Client = state.db.get().await?;
    match post_game(&client, game.clone()).await {
        Err(e) => {
            eprintln!("{}", e);
            Err(AppError::Database(
                "Database operations encountered an error!".parse().unwrap(),
            ))
        }
        _ => Ok(Json(game)),
    }
}
