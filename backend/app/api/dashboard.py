from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.user import User, UserRole
from app.models.subject import Subject
from app.models.topic import Topic
from app.schemas.auth import UserResponse
from app.auth.dependencies import require_student, require_faculty, require_admin

router = APIRouter(prefix="/api", tags=["Dashboards"])

@router.get("/student/overview")
def get_student_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student)
):
    subjects_count = db.query(Subject).count()
    topics_count = db.query(Topic).count()
    return {
        "user": UserResponse.model_validate(current_user),
        "available_subjects": subjects_count,
        "available_topics": topics_count,
        "active_learning_streak": 3,
        "status": "Ready to learn",
        "message": f"Welcome back, {current_user.name}! Your adaptive learning journey is active."
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
