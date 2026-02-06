use crate::utils::ids::{DrinkId, IngredientId};
use crate::utils::state::AppError;
use crate::utils::types::DrinkIngredientsPost;
use crate::utils::{
    round,
    types::{
        Drink, DrinkIngredients, Drinks, DrinksIngredients, Ingredient, IngredientQty, Ingredients,
    },
};
use deadpool_postgres::Client;

/// Retrieves all ingredients from the database.
pub async fn get_ingredients(client: &Client) -> Result<Ingredients, AppError> {
    let query_str = "\
    SELECT ingredient_id, name, abv, carbonated FROM ingredients";

    let query = client.query(query_str, &[]).await?;
    let ingredients = query
        .into_iter()
        .map(|row| Ingredient {
            id: row.get(0),
            name: row.get(1),
            abv: row.get(2),
            carbonated: row.get(3),
        })
        .collect();
    Ok(Ingredients { ingredients })
}

/// Retrieves a single ingredient by ID.
pub async fn get_ingredient(client: &Client, id: IngredientId) -> Result<Ingredient, AppError> {
    let query_str = "\
    SELECT ingredient_id, name, abv, carbonated FROM ingredients WHERE ingredient_id = $1";

    match client.query_opt(query_str, &[&id]).await? {
        None => Ok(Ingredient {
            id: IngredientId(-1),
            name: "NONE".to_string(),
            abv: -1.0,
            carbonated: false,
        }),
        Some(r) => Ok(Ingredient {
            id: r.get("ingredient_id"),
            name: r.get("name"),
            abv: r.get("abv"),
            carbonated: r.get("carbonated"),
        }),
    }
}

/// Inserts a new ingredient into the database.
pub async fn post_ingredient(client: &Client, ingredient: Ingredient) -> Result<u64, AppError> {
    let query_str = "\
    INSERT INTO ingredients (name, abv, carbonated) VALUES ($1, $2, $3)";

    Ok(client
        .execute(
            query_str,
            &[&ingredient.name, &ingredient.abv, &ingredient.carbonated],
        )
        .await?)
}

/// Deletes an ingredient by ID.
pub async fn delete_ingredient(
    client: &Client,
    ingredient_id: IngredientId,
) -> Result<u64, AppError> {
    let query_str = "\
    DELETE FROM ingredients WHERE ingredient_id = $1";

    Ok(client.execute(query_str, &[&ingredient_id]).await?)
}

/// Deletes a drink by ID.
pub async fn delete_drink(client: &Client, drink_id: DrinkId) -> Result<u64, AppError> {
    let query_str = "\
    DELETE FROM drinks WHERE drink_id = $1";
    Ok(client.execute(query_str, &[&drink_id]).await?)
}

/// Inserts a new drink into the database.
pub async fn post_drink(client: &Client, drink: Drink) -> Result<u64, AppError> {
    let query_str = "\
    INSERT INTO drinks (name, favorite, no_mix_required) VALUES ($1, $2, $3)";

    Ok(client
        .execute(
            query_str,
            &[&drink.name, &drink.favorite, &drink.no_mix_required],
        )
        .await?)
}

/// Retrieves all drinks from the database.
pub async fn get_drinks(client: &Client) -> Result<Drinks, AppError> {
    let query_str = "\
    SELECT drink_id, name, favorite, no_mix_required FROM drinks";

    let rows = client.query(query_str, &[]).await?;
    let drinks = rows
        .into_iter()
        .map(|row| Drink {
            id: row.get(0),
            name: row.get(1),
            favorite: row.get(2),
            no_mix_required: row.get(3),
        })
        .collect();
    Ok(Drinks { drinks })
}

/// Adds an ingredient to a drink with a specified quantity.
pub async fn add_ingredient(
    client: &Client,
    drink_id: DrinkId,
    ingredient_id: IngredientId,
    quantity: f64,
) -> Result<u64, AppError> {
    let query_str = "\
    INSERT INTO drink_ingredients (drink_id, ingredient_id, quantity) VALUES ($1, $2, $3)";

    Ok(client
        .execute(query_str, &[&drink_id, &ingredient_id, &quantity])
        .await?)
}

/// Adds multiple ingredients to a drink.
pub async fn add_ingredients(
    client: &Client,
    drink_ingredient: DrinkIngredientsPost,
) -> Result<u64, AppError> {
    let drink_id: DrinkId = drink_ingredient.drink.id;
    let mut rows = 0;
    for ingredient in &drink_ingredient.ingredients {
        add_ingredient(
            client,
            drink_id,
            ingredient.ingredient.id,
            ingredient.quantity,
        )
        .await?;
        rows += 1;
    }
    Ok(rows)
}

/// Retrieves all ingredients for a specific drink.
pub async fn get_drink_ingredients(
    client: &Client,
    drink: Drink,
) -> Result<DrinkIngredients, AppError> {
    let query_str = "\
    SELECT \
        dr.drink_id, \
        dr.name, \
        di.ingredient_id, \
        i.name, \
        i.abv, \
        i.carbonated, \
        di.quantity \
    FROM drinks as dr \
    LEFT JOIN drink_ingredients AS di \
        ON dr.drink_id = di.drink_id \
    LEFT JOIN ingredients AS i \
        ON di.ingredient_id = i.ingredient_id \
    WHERE dr.drink_id = $1 \
    ORDER BY dr.drink_id";

    let mut drink_ingredients: DrinkIngredients = DrinkIngredients {
        drink,
        abv: 0.0,
        quantity: 0.0,
        ingredients: Vec::new(),
    };

    let query = client
        .query(query_str, &[&drink_ingredients.drink.id])
        .await?;
    for row in query {
        match row.try_get::<usize, i32>(2) {
            Ok(_) => drink_ingredients.ingredients.push(IngredientQty {
                ingredient: Ingredient {
                    id: row.get(2),
                    name: row.get(3),
                    abv: row.get(4),
                    carbonated: row.get(5),
                },
                quantity: row.get(6),
            }),
            Err(_) => continue,
        }
    }
    Ok(drink_ingredients)
}

/// Retrieves all drinks with their ingredients and calculated ABV.
pub async fn get_drinks_ingredients(client: &Client) -> Result<DrinksIngredients, AppError> {
    let mut drink_ingredients: Vec<DrinkIngredients> = Vec::new();
    let drinks = get_drinks(client).await?;
    for drink in drinks.drinks {
        let mut drinks_ingredient: DrinkIngredients = get_drink_ingredients(client, drink).await?;
        let ingr = drinks_ingredient.ingredients.iter();
        let qty = ingr.clone().fold(0.0, |acc, iq| acc + iq.quantity);
        let abv = ingr
            .clone()
            .fold(0.0, |acc, iq| acc + iq.ingredient.abv * iq.quantity);
        drinks_ingredient.abv = round(abv / qty, 1);
        drinks_ingredient.quantity = round(qty, 2);
        drink_ingredients.push(drinks_ingredient);
    }
    Ok(DrinksIngredients { drink_ingredients })
}

/// Removes an ingredient from a drink.
pub async fn delete_ingredient_from_drink(
    client: &Client,
    drink_id: DrinkId,
    ingredient_id: IngredientId,
) -> Result<u64, AppError> {
    let query_str = "\
    DELETE FROM drink_ingredients WHERE drink_id = $1 AND ingredient_id = $2";
    Ok(client
        .execute(query_str, &[&drink_id, &ingredient_id])
        .await?)
}

/// Updates a drink's name, favorite status, and no-mix flag.
pub async fn update_drink(client: &Client, drink: Drink) -> Result<u64, AppError> {
    let query_str = "\
    UPDATE drinks SET name = $1, favorite = $2, no_mix_required = $3 WHERE drink_id = $4";

    Ok(client
        .execute(
            query_str,
            &[
                &drink.name,
                &drink.favorite,
                &drink.no_mix_required,
                &drink.id,
            ],
        )
        .await?)
}
