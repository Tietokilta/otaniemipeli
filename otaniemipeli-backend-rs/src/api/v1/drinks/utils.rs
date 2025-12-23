use crate::database::drinks::{delete_drink, get_drinks_ingredients, post_drink};
use crate::utils::remove_ingredients;
use crate::utils::state::{AppError, AppState};
use crate::utils::types::{Drink, DrinksIngredients, ResultIntJson};
use axum::extract::{Path, State};
use axum::Json;
use deadpool_postgres::Client;

pub async fn drinks_get(state: State<AppState>) -> Result<Json<DrinksIngredients>, AppError> {
    let client: Client = state.db.get().await?;
    match get_drinks_ingredients(&client).await {
        Ok(drinks) => Ok(Json(remove_ingredients(drinks))),
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

pub async fn drinks_post(
    state: State<AppState>,
    Json(drink): Json<Drink>,
) -> Result<Json<Drink>, AppError> {
    tracing::info!("{} {}", drink.name, drink.id);
    let client: Client = state.db.get().await?;
    match post_drink(&client, drink.clone()).await {
        Err(e) => {
            tracing::error!("{}", e);
            Err(AppError::Database(
                "Database operations encountered an error!".parse().unwrap(),
            ))
        }
        _ => Ok(Json(drink)),
    }
}

pub async fn drink_delete(
    Path(drink_id): Path<i32>,
    state: State<AppState>,
) -> Result<Json<ResultIntJson>, AppError> {
    let client: Client = state.db.get().await?;
    match delete_drink(&client, drink_id).await {
        Ok(_) => Ok(Json(ResultIntJson { int: drink_id })),
        Err(_) => Err(AppError::Database(format!(
            "Drink {drink_id} not in database!"
        ))),
    }
}
