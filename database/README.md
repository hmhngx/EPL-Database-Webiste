# Premier League 2023/24 Analytics Hub - Database Schema

## Overview

This PostgreSQL database schema is designed for a Premier League 2023/24 Analytics Hub application. The schema adheres to **3rd Normal Form (3NF)** to prevent data anomalies and supports dynamic league standings calculation without requiring static data.

## Schema Structure

### Tables

1. **stadiums** - Stadium information
   - `stadium_id` (PK, UUID)
   - `name`, `city`, `capacity`
   
2. **clubs** - Premier League clubs/teams
   - `club_id` (PK, UUID)
   - `stadium_id` (FK → stadiums)
   - `name` (UNIQUE), `founded`, `logo_url`
   
3. **players** - Player information
   - `player_id` (PK, UUID)
   - `club_id` (FK → clubs)
   - `name`, `position`, `nationality`, `age`
   
4. **matches** - Match results and details
   - `match_id` (PK, UUID)
   - `home_club_id` (FK → clubs)
   - `away_club_id` (FK → clubs)
   - `date`, `home_goals`, `away_goals`, `attendance`, `referee`

### Views

- **league_standings** - Dynamically calculates league standings from match results
  - Calculates: position, points, wins, draws, losses, goals for/against, goal difference
  - Updates automatically as matches are added/updated

## 3NF Compliance

The schema adheres to 3rd Normal Form:
- ✅ All attributes are atomic (1NF)
- ✅ All non-key attributes fully depend on primary keys (2NF)
- ✅ No transitive dependencies (3NF)
- ✅ Foreign keys maintain referential integrity

## Setup Instructions for Supabase

### Option 1: Using Supabase Dashboard

1. Log in to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `schema.sql`
4. Click **Run** to execute the script

### Option 2: Using Supabase CLI

```powershell
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Run the migration
supabase db push
```

### Option 3: Using psql (PostgreSQL client)

```powershell
# Set your Supabase connection string
$env:PGPASSWORD="your-database-password"
psql -h db.your-project.supabase.co -U postgres -d postgres -f database/schema.sql
```

## Usage Examples

### Query League Standings

```sql
-- Get current league standings
SELECT * FROM league_standings ORDER BY position;
```

### Insert Sample Data

```sql
-- Insert a stadium
INSERT INTO stadiums (name, city, capacity)
VALUES ('Old Trafford', 'Manchester', 74310);

-- Insert a club
INSERT INTO clubs (stadium_id, name, founded, logo_url)
SELECT stadium_id, 'Manchester United', 1878, 'https://example.com/manutd.png'
FROM stadiums WHERE name = 'Old Trafford';

-- Insert a match
INSERT INTO matches (home_club_id, away_club_id, date, home_goals, away_goals, attendance, referee)
SELECT 
    h.club_id,
    a.club_id,
    '2023-08-12 15:00:00+00'::timestamptz,
    2,
    1,
    70000,
    'Michael Oliver'
FROM clubs h, clubs a
WHERE h.name = 'Manchester United' AND a.name = 'Liverpool';
```

## Dynamic Standings Calculation

The `league_standings` view automatically calculates:
- **Points**: 3 for win, 1 for draw, 0 for loss
- **Wins, Draws, Losses**: Count of each result type
- **Goals For/Against**: Total goals scored and conceded
- **Goal Difference**: Goals for minus goals against
- **Position**: Ranked by points, then goal difference, then goals for

No static standings table is needed - everything is calculated from the `matches` table in real-time.

## Constraints & Validations

- Stadium capacity must be > 0
- Club founded year must be between 1800 and current year
- Player age must be between 16 and 50
- Player position must be one of: Goalkeeper, Defender, Midfielder, Forward
- Match goals must be >= 0
- Home and away clubs must be different
- Club names must be unique

## Indexes

The schema includes indexes on:
- Foreign key columns (for join performance)
- Frequently queried columns (name, date, position, etc.)
- Composite indexes for match queries

## Notes

- Uses UUIDs for primary keys (Supabase standard)
- Includes `created_at` and `updated_at` timestamps
- Automatic `updated_at` triggers on all tables
- Foreign keys use appropriate CASCADE/RESTRICT actions

