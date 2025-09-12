"""Add irregular column to guesses

Revision ID: add_irregular_to_guesses
Revises: d74450cbe5c0
Create Date: 2025-09-12
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_irregular_to_guesses'
down_revision = 'd74450cbe5c0'
branch_labels = None
depends_on = None

def upgrade():
    # Add column as nullable with no server default so legacy rows remain NULL
    op.add_column('guesses', sa.Column('irregular', sa.Boolean(), nullable=True))

def downgrade():
    op.drop_column('guesses', 'irregular')