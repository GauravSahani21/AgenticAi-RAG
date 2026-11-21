from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.user import User, UserRole
from app.models.subject import Subject
from app.models.topic import Topic
from app.schemas.auth import UserResponse, AdminUserCreate
from app.auth.security import get_password_hash
from app.services.institution import normalize_email
from app.services.deletion import delete_user_records
from sqlalchemy import func
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


@router.post("/admin/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_admin_user(
    user_in: AdminUserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Provision accounts without allowing privileged public self-registration."""
    email = normalize_email(user_in.email)
    if db.query(User).filter(func.lower(User.email) == email).first():
        raise HTTPException(status_code=400, detail="Email is already registered")
    user = User(
        name=user_in.name.strip(), email=email,
        password_hash=get_password_hash(user_in.password),
        role=user_in.role, department=user_in.department,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/admin/users/{user_id}")
def delete_admin_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    target = db.query(User).filter(User.id == user_id).first()
    if target is None:
        raise HTTPException(status_code=404, detail="User not found")
    if target.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own administrator account")
    if target.role == UserRole.ADMIN and db.query(User).filter(User.role == UserRole.ADMIN).count() <= 1:
        raise HTTPException(status_code=400, detail="Cannot delete the last administrator")
    try:
        delete_user_records(db, target)
        db.commit()
    except Exception:
        db.rollback()
        raise
    return {"message": "User and personal learning records deleted. Faculty courses remain available."}
