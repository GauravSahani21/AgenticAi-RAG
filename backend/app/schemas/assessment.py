from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

class LearningStateResponse(BaseModel):
    id: str
    student_id: str
    topic_id: str
    topic_name: Optional[str] = None
    subject_id: Optional[str] = None
    mastery_score: float
    confidence_score: float
    attempts: int
    correct_answers: int
    incorrect_answers: int
    misconceptions: List[str] = []
    difficulty_level: str
    status: str
    updated_at: datetime

class QuestionGenerateRequest(BaseModel):
    topic_id: str
    difficulty: Optional[str] = None  # BEGINNER, INTERMEDIATE, ADVANCED
    question_type: Optional[str] = None  # CONCEPTUAL, SHORT_ANSWER, MCQ, APPLICATION, SCENARIO

class GeneratedQuestionResponse(BaseModel):
    question_id: str
    topic_id: str
    topic_name: str
    question_text: str
    question_type: str
    difficulty: str
    options: Optional[List[str]] = None
    hint: Optional[str] = None

class AssessmentSubmitRequest(BaseModel):
    topic_id: str
    question_text: str
    question_type: str
    difficulty: str
    student_answer: str = Field(..., min_length=1, max_length=2000)
    session_id: Optional[str] = None

class AssessmentSubmitResponse(BaseModel):
    assessment_id: str
    is_correct: bool
    score: float
    feedback: str
    identified_misconception: Optional[str] = None
    previous_mastery: float
    updated_mastery: float
    status: str
    attempts: int
    correct_answers: int
    incorrect_answers: int
