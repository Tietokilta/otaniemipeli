use crate::database::boards::add_place_drinks;
use crate::utils::errors::wrap_db_error;
use crate::utils::state::{AppError, AppState};
use crate::utils::types::PlaceDrinks;
use axum::extract::State;
use axum::Json as AxumJson;
use deadpool_postgres::Client;

pub async fn post_place_drinks(
    state: State<AppState>,
    AxumJson(place_drinks): AxumJson<PlaceDrinks>,
) -> Result<AxumJson<u64>, AppError> {
    let client: Client = state.db.get().await?;
    wrap_db_error(
        add_place_drinks(&client, place_drinks).await,
        "Error posting place drinks!",
    )
}
