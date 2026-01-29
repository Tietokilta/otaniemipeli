use crate::database::login::*;
use crate::utils::ids::UserId;
use crate::utils::state::{AppError, AppState};
use crate::utils::types::{
    LoginInfo, SessionInfo, UserCreateInfo, UserInfo, UserSessionInfo, UsersTypes,
};
use axum::extract::State;
use axum::http::HeaderMap;
use axum::Json;
use tracing::info;

async fn get_auth(headers: &HeaderMap) -> String {
    match headers.get(http::header::AUTHORIZATION) {
        Some(auth) => auth.to_str().unwrap().to_string(),
        _ => "".to_string(),
    }
}

pub async fn start_session(
    state: State<AppState>,
    Json(login): Json<LoginInfo>,
) -> Result<Json<UserSessionInfo>, AppError> {
    let client = state.db.get().await?;
    match post_login_db(login, &client).await {
        Ok((user, session_hash)) => {
            if user.uid == UserId(-404) && session_hash != "" {
                Err(AppError::Unauthorized("Unauthorized".to_string()))
            } else {
                match check_session(session_hash.as_str(), &client).await {
                    Ok(session) => Ok(Json(UserSessionInfo { user, session })),
                    Err(_) => Err(AppError::Unauthorized("Unauthorized".to_string())),
                }
            }
        }
        Err(e) => {
            eprintln!("{}", e);
            Err(AppError::Database(
                "The server encountered an unexpected error!"
                    .to_string(),
            ))
        }
    }
}
pub async fn verify_session(
    state: State<AppState>,
    headers: HeaderMap,
) -> Result<Json<SessionInfo>, AppError> {
    let client = state.db.get().await?;
    let auth_hash = get_auth(&headers).await;
    if auth_hash == "" {
        return Err(AppError::Unauthorized(
            "There is no authorization header".to_string(),
        ));
    }

    match check_session(auth_hash.as_str(), &client).await {
        Ok(session) => Ok(Json(session)),
        Err(e) => {
            eprintln!("{}", e);
            Err(AppError::Database(
                "The server encountered an unexpected error!"
                    .to_string(),
            ))
        }
    }
}
pub async fn end_session(state: State<AppState>, headers: HeaderMap) -> Result<Json<()>, AppError> {
    let client = state.db.get().await?;
    let auth_hash = get_auth(&headers).await;
    if auth_hash == "" {
        return Err(AppError::Unauthorized(
            "There is no authorization header".to_string(),
        ));
    };

    match delete_session(auth_hash.as_str(), &client).await {
        Ok(_) => Ok(Json(())),
        Err(_) => Err(AppError::Database(
            "The server encountered an unexpected error!"
                .to_string(),
        )),
    }
}
pub async fn end_all_sessions(
    state: State<AppState>,
    headers: HeaderMap,
) -> Result<Json<()>, AppError> {
    let client = state.db.get().await?;
    let auth_hash = get_auth(&headers).await;
    if auth_hash == "" {
        return Err(AppError::Unauthorized(
            "There is no authorization header".to_string(),
        ));
    };
    match check_session(auth_hash.as_str(), &client).await {
        Ok(session) => match delete_all_sessions(session.uid, &client).await {
            Ok(_) => Ok(Json(())),
            Err(_) => Err(AppError::Database(
                "The server encountered an unexpected error!"
                    .to_string(),
            )),
        },
        Err(_) => Err(AppError::Database(
            "The server encountered an unexpected error!"
                .to_string(),
        )),
    }
}
pub async fn exist_users(state: State<AppState>) -> Result<Json<bool>, AppError> {
    let client = state.db.get().await?;
    match users_exist(&client).await {
        Ok(bool) => Ok(Json(bool)),
        Err(_) => Err(AppError::Database(
            "The server encountered an unexpected error!"
                .to_string(),
        )),
    }
}
pub async fn create_user(
    state: State<AppState>,
    headers: HeaderMap,
    Json(user_info): Json<UserCreateInfo>,
) -> Result<Json<UserSessionInfo>, AppError> {
    if user_info.password == "" || user_info.username == "" || user_info.email == "" {
        return Err(AppError::Internal);
    }
    let client = state.db.get().await?;
    let auth_hash = get_auth(&headers).await;
    let user_exist = match users_exist(&client).await {
        Ok(bool) => bool,
        Err(_) => {
            info!("Users exist check failed");
            return Err(AppError::Database(
                "The server encountered an unexpected error!"
                    .to_string(),
            ));
        }
    };
    let exists = email_or_username_exist(&client, &user_info.email, &user_info.username)
        .await
        .map_err(|_| {
            AppError::Database("The server encountered an unexpected error!".to_string())
        })?;

    if exists {
        let msg = format!(
            "There already exists a user with email {} or username {}!",
            user_info.email, user_info.username
        );
        tracing::info!("user exists: {}", msg);
        return Err(AppError::Conflict(msg));
    }
    if !user_exist {
        match user_create(&client, user_info).await {
            Ok((user, session)) => Ok(Json(UserSessionInfo {
                user: UserInfo {
                    uid: user.uid,
                    username: user.username,
                    email: user.email,
                    user_types: session.clone().user_types,
                },
                session,
            })),
            Err(_) => {
                tracing::info!("User create failed!");
                Err(AppError::Database(
                    "The server encountered an unexpected error!"
                        .to_string(),
                ))
            }
        }
    } else if auth_hash != "" {
        let on_session = check_session(&auth_hash, &client).await;
        match on_session {
            Ok(session) => {
                if !session.user_types.user_types.contains(&user_info.user_type) {
                    tracing::info!("user trying to perform does not have the rights");
                    return Err(AppError::Unauthorized(format!(
                        "You are not authorized to create user with type {}!",
                        &user_info.user_type
                    )));
                }
            }
            Err(_) => {
                tracing::info!("check_session failed");
                return Err(AppError::Database(
                    "The server encountered an unexpected error!"
                        .to_string(),
                ));
            }
        };
        return match user_create(&client, user_info).await {
            Ok((user, _)) => {
                tracing::info!(
                    "user created successfully! {} {}",
                    user.username,
                    user.email
                );
                Ok(Json(UserSessionInfo {
                    user,
                    session: SessionInfo {
                        uid: UserId(-1),
                        session_hash: "".to_string(),
                        user_types: UsersTypes {
                            user_types: Vec::new(),
                        },
                    },
                }))
            }
            Err(_) => {
                tracing::info!("User create db_failed");
                Err(AppError::Database(
                    "The server encountered an unexpected error!"
                        .to_string(),
                ))
            }
        };
    } else {
        tracing::info!("Final branch");
        return Err(AppError::Unauthorized(
            "You are not authorized to perform this!".to_string(),
        ));
    }
}
