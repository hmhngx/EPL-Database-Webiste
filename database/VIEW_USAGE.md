# League Standings View Usage Guide

## Overview

The `league_standings` view dynamically calculates the Premier League table from the `matches` table. It requires no static data storage and automatically updates as matches are added or modified.

## View Structure

### Columns

| Column | Type | Description |
|--------|------|-------------|
| `club_id` | UUID | Unique identifier for the club |
| `club` | VARCHAR | Club name |
| `mp` | INTEGER | Matches played |
| `w` | INTEGER | Wins |
| `d` | INTEGER | Draws |
| `l` | INTEGER | Losses |
| `gf` | INTEGER | Goals for (scored) |
| `ga` | INTEGER | Goals against (conceded) |
| `gd` | INTEGER | Goal difference (gf - ga) |
| `pts` | INTEGER | Points (3 for win, 1 for draw, 0 for loss) |

### Ordering

Results are ordered by:
1. **Points (pts)** - Descending (highest first)
2. **Goal Difference (gd)** - Descending (highest first)

This follows standard Premier League tie-breaking rules.

## Usage Examples

### Basic Query

Get the current league standings:

```sql
SELECT * FROM league_standings;
```

### Top 5 Teams

```sql
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
LIMIT 5;
```

### Teams with No Matches

```sql
SELECT 
    club,
    mp,
    pts
FROM league_standings
WHERE mp = 0;
```

### Teams by Goal Difference

```sql
SELECT 
    club,
    gf,
    ga,
    gd,
    pts
FROM league_standings
ORDER BY gd DESC;
```

### Specific Club Standings

```sql
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
WHERE club = 'Manchester United';
```

### Standings with Position Number

```sql
SELECT 
    ROW_NUMBER() OVER (ORDER BY pts DESC, gd DESC) AS position,
    club,
    mp,
    w,
    d,
    l,
    gf,
    ga,
    gd,
    pts
FROM league_standings;
```

### Teams Above a Certain Points Threshold

```sql
SELECT 
    club,
    mp,
    pts
FROM league_standings
WHERE pts >= 30
ORDER BY pts DESC;
```

## How It Works

1. **Match Statistics Calculation**: 
   - For each match, calculates points, wins, draws, losses, and goals for both home and away teams
   - Uses `CASE` statements to determine match results

2. **Aggregation**:
   - Groups match statistics by `club_id`
   - Uses `SUM` to aggregate points, wins, draws, losses, and goals
   - Calculates goal difference and matches played

3. **Club Inclusion**:
   - Uses `LEFT JOIN` to include all clubs from the `clubs` table
   - Clubs with no matches show 0 for all statistics
   - Uses `COALESCE` to handle NULL values

4. **Dynamic Updates**:
   - View automatically recalculates when matches are added/updated
   - No manual refresh needed
   - Always reflects current match data

## Success Criteria

✅ **All 20 clubs included**: Uses `LEFT JOIN` to ensure all clubs appear, even with no matches  
✅ **Accurate calculations**: Uses `SUM` and `CASE` statements for precise statistics  
✅ **No static data**: All values calculated dynamically from `matches` table  
✅ **Proper ordering**: Ordered by points DESC, then goal difference DESC  
✅ **Handles edge cases**: Clubs with no matches show 0 for all stats  

## Performance Considerations

- The view uses indexes on `matches` table for efficient joins
- For large datasets, consider materializing the view if real-time updates aren't critical
- The view recalculates on each query, so complex queries may take longer

## Testing the View

### Verify All Clubs Are Included

```sql
SELECT COUNT(*) FROM league_standings;
-- Should return 20 (or number of clubs in clubs table)
```

### Verify Calculations

```sql
-- Check that points calculation is correct
SELECT 
    club,
    mp,
    w,
    d,
    l,
    pts,
    (w * 3 + d * 1) AS calculated_pts
FROM league_standings
WHERE mp > 0
ORDER BY ABS(pts - (w * 3 + d * 1)) DESC;
-- Should return 0 rows if calculations are correct
```

### Verify Goal Difference

```sql
-- Check that goal difference is correct
SELECT 
    club,
    gf,
    ga,
    gd,
    (gf - ga) AS calculated_gd
FROM league_standings
WHERE mp > 0
ORDER BY ABS(gd - (gf - ga)) DESC;
-- Should return 0 rows if calculations are correct
```

### Verify Matches Played

```sql
-- Compare view matches_played with actual match count
SELECT 
    ls.club,
    ls.mp AS view_matches,
    COUNT(m.match_id) AS actual_matches
FROM league_standings ls
LEFT JOIN matches m ON (
    m.home_club_id = ls.club_id OR 
    m.away_club_id = ls.club_id
)
GROUP BY ls.club_id, ls.club, ls.mp
HAVING ls.mp != COUNT(m.match_id);
-- Should return 0 rows if counts match
```

## Notes

- The view handles clubs with no matches by showing 0 for all statistics
- Points are calculated as: 3 for win, 1 for draw, 0 for loss
- Goal difference is calculated as: goals for - goals against
- The view is read-only (cannot INSERT/UPDATE/DELETE directly)
- To update standings, modify the underlying `matches` table

