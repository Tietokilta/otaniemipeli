#!/usr/bin/env python3
"""
simulateTurns.py

Builds on your current script:
- logs in via HTTP to get token
- connects to Socket.IO namespace "/referee"
- fetches games, loads one game-data, chooses a team
- simulates N turns by calling "start-turn" then "end-turn"
- waits for "reply-game" / "response-error" each step

Deps:
  pip install "python-socketio[client]" requests

Example:
  python simulateTurns.py --base-url http://localhost:2568 --turns 10
  python simulateTurns.py --base-url http://localhost:2568 --game-id 1 --team-id 2 --turns 25
"""

from __future__ import annotations

import argparse
import json
import random
import sys
import time
from dataclasses import dataclass
from threading import Event, Lock
from typing import Any, Optional, Tuple

import requests as rq
import socketio


REF_NS = "/referee"


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

    # your server route from existing script
    resp = rq.post(f"{base_url}/login", json={"username": username, "password": password}, timeout=20)
    resp.raise_for_status()
    data = resp.json()

    # common patterns: {token: "..."} or {access_token: "..."}
    token = data["session"]["session_hash"]
    if not token:
        raise RuntimeError(f"Login ok but token missing in response keys={list(data.keys())}")
    return token


def pick_game_id(reply_games_payload: Any) -> int:
    # Rust returns Games { games: Vec<...> } so JSON usually {"games":[{...}]}
    games = reply_games_payload.get("games") if isinstance(reply_games_payload, dict) else None
    if not games:
        raise RuntimeError("No games returned from server (reply-games empty)")
    print (f"  found {len(games)} games from reply-games")
    for i in games:
        print(f"    game id={i.get('id') or i.get('game_id')} name={i.get('name')}")
    gid = input("Enter game id to use (or blank to pick first): ").strip()
    if gid is None:
        raise RuntimeError("Cant find game id field in first game object")
    return int(gid)

def get_all_teams(reply_game_payload: Any) -> list[dict]:
    teams = reply_game_payload.get("teams")
    if not teams:
        raise RuntimeError("No teams in reply-game payload")

    return teams

def pick_team_id(reply_game_payload: Any) -> int:
    # Rust get_team_data returns something with "teams"
    teams = reply_game_payload.get("teams") if isinstance(reply_game_payload, dict) else None
    if not teams:
        raise RuntimeError("No teams in reply-game payload, cant pick team_id")

    n = len(teams)
    print(f"  found {n} teams from reply-game")
    t0 = teams[random.choice(range(n))]
    if isinstance(t0, dict):
        if "team_id" in t0:
            return int(t0["team_id"])
        if "team" in t0 and isinstance(t0["team"], dict):
            if "team_id" in t0["team"]:
                return int(t0["team"]["team_id"])
            if "id" in t0["team"]:
                return int(t0["team"]["id"])
    raise RuntimeError("Cant locate team_id inside reply-game. Print payload to inspect.")


def start_turn(
        sio: socketio.Client,
        waiter: WaitAny,
        game_id: int,
        team_id: int,
        timeout: float,
        dice: Optional[Tuple[int, int]] = None,
) -> None:
    if dice is None:
        dice = (random.randint(1, 6), random.randint(1, 6))

    d1, d2 = dice
    start_payload = {"game_id": game_id, "team_id": team_id, "dice1": d1, "dice2": d2}

    print(f"  start-turn dice=({d1},{d2})")
    sio.emit("start-turn", start_payload, namespace=REF_NS)

    res = waiter.wait(timeout)
    if res is None:
        raise TimeoutError("timeout waiting reply after start-turn")
    if res.name == "response-error":
        raise RuntimeError(f"server response-error after start-turn: {res.payload!r}")
    # reply-game ok
    print("  reply-game (after start-turn)")
def end_turn(
        sio: socketio.Client,
        waiter: WaitAny,
        game_id: int,
        team_id: int,
        timeout: float,
):
    end_payload = {"game_id": game_id, "team_id": team_id}
    print("  end-turn")
    sio.emit("end-turn", end_payload, namespace=REF_NS)

    res = waiter.wait(timeout)
    if res is None:
        raise TimeoutError("timeout waiting reply after end-turn")
    if res.name == "response-error":
        raise RuntimeError(f"server response-error after end-turn: {res.payload!r}")
    print("  reply-game (after end-turn)")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base-url", default="http://localhost:2568", help="ex: http://localhost:2568")
    ap.add_argument("--auth-json", default="./scripts/auth.json", help="path to auth.json with username/password")
    ap.add_argument("--turns", type=int, default=5)
    ap.add_argument("--timeout", type=float, default=10.0)
    ap.add_argument("--delay", type=float, default=0.15)
    ap.add_argument("--seed", type=int, default=None)
    ap.add_argument("--verbose", action="store_true")
    ap.add_argument("--game-id", type=int, default=None, help="if omitted, first from reply-games")
    ap.add_argument("--team-id", type=int, default=None, help="if omitted, first team from reply-game")
    ap.add_argument("--fixed-dice", default=None, help='optional fixed dice like "3,5" (no spaces)')
    args = ap.parse_args()

    if args.seed is not None:
        random.seed(args.seed)

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

    @sio.on("response-error", namespace=REF_NS)
    def on_response_error(data):
        waiter.push("response-error", data)

    # connect (auth token used by check_auth in Rust)
    sio.connect(
        args.base_url,
        namespaces=[REF_NS],
        transports=["websocket", "polling"],
        auth={"token": token},
    )

    time.sleep(args.delay)

    game_id = args.game_id
    if game_id is None:
        sio.emit("get-games", namespace=REF_NS)
        res = waiter.wait(args.timeout)
        if res is None:
            print("timeout waiting reply-games", file=sys.stderr)
            return 2
        if res.name == "response-error":
            print(f"server response-error: {res.payload!r}", file=sys.stderr)
            return 2
        game_id = pick_game_id(res.payload)
        print(f"picked game_id={game_id}")

    # request game-data so we can pick a team if needed
    sio.emit("game-data", int(game_id), namespace=REF_NS)
    res = waiter.wait(args.timeout)
    if res is None:
        print("timeout waiting reply-game for game-data", file=sys.stderr)
        return 2
    if res.name == "response-error":
        print(f"server response-error: {res.payload!r}", file=sys.stderr)
        return 2

    fixed_dice: Optional[Tuple[int, int]] = None
    if args.fixed_dice:
        parts = args.fixed_dice.split(",")
        if len(parts) != 2:
            print('bad --fixed-dice format, expected "x,y"', file=sys.stderr)
            return 2
        fixed_dice = (int(parts[0]), int(parts[1]))

    finished = res.payload.get("game").get("finished")
    n = 0

    while not finished:
        print(f"\nTurn {n}/{args.turns}")
        n += 1

        sio.emit("game-data", int(game_id), namespace=REF_NS)
        res = waiter.wait(args.timeout)
        if res is None:
            print("timeout waiting reply-game", file=sys.stderr)
            break
        if res.name == "response-error":
            print(f"server error: {res.payload!r}", file=sys.stderr)
            break

        teams = get_all_teams(res.payload)

        # pick random team each round
        team = random.choice(teams)
        team_id = team.get("team_id") or team.get("team", {}).get("team_id") or team.get("team", {}).get("id")
        if team_id is None:
            raise RuntimeError("cant find team_id in chosen team object")

        try:
            if len([i for i in team.get("turns") if not i.get("finished")]):

                print(f"  chosen team_id={team_id}")

                end_turn(
                    sio,
                    waiter,
                    game_id,
                    team_id,
                    args.timeout,
                )
            else:
                start_turn(
                    sio,
                    waiter,
                    game_id,
                    team_id,
                    args.timeout,
                    dice=fixed_dice,
                )


        except Exception as e:
            print(f"stop on error: {e}", file=sys.stderr)
            break
        time.sleep(args.delay)

    sio.disconnect()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

