"""Focused regression checks for Nov 2026 user-requested changes.

Run from repo root: PYTHONPATH=backend pytest -q backend/tests_test_requested_changes.py
"""
import asyncio
from datetime import datetime
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session

from app.models import Base, User, UserRole, Subject, Topic, Document, LearningSession, Interaction, Assessment, LearningState, Intervention, GeneratedQuestion
from app.services.deletion import delete_subject_records, delete_user_records
from app.services.institution import normalize_email
from app.ai.question_generation import generate_grounded_question, grade_grounded_answer


def make_db():
    engine = create_engine('sqlite:///:memory:')
    @event.listens_for(engine, 'connect')
    def enable_fk(dbapi_connection, _):
        cursor = dbapi_connection.cursor()
        cursor.execute('PRAGMA foreign_keys=ON')
        cursor.close()
    Base.metadata.create_all(engine)
    return Session(engine)


def seed_graph(db):
    faculty = User(name='Faculty', email='prof@adaptivelearn.edu', password_hash='x', role=UserRole.FACULTY)
    student = User(name='Student', email='student@adaptivelearn.edu', password_hash='x', role=UserRole.STUDENT)
    db.add_all([faculty, student]); db.flush()
    sub = Subject(name='Physics', code='PHY-1', faculty_id=faculty.id)
    db.add(sub); db.flush()
    topic = Topic(subject_id=sub.id, module='One', name='Motion', difficulty='BEGINNER')
    db.add(topic); db.flush()
    doc = Document(subject_id=sub.id, topic_id=topic.id, filename='course.txt', file_type='TXT', uploaded_by=faculty.id)
    ses = LearningSession(student_id=student.id, subject_id=sub.id, topic_id=topic.id)
    db.add_all([doc, ses]); db.flush()
    db.add_all([
        Interaction(session_id=ses.id, student_message='test', ai_response='test'),
        Assessment(student_id=student.id, topic_id=topic.id, session_id=ses.id,
                   question_text='test', student_answer='answer', is_correct=True, feedback='fine'),
        LearningState(student_id=student.id, topic_id=topic.id),
        Intervention(student_id=student.id, topic_id=topic.id, faculty_id=faculty.id,
                     reason='low score', recommended_action='help'),
        GeneratedQuestion(student_id=student.id, topic_id=topic.id, question_text='test question',
                          question_type='MCQ', difficulty='BEGINNER', correct_option='C',
                          reference_answer='context', source_quote='context'),
    ])
    db.commit()
    return faculty.id, student.id, sub.id, topic.id


def test_any_email_domain_is_accepted_and_normalized():
    from pydantic import ValidationError
    from app.schemas.auth import UserRegister
    for email in ('test@gmail.com', 'Test@OUTLOOK.COM', 'student@cmrit.ac.in'):
        data = UserRegister(name='Student', email=email, password='Password123!')
        assert normalize_email(data.email) == email.lower()
    with __import__('pytest').raises(ValidationError):
        UserRegister(name='Student', email='this is not an email', password='Password123!')


def test_delete_subject_removes_all_dependencies():
    db = make_db()
    faculty_id, student_id, subject_id, topic_id = seed_graph(db)
    doc_ids = delete_subject_records(db, db.get(Subject, subject_id))
    db.commit()
    assert len(doc_ids) == 1
    for model in (Subject, Topic, Document, LearningSession, Interaction, Assessment,
                  LearningState, Intervention, GeneratedQuestion):
        assert db.query(model).count() == 0, model
    assert db.get(User, faculty_id) is not None
    assert db.get(User, student_id) is not None
    db.close()


def test_delete_student_and_faculty_keeps_course():
    db = make_db()
    faculty_id, student_id, subject_id, topic_id = seed_graph(db)
    delete_user_records(db, db.get(User, student_id))
    db.commit()
    assert db.get(User, student_id) is None
    assert db.query(Assessment).count() == 0
    assert db.query(GeneratedQuestion).count() == 0
    assert db.get(Subject, subject_id) is not None
    delete_user_records(db, db.get(User, faculty_id))
    db.commit()
    assert db.get(Subject, subject_id).faculty_id is None
    assert db.query(Document).first().uploaded_by is None
    db.close()


def test_material_grounded_questions_and_one_time_mcq_grading():
    chunks = [{'content': (
        'Embeddings are numerical vector representations of semantic meaning in high-dimensional spaces. '
        'Semantic similarity is calculated using cosine similarity to measure the angle between vectors. '
        'Vector databases index these vectors with hierarchical graph structures.'
    ), 'document_name': 'Lecture', 'page_number': 3}]
    q = asyncio.run(generate_grounded_question('Embeddings', 'INTERMEDIATE', 'MCQ', chunks, []))
    assert q['question_type'] == 'MCQ'
    assert len(q['options']) == 4
    assert q['source_quote'] in chunks[0]['content']
    assert q['correct_option'] in 'ABCD'
    correct_grade = grade_grounded_answer(q['correct_option'], q['reference_answer'], 'MCQ', q['correct_option'])
    wrong = next(c for c in 'ABCD' if c != q['correct_option'])
    wrong_grade = grade_grounded_answer(wrong, q['reference_answer'], 'MCQ', q['correct_option'])
    assert correct_grade['is_correct'] and not wrong_grade['is_correct']
    other = asyncio.run(generate_grounded_question('Embeddings', 'INTERMEDIATE', 'MCQ', chunks, [q['question_text']]))
    assert other['question_text'] != q['question_text']


def test_student_registration_allows_gmail_but_rejects_admin_role():
    __import__('pytest').importorskip('bcrypt')
    __import__('pytest').importorskip('jose')
    from fastapi import HTTPException
    from app.schemas.auth import UserRegister
    from app.api.auth import register
    db = make_db()
    student = register(UserRegister(name='Jane Doe', email='Jane@gmail.com', password='Password123!'), db=db)
    assert student.user.email == 'jane@gmail.com'
    assert student.user.role == UserRole.STUDENT
    with __import__('pytest').raises(HTTPException) as error:
        register(UserRegister(name='Malicious user', email='malicious@gmail.com', password='Password123!', role=UserRole.ADMIN), db=db)
    assert error.value.status_code == 403
    db.close()
