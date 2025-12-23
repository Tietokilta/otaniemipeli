use crate::database::boards::{add_place, get_board_places, get_places, update_coordinates};
use crate::utils::state::{AppError, AppState};
use crate::utils::types::{BoardPlace, BoardPlaces, Place, Places};
use axum::extract::{Path, State};
use axum::Json as AxumJson;
use deadpool_postgres::Client;

pub async fn board_places_get(
    Path(board_id): Path<i32>,
    state: State<AppState>,
) -> Result<AxumJson<BoardPlaces>, AppError> {
    let client: Client = state.db.get().await?;
    match get_board_places(&client, board_id).await {
        Ok(places) => Ok(AxumJson(places)),
        Err(_) => Err(AppError::Database("Error getting places!".to_string())),
    }
}
pub async fn places_post(
    state: State<AppState>,
    AxumJson(place): AxumJson<Place>,
) -> Result<AxumJson<Place>, AppError> {
    let client: Client = state.db.get().await?;
    match add_place(&client, place.clone()).await {
        Err(e) => {
            eprintln!("{}", e);
            Err(AppError::Database(
                "Database operations encountered an error!".parse().unwrap(),
            ))
        }
        _ => Ok(AxumJson(place)),
    }
}
pub async fn places_get(state: State<AppState>) -> Result<AxumJson<Places>, AppError> {
    let client: Client = state.db.get().await?;
    match get_places(&client).await {
        Ok(places) => Ok(AxumJson(places)),
        Err(_) => Err(AppError::Database("Error getting places!".to_string())),
    }
}
pub async fn coordinate_patch(
    Path(board_id): Path<i32>,
    state: State<AppState>,
    AxumJson(place): AxumJson<BoardPlace>,
) -> Result<AxumJson<u64>, AppError> {
    let client: Client = state.db.get().await?;
    match update_coordinates(&client, board_id, &place).await {
        Ok(x) => Ok(AxumJson(x)),
        Err(_) => Err(AppError::Database(
            "Database operations encountered an error!".to_string(),
        )),
    }
}
