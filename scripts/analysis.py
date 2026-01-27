import os
import sys
import requests as rq
from matplotlib import pyplot as p
import numpy as np
from rust_types import *


def get_all_games(base_url):
    url = f"{base_url}/api/v1/game_data"
    resp = rq.get(url)
    resp.raise_for_status()
    games_json = resp.json()
    games = [GameData.from_dict(g) for g in games_json]
    return games

def average_turns(games: list[GameData]) -> float:
    total_turns = 0
    for game in games:
        for team in game.teams:
            total_turns += len(team.turns)
    return total_turns / len(games)

def get_drink_by_id(drink_id: int, drinks: PlaceDrinks) -> PlaceDrink:
    for drink in drinks.drinks:
        if str(drink.drink.id) == str(drink_id):
            return drink
    raise ValueError(f"Drink with id {drink_id} not found")

def get_total_drink_amount(games: list[GameData]) -> int:
    drinks_response_json = rq.get("http://localhost:2568/api/v1/drinks/ingredients").json()
    drinks_response = PlaceDrinks.from_dict(drinks_response_json)

    total_drinks = 0
    for game in games:
        for team in game.teams:
            for turn in team.turns:
                for drink_data in turn.drinks["drinks"]:
                    drink_info = get_drink_by_id(drink_data["drink"]["id"], drinks_response)
                    total_drinks += drink_info["amount"] * drink_data["n"]
    return total_drinks

if __name__ == "__main__":

    base_url = f"http://localhost:2568"
    games: list[GameData] = get_all_games(base_url)
    print(f"Fetched {len(games)} games from {base_url}")
    print(average_turns(games))
    get_total_drink_amount(games)
