from typing import List, Optional
import shutil
from pathlib import Path
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.subject import Subject
from app.models.user import User
from app.schemas.subject import SubjectCreate, SubjectResponse
from app.auth.dependencies import get_current_user, require_faculty
from app.models.user import UserRole
from app.config import settings
from app.services.deletion import delete_subject_records
from app.rag.vector_store import vector_store

router = APIRouter(prefix="/api/subjects", tags=["Subjects"])

@router.get("", response_model=List[SubjectResponse])
def get_subjects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Subject).all()

@router.get("/{subject_id}", response_model=SubjectResponse)
def get_subject(
    subject_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    return subject

@router.post("", response_model=SubjectResponse, status_code=status.HTTP_201_CREATED)
def create_subject(
    subject_in: SubjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_faculty)
):
    existing = db.query(Subject).filter(Subject.code == subject_in.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Subject code already exists")
    
    subject = Subject(
        name=subject_in.name,
        code=subject_in.code,
        faculty_id=(subject_in.faculty_id if current_user.role == UserRole.ADMIN and subject_in.faculty_id else current_user.id)
    )
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return subject


@router.delete("/{subject_id}", status_code=status.HTTP_200_OK)
def delete_subject(
    subject_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_faculty),
):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if subject is None:
        raise HTTPException(status_code=404, detail="Subject not found")
    if current_user.role != UserRole.ADMIN and subject.faculty_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete subjects assigned to you")
    try:
        document_ids = delete_subject_records(db, subject)
        db.commit()
    except Exception:
        db.rollback()
        raise
    for document_id in document_ids:
        vector_store.delete_document(document_id)
    # Every uploaded file is under the dedicated subject UUID directory.
    directory = Path(settings.DOCUMENTS_DIRECTORY) / subject_id
    if directory.exists():
        try:
            shutil.rmtree(directory)
        except OSError:
            logging.getLogger(__name__).exception("Could not remove uploaded files for deleted subject %s", subject_id)
    return {"message": "Subject and associated learning records deleted", "documents_removed": len(document_ids)}
