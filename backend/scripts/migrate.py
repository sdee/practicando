#!/usr/bin/env python3
"""
Database migration script for Spanish Conjugation App
"""
import sys
import os
from pathlib import Path

# Add current backend directory to Python path
backend_path = Path(__file__).parent.parent  # Go up from scripts to backend
sys.path.insert(0, str(backend_path))

def main():
    try:
        print("🗄️  Starting database migration...")
        
        # Import after setting path
        from db import get_engine
        
        # Check if we have models defined
        try:
            from models import Base
            print("📋 Found models, creating tables...")
        except ImportError:
            print("⚠️  No models.py found, checking for table definitions...")
            # Alternative: try to import from main app
            try:
                from main import app
                # If using SQLAlchemy with FastAPI, tables might be defined elsewhere
                print("📋 Found main app, checking for database setup...")
            except ImportError:
                print("❌ Could not find table definitions")
                print("📝 Please ensure you have either:")
                print("   - backend/models.py with SQLAlchemy models")
                print("   - Table definitions in your main app")
                return False
        
        # Get database engine
        engine = get_engine()
        print(f"📁 Using database: {engine.url}")
        
        # Create all tables if we have Base
        if 'Base' in locals():
            Base.metadata.create_all(bind=engine)
            print("✅ Database tables created successfully!")
        else:
            print("⚠️  No Base metadata found - you may need to define your models")
            
        return True
        
    except Exception as e:
        print(f"❌ Error during migration: {e}")
        print(f"🔍 Error details: {type(e).__name__}: {str(e)}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
