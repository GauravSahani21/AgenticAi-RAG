import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.user import User
from app.models.topic import Topic
from app.models.learning_state import LearningState
from app.models.assessment import Assessment
from app.schemas.assessment import (
    LearningStateResponse,
    QuestionGenerateRequest,
    GeneratedQuestionResponse,
    AssessmentSubmitRequest,
    AssessmentSubmitResponse
)
from app.auth.dependencies import require_student
from app.ai.assessment import (
    generate_assessment_question,
    evaluate_student_answer,
    calculate_updated_mastery
)
from app.rag.vector_store import vector_store

router = APIRouter(prefix="/api/assessment", tags=["Assessment & Learning State"])

@router.get("/state/{topic_id}", response_model=LearningStateResponse)
def get_topic_learning_state(
    topic_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student)
):
    topic = db.query(Topic).filter(Topic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    state = db.query(LearningState).filter(
        LearningState.student_id == current_user.id,
        LearningState.topic_id == topic_id
    ).first()

    if not state:
        # Create initial state
        state = LearningState(
            student_id=current_user.id,
            topic_id=topic_id,
            mastery_score=0.0,
            confidence_score=0.5,
            attempts=0,
            correct_answers=0,
            incorrect_answers=0,
            misconceptions="[]",
            difficulty_level=topic.difficulty,
            status="NOT_STARTED"
        )
        db.add(state)
        db.commit()
        db.refresh(state)

    misconceptions_list = []
    try:
        misconceptions_list = json.loads(state.misconceptions)
    except Exception:
        pass

    return LearningStateResponse(
        id=state.id,
        student_id=state.student_id,
        topic_id=state.topic_id,
        topic_name=topic.name,
        subject_id=topic.subject_id,
        mastery_score=state.mastery_score,
        confidence_score=state.confidence_score,
        attempts=state.attempts,
        correct_answers=state.correct_answers,
        incorrect_answers=state.incorrect_answers,
        misconceptions=misconceptions_list,
        difficulty_level=state.difficulty_level,
        status=state.status,
        updated_at=state.updated_at
    )

@router.get("/states", response_model=List[LearningStateResponse])
def get_all_learning_states(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student)
):
    states = db.query(LearningState).filter(LearningState.student_id == current_user.id).all()
    results = []
    for s in states:
        misc = []
        try:
            misc = json.loads(s.misconceptions)
        except Exception:
            pass
        results.append(LearningStateResponse(
            id=s.id,
            student_id=s.student_id,
            topic_id=s.topic_id,
            topic_name=s.topic.name if s.topic else "Unknown Topic",
            subject_id=s.topic.subject_id if s.topic else None,
            mastery_score=s.mastery_score,
            confidence_score=s.confidence_score,
            attempts=s.attempts,
            correct_answers=s.correct_answers,
            incorrect_answers=s.incorrect_answers,
            misconceptions=misc,
            difficulty_level=s.difficulty_level,
            status=s.status,
            updated_at=s.updated_at
        ))
    return results

@router.post("/generate", response_model=GeneratedQuestionResponse)
def generate_question_endpoint(
    request: QuestionGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student)
):
    topic = db.query(Topic).filter(Topic.id == request.topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    difficulty = request.difficulty or topic.difficulty or "INTERMEDIATE"
    rag_chunks = vector_store.search(query=topic.name, topic_id=topic.id, top_k=2)

    q_data = generate_assessment_question(
        topic_name=topic.name,
        difficulty=difficulty,
        question_type=request.question_type,
        rag_chunks=rag_chunks
    )

    return GeneratedQuestionResponse(
        question_id=q_data["question_id"],
        topic_id=topic.id,
        topic_name=topic.name,
        question_text=q_data["question_text"],
        question_type=q_data["question_type"],
        difficulty=q_data["difficulty"],
        options=q_data.get("options"),
        hint=q_data.get("hint")
    )

@router.post("/submit", response_model=AssessmentSubmitResponse)
def submit_assessment_endpoint(
    request: AssessmentSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student)
):
    topic = db.query(Topic).filter(Topic.id == request.topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    # 1. Fetch or create learning state
    state = db.query(LearningState).filter(
        LearningState.student_id == current_user.id,
        LearningState.topic_id == topic.id
    ).first()

    if not state:
        state = LearningState(
            student_id=current_user.id,
            topic_id=topic.id,
            mastery_score=0.0,
            confidence_score=0.5,
            attempts=0,
            correct_answers=0,
            incorrect_answers=0,
            misconceptions="[]",
            difficulty_level=request.difficulty,
            status="NOT_STARTED"
        )
        db.add(state)
        db.commit()
        db.refresh(state)

    previous_mastery = state.mastery_score

    # 2. Evaluate answer
    eval_result = evaluate_student_answer(
        question_text=request.question_text,
        question_type=request.question_type,
        student_answer=request.student_answer,
        topic_name=topic.name
    )

    is_correct = eval_result["is_correct"]
    score = eval_result["score"]
    feedback = eval_result["feedback"]
    misconception = eval_result.get("identified_misconception")

    # 3. Calculate updated mastery & status
    new_mastery, new_conf, new_status = calculate_updated_mastery(
        current_mastery=state.mastery_score,
        current_attempts=state.attempts,
        current_correct=state.correct_answers,
        current_incorrect=state.incorrect_answers,
        is_correct=is_correct,
        difficulty=request.difficulty,
        confidence=state.confidence_score
    )

    # 4. Update state
    state.attempts += 1
    if is_correct:
        state.correct_answers += 1
    else:
        state.incorrect_answers += 1

    state.mastery_score = new_mastery
    state.confidence_score = new_conf
    state.status = new_status
    state.difficulty_level = request.difficulty

    # Append misconception if detected
    if misconception:
        try:
            curr_misc = json.loads(state.misconceptions)
        except Exception:
            curr_misc = []
        if misconception not in curr_misc:
            curr_misc.append(misconception)
            state.misconceptions = json.dumps(curr_misc)

    # 5. Record Assessment
    assessment = Assessment(
        student_id=current_user.id,
        topic_id=topic.id,
        session_id=request.session_id,
        question_text=request.question_text,
        question_type=request.question_type,
        difficulty=request.difficulty,
        student_answer=request.student_answer,
        is_correct=is_correct,
        score=score,
        feedback=feedback,
        identified_misconception=misconception
    )
    db.add(assessment)
    db.commit()
    db.refresh(assessment)

    return AssessmentSubmitResponse(
        assessment_id=assessment.id,
        is_correct=is_correct,
        score=score,
        feedback=feedback,
        identified_misconception=misconception,
        previous_mastery=previous_mastery,
        updated_mastery=new_mastery,
        status=new_status,
        attempts=state.attempts,
        correct_answers=state.correct_answers,
        incorrect_answers=state.incorrect_answers
    )
