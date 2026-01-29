#!/usr/bin/env python3
"""simulateTurns.py

Referee simulator:
- logs in via HTTP to get token
- connects to Socket.IO namespace "/referee"
- creates a new game
- creates teams with arbitrary names
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
from datetime import datetime
from threading import Event, Lock
from typing import Any, Optional, Tuple

import requests as rq
import socketio

# Import rust_types for typed dataclasses
from rust_types import (
    GameData,
    GameTeam,
    Games,
    Game,
    Team,
    Teams,
    Turn,
    TurnDrink,
    TurnDrinks,
    FirstTurnPost,
    PostStartTurn,
    EndTurn as EndTurnPayload,
    PostGame,
    Drink,
    SocketAuth,
)


REF_NS = "/referee"
# Global lock to prevent race conditions when multiple threads interact with the same game state.
TURN_LOCK = Lock()
# Semaphore to limit concurrent connections to the server
CONNECTION_SEMAPHORE: Optional[threading.Semaphore] = None


class WaitResult:
    """Result from waiting for a socket event."""
    def __init__(self, name: str, payload: Any):
        self.name = name
        self.payload = payload


class WaitAny:
    """Wait for next event among a small set."""

    def __init__(self) -> None:
        self._ev = Event()
        self._lock = Lock()
        self._last: Optional[WaitResult] = None

    def push(self, name: str, payload: Any) -> None:
        with self._lock:
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
    """Login via HTTP and return the session token."""
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
    """Wait for a socket event or raise on timeout/error."""
    res = waiter.wait(timeout)
    if res is None:
        raise TimeoutError(f"timeout waiting for server response ({context})")
    if res.name == "response-error":
        raise RuntimeError(f"server response-error ({context}): {res.payload!r}")
    return res


def retry_operation(
    func,
    max_retries: int = 3,
    base_delay: float = 1.0,
    context: str = "operation",
):
    """Retry an operation with exponential backoff."""
    last_error = None
    for attempt in range(max_retries):
        try:
            return func()
        except (TimeoutError, RuntimeError) as e:
            last_error = e
            if attempt < max_retries - 1:
                delay = base_delay * (2 ** attempt) + random.uniform(0, 1)
                print(f"  Retry {attempt + 1}/{max_retries} for {context} after {delay:.1f}s: {e}")
                time.sleep(delay)
    raise last_error


def parse_game_data(payload: Any) -> GameData:
    """Parse a reply-game payload into a typed GameData object."""
    if not isinstance(payload, dict):
        raise RuntimeError(f"reply-game payload not a dict: {type(payload).__name__} = {payload!r}")
    return GameData.from_dict(payload)


def parse_game(payload: Any) -> Game:
    """Parse a reply-game payload into a typed Game object."""
    if not isinstance(payload, dict):
        raise RuntimeError(f"reply-game payload not a dict: {type(payload).__name__} = {payload!r}")
    return Game.from_dict(payload)


def parse_games(payload: Any) -> Games:
    """Parse a reply-games payload into a typed Games object."""
    if not isinstance(payload, dict):
        raise RuntimeError("reply-games payload not a dict")
    return Games.from_dict(payload)


def parse_teams(payload: Any) -> Teams:
    """Parse a reply-teams payload into a typed Teams object."""
    if not isinstance(payload, dict):
        raise RuntimeError("reply-teams payload not a dict")
    return Teams.from_dict(payload)


def get_team_id(game_team: GameTeam) -> int:
    """Extract team_id from a GameTeam."""
    return game_team.team.team_id


def has_open_turn(game_team: GameTeam) -> bool:
    """Check if the team has an unfinished turn."""
    for turn in game_team.turns:
        if turn.end_time is None:
            return True
    return False


def roll_die(weighted_faces: list[dict]) -> int:
    """Roll a weighted die."""
    faces = []
    weights = []
    for item in weighted_faces:
        face, weight = next(iter(item.items()))
        faces.append(face)
        weights.append(weight)
    return random.choices(faces, weights=weights, k=1)[0]


def setup_socket_handlers(sio: socketio.Client, waiter: WaitAny, verbose: bool = False) -> Tuple[Event, Event]:
    """Setup all socket event handlers. Returns (connected_event, verified_event)."""
    connected_event = Event()
    verified_event = Event()

    @sio.event(namespace=REF_NS)
    def connect():
        if verbose:
            print("connected to /referee")
        connected_event.set()

    @sio.event(namespace=REF_NS)
    def disconnect():
        if verbose:
            print("disconnected from /referee")

    @sio.on("verification-reply", namespace=REF_NS)
    def on_verification_reply(data):
        if verbose:
            print(f"  verification-reply: {data}")
        if data:
            verified_event.set()
        waiter.push("verification-reply", data)

    @sio.on("reply-games", namespace=REF_NS)
    def on_reply_games(data):
        waiter.push("reply-games", data)

    @sio.on("reply-game", namespace=REF_NS)
    def on_reply_game(data):
        waiter.push("reply-game", data)

    @sio.on("reply-teams", namespace=REF_NS)
    def on_reply_teams(data):
        waiter.push("reply-teams", data)

    @sio.on("reply-drinks", namespace=REF_NS)
    def on_reply_drinks(data):
        waiter.push("reply-drinks", data)

    @sio.on("response-error", namespace=REF_NS)
    def on_response_error(data):
        print(f"  response-error: {data}")
        waiter.push("response-error", data)

    return connected_event, verified_event


def do_start_turn(
    sio: socketio.Client,
    waiter: WaitAny,
    game_id: int,
    team_id: int,
    timeout: float,
    dice: Optional[Tuple[int, int]] = None,
) -> GameData:
    """Start a turn for a team and return the updated game data."""
    if dice is None:
        dice_weights = {
            "dice_1": [{1: 0.1788}, {2: 0.1589}, {3: 0.1325}, {4: 0.1457}, {5: 0.1258}, {6: 0.2583}],
            "dice_2": [{1: 0.1126}, {2: 0.2450}, {3: 0.1656}, {4: 0.2119}, {5: 0.1391}, {6: 0.1258}],
        }
        dice = (roll_die(dice_weights["dice_1"]), roll_die(dice_weights["dice_2"]))

    d1, d2 = dice
    start_payload = PostStartTurn(
        game_id=game_id,
        team_id=team_id,
        dice1=d1,
        dice2=d2,
    )

    print(f"  start-turn team_id={team_id} dice=({d1},{d2})")
    sio.emit("start-turn", start_payload.__dict__, namespace=REF_NS)

    res = wait_or_raise(waiter, timeout, context="start-turn")
    if res.name != "reply-game":
        raise RuntimeError(f"unexpected event after start-turn: {res.name}")
    print("  reply-game (after start-turn)")
    return parse_game_data(res.payload)


def do_end_turn(
    sio: socketio.Client,
    waiter: WaitAny,
    game_id: int,
    team_id: int,
    timeout: float,
) -> GameData:
    """End a turn for a team and return the updated game data."""
    end_payload = EndTurnPayload(game_id=game_id, team_id=team_id)
    print(f"  end-turn team_id={team_id}")
    sio.emit("end-turn", end_payload.__dict__, namespace=REF_NS)

    res = wait_or_raise(waiter, timeout, context="end-turn")
    if res.name != "reply-game":
        raise RuntimeError(f"unexpected event after end-turn: {res.name}")
    print("  reply-game (after end-turn)")
    return parse_game_data(res.payload)


def do_create_game(sio: socketio.Client, waiter: WaitAny, timeout: float, *, name: str, board: int) -> int:
    """Create a new game and return its ID."""
    game_payload = PostGame(name=name, board=board)
    sio.emit("create-game", game_payload.__dict__, namespace=REF_NS)

    res = wait_or_raise(waiter, timeout, context="create-game")
    games = parse_games(res.payload)
    if not games.games:
        raise RuntimeError("create-game response has no games")

    # The newly created game should be the first one (most recent)
    game = games.games[0]
    print(f"  Created game: {game}")
    return game.id


def do_create_team(
    sio: socketio.Client,
    waiter: WaitAny,
    timeout: float,
    *,
    game_id: int,
    team_name: str,
) -> None:
    """Create a team in the given game."""
    team_payload = Team(
        team_id=0,  # Backend will assign
        game_id=game_id,
        team_name=team_name,
        team_hash="",  # Backend will assign
        double=False,
    )
    sio.emit("create-team", team_payload.__dict__, namespace=REF_NS)

    # Wait for reply-teams, ignoring other events
    while True:
        res = wait_or_raise(waiter, timeout, context=f"create-team ({team_name})")
        if res.name == "reply-teams":
            teams = parse_teams(res.payload)
            print(f"  Created team, now have {len(teams.teams)} teams")
            break
        else:
            print(f"  ...ignoring event {res.name} while waiting for reply-teams")


def do_start_game(
    sio: socketio.Client,
    waiter: WaitAny,
    timeout: float,
    *,
    game_id: int,
) -> GameData:
    """Start the game."""
    first_turn = FirstTurnPost(
        game_id=game_id,
        drinks=[
            TurnDrink(
                drink=Drink(id=1, name="Kalja"),
                turn_id=-1,
                n=1,
            )
        ],
    )
    # Convert to dict, handling nested dataclasses
    payload = {
        "game_id": first_turn.game_id,
        "drinks": [
            {"drink": {"id": d.drink.id, "name": d.drink.name}, "turn_id": d.turn_id, "n": d.n}
            for d in first_turn.drinks
        ]
    }
    sio.emit("start-game", payload, namespace=REF_NS)
    res = wait_or_raise(waiter, timeout, context="start-game")
    if res.name != "reply-game":
        raise RuntimeError(f"unexpected event after start-game: {res.name}")
    # The server returns a Game, not GameData, so parse it and then fetch full game data
    game = parse_game(res.payload)
    print(f"  Game started: {game.name}")
    # Fetch full game data with teams
    return fetch_game_data(sio, waiter, timeout, game_id=game_id)


def fetch_game_data(sio: socketio.Client, waiter: WaitAny, timeout: float, *, game_id: int) -> GameData:
    """Fetch the current game data."""
    sio.emit("game-data", game_id, namespace=REF_NS)
    res = wait_or_raise(waiter, timeout, context="game-data")
    if res.name != "reply-game":
        raise RuntimeError(f"unexpected event after game-data: {res.name}")
    return parse_game_data(res.payload)


def main() -> int:
    ap = argparse.ArgumentParser(description="Simulate game turns via referee websocket")
    ap.add_argument("--base-url", default="http://localhost:2568", help="Server base URL")
    ap.add_argument("--auth-json", default="./scripts/auth.json", help="Path to auth.json")
    ap.add_argument("--turns", type=int, default=500, help="Max turns to simulate")
    ap.add_argument("--timeout", type=float, default=10.0, help="Socket timeout in seconds")
    ap.add_argument("--delay", type=float, default=0.15, help="Delay between operations")
    ap.add_argument("--seed", type=int, default=None, help="Random seed")
    ap.add_argument("--verbose", action="store_true", help="Enable verbose logging")
    ap.add_argument("--fixed-dice", default=None, help='Fixed dice like "3,5"')
    ap.add_argument("--sleep", action="store_true", help="Random sleep between turns")
    ap.add_argument("--board", type=int, default=1, help="Board ID for new game")
    ap.add_argument("--teams", type=int, default=8, help="Number of teams to create")
    ap.add_argument("--game-name", default=None, help="Explicit game name")
    ap.add_argument("--threads", type=int, default=1, help="Parallel simulation threads")
    ap.add_argument("--max-concurrent", type=int, default=20, help="Max concurrent connections")
    ap.add_argument("--retries", type=int, default=3, help="Retry count for failures")
    ap.add_argument("--finish", action="store_true", help="Play all unfinished games to end")
    ap.add_argument("--start-all", action="store_true", help="Start all unstarted games")
    args = ap.parse_args()

    if args.start_all:
        return start_all_unstarted_games(args)

    if args.finish:
        return play_all_unfinished_games(args)

    if args.threads > 1:
        global CONNECTION_SEMAPHORE
        CONNECTION_SEMAPHORE = threading.Semaphore(args.max_concurrent)

        threads = []
        for i in range(args.threads):
            print(f"Starting simulation thread {i+1}/{args.threads}")
            thread = threading.Thread(target=run_simulation, args=(args,))
            threads.append(thread)
            thread.start()
            time.sleep(0.5 + random.uniform(0, 0.5))

        for thread in threads:
            thread.join()

        return 0
    else:
        return run_simulation(args)


def run_simulation(args: argparse.Namespace) -> int:
    """Run a single simulation, acquiring semaphore if in multi-threaded mode."""
    if CONNECTION_SEMAPHORE is not None:
        CONNECTION_SEMAPHORE.acquire()

    try:
        return _run_simulation_inner(args)
    finally:
        if CONNECTION_SEMAPHORE is not None:
            CONNECTION_SEMAPHORE.release()


def _run_simulation_inner(args: argparse.Namespace) -> int:
    """Inner simulation logic."""
    if args.seed is not None:
        random.seed(args.seed + threading.get_ident())

    token = retry_operation(
        lambda: login_token(args.base_url, args.auth_json),
        max_retries=args.retries,
        context="login"
    )

    sio = socketio.Client(
        logger=args.verbose,
        engineio_logger=args.verbose,
        reconnection=False,
    )
    waiter = WaitAny()

    connected_event, verified_event = setup_socket_handlers(sio, waiter, args.verbose)

    sio.connect(
        args.base_url,
        namespaces=[REF_NS],
        transports=["websocket", "polling"],
        auth={"token": token},
    )

    # Wait for connection
    if not connected_event.wait(args.timeout):
        print("Failed to connect to /referee", file=sys.stderr)
        return 1

    # Explicitly verify login
    sio.emit("verify-login", {"token": token}, namespace=REF_NS)
    if not verified_event.wait(args.timeout):
        print("Failed to verify login", file=sys.stderr)
        sio.disconnect()
        return 1

    time.sleep(args.delay)

    game_name = args.game_name or f"sim-{datetime.now().strftime('%Y%m%d-%H%M%S')}-{threading.get_ident()}"
    print(f"Creating game name={game_name!r} board={args.board}")

    game_id = retry_operation(
        lambda: do_create_game(sio, waiter, args.timeout, name=game_name, board=args.board),
        max_retries=args.retries,
        context="create-game"
    )
    print(f"Created game_id={game_id}")

    for i in range(args.teams):
        team_name = f"Team {i+1}"
        print(f"Creating team {team_name!r}")
        retry_operation(
            lambda tn=team_name: do_create_team(sio, waiter, args.timeout, game_id=game_id, team_name=tn),
            max_retries=args.retries,
            context=f"create-team ({team_name})"
        )

    print("Starting game")
    retry_operation(
        lambda: do_start_game(sio, waiter, args.timeout, game_id=game_id),
        max_retries=args.retries,
        context="start-game"
    )

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
            if game_data.game.finished:
                print("Game finished")
                break

            if not game_data.teams:
                print("No teams in game data", file=sys.stderr)
                break

            game_team: GameTeam = random.choice(game_data.teams)
            team_id = get_team_id(game_team)

            if args.sleep:
                time.sleep(random.randrange(1, 10) / 4)

            with TURN_LOCK:
                # Re-fetch inside lock for consistency
                current_game_data = fetch_game_data(sio, waiter, args.timeout, game_id=game_id)

                # Find the same team
                current_team = next(
                    (t for t in current_game_data.teams if get_team_id(t) == team_id),
                    None
                )

                if current_team:
                    if has_open_turn(current_team):
                        do_end_turn(sio, waiter, game_id, team_id, args.timeout)
                    else:
                        do_start_turn(sio, waiter, game_id, team_id, args.timeout, dice=fixed_dice)

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

    connected_event, verified_event = setup_socket_handlers(sio, waiter, args.verbose)

    sio.connect(
        args.base_url,
        namespaces=[REF_NS],
        transports=["websocket", "polling"],
        auth={"token": token},
    )

    if not connected_event.wait(args.timeout):
        print("Failed to connect", file=sys.stderr)
        return 1

    # Explicitly verify login
    sio.emit("verify-login", {"token": token}, namespace=REF_NS)
    if not verified_event.wait(args.timeout):
        print("Failed to verify login", file=sys.stderr)
        sio.disconnect()
        return 1

    time.sleep(args.delay)

    print("Fetching all games...")
    sio.emit("get-games", namespace=REF_NS)
    res = wait_or_raise(waiter, args.timeout, context="get-games")
    sio.disconnect()

    games = parse_games(res.payload)
    unfinished_games = [g for g in games.games if g.started and not g.finished]

    if not unfinished_games:
        print("No unfinished games found.")
        return 0

    print(f"Found {len(unfinished_games)} unfinished games to simulate.")

    threads = []
    for game in unfinished_games:
        game_id = game.id
        print(f"Starting simulation for game_id={game_id}")
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

    connected_event, verified_event = setup_socket_handlers(sio, waiter, args.verbose)

    sio.connect(
        args.base_url,
        namespaces=[REF_NS],
        transports=["websocket", "polling"],
        auth={"token": token},
    )

    if not connected_event.wait(args.timeout):
        print("Failed to connect", file=sys.stderr)
        return 1

    # Explicitly verify login
    sio.emit("verify-login", {"token": token}, namespace=REF_NS)
    if not verified_event.wait(args.timeout):
        print("Failed to verify login", file=sys.stderr)
        sio.disconnect()
        return 1

    time.sleep(args.delay)

    print("Fetching all games...")
    sio.emit("get-games", namespace=REF_NS)
    res = wait_or_raise(waiter, args.timeout, context="get-games")
    sio.disconnect()

    games = parse_games(res.payload)
    unstarted_games = [g for g in games.games if not g.started]

    if not unstarted_games:
        print("No unstarted games found.")
        return 0

    print(f"Found {len(unstarted_games)} unstarted games to start.")

    threads = []
    for game in unstarted_games:
        game_id = game.id
        print(f"Starting game_id={game_id}")
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

    game_id = args.game_id

    connected_event = Event()
    verified_event = Event()

    @sio.event(namespace=REF_NS)
    def connect():
        print(f"[{game_id}] connected to /referee")
        connected_event.set()

    @sio.event(namespace=REF_NS)
    def disconnect():
        print(f"[{game_id}] disconnected")

    @sio.on("verification-reply", namespace=REF_NS)
    def on_verification_reply(data):
        if data:
            verified_event.set()
        waiter.push("verification-reply", data)

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

    if not connected_event.wait(args.timeout):
        print(f"[{game_id}] Failed to connect", file=sys.stderr)
        return 1

    # Explicitly verify login
    sio.emit("verify-login", {"token": token}, namespace=REF_NS)
    if not verified_event.wait(args.timeout):
        print(f"[{game_id}] Failed to verify login", file=sys.stderr)
        sio.disconnect()
        return 1

    time.sleep(args.delay)

    turn_count = 0
    while True:
        turn_count += 1
        print(f"\n[{game_id}] Turn {turn_count}")

        try:
            game_data = fetch_game_data(sio, waiter, args.timeout, game_id=game_id)
            if game_data.game.finished:
                print(f"[{game_id}] Game finished.")
                break

            if not game_data.teams:
                print(f"[{game_id}] No teams", file=sys.stderr)
                break

            game_team: GameTeam = random.choice(game_data.teams)
            team_id = get_team_id(game_team)

            if args.sleep:
                time.sleep(random.randrange(1, 10) / 4)

            with TURN_LOCK:
                current_game_data = fetch_game_data(sio, waiter, args.timeout, game_id=game_id)
                current_team = next(
                    (t for t in current_game_data.teams if get_team_id(t) == team_id),
                    None
                )

                if current_team:
                    if has_open_turn(current_team):
                        do_end_turn(sio, waiter, game_id, team_id, args.timeout)
                    else:
                        do_start_turn(sio, waiter, game_id, team_id, args.timeout)

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

    game_id = args.game_id

    connected_event = Event()
    verified_event = Event()

    @sio.event(namespace=REF_NS)
    def connect():
        print(f"[{game_id}] connected to /referee to start game")
        connected_event.set()

    @sio.event(namespace=REF_NS)
    def disconnect():
        print(f"[{game_id}] disconnected")

    @sio.on("verification-reply", namespace=REF_NS)
    def on_verification_reply(data):
        if data:
            verified_event.set()
        waiter.push("verification-reply", data)

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

    if not connected_event.wait(args.timeout):
        print(f"[{game_id}] Failed to connect", file=sys.stderr)
        return 1

    # Explicitly verify login
    sio.emit("verify-login", {"token": token}, namespace=REF_NS)
    if not verified_event.wait(args.timeout):
        print(f"[{game_id}] Failed to verify login", file=sys.stderr)
        sio.disconnect()
        return 1

    time.sleep(args.delay)

    try:
        for i in range(args.teams):
            team_name = f"Team {i+1}"
            print(f"[{game_id}] Creating team {team_name!r}")
            do_create_team(sio, waiter, args.timeout, game_id=game_id, team_name=team_name)

        do_start_game(sio, waiter, args.timeout, game_id=game_id)
        print(f"[{game_id}] Game started successfully.")
    except Exception as e:
        print(f"[{game_id}] stop on error: {e}", file=sys.stderr)
    finally:
        sio.disconnect()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

