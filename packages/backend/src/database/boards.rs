use crate::utils::ids::BoardId;
use crate::utils::state::AppError;
use crate::utils::types::{
    Board, BoardPlace, BoardPlaces, Boards, Connection, Connections, Drink, Place, PlaceDrink,
    PlaceDrinks, Places,
};
use deadpool_postgres::Client;
use std::collections::HashMap;
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
            "SELECT place_id, place_name, place_type, rule, special FROM places;",
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
                special: row.get("special"),
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
            special: row.get("special"),
        },
        place_number: row.get("place_number"),
        start: row.get("start"),
        area: row.get("area"),
        end: row.get("end"),
        x: row.get("x"),
        y: row.get("y"),
        connections: Connections {
            forwards: vec![],
            backwards: vec![],
        },
        drinks: PlaceDrinks { drinks: vec![] },
    }
}

/// Builds a BoardPlace from aliased "via_" columns in a query row.
pub fn build_via_board_place(row: &Row, board_id: BoardId) -> BoardPlace {
    BoardPlace {
        board_id,
        place: Place {
            place_id: row.get("via_place_id"),
            place_name: row.get("via_place_name"),
            rule: row.get("via_rule"),
            place_type: row.get("via_place_type"),
            special: row.get("via_special"),
        },
        place_number: row.get("via_number"),
        start: row.get("via_start"),
        area: row.get("via_area"),
        end: row.get("via_end"),
        x: row.get("via_x"),
        y: row.get("via_y"),
        connections: Connections {
            forwards: vec![],
            backwards: vec![],
        },
        drinks: PlaceDrinks { drinks: vec![] },
    }
}

/// Retrieves connections from and to a place, split into forwards and backwards.
///
/// Forward connections have origin = place_number.
/// Backward connections have target = place_number (origin/target are swapped when reading).
pub async fn get_board_place_connections(
    client: &Client,
    board_id: BoardId,
    place_number: i32,
) -> Result<Connections, AppError> {
    let query_str = "\
    SELECT origin, target, on_land, dashed
    FROM place_connections
    WHERE board_id = $1 AND (origin = $2 OR target = $2)
    ORDER BY target";

    let query = client.query(query_str, &[&board_id, &place_number]).await?;

    let mut forwards = Vec::new();
    let mut backwards = Vec::new();
    for row in query {
        let origin: i32 = row.get("origin");
        let target: i32 = row.get("target");
        let on_land: bool = row.get("on_land");
        let dashed: bool = row.get("dashed");

        if origin == place_number {
            forwards.push(Connection {
                board_id,
                origin,
                target,
                on_land,
                dashed,
            });
        }
        if target == place_number {
            backwards.push(Connection {
                board_id,
                origin: target,
                target: origin,
                on_land,
                dashed,
            });
        }
    }

    Ok(Connections {
        forwards,
        backwards,
    })
}

/// Builds a BoardPlace struct from a row and fetches its connections and drinks.
async fn build_board_place_and_get_connections(
    client: &Client,
    row: &Row,
) -> Result<BoardPlace, AppError> {
    let board_id = row.get("board_id");
    let place_number: i32 = row.get("place_number");
    let mut place = build_board_place(row, board_id);
    place.connections = get_board_place_connections(client, board_id, place_number).await?;
    place.drinks = get_place_drinks(client, place_number, board_id).await?;
    Ok(place)
}

/// Retrieves all places on a board with their connections and drinks.
///
/// Fetches all connections for the board in a single query for efficiency.
pub async fn get_board_places(client: &Client, board_id: BoardId) -> Result<BoardPlaces, AppError> {
    let board: Board = get_board(client, board_id).await?;

    let places_query_str = "\
    SELECT
        bp.board_id,
        p.place_id,
        p.place_name,
        p.rule,
        p.place_type,
        p.special,
        bp.place_number,
        bp.start,
        bp.end,
        bp.x,
        bp.y,
        bp.area
    FROM board_places AS bp
    INNER JOIN places AS p
        ON bp.place_id = p.place_id
    WHERE bp.board_id = $1
    ORDER BY bp.place_number";

    let conn_query_str = "\
    SELECT board_id, origin, target, on_land, dashed
    FROM place_connections
    WHERE board_id = $1
    ORDER BY origin, target";

    let places_query = client.query(places_query_str, &[&board_id]).await?;
    let conn_query = client.query(conn_query_str, &[&board_id]).await?;

    // Build a map of place_number -> Connections from all connection rows
    let mut connections_map: HashMap<i32, Connections> = HashMap::new();
    for row in conn_query {
        let origin: i32 = row.get("origin");
        let target: i32 = row.get("target");
        let on_land: bool = row.get("on_land");
        let dashed: bool = row.get("dashed");

        // Forward connection for origin
        connections_map
            .entry(origin)
            .or_insert_with(|| Connections {
                forwards: vec![],
                backwards: vec![],
            })
            .forwards
            .push(Connection {
                board_id,
                origin,
                target,
                on_land,
                dashed,
            });

        // Backward connection for target (swap origin/target)
        connections_map
            .entry(target)
            .or_insert_with(|| Connections {
                forwards: vec![],
                backwards: vec![],
            })
            .backwards
            .push(Connection {
                board_id,
                origin: target,
                target: origin,
                on_land,
                dashed,
            });
    }

    let mut board_places = BoardPlaces {
        board,
        places: Vec::with_capacity(places_query.len()),
    };
    for row in &places_query {
        let place_number: i32 = row.get("place_number");
        let mut place = build_board_place(row, board_id);
        place.connections = connections_map
            .remove(&place_number)
            .unwrap_or(Connections {
                forwards: vec![],
                backwards: vec![],
            });
        place.drinks = get_place_drinks(client, place_number, board_id).await?;
        board_places.places.push(place);
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
        p.special,
        bp.place_number,
        bp.start,
        bp.end,
        bp.x,
        bp.y,
        bp.area
    FROM board_places AS bp
    INNER JOIN places AS p
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
        pd.n
    FROM place_drinks AS pd
    INNER JOIN drinks AS d
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
    INSERT INTO place_drinks (drink_id, place_number, board_id, refill, optional, on_table, n) \
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
                ],
            )
            .await?;
    }
    Ok(drinks.drinks.len() as u64)
}

/// Creates a new place definition.
pub async fn add_place(client: &Client, place: Place) -> Result<u64, AppError> {
    let query_str = "\
    INSERT INTO places (place_name, rule, place_type, special) \
    VALUES ($1, $2, $3, $4)";

    Ok(client
        .execute(
            query_str,
            &[
                &place.place_name,
                &place.rule,
                &place.place_type,
                &place.special,
            ],
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

/// Moves a team forward on the board by the given throw amount.
/// Returns (final_place, via_place) where via_place is set when the team passes through
/// an intermediate place (on_land connection or -D1 special).
/// `backward_throw` is the number of steps to move backwards if landing on a -D1 special.
pub fn move_forwards<'a>(
    mut current_place: &'a BoardPlace,
    board_places: &'a BoardPlaces,
    throw: i8,
    backward_throw: Option<i8>,
) -> Result<(&'a BoardPlace, Option<&'a BoardPlace>), AppError> {
    for step in 0..throw {
        let conns = &current_place.connections;

        enum Choice<'a> {
            Forward(&'a Connection),
            OnLand,
            Backward,
        }

        // Pick a forward, non-on-land connection if available
        let chosen = conns
            .forwards
            .iter()
            .find(|c| !c.on_land)
            .map(|c| Choice::Forward(c))
            // Otherwise, pick a forward, on-land connection if available (e.g. returning from Tampere)
            .or_else(|| conns.forwards.first().map(|_| Choice::OnLand))
            // Otherwise, fall back to a backward non-on-land connection
            // (never traverse on-land backwards connections)
            .or_else(|| {
                conns
                    .backwards
                    .iter()
                    .find(|c| !c.on_land)
                    .map(|_| Choice::Backward)
            });

        match chosen {
            Some(Choice::Backward) => {
                // If there's only a backwards connection, reverse direction for the remaining steps
                // Used at end of board
                current_place = move_backwards(current_place, board_places, throw - step as i8)?;
                break;
            }
            Some(Choice::OnLand) => {
                // If the only forward connection is on_land, stop here
                // The code after the loop will take this connection
                // Used when returning from Tampere
                break;
            }
            Some(Choice::Forward(chosen)) => {
                // Take the chosen forward connection
                current_place = board_places
                    .find_place(chosen.target)
                    .unwrap_or(current_place);
            }
            None => {
                // If there are no connections at all, stop here
                // Should never happen if the board is properly designed
                tracing::info!("No more connections, stopping movement.");
                break;
            }
        }
    }

    // If landing on a -D1 special, move backwards from start position by backward_throw
    if current_place.place.special.as_deref() == Some("-D1") {
        if let Some(bt) = backward_throw {
            let dest = move_backwards(current_place, board_places, bt)?;
            return Ok((dest, Some(current_place)));
        }
    }

    // If there are any forward on_land connections in the final resting spot, take the first one
    // Used to go to Tampere and Raide-Jokeri
    if let Some(on_land) = current_place
        .connections
        .forwards
        .iter()
        .find(|c| c.on_land)
    {
        let dest = board_places
            .find_place(on_land.target)
            .unwrap_or(current_place);
        return Ok((dest, Some(current_place)));
    }

    Ok((current_place, None))
}

/// Moves a team backward on the board by the given throw amount.
pub fn move_backwards<'a>(
    mut current_place: &'a BoardPlace,
    board_places: &'a BoardPlaces,
    throw: i8,
) -> Result<&'a BoardPlace, AppError> {
    for _ in 0..throw {
        // Pick a non-on-land backwards connection if available
        let Some(conn) = &current_place
            .connections
            .backwards
            .iter()
            .find(|c| !c.on_land)
        else {
            return Err(AppError::NotFound(
                "Not enough backwards connections found".to_string(),
            ));
        };
        current_place = board_places
            .find_place(conn.target)
            .unwrap_or(current_place);
    }
    Ok(current_place)
}

/// Gets the starting place number for a board.
pub async fn get_first_place(client: &Client, board_id: BoardId) -> Result<i32, AppError> {
    let query_str = "
    SELECT place_number FROM board_places WHERE board_id = $1 AND start = TRUE";
    let row = client.query_one(query_str, &[&board_id]).await?;
    Ok(row.get(0))
}
