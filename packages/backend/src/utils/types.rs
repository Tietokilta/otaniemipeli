use crate::database::games::place_visited;
use crate::utils::state::AppError;
use chrono::{DateTime, Utc};
use deadpool_postgres::Client;
use serde::{Deserialize, Serialize};
use tokio_postgres::types::{FromSql, ToSql};

pub type PgError = tokio_postgres::error::Error;
#[derive(Clone, Debug, Serialize, Deserialize, ToSql, FromSql)]
#[postgres(name = "placetype")]
#[derive(PartialEq, Eq)]
pub enum PlaceType {
    #[postgres(name = "Normal")]
    Normal,
    #[postgres(name = "Food")]
    Food,
    #[postgres(name = "Sauna")]
    Sauna,
    #[postgres(name = "Special")]
    Special,
    #[postgres(name = "Guild")]
    Guild,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct SocketAuth {
    pub token: String,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct VerifyAck {
    pub ok: bool,
    pub reason: Option<String>,
}
#[derive(Clone, Debug, Serialize, Deserialize, ToSql, FromSql)]
#[postgres(name = "usertype")]
pub enum UserType {
    #[postgres(name = "Admin")]
    Admin,
    #[postgres(name = "Ie")]
    Ie,
    #[postgres(name = "Referee")]
    Referee,
    #[postgres(name = "Secretary")]
    Secretary,
    #[postgres(name = "Team")]
    Team,
}
impl UserType {
    pub fn as_str(&self) -> &str {
        match self {
            UserType::Admin => "Admin",
            UserType::Ie => "Ie",
            UserType::Referee => "Referee",
            UserType::Secretary => "Secretary",
            UserType::Team => "Team",
        }
    }
}
impl PartialEq<UserType> for UserType {
    fn eq(&self, other: &UserType) -> bool {
        self.as_str() == other.as_str()
    }
    fn ne(&self, other: &UserType) -> bool {
        self.as_str() != other.as_str()
    }
}
impl core::fmt::Display for UserType {
    fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
        f.write_str(self.as_str())
    }
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct LoginInfo {
    pub username: String,
    pub password: String,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct UserInfo {
    pub uid: i32,
    pub username: String,
    pub email: String,
    pub user_types: UsersTypes,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct UserCreateInfo {
    pub username: String,
    pub email: String,
    pub user_type: UserType,
    pub password: String,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct SessionInfo {
    pub uid: i32,
    pub session_hash: String,
    pub user_types: UsersTypes,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct UserSessionInfo {
    pub user: UserInfo,
    pub session: SessionInfo,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct UsersTypes {
    pub user_types: Vec<UserType>,
}
impl UsersTypes {
    pub fn new() -> Self {
        Self {
            user_types: Vec::new(),
        }
    }
    pub fn push(&mut self, user_type: UserType) {
        self.user_types.push(user_type);
    }
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Team {
    pub team_id: i32,
    pub game_id: i32,
    pub team_name: String,
    pub team_hash: String,
    pub current_place_id: i32,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Teams {
    pub teams: Vec<Team>,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct TurnDrink {
    pub drink: Drink,
    pub turn_id: i32,
    pub n: i32,
    pub penalty: bool,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct TurnDrinks {
    pub drinks: Vec<TurnDrink>,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct PostTurnDrinks {
    pub turn_drinks: TurnDrinks,
    pub game_id: i32,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct FirstTurnPost {
    pub game_id: i32,
    pub drinks: Vec<TurnDrink>,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct GameData {
    pub game: Game,
    pub teams: Vec<GameTeam>,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct GameTeam {
    pub team: Team,
    pub turns: Vec<Turn>,
    pub location: Option<BoardPlace>,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Turn {
    pub turn_id: i32,
    pub start_time: DateTime<Utc>,
    pub team_id: i32,
    pub game_id: i32,
    pub dice1: i32,
    pub dice2: i32,
    pub location: i32,
    pub finished: bool,
    pub end_time: Option<DateTime<Utc>>,
    pub drinks: TurnDrinks,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Turns {
    pub turns: Vec<Turn>,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct PostStartTurn {
    pub team_id: i32,
    pub game_id: i32,
    pub dice1: i32,
    pub dice2: i32,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct EndTurn {
    pub team_id: i32,
    pub game_id: i32,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct PlaceThrow {
    pub place: BoardPlace,
    pub throw: (i8, i8),
    pub team_id: i32,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Game {
    pub id: i32,
    pub name: String,
    pub board: i32,
    pub started: bool,
    pub finished: bool,
    pub start_time: DateTime<Utc>,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct PostGame {
    pub name: String,
    pub board: i32,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Games {
    pub games: Vec<Game>,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Board {
    pub id: i32,
    pub name: String,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Boards {
    pub boards: Vec<Board>,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct BoardPlaces {
    pub board: Board,
    pub places: Vec<BoardPlace>,
}
impl BoardPlaces {
    pub fn find_place(&self, place_number: i32) -> Option<&BoardPlace> {
        self.places.iter().find(|p| p.place_number == place_number)
    }
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Place {
    pub place_id: i32,
    pub place_name: String,
    pub rule: String,
    pub place_type: PlaceType,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Places {
    pub places: Vec<Place>,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct BoardPlace {
    pub board_id: i32,
    pub place: Place,
    pub place_number: i32,
    pub start: bool,
    pub area: String,
    pub end: bool,
    pub x: f64,
    pub y: f64,
    pub connections: Vec<Connection>,
    pub drinks: PlaceDrinks,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct PlaceDrinks {
    pub drinks: Vec<PlaceDrink>,
}
impl PlaceDrinks {
    pub async fn to_turn_drinks(
        &self,
        client: &Client,
        turn_id: i32,
        game_id: i32,
    ) -> Result<TurnDrinks, AppError> {
        let mut result = Vec::new();
        for pd in &self.drinks {
            if pd.refill {
                result.push(pd);
                continue;
            }
            let visited = place_visited(client, game_id, pd.place_number).await?;

            if !visited {
                result.push(pd);
            }
        }
        let drinks: Vec<TurnDrink> = result.iter().map(|pd| pd.to_turn_drink(turn_id)).collect();
        Ok(TurnDrinks { drinks })
    }
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct PlaceDrink {
    pub place_number: i32,
    pub board_id: i32,
    pub drink: Drink,
    pub refill: bool,
    pub optional: bool,
    pub n: i32,
    pub n_update: String,
}
impl PlaceDrink {
    pub fn to_turn_drink(&self, turn_id: i32) -> TurnDrink {
        TurnDrink {
            drink: self.drink.clone(),
            turn_id,
            n: self.n,
            penalty: false,
        }
    }
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Connection {
    pub board_id: i32,
    pub origin: i32,
    pub target: i32,
    pub on_land: bool,
    pub backwards: bool,
    pub dashed: bool,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Connections {
    pub connections: Vec<Connection>,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Ingredient {
    pub id: i32,
    pub name: String,
    pub abv: f64,
    pub carbonated: bool,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Ingredients {
    pub ingredients: Vec<Ingredient>,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Drink {
    pub id: i32,
    pub name: String,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct IngredientQty {
    pub ingredient: Ingredient,
    pub quantity: f64,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct DrinkIngredients {
    pub drink: Drink,
    pub quantity: f64,
    pub abv: f64,
    pub ingredients: Vec<IngredientQty>,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct DrinkIngredientsPost {
    pub drink: Drink,
    pub ingredients: Vec<IngredientQty>,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct DrinksIngredients {
    pub drink_ingredients: Vec<DrinkIngredients>,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct ResultIntJson {
    pub int: i32,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Drinks {
    pub drinks: Vec<Drink>,
}

#[derive(Deserialize, Debug)]
pub struct IngredientIdQuery {
    pub ingredient_id: i32,
}
