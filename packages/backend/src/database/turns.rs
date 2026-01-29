use crate::utils::state::AppError;
use crate::utils::types::{EndTurn, PgError, PostStartTurn, Turn, TurnDrink, TurnDrinks, Turns};
use deadpool_postgres::Client;
use tokio_postgres::Row;

pub async fn end_turn(client: &Client, et: &EndTurn) -> Result<Turn, AppError> {
    let rows = match client
        .query(
            "UPDATE turns
             SET end_time = NOW()
             WHERE team_id = $1 AND game_id = $2 returning *",
            &[&et.team_id, &et.game_id],
        )
        .await
    {
        Ok(r) => r,
        Err(e) => {
            return Err(AppError::Database(format!(
                "Failed to end turn for team {} in game {}: {}",
                et.team_id, et.game_id, e
            )));
        }
    };

    if rows.is_empty() {
        return Err(AppError::NotFound(
            "No active turn found for the given team and game".to_string(),
        )
        .into());
    }
    Ok(build_turn(rows[0].clone()))
}
pub async fn end_game_turns(client: &Client, game_id: i32) -> Result<Vec<Turn>, PgError> {
    let rows = client
        .query(
            "UPDATE turns
             SET end_time = NOW()
             WHERE game_id = $1 AND finished = FALSE
             RETURNING *",
            &[&game_id],
        )
        .await
        .map_err(PgError::from)?;

    let turns: Vec<Turn> = rows.into_iter().map(|row| build_turn(row)).collect();

    Ok(turns)
}

pub async fn start_turn(client: &Client, turn: PostStartTurn) -> Result<Turn, PgError> {
    // insert new turn
    let row = client
        .query_one(
            "INSERT INTO turns (team_id, game_id, dice1, dice2)
             VALUES ($1, $2, $3, $4)
             RETURNING *",
            &[&turn.team_id, &turn.game_id, &turn.dice1, &turn.dice2],
        )
        .await
        .map_err(PgError::from)?;

    Ok(build_turn(row))
}
pub async fn get_turns_for_team(client: &Client, team_id: i32) -> Result<Turns, PgError> {
    let rows = client
        .query(
            "SELECT * FROM turns WHERE team_id = $1 ORDER BY start_time ASC",
            &[&team_id],
        )
        .await
        .map_err(PgError::from)?;

    let turns: Vec<Turn> = rows.into_iter().map(|row| build_turn(row)).collect();

    Ok(Turns { turns })
}
fn build_turn(row: Row) -> Turn {
    Turn {
        turn_id: row.get(0),
        start_time: row.get(1),
        end_time: row.get(2),
        team_id: row.get(3),
        game_id: row.get(4),
        dice1: row.get(5),
        dice2: row.get(6),
        location: row.get(7),
        drinks: TurnDrinks { drinks: vec![] },
    }
}
pub async fn add_visited_place(
    client: &Client,
    game_id: i32,
    place_number: i32,
    team_id: i32,
    turn_id: i32,
) -> Result<u64, PgError> {
    println!("Adding visited place");
    println!("gid, pn, tid, tuid: {}, {}, {}, {}", game_id, place_number, team_id, turn_id);
    client
        .execute(
            "INSERT INTO game_places (game_id, place_number, team_id, turn_id) VALUES ($1, $2, $3, $4)",
            &[&game_id, &place_number, &team_id, &turn_id],
        )
        .await
        .map_err(PgError::from)?;
    client
        .execute(
            "UPDATE turns SET location = $1 WHERE turn_id = $2",
            &[&place_number, &turn_id],
        )
        .await
        .map_err(PgError::from)
}
pub async fn add_drinks_to_turn(client: &Client, drinks: TurnDrinks) -> Result<u64, PgError> {
    let mut total_added = 0;
    for drink in drinks.drinks {
        if !drink_in_turn(client, &drink).await? {
            let n_added = add_drink_to_turn(client, drink).await?;
            total_added += n_added;
        } else {
            let n_added = modify_drink_to_turn(client, drink).await?;
            total_added += n_added;
        }
    }
    Ok(total_added)
}
async fn add_drink_to_turn(client: &Client, drink: TurnDrink) -> Result<u64, PgError> {
    client
        .execute(
            "INSERT INTO turn_drinks (turn_id, drink_id, n, penalty) VALUES ($1, $2, $3, $4) returning n",
            &[&drink.turn_id, &drink.drink.id, &drink.n, &drink.penalty],
        )
        .await
}
async fn modify_drink_to_turn(client: &Client, drink: TurnDrink) -> Result<u64, PgError> {
    client
        .execute(
            "UPDATE turn_drinks SET n = n + $1 WHERE turn_id = $2 AND drink_id = $3 AND penalty = $4 returning n",
            &[&drink.n, &drink.turn_id, &drink.drink.id, &drink.penalty],
        )
        .await
}
async fn drink_in_turn(client: &Client, drink: &TurnDrink) -> Result<bool, PgError> {
    let row = client
        .query_one(
            "SELECT COUNT(*) FROM turn_drinks WHERE turn_id = $1 AND drink_id = $2 AND penalty = $3",
            &[&drink.turn_id, &drink.drink.id, &drink.penalty],
        )
        .await
        .map_err(PgError::from)?;

    let count: i64 = row.get(0);
    Ok(count > 0)
}
