use crate::database::login::*;
use crate::utils::state::{AppError, AppState};
use crate::utils::types::{LoginInfo, SessionInfo, UserCreateInfo, UserSessionInfo};
use axum::extract::State;
use axum::Json;

/// Logs in a user and returns a new session.
pub async fn start_session(
    state: State<AppState>,
    Json(login): Json<LoginInfo>,
) -> Result<Json<UserSessionInfo>, AppError> {
    let client = state.db.get().await?;
    let (user, session) = post_login_db(login, &client).await?;
    Ok(Json(UserSessionInfo { user, session }))
}

/// Verifies the current session is valid.
pub async fn verify_session(session: SessionInfo) -> Result<Json<SessionInfo>, AppError> {
    Ok(Json(session))
}

/// Ends the current session.
pub async fn end_session(
    state: State<AppState>,
    session: SessionInfo,
) -> Result<Json<()>, AppError> {
    let client = state.db.get().await?;
    delete_session(&session.session_hash, &client).await?;
    Ok(Json(()))
}

/// Ends all sessions for the current user.
pub async fn end_all_sessions(
    state: State<AppState>,
    session: SessionInfo,
) -> Result<Json<()>, AppError> {
    let client = state.db.get().await?;
    delete_all_sessions(session.uid, &client).await?;
    Ok(Json(()))
}

/// Checks whether any users exist in the database.
pub async fn exist_users(state: State<AppState>) -> Result<Json<bool>, AppError> {
    let client = state.db.get().await?;
    Ok(Json(users_exist(&client).await?))
}

/// Creates a new user account. The first user can be created without auth;
/// subsequent users require a session with sufficient permissions.
pub async fn create_user(
    state: State<AppState>,
    session: Option<SessionInfo>,
    Json(user_info): Json<UserCreateInfo>,
) -> Result<Json<UserSessionInfo>, AppError> {
    if user_info.password.is_empty() || user_info.username.is_empty() || user_info.email.is_empty()
    {
        return Err(AppError::Validation("missing parameters".to_string()));
    }

    let client = state.db.get().await?;
    let any_users = users_exist(&client).await?;
    println!("any users? {any_users}");

    if any_users {
        // Require a valid session with the right permissions
        let session = session.ok_or_else(|| {
            AppError::Unauthorized("You are not authorized to perform this!".to_string())
        })?;

        if !session.user_types.user_types.contains(&user_info.user_type) {
            return Err(AppError::Unauthorized(format!(
                "You are not authorized to create user with type {}!",
                &user_info.user_type
            )));
        }

        let (user, session) = user_create(&client, user_info).await?;
        tracing::info!(
            "user created successfully! {} {}",
            user.username,
            user.email
        );

        Ok(Json(UserSessionInfo { user, session }))
    } else {
        // First user — no auth required
        let (user, session) = user_create(&client, user_info).await?;

        Ok(Json(UserSessionInfo { user, session }))
    }
}
