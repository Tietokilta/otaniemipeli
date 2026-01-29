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

-- "recipes"
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
    current_place_n INTEGER DEFAULT 0,
    doubled BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS turns
(
    turn_id      SERIAL PRIMARY KEY,
    team_id      INTEGER NOT NULL REFERENCES teams (team_id) ON DELETE CASCADE,
    game_id      INTEGER NOT NULL REFERENCES games (game_id) ON DELETE CASCADE,
    -- when dice were thrown OR "give penalty" clicked (including game start penalty)
    start_time   TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- when dice throw and square results were confirmed by referee, or penalty confirmed
    confirmed_at TIMESTAMPTZ,
    -- when IE started making the drink (= confirmed_at if no drinks awarded)
    mixing_at    TIMESTAMPTZ,
    -- when IE finished the drink (= confirmed_at if no drinks awarded)
    mixed_at     TIMESTAMPTZ,
    -- when the drink was delivered to the players (= confirmed_at if no drinks awarded)
    delivered_at TIMESTAMPTZ,
    -- when hands were raised by the players
    end_time     TIMESTAMPTZ,
    -- dice numbers (if thrown)
    dice1        INTEGER,
    dice2        INTEGER,
    -- where the player ended up (if dice thrown)
    place_number INTEGER,
    -- whether this is a penalty turn (no dice thrown)
    penalty      BOOLEAN NOT NULL,
);

-- when people visited a square
CREATE TABLE IF NOT EXISTS game_places
(
    game_id      INTEGER NOT NULL REFERENCES games (game_id) ON DELETE CASCADE,
    place_number INTEGER NOT NULL,
    team_id      INTEGER NOT NULL REFERENCES teams (team_id) ON DELETE CASCADE,
    turn_id      INTEGER NOT NULL REFERENCES turns (turn_id) ON DELETE SET NULL,
    visited_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (game_id, place_number, team_id, turn_id)
);

-- what drinks are included in a turn
CREATE TABLE IF NOT EXISTS turn_drinks
(
    drink_id INTEGER NOT NULL REFERENCES drinks (drink_id) ON DELETE CASCADE,
    turn_id  INTEGER NOT NULL REFERENCES turns (turn_id) ON DELETE CASCADE,
    n        INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (drink_id, turn_id)
);

-- what drinks you get by landing at a place
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

-- where you can get to from a place
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

CREATE OR REPLACE TRIGGER trg_grant_secretary
    AFTER INSERT
    ON user_types
    FOR EACH ROW
EXECUTE FUNCTION grant_secretary_row();

CREATE TABLE IF NOT EXISTS expired_sessions
(
    session_id  INTEGER PRIMARY KEY,
    uid         INTEGER REFERENCES users (uid),
    created_at  TIMESTAMPTZ NOT NULL,
    last_active TIMESTAMPTZ NOT NULL,
    expires     TIMESTAMPTZ NOT NULL,
    ended       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION log_expired_or_deleted_session()
    RETURNS trigger
    LANGUAGE plpgsql
AS
$$
BEGIN
    INSERT INTO expired_sessions (session_id, uid, created_at, last_active, expires, ended)
    VALUES (OLD.session_id, OLD.uid, OLD.created_at, OLD.last_active, OLD.expires, now())
    ON CONFLICT (session_id) DO NOTHING;
    RETURN OLD;
END;
$$;

CREATE OR REPLACE TRIGGER trg_sessions_to_expired
    AFTER DELETE
    ON sessions
    FOR EACH ROW
EXECUTE FUNCTION log_expired_or_deleted_session();

CREATE INDEX idx_turns_game_id ON turns (game_id);
CREATE INDEX idx_board_places_board_id ON board_places (board_id);
CREATE INDEX idx_turns_team_id ON turns (team_id);
