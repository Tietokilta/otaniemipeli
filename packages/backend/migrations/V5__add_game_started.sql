ALTER TABLE games
    ADD COLUMN started boolean;

UPDATE games
SET started = FALSE
WHERE started IS NULL;

ALTER TABLE games
    ALTER COLUMN started SET DEFAULT FALSE;
ALTER TABLE games
    ALTER COLUMN started SET NOT NULL;