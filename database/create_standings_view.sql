-- ============================================
-- VIEW: League Standings (Dynamic Calculation)
-- ============================================
-- This view calculates league standings dynamically from match results
-- Uses team and matches tables with the following schema:
--   team: team_id, team_name
--   matches: home_team_id, away_team_id, home_team_score, away_team_score
-- 
-- Calculated columns:
--   team_id: UUID of the team
--   team_name: Name of the team
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
    COALESCE(ta.goal_difference, 0) DESC; -- Secondary sort: Goal difference (highest first)

-- Add comment to view
COMMENT ON VIEW league_standings IS 'Dynamically calculates league standings from match results. Uses team and matches tables. Columns: team_id, team_name, mp, w, d, l, gf, ga, gd, pts. Ordered by pts DESC, gd DESC.';

