-- ============================================
-- VIEW: League Standings (Dynamic Calculation)
-- ============================================
-- This view calculates Premier League standings dynamically from match results
-- No static data needed - all calculated from matches table
-- Handles all clubs, even those with no matches (shows 0 for all stats)
-- 
-- Columns:
--   club_id: UUID of the club
--   club: Club name
--   mp: Matches played
--   w: Wins
--   d: Draws
--   l: Losses
--   gf: Goals for
--   ga: Goals against
--   gd: Goal difference (gf - ga)
--   pts: Points (3 for win, 1 for draw, 0 for loss)
--
-- Ordering: pts DESC, gd DESC
-- ============================================

CREATE OR REPLACE VIEW league_standings AS
WITH match_stats AS (
    -- Home matches: Calculate points, wins, draws, losses, goals for/against
    SELECT 
        home_club_id AS club_id,
        CASE 
            WHEN home_goals > away_goals THEN 3  -- Win
            WHEN home_goals = away_goals THEN 1   -- Draw
            ELSE 0                                 -- Loss
        END AS points,
        CASE WHEN home_goals > away_goals THEN 1 ELSE 0 END AS wins,
        CASE WHEN home_goals = away_goals THEN 1 ELSE 0 END AS draws,
        CASE WHEN home_goals < away_goals THEN 1 ELSE 0 END AS losses,
        home_goals AS goals_for,
        away_goals AS goals_against
    FROM matches
    
    UNION ALL
    
    -- Away matches: Calculate points, wins, draws, losses, goals for/against
    SELECT 
        away_club_id AS club_id,
        CASE 
            WHEN away_goals > home_goals THEN 3  -- Win
            WHEN away_goals = home_goals THEN 1 -- Draw
            ELSE 0                               -- Loss
        END AS points,
        CASE WHEN away_goals > home_goals THEN 1 ELSE 0 END AS wins,
        CASE WHEN away_goals = home_goals THEN 1 ELSE 0 END AS draws,
        CASE WHEN away_goals < home_goals THEN 1 ELSE 0 END AS losses,
        away_goals AS goals_for,
        home_goals AS goals_against
    FROM matches
),
club_aggregates AS (
    -- Aggregate match statistics for each club
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
-- Final SELECT: Join with clubs table to include all clubs, even those with no matches
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
    COALESCE(ca.total_points, 0) DESC,  -- Primary sort: Points (highest first)
    COALESCE(ca.goal_difference, 0) DESC; -- Secondary sort: Goal difference (highest first)

-- Add comment to view
COMMENT ON VIEW league_standings IS 'Dynamically calculates Premier League standings from match results. Includes all clubs (even with no matches). Columns: club_id, club, mp, w, d, l, gf, ga, gd, pts. Ordered by pts DESC, gd DESC.';

