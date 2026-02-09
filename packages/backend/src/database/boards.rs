use crate::utils::ids::BoardId;
use crate::utils::state::AppError;
use crate::utils::types::{
    Board, BoardPlace, BoardPlaces, Boards, Connection, Connections, Drink, Place, PlaceDrink,
    PlaceDrinks, PlaceThrow, Places,
};
use deadpool_postgres::Client;
use std::cmp::min;
use tokio_postgres::Row;

/// Retrieves all game boards.
pub async fn get_boards(client: &Client) -> Result<Boards, AppError> {
    let query = client
        .query("SELECT board_id, name FROM boards;", &[])
        .await?;

    Ok(Boards {
        boards: query
            .into_iter()
            .map(|row| Board {
                id: row.get("board_id"),
                name: row.get("name"),
            })
            .collect(),
    })
}

/// Retrieves all place definitions.
pub async fn get_places(client: &Client) -> Result<Places, AppError> {
    let query = client
        .query(
            "SELECT place_id, place_name, place_type, rule FROM places;",
            &[],
        )
        .await?;

    Ok(Places {
        places: query
            .into_iter()
            .map(|row| Place {
                place_id: row.get("place_id"),
                place_name: row.get("place_name"),
                place_type: row.get("place_type"),
                rule: row.get("rule"),
            })
            .collect(),
    })
}

/// Retrieves a single board by ID.
pub async fn get_board(client: &Client, board_id: BoardId) -> Result<Board, AppError> {
    let query = client
        .query_opt(
            "SELECT board_id, name FROM boards WHERE board_id = $1",
            &[&board_id],
        )
        .await?;
    match query {
        Some(row) => Ok(Board {
            id: row.get("board_id"),
            name: row.get("name"),
        }),
        None => Ok(Board {
            id: BoardId(-1),
            name: "No Boards!".to_string(),
        }),
    }
}

/// Creates a new board.
pub async fn post_board(client: &Client, board: Board) -> Result<u64, AppError> {
    Ok(client
        .execute("INSERT INTO boards (name) values ($1)", &[&board.name])
        .await?)
}

/// Builds a BoardPlace struct from a row (without connections/drinks).
pub fn build_board_place(row: &Row, board_id: BoardId) -> BoardPlace {
    BoardPlace {
        board_id,
        place: Place {
            place_id: row.get("place_id"),
            place_name: row.get("place_name"),
            rule: row.get("rule"),
            place_type: row.get("place_type"),
        },
        place_number: row.get("place_number"),
        start: row.get("start"),
        area: row.get("area"),
        end: row.get("end"),
        x: row.get("x"),
        y: row.get("y"),
        connections: Connections {
            connections: vec![],
        },
        drinks: PlaceDrinks { drinks: vec![] },
    }
}

/// Builds a BoardPlace struct from a row and fetches its connections and drinks.
async fn build_board_place_and_get_connections(
    client: &Client,
    row: &Row,
) -> Result<BoardPlace, AppError> {
    let board_id = row.get("board_id");
    let place_number: i32 = row.get("place_number");
    let mut place = build_board_place(row, board_id);
    place.connections = Connections {
        connections: get_board_place_connections(client, board_id, place_number).await?,
    };
    place.drinks = get_place_drinks(client, place_number, board_id).await?;
    Ok(place)
}

/// Retrieves all places on a board with their connections and drinks.
pub async fn get_board_places(client: &Client, board_id: BoardId) -> Result<BoardPlaces, AppError> {
    let board: Board = get_board(client, board_id).await?;
    let query_str = "\
    SELECT
        bp.board_id,
        p.place_id,
        p.place_name,
        p.rule,
        p.place_type,
        bp.place_number,
        bp.start,
        bp.end,
        bp.x,
        bp.y,
        bp.area
    FROM board_places AS bp
    LEFT JOIN places AS p
        ON bp.place_id = p.place_id
    WHERE bp.board_id = $1
    ORDER BY bp.place_number";

    let query = client.query(query_str, &[&board_id]).await?;

    let mut board_places: BoardPlaces = BoardPlaces {
        board,
        places: Vec::with_capacity(query.len()),
    };
    for row in query {
        board_places
            .places
            .push(build_board_place_and_get_connections(client, &row).await?);
    }
    Ok(board_places)
}

/// Retrieves a specific place on a board by place number.
pub async fn get_board_place(
    client: &Client,
    board_id: BoardId,
    place_number: i32,
) -> Result<BoardPlace, AppError> {
    let query_str = "\
    SELECT
        bp.board_id,
        p.place_id,
        p.place_name,
        p.rule,
        p.place_type,
        bp.place_number,
        bp.start,
        bp.end,
        bp.x,
        bp.y,
        bp.area
    FROM board_places AS bp
    LEFT JOIN places AS p
        ON bp.place_id = p.place_id
    WHERE bp.board_id = $1 AND bp.place_number = $2";
    let row = client
        .query_one(query_str, &[&board_id, &place_number])
        .await?;

    build_board_place_and_get_connections(client, &row).await
}

/// Retrieves drinks associated with a place on a board.
pub async fn get_place_drinks(
    client: &Client,
    place_number: i32,
    board_id: BoardId,
) -> Result<PlaceDrinks, AppError> {
    let query_str = "\
    SELECT
        pd.place_number,
        pd.board_id,
        pd.drink_id,
        d.name,
        d.favorite,
        d.no_mix_required,
        pd.refill,
        pd.optional,
        pd.on_table,
        pd.n,
        pd.n_update
    FROM place_drinks AS pd
    LEFT JOIN drinks AS d
        ON d.drink_id = pd.drink_id
    WHERE pd.place_number = $1 AND pd.board_id = $2";

    let query = client.query(query_str, &[&place_number, &board_id]).await?;

    Ok(PlaceDrinks {
        drinks: query
            .into_iter()
            .map(|row| PlaceDrink {
                place_number: row.get("place_number"),
                board_id: row.get("board_id"),
                drink: Drink {
                    id: row.get("drink_id"),
                    name: row.get("name"),
                    favorite: row.get("favorite"),
                    no_mix_required: row.get("no_mix_required"),
                },
                refill: row.get("refill"),
                optional: row.get("optional"),
                on_table: row.get("on_table"),
                n: row.get("n"),
                n_update: row.get("n_update"),
            })
            .collect(),
    })
}

/// Adds drink assignments to a place on a board.
pub async fn set_place_drinks(client: &Client, drinks: PlaceDrinks) -> Result<u64, AppError> {
    // Ensure all drinks belong to the same place and board
    if drinks.drinks.is_empty() {
        return Ok(0);
    }
    if !drinks.drinks.iter().all(|d| {
        d.place_number == drinks.drinks[0].place_number && d.board_id == drinks.drinks[0].board_id
    }) {
        return Err(AppError::Validation(
            "All drinks must belong to the same place and board".to_string(),
        ));
    }

    // Delete existing drinks for the place
    let delete_str = "DELETE FROM place_drinks WHERE place_number = $1 AND board_id = $2";
    client
        .execute(
            delete_str,
            &[&drinks.drinks[0].place_number, &drinks.drinks[0].board_id],
        )
        .await?;

    let query_str = "\
    INSERT INTO place_drinks (drink_id, place_number, board_id, refill, optional, on_table, n, n_update) \
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)";

    for drink in &drinks.drinks {
        client
            .execute(
                query_str,
                &[
                    &drink.drink.id,
                    &drink.place_number,
                    &drink.board_id,
                    &drink.refill,
                    &drink.optional,
                    &drink.on_table,
                    &drink.n,
                    &drink.n_update,
                ],
            )
            .await?;
    }
    Ok(drinks.drinks.len() as u64)
}

/// Retrieves connections from a place to adjacent places.
pub async fn get_board_place_connections(
    client: &Client,
    board_id: BoardId,
    place_number: i32,
) -> Result<Vec<Connection>, AppError> {
    let query_str = "\
    SELECT board_id, origin, target, on_land, backwards, dashed
    FROM place_connections
    WHERE board_id = $1  AND origin = $2
    ORDER BY target";

    let query = client.query(query_str, &[&board_id, &place_number]).await?;
    Ok(query
        .into_iter()
        .map(|row| Connection {
            board_id: row.get("board_id"),
            origin: row.get("origin"),
            target: row.get("target"),
            on_land: row.get("on_land"),
            backwards: row.get("backwards"),
            dashed: row.get("dashed"),
        })
        .collect())
}

/// Creates a new place definition.
pub async fn add_place(client: &Client, place: Place) -> Result<u64, AppError> {
    let query_str = "\
    INSERT INTO places (place_name, rule, place_type) \
    VALUES ($1, $2, $3)";

    Ok(client
        .execute(
            query_str,
            &[&place.place_name, &place.rule, &place.place_type],
        )
        .await?)
}

/// Adds a place to a board at a specific position.
pub async fn add_board_place(
    client: &Client,
    board_id: BoardId,
    place: BoardPlace,
) -> Result<u64, AppError> {
    let query_str = "\
    INSERT INTO board_places (board_id, place_number, place_id, start, \"end\", x, y) \
    VALUES ($1, $2, $3, $4, $5, $6, $7)";

    Ok(client
        .execute(
            query_str,
            &[
                &board_id,
                &place.place_number,
                &place.place.place_id,
                &place.start,
                &place.end,
                &place.x,
                &place.y,
            ],
        )
        .await?)
}

/// Updates the x,y coordinates of a place on a board.
pub async fn update_coordinates(
    client: &Client,
    board_id: BoardId,
    place: &BoardPlace,
) -> Result<u64, AppError> {
    let query_str = "\
    UPDATE board_places SET x = $1, y = $2 WHERE board_id = $3 AND place_number = $4";

    Ok(client
        .execute(
            query_str,
            &[&place.x, &place.y, &board_id, &place.place_number],
        )
        .await?)
}

/// Calculates the destination place for a team based on their dice throw.
pub async fn move_team(client: &Client, place: PlaceThrow) -> Result<BoardPlace, AppError> {
    let board_places: BoardPlaces = get_board_places(client, place.place.board_id).await?;
    let throw: i8 = min(place.throw.0, place.throw.1);

    get_next_place(&place.place, &board_places, throw)
}

/// Moves a team backwards from their current position.
pub async fn move_team_backwards(
    client: &Client,
    current_place: &BoardPlace,
    throw: i8,
) -> Result<BoardPlace, AppError> {
    let board_places = get_board_places(client, current_place.board_id).await?;
    move_backwards(current_place, &board_places, throw, false)
}

/// Selects a connection based on movement direction and terrain type.
fn pick_connection(
    connections: &[Connection],
    backwards_mode: bool,
    on_land: bool,
) -> Option<&Connection> {
    connections
        .iter()
        .find(|c| c.backwards == backwards_mode && c.on_land == on_land)
}

/// Moves a team forward on the board by the given throw amount.
fn move_forwards<'a>(
    mut current_place: &'a BoardPlace,
    board_places: &'a BoardPlaces,
    throw: i8,
) -> Result<BoardPlace, AppError> {
    for step in 0..throw {
        let conns = &current_place.connections.connections;

        if conns.is_empty() {
            tracing::info!("No more connections, stopping movement.");
            break;
        }

        // If there's only one connection and it's backwards, reverse direction for the remaining steps
        // Used at end of board
        if conns.len() == 1 && conns[0].backwards {
            return move_backwards(current_place, board_places, throw - step as i8, true);
        }

        // Pick a forward, non-on-land connection if available
        let chosen = pick_connection(conns, false, false)
            // Otherwise pick a backward, non-on-land connection (when??)
            .or_else(|| conns.iter().find(|c| !c.on_land))
            // Fallback to an on-land connection if no other options (when??)
            .unwrap_or_else(|| conns.first().unwrap());

        let next = board_places
            .find_place(chosen.target)
            .unwrap_or(current_place);

        current_place = next;
        // If the only connection is on_land, stop after taking it
        // Used when returning from Tampere
        if chosen.on_land {
            break;
        }
    }
    // If there are any forward on_land connections in the final resting spot, take the first one
    // Used to go to Tampere and Raide-Jokeri
    let conns = &current_place.connections.connections;
    if conns.iter().any(|c| c.on_land && !c.backwards) {
        let on_land_conn = pick_connection(conns, false, true);
        if let Some(olc) = on_land_conn {
            current_place = board_places.find_place(olc.target).unwrap_or(current_place);
        }
    }
    Ok(current_place.clone())
}

/// Moves a team backward on the board by the given throw amount.
pub fn move_backwards<'a>(
    mut current_place: &'a BoardPlace,
    board_places: &'a BoardPlaces,
    throw: i8,
    bumped: bool,
) -> Result<BoardPlace, AppError> {
    let mut first = true;

    for _ in 0..throw {
        let conns = &current_place.connections.connections;

        let conn = if first && !bumped {
            first = false;
            // When taking the first backwards step, prefer on-land connections
            pick_connection(conns, true, true)
        } else {
            pick_connection(conns, true, false)
        };
        current_place = match conn {
            Some(c) => board_places.find_place(c.target).unwrap_or(current_place),
            None => {
                return Err(AppError::NotFound(
                    "No valid backwards connection found".to_string(),
                ));
            }
        };
    }
    Ok(current_place.clone())
}

/// Determines the next place based on current position and connections.
fn get_next_place<'a>(
    mut current_place: &'a BoardPlace,
    board_places: &'a BoardPlaces,
    throw: i8,
) -> Result<BoardPlace, AppError> {
    // This condition only applies to AYY, but it's handled by dice_ayy now.
    if current_place
        .connections
        .connections
        .iter()
        .any(|c| c.on_land && c.backwards)
    {
        move_backwards(&mut current_place, board_places, throw, false)
    } else {
        move_forwards(&mut current_place, board_places, throw)
    }
}

/// Gets the starting place number for a board.
pub async fn get_first_place(client: &Client, board_id: BoardId) -> Result<i32, AppError> {
    let query_str = "\
    SELECT place_number FROM board_places WHERE board_id = $1 AND start = TRUE";
    let row = client.query_one(query_str, &[&board_id]).await?;
    Ok(row.get(0))
}
