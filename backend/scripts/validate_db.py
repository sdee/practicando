#!/usr/bin/env python3
"""
Database Validation Script for Spanish Conjugation App
Validates database connections and data integrity
"""
import os
import sys
import argparse
from pathlib import Path

# Add parent directory to path to import modules
sys.path.insert(0, str(Path(__file__).parent.parent))

def validate_connection(mode='learn'):
    """Validate database connection for given mode"""
    try:
        os.environ['DATABASE_MODE'] = mode
        
        from db import get_engine, _db_url
        from sqlalchemy import text
        
        url = _db_url()
        print(f"🔍 Validating {mode} mode: {url}")
        
        engine = get_engine()
        
        # Test basic connection
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            result.fetchone()
            print(f"✅ Connection successful for {mode} mode")
            
        return True
        
    except Exception as e:
        print(f"❌ Connection failed for {mode} mode: {e}")
        return False

def validate_tables():
    """Validate that required tables exist"""
    try:
        from db import get_engine
        from sqlalchemy import inspect
        
        engine = get_engine()
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        required_tables = ['verbs', 'rounds', 'guesses']
        missing_tables = [table for table in required_tables if table not in tables]
        
        if missing_tables:
            print(f"❌ Missing tables: {missing_tables}")
            print(f"📋 Existing tables: {tables}")
            return False
        else:
            print(f"✅ All required tables exist: {required_tables}")
            return True
            
    except Exception as e:
        print(f"❌ Table validation failed: {e}")
        return False

def validate_data():
    """Validate basic data integrity"""
    try:
        from db import get_sessionmaker
        from models import Verb
        
        SessionLocal = get_sessionmaker()
        db = SessionLocal()
        
        try:
            # Check if we have verbs
            verb_count = db.query(Verb).count()
            print(f"📊 Total verbs in database: {verb_count}")
            
            if verb_count == 0:
                print("⚠️  No verbs found in database")
                return False
            
            # Check verb classes distribution
            # Check verb categories based on tubelex_rank
            top10_count = db.query(Verb).filter(
                Verb.tubelex_rank.isnot(None),
                Verb.tubelex_rank <= 10
            ).count()
            top20_count = db.query(Verb).filter(
                Verb.tubelex_rank.isnot(None),
                Verb.tubelex_rank <= 20
            ).count()
            top100_count = db.query(Verb).filter(
                Verb.tubelex_rank.isnot(None),
                Verb.tubelex_rank <= 100
            ).count()
            
            print(f"📈 Verb distribution:")
            print(f"   - Top 10: {top10_count}")
            print(f"   - Top 20: {top20_count}")
            print(f"   - Top 100: {top100_count}")
            
            return True
            
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ Data validation failed: {e}")
        return False

def validate_environment():
    """Validate environment configuration"""
    print("🔧 Environment Configuration:")
    
    db_mode = os.getenv('DATABASE_MODE', 'learn')
    print(f"   - DATABASE_MODE: {db_mode}")
    
    db_url = os.getenv('DATABASE_URL')
    if db_url:
        print(f"   - DATABASE_URL: {db_url}")
    else:
        print("   - DATABASE_URL: Not set (using mode-based config)")
    
    # Check mode-specific URLs
    for mode in ['test', 'learn', 'dev', 'staging', 'production']:
        var_name = f"{mode.upper()}_DATABASE_URL"
        var_value = os.getenv(var_name)
        if var_value:
            print(f"   - {var_name}: {var_value}")

def main():
    parser = argparse.ArgumentParser(description='Validate Spanish Conjugation App Database')
    parser.add_argument(
        '--mode', 
        choices=['test', 'learn', 'dev'],
        default='learn',
        help='Database mode to validate (default: learn)'
    )
    parser.add_argument(
        '--skip-data',
        action='store_true',
        help='Skip data validation (only test connection and tables)'
    )
    parser.add_argument(
        '--all-modes',
        action='store_true',
        help='Validate all available modes'
    )
    
    args = parser.parse_args()
    
    print("🔍 Database Validation for Spanish Conjugation App")
    print("=" * 50)
    
    # Validate environment
    validate_environment()
    print()
    
    # Determine modes to validate
    if args.all_modes:
        modes = ['test', 'learn', 'dev']
    else:
        modes = [args.mode]
    
    overall_success = True
    
    for mode in modes:
        print(f"🗄️  Validating {mode.upper()} mode:")
        print("-" * 30)
        
        # Test connection
        if not validate_connection(mode):
            overall_success = False
            continue
            
        # Test tables (only for the current mode to avoid switching)
        if mode == args.mode or not args.all_modes:
            if not validate_tables():
                overall_success = False
                continue
                
            # Test data if requested
            if not args.skip_data:
                if not validate_data():
                    overall_success = False
                    
        print()
    
    # Summary
    if overall_success:
        print("🎉 All validations passed!")
        sys.exit(0)
    else:
        print("💥 Some validations failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()
