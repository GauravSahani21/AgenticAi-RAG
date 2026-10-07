import uuid
from typing import List, Dict, Any

def split_text_into_chunks(
    text: str,
    chunk_size: int = 600,
    chunk_overlap: int = 100
) -> List[str]:
    """Splits a single block of text into overlapping windows by character/word boundaries."""
    if not text:
        return []
    
    if len(text) <= chunk_size:
        return [text]

    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        
        # Try to find a space or newline near the boundary to avoid cutting words
        if end < len(text):
            boundary = text.rfind(' ', start, end)
            if boundary != -1 and boundary > start + (chunk_size // 2):
                end = boundary

        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)

        # Slide window
        start = end - chunk_overlap
        if start >= len(text) or end >= len(text):
            break

    return chunks

def chunk_document_pages(
    pages: List[Dict[str, Any]],
    doc_id: str,
    chunk_size: int = 600,
    chunk_overlap: int = 100
) -> List[Dict[str, Any]]:
    """Takes extracted pages and produces structured chunks with source metadata."""
    all_chunks = []
    chunk_counter = 0

    for page in pages:
        page_num = page.get("page_number", 1)
        section = page.get("section", f"Page {page_num}")
        text = page.get("text", "")

        raw_chunks = split_text_into_chunks(text, chunk_size=chunk_size, chunk_overlap=chunk_overlap)
        for rc in raw_chunks:
            chunk_counter += 1
            chunk_id = f"{doc_id}_chunk_{chunk_counter}"
            all_chunks.append({
                "chunk_id": chunk_id,
                "content": rc,
                "page_number": page_num,
                "section": section,
                "chunk_index": chunk_counter
            })

    return all_chunks
