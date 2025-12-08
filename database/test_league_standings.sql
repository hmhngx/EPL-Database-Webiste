-- ============================================
-- Test Queries for league_standings View
-- ============================================
-- Use these queries to verify the view is working correctly

-- 1. Basic query - Get all standings
SELECT * FROM league_standings;

-- 2. Verify all clubs are included (should return 20 or number of clubs)
SELECT 
    COUNT(*) AS total_clubs,
    COUNT(CASE WHEN mp > 0 THEN 1 END) AS clubs_with_matches,
    COUNT(CASE WHEN mp = 0 THEN 1 END) AS clubs_without_matches
FROM league_standings;

-- 3. Verify points calculation (pts should equal w*3 + d*1)
SELECT 
    club,
    mp,
    w,
    d,
    l,
    pts,
    (w * 3 + d * 1) AS calculated_pts,
    ABS(pts - (w * 3 + d * 1)) AS difference
FROM league_standings
WHERE mp > 0
ORDER BY ABS(pts - (w * 3 + d * 1)) DESC;
-- Should show 0 for difference column if calculation is correct

-- 4. Verify goal difference calculation (gd should equal gf - ga)
SELECT 
    club,
    gf,
    ga,
    gd,
    (gf - ga) AS calculated_gd,
    ABS(gd - (gf - ga)) AS difference
FROM league_standings
WHERE mp > 0
ORDER BY ABS(gd - (gf - ga)) DESC;
-- Should show 0 for difference column if calculation is correct

-- 5. Verify matches played matches actual match count
SELECT 
    ls.club,
    ls.mp AS view_matches_played,
    COUNT(DISTINCT CASE WHEN m.home_club_id = ls.club_id THEN m.match_id END) +
    COUNT(DISTINCT CASE WHEN m.away_club_id = ls.club_id THEN m.match_id END) AS actual_matches
FROM league_standings ls
LEFT JOIN matches m ON (
    m.home_club_id = ls.club_id OR 
    m.away_club_id = ls.club_id
)
GROUP BY ls.club_id, ls.club, ls.mp
HAVING ls.mp != (
    COUNT(DISTINCT CASE WHEN m.home_club_id = ls.club_id THEN m.match_id END) +
    COUNT(DISTINCT CASE WHEN m.away_club_id = ls.club_id THEN m.match_id END)
);
-- Should return 0 rows if matches_played is correct

-- 6. Verify ordering (should be by pts DESC, then gd DESC)
SELECT 
    club,
    pts,
    gd,
    LAG(pts) OVER (ORDER BY pts DESC, gd DESC) AS prev_pts,
    LAG(gd) OVER (ORDER BY pts DESC, gd DESC) AS prev_gd
FROM league_standings
WHERE mp > 0
ORDER BY pts DESC, gd DESC;
-- Verify that when pts are equal, gd is in descending order

-- 7. Check clubs with no matches (should show 0 for all stats)
SELECT 
    club,
    mp,
    w,
    d,
    l,
    gf,
    ga,
    gd,
    pts
FROM league_standings
WHERE mp = 0;
-- Should return clubs that exist but have no matches

-- 8. Top 10 teams
SELECT 
    club,
    mp,
    w,
    d,
    l,
    gf,
    ga,
    gd,
    pts
FROM league_standings
WHERE mp > 0
ORDER BY pts DESC, gd DESC
LIMIT 10;

-- 9. Teams with most goals scored
SELECT 
    club,
    mp,
    gf,
    ga,
    gd,
    pts
FROM league_standings
WHERE mp > 0
ORDER BY gf DESC
LIMIT 10;

-- 10. Teams with best goal difference
SELECT 
    club,
    mp,
    gf,
    ga,
    gd,
    pts
FROM league_standings
WHERE mp > 0
ORDER BY gd DESC
LIMIT 10;

