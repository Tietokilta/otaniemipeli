use crate::database::login::{delete_user, get_users};
use crate::utils::errors::wrap_json;
use crate::utils::ids::UserId;
use crate::utils::state::{AppError, AppState};
use crate::utils::types::{SessionInfo, UserType, UsersPublic};
use axum::extract::{Path, State};
use axum::{Extension, Json};

/// Returns all users without email or password.
pub async fn users_get(state: State<AppState>) -> Result<Json<UsersPublic>, AppError> {
    let client = state.db.get().await?;
    wrap_json(get_users(&client).await.map(|users| UsersPublic { users }))
}

/// Deletes a user by ID. Only admins can delete users.
pub async fn user_delete(
    Path(id): Path<UserId>,
    state: State<AppState>,
    Extension(session): Extension<SessionInfo>,
) -> Result<Json<()>, AppError> {
    if !session.user_types.user_types.contains(&UserType::Admin) {
        return Err(AppError::Unauthorized(
            "Only admins can delete users".to_string(),
        ));
    }

    let client = state.db.get().await?;
    delete_user(&client, id).await?;
    Ok(Json(()))
}
