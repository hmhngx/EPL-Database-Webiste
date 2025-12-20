-- Premier League 2023/24 Analytics Hub Database Schema (CORRECTED)
-- PostgreSQL DDL Script for Supabase
-- Adheres to 3rd Normal Form (3NF) to prevent data anomalies
-- 
-- CORRECTED VERSION: Uses 'team' table (not 'clubs') to match backend application
-- All column names match backend expectations

-- Enable UUID extension (Supabase uses UUIDs by default)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- STADIUMS TABLE
-- ============================================
-- Stores stadium information
CREATE TABLE IF NOT EXISTS stadiums (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stadium_name VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_stadiums_city ON stadiums(city);
CREATE INDEX IF NOT EXISTS idx_stadiums_name ON stadiums(stadium_name);

-- ============================================
-- TEAM TABLE (CORRECTED: was 'clubs' in original schema)
-- ============================================
-- Stores club/team information
-- NOTE: Application uses 'team' table, not 'clubs'
CREATE TABLE IF NOT EXISTS team (
    team_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stadium_id UUID NOT NULL,
    team_name VARCHAR(255) NOT NULL UNIQUE,
    founded_year INTEGER CHECK (founded_year >= 1800 AND founded_year <= EXTRACT(YEAR FROM NOW())),
    logo_url TEXT,
    captain_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_team_stadium 
        FOREIGN KEY (stadium_id) 
        REFERENCES stadiums(id) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_stadium ON team(stadium_id);
CREATE INDEX IF NOT EXISTS idx_team_name ON team(team_name);
CREATE INDEX IF NOT EXISTS idx_team_captain ON team(captain_id);

-- ============================================
-- PLAYERS TABLE
-- ============================================
-- Stores player information
CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL,
    player_name VARCHAR(255) NOT NULL,
    position VARCHAR(50) NOT NULL CHECK (position IN (
        'Goalkeeper', 'Defender', 'Midfielder', 'Forward'
    )),
    nationality VARCHAR(100) NOT NULL,
    age INTEGER NOT NULL CHECK (age >= 16 AND age <= 50),
    jersey_number INTEGER CHECK (jersey_number >= 1 AND jersey_number <= 99),
    height INTEGER CHECK (height > 0 AND height < 300), -- height in cm
    weight INTEGER CHECK (weight > 0 AND weight < 200), -- weight in kg
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_players_team 
        FOREIGN KEY (team_id) 
        REFERENCES team(team_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_players_team ON players(team_id);
CREATE INDEX IF NOT EXISTS idx_players_position ON players(position);
CREATE INDEX IF NOT EXISTS idx_players_nationality ON players(nationality);
CREATE INDEX IF NOT EXISTS idx_players_name ON players(player_name);
CREATE INDEX IF NOT EXISTS idx_players_team_position ON players(team_id, position); -- Composite for squad queries

-- Add foreign key constraint for team.captain_id (self-referential through players)
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

-- ============================================
-- MATCHES TABLE
-- ============================================
-- Stores match results and details
-- CORRECTED: Uses home_team_id, away_team_id, home_team_score, away_team_score, matchweek
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    home_team_id UUID NOT NULL,
    away_team_id UUID NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    home_team_score INTEGER NOT NULL DEFAULT 0 CHECK (home_team_score >= 0),
    away_team_score INTEGER NOT NULL DEFAULT 0 CHECK (away_team_score >= 0),
    matchweek INTEGER CHECK (matchweek >= 1 AND matchweek <= 38),
    attendance INTEGER CHECK (attendance >= 0),
    referee VARCHAR(255),
    youtube_id VARCHAR(11), -- YouTube video ID (11 characters)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_matches_home_team 
        FOREIGN KEY (home_team_id) 
        REFERENCES team(team_id) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE,
    CONSTRAINT fk_matches_away_team 
        FOREIGN KEY (away_team_id) 
        REFERENCES team(team_id) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE,
    CONSTRAINT chk_different_teams 
        CHECK (home_team_id != away_team_id)
);

-- Indexes for performance (critical for standings calculations)
CREATE INDEX IF NOT EXISTS idx_matches_home_team ON matches(home_team_id);
CREATE INDEX IF NOT EXISTS idx_matches_away_team ON matches(away_team_id);
CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(date);
CREATE INDEX IF NOT EXISTS idx_matches_matchweek ON matches(matchweek);
CREATE INDEX IF NOT EXISTS idx_matches_teams_date ON matches(home_team_id, away_team_id, date);
CREATE INDEX IF NOT EXISTS idx_matches_team_matchweek ON matches(home_team_id, matchweek); -- Composite for analytics
CREATE INDEX IF NOT EXISTS idx_matches_youtube_id ON matches(youtube_id) WHERE youtube_id IS NOT NULL;

-- ============================================
-- POINT_ADJUSTMENTS TABLE
-- ============================================
-- Stores point adjustments (deductions/additions) for teams
CREATE TABLE IF NOT EXISTS point_adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL,
    adjustment INTEGER NOT NULL,
    season VARCHAR(9) NOT NULL, -- Format: '2023/24'
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_point_adjustments_team 
        FOREIGN KEY (team_id) 
        REFERENCES team(team_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_point_adjustments_team ON point_adjustments(team_id);
CREATE INDEX IF NOT EXISTS idx_point_adjustments_season ON point_adjustments(season);
CREATE INDEX IF NOT EXISTS idx_point_adjustments_team_season ON point_adjustments(team_id, season); -- Composite for standings query

-- ============================================
-- MANAGERS TABLE (Optional)
-- ============================================
CREATE TABLE IF NOT EXISTS managers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manager_name VARCHAR(255) NOT NULL,
    nationality VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_managers_name ON managers(manager_name);

-- ============================================
-- MANAGING TABLE (Optional)
-- ============================================
-- Stores manager-club associations with season dates
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

-- ============================================
-- FUNCTION: Update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update updated_at
DROP TRIGGER IF EXISTS update_stadiums_updated_at ON stadiums;
CREATE TRIGGER update_stadiums_updated_at
    BEFORE UPDATE ON stadiums
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_team_updated_at ON team;
CREATE TRIGGER update_team_updated_at
    BEFORE UPDATE ON team
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_players_updated_at ON players;
CREATE TRIGGER update_players_updated_at
    BEFORE UPDATE ON players
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_matches_updated_at ON matches;
CREATE TRIGGER update_matches_updated_at
    BEFORE UPDATE ON matches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_point_adjustments_updated_at ON point_adjustments;
CREATE TRIGGER update_point_adjustments_updated_at
    BEFORE UPDATE ON point_adjustments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

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
-- VIEW: League Standings (Dynamic Calculation)
-- ============================================
-- CORRECTED: Uses 'team' table and correct column names
-- Includes all three tie-breakers: Points → GD → Goals For
CREATE OR REPLACE VIEW league_standings AS
WITH match_stats AS (
    -- Home matches: Calculate points, wins, draws, losses, goals for/against
    SELECT 
        home_team_id AS team_id,
        CASE 
            WHEN home_team_score > away_team_score THEN 3  -- Win
            WHEN home_team_score = away_team_score THEN 1  -- Draw
            ELSE 0                                           -- Loss
        END AS points,
        CASE WHEN home_team_score > away_team_score THEN 1 ELSE 0 END AS wins,
        CASE WHEN home_team_score = away_team_score THEN 1 ELSE 0 END AS draws,
        CASE WHEN home_team_score < away_team_score THEN 1 ELSE 0 END AS losses,
        home_team_score AS goals_for,
        away_team_score AS goals_against
    FROM matches
    
    UNION ALL
    
    -- Away matches: Calculate points, wins, draws, losses, goals for/against
    SELECT 
        away_team_id AS team_id,
        CASE 
            WHEN away_team_score > home_team_score THEN 3  -- Win
            WHEN away_team_score = home_team_score THEN 1  -- Draw
            ELSE 0                                          -- Loss
        END AS points,
        CASE WHEN away_team_score > home_team_score THEN 1 ELSE 0 END AS wins,
        CASE WHEN away_team_score = home_team_score THEN 1 ELSE 0 END AS draws,
        CASE WHEN away_team_score < home_team_score THEN 1 ELSE 0 END AS losses,
        away_team_score AS goals_for,
        home_team_score AS goals_against
    FROM matches
),
team_aggregates AS (
    -- Aggregate match statistics for each team
    SELECT 
        team_id,
        SUM(points) AS total_points,
        SUM(wins) AS wins,
        SUM(draws) AS draws,
        SUM(losses) AS losses,
        SUM(goals_for) AS goals_for,
        SUM(goals_against) AS goals_against,
        SUM(goals_for) - SUM(goals_against) AS goal_difference,
        COUNT(*) AS matches_played
    FROM match_stats
    GROUP BY team_id
)
-- Final SELECT: Join with team table to include all teams, even those with no matches
SELECT 
    t.team_id,
    t.team_name,
    COALESCE(ta.matches_played, 0) AS mp,
    COALESCE(ta.wins, 0) AS w,
    COALESCE(ta.draws, 0) AS d,
    COALESCE(ta.losses, 0) AS l,
    COALESCE(ta.goals_for, 0) AS gf,
    COALESCE(ta.goals_against, 0) AS ga,
    COALESCE(ta.goal_difference, 0) AS gd,
    COALESCE(ta.total_points, 0) AS pts
FROM team t
LEFT JOIN team_aggregates ta ON t.team_id = ta.team_id
ORDER BY 
    COALESCE(ta.total_points, 0) DESC,  -- Primary sort: Points (highest first)
    COALESCE(ta.goal_difference, 0) DESC, -- Secondary sort: Goal difference (highest first)
    COALESCE(ta.goals_for, 0) DESC; -- Tertiary sort: Goals for (highest first) - CORRECTED: Added missing tie-breaker

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================
COMMENT ON TABLE stadiums IS 'Stores stadium information for Premier League clubs';
COMMENT ON TABLE team IS 'Stores Premier League club/team information (CORRECTED: uses team, not clubs)';
COMMENT ON TABLE players IS 'Stores player information and their team associations';
COMMENT ON TABLE matches IS 'Stores match results and details for Premier League fixtures';
COMMENT ON TABLE point_adjustments IS 'Stores point adjustments (deductions/additions) for teams. Used for PSR breaches.';
COMMENT ON VIEW league_standings IS 'Dynamically calculates Premier League standings from match results. Uses team table. Columns: team_id, team_name, mp, w, d, l, gf, ga, gd, pts. Ordered by pts DESC, gd DESC, gf DESC.';

COMMENT ON COLUMN matches.home_team_score IS 'Goals scored by home team';
COMMENT ON COLUMN matches.away_team_score IS 'Goals scored by away team';
COMMENT ON COLUMN matches.attendance IS 'Number of spectators at the match';
COMMENT ON COLUMN matches.matchweek IS 'Gameweek number (1-38)';
COMMENT ON COLUMN matches.youtube_id IS 'YouTube video ID (11 characters) for match highlights';

