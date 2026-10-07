from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class ClassOverviewResponse(BaseModel):
    total_students: int
    active_students: int
    average_mastery: float
    students_struggling: int
    students_mastered: int
    topics_requiring_attention: List[Dict[str, Any]] = []

class TopicAnalyticsItem(BaseModel):
    topic_id: str
    topic_name: str
    module: str
    difficulty: str
    subject_id: str
    subject_name: str
    average_mastery: float
    students_struggling: int
    students_mastered: int
    total_attempts: int
    average_attempts: float

class StudentAnalyticsSummary(BaseModel):
    student_id: str
    student_name: str
    student_email: str
    department: str
    overall_mastery: float
    total_attempts: int
    total_correct: int
    total_incorrect: int
    misconceptions: List[str] = []
    status: str
    requires_intervention: bool

class InterventionResponse(BaseModel):
    id: str
    student_id: str
    student_name: str
    student_email: str
    topic_id: str
    topic_name: str
    subject_id: str
    subject_name: str
    reason: str
    recommended_action: str
    status: str
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class InterventionStatusUpdateRequest(BaseModel):
    status: str = Field(..., description="PENDING, REVIEWED, STUDENT_CONTACTED, MATERIAL_PROVIDED, FOLLOW_UP_REQUIRED, RESOLVED")
    notes: Optional[str] = None
