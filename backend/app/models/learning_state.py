import uuid
from sqlalchemy import Column, String, Float, Integer, Text, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.base import Base

class LearningState(Base):
    __tablename__ = "learning_states"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    topic_id = Column(String(36), ForeignKey("topics.id", ondelete="CASCADE"), nullable=False, index=True)
    mastery_score = Column(Float, default=0.0, nullable=False)  # 0.0 to 100.0
    confidence_score = Column(Float, default=0.5, nullable=False)  # 0.0 to 1.0
    attempts = Column(Integer, default=0, nullable=False)
    correct_answers = Column(Integer, default=0, nullable=False)
    incorrect_answers = Column(Integer, default=0, nullable=False)
    misconceptions = Column(Text, default="[]", nullable=False)  # JSON-encoded array of strings
    difficulty_level = Column(String(20), default="BEGINNER", nullable=False)
    status = Column(String(30), default="NOT_STARTED", nullable=False)  # NOT_STARTED, LEARNING, IMPROVING, MASTERED, STRUGGLING, INTERVENTION_REQUIRED
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("student_id", "topic_id", name="uq_student_topic_learning_state"),
    )

    # Relationships
    student = relationship("User", backref="learning_states")
    topic = relationship("Topic", backref="learning_states")

    def __repr__(self):
        return f"<LearningState student={self.student_id} topic={self.topic_id} mastery={self.mastery_score:.1f}% status={self.status}>"
