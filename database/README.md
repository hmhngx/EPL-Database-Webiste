# Premier League Analytics Database

PostgreSQL database schema for the Premier League 2023/24 Analytics Hub. Designed with 3rd Normal Form (3NF) compliance to prevent data anomalies and support dynamic league standings calculation.

## 🗄️ Database Overview

- **Database**: PostgreSQL (Supabase)
- **Schema Version**: 1.0
- **Normalization**: 3rd Normal Form (3NF)
- **Primary Keys**: UUID (Supabase standard)
- **Timezone**: UTC (TIMESTAMP WITH TIME ZONE)

## 📊 Schema Structure

### Tables

#### `stadiums`
Stores stadium information for all Premier League clubs.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `stadium_id` | UUID | PRIMARY KEY | Unique stadium identifier |
| `name` | VARCHAR(255) | NOT NULL | Stadium name |
| `city` | VARCHAR(100) | NOT NULL | City location |
| `capacity` | INTEGER | NOT NULL, CHECK > 0 | Maximum seating capacity |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Record update timestamp |

**Indexes:**
- `idx_stadiums_city` on `city`

#### `team`
Stores Premier League club/team information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `team_id` | UUID | PRIMARY KEY | Unique team identifier |
| `stadium_id` | UUID | NOT NULL, FK → stadiums | Associated stadium |
| `team_name` | VARCHAR(255) | NOT NULL, UNIQUE | Team name |
| `founded_year` | INTEGER | CHECK (1800 ≤ founded_year ≤ current year) | Year founded |
| `logo_url` | TEXT | | Club logo URL (Supabase Storage or external) |
| `captain_id` | UUID | FK → players | Club captain (optional) |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Record update timestamp |

**Indexes:**
- `idx_team_stadium` on `stadium_id`
- `idx_team_name` on `team_name`
- `idx_team_captain` on `captain_id`

#### `players`
Stores player information for all clubs.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique player identifier |
| `team_id` | UUID | NOT NULL, FK → team | Associated team |
| `player_name` | VARCHAR(255) | NOT NULL | Player full name |
| `position` | VARCHAR(50) | NOT NULL, CHECK | Position (Goalkeeper, Defender, Midfielder, Forward) |
| `nationality` | VARCHAR(100) | NOT NULL | Player nationality |
| `age` | INTEGER | NOT NULL, CHECK (16 ≤ age ≤ 50) | Player age |
| `jersey_number` | INTEGER | CHECK (1 ≤ jersey_number ≤ 99) | Jersey number (optional) |
| `height` | INTEGER | CHECK (height > 0) | Height in cm (optional) |
| `weight` | INTEGER | CHECK (weight > 0) | Weight in kg (optional) |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Record update timestamp |

**Indexes:**
- `idx_players_team` on `team_id`
- `idx_players_position` on `position`
- `idx_players_name` on `player_name`
- `idx_players_team_position` on `(team_id, position)` - Composite index for squad queries

#### `matches`
Stores match results and details.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique match identifier |
| `home_team_id` | UUID | NOT NULL, FK → team | Home team |
| `away_team_id` | UUID | NOT NULL, FK → team | Away team |
| `date` | TIMESTAMPTZ | NOT NULL | Match date and time |
| `home_team_score` | INTEGER | NOT NULL, CHECK ≥ 0 | Home team goals |
| `away_team_score` | INTEGER | NOT NULL, CHECK ≥ 0 | Away team goals |
| `matchweek` | INTEGER | CHECK (1 ≤ matchweek ≤ 38) | Matchweek number (optional) |
| `attendance` | INTEGER | CHECK ≥ 0 | Match attendance (optional, handles comma-separated values) |
| `referee` | VARCHAR(255) | | Referee name (optional) |
| `youtube_id` | VARCHAR(11) | | YouTube video ID (11 characters, not full URL) |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Record update timestamp |

**Constraints:**
- `home_team_id ≠ away_team_id` (CHECK constraint)

**Indexes:**
- `idx_matches_home_team` on `home_team_id`
- `idx_matches_away_team` on `away_team_id`
- `idx_matches_date` on `date`
- `idx_matches_matchweek` on `matchweek`
- `idx_matches_teams_date` on `(home_team_id, away_team_id, date)` - Composite for duplicate detection
- `idx_matches_team_matchweek` on `(home_team_id, matchweek)` - Composite for analytics
- `idx_matches_youtube_id` on `youtube_id` WHERE `youtube_id IS NOT NULL` - Partial index

#### `managers` (Optional)
Stores manager information (added via migration).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `manager_id` | UUID | PRIMARY KEY | Unique manager identifier |
| `name` | VARCHAR(255) | NOT NULL | Manager full name |
| `nationality` | VARCHAR(100) | | Manager nationality |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Record update timestamp |

#### `point_adjustments`
Stores point adjustments (deductions/additions) for teams. Used for PSR (Profit and Sustainability Rules) breaches and other league sanctions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique adjustment identifier |
| `team_id` | UUID | NOT NULL, FK → team | Team reference |
| `adjustment` | INTEGER | NOT NULL | Point adjustment (negative for deductions, positive for additions) |
| `season` | VARCHAR(9) | NOT NULL | Season identifier (format: '2023/24') |
| `reason` | TEXT | | Reason for adjustment (e.g., 'PSR breach') |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Record update timestamp |

**Indexes:**
- `idx_point_adjustments_team` on `team_id`
- `idx_point_adjustments_season` on `season`
- `idx_point_adjustments_team_season` on `(team_id, season)` - Composite for standings query

**Example Data:**
- Everton: -8 points (2023/24 season, PSR breach)
- Nottingham Forest: -4 points (2023/24 season, PSR breach)

#### `managing` (Optional)
Links managers to clubs with season dates (added via migration).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique association identifier |
| `manager_id` | UUID | NOT NULL, FK → managers | Manager reference |
| `team_id` | UUID | NOT NULL, FK → team | Team reference |
| `season_start` | DATE | | Start date of management |
| `season_end` | DATE | | End date (NULL if current) |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Record update timestamp |

### Views

#### `league_standings`
Dynamically calculates Premier League standings from match results.

**Columns:**
- `team_id` (UUID) - Team identifier
- `team_name` (VARCHAR) - Team name
- `mp` (INTEGER) - Matches played
- `w` (INTEGER) - Wins
- `d` (INTEGER) - Draws
- `l` (INTEGER) - Losses
- `gf` (INTEGER) - Goals for (scored)
- `ga` (INTEGER) - Goals against (conceded)
- `gd` (INTEGER) - Goal difference (gf - ga)
- `pts` (INTEGER) - Points (3 for win, 1 for draw, 0 for loss)

**Ordering:**
1. Points (DESC)
2. Goal difference (DESC)
3. Goals for (DESC) - Third tie-breaker

**Features:**
- Automatically includes all teams (even with no matches)
- Calculates statistics in real-time from `matches` table using CTEs
- Uses UNION ALL to unpivot home/away matches
- No static data required
- Updates automatically when matches are added/modified
- **Note**: Point adjustments are applied in API layer, not in view

#### `club_analytics_timeseries`
Advanced timeseries view with window functions for cumulative statistics and position ranking.

**Columns:**
- `team_id` (UUID) - Team identifier
- `team_name` (VARCHAR) - Team name
- `matchweek` (INTEGER) - Matchweek number
- `date` (TIMESTAMPTZ) - Match date
- `venue` (VARCHAR) - 'Home' or 'Away'
- `goals_scored` (INTEGER) - Goals scored in match
- `goals_conceded` (INTEGER) - Goals conceded in match
- `points` (INTEGER) - Points earned (3/1/0)
- `result` (VARCHAR) - Match result ('W', 'D', 'L')
- `cumulative_points` (INTEGER) - Running total of points (includes adjustments)
- `cumulative_gd` (INTEGER) - Running goal difference
- `cumulative_gf` (INTEGER) - Running goals for
- `cumulative_ga` (INTEGER) - Running goals against
- `position` (INTEGER) - League position at this matchweek
- `opponent_name` (VARCHAR) - Opponent team name

**Features:**
- Uses window functions (`SUM() OVER()`) for cumulative calculations
- Uses `RANK() OVER()` for position calculation with tie-breakers
- Replicates Power BI DAX logic in PostgreSQL
- Includes point adjustments in cumulative calculations
- Unpivots matches (one row per team per match)
- Supports venue-based filtering in frontend

## 🚀 Setup Instructions

### Option 1: Using Supabase Dashboard (Recommended)

1. Log in to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `schema.sql`
4. Click **Run** to execute the script
5. Verify tables are created in **Table Editor**

### Option 2: Using Supabase CLI

```powershell
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Run the schema
supabase db push
```

### Option 3: Using psql (PostgreSQL client)

```powershell
# Set your Supabase connection string
$env:PGPASSWORD="your-database-password"
psql -h db.your-project.supabase.co -U postgres -d postgres -f database/schema.sql
```

## 📝 Usage Examples

### Query League Standings with Point Adjustments

```sql
-- Get current league standings with point adjustments
SELECT 
    ls.team_id,
    ls.team_name,
    ls.pts,
    COALESCE(SUM(pa.adjustment), 0) AS total_adjustment,
    (ls.pts + COALESCE(SUM(pa.adjustment), 0)) AS adjusted_pts
FROM league_standings ls
LEFT JOIN point_adjustments pa ON ls.team_id = pa.team_id
WHERE pa.season = '2023/24' OR pa.season IS NULL
GROUP BY ls.team_id, ls.team_name, ls.pts, ls.gd
ORDER BY adjusted_pts DESC, ls.gd DESC;
```

### Get Club Information

```sql
-- Get team with stadium details
SELECT 
    t.team_name,
    t.founded_year,
    t.logo_url,
    s.stadium_name,
    s.capacity
FROM team t
JOIN stadiums s ON t.stadium_id = s.id
WHERE t.team_name = 'Manchester United';
```

### Get Match Results

```sql
-- Get all matches for a specific matchweek
SELECT 
    m.date,
    h.team_name AS home_team,
    a.team_name AS away_team,
    m.home_team_score,
    m.away_team_score,
    m.attendance,
    m.youtube_id
FROM matches m
JOIN team h ON m.home_team_id = h.team_id
JOIN team a ON m.away_team_id = a.team_id
WHERE m.matchweek = 1
ORDER BY m.date;
```

### Get Club Squad

```sql
-- Get all players for a team
SELECT 
    p.player_name,
    p.position,
    p.nationality,
    p.age,
    p.jersey_number
FROM players p
JOIN team t ON p.team_id = t.team_id
WHERE t.team_name = 'Manchester United'
ORDER BY p.position, p.jersey_number;
```

### Get Club Analytics Timeseries

```sql
-- Get cumulative statistics and position by matchweek
SELECT 
    team_name,
    matchweek,
    venue,
    result,
    cumulative_points,
    cumulative_gd,
    position
FROM club_analytics_timeseries
WHERE team_id = 'uuid-here'
ORDER BY matchweek ASC;
```

## 🔄 Database Migrations

Additional schema changes are managed through migration scripts in the `migrations/` directory.

### Available Migrations

1. **`add_point_adjustments.sql`**
   - Creates `point_adjustments` table for PSR breaches
   - Inserts Everton (-8) and Nottingham Forest (-4) deductions for 2023/24
   - Adds composite indexes for performance

2. **`add_logo_url_and_youtube_id.sql`**
   - Adds `logo_url` to `team` table (Supabase Storage integration)
   - Adds `youtube_id` (11 characters) to `matches` table (replaces full URLs)
   - Optimizes media storage

3. **`create_club_analytics_timeseries_view.sql`**
   - Creates advanced timeseries view with window functions
   - Calculates cumulative statistics and position ranking
   - Replicates Power BI DAX logic in PostgreSQL

4. **`add_managers_captains_gameweek.sql`**
   - Creates `managers` and `managing` tables
   - Adds `captain_id` to `team` table
   - Adds `matchweek` to `matches` table
   - Adds `jersey_number`, `height`, `weight` to `players` table

5. **`add_performance_indexes.sql`**
   - Adds composite indexes for common query patterns
   - Optimizes standings and analytics queries

For detailed migration documentation, see [`migrations/README.md`](migrations/README.md).

## ✅ 3NF Compliance

The schema adheres to 3rd Normal Form (3NF):

- ✅ **3NF**: No transitive dependencies (all attributes depend only on primary key)
- ✅ **Referential Integrity**: Foreign keys maintain data consistency

### Benefits

- **No Data Redundancy**: Each piece of data stored once
- **Data Consistency**: Updates propagate correctly
- **Efficient Storage**: Optimized table structure
- **Easy Maintenance**: Clear relationships between tables

## 🔍 Indexes and Performance

### Indexes Created

- Foreign key columns (for join performance)
- Frequently queried columns (`name`, `date`, `position`)
- Composite indexes for match queries
- Unique indexes for data integrity

### Performance Considerations

- **Standings View**: Calculates dynamically; consider materializing for large datasets
- **Match Queries**: Indexed on `date` and `gameweek` for fast filtering
- **Club Lookups**: Indexed on `name` for fast searches
- **Player Queries**: Indexed on `club_id` and `position` for efficient filtering

## 🔐 Constraints and Validations

### Check Constraints

- Stadium capacity must be > 0
- Club founded year must be between 1800 and current year
- Player age must be between 16 and 50
- Player position must be one of: Goalkeeper, Defender, Midfielder, Forward
- Match goals must be >= 0
- Home and away clubs must be different
- Gameweek must be between 1 and 38
- Jersey number must be between 1 and 99

### Unique Constraints

- Club names must be unique
- Stadium names (implicitly unique via application logic)

### Foreign Key Constraints

- Clubs → Stadiums (RESTRICT on delete, CASCADE on update)
- Players → Clubs (CASCADE on delete)
- Matches → Clubs (RESTRICT on delete)
- Managing → Managers and Clubs (CASCADE on delete)

## 🕐 Automatic Timestamps

All tables include:
- `created_at` - Automatically set on INSERT
- `updated_at` - Automatically updated on UPDATE via triggers

## 📚 Related Documentation

- **[Main README](../README.md)** - Project overview
- **[Server README](../server/README.md)** - API documentation
- **[ETL README](../etl/README.md)** - Data ingestion guide
- **[Migrations README](migrations/README.md)** - Migration documentation

## 🐛 Troubleshooting

### Schema Not Creating

**Issue**: Tables not appearing after running schema.sql

**Solutions**:
1. Check for errors in Supabase SQL Editor
2. Verify you have proper permissions
3. Ensure UUID extension is enabled
4. Check that tables don't already exist

### Foreign Key Violations

**Issue**: Cannot insert data due to foreign key errors

**Solutions**:
1. Insert data in order: stadiums → clubs → players/matches
2. Verify referenced IDs exist
3. Check constraint requirements

### Performance Issues

**Issue**: Queries are slow

**Solutions**:
1. Verify indexes are created
2. Use EXPLAIN ANALYZE to review query plans
3. Consider materializing views for frequently accessed data
4. Check Supabase performance metrics

## 📄 License

Part of the Premier League 2023/24 Analytics Hub project.

---

**© 2023/2024 Premier League Analytics Hub. Data provided by EPL Data.**
