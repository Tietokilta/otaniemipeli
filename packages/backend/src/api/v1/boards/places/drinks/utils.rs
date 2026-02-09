use crate::database::boards::set_place_drinks;
use crate::utils::errors::wrap_json;
use crate::utils::state::{AppError, AppState};
use crate::utils::types::PlaceDrinks;
use axum::extract::State;
use axum::Json as AxumJson;
use deadpool_postgres::Client;

pub async fn put_place_drinks(
    state: State<AppState>,
    AxumJson(place_drinks): AxumJson<PlaceDrinks>,
) -> Result<AxumJson<u64>, AppError> {
    let client: Client = state.db.get().await?;
    wrap_json(set_place_drinks(&client, place_drinks).await)
}
