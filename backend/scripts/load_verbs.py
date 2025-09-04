#!/usr/bin/env python3
"""
Load Spanish verbs from TubeLex data into the database.

This script loads Spanish verbs from the TubeLex TSV file located in backend/data/
and populates the verbs table with frequency rankings.
"""
import sys
import os
from pathlib import Path

# Add current backend directory to Python path
backend_path = Path(__file__).parent.parent  # Go up from scripts to backend
sys.path.insert(0, str(backend_path))

def main():
    try:
        print("🗃️  Loading Spanish verbs from TubeLex data...")
        
        # Import after setting path
        from db import get_sessionmaker
        from utils import populate_verbs_from_tubelex
        
        # Get database session
        SessionLocal = get_sessionmaker()
        session = SessionLocal()
        
        try:
            # Path to the TubeLex data file
            data_file = backend_path / "data" / "verbs-top500-from-tubelex.tsv"
            
            if not data_file.exists():
                print(f"❌ Data file not found: {data_file}")
                print("📝 Please ensure the TubeLex verbs file exists at:")
                print(f"   {data_file}")
                return False
            
            print(f"📁 Loading from: {data_file}")
            
            # Load the verbs using the utility function
            stats = populate_verbs_from_tubelex(session, str(data_file))
            
            print("✅ Verbs loaded successfully!")
            print(f"📊 Statistics:")
            print(f"   - Added: {stats['added']}")
            print(f"   - Updated: {stats['updated']}")
            print(f"   - Skipped: {stats['skipped']}")
            
            return True
            
        finally:
            session.close()
        
    except Exception as e:
        print(f"❌ Error loading verbs: {e}")
        print(f"🔍 Error details: {type(e).__name__}: {str(e)}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)