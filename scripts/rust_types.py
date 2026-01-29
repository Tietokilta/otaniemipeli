# AUTO-GENERATED FROM RUST. Edit Rust models instead.
# Found in ./packages/backend/src/utils/types.rs

from dataclasses import dataclass, field
from typing import Optional, Any, Literal
import sys


def _from_dict(cls, data):
    if not isinstance(data, dict):
        return data
    
    init_data = {}
    cls_globals = sys.modules[cls.__module__].__dict__

    for field_name, field_type in cls.__annotations__.items():
        if field_name in data:
            field_value = data[field_name]
            
            # Handle generic types like list, dict, Optional
            origin = getattr(field_type, '__origin__', None)
            if origin:
                if origin is list and isinstance(field_value, list):
                    # Get the type of list elements
                    element_type = field_type.__args__[0]
                    if isinstance(element_type, str):
                        element_type = cls_globals[element_type]
                    init_data[field_name] = [_from_dict(element_type, item) for item in field_value]
                elif origin is dict and isinstance(field_value, dict):
                    key_type, value_type = field_type.__args__
                    if isinstance(key_type, str):
                        key_type = cls_globals[key_type]
                    if isinstance(value_type, str):
                        value_type = cls_globals[value_type]
                    init_data[field_name] = {
                        _from_dict(key_type, k): _from_dict(value_type, v)
                        for k, v in field_value.items()
                    }
                elif origin is Optional:
                    # Get the inner type from Optional[T]
                    inner_type = field_type.__args__[0]
                    if isinstance(inner_type, str):
                        inner_type = cls_globals[inner_type]
                    init_data[field_name] = _from_dict(inner_type, field_value)
                else:
                    init_data[field_name] = field_value
            # Handle dataclasses
            elif hasattr(field_type, '__dataclass_fields__'):
                init_data[field_name] = _from_dict(field_type, field_value)
            else:
                init_data[field_name] = field_value

    return cls(**init_data)

PlaceType = Literal["Normal", "Food", "Sauna", "Special", "Guild"]

UserType = Literal["Admin", "Ie", "Referee", "Secretary"]



@dataclass
class SocketAuth:
    token: str
    @classmethod
    def from_dict(cls, data): return _from_dict(cls, data)


@dataclass
class LoginInfo:
    username: str
    password: str
    @classmethod
    def from_dict(cls, data): return _from_dict(cls, data)


@dataclass
class UserInfo:
    uid: int
    username: str
    email: str
    user_types: 'UsersTypes'
    @classmethod
    def from_dict(cls, data): return _from_dict(cls, data)


@dataclass
class UserCreateInfo:
    username: str
    email: str
    user_type: UserType
    password: str
    @classmethod
    def from_dict(cls, data): return _from_dict(cls, data)


@dataclass
class SessionInfo:
    uid: int
    session_hash: str
    user_types: 'UsersTypes'
    @classmethod
    def from_dict(cls, data): return _from_dict(cls, data)


@dataclass
class UserSessionInfo:
    user: 'UserInfo'
    session: 'SessionInfo'
    @classmethod
    def from_dict(cls, data): return _from_dict(cls, data)


@dataclass
class UsersTypes:
    user_types: list[UserType] = field(default_factory=list)
    @classmethod
    def from_dict(cls, data): return _from_dict(cls, data)


@dataclass
class Team:
    team_id: int
    game_id: int
    team_name: str
    team_hash: str
    current_place_id: int
    double: bool
    @classmethod
    def from_dict(cls, data): return _from_dict(cls, data)


@dataclass
class Teams:
    teams: list['Team'] = field(default_factory=list)
    @classmethod
    def from_dict(cls, data): return _from_dict(cls, data)


@dataclass
class TurnDrink:
    drink: 'Drink'
    turn_id: int
    n: int
    @classmethod
    def from_dict(cls, data): return _from_dict(cls, data)


@dataclass
class TurnDrinks:
    drinks: list['TurnDrink'] = field(default_factory=list)
    @classmethod
    def from_dict(cls, data): return _from_dict(cls, data)


@dataclass
class PostTurnDrinks:
    turn_drinks: 'TurnDrinks'
    game_id: int
    @classmethod
    def from_dict(cls, data): return _from_dict(cls, data)


@dataclass
class FirstTurnPost:
    game_id: int
    drinks: list['TurnDrink'] = field(default_factory=list)
    @classmethod
    def from_dict(cls, data): return _from_dict(cls, data)


@dataclass
class GameData:
    game: 'Game'
    teams: list['GameTeam'] = field(default_factory=list)
    @classmethod
    def from_dict(cls, data): return _from_dict(cls, data)


@dataclass
class GameTeam:
    team: 'Team'
    turns: list['Turn'] = field(default_factory=list)
    location: Optional['BoardPlace'] = None
    @classmethod
    def from_dict(cls, data): return _from_dict(cls, data)


@dataclass
class Turn:
    turn_id: int
    team_id: int
    game_id: int
    start_time: str
    confirmed_at: Optional[str] = None
    mixing_at: Optional[str] = None
    mixed_at: Optional[str] = None
    delivered_at: Optional[str] = None
    end_time: Optional[str] = None
    dice1: int # Non-optional field after optional fields, may require manual adjustment
    dice2: int # Non-optional field after optional fields, may require manual adjustment
    location: Optional[int] = None
    penalty: bool # Non-optional field after optional fields, may require manual adjustment
    drinks: 'TurnDrinks' # Non-optional field after optional fields, may require manual adjustment
    @classmethod
    def from_dict(cls, data): return _from_dict(cls, data)


@dataclass
class Turns:
    turns: list['Turn'] = field(default_factory=list)
    @classmethod
    def from_dict(cls, data): return _from_dict(cls, data)


@dataclass
class PostStartTurn:
    team_id: int
    game_id: int
    dice1: int
    dice2: int
    @classmethod
    def from_dict(cls, data): return _from_dict(cls, data)


@dataclass
class EndTurn:
    team_id: int
    game_id: int
    @classmethod
    def from_dict(cls, data): return _from_dict(cls, data)


@dataclass
class PlaceThrow:
    place: 'BoardPlace'
    throw: tuple[int, int]
    team_id: int
    @classmethod
    def from_dict(cls, data): return _from_dict(cls, data)


@dataclass
class Game:
    id: int
    name: str
    board_id: int
    started: bool
    finished: bool
    start_time: str
    @classmethod
    def from_dict(cls, data): return _from_dict(cls, data)


@dataclass
class PostGame:
    name: str
    board: int
    @classmethod
    def from_dict(cls, data): return _from_dict(cls, data)


@dataclass
class Games:
    games: list['Game'] = field(default_factory=list)
    @classmethod
    def from_dict(cls, data): return _from_dict(cls, data)


@dataclass
class Board:
    id: int
    name: str
    @classmethod
    def from_dict(cls, data): return _from_dict(cls, data)


@dataclass
class Boards:
    boards: list['Board'] = field(default_factory=list)
    @classmethod
    def from_dict(cls, data): return _from_dict(cls, data)


@dataclass
class BoardPlaces:
    board: 'Board'
    places: list['BoardPlace'] = field(default_factory=list)
    @classmethod
    def from_dict(cls, data): return _from_dict(cls, data)


@dataclass
class Place:
    place_id: int
    place_name: str
    rule: str
    place_type: PlaceType
    @classmethod
    def from_dict(cls, data): return _from_dict(cls, data)


@dataclass
class Places:
    places: list['Place'] = field(default_factory=list)
    @classmethod
    def from_dict(cls, data): return _from_dict(cls, data)


@dataclass
class BoardPlace:
    board_id: int
    place: 'Place'
    place_number: int
    start: bool
    area: str
    end: bool
    x: float
    y: float
    connections: 'Connections'
    drinks: 'PlaceDrinks'
    @classmethod
    def from_dict(cls, data): return _from_dict(cls, data)


@dataclass
class PlaceDrinks:
    drinks: list['PlaceDrink'] = field(default_factory=list)
    @classmethod
    def from_dict(cls, data): return _from_dict(cls, data)


@dataclass
class PlaceDrink:
    place_number: int
    board_id: int
    drink: 'Drink'
    refill: bool
    optional: bool
    n: int
    n_update: str
    @classmethod
    def from_dict(cls, data): return _from_dict(cls, data)


@dataclass
class Connection:
    board_id: int
    origin: int
    target: int
    on_land: bool
    backwards: bool
    dashed: bool
    @classmethod
    def from_dict(cls, data): return _from_dict(cls, data)


@dataclass
class Connections:
    connections: list['Connection'] = field(default_factory=list)
    @classmethod
    def from_dict(cls, data): return _from_dict(cls, data)


@dataclass
class Ingredient:
    id: int
    name: str
    abv: float
    carbonated: bool
    @classmethod
    def from_dict(cls, data): return _from_dict(cls, data)


@dataclass
class Ingredients:
    ingredients: list['Ingredient'] = field(default_factory=list)
    @classmethod
    def from_dict(cls, data): return _from_dict(cls, data)


@dataclass
class Drink:
    id: int
    name: str
    @classmethod
    def from_dict(cls, data): return _from_dict(cls, data)


@dataclass
class IngredientQty:
    ingredient: 'Ingredient'
    quantity: float
    @classmethod
    def from_dict(cls, data): return _from_dict(cls, data)


@dataclass
class DrinkIngredients:
    drink: 'Drink'
    quantity: float
    abv: float
    ingredients: list['IngredientQty'] = field(default_factory=list)
    @classmethod
    def from_dict(cls, data): return _from_dict(cls, data)


@dataclass
class DrinkIngredientsPost:
    drink: 'Drink'
    ingredients: list['IngredientQty'] = field(default_factory=list)
    @classmethod
    def from_dict(cls, data): return _from_dict(cls, data)


@dataclass
class DrinksIngredients:
    drink_ingredients: list['DrinkIngredients'] = field(default_factory=list)
    @classmethod
    def from_dict(cls, data): return _from_dict(cls, data)


@dataclass
class ResultIntJson:
    int: int
    @classmethod
    def from_dict(cls, data): return _from_dict(cls, data)


@dataclass
class Drinks:
    drinks: list['Drink'] = field(default_factory=list)
    @classmethod
    def from_dict(cls, data): return _from_dict(cls, data)


@dataclass
class IngredientIdQuery:
    ingredient_id: int
    @classmethod
    def from_dict(cls, data): return _from_dict(cls, data)

