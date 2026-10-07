from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

class TutorSource(BaseModel):
    document: str
    page: int
    section: str
    snippet: str
    similarity_score: float

class TutorChatRequest(BaseModel):
    subject_id: str
    topic_id: Optional[str] = None
    session_id: Optional[str] = None
    message: str = Field(..., min_length=1, max_length=2000)
    student_proficiency: Optional[str] = None  # "HIGH", "MEDIUM", "LOW"

class TutorChatResponse(BaseModel):
    response: str
    action: str
    strategy_label: str
    grounded: bool
    grounding_status: str
    sources: List[TutorSource]
    session_id: str
    subject_id: str
    topic_id: Optional[str] = None
    created_at: datetime

class InteractionResponse(BaseModel):
    id: str
    student_message: str
    ai_response: str
    agent_action: str
    strategy_label: str
    grounded: bool
    created_at: datetime

class SessionDetailResponse(BaseModel):
    id: str
    subject_id: str
    topic_id: Optional[str] = None
    started_at: datetime
    interactions: List[InteractionResponse] = []

