-- ============================================
-- Migration: Remove Dead Code and Redundant Columns
-- ============================================
-- This migration removes unused columns and cleans up redundant data
-- 
-- WARNING: Backup your database before running this migration!
-- 
-- Removes:
-- 1. matches.youtube_link column (superseded by youtube_id)
-- 2. Any orphaned data
-- ============================================

-- ============================================
-- 1. REMOVE REDUNDANT youtube_link COLUMN
-- ============================================
-- The youtube_link column was superseded by youtube_id (11-character ID)
-- Backend and ETL now use youtube_id exclusively

-- First, migrate any valid youtube_link data to youtube_id (if not already migrated)
DO $$
DECLARE
    link_record RECORD;
    extracted_id VARCHAR(11);
BEGIN
    -- Extract YouTube IDs from youtube_link column and populate youtube_id
    FOR link_record IN 
        SELECT id, youtube_link 
        FROM matches 
        WHERE youtube_link IS NOT NULL 
        AND (youtube_id IS NULL OR youtube_id = '')
    LOOP
        -- Extract 11-character YouTube ID from URL
        extracted_id := (
            SELECT SUBSTRING(
                youtube_link FROM 
                'youtube\.com/watch\?v=([a-zA-Z0-9_-]{11})|youtu\.be/([a-zA-Z0-9_-]{11})|youtube\.com/embed/([a-zA-Z0-9_-]{11})'
            )
        );
        
        -- If extraction successful, update youtube_id
        IF extracted_id IS NOT NULL AND LENGTH(extracted_id) = 11 THEN
            UPDATE matches 
            SET youtube_id = extracted_id 
            WHERE id = link_record.id;
            
            RAISE NOTICE 'Migrated YouTube link to ID for match %: %', link_record.id, extracted_id;
        END IF;
    END LOOP;
END $$;

-- Drop the youtube_link column
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'matches' 
        AND column_name = 'youtube_link'
    ) THEN
        ALTER TABLE matches DROP COLUMN youtube_link;
        RAISE NOTICE 'Dropped youtube_link column from matches table';
    ELSE
        RAISE NOTICE 'youtube_link column does not exist, skipping';
    END IF;
END $$;

-- ============================================
-- 2. VERIFY NO ORPHANED DATA
-- ============================================
-- Check for any data integrity issues

-- Check for players with invalid team_id
DO $$
DECLARE
    orphaned_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphaned_count
    FROM players p
    LEFT JOIN team t ON p.team_id = t.team_id
    WHERE t.team_id IS NULL;
    
    IF orphaned_count > 0 THEN
        RAISE WARNING 'Found % orphaned players (team_id does not exist in team table)', orphaned_count;
    ELSE
        RAISE NOTICE 'No orphaned players found';
    END IF;
END $$;

-- Check for matches with invalid team_ids
DO $$
DECLARE
    orphaned_home INTEGER;
    orphaned_away INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphaned_home
    FROM matches m
    LEFT JOIN team t ON m.home_team_id = t.team_id
    WHERE t.team_id IS NULL;
    
    SELECT COUNT(*) INTO orphaned_away
    FROM matches m
    LEFT JOIN team t ON m.away_team_id = t.team_id
    WHERE t.team_id IS NULL;
    
    IF orphaned_home > 0 OR orphaned_away > 0 THEN
        RAISE WARNING 'Found % orphaned home teams and % orphaned away teams', orphaned_home, orphaned_away;
    ELSE
        RAISE NOTICE 'No orphaned matches found';
    END IF;
END $$;

-- ============================================
-- 3. CLEAN UP DUPLICATE INDEXES (if any)
-- ============================================
-- PostgreSQL doesn't allow duplicate indexes, but we can verify

DO $$
DECLARE
    index_record RECORD;
BEGIN
    FOR index_record IN
        SELECT 
            schemaname,
            tablename,
            indexname,
            indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
        AND tablename IN ('matches', 'players', 'team', 'point_adjustments')
        ORDER BY tablename, indexname
    LOOP
        -- Log all indexes for review
        RAISE NOTICE 'Index: % on %.%', index_record.indexname, index_record.tablename, index_record.indexdef;
    END LOOP;
END $$;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- Dead code has been removed and data integrity verified
-- 
-- Next steps:
-- 1. Verify all queries still work
-- 2. Test ETL script with corrected schema
-- 3. Monitor performance

