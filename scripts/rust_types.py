# AUTO-GENERATED FROM RUST. Edit Rust models instead.
# Found in ./packages/backend/src/utils/types.rs

from dataclasses import dataclass, field
from typing import Optional, Any, Literal, Union
import sys


def _resolve_type(field_type, cls_globals):
    """Resolve a type that might be a string forward reference."""
    if isinstance(field_type, str):
        return cls_globals.get(field_type, field_type)
    return field_type


def _from_dict[T](cls: type[T], data: Any) -> T:
    """Recursively convert a dict to a dataclass instance."""
    if data is None:
        return None
    if not isinstance(data, dict):
        return data
    if not hasattr(cls, '__dataclass_fields__'):
        return data

    init_data = {}
    cls_globals = sys.modules[cls.__module__].__dict__

    for field_name, field_type in cls.__annotations__.items():
        if field_name not in data:
            continue

        field_value = data[field_name]

        # Handle None values early
        if field_value is None:
            init_data[field_name] = None
            continue

        # Resolve forward references
        resolved_type = _resolve_type(field_type, cls_globals)

        # Handle generic types like list, dict, Optional, Union
        origin = getattr(resolved_type, '__origin__', None)

        if origin is not None:
            args = getattr(resolved_type, '__args__', ())

            # Handle list[T]
            if origin is list and isinstance(field_value, list):
                if args:
                    element_type = _resolve_type(args[0], cls_globals)
                    init_data[field_name] = [_from_dict(element_type, item) for item in field_value]
                else:
                    init_data[field_name] = field_value

            # Handle dict[K, V]
            elif origin is dict and isinstance(field_value, dict):
                if len(args) >= 2:
                    key_type = _resolve_type(args[0], cls_globals)
                    value_type = _resolve_type(args[1], cls_globals)
                    init_data[field_name] = {
                        _from_dict(key_type, k): _from_dict(value_type, v)
                        for k, v in field_value.items()
                    }
                else:
                    init_data[field_name] = field_value

            # Handle Optional[T] (Union[T, None])
            elif origin is Union:
                # Find the non-None type in the Union
                non_none_types = [t for t in args if t is not type(None)]
                if non_none_types:
                    inner_type = _resolve_type(non_none_types[0], cls_globals)
                    init_data[field_name] = _from_dict(inner_type, field_value)
                else:
                    init_data[field_name] = field_value

            # Handle tuple
            elif origin is tuple and isinstance(field_value, (list, tuple)):
                if args:
                    init_data[field_name] = tuple(
                        _from_dict(_resolve_type(args[i] if i < len(args) else args[-1], cls_globals), v)
                        for i, v in enumerate(field_value)
                    )
                else:
                    init_data[field_name] = tuple(field_value)
            else:
                init_data[field_name] = field_value

        # Handle dataclasses
        elif hasattr(resolved_type, '__dataclass_fields__'):
            init_data[field_name] = _from_dict(resolved_type, field_value)
        else:
            init_data[field_name] = field_value

    return cls(**init_data)

PlaceType = Literal["Normal", "Food", "Sauna", "Special", "Guild"]

UserType = Literal["Admin", "Ie", "Referee", "Secretary"]



@dataclass
class SocketAuth:
    token: str
    @classmethod
    def from_dict(cls, data: Any): return _from_dict(cls, data)


@dataclass
class LoginInfo:
    username: str
    password: str
    @classmethod
    def from_dict(cls, data: Any): return _from_dict(cls, data)


@dataclass
class UserInfo:
    uid: int
    username: str
    email: str
    user_types: 'UsersTypes'
    @classmethod
    def from_dict(cls, data: Any): return _from_dict(cls, data)


@dataclass
class UserCreateInfo:
    username: str
    email: str
    user_type: UserType
    password: str
    @classmethod
    def from_dict(cls, data: Any): return _from_dict(cls, data)


@dataclass
class SessionInfo:
    uid: int
    session_hash: str
    user_types: 'UsersTypes'
    @classmethod
    def from_dict(cls, data: Any): return _from_dict(cls, data)


@dataclass
class UserSessionInfo:
    user: 'UserInfo'
    session: 'SessionInfo'
    @classmethod
    def from_dict(cls, data: Any): return _from_dict(cls, data)


@dataclass
class UsersTypes:
    user_types: list[UserType] = field(default_factory=list[UserType])
    @classmethod
    def from_dict(cls, data: Any): return _from_dict(cls, data)


@dataclass
class Team:
    team_id: int
    game_id: int
    team_name: str
    team_hash: str
    double: bool
    @classmethod
    def from_dict(cls, data: Any): return _from_dict(cls, data)


@dataclass
class Teams:
    teams: list['Team'] = field(default_factory=list['Team'])
    @classmethod
    def from_dict(cls, data: Any): return _from_dict(cls, data)


@dataclass
class TurnDrink:
    drink: 'Drink'
    turn_id: int
    n: int
    @classmethod
    def from_dict(cls, data: Any): return _from_dict(cls, data)


@dataclass
class TurnDrinks:
    drinks: list['TurnDrink'] = field(default_factory=list['TurnDrink'])
    @classmethod
    def from_dict(cls, data: Any): return _from_dict(cls, data)


@dataclass
class PostTurnDrinks:
    turn_drinks: 'TurnDrinks'
    game_id: int
    @classmethod
    def from_dict(cls, data: Any): return _from_dict(cls, data)


@dataclass
class FirstTurnPost:
    game_id: int
    drinks: list['TurnDrink'] = field(default_factory=list['TurnDrink'])
    @classmethod
    def from_dict(cls, data: Any): return _from_dict(cls, data)


@dataclass
class GameData:
    game: 'Game'
    teams: list['GameTeam'] = field(default_factory=list['GameTeam'])
    @classmethod
    def from_dict(cls, data: Any): return _from_dict(cls, data)


@dataclass
class GameTeam:
    team: 'Team'
    turns: list['Turn'] = field(default_factory=list['Turn'])
    location: Optional['BoardPlace'] = None
    @classmethod
    def from_dict(cls, data: Any): return _from_dict(cls, data)


@dataclass
class Turn:
    turn_id: int
    team_id: int
    game_id: int
    start_time: str
    penalty: bool
    drinks: 'TurnDrinks'
    confirmed_at: Optional[str] = None
    mixing_at: Optional[str] = None
    mixed_at: Optional[str] = None
    delivered_at: Optional[str] = None
    end_time: Optional[str] = None
    dice1: Optional[int] = None
    dice2: Optional[int] = None
    location: Optional[int] = None
    @classmethod
    def from_dict(cls, data: Any): return _from_dict(cls, data)


@dataclass
class PostStartTurn:
    team_id: int
    game_id: int
    dice1: int
    dice2: int
    @classmethod
    def from_dict(cls, data: Any): return _from_dict(cls, data)


@dataclass
class EndTurn:
    team_id: int
    game_id: int
    @classmethod
    def from_dict(cls, data: Any): return _from_dict(cls, data)


@dataclass
class PlaceThrow:
    place: 'BoardPlace'
    throw: tuple[int, int]
    team_id: int
    @classmethod
    def from_dict(cls, data: Any): return _from_dict(cls, data)


@dataclass
class Game:
    id: int
    name: str
    board: 'Board'
    started: bool
    finished: bool
    start_time: str
    @classmethod
    def from_dict(cls, data: Any): return _from_dict(cls, data)


@dataclass
class PostGame:
    name: str
    board: int
    @classmethod
    def from_dict(cls, data: Any): return _from_dict(cls, data)


@dataclass
class Games:
    games: list['Game'] = field(default_factory=list['Game'])
    @classmethod
    def from_dict(cls, data: Any): return _from_dict(cls, data)


@dataclass
class Board:
    id: int
    name: str
    @classmethod
    def from_dict(cls, data: Any): return _from_dict(cls, data)


@dataclass
class Boards:
    boards: list['Board'] = field(default_factory=list['Board'])
    @classmethod
    def from_dict(cls, data: Any): return _from_dict(cls, data)


@dataclass
class BoardPlaces:
    board: 'Board'
    places: list['BoardPlace'] = field(default_factory=list['BoardPlace'])
    @classmethod
    def from_dict(cls, data: Any): return _from_dict(cls, data)


@dataclass
class Place:
    place_id: int
    place_name: str
    rule: str
    place_type: PlaceType
    @classmethod
    def from_dict(cls, data: Any): return _from_dict(cls, data)


@dataclass
class Places:
    places: list['Place'] = field(default_factory=list['Place'])
    @classmethod
    def from_dict(cls, data: Any): return _from_dict(cls, data)


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
    def from_dict(cls, data: Any): return _from_dict(cls, data)


@dataclass
class PlaceDrinks:
    drinks: list['PlaceDrink'] = field(default_factory=list['PlaceDrink'])
    @classmethod
    def from_dict(cls, data: Any): return _from_dict(cls, data)


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
    def from_dict(cls, data: Any): return _from_dict(cls, data)


@dataclass
class Connection:
    board_id: int
    origin: int
    target: int
    on_land: bool
    backwards: bool
    dashed: bool
    @classmethod
    def from_dict(cls, data: Any): return _from_dict(cls, data)


@dataclass
class Connections:
    connections: list['Connection'] = field(default_factory=list['Connection'])
    @classmethod
    def from_dict(cls, data: Any): return _from_dict(cls, data)


@dataclass
class Ingredient:
    id: int
    name: str
    abv: float
    carbonated: bool
    @classmethod
    def from_dict(cls, data: Any): return _from_dict(cls, data)


@dataclass
class Ingredients:
    ingredients: list['Ingredient'] = field(default_factory=list['Ingredient'])
    @classmethod
    def from_dict(cls, data: Any): return _from_dict(cls, data)


@dataclass
class Drink:
    id: int
    name: str
    @classmethod
    def from_dict(cls, data: Any): return _from_dict(cls, data)


@dataclass
class IngredientQty:
    ingredient: 'Ingredient'
    quantity: float
    @classmethod
    def from_dict(cls, data: Any): return _from_dict(cls, data)


@dataclass
class DrinkIngredients:
    drink: 'Drink'
    quantity: float
    abv: float
    ingredients: list['IngredientQty'] = field(default_factory=list['IngredientQty'])
    @classmethod
    def from_dict(cls, data: Any): return _from_dict(cls, data)


@dataclass
class DrinkIngredientsPost:
    drink: 'Drink'
    ingredients: list['IngredientQty'] = field(default_factory=list['IngredientQty'])
    @classmethod
    def from_dict(cls, data: Any): return _from_dict(cls, data)


@dataclass
class DrinksIngredients:
    drink_ingredients: list['DrinkIngredients'] = field(default_factory=list['DrinkIngredients'])
    @classmethod
    def from_dict(cls, data: Any): return _from_dict(cls, data)


@dataclass
class ResultIntJson:
    int: int
    @classmethod
    def from_dict(cls, data: Any): return _from_dict(cls, data)


@dataclass
class Drinks:
    drinks: list['Drink'] = field(default_factory=list['Drink'])
    @classmethod
    def from_dict(cls, data: Any): return _from_dict(cls, data)


@dataclass
class IngredientIdQuery:
    ingredient_id: int
    @classmethod
    def from_dict(cls, data: Any): return _from_dict(cls, data)

