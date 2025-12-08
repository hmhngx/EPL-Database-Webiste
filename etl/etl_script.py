"""
Premier League 2023/24 Analytics Hub - ETL Script
Ingests CSV/XLSX data into PostgreSQL database via Supabase
"""

import os
import sys
import pandas as pd
import logging
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from rapidfuzz import fuzz, process
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('etl.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


class PremierLeagueETL:
    """ETL class for Premier League data ingestion"""
    
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
        self.club_id_map: Dict[str, str] = {}  # Maps club names to UUIDs
        self.stadium_id_map: Dict[str, str] = {}  # Maps stadium names to UUIDs
        self.stats = {
            'stadiums_inserted': 0,
            'clubs_inserted': 0,
            'players_inserted': 0,
            'matches_inserted': 0,
            'errors': []
        }
        
    def connect(self):
        """Establish database connection"""
        try:
            self.engine = create_engine(self.connection_string)
            with self.engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info("✓ Database connection established")
            return True
        except Exception as e:
            logger.error(f"✗ Database connection failed: {str(e)}")
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
    
    def load_stadiums(self, file_path: str) -> bool:
        """
        Load stadiums from XLSX file
        
        Expected columns: name, city, capacity
        """
        try:
            logger.info(f"Loading stadiums from {file_path}...")
            
            # Read XLSX file
            df = pd.read_excel(file_path)
            
            # Normalize column names (case-insensitive)
            df.columns = df.columns.str.strip().str.lower()
            
            # Validate required columns
            required_cols = ['name', 'city', 'capacity']
            missing_cols = [col for col in required_cols if col not in df.columns]
            if missing_cols:
                raise ValueError(f"Missing required columns: {missing_cols}")
            
            # Clean and validate data
            df = df.dropna(subset=['name', 'city', 'capacity'])
            df['name'] = df['name'].str.strip()
            df['city'] = df['city'].str.strip()
            df['capacity'] = pd.to_numeric(df['capacity'], errors='coerce')
            df = df.dropna(subset=['capacity'])
            df = df[df['capacity'] > 0]
            
            # Remove duplicates
            df = df.drop_duplicates(subset=['name'], keep='first')
            
            # Insert into database
            inserted = 0
            with self.engine.connect() as conn:
                for _, row in df.iterrows():
                    try:
                        # Check if stadium already exists
                        result = conn.execute(
                            text("SELECT stadium_id FROM stadiums WHERE name = :name"),
                            {"name": row['name']}
                        ).fetchone()
                        
                        if result:
                            stadium_id = result[0]
                            logger.debug(f"Stadium '{row['name']}' already exists")
                        else:
                            # Insert new stadium
                            result = conn.execute(
                                text("""
                                    INSERT INTO stadiums (name, city, capacity)
                                    VALUES (:name, :city, :capacity)
                                    RETURNING stadium_id
                                """),
                                {
                                    "name": row['name'],
                                    "city": row['city'],
                                    "capacity": int(row['capacity'])
                                }
                            )
                            stadium_id = result.fetchone()[0]
                            inserted += 1
                            logger.debug(f"Inserted stadium: {row['name']}")
                        
                        self.stadium_id_map[row['name']] = str(stadium_id)
                        conn.commit()
                        
                    except IntegrityError as e:
                        conn.rollback()
                        logger.warning(f"Stadium '{row['name']}' insertion failed: {str(e)}")
                        self.stats['errors'].append(f"Stadium '{row['name']}': {str(e)}")
                    except Exception as e:
                        conn.rollback()
                        logger.error(f"Error inserting stadium '{row['name']}': {str(e)}")
                        self.stats['errors'].append(f"Stadium '{row['name']}': {str(e)}")
            
            self.stats['stadiums_inserted'] = inserted
            logger.info(f"✓ Loaded {inserted} new stadiums (total: {len(self.stadium_id_map)})")
            return True
            
        except Exception as e:
            logger.error(f"✗ Failed to load stadiums: {str(e)}")
            self.stats['errors'].append(f"Load stadiums: {str(e)}")
            return False
    
    def load_clubs(self, file_path: str) -> bool:
        """
        Load clubs from CSV file
        
        Expected columns: name, stadium_name (or stadium), founded, logo_url (optional)
        """
        try:
            logger.info(f"Loading clubs from {file_path}...")
            
            # Read CSV file
            df = pd.read_csv(file_path)
            
            # Normalize column names
            df.columns = df.columns.str.strip().str.lower()
            
            # Handle different column name variations
            if 'stadium_name' in df.columns:
                df['stadium'] = df['stadium_name']
            elif 'stadium' not in df.columns:
                raise ValueError("Missing 'stadium' or 'stadium_name' column")
            
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
            
            # Handle founded year
            if 'founded' in df.columns:
                df['founded'] = pd.to_numeric(df['founded'], errors='coerce')
            else:
                df['founded'] = None
            
            # Handle logo_url
            if 'logo_url' not in df.columns:
                df['logo_url'] = None
            
            # Remove duplicates
            df = df.drop_duplicates(subset=['name'], keep='first')
            
            # Insert into database
            inserted = 0
            with self.engine.connect() as conn:
                for _, row in df.iterrows():
                    try:
                        # Find stadium_id using fuzzy matching
                        stadium_id = None
                        stadium_name = str(row['stadium']).strip()
                        
                        # Try exact match first
                        if stadium_name in self.stadium_id_map:
                            stadium_id = self.stadium_id_map[stadium_name]
                        else:
                            # Fuzzy match stadium name
                            result = conn.execute(
                                text("SELECT stadium_id, name FROM stadiums")
                            ).fetchall()
                            
                            if result:
                                stadiums_dict = {s[1]: s[0] for s in result}
                                match = process.extractOne(
                                    stadium_name,
                                    list(stadiums_dict.keys()),
                                    scorer=fuzz.token_sort_ratio
                                )
                                
                                if match and match[1] >= 80:
                                    stadium_id = str(stadiums_dict[match[0]])
                                    logger.info(f"Fuzzy matched stadium '{stadium_name}' -> '{match[0]}'")
                                else:
                                    raise ValueError(f"Stadium '{stadium_name}' not found for club '{row['name']}'")
                            else:
                                raise ValueError(f"No stadiums found in database")
                        
                        # Check if club already exists
                        result = conn.execute(
                            text("SELECT club_id FROM clubs WHERE name = :name"),
                            {"name": row['name']}
                        ).fetchone()
                        
                        if result:
                            club_id = result[0]
                            logger.debug(f"Club '{row['name']}' already exists")
                        else:
                            # Insert new club
                            result = conn.execute(
                                text("""
                                    INSERT INTO clubs (stadium_id, name, founded, logo_url)
                                    VALUES (:stadium_id, :name, :founded, :logo_url)
                                    RETURNING club_id
                                """),
                                {
                                    "stadium_id": stadium_id,
                                    "name": row['name'],
                                    "founded": int(row['founded']) if pd.notna(row['founded']) else None,
                                    "logo_url": row['logo_url'] if pd.notna(row['logo_url']) else None
                                }
                            )
                            club_id = result.fetchone()[0]
                            inserted += 1
                            logger.debug(f"Inserted club: {row['name']}")
                        
                        self.club_id_map[row['name']] = str(club_id)
                        conn.commit()
                        
                    except IntegrityError as e:
                        conn.rollback()
                        logger.warning(f"Club '{row['name']}' insertion failed: {str(e)}")
                        self.stats['errors'].append(f"Club '{row['name']}': {str(e)}")
                    except Exception as e:
                        conn.rollback()
                        logger.error(f"Error inserting club '{row['name']}': {str(e)}")
                        self.stats['errors'].append(f"Club '{row['name']}': {str(e)}")
            
            self.stats['clubs_inserted'] = inserted
            logger.info(f"✓ Loaded {inserted} new clubs (total: {len(self.club_id_map)})")
            return True
            
        except Exception as e:
            logger.error(f"✗ Failed to load clubs: {str(e)}")
            self.stats['errors'].append(f"Load clubs: {str(e)}")
            return False
    
    def load_players(self, file_path: str) -> bool:
        """
        Load players from CSV file
        
        Expected columns: name, club_name (or club, team), position, nationality, age
        """
        try:
            logger.info(f"Loading players from {file_path}...")
            
            # Read CSV file
            df = pd.read_csv(file_path)
            
            # Normalize column names
            df.columns = df.columns.str.strip().str.lower()
            
            # Handle different column name variations
            if 'club_name' in df.columns:
                df['club'] = df['club_name']
            elif 'team' in df.columns:
                df['club'] = df['team']
            elif 'club' not in df.columns:
                raise ValueError("Missing 'club', 'club_name', or 'team' column")
            
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
            
            # Get club IDs from database
            with self.engine.connect() as conn:
                clubs_result = conn.execute(
                    text("SELECT club_id, name FROM clubs")
                ).fetchall()
                clubs_dict = {name: club_id for club_id, name in clubs_result}
            
            # Filter out players with unknown clubs
            unknown_clubs = set(df['club'].dropna()) - set(clubs_dict.keys())
            if unknown_clubs:
                logger.warning(f"Unknown clubs found: {unknown_clubs}")
                df = df[df['club'].isin(clubs_dict.keys())]
            
            # Insert into database
            inserted = 0
            skipped = 0
            with self.engine.connect() as conn:
                for _, row in df.iterrows():
                    try:
                        club_id = clubs_dict.get(row['club'])
                        if not club_id:
                            skipped += 1
                            continue
                        
                        # Check for duplicates (name + club_id)
                        result = conn.execute(
                            text("""
                                SELECT player_id FROM players 
                                WHERE name = :name AND club_id = :club_id
                            """),
                            {"name": row['name'], "club_id": club_id}
                        ).fetchone()
                        
                        if result:
                            skipped += 1
                            logger.debug(f"Player '{row['name']}' already exists for {row['club']}")
                            continue
                        
                        # Insert new player
                        conn.execute(
                            text("""
                                INSERT INTO players (club_id, name, position, nationality, age)
                                VALUES (:club_id, :name, :position, :nationality, :age)
                            """),
                            {
                                "club_id": club_id,
                                "name": row['name'],
                                "position": row['position'],
                                "nationality": row['nationality'],
                                "age": int(row['age'])
                            }
                        )
                        inserted += 1
                        conn.commit()
                        
                    except IntegrityError as e:
                        conn.rollback()
                        skipped += 1
                        logger.warning(f"Player '{row['name']}' insertion failed: {str(e)}")
                        self.stats['errors'].append(f"Player '{row['name']}': {str(e)}")
                    except Exception as e:
                        conn.rollback()
                        skipped += 1
                        logger.error(f"Error inserting player '{row['name']}': {str(e)}")
                        self.stats['errors'].append(f"Player '{row['name']}': {str(e)}")
            
            self.stats['players_inserted'] = inserted
            logger.info(f"✓ Loaded {inserted} new players (skipped {skipped} duplicates)")
            return True
            
        except Exception as e:
            logger.error(f"✗ Failed to load players: {str(e)}")
            self.stats['errors'].append(f"Load players: {str(e)}")
            return False
    
    def load_matches(self, file_path: str) -> bool:
        """
        Load matches from CSV file
        
        Expected columns: home_team, away_team, date, home_goals, away_goals, attendance (optional), referee (optional)
        """
        try:
            logger.info(f"Loading matches from {file_path}...")
            
            # Read CSV file
            df = pd.read_csv(file_path)
            
            # Normalize column names
            df.columns = df.columns.str.strip().str.lower()
            
            # Handle different column name variations
            if 'home_team' not in df.columns and 'home' in df.columns:
                df['home_team'] = df['home']
            if 'away_team' not in df.columns and 'away' in df.columns:
                df['away_team'] = df['away']
            
            # Validate required columns
            required_cols = ['home_team', 'away_team', 'date', 'home_goals', 'away_goals']
            missing_cols = [col for col in required_cols if col not in df.columns]
            if missing_cols:
                raise ValueError(f"Missing required columns: {missing_cols}")
            
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
            
            # Normalize goals
            df['home_goals'] = pd.to_numeric(df['home_goals'], errors='coerce').fillna(0).astype(int)
            df['away_goals'] = pd.to_numeric(df['away_goals'], errors='coerce').fillna(0).astype(int)
            
            # Handle optional columns
            if 'attendance' in df.columns:
                df['attendance'] = pd.to_numeric(df['attendance'], errors='coerce')
            else:
                df['attendance'] = None
            
            if 'referee' in df.columns:
                df['referee'] = df['referee'].str.strip()
            else:
                df['referee'] = None
            
            # Get club IDs from database
            with self.engine.connect() as conn:
                clubs_result = conn.execute(
                    text("SELECT club_id, name FROM clubs")
                ).fetchall()
                clubs_dict = {name: club_id for club_id, name in clubs_result}
            
            # Filter out matches with unknown clubs
            all_clubs = set(df['home_team'].dropna()) | set(df['away_team'].dropna())
            unknown_clubs = all_clubs - set(clubs_dict.keys())
            if unknown_clubs:
                logger.warning(f"Unknown clubs in matches: {unknown_clubs}")
                df = df[
                    df['home_team'].isin(clubs_dict.keys()) & 
                    df['away_team'].isin(clubs_dict.keys())
                ]
            
            # Remove duplicates (same home, away, and date)
            df = df.drop_duplicates(subset=['home_team', 'away_team', 'date'], keep='first')
            
            # Insert into database
            inserted = 0
            skipped = 0
            with self.engine.connect() as conn:
                for _, row in df.iterrows():
                    try:
                        home_club_id = clubs_dict.get(row['home_team'])
                        away_club_id = clubs_dict.get(row['away_team'])
                        
                        if not home_club_id or not away_club_id:
                            skipped += 1
                            continue
                        
                        # Check for duplicates
                        result = conn.execute(
                            text("""
                                SELECT match_id FROM matches 
                                WHERE home_club_id = :home_id 
                                AND away_club_id = :away_id 
                                AND date = :date
                            """),
                            {
                                "home_id": home_club_id,
                                "away_id": away_club_id,
                                "date": row['date']
                            }
                        ).fetchone()
                        
                        if result:
                            skipped += 1
                            logger.debug(f"Match already exists: {row['home_team']} vs {row['away_team']} on {row['date']}")
                            continue
                        
                        # Insert new match
                        conn.execute(
                            text("""
                                INSERT INTO matches (
                                    home_club_id, away_club_id, date, 
                                    home_goals, away_goals, attendance, referee
                                )
                                VALUES (
                                    :home_club_id, :away_club_id, :date,
                                    :home_goals, :away_goals, :attendance, :referee
                                )
                            """),
                            {
                                "home_club_id": home_club_id,
                                "away_club_id": away_club_id,
                                "date": row['date'],
                                "home_goals": int(row['home_goals']),
                                "away_goals": int(row['away_goals']),
                                "attendance": int(row['attendance']) if pd.notna(row['attendance']) else None,
                                "referee": row['referee'] if pd.notna(row['referee']) else None
                            }
                        )
                        inserted += 1
                        conn.commit()
                        
                    except IntegrityError as e:
                        conn.rollback()
                        skipped += 1
                        logger.warning(f"Match insertion failed: {str(e)}")
                        self.stats['errors'].append(f"Match {row['home_team']} vs {row['away_team']}: {str(e)}")
                    except Exception as e:
                        conn.rollback()
                        skipped += 1
                        logger.error(f"Error inserting match: {str(e)}")
                        self.stats['errors'].append(f"Match {row['home_team']} vs {row['away_team']}: {str(e)}")
            
            self.stats['matches_inserted'] = inserted
            logger.info(f"✓ Loaded {inserted} new matches (skipped {skipped} duplicates)")
            return True
            
        except Exception as e:
            logger.error(f"✗ Failed to load matches: {str(e)}")
            self.stats['errors'].append(f"Load matches: {str(e)}")
            return False
    
    def verify_insertion(self) -> Dict[str, int]:
        """Verify data insertion by counting rows in each table"""
        try:
            logger.info("Verifying data insertion...")
            
            with self.engine.connect() as conn:
                counts = {}
                tables = ['stadiums', 'clubs', 'players', 'matches']
                
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
        logger.info("Premier League ETL Process Started")
        logger.info("=" * 60)
        
        # Connect to database
        if not self.connect():
            logger.error("Cannot proceed without database connection")
            return False
        
        # Load data in order (respecting foreign key dependencies)
        success = True
        
        # 1. Load stadiums
        stadium_file = os.path.join(self.data_dir, 'stadium.xlsx')
        if os.path.exists(stadium_file):
            success &= self.load_stadiums(stadium_file)
        else:
            logger.warning(f"Stadium file not found: {stadium_file}")
        
        # 2. Load clubs
        clubs_file = os.path.join(self.data_dir, 'team.csv')
        if os.path.exists(clubs_file):
            success &= self.load_clubs(clubs_file)
        else:
            logger.warning(f"Clubs file not found: {clubs_file}")
        
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
        
        # Verify insertion
        counts = self.verify_insertion()
        
        # Print summary
        logger.info("=" * 60)
        logger.info("ETL Process Summary")
        logger.info("=" * 60)
        logger.info(f"Stadiums inserted: {self.stats['stadiums_inserted']}")
        logger.info(f"Clubs inserted: {self.stats['clubs_inserted']}")
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
        if counts.get('clubs', 0) < 20:
            logger.warning(f"✗ Expected 20 clubs, found {counts.get('clubs', 0)}")
            criteria_met = False
        else:
            logger.info(f"✓ Clubs: {counts.get('clubs', 0)} (target: 20)")
        
        if counts.get('matches', 0) < 350:  # ~380 matches, allow some flexibility
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


def main():
    """Main entry point"""
    # Get connection string from environment variable
    connection_string = os.getenv('SUPABASE_CONNECTION_STRING')
    
    if not connection_string:
        logger.error("SUPABASE_CONNECTION_STRING environment variable not set")
        logger.info("Please set it in .env file or as environment variable")
        logger.info("Format: postgresql://user:password@host:port/database")
        sys.exit(1)
    
    # Get data directory (default: 'data')
    data_dir = os.getenv('DATA_DIR', 'data')
    
    # Create ETL instance and run
    etl = PremierLeagueETL(connection_string, data_dir)
    success = etl.run()
    
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()

