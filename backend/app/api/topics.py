from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.topic import Topic
from app.models.subject import Subject
from app.models.user import User
from app.schemas.topic import TopicCreate, TopicResponse
from app.auth.dependencies import get_current_user, require_faculty

router = APIRouter(prefix="/api/topics", tags=["Topics"])

@router.get("", response_model=List[TopicResponse])
def get_topics(
    subject_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Topic)
    if subject_id:
        query = query.filter(Topic.subject_id == subject_id)
    return query.all()

@router.post("", response_model=TopicResponse, status_code=status.HTTP_201_CREATED)
def create_topic(
    topic_in: TopicCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_faculty)
):
    subject = db.query(Subject).filter(Subject.id == topic_in.subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
        
    topic = Topic(
        subject_id=topic_in.subject_id,
        module=topic_in.module,
        name=topic_in.name,
        description=topic_in.description,
        difficulty=topic_in.difficulty
    )
    db.add(topic)
    db.commit()
    db.refresh(topic)
    return topic
