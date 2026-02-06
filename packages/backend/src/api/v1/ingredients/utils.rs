use crate::database::drinks::*;
use crate::utils::errors::wrap_json;
use crate::utils::ids::IngredientId;
use crate::utils::state::{AppError, AppState};
use crate::utils::types::{Ingredient, Ingredients};
use axum::extract::{Path, State};
use axum::Json;
use deadpool_postgres::Client;

pub async fn ingredients_get(state: State<AppState>) -> Result<Json<Ingredients>, AppError> {
    let client: Client = state.db.get().await?;
    wrap_json(get_ingredients(&client).await)
}

pub async fn ingredients_post(
    state: State<AppState>,
    Json(ingredient): Json<Ingredient>,
) -> Result<Json<u64>, AppError> {
    let client: Client = state.db.get().await?;
    wrap_json(post_ingredient(&client, ingredient).await)
}

pub async fn ingredient_delete(
    Path(id): Path<IngredientId>,
    state: State<AppState>,
) -> Result<Json<u64>, AppError> {
    let client: Client = state.db.get().await?;
    wrap_json(delete_ingredient(&client, id).await)
}
