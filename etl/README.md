# Premier League ETL Script

Python-based Extract, Transform, Load (ETL) script for ingesting CSV/XLSX datasets into PostgreSQL (Supabase) database for the Premier League 2023/24 Analytics Hub.

## 🎯 Features

- ✅ **Data Normalization**: Maps team name variations (e.g., 'Man Utd' → 'Manchester United')
- ✅ **Fuzzy Matching**: Uses RapidFuzz for intelligent name matching (80% threshold)
- ✅ **Foreign Key Handling**: Automatically resolves and assigns IDs
- ✅ **Error Handling**: Comprehensive error handling with detailed logging
- ✅ **Duplicate Prevention**: Checks for existing records before insertion
- ✅ **Data Validation**: Validates data types, ranges, and constraints
- ✅ **Verification**: Counts rows after insertion to verify success
- ✅ **Success Criteria**: Validates against targets (20 clubs, ~380 matches, all players)

## 📋 Prerequisites

- **Python** 3.8 or higher
- **PostgreSQL** database (Supabase recommended)
- **CSV/XLSX** data files
- **pip** package manager

## 🚀 Installation

### 1. Install Python Dependencies

```powershell
cd etl
pip install -r requirements.txt
```

### 2. Set Up Environment Variables

Create a `.env` file in the `etl/` directory:

```powershell
# Copy the example file
Copy-Item env.example .env
```

Edit `.env` and add your Supabase connection string:

```env
SUPABASE_CONNECTION_STRING=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
```

**Getting Your Connection String:**
1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **Database**
3. Copy the **Connection string** (URI format)

### 3. Prepare Data Files

Place your data files in the `etl/data/` directory (create if it doesn't exist):

- `stadium.xlsx` - Stadium information
- `team.csv` - Club/team information
- `players.csv` - Player information
- `matches.csv` - Match results

## 📄 Data File Formats

### stadium.xlsx

Excel file with stadium information.

| Column | Type | Required | Description | Example |
|--------|------|----------|-------------|---------|
| `name` | String | Yes | Stadium name | "Old Trafford" |
| `city` | String | Yes | City location | "Manchester" |
| `capacity` | Integer | Yes | Maximum seating capacity | 74310 |

**Example:**
```
name,city,capacity
Old Trafford,Manchester,74310
Anfield,Liverpool,53394
Stamford Bridge,London,40341
```

### team.csv

CSV file with club/team information.

| Column | Type | Required | Description | Example |
|--------|------|----------|-------------|---------|
| `name` | String | Yes | Club name (will be normalized) | "Man Utd" or "Manchester United" |
| `stadium` | String | Yes | Stadium name (must match stadium.xlsx) | "Old Trafford" |
| `founded` | Integer | No | Year club was founded | 1878 |
| `logo_url` | String | No | URL to club logo | "https://example.com/logo.png" |

**Alternative column names:**
- `stadium_name` can be used instead of `stadium`

**Example:**
```
name,stadium,founded,logo_url
Man Utd,Old Trafford,1878,https://example.com/manutd.png
Liverpool,Anfield,1892,https://example.com/liverpool.png
Chelsea,Stamford Bridge,1905,https://example.com/chelsea.png
```

### players.csv

CSV file with player information.

| Column | Type | Required | Description | Example |
|--------|------|----------|-------------|---------|
| `name` | String | Yes | Player full name | "Mohamed Salah" |
| `club` | String | Yes | Club name (will be normalized) | "Liverpool" |
| `position` | String | Yes | Player position | "Forward" or "FWD" |
| `nationality` | String | Yes | Player nationality | "Egypt" |
| `age` | Integer | Yes | Player age (16-50) | 31 |

**Alternative column names:**
- `club_name` or `team` can be used instead of `club`

**Position values** (will be normalized):
- Goalkeeper: "GK", "Goalkeeper"
- Defender: "DEF", "Defender"
- Midfielder: "MID", "Midfielder"
- Forward: "FWD", "Forward", "Striker", "Attacker"

**Example:**
```
name,club,position,nationality,age
Mohamed Salah,Liverpool,Forward,Egypt,31
Erling Haaland,Man City,Forward,Norway,23
Kevin De Bruyne,Man City,Midfielder,Belgium,32
```

### matches.csv

CSV file with match results.

| Column | Type | Required | Description | Example |
|--------|------|----------|-------------|---------|
| `home_team` | String | Yes | Home team name (will be normalized) | "Man Utd" |
| `away_team` | String | Yes | Away team name (will be normalized) | "Liverpool" |
| `date` | DateTime | Yes | Match date/time | "2023-08-12 15:00:00" |
| `home_goals` | Integer | Yes | Goals scored by home team | 2 |
| `away_goals` | Integer | Yes | Goals scored by away team | 1 |
| `attendance` | Integer | No | Number of spectators | 70000 |
| `referee` | String | No | Referee name | "Michael Oliver" |
| `youtube_link` | String | No | YouTube video URL or ID | "https://www.youtube.com/watch?v=..." |

**Alternative column names:**
- `home` can be used instead of `home_team`
- `away` can be used instead of `away_team`

**Date formats supported:**
- ISO format: "2023-08-12 15:00:00"
- US format: "08/12/2023 15:00"
- UK format: "12/08/2023 15:00"
- Date only: "2023-08-12" (time defaults to 00:00:00)

**YouTube Link formats supported:**
- Full URL: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
- Short URL: `https://youtu.be/dQw4w9WgXcQ`
- Embed URL: `https://www.youtube.com/embed/dQw4w9WgXcQ`
- Video ID only: `dQw4w9WgXcQ` (will be converted to full URL)

**Example:**
```
home_team,away_team,date,home_goals,away_goals,attendance,referee,youtube_link
Man Utd,Liverpool,2023-08-12 15:00:00,2,1,70000,Michael Oliver,https://www.youtube.com/watch?v=abc123
Arsenal,Chelsea,2023-08-13 12:30:00,1,1,60000,Anthony Taylor,
Man City,Tottenham,2023-08-14 17:00:00,3,0,53400,Paul Tierney,xyz789
```

## 🏃 Usage

### Run the ETL Script

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

### Execution Order

The script processes data in a specific order to maintain referential integrity:

1. **Stadiums** → Must be loaded first (no dependencies)
2. **Clubs** → Depends on stadiums
3. **Players** → Depends on clubs
4. **Matches** → Depends on clubs

## 📊 Output

### Console Output

The script provides real-time progress updates:

```
============================================================
Premier League ETL Process Started
============================================================
✓ Database connection established
Loading stadiums from data/stadium.xlsx...
✓ Loaded 20 new stadiums (total: 20)
Loading clubs from data/team.csv...
✓ Loaded 20 new clubs (total: 20)
Loading players from data/players.csv...
✓ Loaded 550 new players (skipped 12 duplicates)
Loading matches from data/matches.csv...
✓ Loaded 380 new matches (skipped 0 duplicates)
Verifying data insertion...
  stadiums: 20 rows
  clubs: 20 rows
  players: 550 rows
  matches: 380 rows
============================================================
ETL Process Summary
============================================================
Stadiums inserted: 20
Clubs inserted: 20
Players inserted: 550
Matches inserted: 380
Total errors: 0
✓ All success criteria met!
```

### Log File

Detailed logs are written to `etl.log` with:
- All operations and timestamps
- Warnings for skipped records
- Error messages with context
- Final summary statistics

## ✅ Success Criteria

The script validates against these targets:

- ✅ **20 clubs** loaded (Premier League has 20 teams)
- ✅ **~380 matches** loaded (38 matches × 10 fixtures per round)
- ✅ **All players** loaded without critical errors
- ✅ **All stadiums** loaded successfully

## 🔄 Team Name Normalization

The script automatically normalizes team name variations using:

### 1. Exact Mapping

Predefined mappings for common variations:
- 'Man Utd', 'Manchester Utd', 'Man U', 'MUFC' → 'Manchester United'
- 'Man City', 'MCFC' → 'Manchester City'
- 'Spurs', 'THFC' → 'Tottenham Hotspur'
- And many more...

### 2. Fuzzy Matching

Uses RapidFuzz library for intelligent matching:
- **Threshold**: 80% similarity
- **Algorithm**: Token sort ratio
- **Fallback**: If exact match fails, attempts fuzzy match

### Supported Variations

The script handles:
- Abbreviations (Man Utd, Man City)
- Alternative names (Spurs, Gunners)
- Common misspellings
- Case variations

## 🛡️ Error Handling

The script handles various error scenarios:

### Missing Files
- **Action**: Warns and continues with available files
- **Log**: Warning message in console and log file

### Missing Columns
- **Action**: Raises error with details
- **Log**: Error message with required columns list

### Data Type Mismatches
- **Action**: Attempts conversion (e.g., string to integer)
- **Log**: Warning if conversion fails

### Foreign Key Violations
- **Action**: Logs and skips record
- **Log**: Warning with record details

### Duplicate Records
- **Action**: Skips with warning
- **Log**: Warning message with duplicate details

### Unknown Team Names
- **Action**: Logs warning, skips record
- **Log**: Warning with team name and suggestions

All errors are logged to `etl.log` and included in the final summary.

## 🔍 Data Quality Mitigations

1. **Fuzzy Matching**: Handles name variations and typos
2. **Duplicate Detection**: Prevents duplicate insertions
3. **Data Validation**: Validates data types and constraints
4. **Foreign Key Resolution**: Automatically resolves stadium and club references
5. **Error Recovery**: Continues processing even if individual records fail

## 🐛 Troubleshooting

### Connection Issues

**Issue**: Database connection errors

**Solutions**:
1. Verify Supabase connection string is correct
2. Check that your IP is allowed in Supabase firewall settings
3. Ensure database password is correct (URL-encode special characters)
4. Test connection: `psql -h db.[PROJECT-REF].supabase.co -U postgres -d postgres`

### Team Name Not Found

**Issue**: "Could not normalize team name" warnings

**Solutions**:
1. Check the team name in your CSV file
2. Add the mapping to `TEAM_NAME_MAPPING` in `etl_script.py`
3. The fuzzy matcher will attempt to match similar names
4. Verify team names match official Premier League names

### Foreign Key Violations

**Issue**: Foreign key errors when inserting

**Solutions**:
1. Ensure stadiums are loaded before clubs
2. Ensure clubs are loaded before players and matches
3. Check that team names in matches/players match club names
4. Verify stadium names in team.csv match stadium.xlsx exactly

### Duplicate Errors

**Issue**: Duplicate record warnings

**Solutions**:
- The script automatically skips duplicates
- If you want to update existing records, modify the script to use `UPDATE` instead of `INSERT`
- Check your data files for actual duplicates

### Date Parsing Errors

**Issue**: Date format not recognized

**Solutions**:
1. Use ISO format: "2023-08-12 15:00:00"
2. Ensure dates are in a recognizable format
3. Check for extra spaces or special characters
4. Verify date column name matches expected format

## 📁 Project Structure

```
etl/
├── etl_script.py       # Main ETL script
├── requirements.txt    # Python dependencies
├── env.example         # Environment variables template
├── README.md           # This file
└── data/               # Data files directory (create if needed)
    ├── stadium.xlsx
    ├── team.csv
    ├── players.csv
    └── matches.csv
```

## 📚 Related Documentation

- **[Main README](../README.md)** - Project overview
- **[Database README](../database/README.md)** - Database schema
- **[Server README](../server/README.md)** - API documentation

## 📄 License

Part of the Premier League 2023/24 Analytics Hub project.

---

**© 2023/2024 Premier League Analytics Hub. Data provided by EPL Data.**
