import logging
from typing import List, Dict, Any, Optional
import httpx
from app.config import settings

logger = logging.getLogger(__name__)

GROUNDING_THRESHOLD = 0.06

async def call_openrouter(messages: List[Dict[str, str]]) -> Optional[str]:
    """Sends a chat completion request to the OpenRouter API."""
    if not settings.OPENROUTER_API_KEY:
        logger.info("OPENROUTER_API_KEY not configured. Using grounded local synthesizer.")
        return None

    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "HTTP-Referer": "https://adaptivelearn.edu",
        "X-Title": settings.PROJECT_NAME,
        "Content-Type": "application/json",
    }

    payload = {
        "model": settings.OPENROUTER_MODEL,
        "messages": messages,
        "temperature": 0.3,
        "max_tokens": 1000,
    }

    url = f"{settings.OPENROUTER_BASE_URL.rstrip('/')}/chat/completions"

    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                return data["choices"][0]["message"]["content"]
            else:
                logger.warning(f"OpenRouter API returned error {resp.status_code}: {resp.text}")
                return None
    except Exception as e:
        logger.error(f"Failed to communicate with OpenRouter API: {e}")
        return None

def build_grounded_fallback(
    message: str,
    subject_name: str,
    topic_name: Optional[str],
    rag_chunks: List[Dict[str, Any]],
    is_grounded: bool
) -> str:
    """Provides a high-quality pedagogical response from retrieved academic chunks when LLM API is unreachable."""
    if is_grounded and rag_chunks:
        top_chunk = rag_chunks[0]
        doc_name = top_chunk["document_name"]
        page_num = top_chunk["page_number"]
        content_snippet = top_chunk["content"].strip()

        response = (
            f"Based on your approved course materials for **{subject_name}** "
            f"(*{doc_name}*, Page {page_num}):\n\n"
            f"{content_snippet}\n\n"
            f"### Key Conceptual Takeaway:\n"
            f"- This concept is grounded in your syllabus for {topic_name or 'the course'}.\n"
            f"- You can review the complete discussion in **{doc_name}**, Section: *{top_chunk.get('section', 'General')}*."
        )
        return response
    else:
        return (
            f"**Note:** The provided academic course material for *{subject_name}* does not contain sufficient information on this specific question.\n\n"
            f"**General Conceptual Overview:**\n"
            f"Your question asks about: *\"{message}\"*. "
            f"While this concept relates to {subject_name}, detailed reference material has not yet been uploaded by your faculty for this query. "
            f"Please check with your instructor or refer to the primary course syllabus for approved materials."
        )

async def generate_response(
    message: str,
    subject_name: str,
    topic_name: Optional[str],
    rag_chunks: List[Dict[str, Any]],
    chat_history: Optional[List[Dict[str, str]]] = None
) -> Dict[str, Any]:
    """
    Core AI Tutor Service:
    1. Checks RAG retrieval relevance against grounding threshold.
    2. Constructs prompt with retrieved academic context.
    3. Calls OpenRouter LLM.
    4. Formats response and returns source metadata citations.
    """
    # 1. Determine grounding status
    max_score = max([c["similarity_score"] for c in rag_chunks]) if rag_chunks else 0.0
    is_grounded = max_score >= GROUNDING_THRESHOLD and len(rag_chunks) > 0

    grounding_status = "Grounded in course material" if is_grounded else "General explanation / insufficient course material"

    # 2. Build Context String
    context_str = ""
    if rag_chunks:
        context_parts = []
        for idx, chunk in enumerate(rag_chunks[:4]):
            context_parts.append(
                f"[Source {idx+1}: {chunk['document_name']} (Page {chunk['page_number']}, Section: {chunk['section']})]\n"
                f"{chunk['content']}"
            )
        context_str = "\n\n".join(context_parts)

    # 3. Construct System Prompt
    system_prompt = (
        "You are AdaptiveLearn AI, an expert, encouraging institutional academic tutor.\n"
        f"You are tutoring a university student in the course: '{subject_name}'"
        + (f", Topic: '{topic_name}'." if topic_name else ".") + "\n\n"
        "STRICT GROUNDING INSTRUCTIONS:\n"
        "1. Whenever relevant ACADEMIC CONTEXT is provided, base your answer directly on that material. "
        "Explicitly mention the source document and page number in your explanation.\n"
        "2. If the ACADEMIC CONTEXT does NOT contain sufficient information or is empty, DO NOT claim it came from course materials. "
        "Start your response with: 'Note: The provided academic materials do not contain sufficient information on this specific question. Here is a general conceptual explanation:'\n"
        "3. Provide structured, engaging, and clear explanations with bullet points and examples."
    )

    messages = [{"role": "system", "content": system_prompt}]

    # Add historical turns if present
    if chat_history:
        for turn in chat_history[-6:]:
            messages.append(turn)

    # Current Turn
    user_content = f"Student Question: {message}\n\n"
    if context_str:
        user_content += f"ACADEMIC CONTEXT (Retrieved from course material):\n{context_str}\n\n"
    else:
        user_content += "ACADEMIC CONTEXT: No matching course materials found in knowledge base.\n\n"
    user_content += "Please explain this clearly to the student following the grounding instructions."

    messages.append({"role": "user", "content": user_content})

    # 4. Invoke OpenRouter LLM
    llm_output = await call_openrouter(messages)

    if not llm_output:
        llm_output = build_grounded_fallback(
            message=message,
            subject_name=subject_name,
            topic_name=topic_name,
            rag_chunks=rag_chunks,
            is_grounded=is_grounded
        )

    # 5. Format Sources
    sources = []
    if is_grounded:
        for c in rag_chunks[:4]:
            sources.append({
                "document": c["document_name"],
                "page": c["page_number"],
                "section": c["section"],
                "snippet": c["content"][:200] + ("..." if len(c["content"]) > 200 else ""),
                "similarity_score": c["similarity_score"]
            })

    return {
        "response": llm_output,
        "grounded": is_grounded,
        "grounding_status": grounding_status,
        "sources": sources
    }
