-- ============================================
-- ADD ADMIN COLUMN TO PROFILES
-- ============================================
ALTER TABLE profiles ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX idx_profiles_is_admin ON profiles(is_admin) WHERE is_admin = true;

-- ============================================
-- GAMES TABLE
-- ============================================
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_description TEXT,
  players_per_team INT NOT NULL,
  team1_name TEXT NOT NULL,
  team2_name TEXT NOT NULL,
  kickoff_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  visible_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
);

-- ============================================
-- PLAYER GAMES TABLE
-- ============================================
CREATE TABLE player_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  signup_order INTEGER NOT NULL,
  team INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(game_id, user_id),
  UNIQUE(game_id, signup_order)
);

-- ============================================
-- PLAYER RATINGS TABLE
-- ============================================
CREATE TABLE player_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_game_id UUID NOT NULL REFERENCES player_games(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL,
  rated_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(player_game_id, rated_by)
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_ratings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- GAMES POLICIES
-- ============================================
-- All authenticated users can view games
CREATE POLICY "Games are viewable by authenticated users"
  ON games FOR SELECT
  TO authenticated
  USING (true);

-- Only admin users can create games
CREATE POLICY "Admins can create games"
  ON games FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Only admin users can update games
CREATE POLICY "Admins can update games"
  ON games FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Only admin users can delete games
CREATE POLICY "Admins can delete games"
  ON games FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- ============================================
-- PLAYER GAMES POLICIES
-- ============================================
-- All authenticated users can view player games
CREATE POLICY "Player games are viewable by authenticated users"
  ON player_games FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can sign up for games (insert their own record)
CREATE POLICY "Users can sign up for games"
  ON player_games FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own game signups
CREATE POLICY "Users can update their own game signups"
  ON player_games FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own game signups
CREATE POLICY "Users can delete their own game signups"
  ON player_games FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can update any player game signups (for team assignment)
CREATE POLICY "Admins can update player game signups"
  ON player_games FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );


-- ============================================
-- PLAYER RATINGS POLICIES
-- ============================================
-- All authenticated users can view ratings
CREATE POLICY "Player ratings are viewable by authenticated users"
  ON player_ratings FOR SELECT
  TO authenticated
  USING (true);

-- Users can create ratings for other players (not themselves)
CREATE POLICY "Users can rate other players"
  ON player_ratings FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = rated_by
    AND NOT EXISTS (
      SELECT 1 FROM player_games
      WHERE player_games.id = player_game_id
      AND player_games.user_id = auth.uid()
    )
  );

-- Users can update their own ratings
CREATE POLICY "Users can update their own ratings"
  ON player_ratings FOR UPDATE
  TO authenticated
  USING (auth.uid() = rated_by)
  WITH CHECK (auth.uid() = rated_by);

-- Users can delete their own ratings
CREATE POLICY "Users can delete their own ratings"
  ON player_ratings FOR DELETE
  TO authenticated
  USING (auth.uid() = rated_by);


