use crate::utils::state::AppState;
use deadpool_postgres::Client;
use socketioxide::adapter::Adapter;
use socketioxide::extract::SocketRef;

pub(crate) async fn get_db_client(state: &AppState, s: &SocketRef<impl Adapter>) -> Option<Client> {
    match state.db.get().await {
        Ok(c) => Some(c),
        Err(e) => {
            if let Err(err) = s.emit("response-error", &format!("db pool error: {e}")) {
                tracing::error!("Failed replying game data: {err}")
            };
            None
        }
    }
}
