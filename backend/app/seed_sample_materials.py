import os
import logging
from sqlalchemy.orm import Session
from app.database.session import SessionLocal
from app.models.user import User, UserRole
from app.models.subject import Subject
from app.models.topic import Topic
from app.models.document import Document
from app.rag.vector_store import vector_store

logger = logging.getLogger(__name__)

SAMPLE_TOPIC_MATERIALS = [
    {
        "topic_name": "Introduction to Generative AI",
        "module": "Module 1: Foundations",
        "doc_title": "Lecture 1: Introduction to Generative AI Systems.pdf",
        "content": (
            "Generative AI refers to computational algorithms capable of generating novel realistic content, "
            "including synthetic text, imagery, audio, and code. Unlike discriminative models that predict "
            "conditional probabilities P(Y|X) to classify existing samples, generative models approximate the "
            "underlying joint probability distribution P(X) or conditional distribution P(X|Y). Modern generative "
            "breakthroughs are predominantly driven by autoregressive neural language models trained on massive corpora."
        ),
        "page": 1,
        "section": "1.1 Overview & Mathematical Formulations"
    },
    {
        "topic_name": "LLM Fundamentals",
        "module": "Module 1: Foundations",
        "doc_title": "Lecture 2: Large Language Model Architectures.pdf",
        "content": (
            "Large Language Models (LLMs) are parameterized neural networks based on the Transformer architecture "
            "trained using self-supervised causal language modeling objectives. Given an input context of tokens "
            "x_1, ..., x_t, the model computes next-token logits over vocabulary V via cross-entropy loss. Core "
            "operational phases include pre-training on trillion-token web datasets, supervised instruction fine-tuning (SFT), "
            "and alignment via Reinforcement Learning from Human Feedback (RLHF) or Direct Preference Optimization (DPO)."
        ),
        "page": 2,
        "section": "2.1 Training Pipeline & Objective Functions"
    },
    {
        "topic_name": "Transformers",
        "module": "Module 1: Foundations",
        "doc_title": "Lecture 3: Attention Mechanisms and Transformers.pdf",
        "content": (
            "The Transformer architecture replaces recurrent neural networks with multi-head self-attention mechanisms. "
            "Given input representations, matrices of Queries (Q), Keys (K), and Values (V) are computed via learned projections. "
            "Scaled dot-product attention is calculated as Attention(Q, K, V) = softmax(Q * K^T / sqrt(d_k)) * V. "
            "This permits parallel processing of entire sequence contexts without vanishing gradient degradation."
        ),
        "page": 3,
        "section": "3.1 Scaled Dot-Product Self-Attention"
    },
    {
        "topic_name": "Embeddings",
        "module": "Module 2: Representations & Storage",
        "doc_title": "Lecture 4: Dense Vector Embeddings and Geometry.pdf",
        "content": (
            "Embeddings are continuous, dense vector representations that map discrete semantic tokens into high-dimensional "
            "vector spaces (typically 384 to 1536 dimensions). In contrast to sparse one-hot encodings, dense embeddings place "
            "semantically synonymous concepts in close geometric proximity. Semantic distance is quantitatively evaluated "
            "using cosine similarity: cos(theta) = (A . B) / (||A|| * ||B||), where values close to 1.0 indicate conceptual alignment."
        ),
        "page": 4,
        "section": "4.1 High-Dimensional Vector Geometry"
    },
    {
        "topic_name": "Chunking",
        "module": "Module 2: Representations & Storage",
        "doc_title": "Lecture 5: Document Parsing and Chunking Strategies.pdf",
        "content": (
            "Chunking is the process of partitioning unstructured documents into contiguous semantic segments optimized "
            "for vector retrieval and context window limits. Fixed-size chunking divides text by character or token counts "
            "with sliding overlaps (e.g., 500 characters with 10% overlap) to prevent loss of boundary context. Semantic and "
            "recursive chunking split documents at structural headings, paragraphs, and sentences to preserve cohesive thoughts."
        ),
        "page": 5,
        "section": "5.1 Chunking Algorithms and Overlap Trade-offs"
    },
    {
        "topic_name": "Vector Databases",
        "module": "Module 2: Representations & Storage",
        "doc_title": "Lecture 6: Vector Databases and Approximate Nearest Neighbors.pdf",
        "content": (
            "Vector databases (such as ChromaDB, Milvus, and Pinecone) index dense embeddings to perform sub-second nearest "
            "neighbor queries over millions of documents. Because exact k-nearest neighbor (k-NN) search incurs an O(N) linear scan "
            "bottleneck, vector indices use Approximate Nearest Neighbor (ANN) algorithms. The state-of-the-art method is "
            "Hierarchical Navigable Small World (HNSW) graphs, which achieve O(log N) search complexity by navigating layered proximity graphs."
        ),
        "page": 6,
        "section": "6.1 HNSW Graph Indexing & ANN Benchmarks"
    },
    {
        "topic_name": "RAG",
        "module": "Module 3: Retrieval & Agents",
        "doc_title": "Lecture 7: Retrieval-Augmented Generation Architecture.pdf",
        "content": (
            "Retrieval-Augmented Generation (RAG) combines external non-parametric document retrieval with parametric generative "
            "LLMs. When a user submits a prompt, the system queries a vector index to retrieve the most semantically relevant text "
            "passages, prepends these passages into the prompt context, and instructs the model to ground its response in the retrieved "
            "evidence. RAG dramatically reduces hallucinations and eliminates the need to continually re-train models on changing data."
        ),
        "page": 7,
        "section": "7.1 Standard RAG Pipeline & Prompt Conditioning"
    },
    {
        "topic_name": "Agentic RAG",
        "module": "Module 3: Retrieval & Agents",
        "doc_title": "Lecture 8: Agentic Multi-Hop RAG and Decision Loops.pdf",
        "content": (
            "Agentic RAG extends passive single-hop retrieval into an autonomous iterative decision-making loop. An intelligent "
            "controller analyzes user intent, assesses whether retrieved evidence is sufficient, reformulates queries dynamically, "
            "initiates multi-hop sub-queries, and routes between specialized tools (e.g. vector search, symbolic databases, code execution). "
            "If retrieved context exhibits low confidence or contradictory facts, the agent triggers corrective verification loops."
        ),
        "page": 8,
        "section": "8.1 Autonomous Decision Loops and Self-Correction"
    }
]

def seed_sample_course_content():
    db: Session = SessionLocal()
    try:
        faculty = db.query(User).filter(User.role == UserRole.FACULTY).first()
        if not faculty:
            logger.warning("No faculty user found to associate sample materials.")
            return

        subject = db.query(Subject).filter(Subject.code == "CS-GENAI").first()
        if not subject:
            logger.warning("Subject CS-GENAI not found.")
            return

        logger.info(f"Seeding sample academic materials for subject: {subject.name} ({subject.code})")

        for item in SAMPLE_TOPIC_MATERIALS:
            topic = db.query(Topic).filter(
                Topic.subject_id == subject.id,
                Topic.name == item["topic_name"]
            ).first()

            if not topic:
                logger.info(f"Creating topic: {item['topic_name']}")
                topic = Topic(
                    subject_id=subject.id,
                    module=item["module"],
                    name=item["topic_name"],
                    description=f"Core curriculum topic covering {item['topic_name']}."
                )
                db.add(topic)
                db.commit()
                db.refresh(topic)

            # Check if sample document already registered
            doc = db.query(Document).filter(
                Document.subject_id == subject.id,
                Document.filename == item["doc_title"]
            ).first()

            if not doc:
                doc = Document(
                    subject_id=subject.id,
                    topic_id=topic.id,
                    filename=item["doc_title"],
                    file_type="PDF",
                    file_size=len(item["content"].encode("utf-8")),
                    chunk_count=1,
                    uploaded_by=faculty.id,
                )
                db.add(doc)
                db.commit()
                db.refresh(doc)
            else:
                # Repair legacy seeded rows (missing topic link / invalid uploader FK)
                changed = False
                if doc.topic_id != topic.id:
                    doc.topic_id = topic.id
                    changed = True
                if doc.uploaded_by != faculty.id:
                    doc.uploaded_by = faculty.id
                    changed = True
                if changed:
                    db.commit()

            chunk_id = f"sample_{topic.id}_{item['page']}"
            if not vector_store.has_chunk(chunk_id):
                vector_store.add_chunks(
                    doc_id=doc.id,
                    document_name=item["doc_title"],
                    subject_id=subject.id,
                    topic_id=topic.id,
                    module=item["module"],
                    uploaded_by=faculty.name,
                    chunks=[{
                        "chunk_id": chunk_id,
                        "content": item["content"],
                        "page_number": item["page"],
                        "section": item["section"]
                    }]
                )
                logger.info(f"Indexed verified sample chunk for topic: {topic.name}")

        valid_doc_ids = [d.id for d in db.query(Document.id).all()]
        vector_store.purge_orphans(valid_doc_ids)

        logger.info("Successfully seeded all 8 Generative AI sample topics and RAG chunks.")
    finally:
        db.close()

if __name__ == "__main__":
    seed_sample_course_content()
