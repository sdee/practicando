#!/usr/bin/env python3
"""
Database validation script for Spanish Conjugation App
Checks if database connection works and tables exist
"""
import sys
import os
from pathlib import Path

# Add current backend directory to Python path
backend_path = Path(__file__).parent.parent  # Go up from scripts to backend
sys.path.insert(0, str(backend_path))

def main():
    try:
        print("🔍 Validating database connection...")
        
        # Import after setting path
        from db import get_engine, DB_MODE
        from models import Base
        
        # Get database engine
        engine = get_engine()
        print(f"📁 Database mode: {DB_MODE}")
        print(f"📁 Database URL: {engine.url}")
        
        # Test connection
        with engine.connect() as conn:
            result = conn.execute("SELECT 1")
            result.fetchone()
        
        print("✅ Database connection successful!")
        
        # Check if tables exist
        from sqlalchemy import inspect
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        expected_tables = list(Base.metadata.tables.keys())
        
        if expected_tables:
            missing_tables = [t for t in expected_tables if t not in existing_tables]
            if missing_tables:
                print(f"⚠️  Missing tables: {', '.join(missing_tables)}")
                print("💡 Run migrations to create missing tables")
                return False
            else:
                print(f"✅ All expected tables exist ({len(existing_tables)} tables)")
        else:
            print("⚠️  No table definitions found in models")
        
        return True
        
    except Exception as e:
        print(f"❌ Database validation failed: {e}")
        print(f"🔍 Error details: {type(e).__name__}: {str(e)}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

