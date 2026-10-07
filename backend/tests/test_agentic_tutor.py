import io
import pytest
from app.models.subject import Subject
from app.models.topic import Topic

def setup_embeddings_course(client, faculty_token, db_session, faculty_user):
    sub = Subject(name="Generative AI", code="CS-GENAI-AGENT", faculty_id=faculty_user.id)
    db_session.add(sub)
    db_session.commit()
    db_session.refresh(sub)

    topic = Topic(
        subject_id=sub.id,
        module="Module 2",
        name="Vector Embeddings",
        difficulty="INTERMEDIATE"
    )
    db_session.add(topic)
    db_session.commit()
    db_session.refresh(topic)

    content = (
        "Word embeddings map vocabulary words to dense vectors of real numbers. "
        "Cosine similarity measures the angle between vectors, reflecting conceptual closeness. "
        "High-dimensional representations allow machines to calculate semantic distance."
    ).encode("utf-8")

    upload_res = client.post(
        "/api/documents/upload",
        headers={"Authorization": f"Bearer {faculty_token}"},
        data={"subject_id": sub.id, "topic_id": topic.id},
        files={"file": ("embeddings_reference.txt", io.BytesIO(content), "text/plain")}
    )
    assert upload_res.status_code == 201
    return sub, topic

def test_student_high_mastery_receives_deeper_concept_action(client, student_token, faculty_token, db_session, faculty_user):
    sub, topic = setup_embeddings_course(client, faculty_token, db_session, faculty_user)

    # Student A: High proficiency / Advanced query
    res = client.post(
        "/api/tutor/chat",
        headers={"Authorization": f"Bearer {student_token}"},
        json={
            "subject_id": sub.id,
            "topic_id": topic.id,
            "message": "How does vector dimension affect computational complexity and what are the architectural tradeoffs?",
            "student_proficiency": "HIGH"
        }
    )
    assert res.status_code == 200
    data = res.json()
    assert data["action"] in ["DEEPER_CONCEPT", "PRACTICE", "QUIZ"]
    assert "strategy_label" in data
    assert len(data["strategy_label"]) > 0
    assert "Teaching Strategy:" not in data["response"]  # Metacognitive tag should be in structured field, not leaked in text

def test_student_struggling_receives_supportive_scaffolding(client, student_token, faculty_token, db_session, faculty_user):
    sub, topic = setup_embeddings_course(client, faculty_token, db_session, faculty_user)

    # Student B: Low proficiency / Struggling query
    res = client.post(
        "/api/tutor/chat",
        headers={"Authorization": f"Bearer {student_token}"},
        json={
            "subject_id": sub.id,
            "topic_id": topic.id,
            "message": "I don't understand embeddings at all, it's way too complex and confusing.",
            "student_proficiency": "LOW"
        }
    )
    assert res.status_code == 200
    data = res.json()
    assert data["action"] in ["SIMPLIFY", "PREREQUISITE", "HINT", "EXAMPLE", "ASK_QUESTION"]
    assert data["action"] != "DEEPER_CONCEPT"
    assert "strategy_label" in data

def test_socratic_guiding_question_behavior(client, student_token, faculty_token, db_session, faculty_user):
    sub, topic = setup_embeddings_course(client, faculty_token, db_session, faculty_user)

    # Student asking question with partial understanding
    res = client.post(
        "/api/tutor/chat",
        headers={"Authorization": f"Bearer {student_token}"},
        json={
            "subject_id": sub.id,
            "topic_id": topic.id,
            "message": "Why do we need embeddings instead of simple database tables?",
            "student_proficiency": "MEDIUM"
        }
    )
    assert res.status_code == 200
    data = res.json()
    assert data["action"] in ["ASK_QUESTION", "EXAMPLE", "SIMPLIFY"]
    assert "strategy_label" in data
