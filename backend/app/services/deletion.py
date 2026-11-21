"""Delete dependent relational records in FK-safe order.

Callers commit before removing non-transactional vector/filesystem resources.
"""
from sqlalchemy.orm import Session
from app.models.subject import Subject
from app.models.topic import Topic
from app.models.document import Document
from app.models.session import LearningSession
from app.models.interaction import Interaction
from app.models.assessment import Assessment
from app.models.learning_state import LearningState
from app.models.intervention import Intervention
from app.models.user import User
from app.models.generated_question import GeneratedQuestion
from app.models.assessment_review import AssessmentReview


def delete_subject_records(db: Session, subject: Subject) -> list[str]:
    """Delete subject, topics, assessments, states, sessions, and document records.

    Returns IDs of documents whose vector chunks must be purged after commit.
    """
    subject_id = subject.id
    topic_ids = [t[0] for t in db.query(Topic.id).filter(Topic.subject_id == subject_id).all()]
    document_ids = [d[0] for d in db.query(Document.id).filter(Document.subject_id == subject_id).all()]
    session_ids = [s[0] for s in db.query(LearningSession.id).filter(LearningSession.subject_id == subject_id).all()]
    if session_ids:
        db.query(Interaction).filter(Interaction.session_id.in_(session_ids)).delete(synchronize_session=False)
    if topic_ids:
        assessment_ids = [a[0] for a in db.query(Assessment.id).filter(Assessment.topic_id.in_(topic_ids)).all()]
        if assessment_ids:
            db.query(AssessmentReview).filter(AssessmentReview.assessment_id.in_(assessment_ids)).delete(synchronize_session=False)
        db.query(Assessment).filter(Assessment.topic_id.in_(topic_ids)).delete(synchronize_session=False)
        db.query(LearningState).filter(LearningState.topic_id.in_(topic_ids)).delete(synchronize_session=False)
        db.query(Intervention).filter(Intervention.topic_id.in_(topic_ids)).delete(synchronize_session=False)
        db.query(GeneratedQuestion).filter(GeneratedQuestion.topic_id.in_(topic_ids)).delete(synchronize_session=False)
    db.query(LearningSession).filter(LearningSession.subject_id == subject_id).delete(synchronize_session=False)
    db.query(Document).filter(Document.subject_id == subject_id).delete(synchronize_session=False)
    db.query(Topic).filter(Topic.subject_id == subject_id).delete(synchronize_session=False)
    db.query(Subject).filter(Subject.id == subject_id).delete(synchronize_session=False)
    return document_ids


def delete_user_records(db: Session, user: User) -> None:
    """Delete student work; retain faculty courses/material by unassigning ownership."""
    user_id = user.id
    session_ids = [s[0] for s in db.query(LearningSession.id).filter(LearningSession.student_id == user_id).all()]
    if session_ids:
        db.query(Interaction).filter(Interaction.session_id.in_(session_ids)).delete(synchronize_session=False)
    assessment_ids = [a[0] for a in db.query(Assessment.id).filter(Assessment.student_id == user_id).all()]
    if assessment_ids:
        db.query(AssessmentReview).filter(AssessmentReview.assessment_id.in_(assessment_ids)).delete(synchronize_session=False)
    db.query(Assessment).filter(Assessment.student_id == user_id).delete(synchronize_session=False)
    db.query(LearningState).filter(LearningState.student_id == user_id).delete(synchronize_session=False)
    db.query(Intervention).filter(Intervention.student_id == user_id).delete(synchronize_session=False)
    db.query(GeneratedQuestion).filter(GeneratedQuestion.student_id == user_id).delete(synchronize_session=False)
    db.query(LearningSession).filter(LearningSession.student_id == user_id).delete(synchronize_session=False)
    db.query(Intervention).filter(Intervention.faculty_id == user_id).update({Intervention.faculty_id: None}, synchronize_session=False)
    db.query(Document).filter(Document.uploaded_by == user_id).update({Document.uploaded_by: None}, synchronize_session=False)
    db.query(Subject).filter(Subject.faculty_id == user_id).update({Subject.faculty_id: None}, synchronize_session=False)
    db.query(User).filter(User.id == user_id).delete(synchronize_session=False)
