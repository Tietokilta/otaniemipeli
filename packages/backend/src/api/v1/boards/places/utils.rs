use crate::database::boards::{add_place, get_board_places, get_places, update_coordinates};
use crate::utils::errors::wrap_db_error;
use crate::utils::ids::BoardId;
use crate::utils::state::{AppError, AppState};
use crate::utils::types::{BoardPlace, BoardPlaces, Place, Places};
use axum::extract::{Path, State};
use axum::Json as AxumJson;
use deadpool_postgres::Client;

pub async fn board_places_get(
    Path(board_id): Path<BoardId>,
    state: State<AppState>,
) -> Result<AxumJson<BoardPlaces>, AppError> {
    let client: Client = state.db.get().await?;
    wrap_db_error(
        get_board_places(&client, board_id).await,
        "Error getting board places!",
    )
}

pub async fn places_post(
    state: State<AppState>,
    AxumJson(place): AxumJson<Place>,
) -> Result<AxumJson<u64>, AppError> {
    let client: Client = state.db.get().await?;
    wrap_db_error(add_place(&client, place).await, "Error posting place!")
}

pub async fn places_get(state: State<AppState>) -> Result<AxumJson<Places>, AppError> {
    let client: Client = state.db.get().await?;
    wrap_db_error(get_places(&client).await, "Error getting places!")
}

pub async fn coordinate_patch(
    Path(board_id): Path<BoardId>,
    state: State<AppState>,
    AxumJson(place): AxumJson<BoardPlace>,
) -> Result<AxumJson<u64>, AppError> {
    let client: Client = state.db.get().await?;
    wrap_db_error(
        update_coordinates(&client, board_id, &place).await,
        "Error updating coordinates!",
    )
}
