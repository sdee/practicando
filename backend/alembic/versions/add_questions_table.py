"""Add questions table

Revision ID: add_questions_table
Revises: 
Create Date: 2025-08-29

"""
from alembic import op
import sqlalchemy as sa
import enum

# revision identifiers, used by Alembic.
revision = 'add_questions_table'
down_revision = None
branch_labels = None
depends_on = None

class TenseEnum(enum.Enum):
    present = "present"
    imperfect = "imperfect"
    preterite = "preterite"
    future = "future"
    present_perfect = "present_perfect"
    past_anterior = "past_anterior"
    future_perfect = "future_perfect"
    conditional_simple = "conditional_simple"

class MoodEnum(enum.Enum):
    conditional = "conditional"
    imperative = "imperative"
    indicative = "indicative"
    subjunctive = "subjunctive"

def upgrade():
    op.create_table(
        'questions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('pronoun', sa.String(), nullable=False),
        sa.Column('tense', sa.Enum(TenseEnum), nullable=False),
        sa.Column('answer', sa.String(), nullable=False),
        sa.Column('verb', sa.String(), nullable=False),
        sa.Column('mood', sa.Enum(MoodEnum), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

def downgrade():
    op.drop_table('questions')
