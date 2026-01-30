use crate::database::drinks::get_drinks_ingredients;
use crate::database::games::{get_games, get_team_data};
use crate::database::team::get_teams;
use crate::database::turns::end_turn;
use crate::utils::ids::GameId;
use crate::utils::socket::check_auth;
use crate::utils::state::{AppError, AppState};
use crate::utils::types::{EndTurn, PgError, SocketAuth, Teams, UserType};
use deadpool_postgres::Client;
use serde::Serialize;
use socketioxide::adapter::{Adapter, Emitter};
use socketioxide::extract::{Data, SocketRef, State};
use socketioxide_core::adapter::CoreAdapter;
use std::future::Future;
use std::pin::Pin;

pub(crate) async fn get_db_client(state: &AppState, s: &SocketRef<impl Adapter>) -> Option<Client> {
    match state.db.get().await {
        Ok(c) => Some(c),
        Err(e) => {
            tracing::error!("DB connection error: {}", e);
            if let Err(err) = s.emit("response-error", "Internal Server Error") {
                tracing::error!("Failed replying game data: {err}")
            };
            None
        }
    }
}
pub async fn emit_db_error(s: &SocketRef<impl Adapter>, error: PgError) {
    tracing::error!("{error}");
    if let Err(err) = s.emit("response-error", "Internal Server Error") {
        tracing::error!("Failed replying error message: {err}")
    };
}
pub async fn emit_app_error(s: &SocketRef<impl Adapter>, error: AppError) {
    tracing::error!("{error}");
    if let Err(err) = s.emit("response-error", &format!("{}", error)) {
        tracing::error!("Failed replying error message: {err}")
    };
}
pub async fn emit_msg<T: Serialize>(s: &SocketRef<impl Adapter>, event: &str, payload: &T) {
    if let Err(err) = s.emit(event, &payload) {
        tracing::error!("Failed replying game data: {err}")
    };
}
pub async fn run_emit_fn<T, F>(client: &Client, s: &SocketRef<impl Adapter>, event: &str, db_fn: F)
where
    T: Serialize,
    // HRTB: for any 'a, given &'a Client, you can produce a Future that lives at least 'a
    F: for<'a> Fn(&'a Client) -> Pin<Box<dyn Future<Output = Result<T, PgError>> + Send + 'a>>,
{
    match db_fn(client).await {
        Ok(data) => {
            emit_msg(s, event, &data).await;
        }
        Err(e) => {
            emit_db_error(s, e).await;
        }
    }
}
pub async fn emit_team_data(client: &Client, s: &SocketRef<impl Adapter>, game_id: GameId) -> () {
    match get_team_data(client, game_id).await {
        Ok(data) => {
            emit_msg(s, "reply-game", &data).await;
        }
        Err(e) => {
            emit_db_error(s, e).await;
        }
    }
}

pub async fn emit_teams(client: &Client, s: &SocketRef<impl Adapter>, game_id: GameId) {
    match get_teams(client, game_id).await {
        Ok(teams) => {
            // TODO: The frontend doesn't handle this, but the scripts need it.
            //  Should use reply-game?
            emit_msg(s, "reply-teams", &Teams { teams }).await;
        }
        Err(e) => {
            emit_db_error(s, e).await;
        }
    }
}

pub async fn end_turn_emit(client: &Client, s: &SocketRef<impl Adapter>, et: EndTurn) {
    if let Err(e) = end_turn(&client, &et).await {
        emit_app_error(&s, e).await;
    }
    emit_team_data(&client, &s, et.game_id).await
}
pub async fn get_drinks_handler<A: CoreAdapter<Emitter>>(
    s: SocketRef<A>,
    State(state): State<AppState>,
) {
    tracing::info!("Referee: get-drinks called");
    let client = match get_db_client(&state, &s).await {
        Some(c) => c,
        None => return,
    };
    run_emit_fn(&client, &s, "reply-drinks", |c| {
        Box::pin(async move { get_drinks_ingredients(c).await })
    })
    .await;
}
pub async fn game_data_handler<A: CoreAdapter<Emitter>>(
    s: SocketRef<A>,
    Data(game_id): Data<GameId>,
    State(state): State<AppState>,
) {
    tracing::info!("Referee: game_data called");
    let client = match get_db_client(&state, &s).await {
        Some(c) => c,
        None => return,
    };
    emit_team_data(&client, &s, game_id).await;
}
pub async fn end_turn_handler<A: CoreAdapter<Emitter>>(
    s: SocketRef<A>,
    Data(turn_data): Data<EndTurn>,
    State(state): State<AppState>,
) {
    tracing::info!("Referee: end-turn called");
    let client = match get_db_client(&state, &s).await {
        Some(c) => c,
        None => return,
    };
    end_turn_emit(&client, &s, turn_data).await;
}

pub async fn get_games_handler<A: CoreAdapter<Emitter>>(
    s: SocketRef<A>,
    State(state): State<AppState>,
) {
    tracing::info!("Referee: get-games called");
    let client = match get_db_client(&state, &s).await {
        Some(c) => c,
        None => return,
    };
    run_emit_fn(&client, &s, "reply-games", |c| {
        Box::pin(async move { get_games(c).await })
    })
    .await;
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
    emit_msg(&s, "verification-reply", &auth).await;
    if !auth {
        let _ = s.disconnect();
    }
}
