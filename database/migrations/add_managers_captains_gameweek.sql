-- ============================================
-- Migration: Add Managers, Captains, Gameweek, and Additional Player Fields
-- ============================================
-- This migration adds new features from the proposed schema while maintaining
-- compatibility with the existing UUID-based schema structure.
--
-- Changes:
-- 1. Add managers table (NEW)
-- 2. Add managing history table (NEW)
-- 3. Add captain_id to clubs table (NEW)
-- 4. Add gameweek column to matches table (NEW - currently calculated dynamically)
-- 5. Add jersey_number, height, weight to players table (NEW)
--
-- Note: This migration maintains UUID primary keys and existing column naming
-- conventions (home_goals/away_goals, not home_score/away_score)
-- ============================================

-- ============================================
-- 1. MANAGERS TABLE
-- ============================================
-- Stores manager information
CREATE TABLE IF NOT EXISTS managers (
    manager_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_managers_name ON managers(name);

-- Add comment
COMMENT ON TABLE managers IS 'Stores manager information for Premier League clubs';

-- ============================================
-- 2. MANAGING HISTORY TABLE
-- ============================================
-- Stores manager-club associations with season dates
CREATE TABLE IF NOT EXISTS managing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manager_id UUID NOT NULL,
    club_id UUID NOT NULL,
    season_start DATE,
    season_end DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_managing_manager 
        FOREIGN KEY (manager_id) 
        REFERENCES managers(manager_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    CONSTRAINT fk_managing_club 
        FOREIGN KEY (club_id) 
        REFERENCES clubs(club_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_managing_manager ON managing(manager_id);
CREATE INDEX IF NOT EXISTS idx_managing_club ON managing(club_id);
CREATE INDEX IF NOT EXISTS idx_managing_dates ON managing(season_start, season_end);

-- Add comment
COMMENT ON TABLE managing IS 'Stores manager-club associations with season start/end dates';

-- ============================================
-- 3. ADD CAPTAIN_ID TO CLUBS TABLE
-- ============================================
-- Add captain_id column (nullable initially to avoid circular dependency issues)
ALTER TABLE clubs 
ADD COLUMN IF NOT EXISTS captain_id UUID;

-- Add foreign key constraint (deferred to avoid circular dependency during initial setup)
-- Note: This creates a self-referential relationship through players table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_club_captain'
    ) THEN
        ALTER TABLE clubs 
        ADD CONSTRAINT fk_club_captain 
        FOREIGN KEY (captain_id) 
        REFERENCES players(player_id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
    END IF;
END $$;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_clubs_captain ON clubs(captain_id);

-- Add comment
COMMENT ON COLUMN clubs.captain_id IS 'References the player_id of the club captain (self-referential through players table)';

-- ============================================
-- 4. ADD GAMEWEEK TO MATCHES TABLE
-- ============================================
-- Add gameweek column (currently calculated dynamically in application code)
ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS gameweek INTEGER CHECK (gameweek >= 1 AND gameweek <= 38);

-- Index for faster filtering (gameweek is used in queries)
CREATE INDEX IF NOT EXISTS idx_matches_gameweek ON matches(gameweek);

-- Add comment
COMMENT ON COLUMN matches.gameweek IS 'Gameweek number (1-38). Can be calculated from date if not provided.';

-- ============================================
-- 5. ADD ADDITIONAL FIELDS TO PLAYERS TABLE
-- ============================================
-- Add jersey_number, height, weight columns
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS jersey_number INTEGER CHECK (jersey_number >= 1 AND jersey_number <= 99);

ALTER TABLE players 
ADD COLUMN IF NOT EXISTS height INTEGER CHECK (height > 0 AND height < 300); -- height in cm

ALTER TABLE players 
ADD COLUMN IF NOT EXISTS weight INTEGER CHECK (weight > 0 AND weight < 200); -- weight in kg

-- Index for jersey_number lookups
CREATE INDEX IF NOT EXISTS idx_players_jersey ON players(club_id, jersey_number);

-- Add comments
COMMENT ON COLUMN players.jersey_number IS 'Player jersey number (1-99)';
COMMENT ON COLUMN players.height IS 'Player height in centimeters';
COMMENT ON COLUMN players.weight IS 'Player weight in kilograms';

-- ============================================
-- 6. ADD TRIGGERS FOR NEW TABLES
-- ============================================
-- Ensure update_updated_at_column function exists (from main schema)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for managers and managing tables
DROP TRIGGER IF EXISTS update_managers_updated_at ON managers;
CREATE TRIGGER update_managers_updated_at
    BEFORE UPDATE ON managers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_managing_updated_at ON managing;
CREATE TRIGGER update_managing_updated_at
    BEFORE UPDATE ON managing
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- All new features have been added while maintaining compatibility
-- with the existing UUID-based schema structure.

