-- Req 1: Only one unthrown non-penalty turn may exist across the entire game at a time.
CREATE UNIQUE INDEX idx_one_unthrown_non_penalty_turn_per_game
    ON turns (game_id)
    WHERE thrown_at IS NULL AND NOT penalty;

-- At most one ongoing (not yet ended) non-penalty turn may exist per team at a time.
-- Penalty turns are exempt since teams can earn penalties at any point.
CREATE UNIQUE INDEX idx_one_ongoing_non_penalty_turn_per_team
    ON turns (team_id)
    WHERE end_time IS NULL AND NOT penalty;

-- A non-penalty turn cannot be given while the team has any unfinished turn (end_time IS NULL).
-- Penalty turns (rule violations, etc.) are exempt and can always be issued.
-- Teleport turns are inserted with end_time = NOW() so they are never unfinished.
CREATE OR REPLACE FUNCTION trg_fn_check_no_unfinished_turns_for_normal_turn()
    RETURNS TRIGGER
    LANGUAGE plpgsql
AS
$$
BEGIN
    IF NOT NEW.penalty THEN
        IF EXISTS (
            SELECT 1
            FROM turns
            WHERE team_id = NEW.team_id
              AND end_time IS NULL
        ) THEN
            RAISE EXCEPTION 'Cannot give a non-penalty turn: team has unfinished turns';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_check_no_unfinished_turns_for_normal_turn
    BEFORE INSERT
    ON turns
    FOR EACH ROW
EXECUTE FUNCTION trg_fn_check_no_unfinished_turns_for_normal_turn();

-- Req 2: confirmed_at requires thrown_at.
-- (set_turn_confirmed sets both atomically via COALESCE, so this always holds in practice,
-- but the CHECK provides a DB-level guarantee independent of application logic.)
ALTER TABLE turns
    ADD CONSTRAINT chk_confirmed_requires_thrown
        CHECK (confirmed_at IS NULL OR thrown_at IS NOT NULL);

-- Req 3: Non-penalty turns must be confirmed in the order they were started, across all teams.
-- Teams can affect each other's drinks (e.g. Tampere mechanics), so the referee must
-- process turns in throwing order regardless of which team threw.
CREATE OR REPLACE FUNCTION trg_fn_check_confirm_order()
    RETURNS TRIGGER
    LANGUAGE plpgsql
AS
$$
BEGIN
    IF NEW.confirmed_at IS NOT NULL AND OLD.confirmed_at IS NULL AND NOT NEW.penalty THEN
        IF EXISTS (
            SELECT 1
            FROM turns earlier
            WHERE earlier.game_id = NEW.game_id
              AND earlier.turn_id <> NEW.turn_id
              AND NOT earlier.penalty
              AND earlier.start_time < NEW.start_time
              AND earlier.confirmed_at IS NULL
        ) THEN
            RAISE EXCEPTION 'Cannot confirm turn: an earlier thrown non-penalty turn in this game is not yet confirmed';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_check_confirm_order
    BEFORE UPDATE
    ON turns
    FOR EACH ROW
EXECUTE FUNCTION trg_fn_check_confirm_order();

-- Req 4: Drink preparation timestamps must be set in order.
ALTER TABLE turns
    ADD CONSTRAINT chk_mixing_requires_confirmed
        CHECK (mixing_at IS NULL OR confirmed_at IS NOT NULL);

ALTER TABLE turns
    ADD CONSTRAINT chk_mixed_requires_mixing
        CHECK (mixed_at IS NULL OR mixing_at IS NOT NULL);

-- Req 5: delivered_at requires mixed_at; end_time requires delivered_at.
ALTER TABLE turns
    ADD CONSTRAINT chk_delivered_requires_mixed
        CHECK (delivered_at IS NULL OR mixed_at IS NOT NULL);

ALTER TABLE turns
    ADD CONSTRAINT chk_end_requires_delivered
        CHECK (end_time IS NULL OR delivered_at IS NOT NULL);

-- Req 6: All turn inserts and updates must happen on an ongoing game
-- (started = true AND finished = false).
-- Drink-prep and end-turn actions are also covered — after a game ends no further
-- turn updates should be needed.
CREATE OR REPLACE FUNCTION trg_fn_check_game_ongoing()
    RETURNS TRIGGER
    LANGUAGE plpgsql
AS
$$
DECLARE
    v_started  BOOLEAN;
    v_finished BOOLEAN;
BEGIN
    SELECT started, finished
    INTO v_started, v_finished
    FROM games
    WHERE game_id = NEW.game_id;

    IF NOT v_started THEN
        RAISE EXCEPTION 'Cannot act on turn: game has not started';
    END IF;
    IF v_finished THEN
        RAISE EXCEPTION 'Cannot act on turn: game has already finished';
    END IF;

    RETURN NEW;
END;
$$;

-- Covers: starting a turn, teleport inserts, make_first_turns (start_game sets started=true
-- before inserting, so v_started=true is already visible within the same transaction).
CREATE OR REPLACE TRIGGER trg_check_game_ongoing_insert
    BEFORE INSERT
    ON turns
    FOR EACH ROW
EXECUTE FUNCTION trg_fn_check_game_ongoing();

-- Covers: throwing dice, confirming turns, drink prep status updates, ending turns.
CREATE OR REPLACE TRIGGER trg_check_game_ongoing_update
    BEFORE UPDATE
    ON turns
    FOR EACH ROW
EXECUTE FUNCTION trg_fn_check_game_ongoing();

-- Req 7: Teams may only be created or deleted before the game starts.
-- Name changes and other column updates (e.g. moral_victory_eligible) are always allowed.
CREATE OR REPLACE FUNCTION trg_fn_check_game_not_started_for_team()
    RETURNS TRIGGER
    LANGUAGE plpgsql
AS
$$
DECLARE
    v_game_id INTEGER;
    v_started BOOLEAN;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_game_id := OLD.game_id;
    ELSE
        v_game_id := NEW.game_id;
    END IF;

    SELECT started INTO v_started FROM games WHERE game_id = v_game_id;

    IF v_started THEN
        RAISE EXCEPTION 'Cannot modify team: game has already started';
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

CREATE OR REPLACE TRIGGER trg_check_game_not_started_for_team
    BEFORE INSERT OR DELETE
    ON teams
    FOR EACH ROW
EXECUTE FUNCTION trg_fn_check_game_not_started_for_team();

-- A game cannot be finished without first being started.
ALTER TABLE games
    ADD CONSTRAINT chk_finished_requires_started
        CHECK (NOT finished OR started);
