import json
from typing import List, Optional, Literal
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.user import User
from app.models.topic import Topic
from app.models.learning_state import LearningState
from app.models.assessment import Assessment
from app.models.generated_question import GeneratedQuestion
from app.models.assessment_review import AssessmentReview
from app.models.subject import Subject
from app.schemas.assessment import (
    LearningStateResponse,
    QuestionGenerateRequest,
    GeneratedQuestionResponse,
    AssessmentSubmitRequest,
    AssessmentSubmitResponse, AssessmentHistoryItem, AssessmentHistoryPage
)
from app.auth.dependencies import require_student, require_roles
from app.models.user import UserRole
from app.ai.assessment import calculate_updated_mastery
from app.ai.question_generation import generate_grounded_question, grade_grounded_answer
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
async def generate_question_endpoint(
    request: QuestionGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student),
):
    topic = db.query(Topic).filter(Topic.id == request.topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    difficulty = (request.difficulty or topic.difficulty or "INTERMEDIATE").upper()
    requested_type = (request.question_type or "CONCEPTUAL").upper()
    # First restrict to the requested topic; then include only the same subject
    # if faculty uploaded documents at subject level rather than topic level.
    chunks = vector_store.search(
        query=f"{topic.name} {topic.description or ''}",
        subject_id=topic.subject_id, topic_id=topic.id, top_k=6,
    )
    if not chunks:
        chunks = vector_store.search(
            query=f"{topic.name} {topic.description or ''}",
            subject_id=topic.subject_id, top_k=6,
        )
    chunks = [c for c in chunks if c.get("similarity_score", 0) >= 0.06 and c.get("content", "").strip()]
    if not chunks:
        raise HTTPException(status_code=422, detail="No relevant approved course materials found. Ask faculty to upload study material for this topic.")
    recent = [q.question_text for q in db.query(GeneratedQuestion).filter(
        GeneratedQuestion.student_id == current_user.id,
        GeneratedQuestion.topic_id == topic.id,
    ).order_by(GeneratedQuestion.created_at.desc()).limit(12).all()]
    try:
        data = await generate_grounded_question(topic.name, difficulty, requested_type, chunks, recent)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    generated = GeneratedQuestion(
        student_id=current_user.id, topic_id=topic.id,
        question_text=data["question_text"], question_type=data["question_type"],
        difficulty=data["difficulty"],
        options_json=json.dumps(data.get("options")) if data.get("options") else None,
        correct_option=data.get("correct_option"),
        reference_answer=data["reference_answer"], source_quote=data["source_quote"],
        hint=data.get("hint"),
    )
    db.add(generated)
    db.commit()
    db.refresh(generated)
    return GeneratedQuestionResponse(
        question_id=generated.id, topic_id=topic.id, topic_name=topic.name,
        question_text=generated.question_text, question_type=generated.question_type,
        difficulty=generated.difficulty, options=data.get("options"), hint=generated.hint,
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

    # Never trust question text, answer keys or difficulty supplied by a browser.
    if not request.question_id:
        raise HTTPException(status_code=400, detail="Question ID required. Generate a new question before submitting.")
    question = db.query(GeneratedQuestion).filter(
        GeneratedQuestion.id == request.question_id,
        GeneratedQuestion.student_id == current_user.id,
        GeneratedQuestion.topic_id == topic.id,
    ).first()
    if question is None:
        raise HTTPException(status_code=404, detail="Generated question not found for this student/topic")
    if question.answered_at is not None:
        raise HTTPException(status_code=409, detail="Question already submitted; generate a new one")

    # 1. Fetch or create learning state
    state = db.query(LearningState).filter(
        LearningState.student_id == current_user.id,
        LearningState.topic_id == topic.id
    ).first()

    diff_val = question.difficulty
    q_type = question.question_type
    q_text = question.question_text

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
            difficulty_level=diff_val,
            status="NOT_STARTED"
        )
        db.add(state)
        db.commit()
        db.refresh(state)

    previous_mastery = state.mastery_score

    # 2. Evaluate answer
    try:
        eval_result = grade_grounded_answer(
            student_answer=request.student_answer,
            reference_answer=question.reference_answer,
            question_type=q_type, correct_option=question.correct_option,
            question_text=question.question_text, source_quote=question.source_quote,
            options=_parse_options(question.options_json),
        )
    except ValueError as exc:
        # Uncertain grading must never decrement mastery or consume an attempt.
        raise HTTPException(status_code=503, detail=str(exc)) from exc

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
        difficulty=diff_val,
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
    state.difficulty_level = diff_val

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
        question_text=q_text,
        question_type=q_type,
        difficulty=diff_val,
        student_answer=request.student_answer,
        is_correct=is_correct,
        score=score,
        feedback=feedback,
        identified_misconception=misconception
    )
    db.add(assessment)
    db.flush()  # Ensure the attempt has an ID before saving its review key.
    db.add(AssessmentReview(
        assessment_id=assessment.id,
        generated_question_id=question.id,
        options_json=question.options_json,
        correct_option=question.correct_option,
        reference_answer=question.reference_answer,
        source_quote=question.source_quote,
        hint=question.hint,
    ))
    question.answered_at = datetime.now(timezone.utc)
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


def _find_review_key(db: Session, assessment: Assessment) -> Optional[AssessmentReview | GeneratedQuestion]:
    """Use immutable snapshots, or a uniquely matching legacy generated question.

    Never guess a key when older questions were generated more than once with
    different options/answers. Such attempts still display their stored result.
    """
    saved = db.query(AssessmentReview).filter(AssessmentReview.assessment_id == assessment.id).first()
    if saved is not None:
        return saved
    matches = db.query(GeneratedQuestion).filter(
        GeneratedQuestion.student_id == assessment.student_id,
        GeneratedQuestion.topic_id == assessment.topic_id,
        GeneratedQuestion.question_text == assessment.question_text,
    ).limit(2).all()
    return matches[0] if len(matches) == 1 and matches[0].answered_at is not None else None


def _parse_options(options_json: Optional[str]) -> Optional[List[str]]:
    if not options_json:
        return None
    try:
        data = json.loads(options_json)
        return data if isinstance(data, list) and all(isinstance(v, str) for v in data) else None
    except (ValueError, TypeError):
        return None


@router.get("/history", response_model=AssessmentHistoryPage)
def list_assessment_history(
    subject_id: Optional[str] = None,
    topic_id: Optional[str] = None,
    result: Literal["all", "correct", "incorrect"] = "all",
    question_type: Optional[str] = None,
    page: int = 1,
    page_size: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.STUDENT])),
):
    if page < 1 or not (1 <= page_size <= 50):
        raise HTTPException(status_code=422, detail="page must be positive and page_size between 1 and 50")
    base = db.query(Assessment).join(Topic, Assessment.topic_id == Topic.id).filter(
        Assessment.student_id == current_user.id,
    )
    if subject_id:
        base = base.filter(Topic.subject_id == subject_id)
    if topic_id:
        base = base.filter(Assessment.topic_id == topic_id)
    if question_type:
        base = base.filter(Assessment.question_type == question_type.upper())
    total = base.count()
    correct = base.filter(Assessment.is_correct.is_(True)).count()
    incorrect = total - correct
    visible = base
    if result == "correct":
        visible = visible.filter(Assessment.is_correct.is_(True))
    elif result == "incorrect":
        visible = visible.filter(Assessment.is_correct.is_(False))
    attempts = visible.order_by(Assessment.created_at.desc(), Assessment.id.desc()).offset(
        (page - 1) * page_size
    ).limit(page_size).all()
    items = []
    for a in attempts:
        key = _find_review_key(db, a)
        topic = a.topic
        items.append(AssessmentHistoryItem(
            id=a.id, topic_id=a.topic_id, topic_name=topic.name,
            subject_id=topic.subject_id, subject_name=topic.subject.name,
            question_text=a.question_text, question_type=a.question_type,
            difficulty=a.difficulty,
            options=_parse_options(key.options_json if key else a.options_json),
            student_answer=a.student_answer, is_correct=a.is_correct,
            score=a.score, feedback=a.feedback,
            identified_misconception=a.identified_misconception,
            reference_answer=key.reference_answer if key else None,
            correct_option=key.correct_option if key else None,
            source_quote=key.source_quote if key else None,
            hint=key.hint if key else None,
            retry_available=not a.is_correct and key is not None,
            created_at=a.created_at,
        ))
    return AssessmentHistoryPage(items=items, page=page, page_size=page_size,
                                 total=total, correct=correct, incorrect=incorrect)


@router.post("/history/{assessment_id}/retry", response_model=GeneratedQuestionResponse)
def retry_incorrect_question(
    assessment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.STUDENT])),
):
    """Create a new attempt using the original answer key. Never modify history."""
    a = db.query(Assessment).filter(
        Assessment.id == assessment_id, Assessment.student_id == current_user.id,
    ).first()
    if a is None:
        raise HTTPException(status_code=404, detail="Assessment not found")
    if a.is_correct:
        raise HTTPException(status_code=400, detail="Only incorrect questions can be retried")
    key = _find_review_key(db, a)
    if key is None:
        raise HTTPException(status_code=409, detail="Answer key for this older attempt is unavailable")
    q = GeneratedQuestion(
        student_id=current_user.id, topic_id=a.topic_id,
        question_text=a.question_text, question_type=a.question_type,
        difficulty=a.difficulty, options_json=key.options_json,
        correct_option=key.correct_option, reference_answer=key.reference_answer,
        source_quote=key.source_quote or "", hint=key.hint,
    )
    db.add(q)
    db.commit()
    db.refresh(q)
    return GeneratedQuestionResponse(
        question_id=q.id, topic_id=a.topic_id, topic_name=a.topic.name,
        question_text=q.question_text, question_type=q.question_type,
        difficulty=q.difficulty, options=_parse_options(q.options_json), hint=q.hint,
    )
