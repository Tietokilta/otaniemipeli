use crate::utils::ids::{GameId, TeamId};
use crate::utils::types::{PgError, Team};
use deadpool_postgres::Client;

pub fn build_team_from_row(row: &tokio_postgres::Row) -> Team {
    Team {
        team_id: row.get("team_id"),
        game_id: row.get("game_id"),
        team_name: row.get("team_name"),
        team_hash: row.get("team_hash"),
        double: row.get("doubled"),
    }
}

pub async fn create_team(client: &Client, team: Team) -> Result<Team, PgError> {
    let query_str = "\
    INSERT INTO teams (game_id, team_name, team_hash) VALUES ($1, $2, $3) RETURNING *";
    let hash: String = hex::encode_upper(rand::random::<[u8; 16]>());
    let query = client
        .query_one(query_str, &[&team.game_id, &team.team_name, &hash])
        .await;
    query
        .map(|row| build_team_from_row(&row))
        .map_err(|e| PgError::from(e))
}

pub async fn get_teams(client: &Client, game_id: GameId) -> Result<Vec<Team>, PgError> {
    let query_str = "\
    SELECT * FROM teams WHERE game_id = $1";
    let rows = client
        .query(query_str, &[&game_id])
        .await
        .map_err(|e| PgError::from(e))?;
    Ok(rows.iter().map(|row| build_team_from_row(&row)).collect())
}

pub async fn make_team_double(client: &Client, team_id: TeamId) -> Result<(), PgError> {
    let query_str = "\
    UPDATE teams SET doubled = TRUE WHERE team_id = $1";
    client
        .execute(query_str, &[&team_id])
        .await
        .map_err(|e| PgError::from(e))?;
    Ok(())
}

pub async fn make_team_normal(client: &Client, team_id: TeamId) -> Result<(), PgError> {
    let query_str = "\
    UPDATE teams SET doubled = FALSE WHERE team_id = $1";
    client
        .execute(query_str, &[&team_id])
        .await
        .map_err(|e| PgError::from(e))?;
    Ok(())
}
