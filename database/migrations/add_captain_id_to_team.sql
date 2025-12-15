-- ============================================
-- Migration: Add captain_id to team table
-- ============================================
-- This migration adds captain_id column to the team table
-- since the application uses 'team' table instead of 'clubs' table
-- ============================================

-- Add captain_id column to team table if it doesn't exist
ALTER TABLE team 
ADD COLUMN IF NOT EXISTS captain_id UUID;

-- Add foreign key constraint if it doesn't exist
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

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_team_captain ON team(captain_id);

-- Add comment
COMMENT ON COLUMN team.captain_id IS 'References the id of the team captain from players table';

