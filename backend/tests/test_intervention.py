import json
import pytest
from app.models.user import User, UserRole
from app.models.subject import Subject
from app.models.topic import Topic
from app.models.learning_state import LearningState
from app.models.intervention import Intervention
from app.ai.intervention import evaluate_and_generate_interventions

def test_intervention_detection_rule_success_condition(db_session, student_user, faculty_user):
    """
    Direct verification of Phase 6 specification:
    Student attempting a topic with mastery < 50% and attempts >= 3
    is flagged for intervention with an exact stored-data rationale.
    """
    sub = Subject(name="Generative AI", code="CS-GENAI-INTV", faculty_id=faculty_user.id)
    db_session.add(sub)
    db_session.commit()
    db_session.refresh(sub)

    topic = Topic(
        subject_id=sub.id,
        module="Module 3",
        name="Vector Databases & HNSW Indexing",
        difficulty="ADVANCED"
    )
    db_session.add(topic)
    db_session.commit()
    db_session.refresh(topic)

    # 1. Seed struggling learning state
    state = LearningState(
        student_id=student_user.id,
        topic_id=topic.id,
        mastery_score=38.0,
        confidence_score=0.35,
        attempts=4,
        correct_answers=1,
        incorrect_answers=3,
        misconceptions=json.dumps(["Confusing exact linear search with approximate nearest neighbor graph traversal."]),
        difficulty_level="ADVANCED",
        status="STRUGGLING"
    )
    db_session.add(state)
    db_session.commit()

    # 2. Run Intervention Engine
    interventions = evaluate_and_generate_interventions(db_session, faculty_id=faculty_user.id)
    assert len(interventions) >= 1

    flagged = db_session.query(Intervention).filter(
        Intervention.student_id == student_user.id,
        Intervention.topic_id == topic.id
    ).first()
    assert flagged is not None
    assert flagged.status == "PENDING"
    # Concrete data explanation check
    assert "Vector Databases & HNSW Indexing" in flagged.reason
    assert "4 times" in flagged.reason
    assert "38.0%" in flagged.reason
    assert len(flagged.recommended_action) > 10

def test_faculty_analytics_endpoints(client, faculty_token, student_user, faculty_user, db_session):
    """Verify class overview, topic analytics, and student analytics endpoints."""
    # 1. Overview
    res = client.get("/api/faculty/analytics/overview", headers={"Authorization": f"Bearer {faculty_token}"})
    assert res.status_code == 200
    ov = res.json()
    assert "total_students" in ov
    assert "active_students" in ov
    assert "average_mastery" in ov
    assert "students_struggling" in ov

    # 2. Topic analytics
    t_res = client.get("/api/faculty/analytics/topics", headers={"Authorization": f"Bearer {faculty_token}"})
    assert t_res.status_code == 200
    topics = t_res.json()
    assert isinstance(topics, list)

    # 3. Student analytics
    s_res = client.get("/api/faculty/analytics/students", headers={"Authorization": f"Bearer {faculty_token}"})
    assert s_res.status_code == 200
    students = s_res.json()
    assert isinstance(students, list)

def test_faculty_can_update_intervention_status(client, faculty_token, student_user, faculty_user, db_session):
    """Verify full intervention status lifecycle updates."""
    sub = Subject(name="Generative AI", code="CS-GENAI-STAT", faculty_id=faculty_user.id)
    db_session.add(sub)
    db_session.commit()
    db_session.refresh(sub)

    topic = Topic(subject_id=sub.id, module="Module 1", name="Attention Mechanisms", difficulty="ADVANCED")
    db_session.add(topic)
    db_session.commit()
    db_session.refresh(topic)

    inv = Intervention(
        student_id=student_user.id,
        topic_id=topic.id,
        faculty_id=faculty_user.id,
        reason="Student has attempted Attention Mechanisms 5 times with 32% mastery.",
        recommended_action="Provide supplementary notes and review self-attention matrix calculation.",
        status="PENDING"
    )
    db_session.add(inv)
    db_session.commit()
    db_session.refresh(inv)

    # 1. Faculty updates status to STUDENT_CONTACTED
    patch_res = client.patch(
        f"/api/faculty/interventions/{inv.id}/status",
        headers={"Authorization": f"Bearer {faculty_token}"},
        json={
            "status": "STUDENT_CONTACTED",
            "notes": "Sent email invitation for Thursday office hours."
        }
    )
    assert patch_res.status_code == 200
    data = patch_res.json()
    assert data["status"] == "STUDENT_CONTACTED"
    assert data["notes"] == "Sent email invitation for Thursday office hours."

    # 2. Update to RESOLVED
    res2 = client.patch(
        f"/api/faculty/interventions/{inv.id}/status",
        headers={"Authorization": f"Bearer {faculty_token}"},
        json={"status": "RESOLVED", "notes": "Completed 1-on-1 review; student re-tested successfully."}
    )
    assert res2.status_code == 200
    assert res2.json()["status"] == "RESOLVED"
