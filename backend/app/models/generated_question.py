import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database.base import Base


class GeneratedQuestion(Base):
    __tablename__ = 'generated_questions'
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    topic_id = Column(String(36), ForeignKey('topics.id', ondelete='CASCADE'), nullable=False, index=True)
    question_text = Column(Text, nullable=False)
    question_type = Column(String(30), nullable=False)
    difficulty = Column(String(20), nullable=False)
    options_json = Column(Text, nullable=True)
    correct_option = Column(String(1), nullable=True)
    reference_answer = Column(Text, nullable=False)
    source_quote = Column(Text, nullable=False)
    hint = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    answered_at = Column(DateTime(timezone=True), nullable=True)
