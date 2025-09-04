#!/usr/bin/env python3
"""
Clean up test data from learn mode database.
Removes all guesses and rounds while preserving verbs.

Usage:
    python cleanup_test_data.py           # Interactive mode
    python cleanup_test_data.py --force   # Non-interactive mode
"""
import sys
import os
from pathlib import Path

# Add current backend directory to Python path
backend_path = Path(__file__).parent.parent  # Go up from scripts to backend
sys.path.insert(0, str(backend_path))

def main():
    # Check for --force flag
    force_mode = '--force' in sys.argv
    
    try:
        print("🧹 Cleaning up test data from learn mode...")
        
        # Import after setting path
        from db import get_sessionmaker
        from models import Guess, Round, Verb
        
        # Get database session
        SessionLocal = get_sessionmaker()
        session = SessionLocal()
        
        try:
            # Count existing data before deletion
            guess_count = session.query(Guess).count()
            round_count = session.query(Round).count()
            verb_count = session.query(Verb).count()
            
            print(f"📊 Current database state:")
            print(f"   - Guesses: {guess_count}")
            print(f"   - Rounds: {round_count}")
            print(f"   - Verbs: {verb_count}")
            
            if guess_count == 0 and round_count == 0:
                print("✅ Database is already clean - no test data to remove")
                return True
            
            # Confirm deletion (unless force mode)
            if not force_mode:
                print(f"\n⚠️  This will delete:")
                print(f"   - All {guess_count} guesses")
                print(f"   - All {round_count} rounds")
                print(f"   - Verbs will be preserved")
                
                response = input("\nContinue with deletion? (y/N): ")
                if response.lower() != 'y':
                    print("❌ Cancelled - no data was deleted")
                    return True
            else:
                print(f"\n🚀 Force mode: automatically cleaning up test data...")
            
            # Delete guesses first (due to foreign key constraints)
            deleted_guesses = session.query(Guess).delete()
            print(f"🗑️  Deleted {deleted_guesses} guesses")
            
            # Delete rounds
            deleted_rounds = session.query(Round).delete()
            print(f"🗑️  Deleted {deleted_rounds} rounds")
            
            # Commit the changes
            session.commit()
            
            # Verify final state
            final_guess_count = session.query(Guess).count()
            final_round_count = session.query(Round).count()
            final_verb_count = session.query(Verb).count()
            
            print(f"\n✅ Cleanup completed successfully!")
            print(f"📊 Final database state:")
            print(f"   - Guesses: {final_guess_count}")
            print(f"   - Rounds: {final_round_count}")
            print(f"   - Verbs: {final_verb_count} (preserved)")
            
            return True
            
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()
        
    except Exception as e:
        print(f"❌ Error during cleanup: {e}")
        print(f"🔍 Error details: {type(e).__name__}: {str(e)}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
