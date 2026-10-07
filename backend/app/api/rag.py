from fastapi import APIRouter, Depends, HTTPException
from app.models.user import User
from app.schemas.rag import RAGSearchRequest, RAGSearchResponse, RAGSearchResult
from app.auth.dependencies import get_current_user
from app.rag.vector_store import vector_store

router = APIRouter(prefix="/api/rag", tags=["RAG Retrieval"])

@router.post("/search", response_model=RAGSearchResponse)
def search_knowledge_base(
    search_req: RAGSearchRequest,
    current_user: User = Depends(get_current_user)
):
    raw_results = vector_store.search(
        query=search_req.query,
        subject_id=search_req.subject_id,
        topic_id=search_req.topic_id,
        top_k=search_req.top_k
    )

    results = [RAGSearchResult(**r) for r in raw_results]
    return RAGSearchResponse(
        query=search_req.query,
        results=results
    )
