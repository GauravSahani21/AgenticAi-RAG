import pytest
from app.models.subject import Subject
from app.models.topic import Topic
from app.ai.assessment import (
    calculate_updated_mastery,
    generate_assessment_question,
    evaluate_student_answer
)

def test_transparent_mastery_calculation_success_condition():
    """
    Direct verification of Phase 5 specification:
    Student at 60% mastery with 3 attempts answering questions correctly
    progresses to 74% mastery, 5 attempts, status IMPROVING.
    """
    # Start: 60% mastery, 3 attempts (2 correct, 1 incorrect)
    mastery = 60.0
    attempts = 3
    correct = 2
    incorrect = 1
    conf = 0.5

    # 1. Answer medium difficulty question correctly
    mastery1, conf1, status1 = calculate_updated_mastery(
        current_mastery=mastery,
        current_attempts=attempts,
        current_correct=correct,
        current_incorrect=incorrect,
        is_correct=True,
        difficulty="INTERMEDIATE",
        confidence=conf
    )
    assert mastery1 > 60.0
    attempts += 1
    correct += 1

    # 2. Answer another question correctly
    mastery2, conf2, status2 = calculate_updated_mastery(
        current_mastery=mastery1,
        current_attempts=attempts,
        current_correct=correct,
        current_incorrect=incorrect,
        is_correct=True,
        difficulty="INTERMEDIATE",
        confidence=conf1
    )
    attempts += 1
    correct += 1

    # Verify target progression
    assert attempts == 5
    assert correct == 4
    assert incorrect == 1
    assert 72.0 <= mastery2 <= 80.0
    assert status2 == "IMPROVING"

def test_mastery_calculation_struggling_condition():
    """Verify repeated incorrect answers result in STRUGGLING or INTERVENTION_REQUIRED."""
    mastery = 45.0
    attempts = 3
    correct = 1
    incorrect = 2

    mastery_next, conf_next, status = calculate_updated_mastery(
        current_mastery=mastery,
        current_attempts=attempts,
        current_correct=correct,
        current_incorrect=incorrect,
        is_correct=False,
        difficulty="INTERMEDIATE"
    )
    assert mastery_next < 45.0
    assert status in ["STRUGGLING", "INTERVENTION_REQUIRED"]

def test_question_generation_multiple_types():
    """Verifies that questions can be generated across multiple pedagogical formats, not just MCQ."""
    q_types = ["CONCEPTUAL", "SHORT_ANSWER", "MCQ", "APPLICATION", "SCENARIO"]
    for qt in q_types:
        q = generate_assessment_question(
            topic_name="Vector Embeddings",
            difficulty="INTERMEDIATE",
            question_type=qt
        )
        assert q["question_type"] == qt
        assert "Vector Embeddings" in q["question_text"]
        if qt == "MCQ":
            assert q["options"] is not None
            assert len(q["options"]) == 4

def test_evaluate_student_answer_detects_misconception():
    """Verify answer evaluator isolates specific conceptual misconceptions."""
    res = evaluate_student_answer(
        question_text="Describe embedding geometry",
        question_type="CONCEPTUAL",
        student_answer="Similar words point in completely opposite directions with negative cosine similarity.",
        topic_name="Embeddings"
    )
    assert res["is_correct"] is False
    assert res["identified_misconception"] is not None
    assert "opposite" in res["identified_misconception"].lower()

def test_assessment_api_endpoints(client, student_token, faculty_token, db_session, faculty_user):
    """End-to-end test of assessment question generation and submission updating learning state."""
    sub = Subject(name="Generative AI", code="CS-GENAI-ASSESS", faculty_id=faculty_user.id)
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

    # 1. Fetch initial state
    state_res = client.get(
        f"/api/assessment/state/{topic.id}",
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert state_res.status_code == 200
    init_state = state_res.json()
    assert init_state["attempts"] == 0
    assert init_state["mastery_score"] == 0.0

    # 2. Generate question
    gen_res = client.post(
        "/api/assessment/generate",
        headers={"Authorization": f"Bearer {student_token}"},
        json={"topic_id": topic.id, "question_type": "MCQ"}
    )
    assert gen_res.status_code == 200
    q_data = gen_res.json()
    assert q_data["question_type"] == "MCQ"

    # 3. Submit correct answer
    sub_res = client.post(
        "/api/assessment/submit",
        headers={"Authorization": f"Bearer {student_token}"},
        json={
            "topic_id": topic.id,
            "question_text": q_data["question_text"],
            "question_type": "MCQ",
            "difficulty": "INTERMEDIATE",
            "student_answer": "B) Vectors of similar concepts form small angular distances (high cosine similarity)"
        }
    )
    assert sub_res.status_code == 200
    result = sub_res.json()
    assert result["is_correct"] is True
    assert result["updated_mastery"] > 0.0
    assert result["attempts"] == 1
    assert result["correct_answers"] == 1

    # 4. Fetch updated state
    updated_state_res = client.get(
        f"/api/assessment/state/{topic.id}",
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert updated_state_res.status_code == 200
    updated_state = updated_state_res.json()
    assert updated_state["attempts"] == 1
    assert updated_state["mastery_score"] == result["updated_mastery"]
