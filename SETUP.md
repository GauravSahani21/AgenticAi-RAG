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
| `OPENROUTER_MODEL` | Primary LLM model | `anthropic/claude-3-haiku` |

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

4. Run database migrations:
   ```bash
   alembic upgrade head
   ```

5. (Optional) Run automated database seeders:
   *Note: On backend startup, standard curriculum subjects and 8 verified Generative AI topics with academic chunks are automatically seeded!*
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

### Backend Automated Test Suite (43 Unit & Integration Tests)
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
