-- Premier League 2023/24 Analytics Hub Database Schema
-- PostgreSQL DDL Script for Supabase
-- Adheres to 3rd Normal Form (3NF) to prevent data anomalies

-- Enable UUID extension (Supabase uses UUIDs by default)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- STADIUMS TABLE
-- ============================================
-- Stores stadium information
-- 3NF Compliant: All attributes are atomic and directly dependent on stadium_id
CREATE TABLE stadiums (
    stadium_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_stadiums_city ON stadiums(city);

-- ============================================
-- CLUBS TABLE
-- ============================================
-- Stores club/team information
-- 3NF Compliant: 
-- - stadium_id is a foreign key (no transitive dependency)
-- - All other attributes directly depend on club_id
CREATE TABLE clubs (
    club_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stadium_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL UNIQUE,
    founded INTEGER CHECK (founded >= 1800 AND founded <= EXTRACT(YEAR FROM NOW())),
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_clubs_stadium 
        FOREIGN KEY (stadium_id) 
        REFERENCES stadiums(stadium_id) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_clubs_stadium ON clubs(stadium_id);
CREATE INDEX idx_clubs_name ON clubs(name);

-- ============================================
-- PLAYERS TABLE
-- ============================================
-- Stores player information
-- 3NF Compliant:
-- - club_id is a foreign key (no transitive dependency)
-- - All other attributes directly depend on player_id
CREATE TABLE players (
    player_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    position VARCHAR(50) NOT NULL CHECK (position IN (
        'Goalkeeper', 'Defender', 'Midfielder', 'Forward'
    )),
    nationality VARCHAR(100) NOT NULL,
    age INTEGER NOT NULL CHECK (age >= 16 AND age <= 50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_players_club 
        FOREIGN KEY (club_id) 
        REFERENCES clubs(club_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_players_club ON players(club_id);
CREATE INDEX idx_players_position ON players(position);
CREATE INDEX idx_players_nationality ON players(nationality);

-- ============================================
-- MATCHES TABLE
-- ============================================
-- Stores match results and details
-- 3NF Compliant:
-- - home_club_id and away_club_id are foreign keys
-- - All attributes directly depend on match_id
-- - No transitive dependencies
CREATE TABLE matches (
    match_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    home_club_id UUID NOT NULL,
    away_club_id UUID NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    home_goals INTEGER NOT NULL DEFAULT 0 CHECK (home_goals >= 0),
    away_goals INTEGER NOT NULL DEFAULT 0 CHECK (away_goals >= 0),
    attendance INTEGER CHECK (attendance >= 0),
    referee VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_matches_home_club 
        FOREIGN KEY (home_club_id) 
        REFERENCES clubs(club_id) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE,
    CONSTRAINT fk_matches_away_club 
        FOREIGN KEY (away_club_id) 
        REFERENCES clubs(club_id) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE,
    CONSTRAINT chk_different_clubs 
        CHECK (home_club_id != away_club_id)
);

-- Indexes for performance (critical for standings calculations)
CREATE INDEX idx_matches_home_club ON matches(home_club_id);
CREATE INDEX idx_matches_away_club ON matches(away_club_id);
CREATE INDEX idx_matches_date ON matches(date);
CREATE INDEX idx_matches_clubs_date ON matches(home_club_id, away_club_id, date);

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
CREATE TRIGGER update_stadiums_updated_at
    BEFORE UPDATE ON stadiums
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clubs_updated_at
    BEFORE UPDATE ON clubs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_players_updated_at
    BEFORE UPDATE ON players
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matches_updated_at
    BEFORE UPDATE ON matches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VIEW: League Standings (Dynamic Calculation)
-- ============================================
-- This view calculates league standings dynamically from match results
-- No static data needed - all calculated from matches table
-- Handles all clubs, even those with no matches (shows 0 for all stats)
CREATE OR REPLACE VIEW league_standings AS
WITH match_stats AS (
    -- Home matches
    SELECT 
        home_club_id AS club_id,
        CASE 
            WHEN home_goals > away_goals THEN 3
            WHEN home_goals = away_goals THEN 1
            ELSE 0
        END AS points,
        CASE WHEN home_goals > away_goals THEN 1 ELSE 0 END AS wins,
        CASE WHEN home_goals = away_goals THEN 1 ELSE 0 END AS draws,
        CASE WHEN home_goals < away_goals THEN 1 ELSE 0 END AS losses,
        home_goals AS goals_for,
        away_goals AS goals_against
    FROM matches
    
    UNION ALL
    
    -- Away matches
    SELECT 
        away_club_id AS club_id,
        CASE 
            WHEN away_goals > home_goals THEN 3
            WHEN away_goals = home_goals THEN 1
            ELSE 0
        END AS points,
        CASE WHEN away_goals > home_goals THEN 1 ELSE 0 END AS wins,
        CASE WHEN away_goals = home_goals THEN 1 ELSE 0 END AS draws,
        CASE WHEN away_goals < home_goals THEN 1 ELSE 0 END AS losses,
        away_goals AS goals_for,
        home_goals AS goals_against
    FROM matches
),
club_aggregates AS (
    SELECT 
        club_id,
        SUM(points) AS total_points,
        SUM(wins) AS wins,
        SUM(draws) AS draws,
        SUM(losses) AS losses,
        SUM(goals_for) AS goals_for,
        SUM(goals_against) AS goals_against,
        SUM(goals_for) - SUM(goals_against) AS goal_difference,
        COUNT(*) AS matches_played
    FROM match_stats
    GROUP BY club_id
)
SELECT 
    c.club_id,
    c.name AS club,
    COALESCE(ca.matches_played, 0) AS mp,
    COALESCE(ca.wins, 0) AS w,
    COALESCE(ca.draws, 0) AS d,
    COALESCE(ca.losses, 0) AS l,
    COALESCE(ca.goals_for, 0) AS gf,
    COALESCE(ca.goals_against, 0) AS ga,
    COALESCE(ca.goal_difference, 0) AS gd,
    COALESCE(ca.total_points, 0) AS pts
FROM clubs c
LEFT JOIN club_aggregates ca ON c.club_id = ca.club_id
ORDER BY 
    COALESCE(ca.total_points, 0) DESC,
    COALESCE(ca.goal_difference, 0) DESC;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================
COMMENT ON TABLE stadiums IS 'Stores stadium information for Premier League clubs';
COMMENT ON TABLE clubs IS 'Stores Premier League club/team information';
COMMENT ON TABLE players IS 'Stores player information and their club associations';
COMMENT ON TABLE matches IS 'Stores match results and details for Premier League fixtures';
COMMENT ON VIEW league_standings IS 'Dynamically calculates Premier League standings from match results. Includes all clubs (even with no matches). Columns: club_id, club, mp, w, d, l, gf, ga, gd, pts. Ordered by pts DESC, gd DESC.';

COMMENT ON COLUMN matches.home_goals IS 'Goals scored by home team';
COMMENT ON COLUMN matches.away_goals IS 'Goals scored by away team';
COMMENT ON COLUMN matches.attendance IS 'Number of spectators at the match';

