use crate::database::drinks::*;
use crate::utils::errors::wrap_db_error;
use crate::utils::ids::IngredientId;
use crate::utils::state::{AppError, AppState};
use crate::utils::types::{Ingredient, Ingredients};
use axum::extract::{Path, State};
use axum::Json;
use deadpool_postgres::Client;

pub async fn ingredients_get(state: State<AppState>) -> Result<Json<Ingredients>, AppError> {
    let client: Client = state.db.get().await?;
    wrap_db_error(get_ingredients(&client).await, "Error getting ingredients!")
}

pub async fn ingredients_post(
    state: State<AppState>,
    Json(ingredient): Json<Ingredient>,
) -> Result<Json<u64>, AppError> {
    let client: Client = state.db.get().await?;
    wrap_db_error(
        post_ingredient(&client, ingredient).await,
        "Error posting ingredient!",
    )
}

pub async fn ingredient_delete(
    Path(id): Path<IngredientId>,
    state: State<AppState>,
) -> Result<Json<u64>, AppError> {
    let client: Client = state.db.get().await?;
    wrap_db_error(
        delete_ingredient(&client, id).await,
        "Error deleting ingredient!",
    )
}
