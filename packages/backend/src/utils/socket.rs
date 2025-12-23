use crate::database::login::check_session;
use crate::utils::state::AppState;
use crate::utils::types::UserType;
use socketioxide::adapter::Adapter;
use socketioxide::extract::SocketRef;

pub async fn check_auth<A: Adapter>(
    token: &str,
    s: &SocketRef<A>,
    state: &AppState,
    user_type: UserType,
) -> bool {
    let client = match state.db.get().await {
        Ok(c) => c,
        Err(e) => {
            tracing::error!("db pool error: {e}");
            return false;
        }
    };

    match check_session(token, &client).await {
        Ok(session) => {
            let allowed = session
                .user_types
                .user_types
                .iter()
                .any(|t| t == &user_type);

            if !allowed {
                tracing::warn!(
                    "auth failed for socket {}: invalid user type {:?}",
                    s.id,
                    session.user_types.user_types
                );
                if let Err(e) = s.emit("unauthorized", "invalid user type") {
                    tracing::warn!("failed emit unauthorized to {}: {e}", s.id);
                }
                false
            } else {
                if let Err(e) = s.emit("authorized", &session) {
                    tracing::warn!("failed emit authorized to {}: {e}", s.id);
                }

                true
            }
        }
        Err(e) => {
            eprintln!("auth failed for socket {}: {e}", s.id);
            if let Err(e) = s.emit("unauthorized", "invalid token") {
                tracing::warn!("failed emit authorized to {}: {e}", s.id);
            }
            false
        }
    }
}
