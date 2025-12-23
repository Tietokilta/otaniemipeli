use crate::utils::types::{PgError, Team};
use deadpool_postgres::Client;

pub async fn create_team(client: &Client, team: Team) -> Result<Team, PgError> {
    let query_str = "\
    INSERT INTO teams (game_id, team_name, team_hash) VALUES ($1, $2, $3) RETURNING *";
    let hash: String = hex::encode_upper(rand::random::<[u8; 16]>());
    let query = client
        .query_one(query_str, &[&team.game_id, &team.team_name, &hash])
        .await;
    match query {
        Ok(row) => {
            let team = Team {
                team_id: row.get(0),
                game_id: row.get(1),
                team_name: row.get(2),
                team_hash: row.get(3),
            };
            Ok(team)
        }
        Err(e) => Err(PgError::from(e)),
    }
}
pub async fn get_teams(client: &Client, game_id: i32) -> Result<Vec<Team>, PgError> {
    let query_str = "\
    SELECT * FROM teams WHERE game_id = $1";
    let query = client.query(query_str, &[&game_id]).await;
    match query {
        Ok(rows) => {
            let teams: Vec<Team> = rows
                .iter()
                .map(|row| Team {
                    team_id: row.get(0),
                    game_id: row.get(1),
                    team_name: row.get(2),
                    team_hash: row.get(3),
                })
                .collect();
            Ok(teams)
        }
        Err(e) => Err(PgError::from(e)),
    }
}
