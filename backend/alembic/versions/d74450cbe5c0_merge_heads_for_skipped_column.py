"""merge heads for skipped column

Revision ID: d74450cbe5c0
Revises: add_skipped_to_guesses_20250911, 611307de519f
Create Date: 2025-09-11 11:13:05.196636

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd74450cbe5c0'
down_revision: Union[str, Sequence[str], None] = ('611307de519f')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
