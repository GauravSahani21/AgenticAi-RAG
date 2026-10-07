import os
import shutil
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from app.config import settings
from app.database.session import get_db
from app.models.document import Document
from app.models.subject import Subject
from app.models.topic import Topic
from app.models.user import User
from app.schemas.document import DocumentResponse
from app.auth.dependencies import get_current_user, require_faculty
from app.rag.extractors import extract_document_text
from app.rag.chunker import chunk_document_pages
from app.rag.vector_store import vector_store

router = APIRouter(prefix="/api/documents", tags=["Documents"])

ALLOWED_EXTENSIONS = {"pdf", "docx", "pptx", "txt"}
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB

@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    subject_id: str = Form(...),
    topic_id: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_faculty)
):
    # 1. Validate file extension
    ext = file.filename.split(".")[-1].lower() if file.filename and "." in file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS)).upper()}"
        )

    # 2. Validate Subject & Topic exist
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    topic = None
    module_name = "General"
    if topic_id:
        topic = db.query(Topic).filter(Topic.id == topic_id, Topic.subject_id == subject_id).first()
        if not topic:
            raise HTTPException(status_code=404, detail="Topic not found for given subject")
        module_name = topic.module

    # 3. Read and validate file content & size
    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Cannot upload empty file")
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds maximum size of 25MB")

    # 4. Save file to storage directory
    save_dir = os.path.join(settings.DOCUMENTS_DIRECTORY, subject_id)
    os.makedirs(save_dir, exist_ok=True)
    file_path = os.path.join(save_dir, file.filename)
    with open(file_path, "wb") as f:
        f.write(file_bytes)

    # 5. Extract text from file
    try:
        pages = extract_document_text(file.filename, file_bytes)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to extract text from document: {str(e)}")

    if not pages:
        raise HTTPException(status_code=422, detail="No readable text found in document")

    # 6. Create document database record
    doc_record = Document(
        subject_id=subject_id,
        topic_id=topic_id if topic_id else None,
        filename=file.filename,
        file_type=ext.upper(),
        file_size=len(file_bytes),
        uploaded_by=current_user.id
    )
    db.add(doc_record)
    db.commit()
    db.refresh(doc_record)

    # 7. Split into chunks
    chunks = chunk_document_pages(pages, doc_id=doc_record.id)

    # 8. Add to ChromaDB vector store
    try:
        vector_store.add_chunks(
            doc_id=doc_record.id,
            document_name=doc_record.filename,
            subject_id=subject_id,
            topic_id=topic_id,
            module=module_name,
            uploaded_by=current_user.name,
            chunks=chunks
        )
        doc_record.chunk_count = len(chunks)
        db.commit()
        db.refresh(doc_record)
    except Exception as e:
        # If ChromaDB insertion fails, rollback doc record
        db.delete(doc_record)
        db.commit()
        raise HTTPException(status_code=500, detail=f"Failed to index document in vector store: {str(e)}")

    return doc_record

@router.get("", response_model=List[DocumentResponse])
def get_documents(
    subject_id: Optional[str] = None,
    topic_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Document)
    if subject_id:
        query = query.filter(Document.subject_id == subject_id)
    if topic_id:
        query = query.filter(Document.topic_id == topic_id)
    return query.order_by(Document.uploaded_at.desc()).all()

@router.delete("/{document_id}")
def delete_document(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_faculty)
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Delete from ChromaDB
    vector_store.delete_document(document_id)

    # Remove physical file if present
    file_path = os.path.join(settings.DOCUMENTS_DIRECTORY, doc.subject_id, doc.filename)
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception:
            pass

    # Delete from database
    db.delete(doc)
    db.commit()
    return {"message": "Document deleted and purged from knowledge base successfully"}
