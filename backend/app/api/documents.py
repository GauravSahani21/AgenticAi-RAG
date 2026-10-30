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
    clean_topic_id = topic_id.strip() if topic_id and isinstance(topic_id, str) else None
    if clean_topic_id and clean_topic_id.lower() in ("null", "undefined", "none", ""):
        clean_topic_id = None

    if clean_topic_id:
        topic = db.query(Topic).filter(Topic.id == clean_topic_id).first()
        if not topic:
            raise HTTPException(status_code=404, detail=f"Topic '{clean_topic_id}' not found")
        # Ensure subject alignment for newly added topics
        if topic.subject_id != subject_id:
            topic.subject_id = subject_id
            db.commit()
            db.refresh(topic)
        module_name = topic.module or "General"

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
        topic_id=clean_topic_id,
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
            topic_id=clean_topic_id,
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

from fastapi.responses import FileResponse, Response

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

@router.get("/{document_id}", response_model=DocumentResponse)
def get_document_details(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc

@router.get("/{document_id}/content")
def get_document_content(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns readable academic text and passage excerpts for student study and review.
    Extracts text from local document storage or reconstructs from indexed vector chunks.
    """
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    text_content = ""
    file_path = os.path.join(settings.DOCUMENTS_DIRECTORY, doc.subject_id, doc.filename)

    # 1. Try reading directly from physical file
    if os.path.exists(file_path):
        try:
            with open(file_path, "rb") as f:
                raw_bytes = f.read()
            extracted_pages = extract_document_text(doc.filename, raw_bytes)
            if extracted_pages:
                text_content = "\n\n".join(
                    [f"=== Page {p['page_number']} ({p.get('section', 'General')}) ===\n{p['text']}" for p in extracted_pages]
                )
        except Exception:
            pass

    # 2. If not on disk or binary extraction yielded empty, retrieve from ChromaDB
    if not text_content:
        try:
            col = vector_store._get_collection()
            results = col.get(where={"doc_id": doc.id})
            if results and results.get("documents"):
                sections = []
                for idx, doc_chunk in enumerate(results["documents"]):
                    meta = results["metadatas"][idx] if results.get("metadatas") else {}
                    page = meta.get("page_number", idx + 1)
                    sec = meta.get("section", f"Section {idx + 1}")
                    sections.append(f"=== Section: {sec} (Page {page}) ===\n{doc_chunk}")
                text_content = "\n\n".join(sections)
        except Exception as e:
            pass

    if not text_content:
        text_content = (
            f"Curriculum Material: {doc.filename}\n"
            f"Subject: {doc.subject.name if doc.subject else 'General'}\n"
            f"Topic: {doc.topic.name if doc.topic else 'Unassigned'}\n\n"
            "This document is indexed in the knowledge base and available for Interactive AI Tutor queries."
        )

    return {
        "id": doc.id,
        "filename": doc.filename,
        "file_type": doc.file_type,
        "file_size": doc.file_size,
        "subject_id": doc.subject_id,
        "subject_name": doc.subject.name if doc.subject else None,
        "topic_id": doc.topic_id,
        "topic_name": doc.topic.name if doc.topic else None,
        "uploader_name": doc.uploader.name if doc.uploader else "Faculty Instructor",
        "chunk_count": doc.chunk_count,
        "uploaded_at": doc.uploaded_at,
        "content": text_content
    }

@router.get("/{document_id}/download")
def download_document(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Downloads the original course material file or synthesized text for offline student study.
    """
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    file_path = os.path.join(settings.DOCUMENTS_DIRECTORY, doc.subject_id, doc.filename)
    if os.path.exists(file_path):
        return FileResponse(
            path=file_path,
            filename=doc.filename,
            media_type="application/octet-stream"
        )

    # If physical file does not exist (e.g. seeded sample chunks), stream text content
    col = vector_store._get_collection()
    results = col.get(where={"doc_id": doc.id})
    content = ""
    if results and results.get("documents"):
        content = "\n\n".join(results["documents"])
    else:
        content = f"Academic Document: {doc.filename}\nSubject: CS-GENAI"

    download_name = doc.filename if doc.filename.endswith((".txt", ".pdf")) else f"{doc.filename}.txt"
    return Response(
        content=content,
        media_type="text/plain; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{download_name}"'}
    )

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
