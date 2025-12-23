use crate::utils::types::{PgError, PostStartTurn, Turn, Turns};
use deadpool_postgres::Client;

pub async fn end_turn(client: &Client, team_id: i32, game_id: i32) -> Result<Turn, PgError> {
    let row = client
        .query_one(
            "UPDATE turns
             SET finished = TRUE, end_time = NOW()
             WHERE team_id = $1 AND game_id = $2 AND finished = FALSE returning *",
            &[&team_id, &game_id],
        )
        .await
        .map_err(PgError::from)?;

    Ok(Turn {
        turn_id: row.get(0),
        start_time: row.get(1),
        team_id: row.get(2),
        game_id: row.get(3),
        dice1: row.get(4),
        dice2: row.get(5),
        finished: row.get(6),
        end_time: row.get(7),
        drinks: vec![],
    })
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

    Ok(Turn {
        turn_id: row.get(0),
        start_time: row.get(1),
        team_id: row.get(2),
        game_id: row.get(3),
        dice1: row.get(4),
        dice2: row.get(5),
        finished: row.get(6),
        end_time: row.get(7),
        drinks: vec![],
    })
}
pub async fn get_turns_for_team(client: &Client, team_id: i32) -> Result<Turns, PgError> {
    let rows = client
        .query(
            "SELECT * FROM turns WHERE team_id = $1 ORDER BY start_time ASC",
            &[&team_id],
        )
        .await
        .map_err(PgError::from)?;

    let turns: Vec<Turn> = rows
        .into_iter()
        .map(|row| Turn {
            turn_id: row.get(0),
            start_time: row.get(1),
            team_id: row.get(2),
            game_id: row.get(3),
            dice1: row.get(4),
            dice2: row.get(5),
            finished: row.get(6),
            end_time: row.get(7),
            drinks: vec![],
        })
        .collect();

    Ok(Turns { turns })
}
pub async fn add_visited_place(
    client: &Client,
    game_id: i32,
    place_number: i32,
    team_id: i32,
) -> Result<u64, PgError> {
    client
        .execute(
            "INSERT INTO game_places (game_id, place_number, team_id) VALUES ($1, $2, $3)",
            &[&game_id, &place_number, &team_id],
        )
        .await
        .map_err(PgError::from)
}
