# Data File Format Reference

This document provides detailed information about the expected format for each data file.

## stadium.xlsx

Excel file with stadium information.

| Column | Type | Required | Description | Example |
|--------|------|----------|-------------|---------|
| name | String | Yes | Stadium name | "Old Trafford" |
| city | String | Yes | City where stadium is located | "Manchester" |
| capacity | Integer | Yes | Maximum seating capacity | 74310 |

**Example:**
```
name,city,capacity
Old Trafford,Manchester,74310
Anfield,Liverpool,53394
Stamford Bridge,London,40341
```

## team.csv

CSV file with club/team information.

| Column | Type | Required | Description | Example |
|--------|------|----------|-------------|---------|
| name | String | Yes | Club name (will be normalized) | "Man Utd" or "Manchester United" |
| stadium | String | Yes | Stadium name (must match stadium.xlsx) | "Old Trafford" |
| founded | Integer | No | Year club was founded | 1878 |
| logo_url | String | No | URL to club logo | "https://example.com/logo.png" |

**Alternative column names:**
- `stadium_name` can be used instead of `stadium`

**Example:**
```
name,stadium,founded,logo_url
Man Utd,Old Trafford,1878,https://example.com/manutd.png
Liverpool,Anfield,1892,https://example.com/liverpool.png
Chelsea,Stamford Bridge,1905,https://example.com/chelsea.png
```

## players.csv

CSV file with player information.

| Column | Type | Required | Description | Example |
|--------|------|----------|-------------|---------|
| name | String | Yes | Player full name | "Mohamed Salah" |
| club | String | Yes | Club name (will be normalized) | "Liverpool" |
| position | String | Yes | Player position | "Forward" or "FWD" |
| nationality | String | Yes | Player nationality | "Egypt" |
| age | Integer | Yes | Player age (16-50) | 31 |

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

## matches.csv

CSV file with match results.

| Column | Type | Required | Description | Example |
|--------|------|----------|-------------|---------|
| home_team | String | Yes | Home team name (will be normalized) | "Man Utd" |
| away_team | String | Yes | Away team name (will be normalized) | "Liverpool" |
| date | DateTime | Yes | Match date/time | "2023-08-12 15:00:00" |
| home_goals | Integer | Yes | Goals scored by home team | 2 |
| away_goals | Integer | Yes | Goals scored by away team | 1 |
| attendance | Integer | No | Number of spectators | 70000 |
| referee | String | No | Referee name | "Michael Oliver" |

**Alternative column names:**
- `home` can be used instead of `home_team`
- `away` can be used instead of `away_team`

**Date formats supported:**
- ISO format: "2023-08-12 15:00:00"
- US format: "08/12/2023 15:00"
- UK format: "12/08/2023 15:00"
- Date only: "2023-08-12" (time defaults to 00:00:00)

**Example:**
```
home_team,away_team,date,home_goals,away_goals,attendance,referee
Man Utd,Liverpool,2023-08-12 15:00:00,2,1,70000,Michael Oliver
Arsenal,Chelsea,2023-08-13 12:30:00,1,1,60000,Anthony Taylor
Man City,Tottenham,2023-08-14 17:00:00,3,0,53400,Paul Tierney
```

## Data Quality Tips

1. **Team Names**: Use consistent naming or let the script normalize them
2. **Dates**: Use ISO format (YYYY-MM-DD HH:MM:SS) for best results
3. **Foreign Keys**: Ensure stadium names in `team.csv` match `stadium.xlsx`
4. **No Duplicates**: The script will skip duplicates, but cleaner data is better
5. **Missing Values**: Use empty strings or omit optional columns entirely

## Common Issues

### Team name not found
- Check spelling
- Add to normalization mapping in `etl_script.py`
- Fuzzy matching will attempt to match similar names

### Stadium not found
- Ensure stadium name in `team.csv` exactly matches `stadium.xlsx`
- Check for extra spaces or capitalization differences

### Date parsing errors
- Use ISO format: "2023-08-12 15:00:00"
- Ensure dates are in a recognizable format

### Foreign key violations
- Load data in order: stadiums → clubs → players/matches
- Ensure all referenced teams exist in `team.csv`

