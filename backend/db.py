# db.py
import os
from typing import Generator, Optional
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

# Load environment variables from .env file (development only)
# In production (AWS EB), environment variables are set directly
if os.path.exists('.env'):
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        # python-dotenv not available, skip loading .env file
        pass

# Get database mode from environment
DB_MODE = os.getenv('DATABASE_MODE', 'learn')

def _get_db_configs():
    """Build database configurations from environment variables"""
    return {
        'test': os.getenv('TEST_DATABASE_URL', 'sqlite:///./test_app.db'),
        'learn': os.getenv('LEARN_DATABASE_URL', 'postgresql+psycopg2://postgres:password@localhost:5432/practicando_learn'),
        'dev': os.getenv('DEV_DATABASE_URL', 'postgresql+psycopg2://postgres:password@localhost:5432/practicando_dev'),
        'staging': os.getenv('STAGING_DATABASE_URL'),
        'production': os.getenv('PRODUCTION_DATABASE_URL'),
    }

# ---- build URL from env or EB's RDS_* ----
def _db_url() -> str:
    # Priority: Direct DATABASE_URL > Mode-based config > RDS/EB config
    url = os.getenv("DATABASE_URL")
    if url:
        print(f"🗄️  Using direct DATABASE_URL: {url}")
        return url
    
    # Use mode-based configuration from environment
    db_configs = _get_db_configs()
    url = db_configs.get(DB_MODE)
    
    if url:
        print(f"🗄️  Database mode: {DB_MODE} -> {url}")
        return url
    
    # Then try to build from RDS_* environment variables
    if os.getenv("RDS_HOSTNAME"):
        # Ensure all required RDS variables exist
        required_vars = ["RDS_HOSTNAME", "RDS_PORT", "RDS_DB_NAME", "RDS_USERNAME", "RDS_PASSWORD"]
        missing_vars = [var for var in required_vars if not os.getenv(var)]
        
        if missing_vars:
            raise RuntimeError(f"Missing required RDS environment variables: {', '.join(missing_vars)}")
        
        # Build the connection string from RDS variables
        url = (
            f"postgresql+psycopg2://"
            f"{os.environ['RDS_USERNAME']}:{os.environ['RDS_PASSWORD']}"
            f"@{os.environ['RDS_HOSTNAME']}:{os.environ['RDS_PORT']}"
            f"/{os.environ['RDS_DB_NAME']}"
        )
        print(f"🗄️  Using RDS configuration: {url}")
        return url
    
    # If no valid connection info found, fall back to local SQLite
    fallback_url = 'sqlite:///./app.db'
    print(f"⚠️  No database configuration found for mode '{DB_MODE}', using fallback: {fallback_url}")
    return fallback_url

_engine = None
_Session = None

def get_engine():
    global _engine
    if _engine is None:
        _engine = create_engine(_db_url(), pool_pre_ping=True)
    return _engine

def get_sessionmaker():
    global _Session
    if _Session is None:
        _Session = sessionmaker(bind=get_engine(), autoflush=False, autocommit=False)
    return _Session

# FastAPI dependency (use if you want)
def get_db() -> Generator[Session, None, None]:
    SessionLocal = get_sessionmaker()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()