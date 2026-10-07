import uuid
from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.base import Base

class Interaction(Base):
    __tablename__ = "interactions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(36), ForeignKey("learning_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_message = Column(Text, nullable=False)
    ai_response = Column(Text, nullable=False)
    agent_action = Column(String(50), default="EXPLAIN", nullable=False)
    strategy_label = Column(String(100), default="Direct Academic Explanation", nullable=False)
    grounded = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    session = relationship("LearningSession", back_populates="interactions")

    def __repr__(self):
        return f"<Interaction {self.id} Action: {self.agent_action} ({self.strategy_label})>"

