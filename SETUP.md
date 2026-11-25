# AdaptiveLearn AI — Setup & Deployment Guide

This guide provides complete instructions for setting up, running, testing, and deploying **AdaptiveLearn AI** both locally and via Docker Compose.

---

## 1. System Requirements

- **Operating System**: macOS, Linux, or Windows (WSL2 recommended)
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **Python**: v3.9, 3.10, or 3.11
- **Docker & Docker Compose**: (Optional for containerized mode)
- **PostgreSQL**: (Optional for production; SQLite fallback is built-in for zero-setup local dev)

---

## 2. Environment Variables Configuration

Copy the example environment configuration into both root and backend environments:

```bash
cp .env.example .env
cp .env.example backend/.env
```

### Key Configuration Variables:

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL or SQLite connection string | `sqlite:///./adaptivelearn_dev.db` or `postgresql://postgres:postgrespassword@localhost:5432/adaptivelearn` |
| `JWT_SECRET` | Secret key for signing JSON Web Tokens | `adaptivelearn-dev-secret-super-secure-key-2026` |
| `JWT_ALGORITHM` | Encryption algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Session validity duration | `60` |
| `CHROMA_PERSIST_DIRECTORY` | ChromaDB vector store directory | `./chroma_data` |
| `OPENROUTER_API_KEY` | (Optional) OpenRouter API key for live LLM | `sk-or-v1-...` (leave empty for deterministic mock mode) |
| `OPENROUTER_MODEL` | Primary LLM model | Set to a model available in your OpenRouter account |
| `SEED_DEMO_DATA` | Seed sample accounts only on an initially empty development database | `true` (disable outside local testing) |

---

## 3. Quick Start (Local Development)

### Step 3.1: Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

3. Install required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

4. For a **new local SQLite database**, skip migrations and start the backend: the app creates its tables automatically. For an existing **Alembic-managed** database, first back it up and then run:
   ```bash
   alembic upgrade head
   ```

5. (Optional) Run automated database seeders:
   *Note: Sample curriculum content is seeded only on FIRST startup with an empty database when `SEED_DEMO_DATA=true` and `ENVIRONMENT=development`. Deleted subjects and users do not reappear after restart.*
   ```bash
   python -m app.seed
   ```

6. Start the FastAPI development server:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
   The backend API will be live at `http://localhost:8000`. Interactive OpenAPI documentation is accessible at `http://localhost:8000/docs`.

---

### Step 3.2: Frontend Setup

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The frontend application will be live at `http://localhost:5173`.

---

## 4. Docker Compose Deployment (One-Click)

AdaptiveLearn AI comes fully containerized with multi-stage Docker builds for the frontend, backend, and a dedicated PostgreSQL database container.

1. Ensure Docker Desktop or Docker Engine is running.
2. From the project root, launch all services:
   ```bash
   docker-compose up --build
   ```
3. Services exposed:
   - **Frontend & Reverse Proxy**: `http://localhost:5173`
   - **Backend API**: `http://localhost:8000` (docs at `http://localhost:8000/docs`)
   - **PostgreSQL Database**: `localhost:5432`
4. To stop services:
   ```bash
   docker-compose down
   ```

---

## 5. Default Demonstration Credentials

The application is pre-seeded with the following role-based demo accounts:

| Role | Email | Password | Pre-loaded Context |
| :--- | :--- | :--- | :--- |
| **Faculty** | `faculty@adaptivelearn.edu` | `Password123!` | Instructor for *CS-GENAI (Generative AI)* with 8 active topics & course materials. |
| **Student** | `student@adaptivelearn.edu` | `Password123!` | Active student with session history, mastery metrics, and adaptive sessions. |
| **Admin** | `admin@adaptivelearn.edu` | `Password123!` | System administrator with full curriculum and user management rights. |

---

## 6. Running Tests

### Backend Automated Tests
```bash
cd backend
source .venv/bin/activate
pytest -v
```

### Frontend Build & Type Validation
```bash
cd frontend
npm run build
```

---

## 7. Requested Feature Fixes (November 2026)

**Before upgrading an existing installation**, back up the PostgreSQL/SQLite database, ChromaDB directory, and uploaded documents. If your database already uses Alembic, run `alembic upgrade head` from `backend/`. If your existing database was initialized by the app's `Base.metadata.create_all` and has no `alembic_version` table, **do not run historical migrations on top of those existing tables**; simply start the upgraded backend, which creates the new generated-questions table. Never delete your existing database.

- **Subject deletion:** Faculty can delete only subjects assigned to their account, from **Faculty → Curriculum & Knowledge Base → Academic Subjects → Delete Subject**; administrators may delete any. Confirmations explain that topics, documents, student progress, and assessments are permanently removed. Vector chunks and subject uploads are purged.
- **Open student signup:** Students can register with any syntactically valid email address (e.g. Gmail, Outlook, college email). Public signup **always creates STUDENT accounts**; an authenticated administrator must create faculty/admin accounts. This does not establish email ownership; use email verification for production.
- **User management:** An authenticated administrator can **create** student, faculty, and admin accounts and **delete** users from **Admin → Registered Institutional Users**. Administrators cannot delete themselves; the final administrator is protected. Deleting a user removes their personal learning records; faculty courses and uploaded materials are retained and unassigned.
- **Question generation:** The assessment endpoint now retrieves document passages specific to the selected topic/subject, requests structured evidence-based questions from the configured OpenRouter model (when an API key is present), checks source quotes, and stores correct MCQ answers on the server. Without a model key it uses an **extractive offline fallback** using distinct phrases from approved course material rather than arbitrary fabricated distractors; the offline questions are naturally less varied than AI-authored exam questions. No course material → an actionable error instead of invented generic content. The client must submit `question_id`. Earlier generated questions cannot be submitted through the upgraded endpoint; generate a new one. Free-text grading without an external model uses an approximate keyword rubric and should not be treated as high-stakes assessment.

### Windows VS Code quick start

Open two terminals in your extracted project folder:

**Backend terminal**
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
# Any valid email domain is accepted for student signup
# Run `alembic upgrade head` ONLY if using Alembic-managed tables
uvicorn app.main:app --reload --port 8000
```

**Frontend terminal**
```powershell
cd frontend
npm ci
npm run dev
```

Then open `http://localhost:5173`. To test improved generation, upload relevant approved study material to a topic/subject and create a practice question. To run the regression tests, from the `backend` folder: `python -m pytest -q tests_test_requested_changes.py`.

**Important:** The sample demo administrator account and `JWT_SECRET` in the provided demo setup are not safe for public deployment. Disable demo seeding, set a long random JWT secret, and establish a secure first administrator before exposing the app publicly.
