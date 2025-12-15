-- ============================================
-- Migration: Add youtube_link column to matches table
-- ============================================
-- Adds support for YouTube video embeds on match detail pages
-- Enables interactive video players with hover previews

-- Add youtube_link column to matches table
ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS youtube_link VARCHAR(255);

-- Add comment for documentation
COMMENT ON COLUMN matches.youtube_link IS 'YouTube video URL or embed link for match highlights. Supports full URLs or video IDs for embedding.';

-- Create index for faster lookups when filtering matches with videos
CREATE INDEX IF NOT EXISTS idx_matches_youtube_link ON matches(youtube_link) WHERE youtube_link IS NOT NULL;

