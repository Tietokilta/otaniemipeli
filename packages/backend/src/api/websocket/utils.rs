use crate::utils::socket::check_auth;
use crate::utils::state::{AppError, AppState};
use crate::utils::types::{SocketAuth, UserType};
use deadpool_postgres::Client;
use serde::Serialize;
use socketioxide::adapter::{Adapter, Emitter};
use socketioxide::extract::{Data, SocketRef, State};
use socketioxide_core::adapter::CoreAdapter;

/// Server-to-client websocket responses with typed payloads.
#[derive(Serialize)]
#[serde(untagged)]
pub enum ServerResponse {
    Error(String),
    Verification(bool),
}

impl ServerResponse {
    fn event_name(&self) -> &'static str {
        match self {
            ServerResponse::Error(_) => "response-error",
            ServerResponse::Verification(_) => "verification-reply",
        }
    }
}

pub(crate) async fn get_db_client(state: &AppState) -> Result<Client, AppError> {
    Ok(state.db.get().await?)
}

pub fn emit_app_error(s: &SocketRef<impl Adapter>, error: AppError) {
    tracing::error!("{error}");
    emit_msg(s, ServerResponse::Error(format!("{error}")));
}

pub fn emit_msg(s: &SocketRef<impl Adapter>, response: ServerResponse) {
    let event = response.event_name();
    if let Err(err) = s.emit(event, &response) {
        tracing::error!("Failed emitting {event}: {err}")
    };
}

pub async fn verify_login_handler<A: CoreAdapter<Emitter>>(
    s: SocketRef<A>,
    Data(auth): Data<SocketAuth>,
    State(state): State<AppState>,
) {
    tracing::info!("Socket namespace: {}", s.ns());
    let u_type: UserType = match s.ns() {
        "/admin" => UserType::Admin,
        "/referee" => UserType::Referee,
        "/secretary" => UserType::Secretary,
        "/ie" => UserType::Ie,
        _ => {
            let _ = s.disconnect();
            return;
        }
    };
    let auth = check_auth(&auth.token, &s, &state, u_type).await;
    tracing::info!("{}: Connection verified: {}", s.ns(), auth);
    emit_msg(&s, ServerResponse::Verification(auth));
    if !auth {
        let _ = s.disconnect();
    }
}
