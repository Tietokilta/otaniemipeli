use crate::database::boards::{get_board_place, get_first_place};
use crate::database::team::get_teams;
use crate::database::turns::{build_turn, end_game_turns};
use crate::utils::ids::{BoardId, GameId, TeamId, TurnId};
use crate::utils::state::AppError;
use crate::utils::types::{
    Board, Drink, FirstTurnPost, Game, GameData, GameTeam, Games, PostGame, Turn, TurnDrink,
    TurnDrinks,
};
use chrono::{DateTime, Utc};
use deadpool_postgres::Client;
use futures::future::join_all;
use tokio_postgres::Row;

/// Retrieves all games from the database
pub async fn get_games(client: &Client) -> Result<Games, AppError> {
    let rows = client
        .query(
            "
            SELECT games.*, boards.name AS board_name
            FROM games
            INNER JOIN boards ON games.board_id = boards.board_id",
            &[],
        )
        .await?;
    let games = rows.iter().map(build_game_from_row).collect();
    Ok(Games { games })
}

/// Retrieves a game by its ID
pub async fn get_game_by_id(client: &Client, game_id: GameId) -> Result<Game, AppError> {
    let row_opt = client
        .query_opt(
            "
            SELECT games.*, boards.name AS board_name
            FROM games
            INNER JOIN boards ON games.board_id = boards.board_id
            WHERE games.game_id = $1",
            &[&game_id],
        )
        .await?;
    Ok(row_opt
        .map(|r| build_game_from_row(&r))
        .unwrap_or_else(default_game))
}

/// Creates a new game in the database
pub async fn post_game(client: &Client, game: PostGame) -> Result<Game, AppError> {
    let row = client
        .query_one(
            "
            WITH ins_game AS (
              INSERT INTO games (name, board_id) VALUES ($1, $2)
              RETURNING *
            )
            SELECT ins_game.*, boards.name AS board_name
            FROM ins_game
            INNER JOIN boards ON ins_game.board_id = boards.board_id",
            &[&game.name, &game.board],
        )
        .await?;
    Ok(build_game_from_row(&row))
}

/// Creates initial turns for all teams in a game at the starting position.
pub async fn make_first_turns(
    client: &Client,
    first_turn: &FirstTurnPost,
    place_number: i32,
) -> Result<(), AppError> {
    let query_str = "\
    WITH ins_turns AS (
      INSERT INTO turns (team_id, game_id, place_number)
      SELECT team_id, $1::int, $2::int
      FROM teams
      WHERE game_id = $1
      RETURNING team_id, turn_id
    ),
    drinks(drink_id, n) AS (
      SELECT * FROM unnest($3::int[], $4::int[])
    ),
    ins_drinks AS (
      INSERT INTO turn_drinks (drink_id, turn_id, n)
      SELECT d.drink_id, it.turn_id, GREATEST(1, d.n)
      FROM ins_turns it
      CROSS JOIN drinks d
    )
    SELECT team_id, turn_id FROM ins_turns";

    let (drink_ids, counts): (Vec<i32>, Vec<i32>) = first_turn
        .drinks
        .iter()
        .map(|td| (td.drink.id.0, td.n))
        .unzip();

    client
        .execute(
            query_str,
            &[&first_turn.game_id, &place_number, &drink_ids, &counts],
        )
        .await?;

    Ok(())
}

/// Starts a game by setting its start time and creating initial turns.
pub async fn start_game(client: &Client, first_turn: FirstTurnPost) -> Result<Game, AppError> {
    let row = client
        .query_one(
            "
            WITH upd_game AS (
              UPDATE games
              SET started = true, start_time = NOW()
              WHERE game_id = $1
              RETURNING *
            )
            SELECT upd_game.*, boards.name AS board_name
            FROM upd_game
            INNER JOIN boards ON upd_game.board_id = boards.board_id",
            &[&first_turn.game_id],
        )
        .await?;
    let game = build_game_from_row(&row);

    let place_number = get_first_place(client, game.board.id).await?;
    make_first_turns(client, &first_turn, place_number).await?;

    Ok(game)
}

/// Ends a game by marking it finished and ending all active turns.
pub async fn end_game(client: &Client, game_id: GameId) -> Result<Game, AppError> {
    let row = client
        .query_one(
            "
            WITH upd_game AS (
              UPDATE games
              SET finished = true
              WHERE game_id = $1
              RETURNING *
            )
            SELECT upd_game.*, boards.name AS board_name
            FROM upd_game
            INNER JOIN boards ON upd_game.board_id = boards.board_id",
            &[&game_id],
        )
        .await?;
    end_game_turns(client, game_id).await?;
    Ok(build_game_from_row(&row))
}

/// Constructs a Game struct from a database row.
fn build_game_from_row(row: &Row) -> Game {
    Game {
        id: row.get("game_id"),
        start_time: row.get("start_time"),
        name: row.get("name"),
        started: row.get("started"),
        finished: row.get("finished"),
        board: Board {
            id: row.get("board_id"),
            name: row.get("board_name"),
        },
    }
}

/// Returns a placeholder game for when no game is found.
fn default_game() -> Game {
    Game {
        id: GameId(-100),
        name: "unknown".to_string(),
        board: Board {
            id: BoardId(-404),
            name: "unknown".to_string(),
        },
        started: false,
        finished: false,
        start_time: DateTime::parse_from_rfc3339("1986-02-13T14:00:00Z")
            .unwrap()
            .with_timezone(&Utc),
    }
}

/// Retrieves full game data including teams, turns, and locations.
pub async fn get_team_data(client: &Client, game_id: GameId) -> Result<GameData, AppError> {
    let game = get_game_by_id(client, game_id).await?;
    let teams = get_teams(client, game_id).await?;

    let board_id = game.board.id;

    let teams = join_all(teams.into_iter().map(|team| async move {
        let turns = get_team_turns_with_drinks(client, team.team_id, game_id)
            .await
            .unwrap_or_default();

        // Get the latest location from the turns
        let location = match turns.iter().rev().find_map(|turn| turn.location) {
            Some(place_number) => get_board_place(client, board_id, place_number).await.ok(),
            None => None,
        };

        Ok::<_, AppError>(GameTeam {
            team,
            turns,
            location,
        })
    }))
    .await
    .into_iter()
    .collect::<Result<Vec<_>, _>>()?;

    Ok(GameData { game, teams })
}

/// Retrieves game data for all games.
pub async fn get_team_datas(client: &Client) -> Result<Vec<GameData>, AppError> {
    let rows = client.query("SELECT game_id FROM games", &[]).await?;
    let game_ids: Vec<GameId> = rows.iter().map(|row| row.get(0)).collect();

    let game_datas: Vec<GameData> = join_all(
        game_ids
            .into_iter()
            .map(|game_id| get_team_data(client, game_id)),
    )
    .await
    .into_iter()
    .collect::<Result<Vec<_>, _>>()?;

    Ok(game_datas)
}

/// Retrieves all turns taken by a team in a specific game, including associated drinks
pub async fn get_team_turns_with_drinks(
    client: &Client,
    team_id: TeamId,
    game_id: GameId,
) -> Result<Vec<Turn>, AppError> {
    let rows = client
        .query(
            "SELECT * FROM turns WHERE team_id = $1 AND game_id = $2 ORDER BY turn_id ASC",
            &[&team_id, &game_id],
        )
        .await?;

    let mut turns: Vec<Turn> = rows.into_iter().map(|row| build_turn(row)).collect();

    for turn in turns.iter_mut() {
        turn.drinks = get_turn_drinks(client, turn.turn_id).await?;
    }
    Ok(turns)
}

/// Validates that dice values are between 1 and 6
pub fn check_dice(dice1: i32, dice2: i32) -> Result<(), AppError> {
    if dice1 < 1 || dice1 > 6 || dice2 < 1 || dice2 > 6 {
        return Err(AppError::Validation(format!(
            "Dice values must be between 1 and 6, they were {} and {}",
            dice1, dice2
        )));
    }
    Ok(())
}

/// Retrieves drinks associated with a turn
pub async fn get_turn_drinks(client: &Client, turn_id: TurnId) -> Result<TurnDrinks, AppError> {
    let rows = client
        .query(
            "SELECT td.drink_id, d.name, d.favorite, d.no_mix_required, td.n
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
                    id: row.get("drink_id"),
                    name: row.get("name"),
                    favorite: row.get("favorite"),
                    no_mix_required: row.get("no_mix_required"),
                },
                turn_id,
                n: row.get("n"),
            })
            .collect(),
    };

    Ok(turn_drinks)
}

/// Checks if a place has already been visited in a game
pub async fn place_visited(
    client: &Client,
    game_id: GameId,
    place_number: i32,
) -> Result<bool, AppError> {
    let query_str = "\
    SELECT * FROM turns WHERE game_id = $1 AND place_number = $2 LIMIT 1";
    Ok(client
        .query_opt(query_str, &[&game_id, &place_number])
        .await?
        .is_some())
}
