#!/usr/bin/env python3
"""simulateTurns.py

Referee simulator:
- logs in via HTTP to get token
- connects to Socket.IO namespace "/referee"
- creates a new game
- creates 4 teams with arbitrary names
- starts the game
- simulates turns by calling "start-turn" then "end-turn"

Deps:
  pip install "python-socketio[client]" requests

Example:
  python simulateTurns.py --base-url http://localhost:2568 --turns 10
"""

from __future__ import annotations

import argparse
import json
import random
import sys
import threading
import time
from dataclasses import dataclass
from datetime import datetime
from threading import Event, Lock
from typing import Any, Optional, Tuple

import requests as rq
import socketio


REF_NS = "/referee"
# Global lock to prevent race conditions when multiple threads interact with the same game state.
# This ensures that only one thread can modify a turn at a time.
TURN_LOCK = Lock()


@dataclass
class WaitResult:
    name: str
    payload: Any


class WaitAny:
    """Wait for next event among a small set."""

    def __init__(self) -> None:
        self._ev = Event()
        self._lock = Lock()
        self._last: Optional[WaitResult] = None

    def push(self, name: str, payload: Any) -> None:
        with self._lock:
            # In a multi-threaded scenario, a waiter might be pushed to before
            # the previous result was consumed. We only store the last one.
            self._last = WaitResult(name, payload)
            self._ev.set()

    def wait(self, timeout: float) -> Optional[WaitResult]:
        if not self._ev.wait(timeout):
            return None
        with self._lock:
            res = self._last
            self._last = None
            self._ev.clear()
            return res


def login_token(base_url: str, auth_json_path: str) -> str:
    with open(auth_json_path, "r", encoding="utf-8") as f:
        auth_data = json.load(f)

    username = auth_data["username"]
    password = auth_data["password"]

    resp = rq.post(
        f"{base_url}/login",
        json={"username": username, "password": password},
        timeout=20,
    )
    resp.raise_for_status()
    data = resp.json()

    token = data["session"]["session_hash"]
    if not token:
        raise RuntimeError(f"Login ok but token missing in response keys={list(data.keys())}")
    return token


def wait_or_raise(waiter: WaitAny, timeout: float, *, context: str) -> WaitResult:
    res = waiter.wait(timeout)
    if res is None:
        raise TimeoutError(f"timeout waiting for server response ({context})")
    if res.name == "response-error":
        raise RuntimeError(f"server response-error ({context}): {res.payload!r}")
    return res


def get_all_teams(reply_game_payload: Any) -> list[dict]:
    if not isinstance(reply_game_payload, dict):
        raise RuntimeError("reply-game payload not a dict")
    teams = reply_game_payload.get("teams")
    if not teams:
        raise RuntimeError("No teams in reply-game payload")
    return teams


def get_team_id(team_entry: dict) -> int:
    """Extract team_id from either Team or GameTeam shape."""
    team_id = team_entry.get("team_id")
    if team_id is None:
        team_id = team_entry.get("team", {}).get("team_id")
    if team_id is None:
        team_id = team_entry.get("team", {}).get("id")
    if team_id is None:
        raise RuntimeError("cant find team_id in team object")
    return int(team_id)


def has_open_turn(team_entry: dict) -> bool:
    turns = team_entry.get("turns") or []
    return any((not t.get("finished", True)) for t in turns)


def start_turn(
    sio: socketio.Client,
    waiter: WaitAny,
    game_id: int,
    team_id: int,
    timeout: float,
    dice: Optional[Tuple[int, int]] = None,
) -> dict:
    if dice is None:
        dice = (random.randint(1, 6), random.randint(1, 6))

    d1, d2 = dice
    start_payload = {"game_id": int(game_id), "team_id": int(team_id), "dice1": d1, "dice2": d2}

    print(f"  start-turn team_id={team_id} dice=({d1},{d2})")
    sio.emit("start-turn", start_payload, namespace=REF_NS)

    res = wait_or_raise(waiter, timeout, context="start-turn")
    if res.name != "reply-game":
        raise RuntimeError(f"unexpected event after start-turn: {res.name}")
    print("  reply-game (after start-turn)")
    return res.payload


def end_turn(
    sio: socketio.Client,
    waiter: WaitAny,
    game_id: int,
    team_id: int,
    timeout: float,
) -> dict:
    end_payload = {"game_id": int(game_id), "team_id": int(team_id)}
    print(f"  end-turn team_id={team_id}")
    sio.emit("end-turn", end_payload, namespace=REF_NS)

    res = wait_or_raise(waiter, timeout, context="end-turn")
    if res.name != "reply-game":
        raise RuntimeError(f"unexpected event after end-turn: {res.name}")
    print("  reply-game (after end-turn)")
    return res.payload


def create_game(sio: socketio.Client, waiter: WaitAny, timeout: float, *, name: str, board: int) -> int:
    sio.emit("create-game", {"name": name, "board": int(board)}, namespace=REF_NS)

    # create-game first emits "response" (game) and then "reply-games". We only need the id.
    res = wait_or_raise(waiter, timeout, context="create-game")

    game = res.payload
    if not isinstance(game, dict) or "id" not in game:
        raise RuntimeError(f"create-game response missing game id: {game!r}")
    return int(game["id"])


def create_team(
    sio: socketio.Client,
    waiter: WaitAny,
    timeout: float,
    *,
    game_id: int,
    team_name: str,
) -> None:
    # Team struct requires these fields, but backend create_team() will assign team_id/hash/current_place.
    payload = {
        "team_id": 0,
        "game_id": int(game_id),
        "team_name": team_name,
        "team_hash": "",
        "current_place_id": 0,
        "double": False,
    }
    sio.emit("create-team", payload, namespace=REF_NS)

    # The backend may send other events like 'reply-games' before 'reply-teams'.
    # We need to wait until we get the event we are looking for.
    while True:
        res = wait_or_raise(waiter, timeout, context=f"create-team ({team_name})")
        if res.name == "reply-teams":
            break
        else:
            print(f"  ...ignoring event {res.name} while waiting for reply-teams")


def start_game(
    sio: socketio.Client,
    waiter: WaitAny,
    timeout: float,
    *,
    game_id: int,
) -> None:
    # Backend expects FirstTurnPost { game_id, drinks }. Many setups accept empty.
    sio.emit("start-game", {"game_id": int(game_id), "drinks": []}, namespace=REF_NS)
    res = wait_or_raise(waiter, timeout, context="start-game")
    if res.name != "reply-game":
        raise RuntimeError(f"unexpected event after start-game: {res.name}")


def fetch_game_data(sio: socketio.Client, waiter: WaitAny, timeout: float, *, game_id: int) -> dict:
    sio.emit("game-data", int(game_id), namespace=REF_NS)
    res = wait_or_raise(waiter, timeout, context="game_data")
    if res.name != "reply-game":
        raise RuntimeError(f"unexpected event after game_data: {res.name}")
    if not isinstance(res.payload, dict):
        raise RuntimeError("reply-game payload not a dict")
    return res.payload


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base-url", default="http://localhost:2568", help="ex: http://localhost:2568")
    ap.add_argument("--auth-json", default="./scripts/auth.json", help="path to auth.json with username/password")
    ap.add_argument("--turns", type=int, default=500)
    ap.add_argument("--timeout", type=float, default=10.0)
    ap.add_argument("--delay", type=float, default=0.15)
    ap.add_argument("--seed", type=int, default=None)
    ap.add_argument("--verbose", action="store_true")
    ap.add_argument("--fixed-dice", default=None, help='optional fixed dice like "3,5" (no spaces)')
    ap.add_argument("--sleep", action="store_true", help="sleep random 1-10s between turns")
    ap.add_argument("--board", type=int, default=1, help="board id for the newly created game")
    ap.add_argument("--teams", type=int, default=8, help="how many teams to create")
    ap.add_argument("--game-name", default=None, help="optional explicit game name")
    ap.add_argument("--threads", type=int, default=1, help="number of simulations to run in parallel")
    ap.add_argument(
        "--finish",
        action="store_true",
        help="if set, find all unfinished games and play them to the end",
    )
    ap.add_argument(
        "--start-all",
        action="store_true",
        help="if set, find all unstarted games and start them",
    )
    args = ap.parse_args()

    if args.start_all:
        return start_all_unstarted_games(args)

    if args.finish:
        return play_all_unfinished_games(args)

    if args.threads > 1:
        threads = []
        for i in range(args.threads):
            print(f"Starting simulation thread {i+1}/{args.threads}")
            thread = threading.Thread(target=run_simulation, args=(args,))
            threads.append(thread)
            thread.start()
            time.sleep(0.5)  # Stagger start times slightly

        for thread in threads:
            thread.join()

        return 0
    else:
        return run_simulation(args)


def run_simulation(args: argparse.Namespace) -> int:
    if args.seed is not None:
        # Make each thread have a different seed
        random.seed(args.seed + threading.get_ident())

    token = login_token(args.base_url, args.auth_json)

    sio = socketio.Client(
        logger=args.verbose,
        engineio_logger=args.verbose,
        reconnection=False,
    )
    waiter = WaitAny()

    @sio.event(namespace=REF_NS)
    def connect():
        print("connected to /referee")

    @sio.event(namespace=REF_NS)
    def disconnect():
        print("disconnected")

    @sio.on("reply-games", namespace=REF_NS)
    def on_reply_games(data):
        waiter.push("reply-games", data)

    @sio.on("reply-game", namespace=REF_NS)
    def on_reply_game(data):
        waiter.push("reply-game", data)

    @sio.on("reply-teams", namespace=REF_NS)
    def on_reply_teams(data):
        waiter.push("reply-teams", data)

    @sio.on("response-error", namespace=REF_NS)
    def on_response_error(data):
        waiter.push("response-error", data)

    sio.connect(
        args.base_url,
        namespaces=[REF_NS],
        transports=["websocket", "polling"],
        auth={"token": token},
    )

    time.sleep(args.delay)

    game_name = args.game_name or f"sim-{datetime.now().strftime('%Y%m%d-%H%M%S')}-{threading.get_ident()}"
    print(f"Creating game name={game_name!r} board={args.board}")
    game_id = create_game(sio, waiter, args.timeout, name=game_name, board=args.board)
    print(f"Created game_id={game_id}")

    for i in range(args.teams):
        team_name = f"Team {i+1}"
        print(f"Creating team {team_name!r}")
        create_team(sio, waiter, args.timeout, game_id=game_id, team_name=team_name)

    print("Starting game")
    start_game(sio, waiter, args.timeout, game_id=game_id)

    fixed_dice: Optional[Tuple[int, int]] = None
    if args.fixed_dice:
        parts = args.fixed_dice.split(",")
        if len(parts) != 2:
            print('bad --fixed-dice format, expected "x,y"', file=sys.stderr)
            return 2
        fixed_dice = (int(parts[0]), int(parts[1]))

    n = 0
    while n < args.turns:
        print(f"\nTurn {n+1}/{args.turns}")

        try:
            game_data = fetch_game_data(sio, waiter, args.timeout, game_id=game_id)
            finished = bool(game_data.get("game", {}).get("finished"))
            if finished:
                print("Game finished")
                break

            teams = get_all_teams(game_data)
            team_entry = random.choice(teams)
            team_id = get_team_id(team_entry)

            if args.sleep:
                time.sleep(random.randrange(1, 10))

            # Acquire a lock to prevent other threads from starting/ending a turn
            # for any team in this game at the same time. This avoids race conditions
            # where two threads might try to end the same turn.
            with TURN_LOCK:
                # Re-fetch game data inside the lock to get the most up-to-date state
                # before making a decision.
                current_game_data = fetch_game_data(sio, waiter, args.timeout, game_id=game_id)
                current_teams = get_all_teams(current_game_data)

                # Find the same team we chose earlier in the latest game data
                team_entry = next((t for t in current_teams if get_team_id(t) == team_id), None)

                if team_entry:
                    # If a team already has an open turn, end it; otherwise start a new one.
                    if has_open_turn(team_entry):
                        end_turn(sio, waiter, game_id, team_id, args.timeout)
                    else:
                        start_turn(sio, waiter, game_id, team_id, args.timeout, dice=fixed_dice)

        except Exception as e:
            print(f"stop on error: {e}", file=sys.stderr)
            break

        n += 1
        time.sleep(args.delay)

    sio.disconnect()
    return 0


def play_all_unfinished_games(args: argparse.Namespace) -> int:
    """Fetches all games and runs simulations for unfinished ones."""
    token = login_token(args.base_url, args.auth_json)
    sio = socketio.Client(
        logger=args.verbose,
        engineio_logger=args.verbose,
        reconnection=False,
    )
    waiter = WaitAny()

    @sio.event(namespace=REF_NS)
    def connect():
        print("connected to /referee to fetch games")

    @sio.on("reply-games", namespace=REF_NS)
    def on_reply_games(data):
        waiter.push("reply-games", data)

    @sio.on("response-error", namespace=REF_NS)
    def on_response_error(data):
        waiter.push("response-error", data)

    sio.connect(
        args.base_url,
        namespaces=[REF_NS],
        transports=["websocket", "polling"],
        auth={"token": token},
    )
    time.sleep(args.delay)

    print("Fetching all games...")
    sio.emit("get-games", namespace=REF_NS)
    res = wait_or_raise(waiter, args.timeout, context="get-games")
    sio.disconnect()

    games = res.payload.get("games", [])
    unfinished_games = [g for g in games if g.get("started") and not g.get("finished")]

    if not unfinished_games:
        print("No unfinished games found.")
        return 0

    print(f"Found {len(unfinished_games)} unfinished games to simulate.")

    threads = []
    for game in unfinished_games:
        game_id = game["id"]
        print(f"Starting simulation for game_id={game_id}")
        # Create a copy of args and set the game_id for this thread
        thread_args = argparse.Namespace(**vars(args))
        thread_args.game_id = game_id
        thread = threading.Thread(target=simulate_existing_game, args=(thread_args,))
        threads.append(thread)
        thread.start()
        time.sleep(0.5)

    for thread in threads:
        thread.join()

    return 0


def start_all_unstarted_games(args: argparse.Namespace) -> int:
    """Fetches all games and starts the unstarted ones."""
    token = login_token(args.base_url, args.auth_json)
    sio = socketio.Client(
        logger=args.verbose,
        engineio_logger=args.verbose,
        reconnection=False,
    )
    waiter = WaitAny()

    @sio.event(namespace=REF_NS)
    def connect():
        print("connected to /referee to fetch games")

    @sio.on("reply-games", namespace=REF_NS)
    def on_reply_games(data):
        waiter.push("reply-games", data)

    @sio.on("response-error", namespace=REF_NS)
    def on_response_error(data):
        waiter.push("response-error", data)

    sio.connect(
        args.base_url,
        namespaces=[REF_NS],
        transports=["websocket", "polling"],
        auth={"token": token},
    )
    time.sleep(args.delay)

    print("Fetching all games...")
    sio.emit("get-games", namespace=REF_NS)
    res = wait_or_raise(waiter, args.timeout, context="get-games")
    sio.disconnect()

    games = res.payload.get("games", [])
    unstarted_games = [g for g in games if not g.get("started")]

    if not unstarted_games:
        print("No unstarted games found.")
        return 0

    print(f"Found {len(unstarted_games)} unstarted games to start.")

    threads = []
    for game in unstarted_games:
        game_id = game["id"]
        print(f"Starting game_id={game_id}")
        # Create a copy of args and set the game_id for this thread
        thread_args = argparse.Namespace(**vars(args))
        thread_args.game_id = game_id
        thread = threading.Thread(target=start_existing_game, args=(thread_args,))
        threads.append(thread)
        thread.start()
        time.sleep(0.5)

    for thread in threads:
        thread.join()

    return 0


def simulate_existing_game(args: argparse.Namespace) -> int:
    """Connects and simulates a single existing game until it's finished."""
    if not hasattr(args, "game_id"):
        print("Error: game_id missing for simulate_existing_game", file=sys.stderr)
        return 1

    token = login_token(args.base_url, args.auth_json)
    sio = socketio.Client(
        logger=args.verbose,
        engineio_logger=args.verbose,
        reconnection=False,
    )
    waiter = WaitAny()

    @sio.event(namespace=REF_NS)
    def connect():
        print(f"[{args.game_id}] connected to /referee")

    @sio.event(namespace=REF_NS)
    def disconnect():
        print(f"[{args.game_id}] disconnected")

    @sio.on("reply-game", namespace=REF_NS)
    def on_reply_game(data):
        waiter.push("reply-game", data)

    @sio.on("response-error", namespace=REF_NS)
    def on_response_error(data):
        waiter.push("response-error", data)

    sio.connect(
        args.base_url,
        namespaces=[REF_NS],
        transports=["websocket", "polling"],
        auth={"token": token},
    )
    time.sleep(args.delay)

    game_id = args.game_id
    turn_count = 0
    while True:
        turn_count += 1
        print(f"\n[{game_id}] Turn {turn_count}")

        try:
            game_data = fetch_game_data(sio, waiter, args.timeout, game_id=game_id)
            if bool(game_data.get("game", {}).get("finished")):
                print(f"[{game_id}] Game finished.")
                break

            teams = get_all_teams(game_data)
            team_entry = random.choice(teams)
            team_id = get_team_id(team_entry)

            if args.sleep:
                time.sleep(random.randrange(1, 10))

            with TURN_LOCK:
                current_game_data = fetch_game_data(sio, waiter, args.timeout, game_id=game_id)
                current_teams = get_all_teams(current_game_data)
                team_entry = next((t for t in current_teams if get_team_id(t) == team_id), None)

                if team_entry:
                    if has_open_turn(team_entry):
                        end_turn(sio, waiter, game_id, team_id, args.timeout)
                    else:
                        start_turn(sio, waiter, game_id, team_id, args.timeout)

        except Exception as e:
            print(f"[{game_id}] stop on error: {e}", file=sys.stderr)
            break

        time.sleep(args.delay)

    sio.disconnect()
    return 0


def start_existing_game(args: argparse.Namespace) -> int:
    """Connects and starts a single existing game."""
    if not hasattr(args, "game_id"):
        print("Error: game_id missing for start_existing_game", file=sys.stderr)
        return 1

    token = login_token(args.base_url, args.auth_json)
    sio = socketio.Client(
        logger=args.verbose,
        engineio_logger=args.verbose,
        reconnection=False,
    )
    waiter = WaitAny()

    @sio.event(namespace=REF_NS)
    def connect():
        print(f"[{args.game_id}] connected to /referee to start game")

    @sio.event(namespace=REF_NS)
    def disconnect():
        print(f"[{args.game_id}] disconnected")

    @sio.on("reply-game", namespace=REF_NS)
    def on_reply_game(data):
        waiter.push("reply-game", data)

    @sio.on("reply-teams", namespace=REF_NS)
    def on_reply_teams(data):
        waiter.push("reply-teams", data)

    @sio.on("response-error", namespace=REF_NS)
    def on_response_error(data):
        waiter.push("response-error", data)

    sio.connect(
        args.base_url,
        namespaces=[REF_NS],
        transports=["websocket", "polling"],
        auth={"token": token},
    )
    time.sleep(args.delay)

    try:
        game_id = args.game_id
        for i in range(args.teams):
            team_name = f"Team {i+1}"
            print(f"[{game_id}] Creating team {team_name!r}")
            create_team(sio, waiter, args.timeout, game_id=game_id, team_name=team_name)

        start_game(sio, waiter, args.timeout, game_id=game_id)
        print(f"[{game_id}] Game started successfully.")
    except Exception as e:
        print(f"[{game_id}] stop on error: {e}", file=sys.stderr)
    finally:
        sio.disconnect()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

