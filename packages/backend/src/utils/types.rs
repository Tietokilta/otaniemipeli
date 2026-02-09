use std::cmp::min;

use crate::utils::ids::{BoardId, DrinkId, GameId, IngredientId, PlaceId, TeamId, TurnId, UserId};
use chrono::{DateTime, Utc};
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
}

impl UserType {
    pub fn as_str(&self) -> &str {
        match self {
            UserType::Admin => "Admin",
            UserType::Ie => "Ie",
            UserType::Referee => "Referee",
            UserType::Secretary => "Secretary",
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
    pub uid: UserId,
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
    pub uid: UserId,
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
    pub team_id: TeamId,
    pub game_id: GameId,
    pub team_name: String,
    pub team_hash: String,
    // TODO: store elsewhere?
    pub double_tampere: bool,
    pub moral_victory_eligible: bool,
}

/// Request body for creating or updating a team's name.
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct TeamNameUpdate {
    pub team_name: String,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct TurnDrink {
    pub drink: Drink,
    pub n: i32,
    /// what number of this drink was picked up from the table and doesn't require IE involvement
    pub on_table: i32,
    /// whether an assistant referee should do manual work to this drink; not used after confirming the turn
    pub optional: bool,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct TurnDrinks {
    pub drinks: Vec<TurnDrink>,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct FirstTurnPost {
    pub game_id: GameId,
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

/// Lightweight version of GameTeam with only the latest turn
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct TeamLatestTurn {
    pub team: Team,
    pub latest_turn: Option<Turn>,
    pub location: Option<BoardPlace>,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Turn {
    pub turn_id: TurnId,
    pub team_id: TeamId,
    pub game_id: GameId,
    /// when "give turn" OR "give penalty" clicked (including game start penalty)
    pub start_time: DateTime<Utc>,
    /// when dice were thrown (= confirmed_at if penalty turn)
    pub thrown_at: Option<DateTime<Utc>>,
    /// when dice throw and square results were confirmed by referee, or penalty confirmed
    pub confirmed_at: Option<DateTime<Utc>>,
    /// when IE started making the drink (= confirmed_at if no drinks awarded)
    pub mixing_at: Option<DateTime<Utc>>,
    /// when IE finished the drink (= confirmed_at if no drinks awarded)
    pub mixed_at: Option<DateTime<Utc>>,
    /// when the drink was delivered to the players (= confirmed_at if no drinks awarded)
    pub delivered_at: Option<DateTime<Utc>>,
    /// when hands were raised by the players
    pub end_time: Option<DateTime<Utc>>,
    /// dice number 1 (if thrown)
    pub dice1: Option<i32>,
    /// dice number 2 (if thrown)
    pub dice2: Option<i32>,
    /// dice for backwards movement when landing on AYY
    pub dice_ayy: Option<i32>,
    /// where the player ended up (if dice thrown) - this is place_number, not PlaceId
    pub location: Option<i32>,
    /// whether this is a penalty turn (no dice thrown)
    pub penalty: bool,
    pub drinks: TurnDrinks,
    /// the board place this turn ended on (if location is set)
    pub place: Option<BoardPlace>,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct PostStartTurn {
    pub team_id: TeamId,
    pub game_id: GameId,
    /// If None, turn is started without dice (thrown_at not set)
    pub dice1: Option<i32>,
    /// If None, turn is started without dice (thrown_at not set)
    pub dice2: Option<i32>,
    /// Dice for backwards movement when landing on AYY
    pub dice_ayy: Option<i32>,
    /// Whether this is a penalty turn
    #[serde(default)]
    pub penalty: bool,
}

/// Request body for PUT /turns/{turn_id}/dice
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct ChangeDiceBody {
    pub dice1: i32,
    pub dice2: i32,
    pub dice_ayy: Option<i32>,
}

/// Request body for POST /turns/{turn_id}/confirm and /turns/{turn_id}/penalty
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct ConfirmTurnBody {
    pub drinks: TurnDrinks,
}

/// Status of drink preparation for a turn
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum DrinkPrepStatus {
    Queued,
    Mixing,
    Mixed,
    Delivered,
}

/// Request body for PUT /turns/{turn_id}/prep-status
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct SetDrinkPrepStatusBody {
    pub status: DrinkPrepStatus,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct PlaceThrow {
    pub place: BoardPlace,
    pub throw: (i8, i8),
    pub team_id: TeamId,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Game {
    pub id: GameId,
    pub name: String,
    pub board: Board,
    pub started: bool,
    pub finished: bool,
    pub start_time: DateTime<Utc>,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct PostGame {
    pub name: String,
    pub board: BoardId,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Games {
    pub games: Vec<Game>,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Board {
    pub id: BoardId,
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
    pub place_id: PlaceId,
    pub place_name: String,
    pub rule: String,
    pub place_type: PlaceType,
    pub special: Option<String>,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Places {
    pub places: Vec<Place>,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct BoardPlace {
    pub board_id: BoardId,
    pub place: Place,
    pub place_number: i32, // This is the position on the board, not a PlaceId
    pub start: bool,
    pub area: String,
    pub end: bool,
    pub x: f64,
    pub y: f64,
    pub connections: Connections,
    pub drinks: PlaceDrinks,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct PlaceDrinks {
    pub drinks: Vec<PlaceDrink>,
}

impl PlaceDrinks {
    pub fn to_turn_drinks(&self, visited: bool, multiplier: i32) -> TurnDrinks {
        TurnDrinks {
            drinks: self
                .drinks
                .iter()
                .filter(|pd| pd.refill || !visited)
                .map(|pd| pd.to_turn_drink(multiplier))
                .collect(),
        }
    }
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct PlaceDrink {
    pub place_number: i32, // Position on board, not PlaceId
    pub board_id: BoardId,
    pub drink: Drink,
    pub refill: bool,
    /// whether an assistant referee should do manual work to this drink; not used after confirming the turn
    pub optional: bool,
    /// whether this drink is already on the table and doesn't require IE involvement
    pub on_table: bool,
    pub n: i32,
}

impl PlaceDrink {
    pub fn to_turn_drink(&self, multiplier: i32) -> TurnDrink {
        let n = self.n * multiplier;
        TurnDrink {
            drink: self.drink.clone(),
            n,
            on_table: if self.on_table { min(n, self.n) } else { 0 },
            optional: self.optional,
        }
    }
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Connection {
    pub board_id: BoardId,
    pub origin: i32, // place_number, not PlaceId
    pub target: i32, // place_number, not PlaceId
    /// Used for various purposes:
    /// - !on_land && !backwards: normal connection
    /// - on_land && !backwards:
    ///     - connection that is automatically taken when landing on the origin
    ///     - if only an on_land connection is available, it ends the movement (returning from Tampere)
    /// - on_land && backwards
    ///     - indicates that starting from the target, the player moves backwards by default
    ///       (for moves starting from AYY, except we've effectively replaced this by dice_ayy)
    ///     - this combo is also required for starting backwards moves
    /// - !on_land && backwards
    ///     - connection that is only taken when already moving backwards
    ///     - may also be taken if no forward non-on-land connections are available
    pub on_land: bool,
    /// Whether this connection goes backwards
    pub backwards: bool,
    pub dashed: bool,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Connections {
    pub connections: Vec<Connection>,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Ingredient {
    pub id: IngredientId,
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
    pub id: DrinkId,
    pub name: String,
    pub favorite: bool,
    pub no_mix_required: bool,
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
    pub ingredient_id: IngredientId,
}
