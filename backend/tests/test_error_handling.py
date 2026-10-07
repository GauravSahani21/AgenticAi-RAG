import pytest

def test_missing_auth_header_returns_401(client):
    res = client.get("/api/auth/me")
    assert res.status_code == 401
    assert "detail" in res.json()

def test_invalid_token_returns_401(client):
    res = client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer invalid.jwt.token"}
    )
    assert res.status_code == 401

def test_student_forbidden_from_faculty_endpoints(client, student_token):
    res = client.get(
        "/api/faculty/analytics/overview",
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert res.status_code == 403

def test_invalid_uuid_subject_returns_404(client, student_token):
    res = client.post(
        "/api/tutor/chat",
        headers={"Authorization": f"Bearer {student_token}"},
        json={"subject_id": "non-existent-subject-id-12345", "message": "hello"}
    )
    assert res.status_code == 404

def test_empty_message_chat_returns_validation_error(client, student_token):
    res = client.post(
        "/api/tutor/chat",
        headers={"Authorization": f"Bearer {student_token}"},
        json={"subject_id": "some-id", "message": ""}
    )
    assert res.status_code == 422

def test_malformed_intervention_status_returns_400(client, faculty_token):
    res = client.patch(
        "/api/faculty/interventions/dummy-id/status",
        headers={"Authorization": f"Bearer {faculty_token}"},
        json={"status": "INVALID_STATUS_VALUE"}
    )
    assert res.status_code == 400

def test_nonexistent_assessment_topic_returns_404(client, student_token):
    res = client.post(
        "/api/assessment/generate",
        headers={"Authorization": f"Bearer {student_token}"},
        json={"topic_id": "nonexistent-topic-999"}
    )
    assert res.status_code == 404
