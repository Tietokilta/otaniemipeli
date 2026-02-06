use crate::utils::ids::UserId;
use crate::utils::state::AppError;
use crate::utils::types::{LoginInfo, SessionInfo, UserCreateInfo, UserInfo, UserType, UsersTypes};
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
) -> Result<(UserInfo, String), AppError> {
    let query_str = "\
    SELECT \
        u.uid, \
        u.username, \
        u.email, \
        u.password, \
        ut.user_type \
    FROM users as u \
    LEFT JOIN user_types as ut \
        ON u.uid = ut.uid \
    WHERE u.username = $1";

    let mut user: UserInfo = UserInfo {
        uid: UserId(-404),
        username: "NOT FOUND".to_string(),
        email: "NOT.FOUND@tietokilta.fi".to_string(),
        user_types: UsersTypes::new(),
    };

    let rows = client.query(query_str, &[&login_info.username]).await?;
    if rows.is_empty() {
        return Ok((user, "".to_string()));
    }
    match rows[0].clone().try_get::<usize, String>(3) {
        Ok(pw) => {
            if !compare_pw_to_db(login_info.password, pw) {
                return Ok((user, "".to_string()));
            }
        }
        Err(_) => return Ok((user, "".to_string())),
    }
    for row in rows {
        match row.try_get::<usize, i32>(0) {
            Ok(_) => {
                user.uid = row.get(0);
                user.username = row.get(1);
                user.email = row.get(2);
                match row.try_get::<usize, UserType>(4) {
                    Ok(_) => user.user_types.user_types.push(row.get(4)),
                    Err(_) => {}
                }
            }
            Err(_) => continue,
        }
    }
    let session_hash = create_session(user.uid, client)
        .await
        .unwrap_or_else(|_| "".to_string());
    Ok((user, session_hash))
}

/// Creates a new session for a user and returns the session hash.
pub async fn create_session(uid: UserId, client: &Client) -> Result<String, AppError> {
    let query_str = "\
    INSERT INTO sessions (uid, session_hash) \
    SELECT u.uid, $2 \
    FROM users as u \
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
        FROM sessions as s \
         LEFT JOIN user_types as ut ON s.uid = ut.uid \
         WHERE s.session_hash = $1 AND s.expires > now()";

    if let Err(e) = update_session(session_hash, client).await {
        tracing::warn!("{e}");
    }
    let query = client.query(query_str, &[&session_hash]).await?;
    let mut session: SessionInfo = SessionInfo {
        uid: UserId(-404),
        session_hash: "".to_string(),
        user_types: UsersTypes::new(),
    };
    for row in query {
        match row.try_get::<usize, i32>(0) {
            Ok(_) => {
                session.uid = row.get(0);
                session.session_hash = row.get(1);
                session.user_types.push(row.get(2));
                if let Err(e) = row.try_get::<usize, UserType>(2) {
                    tracing::warn!("{e}");
                }
            }
            Err(e) => {
                tracing::warn!("{e}");
                continue;
            }
        }
    }
    Ok(session)
}

/// Deletes a specific session by its hash.
pub async fn delete_session(session_hash: &str, client: &Client) -> Result<u64, AppError> {
    let query_str = "\
    DELETE FROM sessions WHERE session_hash = $1";
    Ok(client.execute(query_str, &[&session_hash]).await?)
}

/// Deletes all sessions for a user.
pub async fn delete_all_sessions(uid: UserId, client: &Client) -> Result<u64, AppError> {
    let query_str = "\
    DELETE FROM sessions WHERE uid = $1";
    Ok(client.execute(query_str, &[&uid]).await?)
}

/// Checks if any users exist in the database.
pub async fn users_exist(client: &Client) -> Result<bool, AppError> {
    let query_str = "\
    SELECT EXISTS (SELECT 1 FROM users)";

    let row = client.query_one(query_str, &[]).await?;

    let exists: bool = row.get(0);
    Ok(exists)
}

/// Checks if an email or username is already taken.
pub async fn email_or_username_exist(
    client: &Client,
    email: &str,
    username: &str,
) -> Result<bool, AppError> {
    let q = "\
    SELECT COUNT(*) AS n \
    FROM users \
    WHERE email = $1 OR username = $2";
    let row = client.query_one(q, &[&email, &username]).await?;
    Ok(row.get::<_, i64>(0) != 0)
}

/// Creates a new user account and returns user info with an active session.
pub async fn user_create(
    client: &Client,
    mut user_info: UserCreateInfo,
) -> Result<(UserInfo, SessionInfo), AppError> {
    let query_str = "\
    INSERT INTO users \
    (username, email, password) values ($1, $2, $3)";
    let original_password = user_info.password.clone();
    user_info.password = hash_password(user_info.password);
    client
        .execute(
            query_str,
            &[&user_info.username, &user_info.email, &user_info.password],
        )
        .await?;
    let user_session = post_login_db(
        LoginInfo {
            username: user_info.username,
            password: original_password,
        },
        client,
    )
    .await?;
    let user = user_session.0;
    let auth = user_session.1;

    let query_str2 = "\
    INSERT INTO user_types (uid, user_type) VALUES ($1, $2)";
    client
        .execute(query_str2, &[&user.uid, &user_info.user_type])
        .await?;
    let session = check_session(&auth, client).await?;
    Ok((user, session))
}
