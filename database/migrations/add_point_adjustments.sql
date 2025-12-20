-- ============================================
-- Migration: Add point_adjustments table (CORRECTED)
-- ============================================
-- Creates table to track point deductions/additions for teams
-- Used for PSR (Profit and Sustainability Rules) breaches and other adjustments
-- 
-- CORRECTED: References team(team_id) instead of clubs(club_id)
-- ============================================

-- Create point_adjustments table
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

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_point_adjustments_team ON point_adjustments(team_id);
CREATE INDEX IF NOT EXISTS idx_point_adjustments_season ON point_adjustments(season);
CREATE INDEX IF NOT EXISTS idx_point_adjustments_team_season ON point_adjustments(team_id, season); -- Composite for standings query

-- Add comment for documentation
COMMENT ON TABLE point_adjustments IS 'Stores point adjustments (deductions/additions) for teams. Used for PSR breaches and other league sanctions.';
COMMENT ON COLUMN point_adjustments.adjustment IS 'Point adjustment value. Negative for deductions, positive for additions.';
COMMENT ON COLUMN point_adjustments.season IS 'Season identifier in format YYYY/YY (e.g., 2023/24)';
COMMENT ON COLUMN point_adjustments.reason IS 'Reason for the adjustment (e.g., PSR breach, financial fair play violation)';

-- Insert 2023/24 season point deductions
-- Everton: -8 points
-- Nottingham Forest: -4 points
-- Note: Uses team_name matching to find teams (case-insensitive)
-- Prevents duplicate inserts if migration is run multiple times
INSERT INTO point_adjustments (team_id, adjustment, season, reason)
SELECT team_id, -8, '2023/24', 'Profit and Sustainability Rule (PSR) breach'
FROM team 
WHERE team_name ILIKE '%everton%'
  AND NOT EXISTS (
    SELECT 1 FROM point_adjustments pa 
    WHERE pa.team_id = team.team_id 
      AND pa.season = '2023/24' 
      AND pa.adjustment = -8
  );

INSERT INTO point_adjustments (team_id, adjustment, season, reason)
SELECT team_id, -4, '2023/24', 'Profit and Sustainability Rule (PSR) breach'
FROM team 
WHERE team_name ILIKE '%nottingham forest%'
  AND NOT EXISTS (
    SELECT 1 FROM point_adjustments pa 
    WHERE pa.team_id = team.team_id 
      AND pa.season = '2023/24' 
      AND pa.adjustment = -4
  );

