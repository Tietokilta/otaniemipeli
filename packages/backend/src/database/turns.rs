use crate::utils::ids::{GameId, TeamId, TurnId};
use crate::utils::state::AppError;
use crate::utils::types::{EndTurn, PostStartTurn, Turn, TurnDrinks};
use deadpool_postgres::Client;
use tokio_postgres::Row;

/// Ends the active turns for a given team in a game
///
/// TODO: allow ending specific turn (depending on what has been drunk)
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

/// Marks all active turns in a game as ended
pub async fn end_game_turns(client: &Client, game_id: GameId) -> Result<Vec<Turn>, AppError> {
    let rows = client
        .query(
            "UPDATE turns
             SET end_time = NOW()
             WHERE game_id = $1 AND end_time IS NULL
             RETURNING *",
            &[&game_id],
        )
        .await?;

    let turns: Vec<Turn> = rows.into_iter().map(|row| build_turn(row)).collect();

    Ok(turns)
}

/// Starts a new turn for a team in a game by throwing dice
pub async fn start_turn(client: &Client, turn: PostStartTurn) -> Result<Turn, AppError> {
    // insert new turn
    let row = client
        .query_one(
            "INSERT INTO turns (team_id, game_id, dice1, dice2)
             VALUES ($1, $2, $3, $4)
             RETURNING *",
            &[&turn.team_id, &turn.game_id, &turn.dice1, &turn.dice2],
        )
        .await?;

    Ok(build_turn(row))
}

/// Creates a penalty turn with thrown_at and confirmed_at set immediately
pub async fn create_penalty_turn(
    client: &Client,
    team_id: TeamId,
    game_id: GameId,
) -> Result<Turn, AppError> {
    let row = client
        .query_one(
            "INSERT INTO turns (team_id, game_id, penalty, thrown_at, confirmed_at)
             VALUES ($1, $2, TRUE, NOW(), NOW())
             RETURNING *",
            &[&team_id, &game_id],
        )
        .await?;

    Ok(build_turn(row))
}

/// Builds a Turn struct from a database row
pub fn build_turn(row: Row) -> Turn {
    Turn {
        turn_id: row.get("turn_id"),
        team_id: row.get("team_id"),
        game_id: row.get("game_id"),
        start_time: row.get("start_time"),
        thrown_at: row.get("thrown_at"),
        confirmed_at: row.get("confirmed_at"),
        mixing_at: row.get("mixing_at"),
        mixed_at: row.get("mixed_at"),
        delivered_at: row.get("delivered_at"),
        end_time: row.get("end_time"),
        dice1: row.get("dice1"),
        dice2: row.get("dice2"),
        location: row.get("place_number"),
        penalty: row.get("penalty"),
        drinks: TurnDrinks { drinks: vec![] },
    }
}

/// Updates a turn with the final location
pub async fn add_visited_place(
    client: &Client,
    place_number: i32,
    turn_id: TurnId,
) -> Result<u64, AppError> {
    Ok(client
        .execute(
            "UPDATE turns SET place_number = $1 WHERE turn_id = $2",
            &[&place_number, &turn_id],
        )
        .await?)
}

/// Adds or updates drinks associated with a turn.
pub async fn add_drinks_to_turn(
    client: &Client,
    turn_id: TurnId,
    drinks: TurnDrinks,
) -> Result<u64, AppError> {
    let mut total_added = 0;
    for drink in drinks.drinks {
        client
            .execute(
                "INSERT INTO turn_drinks (turn_id, drink_id, n) VALUES ($1, $2, $3)
                 ON CONFLICT (turn_id, drink_id) DO UPDATE SET n = turn_drinks.n + EXCLUDED.n",
                &[&turn_id, &drink.drink.id, &drink.n],
            )
            .await?;
        total_added += drink.n as u64;
    }
    Ok(total_added)
}
