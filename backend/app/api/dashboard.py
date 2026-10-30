from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.user import User, UserRole
from app.models.subject import Subject
from app.models.topic import Topic
from app.schemas.auth import UserResponse
from app.auth.dependencies import require_student, require_faculty, require_admin

from datetime import datetime, timezone, timedelta
from app.models.learning_state import LearningState
from app.models.assessment import Assessment

router = APIRouter(prefix="/api", tags=["Dashboards"])

@router.get("/student/overview")
def get_student_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student)
):
    subjects_count = db.query(Subject).count()
    topics_count = db.query(Topic).count()

    # Calculate real-time active streak from actual user assessment activity
    assessments = db.query(Assessment.created_at).filter(
        Assessment.student_id == current_user.id
    ).order_by(Assessment.created_at.desc()).all()

    streak = 0
    if assessments:
        unique_dates = sorted(list(set(a[0].date() for a in assessments if a[0])), reverse=True)
        today = datetime.now(timezone.utc).date()
        current_check = today
        for d in unique_dates:
            if d == current_check or d == current_check - timedelta(days=1):
                streak += 1
                current_check = d
            else:
                break

    # Calculate real-time assessed topics and status
    learning_states = db.query(LearningState).filter(LearningState.student_id == current_user.id).all()
    assessed_topics = sum(1 for ls in learning_states if ls.attempts > 0)
    mastered_topics = sum(1 for ls in learning_states if ls.mastery_score >= 80.0)

    if assessed_topics == 0:
        status_msg = "Not Started"
        welcome_msg = f"Welcome, {current_user.name}! Choose a topic to begin your real-time learning assessments."
    else:
        avg_m = sum(ls.mastery_score for ls in learning_states if ls.attempts > 0) / assessed_topics
        status_msg = f"{assessed_topics} topics practiced"
        welcome_msg = f"Welcome back, {current_user.name}! You have achieved {round(avg_m, 1)}% average mastery across {assessed_topics} assessed topics."

    return {
        "user": UserResponse.model_validate(current_user),
        "available_subjects": subjects_count,
        "available_topics": topics_count,
        "active_learning_streak": streak,
        "status": status_msg,
        "message": welcome_msg
    }

@router.get("/faculty/overview")
def get_faculty_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_faculty)
):
    my_subjects = db.query(Subject).filter(Subject.faculty_id == current_user.id).all()
    all_subjects = db.query(Subject).all()
    topics_count = db.query(Topic).count()
    students_count = db.query(User).filter(User.role == UserRole.STUDENT).count()
    return {
        "user": UserResponse.model_validate(current_user),
        "managed_subjects": len(my_subjects),
        "total_subjects": len(all_subjects),
        "total_topics": topics_count,
        "total_students": students_count,
        "message": f"Faculty Dashboard active for {current_user.name}. Ready for curriculum and intervention management."
    }

@router.get("/admin/overview")
def get_admin_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    users_count = db.query(User).count()
    student_count = db.query(User).filter(User.role == UserRole.STUDENT).count()
    faculty_count = db.query(User).filter(User.role == UserRole.FACULTY).count()
    admin_count = db.query(User).filter(User.role == UserRole.ADMIN).count()
    subjects_count = db.query(Subject).count()
    topics_count = db.query(Topic).count()
    return {
        "user": UserResponse.model_validate(current_user),
        "total_users": users_count,
        "students": student_count,
        "faculty": faculty_count,
        "admins": admin_count,
        "subjects": subjects_count,
        "topics": topics_count,
        "system_status": "Healthy"
    }

@router.get("/admin/users", response_model=List[UserResponse])
def get_all_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    return db.query(User).order_by(User.created_at.desc()).all()
