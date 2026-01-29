use crate::database::drinks::{delete_drink, get_drinks_ingredients, post_drink};
use crate::utils::errors::wrap_db_error;
use crate::utils::ids::DrinkId;
use crate::utils::remove_ingredients;
use crate::utils::state::{AppError, AppState};
use crate::utils::types::{Drink, DrinksIngredients, ResultIntJson};
use axum::extract::{Path, State};
use axum::Json;
use deadpool_postgres::Client;

pub async fn drinks_get(state: State<AppState>) -> Result<Json<DrinksIngredients>, AppError> {
    let client: Client = state.db.get().await?;
    wrap_db_error(
        get_drinks_ingredients(&client)
            .await
            .map(remove_ingredients),
        "Error getting drinks!",
    )
}

pub async fn drinks_post(
    state: State<AppState>,
    Json(drink): Json<Drink>,
) -> Result<Json<u64>, AppError> {
    tracing::info!("{} {}", drink.name, drink.id);
    let client: Client = state.db.get().await?;
    wrap_db_error(post_drink(&client, drink).await, "Error posting drink!")
}

pub async fn drink_delete(
    Path(drink_id): Path<DrinkId>,
    state: State<AppState>,
) -> Result<Json<ResultIntJson>, AppError> {
    let client: Client = state.db.get().await?;
    wrap_db_error(
        delete_drink(&client, drink_id)
            .await
            .map(|_| ResultIntJson { int: drink_id.0 }),
        "Error deleting drink!",
    )
}
