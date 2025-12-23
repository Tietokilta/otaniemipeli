CREATE TABLE IF NOT EXISTS game_places
(
    game_id      INTEGER REFERENCES games (game_id) ON DELETE CASCADE,
    board_id     INTEGER REFERENCES boards (board_id) ON DELETE CASCADE,
    place_number INTEGER,
    team_id      INTEGER REFERENCES teams (team_id) ON DELETE CASCADE,
    visited_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (game_id, place_number, team_id),
    FOREIGN KEY (board_id, place_number)
        REFERENCES board_places (board_id, place_number)
        ON DELETE CASCADE
);
ALTER TABLE teams
    ADD COLUMN IF NOT EXISTS
        current_place_id INTEGER REFERENCES places (place_id) ON DELETE RESTRICT;