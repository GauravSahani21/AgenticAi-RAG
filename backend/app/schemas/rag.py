from typing import List, Optional
from pydantic import BaseModel, Field

class RAGSearchRequest(BaseModel):
    query: str = Field(..., min_length=2, description="Search query or question")
    subject_id: Optional[str] = None
    topic_id: Optional[str] = None
    top_k: int = Field(default=4, ge=1, le=20)

class RAGSearchResult(BaseModel):
    content: str
    document_name: str
    page_number: int
    section: str
    similarity_score: float

class RAGSearchResponse(BaseModel):
    query: str
    results: List[RAGSearchResult]
