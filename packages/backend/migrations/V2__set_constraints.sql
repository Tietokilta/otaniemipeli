ALTER TABLE games
DROP CONSTRAINT IF EXISTS games_board_id_fkey,
ADD CONSTRAINT games_board_id_fkey
    FOREIGN KEY (board_id)
    REFERENCES boards(board_id)
    ON DELETE CASCADE;

ALTER TABLE teams
DROP CONSTRAINT IF EXISTS teams_game_id_fkey,
ADD CONSTRAINT teams_game_id_fkey
    FOREIGN KEY (game_id)
    REFERENCES games(game_id)
    ON DELETE CASCADE;

ALTER TABLE turns
DROP CONSTRAINT IF EXISTS turns_team_id_fkey,
ADD CONSTRAINT turns_team_id_fkey
    FOREIGN KEY (team_id)
    REFERENCES teams(team_id)
    ON DELETE CASCADE,
DROP CONSTRAINT IF EXISTS turns_game_id_fkey,
ADD CONSTRAINT turns_game_id_fkey
    FOREIGN KEY (game_id)
    REFERENCES games(game_id)
    ON DELETE CASCADE;

ALTER TABLE drink_ingredients
DROP CONSTRAINT IF EXISTS drink_ingredients_drink_id_fkey,
ADD CONSTRAINT drink_ingredients_drink_id_fkey
    FOREIGN KEY (drink_id)
    REFERENCES drinks(drink_id)
    ON DELETE CASCADE,
DROP CONSTRAINT IF EXISTS drink_ingredients_ingredient_id_fkey,
ADD CONSTRAINT drink_ingredients_ingredient_id_fkey
    FOREIGN KEY (ingredient_id)
    REFERENCES ingredients(ingredient_id)
    ON DELETE CASCADE;

ALTER TABLE turn_drinks
DROP CONSTRAINT IF EXISTS turn_drinks_drink_id_fkey,
ADD CONSTRAINT turn_drinks_drink_id_fkey
    FOREIGN KEY (drink_id)
    REFERENCES drinks(drink_id)
    ON DELETE CASCADE,
DROP CONSTRAINT IF EXISTS turn_drinks_turn_id_fkey,
ADD CONSTRAINT turn_drinks_turn_id_fkey
    FOREIGN KEY (turn_id)
    REFERENCES turns(turn_id)
    ON DELETE CASCADE;

ALTER TABLE penalties
DROP CONSTRAINT IF EXISTS penalties_team_id_fkey,
ADD CONSTRAINT penalties_team_id_fkey
    FOREIGN KEY (team_id)
    REFERENCES teams(team_id)
    ON DELETE CASCADE,
DROP CONSTRAINT IF EXISTS penalties_turn_id_fkey,
ADD CONSTRAINT penalties_turn_id_fkey
    FOREIGN KEY (turn_id)
    REFERENCES turns(turn_id)
    ON DELETE CASCADE,
DROP CONSTRAINT IF EXISTS penalties_drink_id_fkey,
ADD CONSTRAINT penalties_drink_id_fkey
    FOREIGN KEY (drink_id)
    REFERENCES drinks(drink_id)
    ON DELETE CASCADE;

ALTER TABLE user_types
    DROP CONSTRAINT IF EXISTS user_types_uid_type_uniq,
    ADD CONSTRAINT user_types_uid_type_uniq UNIQUE (uid, user_type);