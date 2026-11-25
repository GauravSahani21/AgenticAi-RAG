"""Store server-side answer keys for grounded generated questions.

Revision ID: 96e2c1a0b9d3
Revises: 0c8f14e3f280
"""
from alembic import op
import sqlalchemy as sa

revision = '96e2c1a0b9d3'
down_revision = '0c8f14e3f280'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'generated_questions',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('student_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('topic_id', sa.String(length=36), sa.ForeignKey('topics.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('question_text', sa.Text(), nullable=False),
        sa.Column('question_type', sa.String(length=30), nullable=False),
        sa.Column('difficulty', sa.String(length=20), nullable=False),
        sa.Column('options_json', sa.Text()),
        sa.Column('correct_option', sa.String(length=1)),
        sa.Column('reference_answer', sa.Text(), nullable=False),
        sa.Column('source_quote', sa.Text(), nullable=False),
        sa.Column('hint', sa.Text()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('answered_at', sa.DateTime(timezone=True)),
    )


def downgrade():
    op.drop_table('generated_questions')
