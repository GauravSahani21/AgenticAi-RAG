import os
import tempfile

# Must be set before `app` is imported so settings pick it up.
os.environ["CHROMA_PERSIST_DIRECTORY"] = tempfile.mkdtemp(prefix="adaptivelearn_test_chroma_")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.models import Base, User, UserRole, Subject, Topic, Document
from app.database.session import get_db
from app.main import app
from app.auth.security import get_password_hash, create_access_token

TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture
def student_user(db_session):
    user = User(
        name="Alice Student",
        email="alice@test.edu",
        password_hash=get_password_hash("Secret123!"),
        role=UserRole.STUDENT,
        department="Computer Science"
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def faculty_user(db_session):
    user = User(
        name="Dr. Bob Professor",
        email="bob@test.edu",
        password_hash=get_password_hash("Secret123!"),
        role=UserRole.FACULTY,
        department="Data Science"
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def admin_user(db_session):
    user = User(
        name="Charlie Admin",
        email="charlie@test.edu",
        password_hash=get_password_hash("Secret123!"),
        role=UserRole.ADMIN,
        department="Central IT"
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def student_token(student_user):
    return create_access_token(data={"sub": student_user.id, "role": student_user.role.value})

@pytest.fixture
def faculty_token(faculty_user):
    return create_access_token(data={"sub": faculty_user.id, "role": faculty_user.role.value})

@pytest.fixture
def admin_token(admin_user):
    return create_access_token(data={"sub": admin_user.id, "role": admin_user.role.value})
