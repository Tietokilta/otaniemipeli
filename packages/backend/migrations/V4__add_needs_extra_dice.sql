-- How many extra dice this turn needs (1 or 2), NULL if none needed or already satisfied.
ALTER TABLE turns ADD COLUMN needs_extra_dice INTEGER;

-- Penalty turns must never have dice values set.
ALTER TABLE turns ADD CONSTRAINT chk_penalty_no_dice
    CHECK (NOT penalty OR (dice1 IS NULL AND dice2 IS NULL AND dice3 IS NULL AND dice4 IS NULL));

-- Make the "only one unthrown non-penalty turn per game" constraint also consider turns that need extra dice.
DROP INDEX idx_one_unthrown_non_penalty_turn_per_game;
CREATE UNIQUE INDEX idx_one_unthrown_non_penalty_turn_per_game
    ON turns (game_id)
    WHERE (thrown_at IS NULL OR needs_extra_dice IS NOT NULL) AND NOT penalty;
