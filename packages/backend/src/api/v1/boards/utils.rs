use crate::database::boards::{add_board_place, get_board, get_boards, post_board};
use crate::utils::errors::wrap_db_error;
use crate::utils::ids::BoardId;
use crate::utils::state::{AppError, AppState};
use crate::utils::types::{Board, BoardPlace, Boards};
use axum::extract::{Path, State};
use axum::Json;
use deadpool_postgres::Client;

pub async fn boards_get(state: State<AppState>) -> Result<Json<Boards>, AppError> {
    let client: Client = state.db.get().await?;
    wrap_db_error(get_boards(&client).await, "Error getting boards!")
}

pub async fn boards_get_id(
    Path(board_id): Path<BoardId>,
    state: State<AppState>,
) -> Result<Json<Board>, AppError> {
    let client: Client = state.db.get().await?;
    wrap_db_error(get_board(&client, board_id).await, "Error getting board!")
}

pub async fn boards_post(
    state: State<AppState>,
    Json(board): Json<Board>,
) -> Result<Json<u64>, AppError> {
    let client: Client = state.db.get().await?;
    wrap_db_error(post_board(&client, board).await, "Error posting board!")
}

pub async fn board_place_post(
    Path(board_id): Path<BoardId>,
    state: State<AppState>,
    Json(place): Json<BoardPlace>,
) -> Result<Json<u64>, AppError> {
    let client: Client = state.db.get().await?;
    wrap_db_error(
        add_board_place(&client, board_id, place).await,
        "Error posting board place!",
    )
}
