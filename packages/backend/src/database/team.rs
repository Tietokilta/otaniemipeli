use crate::utils::ids::{GameId, TeamId};
use crate::utils::types::{PgError, Team};
use deadpool_postgres::Client;

pub fn build_team_from_row(row: &tokio_postgres::Row) -> Team {
    Team {
        team_id: row.get("team_id"),
        game_id: row.get("game_id"),
        team_name: row.get("team_name"),
        team_hash: row.get("team_hash"),
        double_tampere: row.get("double_tampere"),
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

pub async fn set_team_double_tampere(
    client: &Client,
    team_id: TeamId,
    double_tampere: bool,
) -> Result<(), PgError> {
    let query_str = "\
    UPDATE teams SET double_tampere = $2 WHERE team_id = $1";
    client
        .execute(query_str, &[&team_id, &double_tampere])
        .await
        .map_err(|e| PgError::from(e))?;
    Ok(())
}
