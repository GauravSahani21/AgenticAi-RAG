"""
app/seed.py — Standalone seed runner for AdaptiveLearn AI.
Referenced in README.md as: python -m app.seed
Runs both the core DB seed (via main startup) and the sample course material seeder.
"""
import logging
from app.database.session import SessionLocal, engine
from app.database.base import Base
from app.models import Base as _  # ensure all models are registered

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_seed():
    logger.info("Creating all database tables...")
    Base.metadata.create_all(bind=engine)

    # Run core demo user + subject/topic seeding (reuse main.py logic)
    from app.models.user import User, UserRole
    from app.models.subject import Subject
    from app.models.topic import Topic
    from app.auth.security import get_password_hash

    db = SessionLocal()
    try:
        demo_users = [
            {"name": "Prof. Alan Turing", "email": "faculty@adaptivelearn.edu",
             "password": "Password123!", "role": UserRole.FACULTY, "department": "Computer Science & AI"},
            {"name": "Jane Student", "email": "student@adaptivelearn.edu",
             "password": "Password123!", "role": UserRole.STUDENT, "department": "Computer Science"},
            {"name": "System Administrator", "email": "admin@adaptivelearn.edu",
             "password": "Password123!", "role": UserRole.ADMIN, "department": "IT Administration"},
        ]

        faculty_user = None
        for u in demo_users:
            existing = db.query(User).filter(User.email == u["email"]).first()
            if not existing:
                created = User(
                    name=u["name"], email=u["email"],
                    password_hash=get_password_hash(u["password"]),
                    role=u["role"], department=u["department"]
                )
                db.add(created)
                db.commit()
                db.refresh(created)
                logger.info(f"Created user: {u['email']} ({u['role'].value})")
                if u["role"] == UserRole.FACULTY:
                    faculty_user = created
            else:
                logger.info(f"User already exists: {u['email']}")
                if u["role"] == UserRole.FACULTY:
                    faculty_user = existing

        genai_subject = db.query(Subject).filter(Subject.code == "CS-GENAI").first()
        if not genai_subject and faculty_user:
            genai_subject = Subject(name="Generative AI", code="CS-GENAI", faculty_id=faculty_user.id)
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
                db.add(Topic(subject_id=genai_subject.id, module=module, name=name, description=desc, difficulty=diff))
            db.commit()
            logger.info("Seeded Generative AI subject and 8 topics.")

        # Seed sample course materials
        try:
            from app.seed_sample_materials import seed_sample_course_content
            seed_sample_course_content()
            logger.info("Seeded sample course materials and ChromaDB vectors.")
        except Exception as e:
            logger.warning(f"Could not seed sample materials: {e}")

        logger.info("✅ Seed complete.")
    except Exception as e:
        logger.error(f"Seed error: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    run_seed()
