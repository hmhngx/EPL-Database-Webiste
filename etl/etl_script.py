"""
Premier League 2023/24 Analytics Hub - ETL Script (CORRECTED)
Ingests CSV/XLSX data into PostgreSQL database via Supabase

CORRECTIONS:
1. Uses 'team' table (not 'clubs') to match backend
2. Uses correct column names (team_id, team_name, home_team_id, etc.)
3. Batch processing instead of row-by-row (10-50x performance improvement)
4. Fixed attendance parsing (removes commas)
5. Added matchweek calculation
6. Connection pooling for better performance
"""

import os
import sys
import re
import pandas as pd
import logging
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.exc import SQLAlchemyError, IntegrityError, OperationalError as SQLAlchemyOperationalError
from rapidfuzz import fuzz, process
from dotenv import load_dotenv
from unidecode import unidecode
import time
try:
    from psycopg2 import OperationalError as Psycopg2OperationalError
except ImportError:
    # Fallback if psycopg2 is not available
    Psycopg2OperationalError = Exception

# Add parent directory to path to import team_name_map
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from team_name_map import TEAM_NAME_MAP

# Load environment variables
load_dotenv()

# Configure logging with UTF-8 encoding support for Windows
# Create a custom stream handler that handles Unicode properly on Windows
class SafeStreamHandler(logging.StreamHandler):
    def emit(self, record):
        try:
            msg = self.format(record)
            stream = self.stream
            # Try to write with UTF-8 encoding if buffer is available
            if hasattr(stream, 'buffer') and hasattr(stream.buffer, 'write'):
                try:
                    # Write to buffer with UTF-8 encoding
                    stream.buffer.write(msg.encode('utf-8', errors='replace'))
                    stream.buffer.write(self.terminator.encode('utf-8'))
                    stream.buffer.flush()
                    return
                except (AttributeError, TypeError):
                    pass
            
            # Fallback: replace Unicode characters that can't be encoded
            try:
                stream.write(msg)
                stream.write(self.terminator)
                self.flush()
            except UnicodeEncodeError:
                # Replace problematic Unicode characters with ASCII equivalents
                msg_safe = msg.encode('ascii', errors='replace').decode('ascii')
                stream.write(msg_safe)
                stream.write(self.terminator)
                self.flush()
        except Exception:
            self.handleError(record)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('etl.log', encoding='utf-8'),
        SafeStreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Batch size for database inserts (optimize based on your database)
BATCH_SIZE = 500  # Process 500 rows per transaction


def is_excel_file(file_path: str) -> bool:
    """Check if file is actually an Excel file (even if named .csv)"""
    try:
        with open(file_path, 'rb') as f:
            header = f.read(8)
            # Excel files start with ZIP signature (PK\x03\x04) or OLE signature
            return header.startswith(b'PK\x03\x04') or header.startswith(b'\xd0\xcf\x11\xe0')
    except Exception:
        return False


def load_csv_with_encoding_detection(file_path: str) -> pd.DataFrame:
    """
    Load CSV or Excel file with robust encoding detection.
    Tries multiple encodings: utf-8, latin-1, iso-8859-1, cp1252
    Also detects if file is actually an Excel file (even if named .csv)
    """
    # Check if file is actually an Excel file
    if is_excel_file(file_path):
        logger.info(f"  File {file_path} appears to be Excel format, reading as Excel...")
        try:
            # Try to read Excel file - check all sheets if first doesn't have data
            excel_file = pd.ExcelFile(file_path)
            sheet_names = excel_file.sheet_names
            
            # Try each sheet until we find one with valid data
            for sheet_name in sheet_names:
                try:
                    df = pd.read_excel(file_path, sheet_name=sheet_name)
                    # Check if this sheet has reasonable data (more than just headers)
                    if df is not None and len(df) > 0 and len(df.columns) > 1:
                        # Check if columns look like actual data (not XML/metadata)
                        first_col = str(df.columns[0])
                        if not (len(first_col) > 100 or '<?xml' in first_col or '[Content_Types]' in first_col):
                            logger.info(f"  Successfully loaded as Excel file (sheet: {sheet_name}, {len(df)} rows, {len(df.columns)} columns)")
                            return df
                except Exception as e:
                    logger.debug(f"  Failed to read sheet {sheet_name}: {e}")
                    continue
            
            # If no sheet worked, try default (first sheet)
            df = pd.read_excel(file_path)
            logger.info(f"  Successfully loaded as Excel file (default sheet, {len(df)} rows)")
            return df
        except Exception as e:
            logger.warning(f"  Failed to read as Excel: {e}. Trying CSV formats...")
    
    encodings = ['utf-8', 'latin-1', 'iso-8859-1', 'cp1252']
    
    for encoding in encodings:
        try:
            # Try with pandas >= 2.0
            try:
                df = pd.read_csv(
                    file_path,
                    encoding=encoding,
                    on_bad_lines='skip',
                    engine='python',
                    quotechar='"',
                    skipinitialspace=True
                )
            except TypeError:
                # pandas < 2.0
                df = pd.read_csv(
                    file_path,
                    encoding=encoding,
                    error_bad_lines=False,
                    engine='python',
                    quotechar='"',
                    skipinitialspace=True
                )
            
            # Check if we got valid CSV data (not binary/Excel content)
            if df is not None and len(df.columns) > 0:
                first_col = str(df.columns[0])
                # If first column looks like binary/Excel content, try Excel reader
                if len(first_col) > 100 or '<?xml' in first_col or '[Content_Types]' in first_col or '.rels' in first_col:
                    logger.info(f"  File appears to be Excel format (detected from content), reading as Excel...")
                    try:
                        # Try all sheets
                        excel_file = pd.ExcelFile(file_path)
                        for sheet_name in excel_file.sheet_names:
                            try:
                                df = pd.read_excel(file_path, sheet_name=sheet_name)
                                if df is not None and len(df) > 0 and len(df.columns) > 1:
                                    first_col_check = str(df.columns[0])
                                    if not (len(first_col_check) > 100 or '<?xml' in first_col_check):
                                        logger.info(f"  Successfully loaded as Excel file (sheet: {sheet_name})")
                                        return df
                            except Exception:
                                continue
                        # Fallback to default
                        df = pd.read_excel(file_path)
                        logger.info(f"  Successfully loaded as Excel file")
                        return df
                    except Exception as e:
                        logger.warning(f"  Failed to read as Excel: {e}")
                        pass
            
            logger.debug(f"Successfully loaded {file_path} with {encoding} encoding")
            return df
        except (UnicodeDecodeError, UnicodeError):
            continue
        except Exception as e:
            # If it's not an encoding error, try next encoding
            if 'codec' in str(e).lower() or 'decode' in str(e).lower():
                continue
            # Otherwise, this encoding worked but there's another issue
            logger.warning(f"Error loading {file_path} with {encoding}: {e}")
            return df
    
    raise ValueError(f"Could not read {file_path} with any encoding: {encodings}")


class PremierLeagueETL:
    """ETL class for Premier League data ingestion (CORRECTED VERSION)"""
    
    # Team name normalization mapping (common variations to canonical names)
    TEAM_NAME_MAPPING = {
        'man utd': 'Manchester United',
        'manchester utd': 'Manchester United',
        'man u': 'Manchester United',
        'manchester united': 'Manchester United',
        'mufc': 'Manchester United',
        
        'man city': 'Manchester City',
        'manchester city': 'Manchester City',
        'mcfc': 'Manchester City',
        
        'liverpool': 'Liverpool',
        'lfc': 'Liverpool',
        
        'chelsea': 'Chelsea',
        'cfc': 'Chelsea',
        
        'arsenal': 'Arsenal',
        'afc': 'Arsenal',
        
        'tottenham': 'Tottenham Hotspur',
        'spurs': 'Tottenham Hotspur',
        'tottenham hotspur': 'Tottenham Hotspur',
        'thfc': 'Tottenham Hotspur',
        
        'brighton': 'Brighton & Hove Albion',
        'brighton & hove albion': 'Brighton & Hove Albion',
        'brighton and hove albion': 'Brighton & Hove Albion',
        
        'west ham': 'West Ham United',
        'west ham united': 'West Ham United',
        'whu': 'West Ham United',
        
        'newcastle': 'Newcastle United',
        'newcastle united': 'Newcastle United',
        'nufc': 'Newcastle United',
        
        'crystal palace': 'Crystal Palace',
        'cpfc': 'Crystal Palace',
        
        'fulham': 'Fulham',
        'ffc': 'Fulham',
        
        'wolves': 'Wolverhampton Wanderers',
        'wolverhampton': 'Wolverhampton Wanderers',
        'wolverhampton wanderers': 'Wolverhampton Wanderers',
        'wwfc': 'Wolverhampton Wanderers',
        
        'everton': 'Everton',
        'efc': 'Everton',
        
        'aston villa': 'Aston Villa',
        'villa': 'Aston Villa',
        'avfc': 'Aston Villa',
        
        'bournemouth': 'AFC Bournemouth',
        'afc bournemouth': 'AFC Bournemouth',
        
        'brentford': 'Brentford',
        'bfc': 'Brentford',
        
        'nottingham forest': 'Nottingham Forest',
        'nffc': 'Nottingham Forest',
        
        'luton': 'Luton Town',
        'luton town': 'Luton Town',
        'ltfc': 'Luton Town',
        
        'sheffield united': 'Sheffield United',
        'sheff utd': 'Sheffield United',
        'sufc': 'Sheffield United',
        
        'burnley': 'Burnley',
        'bfc': 'Burnley',
    }
    
    # Hardcoded mapping for 'Premier League 2023-24 Stats.xlsx' team names to database names
    PREMIER_LEAGUE_STATS_MAPPING = {
        'Man City': 'Manchester City',
        'Man Utd': 'Manchester United',
        'Brighton': 'Brighton & Hove Albion',
        'Brighton & Hove Albion': 'Brighton & Hove Albion',
        'West Ham': 'West Ham United',
        'Newcastle': 'Newcastle United',
        'Crystal Palace': 'Crystal Palace',
        'Wolves': 'Wolverhampton Wanderers',
        'Wolverhampton': 'Wolverhampton Wanderers',
        'Aston Villa': 'Aston Villa',
        'Bournemouth': 'Bournemouth',
        'AFC Bournemouth': 'Bournemouth',
        'Nottingham Forest': 'Nottingham Forest',
        'Sheffield Utd': 'Sheffield United',
        'Tottenham': 'Tottenham Hotspur',
        'Luton': 'Luton Town',
        'Arsenal': 'Arsenal',
        'Liverpool': 'Liverpool',
        'Chelsea': 'Chelsea',
        'Everton': 'Everton',
        'Fulham': 'Fulham',
        'Brentford': 'Brentford',
        'Burnley': 'Burnley',
    }
    
    # Position normalization mapping
    POSITION_MAPPING = {
        'gk': 'Goalkeeper',
        'goalkeeper': 'Goalkeeper',
        'def': 'Defender',
        'defender': 'Defender',
        'mid': 'Midfielder',
        'midfielder': 'Midfielder',
        'fwd': 'Forward',
        'forward': 'Forward',
        'striker': 'Forward',
        'attacker': 'Forward',
    }
    
    def __init__(self, connection_string: str, data_dir: str = 'data'):
        """
        Initialize ETL processor
        
        Args:
            connection_string: PostgreSQL connection string (Supabase format)
            data_dir: Directory containing CSV/XLSX files
        """
        self.connection_string = connection_string
        self.data_dir = data_dir
        self.engine = None
        self.team_id_map: Dict[str, str] = {}  # CORRECTED: Maps team names to UUIDs
        self.stadium_id_map: Dict[str, str] = {}  # Maps stadium names to UUIDs
        self.stats = {
            'stadiums_inserted': 0,
            'teams_inserted': 0,  # CORRECTED: was 'clubs_inserted'
            'players_inserted': 0,
            'matches_inserted': 0,
            'errors': []
        }
        
    def connect(self, max_retries: int = 3, retry_delay: int = 5):
        """
        Establish database connection with retry logic
        
        Args:
            max_retries: Maximum number of connection retry attempts
            retry_delay: Delay between retries in seconds
        """
        for attempt in range(max_retries):
            try:
                # Use connection pooling for better performance
                self.engine = create_engine(
                    self.connection_string,
                    pool_size=5,
                    max_overflow=10,
                    pool_pre_ping=True,  # Verify connections before using
                    connect_args={
                        'connect_timeout': 30
                    }
                )
                with self.engine.connect() as conn:
                    conn.execute(text("SELECT 1"))
                logger.info("✓ Database connection established")
                return True
            except Exception as e:
                if attempt < max_retries - 1:
                    logger.warning(f"Connection attempt {attempt + 1} failed: {str(e)}. Retrying in {retry_delay}s...")
                    time.sleep(retry_delay)
                else:
                    logger.error(f"✗ Database connection failed after {max_retries} attempts: {str(e)}")
                    return False
        return False
    
    def normalize_team_name(self, team_name: str, fuzzy_threshold: int = 80) -> Optional[str]:
        """
        Normalize team name using exact mapping and fuzzy matching
        
        Args:
            team_name: Raw team name from data
            fuzzy_threshold: Minimum similarity score for fuzzy matching (0-100)
            
        Returns:
            Normalized team name or None if no match found
        """
        if not team_name or pd.isna(team_name):
            return None
            
        team_name_lower = str(team_name).strip().lower()
        
        # Try exact mapping first
        if team_name_lower in self.TEAM_NAME_MAPPING:
            return self.TEAM_NAME_MAPPING[team_name_lower]
        
        # Try fuzzy matching against known team names
        known_teams = list(self.TEAM_NAME_MAPPING.values())
        result = process.extractOne(
            team_name,
            known_teams,
            scorer=fuzz.token_sort_ratio
        )
        
        if result and result[1] >= fuzzy_threshold:
            logger.info(f"Fuzzy matched '{team_name}' -> '{result[0]}' (score: {result[1]})")
            return result[0]
        
        logger.warning(f"Could not normalize team name: '{team_name}'")
        return None
    
    def normalize_position(self, position: str) -> Optional[str]:
        """Normalize player position"""
        if not position or pd.isna(position):
            return None
        
        position_lower = str(position).strip().lower()
        return self.POSITION_MAPPING.get(position_lower, position.title())
    
    def normalize_player_name(self, name: str) -> str:
        """
        Normalize player name using unidecode to strip accents and convert to lowercase.
        
        Args:
            name: Raw player name from CSV or database
            
        Returns:
            Normalized player name (lowercase, stripped, accents removed)
        """
        if not name or pd.isna(name):
            return ""
        
        # Convert to string, strip whitespace, remove accents, convert to lowercase
        normalized = unidecode(str(name).strip()).lower()
        return normalized
    
    def _try_fuzzy_match_missing_players(self, missing_players_data: list, player_map: dict, df: pd.DataFrame) -> None:
        """
        Try to fuzzy match missing players to existing players in database.
        Updates player_map if matches are found.
        
        Args:
            missing_players_data: List of dicts with missing player info
            player_map: Dictionary mapping (normalized_name, team_id) -> player_id
            df: DataFrame with player stats
        """
        from rapidfuzz import fuzz
        
        # Get all existing players from database for fuzzy matching
        with self.engine.connect() as conn:
            all_players = conn.execute(
                text("SELECT id, player_name, team_id FROM players")
            ).fetchall()
        
        matched_count = 0
        for missing_player in missing_players_data:
            missing_name = missing_player['normalized_name']
            missing_team_id = str(missing_player['team_id']) if missing_player['team_id'] else None
            
            # Try to find similar player names in the same team
            best_match = None
            best_score = 0
            threshold = 85  # Minimum similarity score (0-100)
            
            for player in all_players:
                player_id = str(player[0])
                player_name = str(player[1])
                player_team_id = str(player[2])
                
                # Only match players from the same team
                if missing_team_id and player_team_id != missing_team_id:
                    continue
                
                # Calculate similarity
                normalized_db_name = self.normalize_player_name(player_name)
                similarity = fuzz.ratio(missing_name, normalized_db_name)
                
                if similarity > best_score and similarity >= threshold:
                    best_score = similarity
                    best_match = (normalized_db_name, player_team_id, player_id)
            
            # If we found a good match, update the player_map
            if best_match:
                key = (missing_name, missing_team_id)
                player_map[key] = best_match[2]
                matched_count += 1
                logger.info(f"  Fuzzy matched: '{missing_player['name']}' -> '{best_match[0]}' (similarity: {best_score}%)")
        
        if matched_count > 0:
            logger.info(f"✓ Fuzzy matched {matched_count} missing players to existing database records")
    
    def _auto_insert_missing_players(self, missing_df: pd.DataFrame, player_map: dict, player_info_map: dict) -> int:
        """
        Auto-insert missing players into the database with minimal required data.
        
        Args:
            missing_df: DataFrame with players that couldn't be matched
            player_map: Dictionary mapping (normalized_name, team_id) -> player_id (will be updated)
            player_info_map: Dictionary mapping player_id -> player info (will be updated)
            
        Returns:
            Number of players successfully inserted
        """
        if len(missing_df) == 0:
            return 0
        
        # Filter to only players with valid team_id (required for insertion)
        insertable = missing_df[missing_df['team_id'].notna()].copy()
        
        if len(insertable) == 0:
            logger.warning("  Cannot auto-insert missing players: all are missing team_id")
            return 0
        
        # Remove duplicates (same normalized name + team)
        insertable = insertable.drop_duplicates(subset=['player_name_normalized', 'team_id'], keep='first')
        
        inserted = 0
        # Use individual transactions for each insertion to prevent cascade failures
        for _, row in insertable.iterrows():
            try:
                player_name = str(row.get('player_name', '')).strip()
                team_id = int(row['team_id'])
                
                if not player_name:
                    continue
                
                normalized_name = self.normalize_player_name(player_name)
                key = (normalized_name, str(team_id))
                
                # First, check if player already exists in database (by name and team_id)
                # Use normalized name matching and fuzzy matching to handle name variations
                with self.engine.connect() as conn:
                    # Get all players for this team and check using normalized names
                    all_team_players = conn.execute(
                        text("""
                            SELECT id, player_name FROM players 
                            WHERE team_id = :team_id
                        """),
                        {"team_id": team_id}
                    ).fetchall()
                    
                    # Check if any existing player matches (using normalized names and fuzzy matching)
                    best_match = None
                    best_score = 0
                    threshold = 85  # Minimum similarity for fuzzy match
                    
                    for existing in all_team_players:
                        existing_id = str(existing[0])
                        existing_name = str(existing[1])
                        existing_normalized = self.normalize_player_name(existing_name)
                        
                        # Exact match on normalized names
                        if existing_normalized == normalized_name:
                            # Player already exists, just update the map
                            player_map[key] = existing_id
                            player_info_map[existing_id] = {'name': existing_name, 'team_id': team_id}
                            logger.debug(f"  Found existing player (not inserting): {player_name} -> {existing_name} (team_id: {team_id}, id: {existing_id})")
                            best_match = (existing_id, existing_name, 100)
                            break
                        
                        # Try fuzzy matching if no exact match yet
                        if best_match is None:
                            from rapidfuzz import fuzz
                            similarity = fuzz.ratio(normalized_name, existing_normalized)
                            if similarity > best_score and similarity >= threshold:
                                best_score = similarity
                                best_match = (existing_id, existing_name, similarity)
                    
                    # Use best fuzzy match if found (but not exact match, which is already handled above)
                    if best_match and best_match[2] >= threshold and best_match[2] < 100:
                        player_map[key] = best_match[0]
                        player_info_map[best_match[0]] = {'name': best_match[1], 'team_id': team_id}
                        logger.debug(f"  Fuzzy matched existing player (not inserting): '{player_name}' -> '{best_match[1]}' (similarity: {best_match[2]:.1f}%, team_id: {team_id}, id: {best_match[0]})")
                        continue
                    
                    # If we found an exact match (100%), skip insertion
                    if best_match and best_match[2] == 100:
                        continue
                    
                    # If we found a match, skip insertion
                    if key in player_map:
                        continue
                
                # Player doesn't exist, try to insert
                # First, ensure the sequence is synchronized
                try:
                    with self.engine.begin() as conn:
                        # Fix sequence if it's out of sync
                        conn.execute(
                            text("""
                                SELECT setval('players_id_seq', COALESCE((SELECT MAX(id) FROM players), 1), true)
                            """)
                        )
                        
                        # Insert player with minimal required data (name and team_id)
                        # Other fields (age, position, nationality) will be NULL
                        result = conn.execute(
                            text("""
                                INSERT INTO players (team_id, player_name, position, nationality, age)
                                VALUES (:team_id, :player_name, NULL, NULL, NULL)
                                RETURNING id
                            """),
                            {
                                "team_id": team_id,
                                "player_name": player_name
                            }
                        )
                        player_id = str(result.fetchone()[0])
                        
                        # Update maps
                        player_map[key] = player_id
                        player_info_map[player_id] = {'name': player_name, 'team_id': team_id}
                        
                        inserted += 1
                        logger.info(f"  Auto-inserted: {player_name} (team_id: {team_id}, id: {player_id})")
                except Exception as insert_error:
                    # If insert fails, re-raise to be caught by outer exception handler
                    raise insert_error
                    
            except Exception as e:
                # Check if it's a duplicate key error - if so, try to find the existing player
                if 'duplicate key' in str(e).lower() or 'unique constraint' in str(e).lower():
                    # Player might have been inserted between our check and insert, or exists with different name
                    # Try to find it using normalized name matching and fuzzy matching
                    try:
                        with self.engine.connect() as conn:
                            # Get all players for this team and check using normalized names
                            all_team_players = conn.execute(
                                text("""
                                    SELECT id, player_name FROM players 
                                    WHERE team_id = :team_id
                                """),
                                {"team_id": team_id}
                            ).fetchall()
                            
                            # First try exact normalized name match
                            best_match = None
                            best_score = 0
                            threshold = 85  # Minimum similarity for fuzzy match
                            
                            for existing in all_team_players:
                                existing_id = str(existing[0])
                                existing_name = str(existing[1])
                                existing_normalized = self.normalize_player_name(existing_name)
                                
                                # Exact match on normalized names
                                if existing_normalized == normalized_name:
                                    player_map[key] = existing_id
                                    player_info_map[existing_id] = {'name': existing_name, 'team_id': team_id}
                                    logger.debug(f"  Found existing player after duplicate error: {player_name} -> {existing_name} (id: {existing_id})")
                                    best_match = (existing_id, existing_name, 100)
                                    break
                                
                                # If no exact match, try fuzzy matching
                                if best_match is None:
                                    from rapidfuzz import fuzz
                                    similarity = fuzz.ratio(normalized_name, existing_normalized)
                                    if similarity > best_score and similarity >= threshold:
                                        best_score = similarity
                                        best_match = (existing_id, existing_name, similarity)
                            
                            # Use best match if found
                            if best_match and best_match[2] >= threshold:
                                player_map[key] = best_match[0]
                                player_info_map[best_match[0]] = {'name': best_match[1], 'team_id': team_id}
                                if best_match[2] < 100:
                                    logger.info(f"  Fuzzy matched after duplicate error: '{player_name}' -> '{best_match[1]}' (similarity: {best_match[2]:.1f}%)")
                                else:
                                    logger.debug(f"  Found existing player after duplicate error: {player_name} -> {best_match[1]} (id: {best_match[0]})")
                            else:
                                # No good match found - this is a real problem, log it
                                logger.warning(f"  Duplicate key error for {player_name} (team_id: {team_id}), but could not find matching player in database")
                    except Exception as inner_e:
                        logger.debug(f"  Error while trying to find existing player after duplicate key: {inner_e}")
                
                # Log error but continue with next player - transaction is automatically rolled back
                if key not in player_map:  # Only log if we didn't successfully map the player
                    logger.warning(f"  Failed to auto-insert player {row.get('player_name', 'Unknown')}: {str(e)}")
                continue
        
        return inserted
    
    def calculate_matchweek(self, date: pd.Timestamp, season_start: pd.Timestamp = pd.Timestamp('2023-08-11')) -> Optional[int]:
        """
        Calculate matchweek from date
        
        Args:
            date: Match date
            season_start: First matchweek date (default: 2023-08-11 for 2023/24 season)
            
        Returns:
            Matchweek number (1-38) or None if invalid
        """
        if pd.isna(date) or pd.isna(season_start):
            return None
        
        # Calculate days since season start
        days_diff = (date - season_start).days
        
        # Matchweeks are typically every 7 days, but allow some flexibility
        # Premier League has 38 matchweeks
        matchweek = (days_diff // 7) + 1
        
        # Validate range
        if 1 <= matchweek <= 38:
            return matchweek
        else:
            logger.warning(f"Calculated matchweek {matchweek} out of range for date {date}")
            return None
    
    def load_stadiums(self, file_path: str) -> bool:
        """
        Load stadiums from XLSX or CSV file (BATCH PROCESSED)
        
        Expected columns: name, city, capacity
        CORRECTED: Uses stadiums table with id, stadium_name columns
        """
        try:
            logger.info(f"Loading stadiums from {file_path}...")
            start_time = time.time()
            
            # Read file (supports both XLSX and CSV)
            if file_path.lower().endswith('.csv'):
                df = load_csv_with_encoding_detection(file_path)
            else:
                df = pd.read_excel(file_path)
            
            # Normalize column names (case-insensitive)
            df.columns = df.columns.str.strip().str.lower()
            
            # Handle different column name formats
            # Map database format (stadium_name, location) to expected format (name, city)
            if 'stadium_name' in df.columns and 'name' not in df.columns:
                df['name'] = df['stadium_name']
            if 'location' in df.columns and 'city' not in df.columns:
                df['city'] = df['location']
            
            # Validate required columns
            required_cols = ['name', 'city', 'capacity']
            missing_cols = [col for col in required_cols if col not in df.columns]
            if missing_cols:
                raise ValueError(f"Missing required columns: {missing_cols}. Found columns: {list(df.columns)}")
            
            # Clean and validate data
            df = df.dropna(subset=['name', 'city', 'capacity'])
            df['name'] = df['name'].str.strip()
            df['city'] = df['city'].str.strip()
            df['capacity'] = pd.to_numeric(df['capacity'], errors='coerce')
            df = df.dropna(subset=['capacity'])
            df = df[df['capacity'] > 0]
            
            # Remove duplicates
            df = df.drop_duplicates(subset=['name'], keep='first')
            
            # Rename columns to match database schema
            df = df.rename(columns={'name': 'stadium_name'})
            
            # Batch insert using pandas to_sql with if_exists='append'
            # First, get existing stadiums to avoid duplicates
            with self.engine.connect() as conn:
                existing = conn.execute(
                    text("SELECT stadium_name FROM stadiums")
                ).fetchall()
                existing_names = {row[0].lower() for row in existing}
            
            # Filter out existing stadiums
            # Ensure stadium_name is a Series before using .str
            if 'stadium_name' not in df.columns:
                raise ValueError(f"stadium_name column not found after processing. Columns: {list(df.columns)}")
            
            # Ensure we have a Series, not a DataFrame (handle duplicate column names)
            stadium_name_col = df['stadium_name']
            if isinstance(stadium_name_col, pd.DataFrame):
                # If multiple columns with same name, take first
                stadium_name_col = stadium_name_col.iloc[:, 0]
            
            # Convert to string and lowercase for comparison
            stadium_names_lower = stadium_name_col.astype(str).str.lower()
            df_new = df[~stadium_names_lower.isin(existing_names)]
            
            if len(df_new) == 0:
                logger.info("All stadiums already exist in database")
                # Still populate stadium_id_map for later use
                with self.engine.connect() as conn:
                    result = conn.execute(
                        text("SELECT id, stadium_name FROM stadiums")
                    ).fetchall()
                    self.stadium_id_map = {row[1]: str(row[0]) for row in result}
                return True
            
            # Batch insert new stadiums
            inserted = 0
            with self.engine.begin() as conn:  # Use begin() for transaction management
                # Insert in batches
                for i in range(0, len(df_new), BATCH_SIZE):
                    batch = df_new.iloc[i:i+BATCH_SIZE]
                    for _, row in batch.iterrows():
                        try:
                            result = conn.execute(
                                text("""
                                    INSERT INTO stadiums (stadium_name, city, capacity)
                                    VALUES (:stadium_name, :city, :capacity)
                                    RETURNING id
                                """),
                                {
                                    "stadium_name": row['stadium_name'],
                                    "city": row['city'],
                                    "capacity": int(row['capacity'])
                                }
                            )
                            stadium_id = result.fetchone()[0]
                            self.stadium_id_map[row['stadium_name']] = str(stadium_id)
                            inserted += 1
                        except IntegrityError:
                            # Duplicate detected, skip
                            pass
                
                # Commit transaction
                conn.commit()
            
            # Populate stadium_id_map with all stadiums (including existing)
            with self.engine.connect() as conn:
                result = conn.execute(
                    text("SELECT id, stadium_name FROM stadiums")
                ).fetchall()
                self.stadium_id_map = {row[1]: str(row[0]) for row in result}
            
            self.stats['stadiums_inserted'] = inserted
            duration = time.time() - start_time
            logger.info(f"✓ Loaded {inserted} new stadiums (total: {len(self.stadium_id_map)}) in {duration:.2f}s")
            return True
            
        except Exception as e:
            logger.error(f"✗ Failed to load stadiums: {str(e)}")
            self.stats['errors'].append(f"Load stadiums: {str(e)}")
            return False
    
    def load_teams(self, file_path: str) -> bool:
        """
        Load teams from CSV file (BATCH PROCESSED)
        
        Expected columns: name, stadium_name (or stadium), founded_year, logo_url (optional)
        CORRECTED: Uses 'team' table with team_id, team_name, stadium_id columns
        """
        try:
            logger.info(f"Loading teams from {file_path}...")
            start_time = time.time()
            
            # Read CSV file with encoding detection
            df = load_csv_with_encoding_detection(file_path)
            
            # Normalize column names
            df.columns = df.columns.str.strip().str.lower()
            
            # Check if file is already in database format (has stadium_id)
            if 'stadium_id' in df.columns:
                logger.info("Teams file appears to be in database format (has stadium_id). Skipping - data already loaded.")
                # Still populate team_id_map for later use
                with self.engine.connect() as conn:
                    result = conn.execute(
                        text("SELECT team_id, team_name FROM team")
                    ).fetchall()
                    self.team_id_map = {row[1]: str(row[0]) for row in result}
                return True
            
            # Handle different column name variations
            if 'stadium_name' in df.columns:
                df['stadium'] = df['stadium_name']
            elif 'stadium' not in df.columns:
                raise ValueError(f"Missing 'stadium' or 'stadium_name' column. Found columns: {list(df.columns)}")
            
            # Validate required columns
            required_cols = ['name', 'stadium']
            missing_cols = [col for col in required_cols if col not in df.columns]
            if missing_cols:
                raise ValueError(f"Missing required columns: {missing_cols}")
            
            # Clean and normalize data
            df = df.dropna(subset=['name', 'stadium'])
            df['name'] = df['name'].apply(self.normalize_team_name)
            df = df.dropna(subset=['name'])  # Remove rows where name normalization failed
            
            # Normalize stadium names (fuzzy match)
            df['stadium'] = df['stadium'].str.strip()
            
            # Handle founded_year
            if 'founded_year' in df.columns:
                df['founded_year'] = pd.to_numeric(df['founded_year'], errors='coerce')
            elif 'founded' in df.columns:
                df['founded_year'] = pd.to_numeric(df['founded'], errors='coerce')
            else:
                df['founded_year'] = None
            
            # Handle logo_url
            if 'logo_url' in df.columns:
                df['logo_url'] = df['logo_url'].apply(lambda x: str(x).strip() if pd.notna(x) and str(x).strip() else None)
            else:
                df['logo_url'] = None
            
            # Remove duplicates
            df = df.drop_duplicates(subset=['name'], keep='first')
            
            # Match stadiums (fuzzy match if needed)
            stadiums_list = list(self.stadium_id_map.keys())
            df['stadium_id'] = df['stadium'].apply(
                lambda s: self._fuzzy_match_stadium(s, stadiums_list) if s else None
            )
            df = df.dropna(subset=['stadium_id'])
            
            # Rename columns to match database schema
            df = df.rename(columns={'name': 'team_name'})
            
            # Get existing teams to avoid duplicates
            with self.engine.connect() as conn:
                existing = conn.execute(
                    text("SELECT team_name FROM team")
                ).fetchall()
                existing_names = {row[0].lower() for row in existing}
            
            # Filter out existing teams
            df_new = df[~df['team_name'].str.lower().isin(existing_names)]
            
            if len(df_new) == 0:
                logger.info("All teams already exist in database")
                # Still populate team_id_map
                with self.engine.connect() as conn:
                    result = conn.execute(
                        text("SELECT team_id, team_name FROM team")
                    ).fetchall()
                    self.team_id_map = {row[1]: str(row[0]) for row in result}
                return True
            
            # Batch insert new teams
            inserted = 0
            with self.engine.begin() as conn:
                for i in range(0, len(df_new), BATCH_SIZE):
                    batch = df_new.iloc[i:i+BATCH_SIZE]
                    for _, row in batch.iterrows():
                        try:
                            result = conn.execute(
                                text("""
                                    INSERT INTO team (stadium_id, team_name, founded_year, logo_url)
                                    VALUES (:stadium_id, :team_name, :founded_year, :logo_url)
                                    RETURNING team_id
                                """),
                                {
                                    "stadium_id": row['stadium_id'],
                                    "team_name": row['team_name'],
                                    "founded_year": int(row['founded_year']) if pd.notna(row['founded_year']) else None,
                                    "logo_url": row['logo_url']
                                }
                            )
                            team_id = result.fetchone()[0]
                            self.team_id_map[row['team_name']] = str(team_id)
                            inserted += 1
                        except IntegrityError:
                            pass
                
                conn.commit()
            
            # Populate team_id_map with all teams
            with self.engine.connect() as conn:
                result = conn.execute(
                    text("SELECT team_id, team_name FROM team")
                ).fetchall()
                self.team_id_map = {row[1]: str(row[0]) for row in result}
            
            self.stats['teams_inserted'] = inserted
            duration = time.time() - start_time
            logger.info(f"✓ Loaded {inserted} new teams (total: {len(self.team_id_map)}) in {duration:.2f}s")
            return True
            
        except Exception as e:
            logger.error(f"✗ Failed to load teams: {str(e)}")
            self.stats['errors'].append(f"Load teams: {str(e)}")
            return False
    
    def _fuzzy_match_stadium(self, stadium_name: str, stadiums_list: List[str]) -> Optional[str]:
        """Fuzzy match stadium name and return stadium_id"""
        if not stadium_name:
            return None
        
        # Try exact match first
        for s_name, s_id in self.stadium_id_map.items():
            if s_name.lower() == stadium_name.lower():
                return s_id
        
        # Try fuzzy match
        match = process.extractOne(
            stadium_name,
            stadiums_list,
            scorer=fuzz.token_sort_ratio
        )
        
        if match and match[1] >= 80:
            return self.stadium_id_map[match[0]]
        
        logger.warning(f"Could not match stadium: '{stadium_name}'")
        return None
    
    def load_players(self, file_path: str) -> bool:
        """
        Load players from CSV file (BATCH PROCESSED)
        
        Expected columns: name, club_name (or club, team), position, nationality, age
        CORRECTED: Uses 'players' table with id, team_id, player_name columns
        """
        try:
            logger.info(f"Loading players from {file_path}...")
            start_time = time.time()
            
            # Read CSV file with encoding detection
            df = load_csv_with_encoding_detection(file_path)
            
            # Normalize column names
            df.columns = df.columns.str.strip().str.lower()
            
            # Check if file is already in database format (has team_id)
            if 'team_id' in df.columns:
                logger.info("Players file appears to be in database format (has team_id). Skipping - data already loaded.")
                return True
            
            # Handle different column name variations
            if 'club_name' in df.columns:
                df['club'] = df['club_name']
            elif 'team' in df.columns:
                df['club'] = df['team']
            elif 'club' not in df.columns:
                raise ValueError(f"Missing 'club', 'club_name', or 'team' column. Found columns: {list(df.columns)}")
            
            # Validate required columns
            required_cols = ['name', 'club', 'position', 'nationality', 'age']
            missing_cols = [col for col in required_cols if col not in df.columns]
            if missing_cols:
                raise ValueError(f"Missing required columns: {missing_cols}")
            
            # Clean and normalize data
            df = df.dropna(subset=['name', 'club', 'position', 'nationality', 'age'])
            df['name'] = df['name'].str.strip()
            df['club'] = df['club'].apply(self.normalize_team_name)
            df['position'] = df['position'].apply(self.normalize_position)
            df['nationality'] = df['nationality'].str.strip()
            df['age'] = pd.to_numeric(df['age'], errors='coerce')
            
            # Remove rows where normalization failed
            df = df.dropna(subset=['club', 'position'])
            df = df[df['age'].between(16, 50)]
            
            # Remove duplicates (same name and club)
            df = df.drop_duplicates(subset=['name', 'club'], keep='first')
            
            # Map club names to team_ids
            df['team_id'] = df['club'].map(self.team_id_map)
            df = df.dropna(subset=['team_id'])
            
            # Get existing players to avoid duplicates
            with self.engine.connect() as conn:
                existing = conn.execute(
                    text("SELECT player_name, team_id FROM players")
                ).fetchall()
                existing_players = {(row[0].lower(), str(row[1])) for row in existing}
            
            # Filter out existing players
            df['exists'] = df.apply(
                lambda row: (row['name'].lower(), str(row['team_id'])) in existing_players,
                axis=1
            )
            df_new = df[~df['exists']].drop(columns=['exists'])
            
            if len(df_new) == 0:
                logger.info("All players already exist in database")
                return True
            
            # Rename columns to match database schema
            df_new = df_new.rename(columns={'name': 'player_name'})
            
            # Batch insert new players
            inserted = 0
            with self.engine.begin() as conn:
                for i in range(0, len(df_new), BATCH_SIZE):
                    batch = df_new.iloc[i:i+BATCH_SIZE]
                    for _, row in batch.iterrows():
                        try:
                            conn.execute(
                                text("""
                                    INSERT INTO players (team_id, player_name, position, nationality, age)
                                    VALUES (:team_id, :player_name, :position, :nationality, :age)
                                """),
                                {
                                    "team_id": row['team_id'],
                                    "player_name": row['player_name'],
                                    "position": row['position'],
                                    "nationality": row['nationality'],
                                    "age": int(row['age'])
                                }
                            )
                            inserted += 1
                        except IntegrityError:
                            pass
                
                conn.commit()
            
            self.stats['players_inserted'] = inserted
            duration = time.time() - start_time
            logger.info(f"✓ Loaded {inserted} new players (skipped {len(df) - len(df_new)} duplicates) in {duration:.2f}s")
            return True
            
        except Exception as e:
            logger.error(f"✗ Failed to load players: {str(e)}")
            self.stats['errors'].append(f"Load players: {str(e)}")
            return False
    
    def extract_youtube_id(self, link: str) -> Optional[str]:
        """
        Extract and validate YouTube video ID from URL or return ID if already extracted
        
        Args:
            link: YouTube URL or video ID (11 characters)
            
        Returns:
            YouTube video ID (11 characters) or None if invalid
        """
        if not link or pd.isna(link):
            return None
        
        link = str(link).strip()
        if not link or link.lower() in ['null', 'none', '']:
            return None
        
        # If it's a full URL, extract the video ID
        if 'youtube.com' in link or 'youtu.be' in link:
            patterns = [
                r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})',
                r'youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})'
            ]
            for pattern in patterns:
                match = re.search(pattern, link)
                if match:
                    video_id = match.group(1)
                    if len(video_id) == 11:
                        return video_id
        
        # If it's already just a video ID, validate it's exactly 11 characters
        if len(link) == 11 and link.replace('-', '').replace('_', '').isalnum():
            return link
        
        logger.warning(f"Invalid YouTube ID format (must be 11 characters): {link}")
        return None
    
    def clean_attendance(self, value) -> Optional[int]:
        """
        Clean attendance value, removing commas and handling NULL strings
        
        CORRECTED: Removes commas from attendance strings like "21,572"
        """
        if pd.isna(value):
            return None
        
        value_str = str(value).strip()
        if value_str.lower() in ['null', 'none', '', 'nan']:
            return None
        
        # Remove commas and convert to int
        value_str = value_str.replace(',', '').replace(' ', '')
        try:
            return int(float(value_str))
        except (ValueError, TypeError):
            logger.warning(f"Could not parse attendance value: {value}")
            return None
    
    def clean_numeric_string(self, value) -> Optional[float]:
        """
        Clean numeric string by removing commas and converting to float/int
        
        Args:
            value: String or numeric value that may contain commas
            
        Returns:
            Float value or None if invalid
        """
        if pd.isna(value):
            return None
        
        value_str = str(value).strip()
        if value_str.lower() in ['null', 'none', '', 'nan']:
            return None
        
        # Remove commas and spaces, then convert
        value_str = value_str.replace(',', '').replace(' ', '')
        try:
            return float(value_str)
        except (ValueError, TypeError):
            logger.warning(f"Could not parse numeric value: {value}")
            return None
    
    def clean_numeric_value(self, value) -> Optional[float]:
        """
        Clean numeric value by removing non-numeric characters (%, commas, etc.) and converting to float.
        Uses COALESCE logic: returns 0 if value is None/NaN after cleaning.
        
        Args:
            value: String or numeric value that may contain %, commas, etc.
            
        Returns:
            Float value or 0.0 if invalid/None
        """
        if pd.isna(value):
            return 0.0
        
        value_str = str(value).strip()
        if value_str.lower() in ['null', 'none', '', 'nan']:
            return 0.0
        
        # Remove %, commas, spaces, and other non-numeric characters (except decimal point and minus sign)
        value_str = re.sub(r'[^\d\.\-]', '', value_str)
        
        if not value_str or value_str == '-' or value_str == '.':
            return 0.0
        
        try:
            return float(value_str)
        except (ValueError, TypeError):
            logger.warning(f"Could not parse numeric value: {value}, defaulting to 0")
            return 0.0
    
    def clean_int(self, value) -> Optional[int]:
        """
        Clean numeric value and convert to integer. Handles NaNs, empty strings, and removes % signs.
        
        Args:
            value: String or numeric value that may contain %, commas, etc.
            
        Returns:
            Integer value or 0 if invalid/None
        """
        if pd.isna(value):
            return 0
        
        value_str = str(value).strip()
        if value_str.lower() in ['null', 'none', '', 'nan']:
            return 0
        
        # Remove %, commas, spaces, and other non-numeric characters (except minus sign)
        value_str = re.sub(r'[^\d\-]', '', value_str)
        
        if not value_str or value_str == '-':
            return 0
        
        try:
            return int(float(value_str))
        except (ValueError, TypeError):
            logger.warning(f"Could not parse integer value: {value}, defaulting to 0")
            return 0
    
    def clean_corners(self, value, team_name: str = "Unknown") -> int:
        """
        Robust cleaning function specifically for corners data.
        Handles string to int conversion, whitespace stripping, and NaN/empty to 0 conversion.
        
        Args:
            value: String or numeric value that may contain corners count
            team_name: Team name for debug logging
            
        Returns:
            Integer value (0 if invalid/None)
        """
        if pd.isna(value):
            return 0
        
        value_str = str(value).strip()
        if value_str.lower() in ['null', 'none', '', 'nan']:
            return 0
        
        # Remove %, commas, spaces, and other non-numeric characters (except minus sign)
        value_str = re.sub(r'[^\d\-]', '', value_str)
        
        if not value_str or value_str == '-':
            return 0
        
        try:
            result = int(float(value_str))
            return result
        except (ValueError, TypeError):
            logger.warning(f"Could not parse corner value '{value}' for team '{team_name}', defaulting to 0")
            return 0
    
    def parse_fixture(self, fixture: str) -> Tuple[Optional[str], Optional[str]]:
        """
        Parse fixture string to extract home and away team names.
        
        Handles formats like:
        - 'Arsenal at Liverpool' (away at home)
        - 'Arsenal vs Liverpool' (home vs away)
        - 'Arsenal - Liverpool' (home - away)
        
        Args:
            fixture: Fixture string from CSV
            
        Returns:
            Tuple of (home_team, away_team) or (None, None) if parsing fails
        """
        if not fixture or pd.isna(fixture):
            return None, None
        
        fixture_str = str(fixture).strip()
        
        # Common separators: ' at ', ' vs ', ' - ', ' v ', ' @ '
        separators = [' at ', ' vs ', ' - ', ' v ', ' @ ']
        
        for sep in separators:
            if sep in fixture_str:
                parts = fixture_str.split(sep, 1)
                if len(parts) == 2:
                    team1 = parts[0].strip()
                    team2 = parts[1].strip()
                    
                    # Determine which is home/away based on separator
                    if sep == ' at ' or sep == ' @ ':
                        # Format: "Away at Home"
                        return team2, team1
                    else:
                        # Format: "Home vs Away" or "Home - Away"
                        return team1, team2
        
        # If no separator found, log warning
        logger.warning(f"Could not parse fixture: {fixture_str}")
        return None, None
    
    def normalize_team_name_with_map(self, team_name: str) -> Optional[str]:
        """
        Normalize team name using TEAM_NAME_MAP and PREMIER_LEAGUE_STATS_MAPPING.
        
        Args:
            team_name: Raw team name from CSV
            
        Returns:
            Normalized team name or None if no match found
        """
        if not team_name or pd.isna(team_name):
            return None
        
        team_name_str = str(team_name).strip()
        
        # Check TEAM_NAME_MAP first
        if team_name_str in TEAM_NAME_MAP:
            return TEAM_NAME_MAP[team_name_str]
        
        # Check case-insensitive match in TEAM_NAME_MAP
        team_name_lower = team_name_str.lower()
        for key, value in TEAM_NAME_MAP.items():
            if key.lower() == team_name_lower:
                return value
        
        # Check PREMIER_LEAGUE_STATS_MAPPING
        if team_name_str in self.PREMIER_LEAGUE_STATS_MAPPING:
            return self.PREMIER_LEAGUE_STATS_MAPPING[team_name_str]
        
        # Try normalize_team_name as fallback
        normalized = self.normalize_team_name(team_name_str)
        if normalized:
            return normalized
        
        # Return original if no mapping found
        return team_name_str
    
    def validate_2023_24_season(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, List[str]]:
        """
        Comprehensive validation suite for 2023/24 Premier League season data
        
        Args:
            df: DataFrame with match data
            
        Returns:
            Tuple of (validated_df, validation_errors)
        """
        validation_errors = []
        original_count = len(df)
        
        # 1. Validate season date range (2023-08-01 to 2024-05-31)
        season_start = pd.Timestamp('2023-08-01')
        season_end = pd.Timestamp('2024-05-31')
        date_mask = (df['date'] >= season_start) & (df['date'] <= season_end)
        invalid_dates = df[~date_mask]
        if len(invalid_dates) > 0:
            validation_errors.append(
                f"Found {len(invalid_dates)} matches outside 2023/24 season range (2023-08-01 to 2024-05-31)"
            )
            df = df[date_mask]
        
        # 2. Validate goal ranges (0-10 is reasonable for Premier League)
        invalid_goals = df[(df['home_team_score'] < 0) | (df['home_team_score'] > 10) | 
                           (df['away_team_score'] < 0) | (df['away_team_score'] > 10)]
        if len(invalid_goals) > 0:
            validation_errors.append(
                f"Found {len(invalid_goals)} matches with invalid goal counts (outside 0-10 range)"
            )
            df = df[(df['home_team_score'] >= 0) & (df['home_team_score'] <= 10) & 
                   (df['away_team_score'] >= 0) & (df['away_team_score'] <= 10)]
        
        # 3. Validate attendance (if present) - reasonable range for Premier League
        if 'attendance' in df.columns:
            attendance_mask = df['attendance'].isna() | (
                (df['attendance'] >= 0) & (df['attendance'] <= 100000)
            )
            invalid_attendance = df[~attendance_mask]
            if len(invalid_attendance) > 0:
                validation_errors.append(
                    f"Found {len(invalid_attendance)} matches with invalid attendance (outside 0-100000 range)"
                )
                df = df[attendance_mask]
        
        # 4. Check for duplicate matches (same teams, same date)
        duplicates = df.duplicated(subset=['home_team', 'away_team', 'date'], keep=False)
        if duplicates.any():
            dup_count = duplicates.sum() // 2
            validation_errors.append(
                f"Found {dup_count} duplicate match(es) (same teams on same date)"
            )
            df = df.drop_duplicates(subset=['home_team', 'away_team', 'date'], keep='first')
        
        # 5. Validate expected match count
        if len(df) < 350:
            validation_errors.append(
                f"Warning: Only {len(df)} matches found. Expected ~380 for full Premier League season."
            )
        elif len(df) > 400:
            validation_errors.append(
                f"Warning: {len(df)} matches found. Expected ~380. May include duplicates or extra data."
            )
        
        filtered_count = len(df)
        if original_count != filtered_count:
            logger.info(f"Validation filtered {original_count - filtered_count} invalid matches")
        
        return df, validation_errors
    
    def load_matches(self, file_path: str) -> bool:
        """
        Load matches from CSV file (BATCH PROCESSED)
        
        Expected columns: home_team, away_team, date, home_goals, away_goals, 
                         attendance (optional), referee (optional), youtube_id (optional)
        CORRECTED: Uses 'matches' table with home_team_id, away_team_id, home_team_score, away_team_score, matchweek
        """
        try:
            logger.info(f"Loading matches from {file_path}...")
            start_time = time.time()
            
            # Read CSV file with encoding detection
            df = load_csv_with_encoding_detection(file_path)
            
            # Normalize column names
            df.columns = df.columns.str.strip().str.lower()
            
            # Check if file is already in database format (has team_ids)
            if 'home_team_id' in df.columns and 'away_team_id' in df.columns:
                logger.info("Matches file appears to be in database format (has team_ids). Skipping - data already loaded.")
                return True
            
            # Handle different column name variations
            if 'home_team' not in df.columns and 'home' in df.columns:
                df['home_team'] = df['home']
            if 'away_team' not in df.columns and 'away' in df.columns:
                df['away_team'] = df['away']
            
            # Validate required columns
            required_cols = ['home_team', 'away_team', 'date']
            missing_cols = [col for col in required_cols if col not in df.columns]
            if missing_cols:
                raise ValueError(f"Missing required columns: {missing_cols}. Found columns: {list(df.columns)}")
            
            # Clean and normalize data
            df = df.dropna(subset=['home_team', 'away_team', 'date'])
            df['home_team'] = df['home_team'].apply(self.normalize_team_name)
            df['away_team'] = df['away_team'].apply(self.normalize_team_name)
            
            # Remove rows where normalization failed
            df = df.dropna(subset=['home_team', 'away_team'])
            
            # Remove matches where home == away
            df = df[df['home_team'] != df['away_team']]
            
            # Parse dates
            df['date'] = pd.to_datetime(df['date'], errors='coerce', infer_datetime_format=True)
            df = df.dropna(subset=['date'])
            
            # Handle goals columns (support both home_goals/home_team_score)
            if 'home_team_score' in df.columns:
                df['home_goals'] = df['home_team_score']
            elif 'home_goals' not in df.columns:
                raise ValueError("Missing 'home_goals' or 'home_team_score' column")
            
            if 'away_team_score' in df.columns:
                df['away_goals'] = df['away_team_score']
            elif 'away_goals' not in df.columns:
                raise ValueError("Missing 'away_goals' or 'away_team_score' column")
            
            # Normalize goals
            df['home_team_score'] = pd.to_numeric(df['home_goals'], errors='coerce').fillna(0).astype(int)
            df['away_team_score'] = pd.to_numeric(df['away_goals'], errors='coerce').fillna(0).astype(int)
            
            # Calculate matchweek if not provided
            if 'matchweek' not in df.columns or df['matchweek'].isna().all():
                df['matchweek'] = df['date'].apply(self.calculate_matchweek)
            else:
                df['matchweek'] = pd.to_numeric(df['matchweek'], errors='coerce')
            
            # Handle optional columns
            if 'attendance' in df.columns:
                df['attendance'] = df['attendance'].apply(self.clean_attendance)  # CORRECTED: Uses clean_attendance
            else:
                df['attendance'] = None
            
            if 'referee' in df.columns:
                df['referee'] = df['referee'].str.strip()
            else:
                df['referee'] = None
            
            # Handle youtube_id column
            if 'youtube_id' in df.columns:
                df['youtube_id'] = df['youtube_id'].apply(self.extract_youtube_id)
            elif 'youtube_link' in df.columns or 'youtube' in df.columns:
                youtube_col = 'youtube_link' if 'youtube_link' in df.columns else 'youtube'
                df['youtube_id'] = df[youtube_col].apply(self.extract_youtube_id)
            else:
                df['youtube_id'] = None
            
            # Apply comprehensive 2023/24 season validation
            df, validation_errors = self.validate_2023_24_season(df)
            
            # Log validation results
            if validation_errors:
                logger.warning("=" * 60)
                logger.warning("Data Validation Warnings/Errors:")
                logger.warning("=" * 60)
                for error in validation_errors:
                    logger.warning(f"  ⚠ {error}")
                logger.warning("=" * 60)
            else:
                logger.info("✓ All data validation checks passed")
            
            # Map team names to team_ids
            df['home_team_id'] = df['home_team'].map(self.team_id_map)
            df['away_team_id'] = df['away_team'].map(self.team_id_map)
            df = df.dropna(subset=['home_team_id', 'away_team_id'])
            
            # Get existing matches to avoid duplicates
            with self.engine.connect() as conn:
                existing = conn.execute(
                    text("SELECT home_team_id, away_team_id, date FROM matches")
                ).fetchall()
                existing_matches = {(str(row[0]), str(row[1]), row[2]) for row in existing}
            
            # Filter out existing matches
            df['exists'] = df.apply(
                lambda row: (str(row['home_team_id']), str(row['away_team_id']), row['date']) in existing_matches,
                axis=1
            )
            df_new = df[~df['exists']].drop(columns=['exists'])
            
            if len(df_new) == 0:
                logger.info("All matches already exist in database")
                return True
            
            # Batch insert new matches
            inserted = 0
            with self.engine.begin() as conn:
                for i in range(0, len(df_new), BATCH_SIZE):
                    batch = df_new.iloc[i:i+BATCH_SIZE]
                    for _, row in batch.iterrows():
                        try:
                            conn.execute(
                                text("""
                                    INSERT INTO matches (
                                        home_team_id, away_team_id, date, 
                                        home_team_score, away_team_score, matchweek,
                                        attendance, referee, youtube_id
                                    )
                                    VALUES (
                                        :home_team_id, :away_team_id, :date,
                                        :home_team_score, :away_team_score, :matchweek,
                                        :attendance, :referee, :youtube_id
                                    )
                                """),
                                {
                                    "home_team_id": row['home_team_id'],
                                    "away_team_id": row['away_team_id'],
                                    "date": row['date'],
                                    "home_team_score": int(row['home_team_score']),
                                    "away_team_score": int(row['away_team_score']),
                                    "matchweek": int(row['matchweek']) if pd.notna(row['matchweek']) else None,
                                    "attendance": row['attendance'],
                                    "referee": row['referee'] if pd.notna(row['referee']) else None,
                                    "youtube_id": row['youtube_id']
                                }
                            )
                            inserted += 1
                        except IntegrityError as e:
                            logger.warning(f"Match insertion failed: {str(e)}")
                            self.stats['errors'].append(f"Match {row['home_team']} vs {row['away_team']}: {str(e)}")
                
                conn.commit()
            
            self.stats['matches_inserted'] = inserted
            duration = time.time() - start_time
            logger.info(f"✓ Loaded {inserted} new matches (skipped {len(df) - len(df_new)} duplicates) in {duration:.2f}s")
            
            youtube_count = df_new['youtube_id'].notna().sum() if 'youtube_id' in df_new.columns else 0
            if youtube_count > 0:
                logger.info(f"  🎥 YouTube IDs: {youtube_count} matches with video IDs")
            
            return True
            
        except Exception as e:
            logger.error(f"✗ Failed to load matches: {str(e)}")
            self.stats['errors'].append(f"Load matches: {str(e)}")
            return False
    
    def load_match_events(self, file_path: str) -> bool:
        """
        Load match events from PlaysExport.csv
        
        Expected columns: date, home_team, away_team, minute, event_type, player_name, etc.
        Matches events to match_id by date and teams
        """
        try:
            logger.info(f"Loading match events from {file_path}...")
            start_time = time.time()
            
            if not os.path.exists(file_path):
                logger.warning(f"Match events file not found: {file_path}")
                return True  # Not an error if file doesn't exist
            
            df = load_csv_with_encoding_detection(file_path)
            df.columns = df.columns.str.strip().str.lower()
            
            # Normalize team names
            if 'home_team' in df.columns:
                df['home_team'] = df['home_team'].apply(lambda x: self.PREMIER_LEAGUE_STATS_MAPPING.get(str(x), self.normalize_team_name(str(x))))
            if 'away_team' in df.columns:
                df['away_team'] = df['away_team'].apply(lambda x: self.PREMIER_LEAGUE_STATS_MAPPING.get(str(x), self.normalize_team_name(str(x))))
            
            # Parse dates - check for various date column names
            date_col = None
            for col in df.columns:
                if 'date' in col.lower():
                    date_col = col
                    break
            
            if date_col:
                df['date'] = pd.to_datetime(df[date_col], errors='coerce')
                df = df.dropna(subset=['date'])
            else:
                logger.warning(f"No date column found in match events file. Found columns: {list(df.columns)}")
                return True
            
            # Get all matches to map events to match_id
            with self.engine.connect() as conn:
                matches_result = conn.execute(
                    text("""
                        SELECT m.id AS match_id, m.date, h.team_name AS home_team, a.team_name AS away_team
                        FROM matches m
                        INNER JOIN team h ON m.home_team_id = h.team_id
                        INNER JOIN team a ON m.away_team_id = a.team_id
                    """)
                ).fetchall()
                
                match_map = {}
                for match in matches_result:
                    match_date = match[1].date() if hasattr(match[1], 'date') else pd.Timestamp(match[1]).date()
                    key = (match_date, str(match[2]), str(match[3]))
                    match_map[key] = str(match[0])
            
            # Map events to matches
            df['match_id'] = df.apply(
                lambda row: match_map.get((
                    pd.Timestamp(row['date']).date() if pd.notna(row.get('date')) else None,
                    str(row.get('home_team', '')),
                    str(row.get('away_team', ''))
                )),
                axis=1
            )
            df = df.dropna(subset=['match_id'])
            
            if len(df) == 0:
                logger.info("No match events to insert (no matching matches found)")
                return True
            
            # Check if match_events table exists
            with self.engine.connect() as conn:
                inspector = inspect(self.engine)
                if 'match_events' not in inspector.get_table_names():
                    logger.warning("match_events table does not exist. Skipping event insertion.")
                    return True
            
            # Batch insert events
            inserted = 0
            with self.engine.begin() as conn:
                for i in range(0, len(df), BATCH_SIZE):
                    batch = df.iloc[i:i+BATCH_SIZE]
                    for _, row in batch.iterrows():
                        try:
                            conn.execute(
                                text("""
                                    INSERT INTO match_events (match_id, minute, event_type, player_name, team_name)
                                    VALUES (:match_id, :minute, :event_type, :player_name, :team_name)
                                    ON CONFLICT DO NOTHING
                                """),
                                {
                                    "match_id": row['match_id'],
                                    "minute": int(row.get('minute', 0)) if pd.notna(row.get('minute')) else None,
                                    "event_type": str(row.get('event_type', '')).strip() if pd.notna(row.get('event_type')) else None,
                                    "player_name": str(row.get('player_name', '')).strip() if pd.notna(row.get('player_name')) else None,
                                    "team_name": str(row.get('team_name', '')).strip() if pd.notna(row.get('team_name')) else None,
                                }
                            )
                            inserted += 1
                        except Exception as e:
                            logger.warning(f"Failed to insert event: {str(e)}")
            
            duration = time.time() - start_time
            logger.info(f"✓ Loaded {inserted} match events in {duration:.2f}s")
            return True
            
        except Exception as e:
            logger.error(f"✗ Failed to load match events: {str(e)}")
            self.stats['errors'].append(f"Load match events: {str(e)}")
            return False
    
    def load_match_stats(self, file_path: str, truncate_first: bool = False) -> bool:
        """
        Load match stats from TeamStatsExport.csv and LineUpExport.csv with strict exact matching protocol.
        
        Implementation:
        1. Builds Master Match Map: {date}_{home_team_id}_{away_team_id} -> match_id
        2. Normalizes team names using TEAM_NAME_MAP before matching
        3. Strict exact matching - skips rows that don't match exactly ONE key
        4. Identifies if Team column matches home_team_id or away_team_id
        5. Merges data from TeamStatsExport.csv (stats) and LineUpExport.csv (formation)
        6. Uses UPSERT with ON CONFLICT (match_id, team_id) for data integrity
        
        Args:
            file_path: Path to TeamStatsExport.csv
            truncate_first: If True, truncates match_stats table before ingestion
        """
        try:
            logger.info(f"Loading match stats from {file_path}...")
            start_time = time.time()
            
            if not os.path.exists(file_path):
                logger.warning(f"Match stats file not found: {file_path}")
                return True
            
            # Also check for LineUpExport.csv
            lineup_file_path = os.path.join(os.path.dirname(file_path), 'LineUpExport.csv')
            lineup_file_exists = os.path.exists(lineup_file_path)
            if not lineup_file_exists:
                # Try .xlsx extension
                lineup_file_path = os.path.join(os.path.dirname(file_path), 'LineUpExport.xlsx')
                lineup_file_exists = os.path.exists(lineup_file_path)
            
            if lineup_file_exists:
                logger.info(f"Found LineUpExport file: {lineup_file_path}")
            else:
                logger.warning(f"LineUpExport file not found (will skip formation data)")
            
            # Load CSV - preserve original column names first
            df = load_csv_with_encoding_detection(file_path)
            original_columns = df.columns.copy()
            df.columns = df.columns.str.strip()
            
            # DEBUG: Print CSV headers for audit
            logger.info(f"CSV Headers found: {df.columns.tolist()}")
            print(f"CSV Headers found: {df.columns.tolist()}")
            
            total_csv_rows = len(df)
            logger.info(f"Total CSV Rows: {total_csv_rows}")
            
            # Find Date and Fixture columns (case-insensitive)
            date_col = None
            fixture_col = None
            team_col = None
            
            for col in df.columns:
                col_lower = col.lower()
                if 'date' in col_lower and date_col is None:
                    date_col = col
                if 'fixture' in col_lower and fixture_col is None:
                    fixture_col = col
                if col_lower == 'team' and team_col is None:
                    team_col = col
            
            if not date_col:
                logger.error(f"No Date column found in match stats file. Found columns: {list(df.columns)}")
                return False
            if not fixture_col:
                logger.error(f"No Fixture column found in match stats file. Found columns: {list(df.columns)}")
                return False
            if not team_col:
                logger.error(f"No Team column found in match stats file. Found columns: {list(df.columns)}")
                return False
            
            logger.info(f"Using Date column: {date_col}, Fixture column: {fixture_col}, Team column: {team_col}")
            
            # Parse dates
            df['date'] = pd.to_datetime(df[date_col], errors='coerce')
            df = df.dropna(subset=['date'])
            
            if len(df) == 0:
                logger.warning("No valid dates found after parsing")
                return True
            
            # Parse fixture to extract home and away teams
            logger.info("Parsing fixture strings...")
            fixture_data = df[fixture_col].apply(self.parse_fixture)
            df['home_team'] = fixture_data.apply(lambda x: x[0] if x else None)
            df['away_team'] = fixture_data.apply(lambda x: x[1] if x else None)
            
            # Drop rows where we couldn't parse the fixture
            df = df.dropna(subset=['home_team', 'away_team'])
            
            if len(df) == 0:
                logger.warning("No valid fixtures found after parsing")
                return True
            
            # Normalize team names from fixture using TEAM_NAME_MAP
            logger.info("Normalizing team names from fixture using TEAM_NAME_MAP...")
            df['home_team'] = df['home_team'].apply(self.normalize_team_name_with_map)
            df['away_team'] = df['away_team'].apply(self.normalize_team_name_with_map)
            
            # Normalize team name from Team column using TEAM_NAME_MAP
            df['team_normalized'] = df[team_col].apply(self.normalize_team_name_with_map)
            df = df.dropna(subset=['team_normalized'])
            
            # ============================================================
            # STEP 1: Build Master Match Map (Pre-Flight)
            # ============================================================
            logger.info("Building Master Match Map from database...")
            with self.engine.connect() as conn:
                # Get matches with team_ids (not team names) for exact matching
                matches_result = conn.execute(
                    text("""
                        SELECT m.id AS match_id, m.date, m.home_team_id, m.away_team_id,
                               h.team_name AS home_team_name, a.team_name AS away_team_name
                        FROM matches m
                        INNER JOIN team h ON m.home_team_id = h.team_id
                        INNER JOIN team a ON m.away_team_id = a.team_id
                    """)
                ).fetchall()
                
                # Create Master Match Map: {date}_{home_team_id}_{away_team_id} -> match_id
                master_match_map = {}
                match_info_map = {}  # Store full match info for logging
                
                for match in matches_result:
                    match_id = str(match[0])
                    match_date = match[1].date() if hasattr(match[1], 'date') else pd.Timestamp(match[1]).date()
                    home_team_id = str(match[2])
                    away_team_id = str(match[3])
                    home_team_name = str(match[4])
                    away_team_name = str(match[5])
                    
                    # Create unique key: {date}_{home_team_id}_{away_team_id}
                    key = f"{match_date}_{home_team_id}_{away_team_id}"
                    
                    # Check for duplicates in master map (shouldn't happen, but log if it does)
                    if key in master_match_map:
                        logger.error(f"DUPLICATE KEY in Master Match Map: {key} -> match_id {match_id} (existing: {master_match_map[key]})")
                    else:
                        master_match_map[key] = match_id
                        match_info_map[match_id] = {
                            'date': match_date,
                            'home_team_id': home_team_id,
                            'away_team_id': away_team_id,
                            'home_team_name': home_team_name,
                            'away_team_name': away_team_name
                        }
            
            logger.info(f"Master Match Map: {len(master_match_map)} matches loaded")
            
            # Get all teams from database to map team names to team_ids
            logger.info("Loading teams from database...")
            with self.engine.connect() as conn:
                teams_result = conn.execute(
                    text("SELECT team_id, team_name FROM team")
                ).fetchall()
                
                # Create mapping: team_name -> team_id
                team_id_map = {}
                for team in teams_result:
                    team_id_map[str(team[1])] = str(team[0])
            
            logger.info(f"Loaded {len(team_id_map)} teams from database")
            
            # ============================================================
            # STEP 2: Strict Exact Matching Protocol
            # ============================================================
            logger.info("Applying strict exact matching protocol...")
            
            mapping_errors = []
            matches_found = 0
            matches_missing = []
            duplicate_attempts_blocked = 0
            
            def match_csv_row_to_master_map(row):
                """Match CSV row to Master Match Map using strict exact matching"""
                # Get normalized team names from CSV
                csv_home_team = str(row.get('home_team', ''))
                csv_away_team = str(row.get('away_team', ''))
                csv_date = pd.Timestamp(row['date']).date() if pd.notna(row['date']) else None
                
                if not csv_date:
                    return None, "MAPPING_ERROR: Invalid date"
                
                # Map team names to team_ids
                csv_home_team_id = team_id_map.get(csv_home_team)
                csv_away_team_id = team_id_map.get(csv_away_team)
                
                if not csv_home_team_id:
                    return None, f"MAPPING_ERROR: Home team '{csv_home_team}' not found in database"
                if not csv_away_team_id:
                    return None, f"MAPPING_ERROR: Away team '{csv_away_team}' not found in database"
                
                # Create key for exact matching
                key = f"{csv_date}_{csv_home_team_id}_{csv_away_team_id}"
                
                # Strict exact match - must match exactly ONE key
                match_id = master_match_map.get(key)
                
                if not match_id:
                    return None, f"MAPPING_ERROR: No exact match found for key '{key}' (Date: {csv_date}, Home: {csv_home_team}, Away: {csv_away_team})"
                
                return match_id, None
            
            # Apply matching
            match_results = df.apply(match_csv_row_to_master_map, axis=1)
            df['match_id'] = match_results.apply(lambda x: x[0] if isinstance(x, tuple) and x[0] else None)
            df['mapping_error'] = match_results.apply(lambda x: x[1] if isinstance(x, tuple) and x[1] else None)
            
            # Log mapping errors
            mapping_errors_df = df[df['mapping_error'].notna()]
            if len(mapping_errors_df) > 0:
                for _, row in mapping_errors_df.iterrows():
                    error_msg = row['mapping_error']
                    mapping_errors.append(error_msg)
                    logger.error(f"CRITICAL: {error_msg} | Fixture: {row[fixture_col]} | Date: {row[date_col]}")
                    matches_missing.append({
                        'fixture': str(row[fixture_col]),
                        'date': str(row[date_col]),
                        'home_team': str(row.get('home_team', '')),
                        'away_team': str(row.get('away_team', ''))
                    })
            
            # Drop rows with mapping errors
            df = df[df['mapping_error'].isna()]
            matches_found = len(df)
            
            if len(df) == 0:
                logger.warning("No match stats to insert (no exact matches found)")
                return True
            
            # ============================================================
            # STEP 3: Team-Specific Stat Separation
            # ============================================================
            logger.info("Identifying team_id for each row (home vs away)...")
            
            def identify_team_id(row):
                """Identify if Team column matches home_team_id or away_team_id"""
                match_id = row['match_id']
                if not match_id:
                    return None, None
                
                match_info = match_info_map.get(match_id)
                if not match_info:
                    return None, "Team identification error: Match info not found"
                
                csv_team_normalized = str(row.get('team_normalized', ''))
                csv_team_id = team_id_map.get(csv_team_normalized)
                
                if not csv_team_id:
                    return None, f"Team identification error: Team '{csv_team_normalized}' not found in database"
                
                # Check if CSV team matches home or away team
                home_team_id = match_info['home_team_id']
                away_team_id = match_info['away_team_id']
                
                if csv_team_id == home_team_id:
                    return csv_team_id, None
                elif csv_team_id == away_team_id:
                    return csv_team_id, None
                else:
                    return None, f"Team identification error: Team '{csv_team_normalized}' (id: {csv_team_id}) does not match home_team_id ({home_team_id}) or away_team_id ({away_team_id}) for match {match_id}"
            
            # Apply team identification
            team_results = df.apply(identify_team_id, axis=1)
            df['team_id'] = team_results.apply(lambda x: x[0] if x else None)
            df['team_id_error'] = team_results.apply(lambda x: x[1] if x and x[1] else None)
            
            # Log team identification errors
            team_errors_df = df[df['team_id_error'].notna()]
            if len(team_errors_df) > 0:
                for _, row in team_errors_df.iterrows():
                    logger.error(f"CRITICAL: {row['team_id_error']} | Fixture: {row[fixture_col]} | Team: {row.get('team_normalized', '')}")
            
            # Drop rows with team identification errors
            df = df[df['team_id_error'].isna()]
            
            # Check for duplicate (match_id, team_id) pairs in CSV
            duplicate_check = df.groupby(['match_id', 'team_id']).size()
            duplicates = duplicate_check[duplicate_check > 1]
            if len(duplicates) > 0:
                duplicate_attempts_blocked = len(duplicates)
                logger.warning(f"Found {len(duplicates)} duplicate (match_id, team_id) pairs in CSV - will use last occurrence")
                # Keep last occurrence of each duplicate
                df = df.drop_duplicates(subset=['match_id', 'team_id'], keep='last')
            
            if len(df) == 0:
                logger.warning("No match stats to insert (no valid team matches found)")
                return True
            
            logger.info(f"Found {len(df)} rows with valid match_id and team_id")
            
            # Check if match_stats table exists and ensure required columns exist
            with self.engine.connect() as conn:
                inspector = inspect(self.engine)
                if 'match_stats' not in inspector.get_table_names():
                    logger.warning("match_stats table does not exist. Skipping stats insertion.")
                    return True
                
                # ============================================================
                # STEP 4: Database Integrity & Cleanup
                # ============================================================
                if truncate_first:
                    logger.warning("TRUNCATING match_stats table for clean slate...")
                    try:
                        with conn.begin():
                            conn.execute(text("TRUNCATE TABLE match_stats RESTART IDENTITY CASCADE"))
                        logger.info("✓ match_stats table truncated successfully")
                    except Exception as e:
                        logger.error(f"Failed to truncate match_stats table: {str(e)}")
                        return False
                
                # Ensure required columns exist
                logger.info("Ensuring match_stats table has required columns...")
                try:
                    with conn.begin():
                        # Add team_id if it doesn't exist
                        conn.execute(text("""
                            ALTER TABLE match_stats 
                            ADD COLUMN IF NOT EXISTS team_id UUID
                        """))
                        
                        # Add foreign key constraint for team_id if it doesn't exist
                        try:
                            # Check if constraint already exists
                            fk_check = conn.execute(text("""
                                SELECT constraint_name
                                FROM information_schema.table_constraints
                                WHERE table_name = 'match_stats'
                                AND constraint_name = 'fk_match_stats_team'
                            """))
                            if not fk_check.fetchone():
                                conn.execute(text("""
                                    ALTER TABLE match_stats
                                    ADD CONSTRAINT fk_match_stats_team
                                    FOREIGN KEY (team_id) REFERENCES team(team_id)
                                    ON DELETE CASCADE ON UPDATE CASCADE
                                """))
                        except Exception as e:
                            # Constraint might already exist
                            logger.debug(f"Could not add team_id foreign key (may already exist): {str(e)}")
                        
                        # Add other required columns if they don't exist
                        conn.execute(text("""
                            ALTER TABLE match_stats 
                            ADD COLUMN IF NOT EXISTS shots_on_target NUMERIC DEFAULT 0
                        """))
                        conn.execute(text("""
                            ALTER TABLE match_stats 
                            ADD COLUMN IF NOT EXISTS accurate_passes NUMERIC DEFAULT 0
                        """))
                        conn.execute(text("""
                            ALTER TABLE match_stats 
                            ADD COLUMN IF NOT EXISTS fouls_committed NUMERIC DEFAULT 0
                        """))
                        conn.execute(text("""
                            ALTER TABLE match_stats 
                            ADD COLUMN IF NOT EXISTS corners NUMERIC DEFAULT 0
                        """))
                        conn.execute(text("""
                            ALTER TABLE match_stats 
                            ADD COLUMN IF NOT EXISTS possession_pct NUMERIC DEFAULT 0
                        """))
                        conn.execute(text("""
                            ALTER TABLE match_stats 
                            ADD COLUMN IF NOT EXISTS total_shots NUMERIC DEFAULT 0
                        """))
                        conn.execute(text("""
                            ALTER TABLE match_stats 
                            ADD COLUMN IF NOT EXISTS formation VARCHAR(50)
                        """))
                        
                        # Ensure unique constraint on (match_id, team_id) exists
                        # This is critical for data integrity and UPSERT operations
                        logger.info("Ensuring unique constraint on (match_id, team_id)...")
                        try:
                            # Check if unique constraint/index already exists
                            constraint_check = conn.execute(text("""
                                SELECT indexname
                                FROM pg_indexes
                                WHERE tablename = 'match_stats'
                                AND indexname = 'idx_match_stats_match_team'
                            """))
                            if not constraint_check.fetchone():
                                # Create unique index (acts as unique constraint)
                                conn.execute(text("""
                                    CREATE UNIQUE INDEX idx_match_stats_match_team 
                                    ON match_stats(match_id, team_id)
                                """))
                                logger.info("✓ Created unique constraint on (match_id, team_id)")
                            else:
                                logger.info("✓ Unique constraint on (match_id, team_id) already exists")
                        except Exception as e:
                            # Check if it's a duplicate key error (constraint already exists)
                            if 'already exists' in str(e).lower() or 'duplicate' in str(e).lower():
                                logger.info("✓ Unique constraint on (match_id, team_id) already exists")
                            else:
                                logger.warning(f"Could not create unique constraint: {str(e)}")
                        
                        # Check current primary key structure
                        pk_result = conn.execute(text("""
                            SELECT tc.constraint_name, kcu.column_name
                            FROM information_schema.table_constraints tc
                            JOIN information_schema.key_column_usage kcu 
                                ON tc.constraint_name = kcu.constraint_name
                            WHERE tc.table_name = 'match_stats'
                            AND tc.constraint_type = 'PRIMARY KEY'
                        """))
                        pk_constraints = pk_result.fetchall()
                        
                        # Log primary key structure
                        if pk_constraints:
                            pk_columns = [str(c[1]) for c in pk_constraints]
                            logger.info(f"Current primary key columns: {', '.join(pk_columns)}")
                        else:
                            logger.info("No primary key found on match_stats (using unique constraint instead)")
                except Exception as e:
                    logger.warning(f"Could not ensure columns exist (they may already exist): {str(e)}")
            
            # Map CSV columns to database columns (strict mapping)
            # Find original column names (case-insensitive)
            column_mapping = {
                'shots_on_target': None,
                'accurate_passes': None,
                'fouls_committed': None,
                'corners': None,
                'possession_pct': None,
                'total_shots': None
            }
            
            # EXPLICIT HARDCODED MAPPING for wonCorners -> corners (CRITICAL)
            # Check for common variations of the corners column name
            corners_column_candidates = ['wonCorners', 'won_corners', 'Won Corners', 'won corners', 'Corners', 'corners']
            for candidate in corners_column_candidates:
                if candidate in df.columns:
                    column_mapping['corners'] = candidate
                    logger.info(f"✓ Found corners column: '{candidate}' -> 'corners'")
                    break
            
            # If not found by exact match, try case-insensitive search
            if column_mapping['corners'] is None:
                for orig_col in original_columns:
                    orig_col_lower = orig_col.lower().strip()
                    # Map wonCorners -> corners (explicit check)
                    if 'corner' in orig_col_lower and ('won' in orig_col_lower or orig_col_lower == 'corners'):
                        column_mapping['corners'] = orig_col
                        logger.info(f"✓ Found corners column (case-insensitive): '{orig_col}' -> 'corners'")
                        break
            
            # Map other columns
            for orig_col in original_columns:
                orig_col_lower = orig_col.lower().strip()
                # Map shotsOnTarget -> shots_on_target
                if 'shot' in orig_col_lower and 'target' in orig_col_lower:
                    column_mapping['shots_on_target'] = orig_col
                # Map accuratePasses -> accurate_passes
                elif 'accurate' in orig_col_lower and 'pass' in orig_col_lower:
                    column_mapping['accurate_passes'] = orig_col
                # Map foulsCommitted -> fouls_committed
                elif 'foul' in orig_col_lower and 'commit' in orig_col_lower:
                    column_mapping['fouls_committed'] = orig_col
                # Map possessionPct -> possession_pct
                elif 'possession' in orig_col_lower and 'pct' in orig_col_lower:
                    column_mapping['possession_pct'] = orig_col
                # Map totalShots -> total_shots
                elif 'total' in orig_col_lower and 'shot' in orig_col_lower:
                    column_mapping['total_shots'] = orig_col
            
            # CRITICAL: Verify corners column was found
            if column_mapping['corners'] is None:
                logger.error(f"CRITICAL: 'wonCorners' column NOT FOUND in CSV! Available columns: {list(df.columns)}")
                logger.error("Corners data will default to 0 for all rows!")
            else:
                logger.info(f"✓ Corners column mapping confirmed: '{column_mapping['corners']}' -> 'corners'")
            
            # Extract and clean values from TeamStatsExport
            for db_col, csv_col in column_mapping.items():
                if csv_col and csv_col in df.columns:
                    if db_col == 'possession_pct':
                        # Remove % sign and convert to float
                        df[db_col] = df[csv_col].apply(self.clean_numeric_value)
                    elif db_col == 'corners':
                        # Use dedicated clean_corners function with debug logging
                        logger.info(f"Processing corners column: '{csv_col}' -> '{db_col}'")
                        # Process first 5 rows for debug logging
                        corners_sample = df[csv_col].head(5)
                        for idx, val in corners_sample.items():
                            team_name = str(df.loc[idx, team_col]) if team_col in df.columns else "Unknown"
                            cleaned_val = self.clean_corners(val, team_name)
                            logger.debug(f"DEBUG: Corner value for {team_name}: {val} -> {cleaned_val}")
                        # Apply cleaning to all rows
                        df[db_col] = df.apply(
                            lambda row: self.clean_corners(row[csv_col], str(row.get(team_col, 'Unknown'))),
                            axis=1
                        )
                    elif db_col in ['shots_on_target', 'accurate_passes', 'fouls_committed', 'total_shots']:
                        # Convert to integer
                        df[db_col] = df[csv_col].apply(self.clean_int)
                    else:
                        df[db_col] = df[csv_col].apply(self.clean_numeric_value)
                    logger.info(f"Mapped {csv_col} -> {db_col}")
                else:
                    if db_col in ['corners', 'shots_on_target', 'accurate_passes', 'fouls_committed', 'total_shots']:
                        df[db_col] = 0
                    else:
                        df[db_col] = 0.0
                    if csv_col:
                        logger.warning(f"Column {csv_col} not found in CSV, defaulting {db_col} to 0")
            
            # Final verification: Count non-zero corner values
            non_zero_corners = (df['corners'] > 0).sum()
            total_corners_sum = df['corners'].sum()
            logger.info(f"✓ Total non-zero corner values prepared for DB: {non_zero_corners} out of {len(df)} rows")
            logger.info(f"✓ Total corners sum: {total_corners_sum}")
            if non_zero_corners == 0:
                logger.error("CRITICAL: All corner values are 0! Data may be missing or incorrectly mapped.")
            
            # Initialize formation column (will be populated from LineUpExport)
            df['formation'] = None
            
            # ============================================================
            # Load and merge LineUpExport.csv for formation data
            # ============================================================
            if lineup_file_exists:
                logger.info(f"Loading formation data from LineUpExport...")
                try:
                    df_lineup = load_csv_with_encoding_detection(lineup_file_path)
                    df_lineup.columns = df_lineup.columns.str.strip()
                    
                    # Find Date, Fixture, Team, and Formation columns
                    lineup_date_col = None
                    lineup_fixture_col = None
                    lineup_team_col = None
                    formation_col = None
                    
                    for col in df_lineup.columns:
                        col_lower = col.lower()
                        if 'date' in col_lower and lineup_date_col is None:
                            lineup_date_col = col
                        if 'fixture' in col_lower and lineup_fixture_col is None:
                            lineup_fixture_col = col
                        if col_lower == 'team' and lineup_team_col is None:
                            lineup_team_col = col
                        if 'formation' in col_lower and formation_col is None:
                            formation_col = col
                    
                    if lineup_date_col and lineup_fixture_col and lineup_team_col and formation_col:
                        logger.info(f"LineUpExport columns: Date={lineup_date_col}, Fixture={lineup_fixture_col}, Team={lineup_team_col}, Formation={formation_col}")
                        
                        # Parse dates
                        df_lineup['date'] = pd.to_datetime(df_lineup[lineup_date_col], errors='coerce')
                        df_lineup = df_lineup.dropna(subset=['date'])
                        
                        # Parse fixture to extract home and away teams
                        fixture_data_lineup = df_lineup[lineup_fixture_col].apply(self.parse_fixture)
                        df_lineup['home_team'] = fixture_data_lineup.apply(lambda x: x[0] if x else None)
                        df_lineup['away_team'] = fixture_data_lineup.apply(lambda x: x[1] if x else None)
                        df_lineup = df_lineup.dropna(subset=['home_team', 'away_team'])
                        
                        # Normalize team names
                        df_lineup['home_team'] = df_lineup['home_team'].apply(self.normalize_team_name_with_map)
                        df_lineup['away_team'] = df_lineup['away_team'].apply(self.normalize_team_name_with_map)
                        df_lineup['team_normalized'] = df_lineup[lineup_team_col].apply(self.normalize_team_name_with_map)
                        df_lineup = df_lineup.dropna(subset=['team_normalized'])
                        
                        # Match to Master Match Map (same logic as TeamStatsExport)
                        def match_lineup_row_to_master_map(row):
                            """Match LineUpExport row to Master Match Map"""
                            csv_home_team = str(row.get('home_team', ''))
                            csv_away_team = str(row.get('away_team', ''))
                            csv_date = pd.Timestamp(row['date']).date() if pd.notna(row['date']) else None
                            
                            if not csv_date:
                                return None
                            
                            csv_home_team_id = team_id_map.get(csv_home_team)
                            csv_away_team_id = team_id_map.get(csv_away_team)
                            
                            if not csv_home_team_id or not csv_away_team_id:
                                return None
                            
                            key = f"{csv_date}_{csv_home_team_id}_{csv_away_team_id}"
                            return master_match_map.get(key)
                        
                        df_lineup['match_id'] = df_lineup.apply(match_lineup_row_to_master_map, axis=1)
                        
                        # Log warnings for formations that don't match any match_id
                        unmatched_formations = df_lineup[df_lineup['match_id'].isna()]
                        if len(unmatched_formations) > 0:
                            logger.warning(f"Found {len(unmatched_formations)} formation records in LineUpExport that don't match any match_id in database")
                            for _, row in unmatched_formations.head(10).iterrows():  # Show first 10
                                logger.warning(f"  Formation '{row.get(formation_col, 'N/A')}' for fixture '{row.get(lineup_fixture_col, 'Unknown')}' on {row.get(lineup_date_col, 'Unknown')} - no matching match_id")
                        
                        # Identify team_id
                        def identify_team_id_lineup(row):
                            """Identify if Team column matches home_team_id or away_team_id"""
                            match_id = row['match_id']
                            if not match_id:
                                return None
                            
                            match_info = match_info_map.get(match_id)
                            if not match_info:
                                return None
                            
                            csv_team_normalized = str(row.get('team_normalized', ''))
                            csv_team_id = team_id_map.get(csv_team_normalized)
                            
                            if not csv_team_id:
                                return None
                            
                            home_team_id = match_info['home_team_id']
                            away_team_id = match_info['away_team_id']
                            
                            if csv_team_id == home_team_id or csv_team_id == away_team_id:
                                return csv_team_id
                            return None
                        
                        df_lineup['team_id'] = df_lineup.apply(identify_team_id_lineup, axis=1)
                        df_lineup = df_lineup.dropna(subset=['match_id', 'team_id'])
                        
                        # Extract formation (clean and validate)
                        df_lineup['formation'] = df_lineup[formation_col].apply(
                            lambda x: str(x).strip() if pd.notna(x) and str(x).strip() and str(x).strip().lower() not in ['nan', 'none', 'null', ''] else None
                        )
                        
                        # Group by match_id, team_id and take first formation (in case of duplicates)
                        # Convert match_id and team_id to strings to ensure consistent key matching
                        df_lineup['match_id_str'] = df_lineup['match_id'].astype(str)
                        df_lineup['team_id_str'] = df_lineup['team_id'].astype(str)
                        formation_map = df_lineup.groupby(['match_id_str', 'team_id_str'])['formation'].first().to_dict()
                        
                        # Merge formation into main dataframe
                        # Convert match_id and team_id to strings for consistent key matching
                        df['formation'] = df.apply(
                            lambda row: formation_map.get((str(row['match_id']), str(row['team_id'])), None),
                            axis=1
                        )
                        
                        logger.info(f"Loaded {len(df_lineup)} formation records, matched {len(formation_map)} to main data")
                    else:
                        logger.warning(f"LineUpExport missing required columns. Found: {list(df_lineup.columns)}")
                except Exception as e:
                    logger.warning(f"Failed to load LineUpExport: {str(e)}")
                    import traceback
                    logger.warning(traceback.format_exc())
            
            # Batch insert/update stats using UPSERT with ON CONFLICT
            # Use batch transactions with error handling per row
            inserted = 0
            updated = 0
            failed = 0
            total_rows = len(df)
            
            logger.info(f"Processing {total_rows} rows in batches of {BATCH_SIZE}...")
            
            for i in range(0, total_rows, BATCH_SIZE):
                batch = df.iloc[i:i+BATCH_SIZE]
                batch_num = (i // BATCH_SIZE) + 1
                total_batches = (total_rows + BATCH_SIZE - 1) // BATCH_SIZE
                logger.info(f"Processing batch {batch_num}/{total_batches} ({len(batch)} rows)...")
                
                # Process batch with individual transactions per row to prevent cascade failures
                for idx, row in batch.iterrows():
                    # Build parameters (outside retry loop)
                    formation_value = row.get('formation')
                    if formation_value and pd.notna(formation_value):
                        formation_value = str(formation_value).strip()
                        if formation_value.lower() in ['nan', 'none', 'null', '']:
                            formation_value = None
                    else:
                        formation_value = None
                    
                    params = {
                        "match_id": row['match_id'],
                        "team_id": row['team_id'],
                        "shots_on_target": row.get('shots_on_target', 0),
                        "accurate_passes": row.get('accurate_passes', 0),
                        "fouls_committed": row.get('fouls_committed', 0),
                        "corners": row.get('corners', 0),
                        "possession_pct": row.get('possession_pct', 0),
                        "total_shots": row.get('total_shots', 0),
                        "formation": formation_value
                    }
                    
                    # Detailed audit logging every 50 matches
                    if (inserted + updated) % 50 == 0:
                        fixture_str = str(row[fixture_col]) if fixture_col in row else 'Unknown'
                        team_name = str(row.get('team_normalized', 'Unknown'))
                        formation_str = formation_value if formation_value else 'N/A'
                        corners_str = row.get('corners', 0)
                        logger.info(f"Match: {fixture_str} | Team: {team_name} | Formation: {formation_str} | Corners: {corners_str}")
                    
                    # Retry logic for network errors (OperationalError)
                    max_retries = 3
                    retry_delay = 2  # Start with 2 seconds
                    row_success = False
                    
                    for attempt in range(max_retries):
                        try:
                            with self.engine.begin() as conn:
                                # Use ON CONFLICT for efficient UPSERT
                                try:
                                    conn.execute(
                                        text("""
                                            INSERT INTO match_stats (
                                                match_id, team_id, shots_on_target, accurate_passes,
                                                fouls_committed, corners, possession_pct, total_shots, formation
                                            )
                                            VALUES (
                                                :match_id, :team_id,
                                                COALESCE(:shots_on_target, 0),
                                                COALESCE(:accurate_passes, 0),
                                                COALESCE(:fouls_committed, 0),
                                                COALESCE(:corners, 0),
                                                COALESCE(:possession_pct, 0),
                                                COALESCE(:total_shots, 0),
                                                :formation
                                            )
                                            ON CONFLICT (match_id, team_id) DO UPDATE SET
                                                shots_on_target = COALESCE(EXCLUDED.shots_on_target, match_stats.shots_on_target),
                                                accurate_passes = COALESCE(EXCLUDED.accurate_passes, match_stats.accurate_passes),
                                                fouls_committed = COALESCE(EXCLUDED.fouls_committed, match_stats.fouls_committed),
                                                corners = COALESCE(EXCLUDED.corners, 0),
                                                possession_pct = COALESCE(EXCLUDED.possession_pct, match_stats.possession_pct),
                                                total_shots = COALESCE(EXCLUDED.total_shots, match_stats.total_shots),
                                                formation = COALESCE(EXCLUDED.formation, match_stats.formation),
                                                updated_at = NOW()
                                        """),
                                        params
                                    )
                                    updated += 1
                                    row_success = True
                                    break  # Success, exit retry loop
                                except Exception as e:
                                    # If ON CONFLICT fails (e.g., no unique constraint), try separate INSERT/UPDATE
                                    try:
                                        # Try INSERT first
                                        try:
                                            conn.execute(
                                                text("""
                                                    INSERT INTO match_stats (
                                                        match_id, team_id, shots_on_target, accurate_passes,
                                                        fouls_committed, corners, possession_pct, total_shots, formation
                                                    )
                                                    VALUES (
                                                        :match_id, :team_id,
                                                        COALESCE(:shots_on_target, 0),
                                                        COALESCE(:accurate_passes, 0),
                                                        COALESCE(:fouls_committed, 0),
                                                        COALESCE(:corners, 0),
                                                        COALESCE(:possession_pct, 0),
                                                        COALESCE(:total_shots, 0),
                                                        :formation
                                                    )
                                                """),
                                                params
                                            )
                                            inserted += 1
                                            row_success = True
                                            break  # Success, exit retry loop
                                        except IntegrityError:
                                            # Record exists, update it
                                            conn.execute(
                                                text("""
                                                UPDATE match_stats
                                                SET shots_on_target = COALESCE(:shots_on_target, match_stats.shots_on_target),
                                                    accurate_passes = COALESCE(:accurate_passes, match_stats.accurate_passes),
                                                    fouls_committed = COALESCE(:fouls_committed, match_stats.fouls_committed),
                                                    corners = COALESCE(:corners, 0),
                                                    possession_pct = COALESCE(:possession_pct, match_stats.possession_pct),
                                                    total_shots = COALESCE(:total_shots, match_stats.total_shots),
                                                    formation = COALESCE(:formation, match_stats.formation),
                                                    updated_at = NOW()
                                                WHERE match_id = :match_id AND team_id = :team_id
                                                """),
                                                params
                                            )
                                            updated += 1
                                            row_success = True
                                            break  # Success, exit retry loop
                                    except Exception as e2:
                                        # Check if it's a network error that should be retried
                                        error_str = str(e2).lower()
                                        is_network_error = (
                                            isinstance(e2, (SQLAlchemyOperationalError, Psycopg2OperationalError)) or
                                            isinstance(e2.__cause__, Psycopg2OperationalError) if hasattr(e2, '__cause__') else False or
                                            'operationalerror' in error_str or
                                            'could not translate host' in error_str or
                                            'connection' in error_str or
                                            'network' in error_str or
                                            'name or service not known' in error_str
                                        )
                                        
                                        if is_network_error and attempt < max_retries - 1:
                                            # Network error - retry with exponential backoff
                                            fixture_str = str(row[fixture_col]) if fixture_col in row else 'Unknown'
                                            logger.warning(f"Network error (attempt {attempt + 1}/{max_retries}) for fixture={fixture_str}: {str(e2)}. Retrying in {retry_delay}s...")
                                            time.sleep(retry_delay)
                                            retry_delay *= 2  # Exponential backoff
                                            continue  # Retry
                                        else:
                                            # Not a network error or max retries reached - log and fail
                                            if failed < 5:
                                                fixture_str = str(row[fixture_col]) if fixture_col in row else 'Unknown'
                                                team_name = str(row.get('team_normalized', 'Unknown'))
                                                logger.error(f"Failed to insert/update match stats for fixture={fixture_str}, team={team_name}, match_id={row.get('match_id')}, team_id={row.get('team_id')}: {str(e2)}")
                                                import traceback
                                                logger.error(traceback.format_exc())
                                            failed += 1
                                            row_success = False
                                            break  # Don't retry non-network errors
                        except Exception as e:
                            # Check if it's a network error that should be retried
                            error_str = str(e).lower()
                            is_network_error = (
                                isinstance(e, (SQLAlchemyOperationalError, Psycopg2OperationalError)) or
                                isinstance(e.__cause__, Psycopg2OperationalError) if hasattr(e, '__cause__') else False or
                                'operationalerror' in error_str or
                                'could not translate host' in error_str or
                                'connection' in error_str or
                                'network' in error_str or
                                'name or service not known' in error_str
                            )
                            
                            if is_network_error and attempt < max_retries - 1:
                                # Network error - retry with exponential backoff
                                fixture_str = str(row[fixture_col]) if fixture_col in row else 'Unknown'
                                logger.warning(f"Network error (attempt {attempt + 1}/{max_retries}) for fixture={fixture_str}: {str(e)}. Retrying in {retry_delay}s...")
                                time.sleep(retry_delay)
                                retry_delay *= 2  # Exponential backoff
                                continue  # Retry
                            else:
                                # Not a network error or max retries reached - log and fail
                                if failed <= 5:
                                    fixture_str = str(row[fixture_col]) if fixture_col in row else 'Unknown'
                                    logger.error(f"Transaction failed for fixture={fixture_str}, match_id={row.get('match_id')}, team_id={row.get('team_id')}: {str(e)}")
                                if not is_network_error:
                                    # Non-network error - don't retry
                                    failed += 1
                                    row_success = False
                                    break
                    
                    if not row_success:
                        failed += 1
                
                # Log progress after each batch
                processed = min(i + BATCH_SIZE, total_rows)
                logger.info(f"Progress: {processed}/{total_rows} rows processed ({inserted} inserted, {updated} updated, {failed} failed)")
            
            duration = time.time() - start_time
            
            # ============================================================
            # STEP 5: Detailed Logging for Audit
            # ============================================================
            logger.info("=" * 60)
            logger.info("Match Stats Ingestion Summary")
            logger.info("=" * 60)
            logger.info(f"Total CSV Rows: {total_csv_rows}")
            logger.info(f"Matches Found: {matches_found}")
            logger.info(f"Matches Missing in DB: {len(matches_missing)}")
            if len(matches_missing) > 0:
                logger.info("Missing Matches List:")
                for missing in matches_missing[:10]:  # Show first 10
                    logger.info(f"  - {missing['fixture']} on {missing['date']} (Home: {missing['home_team']}, Away: {missing['away_team']})")
                if len(matches_missing) > 10:
                    logger.info(f"  ... and {len(matches_missing) - 10} more")
            logger.info(f"Mapping Errors: {len(mapping_errors)}")
            logger.info(f"Duplicate Attempts Blocked: {duplicate_attempts_blocked}")
            logger.info(f"Rows Inserted: {inserted}")
            logger.info(f"Rows Updated: {updated}")
            logger.info(f"Rows Failed: {failed}")
            logger.info(f"Duration: {duration:.2f}s")
            logger.info("=" * 60)
            
            if len(mapping_errors) > 0:
                logger.warning(f"⚠ {len(mapping_errors)} rows were skipped due to mapping errors")
            if failed > 0:
                logger.warning(f"⚠ {failed} rows failed to insert/update")
            
            return True
            
        except Exception as e:
            logger.error(f"✗ Failed to load match stats: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            self.stats['errors'].append(f"Load match stats: {str(e)}")
            return False
    
    def load_player_stats(self, player_stats_file: str, premier_player_file: str) -> bool:
        """
        Load player stats from PlayerStatsExport.csv and premier-player-23-24.csv
        
        Updates players table with: goals, assists, sofascore_rating, xg, xag, appearances
        Uses explicit column mapping and unidecode for name normalization.
        """
        try:
            logger.info(f"Loading player stats from {player_stats_file} and {premier_player_file}...")
            start_time = time.time()
            
            # Load both files with proper column handling
            df1 = None
            df2 = None
            
            if os.path.exists(player_stats_file):
                df1 = load_csv_with_encoding_detection(player_stats_file)
                # Preserve original column names before normalization for explicit mapping
                df1_original_cols = df1.columns.copy()
                
                # Explicit column mapping: Appearances -> appearances
                # Find the Appearances column (case-insensitive) before lowercasing
                appearances_orig_col = None
                for orig_col in df1_original_cols:
                    if orig_col.strip().lower() == 'appearances':
                        appearances_orig_col = orig_col
                        break
                
                # Now lowercase columns (Appearances becomes appearances automatically)
                df1.columns = df1.columns.str.strip().str.lower()
                
                # Ensure appearances column exists (should already exist after lowercasing if Appearances was present)
                # But explicitly verify and create if needed
                if appearances_orig_col and 'appearances' not in df1.columns:
                    # This shouldn't happen if lowercasing worked, but handle it anyway
                    df1['appearances'] = df1[appearances_orig_col.strip().lower()]
                
                # Handle player name column variations
                player_name_col = None
                for col in df1.columns:
                    if col in ['player', 'player_name', 'name']:
                        player_name_col = col
                        break
                if player_name_col and player_name_col != 'player_name':
                    df1['player_name'] = df1[player_name_col]
                
                # Handle team column variations
                team_col = None
                for col in df1.columns:
                    if col in ['team', 'club', 'club_name']:
                        team_col = col
                        break
                if team_col and team_col != 'team':
                    df1['team'] = df1[team_col]
            
            if os.path.exists(premier_player_file):
                df2 = load_csv_with_encoding_detection(premier_player_file)
                # Preserve original column names before normalization for explicit mapping
                df2_original_cols = df2.columns.copy()
                
                # Explicit column mapping: xAG -> xag
                # Find the xAG column (case-insensitive) before lowercasing
                xag_orig_col = None
                for orig_col in df2_original_cols:
                    if orig_col.strip().lower() == 'xag':
                        xag_orig_col = orig_col
                        break
                
                # Now lowercase columns (xAG becomes xag automatically)
                df2.columns = df2.columns.str.strip().str.lower()
                
                # Ensure xag column exists (should already exist after lowercasing if xAG was present)
                # But explicitly verify and create if needed
                if xag_orig_col and 'xag' not in df2.columns:
                    # This shouldn't happen if lowercasing worked, but handle it anyway
                    df2['xag'] = df2[xag_orig_col.strip().lower()]
                
                # Handle player name column (premier-player uses 'Player')
                if 'player' in df2.columns and 'player_name' not in df2.columns:
                    df2['player_name'] = df2['player']
                
                # Handle team column (premier-player uses 'Team')
                if 'team' not in df2.columns:
                    # Should already exist after lowercasing, but handle edge cases
                    for orig_col in df2_original_cols:
                        if orig_col.strip().lower() == 'team':
                            df2['team'] = df2[orig_col.strip().lower()]
                            break
            
            if df1 is None and df2 is None:
                logger.warning("No player stats files found")
                return True
            
            # Merge dataframes if both exist
            if df1 is not None and df2 is not None:
                # Validate required columns exist
                if 'player_name' not in df1.columns:
                    raise ValueError(f"player_name column not found in PlayerStatsExport.csv. Found columns: {list(df1.columns)}")
                if 'player_name' not in df2.columns:
                    raise ValueError(f"player_name column not found in premier-player-23-24.csv. Found columns: {list(df2.columns)}")
                if 'team' not in df1.columns:
                    raise ValueError(f"team column not found in PlayerStatsExport.csv. Found columns: {list(df1.columns)}")
                if 'team' not in df2.columns:
                    raise ValueError(f"team column not found in premier-player-23-24.csv. Found columns: {list(df2.columns)}")
                
                # Normalize player names and teams for merging
                df1['player_name_normalized'] = df1['player_name'].apply(self.normalize_player_name)
                df2['player_name_normalized'] = df2['player_name'].apply(self.normalize_player_name)
                
                # Normalize team names before merge
                df1['team_normalized'] = df1['team'].apply(
                    lambda x: self.PREMIER_LEAGUE_STATS_MAPPING.get(str(x).strip(), self.normalize_team_name(str(x))) if pd.notna(x) else None
                )
                df2['team_normalized'] = df2['team'].apply(
                    lambda x: self.PREMIER_LEAGUE_STATS_MAPPING.get(str(x).strip(), self.normalize_team_name(str(x))) if pd.notna(x) else None
                )
                
                # Merge on normalized player name and team
                df = pd.merge(
                    df1, df2, 
                    left_on=['player_name_normalized', 'team_normalized'],
                    right_on=['player_name_normalized', 'team_normalized'],
                    how='outer', 
                    suffixes=('', '_premier')
                )
                
                # Use the best player_name and team columns
                df['player_name'] = df['player_name'].fillna(df.get('player_name_premier', ''))
                df['team'] = df['team_normalized']
            elif df1 is not None:
                df = df1.copy()
                if 'player_name' not in df.columns:
                    raise ValueError(f"player_name column not found in PlayerStatsExport.csv. Found columns: {list(df.columns)}")
                if 'team' not in df.columns:
                    raise ValueError(f"team column not found in PlayerStatsExport.csv. Found columns: {list(df.columns)}")
                df['player_name_normalized'] = df['player_name'].apply(self.normalize_player_name)
                df['team'] = df['team'].apply(
                    lambda x: self.PREMIER_LEAGUE_STATS_MAPPING.get(str(x).strip(), self.normalize_team_name(str(x))) if pd.notna(x) else None
                )
            else:
                df = df2.copy()
                if 'player_name' not in df.columns:
                    raise ValueError(f"player_name column not found in premier-player-23-24.csv. Found columns: {list(df.columns)}")
                if 'team' not in df.columns:
                    raise ValueError(f"team column not found in premier-player-23-24.csv. Found columns: {list(df.columns)}")
                df['player_name_normalized'] = df['player_name'].apply(self.normalize_player_name)
                df['team'] = df['team'].apply(
                    lambda x: self.PREMIER_LEAGUE_STATS_MAPPING.get(str(x).strip(), self.normalize_team_name(str(x))) if pd.notna(x) else None
                )
            
            # Drop rows with missing team or player_name
            df = df.dropna(subset=['team', 'player_name'])
            
            # Map team names to team_ids
            df['team_id'] = df['team'].map(self.team_id_map)
            df = df.dropna(subset=['team_id'])
            
            # Get existing players with normalized names for matching
            with self.engine.connect() as conn:
                players_result = conn.execute(
                    text("SELECT id, player_name, team_id FROM players")
                ).fetchall()
                
                # Create player map using normalized names
                player_map = {}
                player_info_map = {}  # Store original names for logging
                for player in players_result:
                    player_id = str(player[0])
                    player_name = str(player[1])
                    team_id = str(player[2])
                    normalized_name = self.normalize_player_name(player_name)
                    key = (normalized_name, team_id)
                    player_map[key] = player_id
                    player_info_map[player_id] = {'name': player_name, 'team_id': team_id}
            
            # Map stats to players using normalized names
            df['player_id'] = df.apply(
                lambda row: player_map.get((
                    self.normalize_player_name(str(row.get('player_name', ''))),
                    str(row['team_id'])
                )),
                axis=1
            )
            
            # Track players found in CSV but not in DB
            players_in_csv = set(df['player_name_normalized'].unique())
            players_in_db = set([self.normalize_player_name(str(p[1])) for p in players_result])
            missing_players = players_in_csv - players_in_db
            
            # Handle missing players: try fuzzy matching first, then auto-insert or report
            if missing_players:
                missing_players_data = []
                for missing_name in missing_players:
                    # Get team name for context
                    sample_row = df[df['player_name_normalized'] == missing_name].iloc[0]
                    team_name = sample_row.get('team', 'Unknown')
                    player_name = sample_row.get('player_name', missing_name)
                    team_id = sample_row.get('team_id')
                    
                    missing_players_data.append({
                        'name': player_name,
                        'normalized_name': missing_name,
                        'team': team_name,
                        'team_id': team_id
                    })
                
                # Try fuzzy matching for similar names
                self._try_fuzzy_match_missing_players(missing_players_data, player_map, df)
                
                # Re-check which players are still missing after fuzzy matching
                df['player_id'] = df.apply(
                    lambda row: player_map.get((
                        self.normalize_player_name(str(row.get('player_name', ''))),
                        str(row['team_id'])
                    )) if pd.notna(row.get('team_id')) else None,
                    axis=1
                )
                
                # Get still-missing players
                still_missing = df[df['player_id'].isna() & df['player_name_normalized'].isin(missing_players)]
                
                if len(still_missing) > 0:
                    # Auto-insert missing players (with minimal required data)
                    inserted_count = self._auto_insert_missing_players(still_missing, player_map, player_info_map)
                    
                    if inserted_count > 0:
                        logger.info(f"✓ Auto-inserted {inserted_count} missing players into database")
                        
                        # Re-map player_ids after insertion
                        df['player_id'] = df.apply(
                            lambda row: player_map.get((
                                self.normalize_player_name(str(row.get('player_name', ''))),
                                str(row['team_id'])
                            )) if pd.notna(row.get('team_id')) else None,
                            axis=1
                        )
                    
                    # Log remaining missing players (if any couldn't be inserted)
                    remaining_missing = df[df['player_id'].isna() & df['player_name_normalized'].isin([mp['normalized_name'] for mp in missing_players_data])]
                    if len(remaining_missing) > 0:
                        logger.warning(f"⚠ {len(remaining_missing)} players in CSV but not in database (and couldn't be auto-inserted):")
                        for _, row in remaining_missing.iterrows():
                            logger.warning(f"  - {row.get('player_name', 'Unknown')} ({row.get('team', 'Unknown')})")
            
            df = df.dropna(subset=['player_id'])
            
            if len(df) == 0:
                logger.info("No player stats to update (no matching players found)")
                return True
            
            # Clean numeric columns with explicit mapping
            # Map xAG from premier-player CSV to xag in database
            if 'xag' not in df.columns and 'xag_premier' in df.columns:
                df['xag'] = df['xag_premier']
            elif 'xag_premier' in df.columns:
                # Use premier file value if main doesn't have it
                df['xag'] = df['xag'].fillna(df['xag_premier'])
            
            # Map appearances from PlayerStatsExport CSV
            if 'appearances' not in df.columns and 'appearances_premier' in df.columns:
                df['appearances'] = df['appearances_premier']
            
            # Clean numeric columns
            stat_cols = ['goals', 'assists', 'sofascore_rating', 'xg', 'xa', 'rating', 'xag', 'appearances']
            for col in stat_cols:
                if col in df.columns:
                    df[col] = df[col].apply(self.clean_numeric_string)
            
            # Update players table with COALESCE to prevent overwriting with 0.00
            # Use individual transactions per update to avoid transaction abort issues
            updated = 0
            for i in range(0, len(df), BATCH_SIZE):
                batch = df.iloc[i:i+BATCH_SIZE]
                for _, row in batch.iterrows():
                    # Use individual transaction for each update to prevent cascade failures
                    try:
                        with self.engine.begin() as conn:
                            update_parts = []
                            params = {"player_id": row['player_id']}
                            
                            # Build update with COALESCE for each stat column
                            log_values = {}
                            for col in stat_cols:
                                if col in df.columns and pd.notna(row.get(col)):
                                    value = row[col]
                                    # Only update if value is valid (not None, not NaN)
                                    if value is not None and not pd.isna(value):
                                        # Map column names to database columns
                                        db_col = col
                                        if col == 'rating' and 'sofascore_rating' not in df.columns:
                                            db_col = 'sofascore_rating'
                                        
                                        # Use COALESCE with NULLIF to prevent overwriting with 0.00
                                        # NULLIF returns NULL if value is 0, then COALESCE uses existing value
                                        # This ensures we only update if new value is non-zero
                                        if col in ['xag', 'appearances']:
                                            # For xag and appearances, only update if value > 0
                                            # Use CASE to preserve existing value if new value is 0
                                            update_parts.append(f"{db_col} = CASE WHEN :{col} > 0 THEN :{col} ELSE {db_col} END")
                                        else:
                                            # For other stats, update if value is provided
                                            update_parts.append(f"{db_col} = COALESCE(:{col}, {db_col})")
                                        
                                        params[col] = value
                                        log_values[col] = value
                            
                            if update_parts:
                                # Get player info for logging
                                player_info = player_info_map.get(row['player_id'], {})
                                player_name = player_info.get('name', row.get('player_name', 'Unknown'))
                                team_name = row.get('team', 'Unknown')
                                
                                # Build UPDATE statement without updated_at (column doesn't exist in schema)
                                conn.execute(
                                    text(f"""
                                        UPDATE players
                                        SET {', '.join(update_parts)}
                                        WHERE id = :player_id
                                    """),
                                    params
                                )
                                
                                # Log the update with xag and appearances highlighted
                                xag_val = log_values.get('xag', 'N/A')
                                appearances_val = log_values.get('appearances', 'N/A')
                                logger.info(f"Updated {player_name} ({team_name}): xag={xag_val}, appearances={appearances_val}")
                                
                                updated += 1
                    except Exception as e:
                        # Log error but continue with next player
                        player_info = player_info_map.get(row.get('player_id', ''), {})
                        player_name = player_info.get('name', row.get('player_name', 'Unknown'))
                        logger.warning(f"Failed to update player stats for {player_name}: {str(e)}")
                        # Continue to next player - transaction is automatically rolled back
            
            duration = time.time() - start_time
            logger.info(f"✓ Updated {updated} player stats in {duration:.2f}s")
            return True
            
        except Exception as e:
            logger.error(f"✗ Failed to load player stats: {str(e)}")
            self.stats['errors'].append(f"Load player stats: {str(e)}")
            return False
    
    def verify_insertion(self) -> Dict[str, int]:
        """Verify data insertion by counting rows in each table"""
        try:
            logger.info("Verifying data insertion...")
            
            with self.engine.connect() as conn:
                counts = {}
                tables = ['stadiums', 'team', 'players', 'matches']  # CORRECTED: 'team' not 'clubs'
                
                for table in tables:
                    result = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
                    count = result.fetchone()[0]
                    counts[table] = count
                    logger.info(f"  {table}: {count} rows")
                
                return counts
                
        except Exception as e:
            logger.error(f"✗ Verification failed: {str(e)}")
            return {}
    
    def run(self):
        """Run the complete ETL process"""
        logger.info("=" * 60)
        logger.info("Premier League ETL Process Started (CORRECTED VERSION)")
        logger.info("=" * 60)
        
        # Connect to database
        if not self.connect():
            logger.error("Cannot proceed without database connection")
            return False
        
        # Load data in order (respecting foreign key dependencies)
        success = True
        
        # 1. Load stadiums
        # Try both stadium.xlsx and stadiums.csv
        stadium_file = None
        for filename in ['stadiums.csv', 'stadium.xlsx', 'stadium.csv']:
            candidate = os.path.join(self.data_dir, filename)
            if os.path.exists(candidate):
                stadium_file = candidate
                break
        
        if stadium_file:
            success &= self.load_stadiums(stadium_file)
        else:
            logger.warning(f"Stadium file not found in {self.data_dir} (tried: stadiums.csv, stadium.xlsx, stadium.csv)")
        
        # 2. Load teams (CORRECTED: was 'clubs')
        teams_file = os.path.join(self.data_dir, 'team.csv')
        if os.path.exists(teams_file):
            success &= self.load_teams(teams_file)
        else:
            logger.warning(f"Teams file not found: {teams_file}")
        
        # 3. Load players
        players_file = os.path.join(self.data_dir, 'players.csv')
        if os.path.exists(players_file):
            success &= self.load_players(players_file)
        else:
            logger.warning(f"Players file not found: {players_file}")
        
        # 4. Load matches
        matches_file = os.path.join(self.data_dir, 'matches.csv')
        if os.path.exists(matches_file):
            success &= self.load_matches(matches_file)
        else:
            logger.warning(f"Matches file not found: {matches_file}")
        
        # 5. Load match events (if file exists)
        events_file = os.path.join(self.data_dir, 'PlaysExport.csv')
        if os.path.exists(events_file):
            success &= self.load_match_events(events_file)
        else:
            logger.info(f"Match events file not found: {events_file} (optional)")
        
        # 6. Load match stats (if file exists)
        stats_file = os.path.join(self.data_dir, 'TeamStatsExport.csv')
        if os.path.exists(stats_file):
            success &= self.load_match_stats(stats_file)
        else:
            logger.info(f"Match stats file not found: {stats_file} (optional)")
        
        # 7. Load player stats (if files exist)
        player_stats_file = os.path.join(self.data_dir, 'PlayerStatsExport.csv')
        premier_player_file = os.path.join(self.data_dir, 'premier-player-23-24.csv')
        if os.path.exists(player_stats_file) or os.path.exists(premier_player_file):
            success &= self.load_player_stats(player_stats_file, premier_player_file)
        else:
            logger.info(f"Player stats files not found (optional)")
        
        # Verify insertion
        counts = self.verify_insertion()
        
        # Print summary
        logger.info("=" * 60)
        logger.info("ETL Process Summary")
        logger.info("=" * 60)
        logger.info(f"Stadiums inserted: {self.stats['stadiums_inserted']}")
        logger.info(f"Teams inserted: {self.stats['teams_inserted']}")  # CORRECTED
        logger.info(f"Players inserted: {self.stats['players_inserted']}")
        logger.info(f"Matches inserted: {self.stats['matches_inserted']}")
        logger.info(f"Total errors: {len(self.stats['errors'])}")
        
        if counts:
            logger.info("\nFinal row counts:")
            for table, count in counts.items():
                logger.info(f"  {table}: {count}")
        
        # Check success criteria
        logger.info("\n" + "=" * 60)
        logger.info("Success Criteria Check")
        logger.info("=" * 60)
        
        criteria_met = True
        if counts.get('team', 0) < 20:  # CORRECTED: 'team' not 'clubs'
            logger.warning(f"✗ Expected 20 teams, found {counts.get('team', 0)}")
            criteria_met = False
        else:
            logger.info(f"✓ Teams: {counts.get('team', 0)} (target: 20)")
        
        if counts.get('matches', 0) < 350:
            logger.warning(f"✗ Expected ~380 matches, found {counts.get('matches', 0)}")
            criteria_met = False
        else:
            logger.info(f"✓ Matches: {counts.get('matches', 0)} (target: ~380)")
        
        if self.stats['players_inserted'] == 0 and counts.get('players', 0) == 0:
            logger.warning("✗ No players loaded")
            criteria_met = False
        else:
            logger.info(f"✓ Players: {counts.get('players', 0)} loaded")
        
        if len(self.stats['errors']) > 0:
            logger.warning(f"⚠ {len(self.stats['errors'])} errors occurred (check etl.log for details)")
        
        if criteria_met:
            logger.info("\n✓ All success criteria met!")
        else:
            logger.warning("\n⚠ Some success criteria not met")
        
        return success and criteria_met
    
    def run_match_stats_only(self, truncate_first: bool = False):
        """
        Run only match stats ingestion (skip other steps)
        
        Args:
            truncate_first: If True, truncates match_stats table before ingestion
        """
        logger.info("=" * 60)
        logger.info("Match Stats Ingestion Only")
        logger.info("=" * 60)
        
        # Connect to database
        if not self.connect():
            logger.error("Cannot proceed without database connection")
            return False
        
        # Only load match stats
        stats_file = os.path.join(self.data_dir, 'TeamStatsExport.csv')
        if os.path.exists(stats_file):
            success = self.load_match_stats(stats_file, truncate_first=truncate_first)
            logger.info("=" * 60)
            logger.info("Match Stats Ingestion Complete")
            logger.info("=" * 60)
            return success
        else:
            logger.error(f"Match stats file not found: {stats_file}")
            return False


def main():
    """Main entry point"""
    import argparse
    
    # Parse command-line arguments
    parser = argparse.ArgumentParser(description='Premier League ETL Script')
    parser.add_argument(
        '--match-stats-only',
        action='store_true',
        help='Run only match stats ingestion (skip other steps)'
    )
    parser.add_argument(
        '--truncate-match-stats',
        action='store_true',
        help='Truncate match_stats table before ingestion (use with --match-stats-only)'
    )
    args = parser.parse_args()
    
    # Get connection string from environment variable
    connection_string = os.getenv('SUPABASE_CONNECTION_STRING')
    
    if not connection_string:
        logger.error("SUPABASE_CONNECTION_STRING environment variable not set")
        logger.info("Please set it in .env file or as environment variable")
        logger.info("Format: postgresql://user:password@host:port/database")
        sys.exit(1)
    
    # Get data directory (default: 'data')
    # Resolve path relative to script location, not current working directory
    data_dir = os.getenv('DATA_DIR', 'data')
    
    # If data_dir is relative, resolve it relative to the script's directory
    if not os.path.isabs(data_dir):
        # Get the directory where this script is located
        script_dir = os.path.dirname(os.path.abspath(__file__))
        # Go up one level to project root (since script is in etl/ subdirectory)
        project_root = os.path.dirname(script_dir)
        # Resolve data directory relative to project root
        data_dir = os.path.join(project_root, data_dir)
        data_dir = os.path.normpath(data_dir)
    
    # Create ETL instance
    etl = PremierLeagueETL(connection_string, data_dir)
    
    # Run based on arguments
    if args.match_stats_only:
        success = etl.run_match_stats_only(truncate_first=args.truncate_match_stats)
    else:
        success = etl.run()
    
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()

