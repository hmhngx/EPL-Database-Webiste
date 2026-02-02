-- Add market_value column to players table for Market Alpha feature
-- Migration: add_market_value.sql

-- Step 1: Add the column
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS market_value BIGINT;

COMMENT ON COLUMN players.market_value IS 'Player market value in EUR (estimated)';

-- Step 2: Populate with estimated values based on performance metrics
-- Formula: Base value adjusted by rating, age, goals, and assists
-- This provides realistic-looking test data for the Market Alpha feature

UPDATE players
SET market_value = (
    -- Base value: 5M EUR
    5000000 +
    
    -- Rating bonus (0-30M): Rating 6.0-8.5 scales from 0-30M
    CASE 
        WHEN sofascore_rating IS NOT NULL THEN
            GREATEST(0, LEAST(30000000, (sofascore_rating - 6.0) * 12000000))
        ELSE 0
    END +
    
    -- Age factor: Peak value at 25-28, declining before/after
    CASE
        WHEN age BETWEEN 23 AND 28 THEN 10000000
        WHEN age BETWEEN 20 AND 22 THEN 8000000
        WHEN age BETWEEN 29 AND 30 THEN 7000000
        WHEN age < 20 THEN 5000000
        ELSE 3000000
    END +
    
    -- Goals bonus: 500K per goal (max 20M)
    LEAST(20000000, COALESCE(goals, 0) * 500000) +
    
    -- Assists bonus: 400K per assist (max 15M)
    LEAST(15000000, COALESCE(assists, 0) * 400000) +
    
    -- Position multiplier adjustment (added to base)
    CASE position
        WHEN 'Forward' THEN 15000000
        WHEN 'Midfielder' THEN 10000000
        WHEN 'Defender' THEN 5000000
        WHEN 'Goalkeeper' THEN 3000000
        ELSE 0
    END
)::BIGINT
WHERE market_value IS NULL;

-- Step 3: Add some variance (±20%) to make it look more realistic
UPDATE players
SET market_value = (
    market_value * (0.8 + (RANDOM() * 0.4))
)::BIGINT
WHERE market_value IS NOT NULL;

-- Step 4: Ensure minimum value of 1M for all players
UPDATE players
SET market_value = GREATEST(1000000, market_value)
WHERE market_value < 1000000;

-- Step 5: Round to nearest 100K for cleaner values
UPDATE players
SET market_value = ROUND(market_value / 100000.0) * 100000
WHERE market_value IS NOT NULL;

-- Step 6: Create index for performance
CREATE INDEX IF NOT EXISTS idx_players_market_value ON players(market_value DESC);

-- Verification queries (commented out - uncomment to test)
-- SELECT COUNT(*) as total_players FROM players;
-- SELECT COUNT(*) as players_with_value FROM players WHERE market_value IS NOT NULL;
-- SELECT MIN(market_value) as min_value, MAX(market_value) as max_value, AVG(market_value)::BIGINT as avg_value FROM players;
-- SELECT player_name, position, age, sofascore_rating, goals, assists, market_value FROM players ORDER BY market_value DESC LIMIT 10;
