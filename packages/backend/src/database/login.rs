use crate::utils::ids::UserId;
use crate::utils::state::AppError;
use crate::utils::types::{
    LoginInfo, SessionInfo, UserCreateInfo, UserInfo, UserPublic, UserType, UsersTypes,
};
use deadpool_postgres::Client;
use rand::distr::Alphanumeric;
use rand::Rng;
use sha2::{Digest, Sha256};

/// Hashes a password with a random salt using SHA-256.
fn hash_password(pw: String) -> String {
    let salt: String = rand::rng()
        .sample_iter(&Alphanumeric)
        .take(32)
        .map(char::from)
        .collect();
    let pre_hash = format!("{}{}", salt, pw);
    let mut hasher = Sha256::new();
    hasher.update(&pre_hash);
    format!("{salt}{:X}", hasher.finalize())
}

/// Compares a plaintext password against a stored salted hash.
fn compare_pw_to_db(pw_post: String, pw_db: String) -> bool {
    let salt: String = pw_db.chars().take(32).collect();
    let mut hasher = Sha256::new();
    hasher.update(&format!("{salt}{pw_post}"));
    let pw_hash = format!("{salt}{:X}", hasher.finalize());
    pw_hash == pw_db
}

/// Authenticates a user and creates a new session on success.
pub async fn post_login_db(
    login_info: LoginInfo,
    client: &Client,
) -> Result<(UserInfo, SessionInfo), AppError> {
    let query_str = "\
    SELECT \
        u.uid, \
        u.username, \
        u.email, \
        u.password, \
        ut.user_type \
    FROM users AS u \
    LEFT JOIN user_types AS ut \
        ON u.uid = ut.uid \
    WHERE u.username = $1";

    let rows = client.query(query_str, &[&login_info.username]).await?;
    let Some(first) = rows.first() else {
        return Err(AppError::Unauthorized(
            "Invalid username or password".to_string(),
        ));
    };

    if !compare_pw_to_db(login_info.password, first.get("password")) {
        return Err(AppError::Unauthorized(
            "Invalid username or password".to_string(),
        ));
    }

    let uid = first.get("uid");
    let username = first.get("username");
    let email = first.get("email");
    let mut user_types = UsersTypes::new();
    for row in &rows {
        if let Some(ut) = row.get::<_, Option<UserType>>("user_type") {
            user_types.push(ut);
        }
    }

    let session_hash = create_session(uid, client).await?;
    let session = SessionInfo {
        uid,
        session_hash,
        user_types: user_types.clone(),
    };
    let user = UserInfo {
        uid,
        username,
        email,
        user_types,
    };
    Ok((user, session))
}

/// Creates a new session for a user and returns the session hash.
pub async fn create_session(uid: UserId, client: &Client) -> Result<String, AppError> {
    let query_str = "\
    INSERT INTO sessions (uid, session_hash) \
    SELECT u.uid, $2 \
    FROM users AS u \
    WHERE u.uid = $1 \
    RETURNING uid";

    let session_hash = hex::encode_upper(rand::random::<[u8; 32]>());
    client.execute(query_str, &[&uid, &session_hash]).await?;
    Ok(session_hash)
}

/// Extends session expiry and cleans up expired sessions.
pub async fn update_session(session_hash: &str, client: &Client) -> Result<(u64, u64), AppError> {
    let update_query = "\
        UPDATE sessions
        SET last_active = now(),
            expires     = GREATEST(expires, now() + interval '1 hour')
        WHERE session_hash = $1";

    let delete_query = "DELETE FROM sessions WHERE expires <= now()";

    let delete = client.execute(delete_query, &[]).await?;
    let update = client.execute(update_query, &[&session_hash]).await?;

    Ok((update, delete))
}

/// Validates a session and returns session info if valid.
pub async fn check_session(session_hash: &str, client: &Client) -> Result<SessionInfo, AppError> {
    let query_str = "\
    SELECT \
        s.uid, \
        s.session_hash, \
        ut.user_type \
    FROM sessions AS s \
    LEFT JOIN user_types AS ut ON s.uid = ut.uid \
    WHERE s.session_hash = $1 AND s.expires > now()";

    if let Err(e) = update_session(session_hash, client).await {
        tracing::warn!("{e}");
    }

    let rows = client.query(query_str, &[&session_hash]).await?;
    let Some(first) = rows.first() else {
        return Err(AppError::Unauthorized(
            "Invalid or expired session".to_string(),
        ));
    };

    let uid = first.get("uid");
    let session_hash = first.get("session_hash");
    let mut user_types = UsersTypes::new();
    for row in &rows {
        if let Some(ut) = row.get::<_, Option<UserType>>("user_type") {
            user_types.push(ut);
        }
    }

    Ok(SessionInfo {
        uid,
        session_hash,
        user_types,
    })
}

/// Deletes a specific session by its hash.
pub async fn delete_session(session_hash: &str, client: &Client) -> Result<(), AppError> {
    let query_str = "\
    DELETE FROM sessions WHERE session_hash = $1";
    client.execute(query_str, &[&session_hash]).await?;
    Ok(())
}

/// Deletes all sessions for a user.
pub async fn delete_all_sessions(uid: UserId, client: &Client) -> Result<(), AppError> {
    let query_str = "\
    DELETE FROM sessions WHERE uid = $1";
    client.execute(query_str, &[&uid]).await?;
    Ok(())
}

/// Checks if any users exist in the database.
pub async fn users_exist(client: &Client) -> Result<bool, AppError> {
    let row = client.query_opt("SELECT 1 FROM users LIMIT 1", &[]).await?;
    Ok(row.is_some())
}

/// Returns all users with their types (excludes email and password).
pub async fn get_users(client: &Client) -> Result<Vec<UserPublic>, AppError> {
    let query_str = "
    SELECT u.uid, u.username, ut.user_type
    FROM users AS u
    LEFT JOIN user_types AS ut ON u.uid = ut.uid
    ORDER BY u.uid";

    let rows = client.query(query_str, &[]).await?;
    let mut users: Vec<UserPublic> = Vec::new();
    for row in rows {
        let uid: UserId = row.get("uid");
        let username: String = row.get("username");
        let user_type: Option<UserType> = row.get("user_type");

        if let Some(existing) = users.iter_mut().find(|u| u.uid == uid) {
            if let Some(ut) = user_type {
                existing.user_types.push(ut);
            }
        } else {
            let mut user_types = UsersTypes::new();
            if let Some(ut) = user_type {
                user_types.push(ut);
            }
            users.push(UserPublic {
                uid,
                username,
                user_types,
            });
        }
    }
    Ok(users)
}

/// Deletes a user by their ID.
pub async fn delete_user(client: &Client, uid: UserId) -> Result<u64, AppError> {
    let query_str = "DELETE FROM users WHERE uid = $1";
    Ok(client.execute(query_str, &[&uid]).await?)
}

/// Creates a new user account and returns user info with an active session.
pub async fn user_create(
    client: &Client,
    user_info: UserCreateInfo,
) -> Result<(UserInfo, SessionInfo), AppError> {
    let hashed = hash_password(user_info.password.clone());
    let user = client
        .query_one(
            "INSERT INTO users (username, email, password)
            VALUES ($1, $2, $3)
            RETURNING *",
            &[&user_info.username, &user_info.email, &hashed],
        )
        .await?;

    // The trg_grant_lower_privs trigger will auto-add any lower privilege user types,
    // so we only need to add the explicitly requested user type here.
    client
        .execute(
            "INSERT INTO user_types (uid, user_type) VALUES ($1, $2)",
            &[&user.get::<_, UserId>("uid"), &user_info.user_type],
        )
        .await?;

    let (user, session) = post_login_db(
        LoginInfo {
            username: user_info.username,
            password: user_info.password,
        },
        client,
    )
    .await?;

    Ok((user, session))
}
