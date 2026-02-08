use crate::utils::ids::{GameId, TeamId, TurnId};
use crate::utils::state::AppError;
use crate::utils::types::{DrinkPrepStatus, PostStartTurn, Turn, TurnDrinks};
use deadpool_postgres::Client;
use tokio_postgres::Row;

/// Ends the active turns for a given team in a game
pub async fn end_active_turns(
    client: &Client,
    game_id: GameId,
    team_id: TeamId,
) -> Result<Turn, AppError> {
    let rows = match client
        .query(
            "UPDATE turns
             SET end_time = NOW(),
                mixing_at = COALESCE(mixing_at, NOW()),
                mixed_at = COALESCE(mixed_at, NOW()),
                delivered_at = COALESCE(delivered_at, NOW())
             WHERE team_id = $1 AND game_id = $2 AND end_time IS NULL
             RETURNING *",
            &[&team_id, &game_id],
        )
        .await
    {
        Ok(r) => r,
        Err(e) => {
            return Err(AppError::Database(format!(
                "Failed to end turn for team {} in game {}: {}",
                team_id, game_id, e
            )));
        }
    };

    if rows.is_empty() {
        return Err(AppError::NotFound(
            "No active turn found for the given team and game".to_string(),
        )
        .into());
    }
    Ok(build_turn(&rows[0]))
}

/// Starts a new turn for a team in a game.
/// If dice are provided, sets thrown_at. Otherwise, only start_time is set.
pub async fn start_turn(client: &Client, turn: PostStartTurn) -> Result<Turn, AppError> {
    let has_dice = turn.dice1.is_some() && turn.dice2.is_some();
    let row = if has_dice {
        client
            .query_one(
                "INSERT INTO turns (team_id, game_id, dice1, dice2, thrown_at, penalty)
                 VALUES ($1, $2, $3, $4, NOW(), $5)
                 RETURNING *",
                &[
                    &turn.team_id,
                    &turn.game_id,
                    &turn.dice1,
                    &turn.dice2,
                    &turn.penalty,
                ],
            )
            .await?
    } else {
        client
            .query_one(
                "INSERT INTO turns (team_id, game_id, penalty)
                 VALUES ($1, $2, $3)
                 RETURNING *",
                &[&turn.team_id, &turn.game_id, &turn.penalty],
            )
            .await?
    };

    Ok(build_turn(&row))
}

/// Updates the dice values for an existing turn and sets thrown_at
pub async fn update_turn_dice(
    client: &Client,
    turn_id: TurnId,
    dice1: i32,
    dice2: i32,
) -> Result<Turn, AppError> {
    let row = client
        .query_one(
            "UPDATE turns SET dice1 = $2, dice2 = $3, thrown_at = NOW()
             WHERE turn_id = $1
             RETURNING *",
            &[&turn_id, &dice1, &dice2],
        )
        .await?;

    Ok(build_turn(&row))
}

/// Sets confirmed_at for a turn
pub async fn set_turn_confirmed(client: &Client, turn_id: TurnId) -> Result<Turn, AppError> {
    let row = client
        .query_one(
            "UPDATE turns SET confirmed_at = NOW(),
                thrown_at = COALESCE(thrown_at, NOW())
             WHERE turn_id = $1
             RETURNING *",
            &[&turn_id],
        )
        .await?;

    Ok(build_turn(&row))
}

/// Retrieves a turn by ID with its drinks
pub async fn get_turn_with_drinks(client: &Client, turn_id: TurnId) -> Result<Turn, AppError> {
    let row = client
        .query_one("SELECT * FROM turns WHERE turn_id = $1", &[&turn_id])
        .await?;
    let mut turn = build_turn(&row);
    turn.drinks = crate::database::games::get_turn_drinks(client, turn_id).await?;
    Ok(turn)
}

/// Deletes a turn and its associated drinks. Only unconfirmed turns can be cancelled.
pub async fn cancel_turn(client: &Client, turn_id: TurnId) -> Result<(), AppError> {
    // Delete the turn (only if not confirmed)
    let rows_affected = client
        .execute(
            "DELETE FROM turns WHERE turn_id = $1 AND confirmed_at IS NULL",
            &[&turn_id],
        )
        .await?;

    if rows_affected == 0 {
        return Err(AppError::Validation(
            "Cannot cancel a confirmed turn".to_string(),
        ));
    }

    Ok(())
}

/// Builds a Turn struct from a database row
pub fn build_turn(row: &Row) -> Turn {
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
        place: None,
    }
}

/// Updates a turn with the final location
pub async fn set_end_place(
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

/// Replaces all drinks associated with a turn (deletes existing, inserts new).
pub async fn set_turn_drinks(
    client: &Client,
    turn_id: TurnId,
    drinks: TurnDrinks,
) -> Result<(), AppError> {
    // Delete existing drinks for this turn
    client
        .execute("DELETE FROM turn_drinks WHERE turn_id = $1", &[&turn_id])
        .await?;

    // Insert new drinks
    for drink in &drinks.drinks {
        client
            .execute(
                "INSERT INTO turn_drinks (turn_id, drink_id, n) VALUES ($1, $2, $3)",
                &[&turn_id, &drink.drink.id, &drink.n],
            )
            .await?;
    }
    Ok(())
}

/// Sets mixing_at to NOW() if no drinks require mixing
pub async fn set_turn_automixing(
    client: &Client,
    turn_id: TurnId,
    drinks: &TurnDrinks,
) -> Result<(), AppError> {
    let needs_mixing = drinks.drinks.iter().any(|d| !d.drink.no_mix_required);
    if !needs_mixing {
        client
            .execute(
                "UPDATE turns SET mixing_at = NOW() WHERE turn_id = $1",
                &[&turn_id],
            )
            .await?;
    }
    Ok(())
}

/// Updates the drink preparation status of a turn.
///
/// - queued: clears mixing_at, mixed_at, delivered_at
/// - mixing: sets mixing_at to NOW(), clears mixed_at and delivered_at
/// - mixed: sets mixed_at to NOW(), coalesces mixing_at to NOW(), clears delivered_at
/// - delivered: sets delivered_at to NOW(), coalesces mixing_at and mixed_at to NOW()
pub async fn set_drink_prep_status(
    client: &Client,
    turn_id: TurnId,
    status: DrinkPrepStatus,
) -> Result<Turn, AppError> {
    let query = match status {
        DrinkPrepStatus::Queued => {
            "UPDATE turns SET mixing_at = NULL, mixed_at = NULL, delivered_at = NULL
             WHERE turn_id = $1 RETURNING *"
        }
        DrinkPrepStatus::Mixing => {
            "UPDATE turns SET mixing_at = NOW(), mixed_at = NULL, delivered_at = NULL
             WHERE turn_id = $1 RETURNING *"
        }
        DrinkPrepStatus::Mixed => {
            "UPDATE turns SET mixing_at = COALESCE(mixing_at, NOW()), mixed_at = NOW(), delivered_at = NULL
             WHERE turn_id = $1 RETURNING *"
        }
        DrinkPrepStatus::Delivered => {
            "UPDATE turns SET mixing_at = COALESCE(mixing_at, NOW()), mixed_at = COALESCE(mixed_at, NOW()), delivered_at = NOW()
             WHERE turn_id = $1 RETURNING *"
        }
    };

    let row = client.query_one(query, &[&turn_id]).await?;
    Ok(build_turn(&row))
}
