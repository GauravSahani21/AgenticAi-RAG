import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database.session import engine, SessionLocal
from app.database.base import Base
from app.models.user import User, UserRole
from app.models.subject import Subject
from app.models.topic import Topic
from app.models.document import Document
from app.models.session import LearningSession
from app.models.interaction import Interaction
from app.auth.security import get_password_hash
from app.api import auth, subjects, topics, dashboard, documents, rag, tutor, assessment, faculty_analytics

logging.basicConfig(level=logging.INFO)


logger = logging.getLogger(__name__)

def seed_initial_data():
    db = SessionLocal()
    try:
        demo_users = [
            {
                "name": "Prof. Alan Turing",
                "email": "faculty@adaptivelearn.edu",
                "password": "Password123!",
                "role": UserRole.FACULTY,
                "department": "Computer Science & AI"
            },
            {
                "name": "Jane Student",
                "email": "student@adaptivelearn.edu",
                "password": "Password123!",
                "role": UserRole.STUDENT,
                "department": "Computer Science"
            },
            {
                "name": "System Administrator",
                "email": "admin@adaptivelearn.edu",
                "password": "Password123!",
                "role": UserRole.ADMIN,
                "department": "IT Administration"
            }
        ]

        faculty_user = None
        for u in demo_users:
            existing = db.query(User).filter(User.email == u["email"]).first()
            if not existing:
                created = User(
                    name=u["name"],
                    email=u["email"],
                    password_hash=get_password_hash(u["password"]),
                    role=u["role"],
                    department=u["department"]
                )
                db.add(created)
                db.commit()
                db.refresh(created)
                if u["role"] == UserRole.FACULTY:
                    faculty_user = created
            elif u["role"] == UserRole.FACULTY:
                faculty_user = existing

        genai_subject = db.query(Subject).filter(Subject.code == "CS-GENAI").first()
        if not genai_subject:
            genai_subject = Subject(
                name="Generative AI",
                code="CS-GENAI",
                faculty_id=faculty_user.id if faculty_user else None
            )
            db.add(genai_subject)
            db.commit()
            db.refresh(genai_subject)

            topics_data = [
                ("Module 1", "Introduction to Generative AI", "Fundamental definitions, history, and core taxonomy of generative models.", "BEGINNER"),
                ("Module 1", "LLM Fundamentals", "Architecture of Large Language Models, tokenization, and causal language modeling.", "BEGINNER"),
                ("Module 2", "Transformers", "Self-attention mechanism, multi-head attention, and transformer encoders/decoders.", "INTERMEDIATE"),
                ("Module 2", "Embeddings", "Dense vector representations of semantic meaning and cosine similarity metrics.", "INTERMEDIATE"),
                ("Module 3", "Chunking", "Strategies for document chunking, overlap, semantic boundary detection.", "INTERMEDIATE"),
                ("Module 3", "Vector Databases", "Indexing structures (HNSW, IVFFlat), similarity search, ChromaDB fundamentals.", "INTERMEDIATE"),
                ("Module 4", "RAG", "Retrieval-Augmented Generation pipeline, query augmentation, and grounded synthesis.", "ADVANCED"),
                ("Module 4", "Agentic RAG", "Adaptive retrieval, self-reflective reasoning, planning, and multi-step tool execution.", "ADVANCED"),
            ]

            for module, name, desc, diff in topics_data:
                topic = Topic(
                    subject_id=genai_subject.id,
                    module=module,
                    name=name,
                    description=desc,
                    difficulty=diff
                )
                db.add(topic)
            db.commit()
            logger.info("Successfully seeded Generative AI subject and 8 topics.")

    except Exception as e:
        logger.error(f"Error seeding initial data: {e}")
        db.rollback()
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    seed_initial_data()
    try:
        from app.seed_sample_materials import seed_sample_course_content
        seed_sample_course_content()
    except Exception as se:
        logger.warning(f"Could not automatically seed sample materials: {se}")
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="AdaptiveLearn AI - Agentic RAG-Based Adaptive Learning Platform",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(auth.router)
app.include_router(subjects.router)
app.include_router(topics.router)
app.include_router(dashboard.router)
app.include_router(documents.router)
app.include_router(rag.router)
app.include_router(tutor.router)
app.include_router(assessment.router)
app.include_router(faculty_analytics.router)

@app.get("/")
def root():
    return {
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "operational",
        "phase": 6,
        "documentation": "/docs"
    }



@app.get("/health")
@app.get("/api/health")
def health_check():
    return {"status": "healthy", "service": "AdaptiveLearn AI Backend"}
