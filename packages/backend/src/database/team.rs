use crate::utils::ids::{GameId, TeamId};
use crate::utils::state::AppError;
use crate::utils::types::Team;
use deadpool_postgres::Client;

/// Constructs a Team struct from a database row.
pub fn build_team_from_row(row: &tokio_postgres::Row) -> Team {
    Team {
        team_id: row.get("team_id"),
        game_id: row.get("game_id"),
        team_name: row.get("team_name"),
        team_hash: row.get("team_hash"),
        double_tampere: row.get("double_tampere"),
        moral_victory_eligible: row.get("moral_victory_eligible"),
    }
}

/// Creates a new team with a generated hash and returns it.
pub async fn create_team(client: &Client, team: Team) -> Result<Team, AppError> {
    let query_str = "\
    INSERT INTO teams (game_id, team_name, team_hash) VALUES ($1, $2, $3) RETURNING *";
    let hash: String = hex::encode_upper(rand::random::<[u8; 16]>());
    let row = client
        .query_one(query_str, &[&team.game_id, &team.team_name, &hash])
        .await?;
    Ok(build_team_from_row(&row))
}

/// Retrieves all teams for a specific game.
pub async fn get_teams(client: &Client, game_id: GameId) -> Result<Vec<Team>, AppError> {
    let query_str = "\
    SELECT * FROM teams WHERE game_id = $1";
    let rows = client.query(query_str, &[&game_id]).await?;
    Ok(rows.iter().map(|row| build_team_from_row(row)).collect())
}

/// Retrieves a single team by ID.
pub async fn get_team_by_id(client: &Client, team_id: TeamId) -> Result<Team, AppError> {
    let row = client
        .query_one("SELECT * FROM teams WHERE team_id = $1", &[&team_id])
        .await?;
    Ok(build_team_from_row(&row))
}

/// Sets the double Tampere flag for a team.
pub async fn set_team_double_tampere(
    client: &Client,
    team_id: TeamId,
    double_tampere: bool,
) -> Result<(), AppError> {
    let query_str = "\
    UPDATE teams SET double_tampere = $2 WHERE team_id = $1";
    client
        .execute(query_str, &[&team_id, &double_tampere])
        .await?;
    Ok(())
}

/// Sets the moral victory eligible flag for a team.
pub async fn set_team_moral_victory_eligible(
    client: &Client,
    team_id: TeamId,
    moral_victory_eligible: bool,
) -> Result<(), AppError> {
    let query_str = "\
    UPDATE teams SET moral_victory_eligible = $2 WHERE team_id = $1";
    client
        .execute(query_str, &[&team_id, &moral_victory_eligible])
        .await?;
    Ok(())
}
