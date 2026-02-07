// AUTO-GENERATED FROM RUST. Edit Rust models instead.
// Found in ./packages/backend/utils/types.rs

declare global {
  type PlaceType = "Normal" | "Food" | "Sauna" | "Special" | "Guild";

  type UserType = "Admin" | "Ie" | "Referee" | "Secretary";

  type WithNameAndId = { id: string | number; name: string };

  interface HeaderItem {
    text: string;
    href: string;
  }

  interface SocketAuth {
    token: string;
  }

  interface LoginInfo {
    username: string;
    password: string;
  }

  interface UserInfo {
    uid: number;
    username: string;
    email: string;
    user_types: UsersTypes;
  }

  interface UserCreateInfo {
    username: string;
    email: string;
    user_type: UserType;
    password: string;
  }

  interface SessionInfo {
    uid: number;
    session_hash: string;
    user_types: UsersTypes;
  }

  interface UserSessionInfo {
    user: UserInfo;
    session: SessionInfo;
  }

  interface UsersTypes {
    user_types: UserType[];
  }

  interface Team {
    team_id: number;
    game_id: number;
    team_name: string;
    team_hash: string;
    double_tampere: boolean;
  }

  interface TurnDrink {
    drink: Drink;
    n: number;
  }

  interface TurnDrinks {
    drinks: TurnDrink[];
  }

  interface FirstTurnPost {
    game_id: number;
    drinks: TurnDrink[];
  }

  interface GameData {
    game: Game;
    teams: GameTeam[];
  }

  interface GameTeam {
    team: Team;
    turns: Turn[];
    location: BoardPlace | null;
  }

  interface TeamLatestTurn {
    team: Team;
    latest_turn: Turn | null;
    location: BoardPlace | null;
  }

  interface Turn {
    turn_id: number;
    team_id: number;
    game_id: number;
    start_time: string;
    thrown_at: string | null;
    confirmed_at: string | null;
    mixing_at: string | null;
    mixed_at: string | null;
    delivered_at: string | null;
    end_time: string | null;
    dice1: number | null;
    dice2: number | null;
    location: number | null;
    penalty: boolean;
    drinks: TurnDrinks;
  }

  interface PostStartTurn {
    team_id: number;
    game_id: number;
    dice1: number | null;
    dice2: number | null;
    penalty: boolean;
  }

  interface ChangeDice {
    turn_id: number;
    game_id: number;
    dice1: number;
    dice2: number;
  }

  interface CancelTurn {
    turn_id: number;
    game_id: number;
  }

  interface ConfirmTurn {
    turn_id: number;
    game_id: number;
    drinks: TurnDrinks;
  }

  interface EndTurn {
    team_id: number;
    game_id: number;
  }

  interface PlaceThrow {
    place: BoardPlace;
    throw: [number, number];
    team_id: number;
  }

  interface Game {
    id: number;
    name: string;
    board: Board;
    started: boolean;
    finished: boolean;
    start_time: string;
  }

  interface PostGame {
    name: string;
    board: number;
  }

  interface Games {
    games: Game[];
  }

  interface Board {
    id: number;
    name: string;
  }

  interface Boards {
    boards: Board[];
  }

  interface BoardPlaces {
    board: Board;
    places: BoardPlace[];
  }

  interface Place {
    place_id: number;
    place_name: string;
    rule: string;
    place_type: PlaceType;
  }

  interface Places {
    places: Place[];
  }

  interface BoardPlace {
    board_id: number;
    place: Place;
    place_number: number;
    start: boolean;
    area: string;
    end: boolean;
    x: number;
    y: number;
    connections: Connections;
    drinks: PlaceDrinks;
  }

  interface PlaceDrinks {
    drinks: PlaceDrink[];
  }

  interface PlaceDrink {
    place_number: number;
    board_id: number;
    drink: Drink;
    refill: boolean;
    optional: boolean;
    n: number;
    n_update: string;
  }

  interface Connection {
    board_id: number;
    origin: number;
    target: number;
    on_land: boolean;
    backwards: boolean;
    dashed: boolean;
  }

  interface Connections {
    connections: Connection[];
  }

  interface Ingredient {
    id: number;
    name: string;
    abv: number;
    carbonated: boolean;
  }

  interface Ingredients {
    ingredients: Ingredient[];
  }

  interface Drink {
    id: number;
    name: string;
    favorite: boolean;
    no_mix_required: boolean;
  }

  interface IngredientQty {
    ingredient: Ingredient;
    quantity: number;
  }

  interface DrinkIngredients {
    drink: Drink;
    quantity: number;
    abv: number;
    ingredients: IngredientQty[];
  }

  interface DrinkIngredientsPost {
    drink: Drink;
    ingredients: IngredientQty[];
  }

  interface DrinksIngredients {
    drink_ingredients: DrinkIngredients[];
  }

  interface ResultIntJson {
    int: number;
  }

  interface Drinks {
    drinks: Drink[];
  }

  interface IngredientIdQuery {
    ingredient_id: number;
  }

}

export {};
