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

#### `clubs`
Stores Premier League club/team information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `club_id` | UUID | PRIMARY KEY | Unique club identifier |
| `stadium_id` | UUID | NOT NULL, FK → stadiums | Associated stadium |
| `name` | VARCHAR(255) | NOT NULL, UNIQUE | Club name |
| `founded` | INTEGER | CHECK (1800 ≤ founded ≤ current year) | Year founded |
| `logo_url` | TEXT | | Club logo URL |
| `captain_id` | UUID | FK → players | Club captain (optional) |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Record update timestamp |

**Indexes:**
- `idx_clubs_stadium` on `stadium_id`
- `idx_clubs_name` on `name`
- `idx_clubs_captain` on `captain_id`

#### `players`
Stores player information for all clubs.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `player_id` | UUID | PRIMARY KEY | Unique player identifier |
| `club_id` | UUID | NOT NULL, FK → clubs | Associated club |
| `name` | VARCHAR(255) | NOT NULL | Player full name |
| `position` | VARCHAR(50) | NOT NULL, CHECK | Position (Goalkeeper, Defender, Midfielder, Forward) |
| `nationality` | VARCHAR(100) | NOT NULL | Player nationality |
| `age` | INTEGER | NOT NULL, CHECK (16 ≤ age ≤ 50) | Player age |
| `jersey_number` | INTEGER | CHECK (1 ≤ jersey_number ≤ 99) | Jersey number (optional) |
| `height` | INTEGER | CHECK (height > 0) | Height in cm (optional) |
| `weight` | INTEGER | CHECK (weight > 0) | Weight in kg (optional) |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Record update timestamp |

**Indexes:**
- `idx_players_club` on `club_id`
- `idx_players_position` on `position`
- `idx_players_name` on `name`

#### `matches`
Stores match results and details.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `match_id` | UUID | PRIMARY KEY | Unique match identifier |
| `home_club_id` | UUID | NOT NULL, FK → clubs | Home team |
| `away_club_id` | UUID | NOT NULL, FK → clubs | Away team |
| `date` | TIMESTAMPTZ | NOT NULL | Match date and time |
| `home_goals` | INTEGER | NOT NULL, CHECK ≥ 0 | Home team goals |
| `away_goals` | INTEGER | NOT NULL, CHECK ≥ 0 | Away team goals |
| `attendance` | INTEGER | CHECK ≥ 0 | Match attendance (optional) |
| `referee` | VARCHAR(255) | | Referee name (optional) |
| `gameweek` | INTEGER | CHECK (1 ≤ gameweek ≤ 38) | Gameweek number (optional) |
| `youtube_link` | VARCHAR(255) | | YouTube video link (optional) |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Record update timestamp |

**Constraints:**
- `home_club_id ≠ away_club_id` (CHECK constraint)

**Indexes:**
- `idx_matches_home_club` on `home_club_id`
- `idx_matches_away_club` on `away_club_id`
- `idx_matches_date` on `date`
- `idx_matches_gameweek` on `gameweek`
- `idx_matches_youtube_link` on `youtube_link`

#### `managers` (Optional)
Stores manager information (added via migration).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `manager_id` | UUID | PRIMARY KEY | Unique manager identifier |
| `name` | VARCHAR(255) | NOT NULL | Manager full name |
| `nationality` | VARCHAR(100) | | Manager nationality |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Record update timestamp |

#### `managing` (Optional)
Links managers to clubs with season dates (added via migration).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `managing_id` | UUID | PRIMARY KEY | Unique association identifier |
| `manager_id` | UUID | NOT NULL, FK → managers | Manager reference |
| `club_id` | UUID | NOT NULL, FK → clubs | Club reference |
| `start_date` | DATE | NOT NULL | Start date of management |
| `end_date` | DATE | | End date (NULL if current) |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Record update timestamp |

### Views

#### `league_standings`
Dynamically calculates Premier League standings from match results.

**Columns:**
- `club_id` (UUID) - Club identifier
- `club` (VARCHAR) - Club name
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
3. Goals for (DESC)

**Features:**
- Automatically includes all clubs (even with no matches)
- Calculates statistics in real-time from `matches` table
- No static data required
- Updates automatically when matches are added/modified

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

### Query League Standings

```sql
-- Get current league standings
SELECT * FROM league_standings ORDER BY pts DESC, gd DESC;
```

### Get Club Information

```sql
-- Get club with stadium details
SELECT 
    c.name AS club_name,
    c.founded,
    s.name AS stadium_name,
    s.capacity
FROM clubs c
JOIN stadiums s ON c.stadium_id = s.stadium_id
WHERE c.name = 'Manchester United';
```

### Get Match Results

```sql
-- Get all matches for a specific gameweek
SELECT 
    m.date,
    h.name AS home_team,
    a.name AS away_team,
    m.home_goals,
    m.away_goals
FROM matches m
JOIN clubs h ON m.home_club_id = h.club_id
JOIN clubs a ON m.away_club_id = a.club_id
WHERE m.gameweek = 1
ORDER BY m.date;
```

### Get Club Squad

```sql
-- Get all players for a club
SELECT 
    p.name,
    p.position,
    p.nationality,
    p.age,
    p.jersey_number
FROM players p
JOIN clubs c ON p.club_id = c.club_id
WHERE c.name = 'Manchester United'
ORDER BY p.position, p.jersey_number;
```

## 🔄 Database Migrations

Additional schema changes are managed through migration scripts in the `migrations/` directory.

### Available Migrations

1. **`add_youtube_link_to_matches.sql`**
   - Adds `youtube_link` column to `matches` table
   - Enables YouTube video embeds on match detail pages

2. **`add_managers_captains_gameweek.sql`**
   - Creates `managers` and `managing` tables
   - Adds `captain_id` to `clubs` table
   - Adds `gameweek` to `matches` table
   - Adds `jersey_number`, `height`, `weight` to `players` table

For detailed migration documentation, see [`migrations/README.md`](migrations/README.md).

## ✅ 3NF Compliance

The schema adheres to 3rd Normal Form (3NF):

- ✅ **1NF**: All attributes are atomic (no composite values)
- ✅ **2NF**: All non-key attributes fully depend on primary keys
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
