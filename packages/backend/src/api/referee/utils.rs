use std::fmt::format;
use crate::database::games::get_team_data;
use crate::database::team::get_teams;
use crate::database::turns::end_turn;
use crate::utils::state::{AppError, AppState};
use crate::utils::types::{EndTurn, PgError, Teams};
use deadpool_postgres::Client;
use serde::Serialize;
use socketioxide::adapter::Adapter;
use socketioxide::extract::SocketRef;
use std::future::Future;
use std::pin::Pin;

pub(crate) async fn get_db_client(state: &AppState, s: &SocketRef<impl Adapter>) -> Option<Client> {
    match state.db.get().await {
        Ok(c) => Some(c),
        Err(e) => {
            tracing::error!("DB connection error: {}", e);
            if let Err(err) = s.emit("response-error", "Internal Server Error") {
                tracing::error!("Failed replying game data: {err}")
            };
            None
        }
    }
}
pub async fn emit_db_error(s: &SocketRef<impl Adapter>, error: PgError) {
    tracing::error!("{error}");
    if let Err(err) = s.emit("response-error", "Internal Server Error") {
        tracing::error!("Failed replying error message: {err}")
    };
}
pub async fn emit_app_error(s: &SocketRef<impl Adapter>, error: AppError) {
    tracing::error!("{error}");
    if let Err(err) = s.emit("response-error", &format!("{}", error)) {
        tracing::error!("Failed replying error message: {err}")
    };
}
pub async fn emit_msg<T: Serialize>(s: &SocketRef<impl Adapter>, event: &str, payload: &T) {
    if let Err(err) = s.emit(event, &payload) {
        tracing::error!("Failed replying game data: {err}")
    };
}
pub async fn run_emit_fn<T, F>(client: &Client, s: &SocketRef<impl Adapter>, event: &str, db_fn: F)
where
    T: Serialize,
    // HRTB: for any 'a, given &'a Client, you can produce a Future that lives at least 'a
    F: for<'a> Fn(&'a Client) -> Pin<Box<dyn Future<Output = Result<T, PgError>> + Send + 'a>>,
{
    match db_fn(client).await {
        Ok(data) => {
            emit_msg(s, event, &data).await;
        }
        Err(e) => {
            emit_db_error(s, e).await;
        }
    }
}
pub async fn emit_team_data(client: &Client, s: &SocketRef<impl Adapter>, game_id: i32) -> () {
    match get_team_data(client, game_id).await {
        Ok(data) => {
            emit_msg(s, "reply-game", &data).await;
        }
        Err(e) => {
            emit_db_error(s, e).await;
        }
    }
}

pub async fn emit_teams(client: &Client, s: &SocketRef<impl Adapter>, game_id: i32) {
    match get_teams(client, game_id).await {
        Ok(teams) => {
            emit_msg(s, "reply-teams", &Teams { teams }).await;
        }
        Err(e) => {
            emit_db_error(s, e).await;
        }
    }
}

pub async fn end_turn_emit(client: &Client, s: &SocketRef<impl Adapter>, et: EndTurn) {
    if let Err(e) = end_turn(&client, &et).await {
        emit_app_error(&s, e).await;
    }
    emit_team_data(&client, &s, et.game_id).await
}
