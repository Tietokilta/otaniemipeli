use crate::utils::socket::check_auth_any;
use crate::utils::state::{AppError, SocketState};
use crate::utils::types::{GameData, SocketAuth, UserType};
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
    GameUpdate(GameData),
}

impl ServerResponse {
    fn event_name(&self) -> &'static str {
        match self {
            ServerResponse::Error(_) => "response-error",
            ServerResponse::Verification(_) => "verification-reply",
            ServerResponse::GameUpdate(_) => "game-update",
        }
    }
}

/// Allowed user types for the /referee namespace (used by all authenticated clients).
const ALLOWED_TYPES: &[UserType] = &[
    UserType::Admin,
    UserType::Referee,
    UserType::Ie,
    UserType::Secretary,
];

pub(crate) async fn get_db_client(state: &SocketState) -> Result<Client, AppError> {
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

/// Handles verify-login events.
pub async fn verify_login_handler<A: CoreAdapter<Emitter>>(
    s: SocketRef<A>,
    Data(auth): Data<SocketAuth>,
    State(state): State<SocketState>,
) {
    let auth_result = check_auth_any(&auth.token, &s, &state, ALLOWED_TYPES).await;
    emit_msg(&s, ServerResponse::Verification(auth_result));
    if !auth_result {
        let _ = s.disconnect();
    }
}
