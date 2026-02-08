use crate::database::login::check_session;
use crate::utils::state::SocketState;
use crate::utils::types::UserType;
use socketioxide::adapter::Adapter;
use socketioxide::extract::SocketRef;

/// Check if the user has any of the allowed user types.
pub async fn check_auth_any<A: Adapter>(
    token: &str,
    s: &SocketRef<A>,
    state: &SocketState,
    allowed_types: &[UserType],
) -> bool {
    let client = match state.db.get().await {
        Ok(c) => c,
        Err(_) => return false,
    };

    match check_session(token, &client).await {
        Ok(session) => {
            let allowed = session
                .user_types
                .user_types
                .iter()
                .any(|t| allowed_types.contains(t));

            if !allowed {
                let _ = s.emit("unauthorized", "invalid user type");
                false
            } else {
                let _ = s.emit("authorized", &session);
                true
            }
        }
        Err(_) => {
            let _ = s.emit("unauthorized", "invalid token");
            false
        }
    }
}
