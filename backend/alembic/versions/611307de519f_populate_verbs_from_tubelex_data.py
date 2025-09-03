"""populate_verbs_from_tubelex_data

Revision ID: 611307de519f
Revises: c8a1b429b45c
Create Date: 2025-09-03 17:35:21.564371

"""
from typing import Sequence, Union
import os
from pathlib import Path

from alembic import op
import sqlalchemy as sa
from sqlalchemy.orm import Session

# revision identifiers, used by Alembic.
revision: str = '611307de519f'
down_revision: Union[str, Sequence[str], None] = 'c8a1b429b45c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Import our utility function
    import sys
    sys.path.append(os.path.dirname(os.path.dirname(__file__)))
    from utils import populate_verbs_from_tubelex
    
    # Get database connection from alembic
    bind = op.get_bind()
    session = Session(bind=bind)
    
    try:
        # Path to the TubeLex data file
        data_dir = Path(__file__).parent.parent.parent / "data"
        tubelex_file = data_dir / "verbs-top500-from-tubelex.tsv"
        
        if tubelex_file.exists():
            print(f"Loading TubeLex verbs from: {tubelex_file}")
            stats = populate_verbs_from_tubelex(session, str(tubelex_file))
            print(f"Migration completed: {stats}")
        else:
            print(f"Warning: TubeLex file not found at {tubelex_file}")
    except Exception as e:
        print(f"Error during TubeLex data population: {e}")
        raise
    finally:
        session.close()


def downgrade() -> None:
    """Downgrade schema."""
    # Remove TubeLex data from verbs
    bind = op.get_bind()
    
    # Update all verbs to clear tubelex_count and tubelex_rank
    op.execute(
        "UPDATE verbs SET tubelex_count = NULL, tubelex_rank = NULL WHERE tubelex_count IS NOT NULL OR tubelex_rank IS NOT NULL"
    )
    
    print("Cleared TubeLex data from verbs table")
