import json
import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.learning_state import LearningState
from app.models.intervention import Intervention
from app.models.topic import Topic
from app.models.user import User

logger = logging.getLogger(__name__)

# Configurable Intervention Thresholds
MASTERY_STRUGGLE_THRESHOLD = 50.0
MIN_ATTEMPTS_THRESHOLD = 3
INCORRECT_RATIO_THRESHOLD = 0.5

def evaluate_and_generate_interventions(db: Session, faculty_id: Optional[str] = None) -> List[Intervention]:
    """
    Scans stored LearningState records and evaluates against institutional intervention rules.
    Generates or updates data-grounded Intervention records.
    Never generates vague AI alerts—strictly uses actual stored learning statistics.
    """
    states = db.query(LearningState).all()
    created_or_updated = []

    for state in states:
        student = db.query(User).filter(User.id == state.student_id).first()
        topic = db.query(Topic).filter(Topic.id == state.topic_id).first()
        if not student or not topic:
            continue

        misconceptions = []
        try:
            misconceptions = json.loads(state.misconceptions)
        except Exception:
            pass

        reasons = []
        recommendations = []

        # Rule 1: High attempts with low mastery
        if state.mastery_score < MASTERY_STRUGGLE_THRESHOLD and state.attempts >= MIN_ATTEMPTS_THRESHOLD:
            reasons.append(
                f"Student has attempted {topic.name} {state.attempts} times, "
                f"currently has {state.mastery_score:.1f}% mastery, and has shown limited improvement."
            )
            recommendations.append(
                f"Schedule a 1-on-1 tutoring session on foundational prerequisites for {topic.name}."
            )

        # Rule 2: Persistent conceptual misconceptions
        if len(misconceptions) >= 2:
            reasons.append(
                f"Student has exhibited repeated conceptual misconceptions on {topic.name}: "
                f"{'; '.join(misconceptions)}."
            )
            recommendations.append(
                f"Provide targeted supplementary conceptual readings and remedial practice for {topic.name}."
            )

        # Rule 3: High failure rate (> 60% incorrect answers with at least 3 attempts)
        if state.attempts >= MIN_ATTEMPTS_THRESHOLD and (state.incorrect_answers / state.attempts) >= 0.6:
            reasons.append(
                f"High failure rate ({state.incorrect_answers} incorrect out of {state.attempts} attempts) on {topic.name}."
            )
            recommendations.append(
                f"Review recent diagnostic assessment responses and clarify core principles."
            )

        if reasons:
            combined_reason = " ".join(reasons)
            combined_rec = " ".join(recommendations)

            # Check if active intervention already exists for this student and topic
            existing = db.query(Intervention).filter(
                Intervention.student_id == student.id,
                Intervention.topic_id == topic.id,
                Intervention.status.in_(["PENDING", "REVIEWED", "STUDENT_CONTACTED", "FOLLOW_UP_REQUIRED"])
            ).first()

            if existing:
                existing.reason = combined_reason
                existing.recommended_action = combined_rec
                if faculty_id and not existing.faculty_id:
                    existing.faculty_id = faculty_id
                created_or_updated.append(existing)
            else:
                new_intervention = Intervention(
                    student_id=student.id,
                    topic_id=topic.id,
                    faculty_id=faculty_id or topic.subject.faculty_id,
                    reason=combined_reason,
                    recommended_action=combined_rec,
                    status="PENDING"
                )
                db.add(new_intervention)
                created_or_updated.append(new_intervention)

            # Update learning state status
            state.status = "INTERVENTION_REQUIRED"

    db.commit()
    logger.info(f"Processed intervention scan: {len(created_or_updated)} flagged records.")
    return created_or_updated
