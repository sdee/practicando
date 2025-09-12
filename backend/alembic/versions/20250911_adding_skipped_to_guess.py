"""add skipped column to guesses

Revision ID: add_skipped_to_guesses_20250911
Revises: 6fcd840b7647
Create Date: 2025-09-11
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_skipped_to_guesses_20250911'
down_revision = '6fcd840b7647'
branch_labels = None


def upgrade() -> None:
    op.add_column('guesses', sa.Column('skipped', sa.Boolean(), nullable=True))


def downgrade() -> None:
    op.drop_column('guesses', 'skipped')


