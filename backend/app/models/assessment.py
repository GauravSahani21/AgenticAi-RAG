import uuid
from sqlalchemy import Column, String, Float, Boolean, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.base import Base

class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    topic_id = Column(String(36), ForeignKey("topics.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id = Column(String(36), ForeignKey("learning_sessions.id", ondelete="SET NULL"), nullable=True, index=True)
    question_text = Column(Text, nullable=False)
    question_type = Column(String(30), default="CONCEPTUAL", nullable=False)  # CONCEPTUAL, SHORT_ANSWER, MCQ, APPLICATION, SCENARIO
    difficulty = Column(String(20), default="INTERMEDIATE", nullable=False)   # BEGINNER, INTERMEDIATE, ADVANCED
    options_json = Column(Text, nullable=True)  # JSON-encoded array of choices for MCQ
    student_answer = Column(Text, nullable=False)
    is_correct = Column(Boolean, nullable=False)
    score = Column(Float, default=0.0, nullable=False)  # 0.0 to 1.0
    feedback = Column(Text, nullable=False)
    identified_misconception = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    student = relationship("User", backref="assessments")
    topic = relationship("Topic", backref="assessments")
    session = relationship("LearningSession", backref="assessments")

    def __repr__(self):
        return f"<Assessment id={self.id} type={self.question_type} correct={self.is_correct} score={self.score}>"
