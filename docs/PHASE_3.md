# Phase 3: OpenRouter AI Tutor & Grounded Dialogue System

## 1. Objectives Completed
- Integrated AI Tutor with OpenRouter API and local grounded pedagogical fallback synthesis.
- Implemented ChromaDB RAG retrieval grounding with strict source thresholding (`GROUNDING_THRESHOLD = 0.06`).
- Created database persistence for interactive multi-turn learning sessions (`learning_sessions`) and message turns (`interactions`).
- Implemented source citation extraction: document title, page/slide number, section header, text snippet, and cosine similarity metric.
- Built interactive student UI (`TutorChat.tsx`) with topic selection, grounding status badges, collapsible source drawer, and quick prompt chips.
- Integrated seamless AI Tutor study launcher into `StudentDashboard.tsx`.

---

## 2. Architecture & Data Flow

```
[ Student Prompt / Question ]
             │
             ▼
   [ POST /api/tutor/chat ]
             │
             ├──> [ ChromaDB Vector Search ]
             │         │
             │         └── Top-K chunks with document & page metadata
             │
             ├──> [ Grounding Evaluator ]
             │         │
             │         ├── max_score >= threshold: "Grounded in course material"
             │         └── max_score < threshold:  "General explanation / insufficient course material"
             │
             ├──> [ OpenRouter LLM / Local Grounded Fallback ]
             │         │
             │         └── Synthesizes answer citing approved academic material
             │
             ├──> [ Session & Interaction Persistence ]
             │         │
             │         └── Stores query, response, grounded flag, sources JSON in SQLite/Postgres
             │
             ▼
   [ JSON Response ]
   - session_id
   - response text
   - grounded (true/false)
   - grounding_status badge
   - sources: [{ document, page, section, snippet, similarity_score }]
```

---

## 3. Endpoints Implemented

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/tutor/chat` | Student | Submits question, executes RAG retrieval, invokes LLM/synthesizer, returns grounded answer with sources. |
| `GET` | `/api/tutor/sessions` | Student | Lists historical learning sessions for the authenticated student. |
| `GET` | `/api/tutor/sessions/{session_id}` | Student | Retrieves full conversation interaction history and source citations for a session. |

---

## 4. Grounding & Fallback Logic
- **Grounding Rule**: Every query searches ChromaDB for the selected subject/topic. If retrieved chunk similarity exceeds `GROUNDING_THRESHOLD`, the response is labeled **"Grounded in course material"** and citations are attached.
- **Insufficient Material Rule**: If no relevant material exists, the tutor explicitly outputs:
  `"Note: The provided academic materials do not contain sufficient information on this specific question."`
  and labels the response **"General explanation / insufficient course material"**.
- **Offline / Resilient Execution**: When `OPENROUTER_API_KEY` is not present or the endpoint is unreachable, the backend utilizes `build_grounded_fallback()` to synthesize responses directly from academic chunks.
