import io
import pytest
from app.rag.extractors import clean_text, extract_document_text
from app.rag.chunker import split_text_into_chunks, chunk_document_pages
from app.models.subject import Subject
from app.models.topic import Topic

def test_clean_text():
    raw = "  Hello \t world!\n\n\n\nNew   Paragraph \x00 "
    cleaned = clean_text(raw)
    assert cleaned == "Hello world!\n\nNew Paragraph"

def test_chunking_logic():
    text = "Sentence one. " * 50
    chunks = split_text_into_chunks(text, chunk_size=200, chunk_overlap=40)
    assert len(chunks) > 1
    for c in chunks:
        assert len(c) <= 220

    pages = [{"page_number": 1, "section": "Intro", "text": text}]
    doc_chunks = chunk_document_pages(pages, doc_id="test_doc_1", chunk_size=200, chunk_overlap=40)
    assert len(doc_chunks) > 1
    assert doc_chunks[0]["chunk_id"].startswith("test_doc_1_chunk_")
    assert doc_chunks[0]["page_number"] == 1
    assert doc_chunks[0]["section"] == "Intro"

def test_txt_extraction():
    content = b"Introduction to AI\n\nArtificial Intelligence is transforming computing."
    pages = extract_document_text("intro.txt", content)
    assert len(pages) == 1
    assert "Artificial Intelligence" in pages[0]["text"]

def test_document_upload_success(client, faculty_user, faculty_token, db_session):
    # Create test subject
    sub = Subject(name="Deep Learning", code="CS-DL-TEST", faculty_id=faculty_user.id)
    db_session.add(sub)
    db_session.commit()
    db_session.refresh(sub)

    txt_bytes = b"Embeddings are vector representations of semantic meaning in AI."
    response = client.post(
        "/api/documents/upload",
        headers={"Authorization": f"Bearer {faculty_token}"},
        data={"subject_id": sub.id},
        files={"file": ("embeddings.txt", io.BytesIO(txt_bytes), "text/plain")}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["filename"] == "embeddings.txt"
    assert data["file_type"] == "TXT"
    assert data["chunk_count"] >= 1
    assert data["subject_id"] == sub.id

def test_upload_invalid_file_format_fails(client, faculty_token, db_session, faculty_user):
    sub = Subject(name="Security", code="CS-SEC-TEST", faculty_id=faculty_user.id)
    db_session.add(sub)
    db_session.commit()

    response = client.post(
        "/api/documents/upload",
        headers={"Authorization": f"Bearer {faculty_token}"},
        data={"subject_id": sub.id},
        files={"file": ("malware.exe", io.BytesIO(b"executable bytes"), "application/octet-stream")}
    )
    assert response.status_code == 400
    assert "unsupported file format" in response.json()["detail"].lower()

def test_student_forbidden_from_upload(client, student_token, db_session):
    sub = Subject(name="Networks", code="CS-NET-TEST")
    db_session.add(sub)
    db_session.commit()

    response = client.post(
        "/api/documents/upload",
        headers={"Authorization": f"Bearer {student_token}"},
        data={"subject_id": sub.id},
        files={"file": ("notes.txt", io.BytesIO(b"some text"), "text/plain")}
    )
    assert response.status_code == 403

def test_rag_search_returns_actual_chunks(client, faculty_token, student_token, db_session, faculty_user):
    sub = Subject(name="Machine Learning", code="CS-ML-TEST", faculty_id=faculty_user.id)
    db_session.add(sub)
    db_session.commit()

    knowledge_text = (
        "Hierarchical Navigable Small World (HNSW) graphs are multi-layer graph structures "
        "designed for efficient approximate nearest neighbor search over dense vectors."
    ).encode("utf-8")

    upload_res = client.post(
        "/api/documents/upload",
        headers={"Authorization": f"Bearer {faculty_token}"},
        data={"subject_id": sub.id},
        files={"file": ("hnsw_index.txt", io.BytesIO(knowledge_text), "text/plain")}
    )
    assert upload_res.status_code == 201
    doc_id = upload_res.json()["id"]

    # Student performs RAG search
    search_res = client.post(
        "/api/rag/search",
        headers={"Authorization": f"Bearer {student_token}"},
        json={
            "query": "How do HNSW graphs work for nearest neighbor search?",
            "subject_id": sub.id,
            "top_k": 3
        }
    )
    assert search_res.status_code == 200
    res_data = search_res.json()
    assert "results" in res_data
    assert len(res_data["results"]) > 0

    first_result = res_data["results"][0]
    assert "content" in first_result
    assert "document_name" in first_result
    assert first_result["document_name"] == "hnsw_index.txt"
    assert "page_number" in first_result
    assert "similarity_score" in first_result
    assert first_result["similarity_score"] > 0.0

    # Test delete
    del_res = client.delete(
        f"/api/documents/{doc_id}",
        headers={"Authorization": f"Bearer {faculty_token}"}
    )
    assert del_res.status_code == 200
