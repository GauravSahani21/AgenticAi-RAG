import io
import pytest
from app.models.subject import Subject
from app.models.topic import Topic

def test_tutor_chat_grounded_response(client, student_token, faculty_token, db_session, faculty_user):
    # 1. Setup course & topic
    sub = Subject(name="Generative AI", code="CS-GENAI-TUTOR", faculty_id=faculty_user.id)
    db_session.add(sub)
    db_session.commit()
    db_session.refresh(sub)

    topic = Topic(
        subject_id=sub.id,
        module="Module 2",
        name="Embeddings",
        difficulty="INTERMEDIATE"
    )
    db_session.add(topic)
    db_session.commit()
    db_session.refresh(topic)

    # 2. Upload course material about embeddings
    content = (
        "Embeddings are dense numerical vector representations of semantic meaning. "
        "They capture contextual similarities between words, tokens, or documents in high-dimensional vector spaces. "
        "Cosine similarity is used to measure the angle between vectors."
    ).encode("utf-8")

    upload_res = client.post(
        "/api/documents/upload",
        headers={"Authorization": f"Bearer {faculty_token}"},
        data={"subject_id": sub.id, "topic_id": topic.id},
        files={"file": ("embeddings_guide.txt", io.BytesIO(content), "text/plain")}
    )
    assert upload_res.status_code == 201

    # 3. Student asks AI Tutor about embeddings
    chat_res = client.post(
        "/api/tutor/chat",
        headers={"Authorization": f"Bearer {student_token}"},
        json={
            "subject_id": sub.id,
            "topic_id": topic.id,
            "message": "What is an embedding and how does it represent semantic meaning?"
        }
    )
    assert chat_res.status_code == 200
    data = chat_res.json()
    assert "response" in data
    assert len(data["response"]) > 20
    assert data["grounded"] is True
    assert "Grounded in course material" in data["grounding_status"]
    assert len(data["sources"]) > 0
    assert data["sources"][0]["document"] == "embeddings_guide.txt"
    assert "session_id" in data

    # 4. Verify session history
    session_id = data["session_id"]
    hist_res = client.get(
        f"/api/tutor/sessions/{session_id}",
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert hist_res.status_code == 200
    hist_data = hist_res.json()
    assert len(hist_data["interactions"]) == 1
    assert "What is an embedding" in hist_data["interactions"][0]["student_message"]

def test_tutor_chat_ungrounded_when_no_course_material(client, student_token, db_session):
    sub = Subject(name="Astrophysics", code="PHYS-ASTRO")
    db_session.add(sub)
    db_session.commit()
    db_session.refresh(sub)

    # Query without uploading any materials for this subject
    chat_res = client.post(
        "/api/tutor/chat",
        headers={"Authorization": f"Bearer {student_token}"},
        json={
            "subject_id": sub.id,
            "message": "What is the boiling point of liquid nitrogen at standard pressure?"
        }
    )
    assert chat_res.status_code == 200
    data = chat_res.json()
    assert data["grounded"] is False
    assert "insufficient course material" in data["grounding_status"].lower()
    assert len(data["sources"]) == 0
    assert "does not contain" in data["response"].lower() or "insufficient" in data["response"].lower()

def test_unauthenticated_cannot_chat_with_tutor(client):
    res = client.post(
        "/api/tutor/chat",
        json={"subject_id": "none", "message": "hello"}
    )
    assert res.status_code == 401
