-- ============================================
-- Migration: Create club_analytics_timeseries view (CORRECTED)
-- ============================================
-- Creates a PostgreSQL view that replicates Power BI DAX logic for 'LeaguePositionByMatchweek'
-- This view unpivots matches and calculates cumulative statistics with position ranking
-- 
-- CORRECTED: Uses 'team' table and correct column names (team_id, team_name, home_team_id, etc.)
-- 
-- USAGE:
-- Run this SQL in your Supabase SQL Editor or via psql
-- ============================================

-- Drop view if exists (for idempotent migration)
DROP VIEW IF EXISTS club_analytics_timeseries;

-- Create the view
CREATE VIEW club_analytics_timeseries AS
WITH points_by_matchweek AS (
  -- Unpivot matches: Create one row per team per match (Home and Away)
  -- CORRECTED: Uses home_team_id, away_team_id, home_team_score, away_team_score, matchweek
  SELECT 
    m.matchweek,
    m.date,
    m.id AS match_id,
    m.home_team_id AS team_id,
    'Home' AS venue,
    m.home_team_score AS goals_scored,
    m.away_team_score AS goals_conceded,
    CASE 
      WHEN m.home_team_score > m.away_team_score THEN 3  -- Win
      WHEN m.home_team_score = m.away_team_score THEN 1  -- Draw
      ELSE 0  -- Loss
    END AS points,
    CASE 
      WHEN m.home_team_score > m.away_team_score THEN 'W'
      WHEN m.home_team_score = m.away_team_score THEN 'D'
      ELSE 'L'
    END AS result,
    a.team_name AS opponent_name
  FROM matches m
  INNER JOIN team a ON m.away_team_id = a.team_id
  WHERE m.matchweek IS NOT NULL
  
  UNION ALL
  
  SELECT 
    m.matchweek,
    m.date,
    m.id AS match_id,
    m.away_team_id AS team_id,
    'Away' AS venue,
    m.away_team_score AS goals_scored,
    m.home_team_score AS goals_conceded,
    CASE 
      WHEN m.away_team_score > m.home_team_score THEN 3  -- Win
      WHEN m.away_team_score = m.home_team_score THEN 1  -- Draw
      ELSE 0  -- Loss
    END AS points,
    CASE 
      WHEN m.away_team_score > m.home_team_score THEN 'W'
      WHEN m.away_team_score = m.home_team_score THEN 'D'
      ELSE 'L'
    END AS result,
    h.team_name AS opponent_name
  FROM matches m
  INNER JOIN team h ON m.home_team_id = h.team_id
  WHERE m.matchweek IS NOT NULL
),
team_adjustments AS (
  -- Get total point adjustments per team for the season
  SELECT 
    team_id,
    COALESCE(SUM(adjustment), 0) AS total_adjustment
  FROM point_adjustments
  WHERE season = '2023/24'  -- Adjust season as needed
  GROUP BY team_id
),
cumulative_stats AS (
  SELECT 
    pbm.team_id,
    pbm.matchweek,
    pbm.date,
    pbm.match_id,
    pbm.venue,
    pbm.goals_scored,
    pbm.goals_conceded,
    pbm.points,
    pbm.result,
    pbm.opponent_name,
    -- Calculate cumulative points (including point adjustments from start)
    SUM(pbm.points) OVER (
      PARTITION BY pbm.team_id 
      ORDER BY pbm.matchweek, pbm.date
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) + COALESCE(ta.total_adjustment, 0) AS cumulative_points,
    -- Calculate cumulative goal difference
    SUM(pbm.goals_scored - pbm.goals_conceded) OVER (
      PARTITION BY pbm.team_id 
      ORDER BY pbm.matchweek, pbm.date
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS cumulative_gd,
    -- Calculate cumulative goals for
    SUM(pbm.goals_scored) OVER (
      PARTITION BY pbm.team_id 
      ORDER BY pbm.matchweek, pbm.date
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS cumulative_gf,
    -- Calculate cumulative goals against
    SUM(pbm.goals_conceded) OVER (
      PARTITION BY pbm.team_id 
      ORDER BY pbm.matchweek, pbm.date
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS cumulative_ga
  FROM points_by_matchweek pbm
  LEFT JOIN team_adjustments ta ON pbm.team_id = ta.team_id
),
ranked_positions AS (
  SELECT 
    cs.*,
    -- Calculate position using RANK with tie-breakers
    -- CORRECTED: Includes all three tie-breakers (Points → GD → GF)
    RANK() OVER (
      PARTITION BY cs.matchweek 
      ORDER BY 
        cs.cumulative_points DESC,
        cs.cumulative_gd DESC,
        cs.cumulative_gf DESC
    ) AS position
  FROM cumulative_stats cs
)
SELECT 
  rp.team_id,
  t.team_name,
  rp.matchweek,
  rp.date,
  rp.venue,
  rp.goals_scored,
  rp.goals_conceded,
  rp.points,
  rp.result,
  rp.cumulative_points,
  rp.cumulative_gd,
  rp.cumulative_gf,
  rp.cumulative_ga,
  rp.position,
  rp.match_id,
  rp.opponent_name
FROM ranked_positions rp
INNER JOIN team t ON rp.team_id = t.team_id
ORDER BY rp.team_id, rp.matchweek, rp.date;

-- Add comment for documentation
COMMENT ON VIEW club_analytics_timeseries IS 'Timeseries analytics view showing club performance by matchweek with cumulative statistics and league position. Uses team table. Replicates Power BI DAX logic for LeaguePositionByMatchweek.';

