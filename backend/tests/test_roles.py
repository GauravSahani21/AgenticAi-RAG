def test_student_can_access_student_overview(client, student_token):
    response = client.get(
        "/api/student/overview",
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "available_subjects" in data

def test_student_forbidden_from_faculty_endpoint(client, student_token):
    response = client.get(
        "/api/faculty/overview",
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert response.status_code == 403
    assert "access denied" in response.json()["detail"].lower()

def test_student_forbidden_from_admin_endpoint(client, student_token):
    response = client.get(
        "/api/admin/overview",
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert response.status_code == 403

def test_faculty_can_access_faculty_overview(client, faculty_token):
    response = client.get(
        "/api/faculty/overview",
        headers={"Authorization": f"Bearer {faculty_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "managed_subjects" in data

def test_faculty_forbidden_from_admin_endpoint(client, faculty_token):
    response = client.get(
        "/api/admin/overview",
        headers={"Authorization": f"Bearer {faculty_token}"}
    )
    assert response.status_code == 403

def test_admin_can_access_admin_overview_and_users(client, admin_token):
    res_overview = client.get(
        "/api/admin/overview",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_overview.status_code == 200
    assert res_overview.json()["system_status"] == "Healthy"

    res_users = client.get(
        "/api/admin/users",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_users.status_code == 200
    assert isinstance(res_users.json(), list)

def test_unauthenticated_forbidden_from_protected_endpoints(client):
    endpoints = [
        "/api/student/overview",
        "/api/faculty/overview",
        "/api/admin/overview",
        "/api/subjects"
    ]
    for ep in endpoints:
        res = client.get(ep)
        assert res.status_code == 401

def test_subject_creation_permission(client, student_token, faculty_token):
    # Student fails
    student_res = client.post(
        "/api/subjects",
        json={"name": "Forbidden Course", "code": "FORBID101"},
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert student_res.status_code == 403

    # Faculty succeeds
    faculty_res = client.post(
        "/api/subjects",
        json={"name": "Machine Learning", "code": "CS-ML-101"},
        headers={"Authorization": f"Bearer {faculty_token}"}
    )
    assert faculty_res.status_code == 201
    assert faculty_res.json()["code"] == "CS-ML-101"
