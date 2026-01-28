CREATE TYPE PLACETYPE AS ENUM ('Normal', 'Food', 'Sauna', 'Special', 'Guild');
CREATE TYPE USERTYPE AS ENUM ('Admin', 'Referee', 'Ie', 'Secretary');

CREATE TABLE IF NOT EXISTS boards
(
    board_id SERIAL PRIMARY KEY,
    name     TEXT
);
CREATE TABLE IF NOT EXISTS games
(
    game_id    SERIAL PRIMARY KEY,
    start_time TIMESTAMPTZ NOT NULL DEFAULT now(),
    name       TEXT                 DEFAULT '',
    started    BOOLEAN              DEFAULT false,
    finished   BOOLEAN              DEFAULT false,
    board_id   INTEGER REFERENCES boards (board_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS users
(
    uid      SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email    TEXT UNIQUE NOT NULL,
    password TEXT
);
CREATE TABLE IF NOT EXISTS sessions
(
    session_id   SERIAL PRIMARY KEY,
    uid          INTEGER REFERENCES users (uid) ON DELETE CASCADE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_active  TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires      TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '4 hours'),
    session_hash TEXT UNIQUE NOT NULL
);
CREATE TABLE IF NOT EXISTS drinks
(
    drink_id SERIAL PRIMARY KEY,
    name     TEXT
);
CREATE TABLE IF NOT EXISTS places
(
    place_id   SERIAL PRIMARY KEY,
    place_name TEXT,
    rule       TEXT DEFAULT '',
    place_type PLACETYPE NOT NULL
);
CREATE TABLE IF NOT EXISTS ingredients
(
    ingredient_id SERIAL PRIMARY KEY,
    name          TEXT,
    abv           FLOAT,
    carbonated    BOOLEAN
);

-- Relation-tables
CREATE TABLE IF NOT EXISTS drink_ingredients
(
    drink_id      INTEGER REFERENCES drinks (drink_id) ON DELETE CASCADE,
    ingredient_id INTEGER REFERENCES ingredients (ingredient_id) ON DELETE CASCADE,
    quantity      FLOAT,
    PRIMARY KEY (drink_id, ingredient_id)
);
CREATE TABLE IF NOT EXISTS board_places
(
    board_id     INTEGER NOT NULL REFERENCES boards (board_id) ON DELETE CASCADE,
    place_number INTEGER,
    place_id     INTEGER NOT NULL REFERENCES places (place_id) ON DELETE CASCADE,
    area         TEXT    default 'normal',
    start        BOOLEAN default FALSE,
    "end"        BOOLEAN default FALSE,
    x            FLOAT   default 0.0,
    y            FLOAT   default 0.0,
    PRIMARY KEY (board_id, place_number)
);
CREATE TABLE IF NOT EXISTS teams
(
    team_id   SERIAL PRIMARY KEY,
    game_id   INTEGER REFERENCES games (game_id) ON DELETE CASCADE,
    team_name      TEXT,
    team_hash TEXT,
    current_place_n INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS turns
(
    turn_id    SERIAL PRIMARY KEY,
    start_time TIMESTAMPTZ NOT NULL DEFAULT now(),
    end_time   TIMESTAMPTZ,
    team_id    INTEGER REFERENCES teams (team_id) ON DELETE CASCADE,
    game_id    INTEGER REFERENCES games (game_id) ON DELETE CASCADE,
    dice1      INTEGER,
    dice2      INTEGER,
    location   INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS game_places
(
    game_id      INTEGER REFERENCES games (game_id) ON DELETE CASCADE,
    place_number INTEGER,
    team_id      INTEGER REFERENCES teams (team_id) ON DELETE CASCADE,
    turn_id      INTEGER REFERENCES turns (turn_id) ON DELETE SET NULL,
    visited_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (game_id, place_number, team_id, turn_id)
);
CREATE TABLE IF NOT EXISTS turn_drinks
(
    drink_id INTEGER REFERENCES drinks (drink_id) ON DELETE CASCADE,
    turn_id  INTEGER REFERENCES turns (turn_id) ON DELETE CASCADE,
    n        INTEGER DEFAULT 1,
    penalty  BOOLEAN DEFAULT FALSE,
    given_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    delivered BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (drink_id, turn_id, penalty)
);
CREATE TABLE IF NOT EXISTS place_drinks
(
    drink_id     INTEGER NOT NULL REFERENCES drinks (drink_id) ON DELETE CASCADE,
    board_id     INTEGER NOT NULL REFERENCES boards (board_id) ON DELETE CASCADE,
    place_number INTEGER NOT NULL,
    refill       BOOLEAN default FALSE,
    optional     BOOLEAN default FALSE,
    n            INTEGER default 1,
    n_update     TEXT    default '',
    PRIMARY KEY (drink_id, board_id, place_number),
    FOREIGN KEY (board_id, place_number)
        REFERENCES board_places (board_id, place_number)
        ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS place_connections
(
    board_id  INTEGER REFERENCES boards (board_id) ON DELETE CASCADE,
    origin    INTEGER,
    target    INTEGER,
    on_land   BOOLEAN default FALSE,
    backwards BOOLEAN default FALSE,
    dashed    BOOLEAN default FALSE,
    PRIMARY KEY (board_id, origin, target),
    FOREIGN KEY (board_id, origin)
        REFERENCES board_places (board_id, place_number)
        ON DELETE CASCADE,
    FOREIGN KEY (board_id, target)
        REFERENCES board_places (board_id, place_number)
        ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS user_types
(
    uid       INTEGER REFERENCES users (uid) ON DELETE CASCADE,
    user_type USERTYPE NOT NULL,
    PRIMARY KEY (uid, user_type)
);

-- drop old stuff if exists
DROP TRIGGER IF EXISTS trg_grant_secretary ON user_types;
DROP FUNCTION IF EXISTS grant_secretary_row();

-- row-level trigger: only runs when a row is inserted
CREATE OR REPLACE FUNCTION grant_secretary_row()
    RETURNS TRIGGER
    LANGUAGE plpgsql
AS
$$
BEGIN
    IF NEW.user_type = 'Admin'::USERTYPE THEN
        INSERT INTO user_types (uid, user_type)
        VALUES (NEW.uid, 'Referee'::USERTYPE),
               (NEW.uid, 'Ie'::USERTYPE),
               (NEW.uid, 'Secretary'::USERTYPE)
        ON CONFLICT (uid, user_type) DO NOTHING;

    ELSIF NEW.user_type = 'Referee'::USERTYPE THEN
        INSERT INTO user_types (uid, user_type)
        VALUES (NEW.uid, 'Ie'::USERTYPE),
               (NEW.uid, 'Secretary'::USERTYPE)
        ON CONFLICT (uid, user_type) DO NOTHING;

    ELSIF NEW.user_type = 'Ie'::USERTYPE THEN
        INSERT INTO user_types (uid, user_type)
        VALUES (NEW.uid, 'Secretary'::USERTYPE)
        ON CONFLICT (uid, user_type) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_grant_secretary
    AFTER INSERT
    ON user_types
    FOR EACH ROW
EXECUTE FUNCTION grant_secretary_row();
