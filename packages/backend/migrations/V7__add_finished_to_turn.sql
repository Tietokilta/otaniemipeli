ALTER TABLE turns
    ADD COLUMN finished boolean;
UPDATE turns
SET finished = FALSE
WHERE finished IS NULL;
ALTER TABLE games
    ADD COLUMN end_time TIMESTAMPTZ;