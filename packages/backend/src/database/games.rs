use crate::database::boards::{
    build_board_place, build_via_board_place, get_board_place, get_first_place,
};
use crate::database::team::{get_team_by_id, get_teams};
use crate::database::turns::build_turn;
use crate::utils::ids::{BoardId, GameId, PlaceId, TeamId, TurnId};
use crate::utils::state::AppError;
use crate::utils::types::{
    Board, Drink, FirstTurnPost, Game, GameData, GameTeam, Games, PostGame, TeamLatestTurn, Turn,
    TurnDrink, TurnDrinks,
};
use chrono::{DateTime, Utc};
use deadpool_postgres::Client;
use std::collections::HashMap;
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
      INSERT INTO turns (team_id, game_id, place_number, thrown_at, confirmed_at, mixing_at, mixed_at, delivered_at)
      SELECT team_id, $1::int, $2::int, NOW(), NOW(), NOW(), NOW(), NOW()
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

/// Retrieves basic game data for all games (without teams/turns).
pub async fn get_game_list(client: &Client) -> Result<Vec<Game>, AppError> {
    let rows = client
        .query(
            "
            SELECT games.*, boards.name AS board_name
            FROM games
            INNER JOIN boards ON games.board_id = boards.board_id",
            &[],
        )
        .await?;
    Ok(rows.iter().map(build_game_from_row).collect())
}

/// Retrieves full game data including teams, turns, and locations.
/// Uses bulk queries to fetch all data efficiently.
pub async fn get_full_game_data(client: &Client, game_id: GameId) -> Result<GameData, AppError> {
    let game = get_game_by_id(client, game_id).await?;
    let teams = get_teams(client, game_id).await?;
    let board_id = game.board.id;

    // Fetch all turns with place data and via place data (one row per turn)
    let turn_rows = client
        .query(
            "SELECT
                t.turn_id, t.team_id, t.game_id, t.start_time, t.thrown_at,
                t.confirmed_at, t.mixing_at, t.mixed_at, t.delivered_at,
                t.end_time, t.dice1, t.dice2, t.dice3, t.dice4,
                t.place_number, t.via_number, t.penalty,
                bp.start, bp.area, bp.\"end\", bp.x, bp.y,
                p.place_id, p.place_name, p.rule, p.place_type, p.special,
                vbp.start AS via_start, vbp.area AS via_area, vbp.\"end\" AS via_end,
                vbp.x AS via_x, vbp.y AS via_y,
                vp.place_id AS via_place_id, vp.place_name AS via_place_name,
                vp.rule AS via_rule, vp.place_type AS via_place_type, vp.special AS via_special
             FROM turns t
             LEFT JOIN board_places bp ON bp.board_id = $2 AND bp.place_number = t.place_number
             LEFT JOIN places p ON p.place_id = bp.place_id
             LEFT JOIN board_places vbp ON vbp.board_id = $2 AND vbp.place_number = t.via_number
             LEFT JOIN places vp ON vp.place_id = vbp.place_id
             WHERE t.game_id = $1
             ORDER BY t.team_id, t.turn_id ASC",
            &[&game_id, &board_id],
        )
        .await?;

    // Fetch all turn drinks separately
    let drink_rows = client
        .query(
            "SELECT td.turn_id, td.drink_id, td.n, td.on_table, td.optional, d.name, d.favorite, d.no_mix_required
             FROM turn_drinks td
             JOIN drinks d ON d.drink_id = td.drink_id
             JOIN turns t ON t.turn_id = td.turn_id
             WHERE t.game_id = $1",
            &[&game_id],
        )
        .await?;

    // Build drinks lookup
    let mut drinks_by_turn: HashMap<TurnId, Vec<TurnDrink>> = HashMap::new();
    for row in drink_rows {
        let turn_id: TurnId = row.get("turn_id");
        drinks_by_turn.entry(turn_id).or_default().push(TurnDrink {
            drink: Drink {
                id: row.get("drink_id"),
                name: row.get("name"),
                favorite: row.get("favorite"),
                no_mix_required: row.get("no_mix_required"),
            },
            n: row.get("n"),
            on_table: row.get("on_table"),
            optional: row.get("optional"),
        });
    }

    // Build turns with place data
    let mut turns_by_team: HashMap<TeamId, Vec<Turn>> = HashMap::new();
    for row in &turn_rows {
        let mut turn = build_turn(row);
        turn.drinks.drinks = drinks_by_turn.remove(&turn.turn_id).unwrap_or_default();
        turn.place = row
            .get::<_, Option<PlaceId>>("place_id")
            .map(|_| build_board_place(row, board_id));
        turn.via = row
            .get::<_, Option<PlaceId>>("via_place_id")
            .map(|_| build_via_board_place(row, board_id));

        turns_by_team.entry(turn.team_id).or_default().push(turn);
    }

    // Build GameTeam for each team
    let teams = teams
        .into_iter()
        .map(|team| {
            let turns = turns_by_team.remove(&team.team_id).unwrap_or_default();
            let location = turns.iter().rev().find_map(|t| t.place.clone());
            GameTeam {
                team,
                turns,
                location,
            }
        })
        .collect();

    Ok(GameData { game, teams })
}

/// Validates that dice values are between 1 and 6
pub fn check_dice(dice: i32) -> Result<i32, AppError> {
    if dice < 1 || dice > 6 {
        Err(AppError::Validation(format!(
            "Dice value must be between 1 and 6, it was {}",
            dice
        )))
    } else {
        Ok(dice)
    }
}

/// Validates that optional dice values are between 1 and 6, treating 0 as None
pub fn check_opt_dice(dice: Option<i32>) -> Result<Option<i32>, AppError> {
    match dice {
        Some(0) => Ok(None),
        Some(d) => Ok(Some(check_dice(d)?)),
        None => Ok(None),
    }
}

/// Retrieves drinks associated with a turn
pub async fn get_turn_drinks(client: &Client, turn_id: TurnId) -> Result<TurnDrinks, AppError> {
    let rows = client
        .query(
            "SELECT td.drink_id, d.name, d.favorite, d.no_mix_required, td.n, td.on_table, td.optional
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
                n: row.get("n"),
                on_table: row.get("on_table"),
                optional: row.get("optional"),
            })
            .collect(),
    };

    Ok(turn_drinks)
}

/// Checks if a place has already been visited in a game
pub async fn count_place_visits(
    client: &Client,
    game_id: GameId,
    place_number: i32,
) -> Result<i32, AppError> {
    Ok(client
        .query_one(
            "SELECT COUNT(*)::integer FROM turns
            WHERE game_id = $1 AND place_number = $2 AND confirmed_at IS NOT NULL",
            &[&game_id, &place_number],
        )
        .await?
        .get(0))
}

/// Lightweight version of get_full_game_data that only fetches one team and their latest turn.
/// Use this when you only need data for the involved team, not all teams.
pub async fn get_team_latest_turn(
    client: &Client,
    game_id: GameId,
    team_id: TeamId,
) -> Result<TeamLatestTurn, AppError> {
    let game = get_game_by_id(client, game_id).await?;
    let team = get_team_by_id(client, team_id).await?;

    // Get the latest confirmed turn with a location (excludes penalty turns)
    let latest_turn = client
        .query_opt(
            "SELECT * FROM turns
             WHERE team_id = $1 AND game_id = $2
               AND confirmed_at IS NOT NULL AND place_number IS NOT NULL
             ORDER BY turn_id DESC LIMIT 1",
            &[&team_id, &game_id],
        )
        .await?
        .map(|r| build_turn(&r));

    // Get location from latest confirmed turn
    let location = match latest_turn.as_ref().and_then(|t| t.place_number) {
        Some(place_number) => get_board_place(client, game.board.id, place_number)
            .await
            .ok(),
        None => None,
    };

    Ok(TeamLatestTurn {
        team,
        latest_turn,
        location,
    })
}
