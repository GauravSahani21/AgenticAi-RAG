from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.user import User
from app.models.subject import Subject
from app.models.topic import Topic
from app.models.session import LearningSession
from app.models.interaction import Interaction
from app.schemas.tutor import (
    TutorChatRequest,
    TutorChatResponse,
    TutorSource,
    SessionDetailResponse,
    InteractionResponse
)
from app.auth.dependencies import get_current_user, require_student
from app.rag.vector_store import vector_store
from app.ai.agent_loop import run_agentic_tutor_loop

router = APIRouter(prefix="/api/tutor", tags=["AI Tutor"])

@router.post("/chat", response_model=TutorChatResponse)
async def tutor_chat(
    request: TutorChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student)
):
    # 1. Resolve and verify course/topic scope before retrieval or session creation.
    subject_id = request.subject_id
    topic = None
    if request.topic_id:
        topic = db.query(Topic).filter(Topic.id == request.topic_id).first()
        if not topic:
            raise HTTPException(status_code=404, detail="Topic not found")
        if subject_id and subject_id != topic.subject_id:
            raise HTTPException(
                status_code=400, detail="Selected topic does not belong to the subject"
            )
        subject_id = topic.subject_id

    if not subject_id:
        raise HTTPException(status_code=400, detail="Select a subject before chatting")
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    # 2. Never silently re-use a session from a different course/topic.
    session = None
    if request.session_id:
        session = db.query(LearningSession).filter(
            LearningSession.id == request.session_id,
            LearningSession.student_id == current_user.id,
        ).first()
        if not session:
            raise HTTPException(status_code=404, detail="Learning session not found")
        if session.subject_id != subject_id or session.topic_id != request.topic_id:
            raise HTTPException(
                status_code=400,
                detail="This conversation belongs to another subject or topic. Start a new chat.",
            )

    if not session:
        session = LearningSession(
            student_id=current_user.id,
            subject_id=subject_id,
            topic_id=request.topic_id,
        )
        db.add(session)
        db.commit()
        db.refresh(session)

    # 3. Read recent interactions first to resolve conversational follow-ups.
    past_interactions = db.query(Interaction).filter(
        Interaction.session_id == session.id
    ).order_by(Interaction.created_at.asc()).all()
    chat_history = []
    for pi in past_interactions[-6:]:
        chat_history.append({"role": "user", "content": pi.student_message})
        chat_history.append({
            "role": "assistant", "content": pi.ai_response,
            "action": pi.agent_action,
        })

    # RAG retrieval is scoped by subject AND optionally topic. It never searches
    # unrelated courses if retrieval within this scope has no matches.
    retrieval_query = request.message
    short_followups = (
        "more", "explain again", "another example", "give an example",
        "can you explain that", "elaborate", "tell me more", "why",
    )
    if request.message.strip().lower().rstrip("?!. ") in short_followups:
        for previous in reversed(past_interactions):
            if previous.student_message.strip():
                retrieval_query = f"{previous.student_message} {request.message}"
                break
    rag_chunks = vector_store.search(
        query=retrieval_query,
        subject_id=subject_id,
        topic_id=request.topic_id,
        top_k=5,
    )

    # 5. Generate Agentic Tutor Response
    ai_result = await run_agentic_tutor_loop(
        message=request.message,
        subject_name=subject.name,
        topic_name=topic.name if topic else None,
        rag_chunks=rag_chunks,
        chat_history=chat_history,
        proficiency_hint=request.student_proficiency,
        retrieval_query=retrieval_query,
    )

    # 6. Save Interaction to Database
    interaction = Interaction(
        session_id=session.id,
        student_message=request.message,
        ai_response=ai_result["response"],
        agent_action=ai_result["action"],
        strategy_label=ai_result["strategy_label"],
        grounded=ai_result["grounded"]
    )
    db.add(interaction)
    db.commit()
    db.refresh(interaction)

    sources = [TutorSource(**s) for s in ai_result["sources"]]

    return TutorChatResponse(
        response=ai_result["response"],
        action=ai_result["action"],
        strategy_label=ai_result["strategy_label"],
        grounded=ai_result["grounded"],
        grounding_status=ai_result["grounding_status"],
        sources=sources,
        session_id=session.id,
        subject_id=subject_id,
        topic_id=request.topic_id,
        created_at=interaction.created_at
    )


@router.get("/sessions", response_model=List[SessionDetailResponse])
def get_student_sessions(
    subject_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student)
):
    query = db.query(LearningSession).filter(LearningSession.student_id == current_user.id)
    if subject_id:
        query = query.filter(LearningSession.subject_id == subject_id)
    return query.order_by(LearningSession.started_at.desc()).limit(10).all()

@router.get("/sessions/{session_id}", response_model=SessionDetailResponse)
def get_session_history(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student)
):
    session = db.query(LearningSession).filter(
        LearningSession.id == session_id,
        LearningSession.student_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session
