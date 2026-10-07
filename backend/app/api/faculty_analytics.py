import json
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database.session import get_db
from app.models.user import User, UserRole
from app.models.subject import Subject
from app.models.topic import Topic
from app.models.learning_state import LearningState
from app.models.assessment import Assessment
from app.models.intervention import Intervention
from app.schemas.analytics import (
    ClassOverviewResponse,
    TopicAnalyticsItem,
    StudentAnalyticsSummary,
    InterventionResponse,
    InterventionStatusUpdateRequest
)
from app.auth.dependencies import require_faculty
from app.ai.intervention import evaluate_and_generate_interventions

router = APIRouter(prefix="/api/faculty", tags=["Faculty Analytics & Interventions"])

VALID_STATUSES = [
    "PENDING",
    "REVIEWED",
    "STUDENT_CONTACTED",
    "MATERIAL_PROVIDED",
    "FOLLOW_UP_REQUIRED",
    "RESOLVED"
]

@router.get("/analytics/overview", response_model=ClassOverviewResponse)
def get_class_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_faculty)
):
    # Total students
    total_students = db.query(User).filter(User.role == UserRole.STUDENT).count()

    # Active students (with at least 1 learning state or interaction)
    active_students = db.query(func.count(func.distinct(LearningState.student_id))).scalar() or 0

    # Average mastery across all learning states
    avg_mastery = db.query(func.avg(LearningState.mastery_score)).scalar() or 0.0

    # Students struggling (mastery < 50% on at least one attempted topic)
    struggling_count = db.query(func.count(func.distinct(LearningState.student_id))).filter(
        LearningState.mastery_score < 50.0,
        LearningState.attempts >= 1
    ).scalar() or 0

    # Students mastered (mastery >= 80%)
    mastered_count = db.query(func.count(func.distinct(LearningState.student_id))).filter(
        LearningState.mastery_score >= 80.0
    ).scalar() or 0

    # Topics requiring attention (lowest avg mastery or most struggles)
    topics = db.query(Topic).all()
    topic_summary = []
    for t in topics:
        states = db.query(LearningState).filter(LearningState.topic_id == t.id).all()
        if states:
            avg_m = sum(s.mastery_score for s in states) / len(states)
            struggles = sum(1 for s in states if s.mastery_score < 50.0)
            if avg_m < 60.0 or struggles > 0:
                topic_summary.append({
                    "topic_id": t.id,
                    "topic_name": t.name,
                    "module": t.module,
                    "average_mastery": round(avg_m, 1),
                    "students_struggling": struggles,
                })

    topic_summary.sort(key=lambda x: x["average_mastery"])

    return ClassOverviewResponse(
        total_students=total_students,
        active_students=active_students,
        average_mastery=round(avg_mastery, 1),
        students_struggling=struggling_count,
        students_mastered=mastered_count,
        topics_requiring_attention=topic_summary[:5]
    )

@router.get("/analytics/topics", response_model=List[TopicAnalyticsItem])
def get_topic_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_faculty)
):
    topics = db.query(Topic).all()
    results = []
    for t in topics:
        states = db.query(LearningState).filter(LearningState.topic_id == t.id).all()
        if states:
            avg_m = sum(s.mastery_score for s in states) / len(states)
            struggles = sum(1 for s in states if s.mastery_score < 50.0)
            mastered = sum(1 for s in states if s.mastery_score >= 80.0)
            total_att = sum(s.attempts for s in states)
            avg_att = total_att / len(states)
        else:
            avg_m = 0.0
            struggles = 0
            mastered = 0
            total_att = 0
            avg_att = 0.0

        results.append(TopicAnalyticsItem(
            topic_id=t.id,
            topic_name=t.name,
            module=t.module,
            difficulty=t.difficulty,
            subject_id=t.subject_id,
            subject_name=t.subject.name if t.subject else "General",
            average_mastery=round(avg_m, 1),
            students_struggling=struggles,
            students_mastered=mastered,
            total_attempts=total_att,
            average_attempts=round(avg_att, 1)
        ))
    return results

@router.get("/analytics/students", response_model=List[StudentAnalyticsSummary])
def get_student_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_faculty)
):
    students = db.query(User).filter(User.role == UserRole.STUDENT).all()
    summaries = []
    for st in students:
        states = db.query(LearningState).filter(LearningState.student_id == st.id).all()
        if states:
            overall_m = sum(s.mastery_score for s in states) / len(states)
            total_att = sum(s.attempts for s in states)
            total_c = sum(s.correct_answers for s in states)
            total_inc = sum(s.incorrect_answers for s in states)
            all_misc = []
            for s in states:
                try:
                    all_misc.extend(json.loads(s.misconceptions))
                except Exception:
                    pass
            # Unique misconceptions
            all_misc = list(set(all_misc))
            status_val = "INTERVENTION_REQUIRED" if any(s.status == "INTERVENTION_REQUIRED" for s in states) else (
                "STRUGGLING" if any(s.status == "STRUGGLING" for s in states) else (
                    "MASTERED" if all(s.status == "MASTERED" for s in states) else "LEARNING"
                )
            )
            needs_interv = any(s.status in ["STRUGGLING", "INTERVENTION_REQUIRED"] for s in states)
        else:
            overall_m = 0.0
            total_att = 0
            total_c = 0
            total_inc = 0
            all_misc = []
            status_val = "NOT_STARTED"
            needs_interv = False

        summaries.append(StudentAnalyticsSummary(
            student_id=st.id,
            student_name=st.name,
            student_email=st.email,
            department=st.department or "General",
            overall_mastery=round(overall_m, 1),
            total_attempts=total_att,
            total_correct=total_c,
            total_incorrect=total_inc,
            misconceptions=all_misc,
            status=status_val,
            requires_intervention=needs_interv
        ))
    return summaries

@router.get("/interventions", response_model=List[InterventionResponse])
def get_interventions(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_faculty)
):
    # Auto-scan to ensure data-grounded alerts are current
    evaluate_and_generate_interventions(db, faculty_id=current_user.id)

    interventions = db.query(Intervention).order_by(Intervention.created_at.desc()).all()
    results = []
    for inv in interventions:
        results.append(InterventionResponse(
            id=inv.id,
            student_id=inv.student_id,
            student_name=inv.student.name if inv.student else "Student",
            student_email=inv.student.email if inv.student else "",
            topic_id=inv.topic_id,
            topic_name=inv.topic.name if inv.topic else "Topic",
            subject_id=inv.topic.subject_id if inv.topic else "",
            subject_name=inv.topic.subject.name if (inv.topic and inv.topic.subject) else "Subject",
            reason=inv.reason,
            recommended_action=inv.recommended_action,
            status=inv.status,
            notes=inv.notes,
            created_at=inv.created_at,
            updated_at=inv.updated_at
        ))
    return results

@router.patch("/interventions/{intervention_id}/status", response_model=InterventionResponse)
def update_intervention_status(
    intervention_id: str,
    request: InterventionStatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_faculty)
):
    new_status = request.status.upper()
    if new_status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{request.status}'. Allowed: {', '.join(VALID_STATUSES)}"
        )

    inv = db.query(Intervention).filter(Intervention.id == intervention_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Intervention not found")

    inv.status = new_status
    if request.notes is not None:
        inv.notes = request.notes
    inv.faculty_id = current_user.id
    db.commit()
    db.refresh(inv)

    return InterventionResponse(
        id=inv.id,
        student_id=inv.student_id,
        student_name=inv.student.name if inv.student else "Student",
        student_email=inv.student.email if inv.student else "",
        topic_id=inv.topic_id,
        topic_name=inv.topic.name if inv.topic else "Topic",
        subject_id=inv.topic.subject_id if inv.topic else "",
        subject_name=inv.topic.subject.name if (inv.topic and inv.topic.subject) else "Subject",
        reason=inv.reason,
        recommended_action=inv.recommended_action,
        status=inv.status,
        notes=inv.notes,
        created_at=inv.created_at,
        updated_at=inv.updated_at
    )
