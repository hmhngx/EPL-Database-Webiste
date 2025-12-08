# Premier League ETL Script

Python ETL script to ingest CSV/XLSX datasets into PostgreSQL database (Supabase) for Premier League 2023/24 Analytics Hub.

## Features

- ✅ **Data Normalization**: Maps team name variations (e.g., 'Man Utd' → 'Manchester United')
- ✅ **Fuzzy Matching**: Uses RapidFuzz for intelligent name matching
- ✅ **Foreign Key Handling**: Automatically resolves and assigns IDs
- ✅ **Error Handling**: Comprehensive error handling with detailed logging
- ✅ **Duplicate Prevention**: Checks for existing records before insertion
- ✅ **Data Validation**: Validates data types, ranges, and constraints
- ✅ **Verification**: Counts rows after insertion to verify success
- ✅ **Success Criteria**: Validates against targets (20 clubs, ~380 matches, all players)

## Prerequisites

- Python 3.8 or higher
- PostgreSQL database (Supabase)
- CSV/XLSX data files

## Installation

1. **Install Python dependencies:**

```powershell
cd etl
pip install -r requirements.txt
```

2. **Set up environment variables:**

Copy `.env.example` to `.env` and update with your Supabase connection string:

```powershell
copy .env.example .env
```

Edit `.env` and add your Supabase connection string:
```
SUPABASE_CONNECTION_STRING=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
```

To get your connection string:
1. Go to your Supabase project dashboard
2. Navigate to **Settings** > **Database**
3. Copy the **Connection string** (URI format)

3. **Prepare data files:**

Place your data files in the `data/` directory:
- `stadium.xlsx` - Stadium information
- `team.csv` - Club/team information
- `players.csv` - Player information
- `matches.csv` - Match results

## Data File Formats

### stadium.xlsx
Required columns:
- `name` - Stadium name
- `city` - City location
- `capacity` - Seating capacity (integer)

### team.csv
Required columns:
- `name` - Club name (will be normalized)
- `stadium` or `stadium_name` - Stadium name (must match stadium.xlsx)
- `founded` - Year founded (optional, integer)
- `logo_url` - Logo URL (optional)

### players.csv
Required columns:
- `name` - Player name
- `club` or `club_name` or `team` - Club name (will be normalized)
- `position` - Player position (will be normalized to: Goalkeeper, Defender, Midfielder, Forward)
- `nationality` - Player nationality
- `age` - Player age (16-50)

### matches.csv
Required columns:
- `home_team` or `home` - Home team name (will be normalized)
- `away_team` or `away` - Away team name (will be normalized)
- `date` - Match date (various formats supported)
- `home_goals` - Home team goals (integer)
- `away_goals` - Away team goals (integer)
- `attendance` - Match attendance (optional, integer)
- `referee` - Referee name (optional)

## Usage

Run the ETL script:

```powershell
python etl_script.py
```

The script will:
1. Connect to your Supabase database
2. Load stadiums from `stadium.xlsx`
3. Load clubs from `team.csv`
4. Load players from `players.csv`
5. Load matches from `matches.csv`
6. Verify insertion by counting rows
7. Check success criteria

## Output

The script generates:
- **Console output**: Progress logs and summary
- **etl.log**: Detailed log file with all operations

### Success Criteria

The script validates:
- ✅ **20 clubs** loaded
- ✅ **~380 matches** loaded (Premier League season = 38 matches × 10 fixtures per round)
- ✅ **All players** loaded without duplicates

## Team Name Normalization

The script automatically normalizes team name variations using:
1. **Exact mapping**: Predefined mappings (e.g., 'Man Utd' → 'Manchester United')
2. **Fuzzy matching**: Uses RapidFuzz for similar names (threshold: 80%)

Supported variations include:
- 'Man Utd', 'Manchester Utd', 'Man U', 'MUFC' → 'Manchester United'
- 'Man City', 'MCFC' → 'Manchester City'
- 'Spurs', 'THFC' → 'Tottenham Hotspur'
- And many more...

## Error Handling

The script handles:
- Missing files (warns and continues)
- Missing columns (raises error with details)
- Data type mismatches (attempts conversion)
- Foreign key violations (logs and skips)
- Duplicate records (skips with warning)
- Unknown team names (logs warning, skips record)

All errors are logged to `etl.log` and included in the final summary.

## Data Quality Mitigations

1. **Fuzzy Matching**: Handles name variations and typos
2. **Duplicate Detection**: Prevents duplicate insertions
3. **Data Validation**: Validates data types and constraints
4. **Foreign Key Resolution**: Automatically resolves stadium and club references
5. **Error Recovery**: Continues processing even if individual records fail

## Troubleshooting

### Connection Issues

If you get connection errors:
1. Verify your Supabase connection string is correct
2. Check that your IP is allowed in Supabase firewall settings
3. Ensure your database password is correct

### Team Name Not Found

If you see "Could not normalize team name" warnings:
1. Check the team name in your CSV file
2. Add the mapping to `TEAM_NAME_MAPPING` in `etl_script.py`
3. The fuzzy matcher will attempt to match similar names

### Foreign Key Violations

If you get foreign key errors:
1. Ensure stadiums are loaded before clubs
2. Ensure clubs are loaded before players and matches
3. Check that team names in matches/players match club names

### Duplicate Errors

The script automatically skips duplicates. If you want to update existing records, you'll need to modify the script to use `UPDATE` instead of `INSERT`.

## Example Output

```
2024-01-15 10:30:00 - INFO - ============================================================
2024-01-15 10:30:00 - INFO - Premier League ETL Process Started
2024-01-15 10:30:00 - INFO - ============================================================
2024-01-15 10:30:01 - INFO - ✓ Database connection established
2024-01-15 10:30:01 - INFO - Loading stadiums from data/stadium.xlsx...
2024-01-15 10:30:02 - INFO - ✓ Loaded 20 new stadiums (total: 20)
2024-01-15 10:30:02 - INFO - Loading clubs from data/team.csv...
2024-01-15 10:30:03 - INFO - ✓ Loaded 20 new clubs (total: 20)
2024-01-15 10:30:03 - INFO - Loading players from data/players.csv...
2024-01-15 10:30:05 - INFO - ✓ Loaded 550 new players (skipped 12 duplicates)
2024-01-15 10:30:05 - INFO - Loading matches from data/matches.csv...
2024-01-15 10:30:07 - INFO - ✓ Loaded 380 new matches (skipped 0 duplicates)
2024-01-15 10:30:07 - INFO - Verifying data insertion...
2024-01-15 10:30:07 - INFO -   stadiums: 20 rows
2024-01-15 10:30:07 - INFO -   clubs: 20 rows
2024-01-15 10:30:07 - INFO -   players: 550 rows
2024-01-15 10:30:07 - INFO -   matches: 380 rows
2024-01-15 10:30:07 - INFO - ============================================================
2024-01-15 10:30:07 - INFO - ETL Process Summary
2024-01-15 10:30:07 - INFO - ============================================================
2024-01-15 10:30:07 - INFO - Stadiums inserted: 20
2024-01-15 10:30:07 - INFO - Clubs inserted: 20
2024-01-15 10:30:07 - INFO - Players inserted: 550
2024-01-15 10:30:07 - INFO - Matches inserted: 380
2024-01-15 10:30:07 - INFO - Total errors: 0
2024-01-15 10:30:07 - INFO - ✓ All success criteria met!
```

## License

This script is part of the Premier League 2023/24 Analytics Hub project.

