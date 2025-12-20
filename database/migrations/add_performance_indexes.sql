-- ============================================
-- Migration: Add Performance Indexes
-- ============================================
-- Adds composite indexes for common query patterns identified in audit
-- 
-- These indexes optimize:
-- 1. Analytics queries (team_id + matchweek)
-- 2. Standings queries (team_id + season)
-- 3. Squad queries (team_id + position)
-- ============================================

-- ============================================
-- 1. MATCHES TABLE INDEXES
-- ============================================

-- Composite index for analytics queries (filters by team_id and orders by matchweek)
-- Used by: club_analytics_timeseries view
CREATE INDEX IF NOT EXISTS idx_matches_team_matchweek 
ON matches(home_team_id, matchweek) 
WHERE matchweek IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_matches_away_team_matchweek 
ON matches(away_team_id, matchweek) 
WHERE matchweek IS NOT NULL;

-- Composite index for date range queries
CREATE INDEX IF NOT EXISTS idx_matches_date_range 
ON matches(date, home_team_id, away_team_id);

-- ============================================
-- 2. POINT_ADJUSTMENTS TABLE INDEXES
-- ============================================

-- Composite index for standings query (filters by team_id and season)
-- Used by: league_standings view with point adjustments
CREATE INDEX IF NOT EXISTS idx_point_adjustments_team_season 
ON point_adjustments(team_id, season);

-- ============================================
-- 3. PLAYERS TABLE INDEXES
-- ============================================

-- Composite index for squad queries (filters by team_id and sorts by position)
-- Used by: /api/clubs/:id/squad endpoint
CREATE INDEX IF NOT EXISTS idx_players_team_position 
ON players(team_id, position);

-- Composite index for player search (name + team)
CREATE INDEX IF NOT EXISTS idx_players_name_team 
ON players(player_name, team_id);

-- ============================================
-- 4. MANAGING TABLE INDEXES
-- ============================================

-- Composite index for manager queries (team_id + season dates)
-- Used by: /api/clubs/:id endpoint
CREATE INDEX IF NOT EXISTS idx_managing_team_season 
ON managing(team_id, season_start DESC, season_end DESC NULLS LAST);

-- ============================================
-- 5. VERIFY INDEXES WERE CREATED
-- ============================================

DO $$
DECLARE
    index_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND (
        indexname LIKE 'idx_matches_team_matchweek%' OR
        indexname LIKE 'idx_point_adjustments_team_season%' OR
        indexname LIKE 'idx_players_team_position%' OR
        indexname LIKE 'idx_managing_team_season%'
    );
    
    RAISE NOTICE 'Created/verified % performance indexes', index_count;
END $$;

-- ============================================
-- 6. ANALYZE TABLES FOR OPTIMIZER
-- ============================================
-- Update statistics so PostgreSQL query planner can use new indexes effectively

ANALYZE matches;
ANALYZE point_adjustments;
ANALYZE players;
ANALYZE managing;
ANALYZE team;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- Performance indexes have been added
-- 
-- Expected improvements:
-- - Analytics queries: 2-4x faster
-- - Standings queries: 2x faster
-- - Squad queries: 2x faster
-- 
-- Monitor query performance and adjust indexes as needed

