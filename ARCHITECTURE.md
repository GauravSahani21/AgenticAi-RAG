# AdaptiveLearn AI — System Architecture Reference

AdaptiveLearn AI is an enterprise-grade academic platform built around an **Agentic RAG Tutoring Core** and an **Early Faculty Intervention Pipeline**.

---

## 1. Architectural Overview Diagram

```
+---------------------------------------------------------------------------------+
|                                 USER CLIENTS                                    |
|      Student Portal (React + Vite)        Faculty Dashboard (React + Vite)     |
+---------------------------------------------------------------------------------+
                                       |
                                       v (Reverse Proxy / HTTPS)
+---------------------------------------------------------------------------------+
|                             FASTAPI APPLICATION CORE                            |
|                                                                                 |
|  +--------------------+  +--------------------+  +----------------------------+ |
|  | Role-Based Auth    |  | Document Ingestion |  | Early Intervention Engine  | |
|  | JWT / RBAC Guards  |  | PDF/TXT Text Chunk |  | Rule-based risk triggers   | |
|  +--------------------+  +--------------------+  +----------------------------+ |
|            |                       |                            |               |
|            v                       v                            v               |
|  +------------------------------------------------------------------------+     |
|  |                   AGENTIC TUTORING DECISION LOOP                       |     |
|  |   1. Student State Analysis (Mastery, History, Misconceptions)         |     |
|  |   2. RAG Retrieval from Faculty-Approved Documents                     |     |
|  |   3. Pedagogical Policy Selection (Socratic, Scaffold, Analogy)        |     |
|  |   4. Dynamic Response Synthesis Grounded in Academic Chunks            |     |
|  |   5. Transparent State Transition & Mastery Score Update               |     |
|  +------------------------------------------------------------------------+     |
+---------------------------------------------------------------------------------+
             |                                             |
             v                                             v
+-------------------------------+             +-----------------------------------+
|      PRIMARY DATA STORE       |             |        SEMANTIC VECTOR STORE      |
| PostgreSQL / SQLite (SQLAlchemy) |             | ChromaDB Persistent Collection    |
| - Users, Roles, Curricula     |             | - Semantic Document Chunks        |
| - Learning States & Scores    |             | - Topic and Material Metadata     |
| - Assessment Responses        |             | - Custom Fast Semantic Embeddings |
| - Intervention Records        |             +-----------------------------------+
+-------------------------------+
```

---

## 2. Core Subsystems

### 2.1 Academic Content & RAG Pipeline (`app/ai/rag_service.py`)
- **Ingestion**: Faculty upload course materials (`.pdf`, `.txt`) mapped directly to curriculum topics.
- **Preprocessing & Cleaning**: Strips encoding anomalies, normalizes whitespace, and extracts section headings.
- **Semantic Chunking**: Chunks text into bounded semantic windows with 10% overlap to preserve context across boundaries.
- **Vector Indexing**: Embedded using `AdaptiveSemanticEmbeddingFunction` with ChromaDB persistence. Grounding guarantees all tutor answers refer back to approved course material.

### 2.2 Agentic Tutoring Decision Loop (`app/ai/agent_loop.py`)
Unlike static conversational chatbots, AdaptiveLearn AI uses a multi-stage pedagogical loop for every interaction:
1. **Context Loading**: Queries current mastery score, active misconceptions, and recent conversation turns.
2. **Pedagogical Action Selection**:
   - `ask_guiding_question`: Chosen when the student has low-to-medium mastery and needs gentle Socratic prompting.
   - `provide_scaffolding`: Selected when repeated errors or misconceptions are detected to break down complex topics.
   - `provide_analogy`: Used when intuitive conceptual clarification is required.
   - `explore_deeper_concept`: Triggered when the student demonstrates mastery (>80%) to stretch learning.
3. **Response Synthesis**: Synthesizes the response strictly grounded in retrieved RAG chunks, appending a visible **Strategy Badge** to explain pedagogical reasoning.

### 2.3 Transparent Mastery Engine (`app/ai/assessment.py`)
Mastery is calculated using a transparent multi-factor formula rather than a black-box percentage:
$$\text{Mastery} = 0.5 \times \text{Assessment Score} + 0.3 \times \text{Chat Confidence} + 0.2 \times \text{Consistency}$$
- **Levels**: Novice ($<50\%$), Developing ($50-69\%$), Proficient ($70-84\%$), Advanced ($\ge 85\%$).
- Detects conceptual misconceptions using keyword and semantic divergence analysis.

### 2.4 Early Intervention Engine (`app/ai/intervention.py`)
Monitors student learning trajectories in background tasks or real-time evaluations:
- **Triggers**:
  - Consecutive low assessment scores ($\le 50\%$) on core topics.
  - Persistent unaddressed misconceptions.
  - Long periods of inactivity or severe score drops.
- **Workflow**:
  - Automatically flags student with severity (`low`, `medium`, `critical`) and actionable rationale.
  - Faculty dashboard surfaces the student in the At-Risk queue with 1-click status transitions (`triggered` $\rightarrow$ `in_progress` $\rightarrow$ `resolved`).

---

## 3. Database Schema Overview

- `users`: User profiles with roles (`student`, `faculty`, `admin`) and hashed passwords.
- `subjects`: Academic courses/subjects with faculty ownership.
- `topics`: Sequential curriculum modules under subjects.
- `documents`: Uploaded course documents with file references and chunk metadata.
- `document_chunks`: Processed text segments indexed in vector search.
- `tutoring_sessions`: Student interaction sessions tied to topics.
- `tutoring_messages`: Individual interaction turns storing student inputs, tutor outputs, and pedagogical metadata.
- `learning_states`: Dynamic topic-level learning states tracking mastery score, misconceptions, and history.
- `assessments`: Generated assessments containing multiple question formats.
- `assessment_submissions`: Graded student submissions and evaluation notes.
- `interventions`: Faculty alerts, risk metrics, severity flags, and resolution notes.
