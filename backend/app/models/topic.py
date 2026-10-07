import uuid
from sqlalchemy import Column, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database.base import Base

class Topic(Base):
    __tablename__ = "topics"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    subject_id = Column(String(36), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    module = Column(String(100), nullable=False)
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    difficulty = Column(String(50), nullable=False, default="MEDIUM")

    # Relationships
    subject = relationship("Subject", back_populates="topics")
    documents = relationship("Document", back_populates="topic")
    learning_sessions = relationship("LearningSession", back_populates="topic")

    def __repr__(self):
        return f"<Topic {self.module} - {self.name}>"
