use crate::database::drinks::*;
use crate::utils::ids::{DrinkId, IngredientId};
use crate::utils::state::{AppError, AppState};
use crate::utils::types::{DrinkIngredientsPost, DrinksIngredients, IngredientIdQuery};
use axum::extract::{Path, Query, State};
use axum::{
    response::{IntoResponse, Response},
    Json,
};
use deadpool_postgres::Client;
use http::{header, HeaderValue};

pub async fn drinks_ingredients_get(
    state: State<AppState>,
) -> Result<Json<DrinksIngredients>, AppError> {
    let client: Client = state.db.get().await?;
    match get_drinks_ingredients(&client).await {
        Ok(drinks_ingredients) if drinks_ingredients.drink_ingredients.is_empty() => Err(
            AppError::NotFound(String::from("No drinks with ingredients")),
        ),
        Ok(drinks_ingredients) => Ok(Json(drinks_ingredients)),
        Err(e) => {
            eprintln!("{}", e);
            Err(AppError::Database(
                "The server encountered an unexpected error!".to_string(),
            ))
        }
    }
}

pub async fn drink_ingredients_post(
    state: State<AppState>,
    Json(drink_ingredients): Json<DrinkIngredientsPost>,
) -> Result<Json<DrinkIngredientsPost>, AppError> {
    let client: Client = state.db.get().await?;
    match add_ingredients(&client, drink_ingredients.clone()).await {
        Err(e) => {
            eprintln!("{}", e);
            Err(AppError::Database(
                "Database operations encountered an error!".to_string(),
            ))
        }
        _ => Ok(Json(drink_ingredients)),
    }
}

pub async fn drink_ingredient_delete(
    Path(drink_id): Path<DrinkId>,
    state: State<AppState>,
    query: Query<IngredientIdQuery>,
) -> Result<Json<()>, AppError> {
    let ingredient_id: IngredientId = query.ingredient_id;
    let client: Client = state.db.get().await?;
    delete_ingredient_from_drink(&client, drink_id, ingredient_id).await?;
    Ok(Json(()))
}

pub async fn drink_ingredients_get(
    Path(drink_id): Path<DrinkId>,
    state: State<AppState>,
) -> Result<Response, AppError> {
    let client = state.db.get().await?;
    let drink_ingredients = get_drink_ingredients(&client, drink_id).await?;

    let mut resp = Json(drink_ingredients).into_response();
    resp.headers_mut().insert(
        header::CACHE_CONTROL,
        HeaderValue::from_static("private, max-age=86400, stale-while-revalidate=3600"),
    );
    Ok(resp)
}
