-- ============================================
-- Migration: Add logo_url to team table and youtube_id to matches table
-- ============================================
-- Adds support for team logos and YouTube video IDs for match highlights
-- Sets up public storage bucket for club logos

-- Add logo_url column to team table
ALTER TABLE team 
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN team.logo_url IS 'URL to team logo image. Can be a Supabase storage URL or external URL. Falls back to ui-avatars if null.';

-- Add youtube_id column to matches table
ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS youtube_id VARCHAR(11);

-- Add comment for documentation
COMMENT ON COLUMN matches.youtube_id IS 'YouTube video ID (11 characters) for match highlights. Used to generate embed URLs and thumbnails.';

-- Create index for faster lookups when filtering matches with videos
CREATE INDEX IF NOT EXISTS idx_matches_youtube_id ON matches(youtube_id) WHERE youtube_id IS NOT NULL;

-- Create public storage bucket for club logos (if it doesn't exist)
-- Note: This requires Supabase Storage API. Run this via Supabase dashboard or API.
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('club-logos', 'club-logos', true)
-- ON CONFLICT (id) DO NOTHING;

-- Set bucket policy to allow public read access
-- Note: This should be done via Supabase dashboard or API
-- CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'club-logos');

