def test_register_student_success(client):
    response = client.post(
        "/api/auth/register",
        json={
            "name": "David Student",
            "email": "david@test.edu",
            "password": "Password123!",
            "role": "STUDENT",
            "department": "AI Engineering"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "david@test.edu"
    assert data["user"]["role"] == "STUDENT"

def test_register_duplicate_email_fails(client, student_user):
    response = client.post(
        "/api/auth/register",
        json={
            "name": "Copycat",
            "email": student_user.email,
            "password": "Password123!",
            "role": "STUDENT"
        }
    )
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"].lower()

def test_login_success(client, student_user):
    response = client.post(
        "/api/auth/login",
        json={
            "email": student_user.email,
            "password": "Secret123!"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == student_user.email

def test_login_invalid_password_fails(client, student_user):
    response = client.post(
        "/api/auth/login",
        json={
            "email": student_user.email,
            "password": "WrongPassword999!"
        }
    )
    assert response.status_code == 401
    assert "invalid email or password" in response.json()["detail"].lower()

def test_login_unknown_email_fails(client):
    response = client.post(
        "/api/auth/login",
        json={
            "email": "doesnotexist@test.edu",
            "password": "SomePassword!"
        }
    )
    assert response.status_code == 401

def test_get_me_authenticated(client, student_user, student_token):
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == student_user.id
    assert data["email"] == student_user.email

def test_get_me_unauthenticated_fails(client):
    response = client.get("/api/auth/me")
    assert response.status_code == 401
