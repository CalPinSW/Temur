-- ============================================
-- BOARD POSITION FOR VISUAL TEAM ASSIGNMENT
-- ============================================
-- Normalized (0-1) coordinates of a player within their team's box on the
-- drag-and-drop team assignment board. NULL means the player hasn't been
-- manually placed yet (the board falls back to an auto-generated layout).
ALTER TABLE player_games ADD COLUMN board_x DOUBLE PRECISION;
ALTER TABLE player_games ADD COLUMN board_y DOUBLE PRECISION;
