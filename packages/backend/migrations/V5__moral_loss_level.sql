-- Replace moral_victory_eligible BOOLEAN with moral_loss_level INTEGER.
-- false (not eligible) becomes 1, true (eligible) becomes 0.
ALTER TABLE teams
    ADD COLUMN moral_loss_level INTEGER NOT NULL DEFAULT 0;

UPDATE teams SET moral_loss_level = CASE WHEN moral_victory_eligible THEN 0 ELSE 1 END;

ALTER TABLE teams
    DROP COLUMN moral_victory_eligible;
