"""Immutable answer-key snapshot for each submitted assessment.

Keeping this in a new table allows existing SQLite development databases to
upgrade via metadata.create_all, without altering their assessments table.
"""
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database.base import Base


class AssessmentReview(Base):
    __tablename__ = "assessment_reviews"

    assessment_id = Column(String(36), ForeignKey("assessments.id", ondelete="CASCADE"), primary_key=True)
    # Question ID is informational; snapshot remains valid if generation logs change.
    generated_question_id = Column(String(36), nullable=True)
    options_json = Column(Text, nullable=True)
    correct_option = Column(String(1), nullable=True)
    reference_answer = Column(Text, nullable=False)
    source_quote = Column(Text, nullable=True)
    hint = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
