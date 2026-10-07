# AdaptiveLearn AI — Complete REST API Documentation

Base URL: `http://localhost:8000/api`  
Interactive OpenAPI/Swagger documentation: `http://localhost:8000/docs`

---

## 1. Authentication Endpoints (`/auth`)

### `POST /auth/register`
Register a new student account.
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "full_name": "Jane Doe",
    "role": "student"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "full_name": "Jane Doe",
      "role": "student"
    }
  }
  ```

### `POST /auth/login`
Authenticate existing user and retrieve JWT access token.
- **Request Body**:
  ```json
  {
    "email": "faculty@university.edu",
    "password": "faculty123"
  }
  ```
- **Response**: `200 OK` (token + user object)

### `GET /auth/me`
Retrieve profile of currently authenticated user.
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `200 OK` (user object)

---

## 2. Subjects & Curriculum (`/subjects`, `/topics`)

### `GET /subjects`
List all academic subjects.
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `200 OK` (List of subjects including `id`, `code`, `title`, `description`, `faculty_id`)

### `POST /subjects`
Create a new academic subject (*Faculty or Admin role required*).
- **Request Body**:
  ```json
  {
    "code": "CS-101",
    "title": "Intro to Computer Science",
    "description": "Foundational programming and algorithmic thinking."
  }
  ```

### `GET /subjects/{subject_id}/topics`
List all topics ordered sequentially for a given subject.
- **Response**: `200 OK` (List of topics with `order_index`, `title`, `description`)

### `POST /subjects/{subject_id}/topics`
Create a new topic within a subject (*Faculty or Admin role required*).
- **Request Body**:
  ```json
  {
    "title": "Transformer Attention Mechanisms",
    "description": "Detailed study of Multi-Head Self-Attention",
    "order_index": 1
  }
  ```

---

## 3. Academic Documents & RAG (`/documents`, `/rag`)

### `POST /documents/upload`
Upload and ingest academic course materials (*Faculty or Admin role required*).
- **Form Data**:
  - `file`: PDF or TXT document file
  - `topic_id`: Target topic UUID
- **Processing**: Automatically runs text cleaning, recursive semantic chunking, and vectors ingestion into ChromaDB with metadata tags.

### `GET /documents`
List all uploaded curriculum documents.

### `POST /rag/query`
Direct semantic search against topic-approved course materials.
- **Request Body**:
  ```json
  {
    "query": "What is the query-key-value mechanism?",
    "topic_id": "optional-uuid",
    "n_results": 3
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "results": [
      {
        "content": "Scaled dot-product attention computes...",
        "source": "transformers_core.txt",
        "topic_id": "...",
        "score": 0.89
      }
    ]
  }
  ```

---

## 4. Agentic AI Tutoring (`/tutor`)

### `POST /tutor/chat`
Execute an agentic tutoring turn using the pedagogical decision loop.
- **Headers**: `Authorization: Bearer <token>` (Student role)
- **Request Body**:
  ```json
  {
    "topic_id": "uuid-of-topic",
    "message": "I don't understand how self-attention avoids recurrence.",
    "session_id": "optional-session-uuid"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "response": "In recurrent architectures like RNNs, words are processed sequentially...",
    "session_id": "session-uuid",
    "action": "provide_analogy",
    "strategy_badge": "Analogical Explanation",
    "pedagogical_reasoning": "Student expressed conceptual barrier regarding parallelization vs recurrence.",
    "learning_state": {
      "mastery_score": 52.0,
      "misconceptions": ["Assumes sequential processing required for syntax"]
    },
    "rag_sources": ["transformers_core.txt"]
  }
  ```

### `GET /tutor/sessions`
List student's past tutoring sessions.

### `GET /tutor/sessions/{session_id}/messages`
Retrieve message history and pedagogical metadata for a tutoring session.

---

## 5. Topic Assessments (`/assessment`)

### `POST /assessment/generate`
Generate 3–5 grounded assessment questions for a topic.
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "topic_id": "uuid-of-topic",
    "count": 3
  }
  ```
- **Response**: Returns mixed question types: `mcq`, `code_analysis`, `short_answer`, `conceptual_explanation`.

### `POST /assessment/submit`
Submit answers for instant grading, misconception extraction, and mastery re-calculation.
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "topic_id": "uuid-of-topic",
    "submissions": [
      {
        "question_id": "q1",
        "student_answer": "Multi-head attention allows attending to information at different representation subspaces simultaneously."
      }
    ]
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "total_score": 85.0,
    "evaluations": [...],
    "new_mastery_score": 82.5,
    "mastery_level": "proficient",
    "score_breakdown": {
      "assessment_component": 42.5,
      "chat_component": 25.0,
      "consistency_component": 15.0
    }
  }
  ```

### `GET /assessment/learning-state/{topic_id}`
Get the student's transparent learning state and mastery breakdown for a topic.

---

## 6. Faculty Analytics & Intervention (`/faculty`)

*All endpoints in this section strictly require `faculty` or `admin` role.*

### `GET /faculty/overview`
Aggregated high-level statistics for faculty dashboards.
- **Response**: `200 OK`
  ```json
  {
    "total_students": 24,
    "active_interventions": 3,
    "at_risk_students": 4,
    "average_mastery": 68.4
  }
  ```

### `GET /faculty/topic-breakdown/{subject_id}`
Topic-by-topic class averages, completion counts, and struggling student ratios.

### `GET /faculty/at-risk`
List students triggered as at-risk with data-grounded rationale.

### `GET /faculty/interventions`
List all intervention records with filtering by status (`triggered`, `in_progress`, `resolved`).

### `PATCH /faculty/interventions/{intervention_id}`
Update intervention lifecycle status and faculty intervention notes.
- **Request Body**:
  ```json
  {
    "status": "resolved",
    "faculty_notes": "Conducted 1-on-1 office hour review on attention matrix calculations."
  }
  ```
