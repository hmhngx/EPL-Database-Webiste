# Database Migrations

SQL migration scripts for extending and updating the Premier League Analytics database schema. All migrations are designed to be backward-compatible and safe to run on existing databases.

## 📋 Overview

Migrations are incremental changes to the database schema that:
- Add new tables, columns, or constraints
- Maintain compatibility with existing data
- Include proper indexes for performance
- Add documentation comments
- Use `IF NOT EXISTS` clauses to prevent errors on re-runs

## 🚀 Running Migrations

### Option 1: Using Supabase Dashboard (Recommended)

1. Log in to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of the migration file
4. Click **Run** to execute the script
5. Verify changes in **Table Editor**

### Option 2: Using psql (PostgreSQL client)

```powershell
# Set your Supabase connection string
$env:PGPASSWORD="your-database-password"
psql -h db.[PROJECT-REF].supabase.co -U postgres -d postgres -f database/migrations/[migration-file].sql
```

### Option 3: Using Supabase CLI

```powershell
# Link your project (if not already linked)
supabase link --project-ref your-project-ref

# Run migration
supabase db push
```

## 📝 Available Migrations

### 1. `add_youtube_link_to_matches.sql`

Adds YouTube video link support to the matches table.

**Changes:**
- Adds `youtube_link VARCHAR(255)` column to `matches` table
- Creates index on `youtube_link` for faster lookups
- Adds documentation comment

**When to Run:**
- When you want to add YouTube video embeds to match detail pages
- Before loading match data with YouTube links

**Usage:**
```sql
-- After migration, you can store YouTube links
UPDATE matches 
SET youtube_link = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
WHERE match_id = 'uuid';
```

**After Migration:**
- Update your ETL script to include `youtube_link` in match data
- Frontend can now query and display YouTube videos for matches
- Supports interactive video players with hover previews

**Compatibility:**
- ✅ Safe to run on existing databases
- ✅ Does not affect existing data
- ✅ Backward compatible

---

### 2. `add_managers_captains_gameweek.sql`

Adds managers, captains, gameweek, and additional player fields to the database schema.

**Changes:**

#### New Tables

1. **`managers`** - Stores manager information
   - `manager_id` (UUID, PRIMARY KEY)
   - `name` (VARCHAR(255), NOT NULL)
   - `nationality` (VARCHAR(100))
   - `created_at`, `updated_at` (timestamps)

2. **`managing`** - Links managers to clubs with season dates
   - `managing_id` (UUID, PRIMARY KEY)
   - `manager_id` (UUID, FK → managers)
   - `club_id` (UUID, FK → clubs)
   - `start_date` (DATE, NOT NULL)
   - `end_date` (DATE, NULL if current)
   - `created_at`, `updated_at` (timestamps)

#### Modified Tables

1. **`clubs`** - Adds captain reference
   - `captain_id` (UUID, FK → players, optional)

2. **`matches`** - Adds gameweek number
   - `gameweek` (INTEGER, CHECK 1-38, optional)

3. **`players`** - Adds additional player information
   - `jersey_number` (INTEGER, CHECK 1-99, optional)
   - `height` (INTEGER, CHECK > 0, optional)
   - `weight` (INTEGER, CHECK > 0, optional)

**Indexes Created:**
- `idx_managers_name` on `managers(name)`
- `idx_managing_manager` on `managing(manager_id)`
- `idx_managing_club` on `managing(club_id)`
- `idx_clubs_captain` on `clubs(captain_id)`
- `idx_matches_gameweek` on `matches(gameweek)`

**When to Run:**
- When you want to track manager information
- When you want to store captain assignments
- When you want to store gameweek numbers (instead of calculating dynamically)
- When you want to store additional player statistics

**Usage Examples:**

```sql
-- Insert a manager
INSERT INTO managers (name, nationality)
VALUES ('Pep Guardiola', 'Spain');

-- Link manager to club
INSERT INTO managing (manager_id, club_id, start_date)
SELECT m.manager_id, c.club_id, '2023-07-01'
FROM managers m, clubs c
WHERE m.name = 'Pep Guardiola' AND c.name = 'Manchester City';

-- Set club captain
UPDATE clubs
SET captain_id = (
    SELECT player_id FROM players 
    WHERE name = 'Kevin De Bruyne' AND club_id = clubs.club_id
)
WHERE name = 'Manchester City';

-- Update match with gameweek
UPDATE matches
SET gameweek = 1
WHERE date >= '2023-08-01' AND date < '2023-08-15';
```

**After Migration:**
- Update your ETL script to populate:
  - Manager data in `managers` table
  - Manager-club associations in `managing` table
  - Captain assignments in `clubs.captain_id`
  - Gameweek numbers in `matches.gameweek` (or keep calculating dynamically)
  - Player jersey numbers, height, and weight
- API routes can now query manager and captain information
- Gameweek filtering can use stored column instead of dynamic calculation

**Compatibility:**
- ✅ Safe to run on existing databases
- ✅ Uses `IF NOT EXISTS` and `ADD COLUMN IF NOT EXISTS`
- ✅ Does not affect existing data
- ✅ Backward compatible
- ✅ Maintains UUID primary key structure

**Note:** This migration maintains full compatibility with the existing UUID-based schema. All new tables and columns use UUIDs to match the existing design pattern.

---

## 🔄 Migration Best Practices

### Before Running a Migration

1. **Backup Your Database**: Always backup before running migrations
2. **Test on Development**: Run migrations on development database first
3. **Review Changes**: Read the migration file to understand what it does
4. **Check Dependencies**: Ensure any required data is loaded first

### Running Migrations

1. **Run in Order**: If migrations depend on each other, run them in sequence
2. **Verify Results**: Check that tables/columns are created correctly
3. **Test Queries**: Verify that new features work as expected
4. **Update Code**: Update application code to use new schema features

### After Running a Migration

1. **Update ETL Scripts**: Modify data loading scripts to populate new fields
2. **Update API Routes**: Add endpoints or modify existing ones to use new data
3. **Update Frontend**: Modify UI to display new information
4. **Document Changes**: Update project documentation

## 🐛 Troubleshooting

### Migration Already Applied

**Issue**: Error about table/column already existing

**Solution**: Migrations use `IF NOT EXISTS` clauses, so they're safe to re-run. If you still get errors, the migration may have been partially applied. Check the database state and manually fix if needed.

### Foreign Key Violations

**Issue**: Cannot create foreign key constraint

**Solution**: 
1. Ensure referenced tables exist
2. Verify referenced columns have correct data types
3. Check that existing data doesn't violate constraints

### Circular Dependencies

**Issue**: Cannot create foreign key due to circular dependency

**Solution**: The `add_managers_captains_gameweek.sql` migration handles the circular dependency between `clubs` and `players` for the `captain_id` column by using a deferred constraint or allowing NULL values initially.

## 📚 Related Documentation

- **[Database README](../README.md)** - Main database documentation
- **[Main README](../../README.md)** - Project overview
- **[Server README](../../server/README.md)** - API documentation

## 📄 License

Part of the Premier League 2023/24 Analytics Hub project.

---

**© 2023/2024 Premier League Analytics Hub. Data provided by EPL Data.**
