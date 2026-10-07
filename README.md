# AdaptiveLearn AI

> **Agentic RAG-Based Adaptive Learning and Faculty Intervention Platform**

AdaptiveLearn AI is a full-stack, institution-specific academic AI platform designed to transform university education. It replaces static conversational chatbots with a pedagogical decision-making loop grounded strictly in faculty-approved academic materials.

---

## Key Highlights

- **Faculty-Approved RAG Grounding**: The AI tutor only teaches from documents uploaded and approved by faculty (PDF/TXT), with direct citations and zero ungrounded guessing.
- **Agentic Tutoring Decision Loop**: Instead of answering directly, the tutor evaluates student state, applies pedagogical actions (Socratic questions, scaffolded hints, analogies, deeper concepts), and displays strategy badges explaining its intent.
- **Transparent Mastery Scoring**: Mastery is computed from explicit factors: $0.5 \times \text{Assessment} + 0.3 \times \text{Chat Confidence} + 0.2 \times \text{Consistency}$, highlighting detected misconceptions.
- **Early Faculty Intervention**: Automatically flags struggling students with data-grounded rationale alerts, giving instructors a live dashboard to track at-risk learners and record intervention outcomes.
- **Role-Based Access Control**: Tailored portals for Students (tutoring, assessments, mastery tracking), Faculty (course management, analytics, intervention queues), and Admins.

---

## Technology Stack

- **Backend**: Python 3.9+ / FastAPI, SQLAlchemy 2.0, PostgreSQL / SQLite
- **Vector Database**: ChromaDB with local semantic embeddings
- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite, Lucide Icons
- **DevOps & Containers**: Docker, Docker Compose, Nginx (reverse proxy)
- **Testing**: Pytest (43 backend tests), TypeScript compiler checks

---

## Quick Start (Docker)

```bash
docker-compose up --build
```

- **Frontend**: `http://localhost:5173`
- **Backend API & Swagger Docs**: `http://localhost:8000/docs`

---

## Quick Start (Local Development)

### Backend
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## Demo Credentials

| Role | Email | Password |
| :--- | :--- | :--- |
| **Faculty** | `faculty@adaptivelearn.edu` | `Password123!` |
| **Student** | `student@adaptivelearn.edu` | `Password123!` |
| **Admin** | `admin@adaptivelearn.edu` | `Password123!` |

---

## Documentation

- [Setup & Deployment Guide](SETUP.md)
- [REST API Reference](API.md)
- [System Architecture](ARCHITECTURE.md)
- [Phase 1 to 7 Documentation](docs/)
