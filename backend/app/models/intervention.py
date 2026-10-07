import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.base import Base

class Intervention(Base):
    __tablename__ = "interventions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    topic_id = Column(String(36), ForeignKey("topics.id", ondelete="CASCADE"), nullable=False, index=True)
    faculty_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    reason = Column(Text, nullable=False)
    recommended_action = Column(Text, nullable=False)
    # PENDING, REVIEWED, STUDENT_CONTACTED, MATERIAL_PROVIDED, FOLLOW_UP_REQUIRED, RESOLVED
    status = Column(String(30), default="PENDING", nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    student = relationship("User", foreign_keys=[student_id], backref="student_interventions")
    topic = relationship("Topic", backref="interventions")
    faculty = relationship("User", foreign_keys=[faculty_id], backref="assigned_interventions")

    def __repr__(self):
        return f"<Intervention id={self.id} student={self.student_id} topic={self.topic_id} status={self.status}>"
