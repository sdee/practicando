# db.py
import os
from typing import Generator, Optional
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

# ---- build URL from env or EB's RDS_* ----
def _db_url() -> str:
    # First check for explicit DATABASE_URL
    url = os.getenv("DATABASE_URL") or os.getenv("TEST_DATABASE_URL")
    if url:
        return url
    
    # Then try to build from RDS_* environment variables
    if os.getenv("RDS_HOSTNAME"):
        # Ensure all required RDS variables exist
        required_vars = ["RDS_HOSTNAME", "RDS_PORT", "RDS_DB_NAME", "RDS_USERNAME", "RDS_PASSWORD"]
        missing_vars = [var for var in required_vars if not os.getenv(var)]
        
        if missing_vars:
            raise RuntimeError(f"Missing required RDS environment variables: {', '.join(missing_vars)}")
        
        # Build the connection string from RDS variables
        return (
            f"postgresql+psycopg2://"
            f"{os.environ['RDS_USERNAME']}:{os.environ['RDS_PASSWORD']}"
            f"@{os.environ['RDS_HOSTNAME']}:{os.environ['RDS_PORT']}"
            f"/{os.environ['RDS_DB_NAME']}"
        )
    
    # If no valid connection info found
    raise RuntimeError("Set DATABASE_URL/TEST_DATABASE_URL or provide RDS_* vars.")

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