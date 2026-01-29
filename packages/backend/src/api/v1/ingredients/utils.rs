use crate::database::drinks::*;
use crate::utils::ids::IngredientId;
use crate::utils::state::{AppError, AppState};
use crate::utils::types::{Ingredient, Ingredients};
use axum::extract::{Path, State};
use axum::Json;
use deadpool_postgres::Client;

pub async fn ingredients_get(state: State<AppState>) -> Result<Json<Ingredients>, AppError> {
    let client: Client = state.db.get().await?;
    match get_ingredients(&client).await {
        Ok(ingredients) => Ok(Json(ingredients)),
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
pub async fn ingredients_post(
    state: State<AppState>,
    Json(ingredient): Json<Ingredient>,
) -> Result<Json<Ingredient>, AppError> {
    let client: Client = state.db.get().await?;
    match post_ingredient(&client, ingredient.clone()).await {
        Err(e) => {
            eprintln!("{}", e);
            Err(AppError::Database(
                "Database operations encountered an error!".parse().unwrap(),
            ))
        }
        _ => Ok(Json(ingredient)),
    }
}
pub async fn ingredient_delete(
    Path(id): Path<IngredientId>,
    state: State<AppState>,
) -> Result<Json<Ingredient>, AppError> {
    let client: Client = state.db.get().await?;
    match delete_ingredient(&client, id).await {
        Ok(_) => Ok(Json(match get_ingredient(&client, id).await {
            Ok(ingredient) => ingredient,
            Err(e) => {
                eprintln!("{}", e);
                return Err(AppError::Database(format!(
                    "Ingredient {id} not in database!"
                )));
            }
        })),
        Err(_) => Err(AppError::Database(format!(
            "Ingredient {id} not in database!"
        ))),
    }
}
