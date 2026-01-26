use crate::database::boards::{get_board_place, get_first_place};
use crate::database::team::get_teams;
use crate::database::turns::{add_visited_place, end_game_turns, get_turns_for_team};
use crate::utils::state::AppError;
use crate::utils::types::*;
use chrono::{DateTime, Utc};
use deadpool_postgres::Client;
use futures::future::join_all;
use std::collections::HashMap;
use tokio_postgres::Row;

pub async fn get_games(client: &Client) -> Result<Games, PgError> {
    let rows = client.query("SELECT * FROM games", &[]).await?;
    let games = rows.iter().map(build_game_from_row).collect();
    Ok(Games { games })
}

pub async fn get_game(
    client: &Client,
    game_name: String,
    game_board: i32,
) -> Result<Game, PgError> {
    let row_opt = client
        .query_opt(
            "SELECT * FROM games WHERE games.name = $1 AND games.board_id = $2",
            &[&game_name, &game_board],
        )
        .await?;

    Ok(row_opt
        .map(|r| build_game_from_row(&r))
        .unwrap_or_else(default_game))
}

pub async fn get_game_id(client: &Client, game_id: i32) -> Result<Game, PgError> {
    let row_opt = client
        .query_opt("SELECT * FROM games WHERE games.game_id = $1", &[&game_id])
        .await?;
    Ok(row_opt
        .map(|r| build_game_from_row(&r))
        .unwrap_or_else(default_game))
}

pub async fn post_game(client: &Client, game: PostGame) -> Result<Game, PgError> {
    client
        .execute(
            "INSERT INTO games (name, board_id) VALUES ($1, $2)",
            &[&game.name, &game.board],
        )
        .await?;

    get_game(client, game.name, game.board).await
}

pub async fn make_first_turns(client: &Client, first_turn: &FirstTurnPost) -> Result<(), PgError> {
    let query_str = "\
    WITH ins_turns AS (
      INSERT INTO turns (team_id, game_id, dice1, dice2, finished)
      SELECT team_id, $1::int, 0, 0, false
      FROM teams
      WHERE game_id = $1
      RETURNING turn_id
    ),
    drinks(drink_id, n) AS (
      SELECT * FROM unnest($2::int[], $3::int[])
    ),
    ins_drinks AS (
      INSERT INTO turn_drinks (drink_id, turn_id, n)
      SELECT d.drink_id, it.turn_id, GREATEST(1, d.n)
      FROM ins_turns it
      CROSS JOIN drinks d
      RETURNING drink_id, turn_id, n
    )
    SELECT 1 FROM ins_drinks";

    let (drink_ids, counts): (Vec<i32>, Vec<i32>) = first_turn
        .drinks
        .iter()
        .map(|td| (td.drink.id, td.n))
        .unzip();

    client
        .execute(query_str, &[&first_turn.game_id, &drink_ids, &counts])
        .await?;

    Ok(())
}

pub async fn start_game(client: &Client, first_turn: FirstTurnPost) -> Result<Game, PgError> {
    // transaction so: first turns + game update are atomic

    make_first_turns(client, &first_turn).await?;

    let row = client
        .query_one(
            "UPDATE games
             SET started = true, start_time = NOW()
             WHERE game_id = $1
             RETURNING *",
            &[&first_turn.game_id],
        )
        .await?;
    let game = build_game_from_row(&row);
    let game_data = match get_team_data(client, game.id).await {
        Ok(data) => data,
        Err(e) => return Err(e),
    };
    for team in game_data.teams {
        let place_number = match get_first_place(client, game.board).await {
            Ok(place) => place,
            Err(e) => return Err(e),
        };
        add_visited_place(
            client,
            game.id,
            place_number,
            team.team.team_id,
            team.turns.first().unwrap().turn_id,
        )
        .await?;
    }

    Ok(build_game_from_row(&row))
}
pub async fn end_game(client: &Client, game_id: i32) -> Result<Game, PgError> {
    let row = client
        .query_one(
            "UPDATE games
             SET finished = true
             WHERE game_id = $1
             RETURNING *",
            &[&game_id],
        )
        .await?;
    end_game_turns(client, game_id).await?;
    Ok(build_game_from_row(&row))
}

fn build_game_from_row(row: &Row) -> Game {
    Game {
        id: row.get(0),
        start_time: row.get(1),
        name: row.get(2),
        started: row.get(3),
        finished: row.get(4),
        board: row.get(5),
    }
}

fn default_game() -> Game {
    Game {
        id: -100,
        name: "unknown".to_string(),
        board: -404,
        started: false,
        finished: false,
        start_time: DateTime::parse_from_rfc3339("1986-02-13T14:00:00Z")
            .unwrap()
            .with_timezone(&Utc),
    }
}

pub async fn get_team_data(client: &Client, game_id: i32) -> Result<GameData, PgError> {
    let game = get_game_id(client, game_id).await?;
    let teams = get_teams(client, game_id).await?;

    let board_id = game.board;

    let teams = join_all(teams.into_iter().map(|team| async move {
        let turns = get_team_turns_with_board(client, team.team_id, game_id)
            .await
            .unwrap_or_default();

        GameTeam {
            team: team.clone(),
            turns,
            location: get_team_board_place(client, game_id, board_id, team.team_id)
                .await
                .ok(),
        }
    }))
    .await;

    Ok(GameData { game, teams })
}

pub async fn get_team_board_place(
    client: &Client,
    game_id: i32,
    board_id: i32,
    team_id: i32,
) -> Result<BoardPlace, AppError> {
    match get_turns_for_team(client, team_id).await {
        Ok(_turns) => {
            let row_un = client
                .query(
                    "\
                SELECT gp.place_number
                FROM game_places gp
                WHERE gp.team_id = $1 AND gp.game_id = $2
                ORDER BY gp.visited_at DESC
                LIMIT 1",
                    &[&team_id, &game_id],
                )
                .await;
            let row = match row_un {
                Ok(r) => {
                    if r.is_empty() {
                        tracing::error!("No places found");
                        return Err(AppError::NotFound(format!(
                            "No places found for team_id:{}",
                            team_id
                        )));
                    }
                    r[0].clone()
                }
                Err(e) => {
                    tracing::error!("Error getting places: {}", e);
                    return Err(AppError::Database(e.to_string()));
                }
            };
            match get_board_place(client, board_id, row.get(0)).await {
                Ok(place) => Ok(place),
                Err(e) => Err(AppError::Database(e.to_string())),
            }
        }
        Err(e) => Err(AppError::Database(e.to_string())),
    }
}

pub async fn get_team_turns_with_board(
    client: &Client,
    team_id: i32,
    game_id: i32,
) -> Result<Vec<Turn>, AppError> {
    let rows_un = client
        .query(
            "\
            SELECT
              t.turn_id,
              t.start_time,
              t.team_id,
              t.game_id,
              t.dice1,
              t.dice2,
              t.finished,
              t.end_time,
              t.location
            FROM turns t
            WHERE t.team_id = $1 AND t.game_id = $2
            ORDER BY t.turn_id ASC",
            &[&team_id, &game_id],
        )
        .await;
    let rows = match rows_un {
        Ok(r) => r,
        Err(e) => return Err(AppError::Database(e.to_string())),
    };

    if rows.is_empty() {
        return Ok(Vec::new());
    }

    let mut turns_by_id: HashMap<i32, Turn> = HashMap::new();
    let mut ordered_ids: Vec<i32> = Vec::new();

    for row in rows {
        let turn_id: i32 = row.get(0);

        if !turns_by_id.contains_key(&turn_id) {
            let end_time = row.try_get::<usize, DateTime<Utc>>(7).ok();

            turns_by_id.insert(
                turn_id,
                Turn {
                    turn_id,
                    start_time: row.get(1),
                    team_id: row.get(2),
                    game_id: row.get(3),
                    dice1: row.get(4),
                    dice2: row.get(5),
                    finished: row.get(6),
                    end_time,
                    location: row.get(8),
                    drinks: get_turn_drinks(client, turn_id).await.unwrap_or_else(|e| {
                        tracing::error!("Error getting turn drinks for turn_id {}: {}", turn_id, e);
                        TurnDrinks { drinks: Vec::new() }
                    }),
                },
            );
            ordered_ids.push(turn_id);
        }
    }

    let turns: Vec<Turn> = ordered_ids
        .into_iter()
        .filter_map(|id| turns_by_id.remove(&id))
        .collect();
    Ok(turns)
}
pub fn check_dice(dice1: i32, dice2: i32) -> Result<(), AppError> {
    if dice1 < 1 || dice1 > 6 || dice2 < 1 || dice2 > 6 {
        return Err(AppError::Validation(format!(
            "Dice values must be between 1 and 6, they were {} and {}",
            dice1, dice2
        )));
    }
    Ok(())
}
pub async fn get_turn_drinks(client: &Client, turn_id: i32) -> Result<TurnDrinks, PgError> {
    let rows = client
        .query(
            "\
        SELECT td.drink_id, d.name, td.n, td.penalty
        FROM turn_drinks td
        JOIN drinks d ON td.drink_id = d.drink_id
        WHERE td.turn_id = $1",
            &[&turn_id],
        )
        .await?;

    let turn_drinks = TurnDrinks {
        drinks: rows
            .iter()
            .map(|row| TurnDrink {
                drink: Drink {
                    id: row.get(0),
                    name: row.get(1),
                },
                turn_id,
                n: row.get(2),
                penalty: row.get(3),
            })
            .collect(),
    };

    Ok(turn_drinks)
}
pub async fn place_visited(
    client: &Client,
    game_id: i32,
    place_number: i32,
) -> Result<bool, AppError> {
    let query_str = "\
    SELECT * FROM game_places WHERE game_id = $1 AND place_number = $2";
    match client.query(query_str, &[&game_id, &place_number]).await {
        Ok(rows) => {
            if !rows.is_empty() {
                Ok(true)
            } else {
                Ok(false)
            }
        }
        Err(e) => Err(AppError::Database(e.to_string())),
    }
}
