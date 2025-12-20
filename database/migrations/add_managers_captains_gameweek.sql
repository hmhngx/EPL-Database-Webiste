-- ============================================
-- Migration: Add Managers, Captains, Gameweek, and Additional Player Fields (CORRECTED)
-- ============================================
-- This migration adds new features while maintaining compatibility with the existing schema.
--
-- CORRECTED: Uses 'team' table (not 'clubs'), correct column names, correct foreign key references
--
-- Changes:
-- 1. Add managers table (NEW)
-- 2. Add managing history table (NEW) - references team, not clubs
-- 3. Add captain_id to team table (NEW) - references players(id)
-- 4. Add matchweek column to matches table (NEW)
-- 5. Add jersey_number, height, weight to players table (NEW)
-- ============================================

-- ============================================
-- 1. MANAGERS TABLE
-- ============================================
-- Stores manager information
CREATE TABLE IF NOT EXISTS managers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manager_name VARCHAR(255) NOT NULL,
    nationality VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_managers_name ON managers(manager_name);

-- Add comment
COMMENT ON TABLE managers IS 'Stores manager information for Premier League clubs';

-- ============================================
-- 2. MANAGING HISTORY TABLE
-- ============================================
-- Stores manager-team associations with season dates
-- CORRECTED: References team(team_id), not clubs(club_id)
CREATE TABLE IF NOT EXISTS managing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manager_id UUID NOT NULL,
    team_id UUID NOT NULL, -- CORRECTED: references team, not clubs
    season_start DATE,
    season_end DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_managing_manager 
        FOREIGN KEY (manager_id) 
        REFERENCES managers(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    CONSTRAINT fk_managing_team 
        FOREIGN KEY (team_id) 
        REFERENCES team(team_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_managing_manager ON managing(manager_id);
CREATE INDEX IF NOT EXISTS idx_managing_team ON managing(team_id);
CREATE INDEX IF NOT EXISTS idx_managing_dates ON managing(season_start, season_end);

-- Add comment
COMMENT ON TABLE managing IS 'Stores manager-team associations with season start/end dates';

-- ============================================
-- 3. ADD CAPTAIN_ID TO TEAM TABLE
-- ============================================
-- Add captain_id column (nullable initially to avoid circular dependency issues)
-- CORRECTED: Already exists in schema, but ensure foreign key is correct
ALTER TABLE team 
ADD COLUMN IF NOT EXISTS captain_id UUID;

-- Add foreign key constraint (deferred to avoid circular dependency during initial setup)
-- CORRECTED: References players(id), not players(player_id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_team_captain'
    ) THEN
        ALTER TABLE team 
        ADD CONSTRAINT fk_team_captain 
        FOREIGN KEY (captain_id) 
        REFERENCES players(id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
    END IF;
END $$;

-- Index for faster lookups (may already exist)
CREATE INDEX IF NOT EXISTS idx_team_captain ON team(captain_id);

-- Add comment
COMMENT ON COLUMN team.captain_id IS 'References the id of the team captain from players table';

-- ============================================
-- 4. ADD MATCHWEEK TO MATCHES TABLE
-- ============================================
-- Add matchweek column (CORRECTED: uses matchweek, not gameweek)
ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS matchweek INTEGER CHECK (matchweek >= 1 AND matchweek <= 38);

-- Index for faster filtering (matchweek is used in queries)
CREATE INDEX IF NOT EXISTS idx_matches_matchweek ON matches(matchweek);
CREATE INDEX IF NOT EXISTS idx_matches_team_matchweek ON matches(home_team_id, matchweek); -- Composite for analytics

-- Add comment
COMMENT ON COLUMN matches.matchweek IS 'Matchweek number (1-38). Can be calculated from date if not provided.';

-- ============================================
-- 5. ADD ADDITIONAL FIELDS TO PLAYERS TABLE
-- ============================================
-- Add jersey_number, height, weight columns (may already exist)
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS jersey_number INTEGER CHECK (jersey_number >= 1 AND jersey_number <= 99);

ALTER TABLE players 
ADD COLUMN IF NOT EXISTS height INTEGER CHECK (height > 0 AND height < 300); -- height in cm

ALTER TABLE players 
ADD COLUMN IF NOT EXISTS weight INTEGER CHECK (weight > 0 AND weight < 200); -- weight in kg

-- Index for jersey_number lookups (may already exist)
CREATE INDEX IF NOT EXISTS idx_players_jersey ON players(team_id, jersey_number);

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
-- with the existing team-based schema structure.

