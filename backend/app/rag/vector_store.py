import os
import re
import hashlib
import logging
from typing import List, Dict, Any, Optional
import numpy as np
import chromadb
from chromadb.api.types import EmbeddingFunction
from app.config import settings

logger = logging.getLogger(__name__)

_TOKEN_RE = re.compile(r"[a-z0-9]+")
_STOPWORDS = frozenset(
    "a an the is are was were be been being of to in on for and or but with as by at from "
    "this that these those it its into than then so such what which who whom how why when "
    "where do does did can could should would will shall may might must i you we they he she "
    "me my our your their them us about explain describe tell please".split()
)


def _stem(word: str) -> str:
    """Very light suffix stripping so 'transformers'/'transformer', 'embeddings'/'embedding' match."""
    for suffix in ("ations", "ation", "ings", "ing", "ies", "es", "s"):
        if len(word) > len(suffix) + 3 and word.endswith(suffix):
            return word[: -len(suffix)] + ("y" if suffix == "ies" else "")
    return word


def _tokenize(text: str) -> List[str]:
    return [_stem(t) for t in _TOKEN_RE.findall(text.lower()) if t not in _STOPWORDS]


def _bucket(token: str, dim: int) -> int:
    return int(hashlib.md5(token.encode("utf-8")).hexdigest(), 16) % dim


class AdaptiveSemanticEmbeddingFunction(EmbeddingFunction):
    """
    Robust, fast, local semantic embedding function.
    Generates normalized dense vectors from hashed unigrams, bigrams and character
    trigrams, guaranteeing fast retrieval without remote network dependencies.
    """
    def __init__(self, dim: int = 512):
        self.dim = dim

    def get_config(self) -> Dict[str, Any]:
        return {"dim": self.dim}

    @staticmethod
    def build_from_config(config: Dict[str, Any]) -> "AdaptiveSemanticEmbeddingFunction":
        return AdaptiveSemanticEmbeddingFunction(dim=config.get("dim", 512))

    @staticmethod
    def name() -> str:
        return "adaptive_semantic_v2"

    def __call__(self, input: List[str]) -> List[List[float]]:
        embeddings = []
        for text in input:
            vec = np.zeros(self.dim, dtype=np.float32)
            words = _tokenize(text)
            for w in words:
                vec[_bucket("w:" + w, self.dim)] += 1.0
                padded = f"#{w}#"
                for i in range(len(padded) - 2):
                    vec[_bucket("c:" + padded[i:i + 3], self.dim)] += 0.25
            for i in range(len(words) - 1):
                vec[_bucket("b:" + words[i] + "_" + words[i + 1], self.dim)] += 1.5
            norm = np.linalg.norm(vec)
            if norm > 0:
                vec = vec / norm
            embeddings.append(vec.tolist())
        return embeddings


COLLECTION_NAME = "adaptivelearn_academic_docs_v2"


class VectorStore:
    def __init__(self):
        self._client = None
        self._collection = None
        self._embedding_function = AdaptiveSemanticEmbeddingFunction()

    def _get_collection(self):
        if self._collection is None:
            try:
                os.makedirs(settings.CHROMA_PERSIST_DIRECTORY, exist_ok=True)
                self._client = chromadb.PersistentClient(path=settings.CHROMA_PERSIST_DIRECTORY)
                try:
                    self._collection = self._client.get_or_create_collection(
                        name=COLLECTION_NAME,
                        embedding_function=self._embedding_function,
                        metadata={"hnsw:space": "cosine"}
                    )
                except Exception as ef_err:
                    # If existing collection had a conflicting embedding function, delete and re-create
                    logger.warning(f"Recreating collection due to configuration change: {ef_err}")
                    try:
                        self._client.delete_collection(COLLECTION_NAME)
                    except Exception:
                        pass
                    self._collection = self._client.get_or_create_collection(
                        name=COLLECTION_NAME,
                        embedding_function=self._embedding_function,
                        metadata={"hnsw:space": "cosine"}
                    )
                # Drop the legacy collection built with the old embedding scheme
                try:
                    self._client.delete_collection("adaptivelearn_academic_docs")
                except Exception:
                    pass
            except Exception as e:
                logger.error(f"Failed to initialize ChromaDB collection: {e}")
                raise
        return self._collection

    def has_chunk(self, chunk_id: str) -> bool:
        try:
            return len(self._get_collection().get(ids=[chunk_id])["ids"]) > 0
        except Exception:
            return False

    def purge_orphans(self, valid_doc_ids: List[str]) -> int:
        """Removes chunks whose source document no longer exists in the relational DB."""
        collection = self._get_collection()
        data = collection.get(include=["metadatas"])
        valid = set(valid_doc_ids)
        orphan_ids = [
            cid for cid, meta in zip(data["ids"], data["metadatas"])
            if (meta or {}).get("doc_id") not in valid
        ]
        if orphan_ids:
            collection.delete(ids=orphan_ids)
            logger.info(f"Purged {len(orphan_ids)} orphaned chunks from ChromaDB")
        return len(orphan_ids)

    def add_chunks(
        self,
        doc_id: str,
        document_name: str,
        subject_id: str,
        topic_id: Optional[str],
        module: str,
        uploaded_by: Optional[str],
        chunks: List[Dict[str, Any]]
    ):
        """Adds structured chunks with full academic metadata to ChromaDB."""
        if not chunks:
            return

        collection = self._get_collection()
        ids = []
        documents = []
        metadatas = []

        for chunk in chunks:
            ids.append(chunk["chunk_id"])
            documents.append(chunk["content"])
            metadatas.append({
                "doc_id": doc_id,
                "document_name": document_name,
                "subject_id": subject_id,
                "topic_id": topic_id if topic_id else "",
                "module": module if module else "General",
                "uploaded_by": uploaded_by if uploaded_by else "Faculty",
                "page_number": int(chunk.get("page_number", 1)),
                "section": str(chunk.get("section", "General")),
                "chunk_id": chunk["chunk_id"]
            })

        collection.add(
            ids=ids,
            documents=documents,
            metadatas=metadatas
        )
        logger.info(f"Added {len(chunks)} chunks to ChromaDB for document {document_name} ({doc_id})")

    def delete_document(self, doc_id: str):
        """Removes all chunks belonging to a document from ChromaDB."""
        try:
            collection = self._get_collection()
            collection.delete(where={"doc_id": doc_id})
            logger.info(f"Purged chunks from ChromaDB for document {doc_id}")
        except Exception as e:
            logger.warning(f"Error purging document chunks from ChromaDB: {e}")

    def search(
        self,
        query: str,
        subject_id: Optional[str] = None,
        topic_id: Optional[str] = None,
        top_k: int = 4
    ) -> List[Dict[str, Any]]:
        """Queries ChromaDB using cosine similarity and returns matched chunks with source metadata."""
        collection = self._get_collection()
        
        if collection.count() == 0:
            return []

        where_filter = None
        if subject_id and topic_id:
            where_filter = {"$and": [{"subject_id": subject_id}, {"topic_id": topic_id}]}
        elif subject_id:
            where_filter = {"subject_id": subject_id}
        elif topic_id:
            where_filter = {"topic_id": topic_id}

        try:
            query_kwargs = {
                "query_texts": [query],
                "n_results": min(top_k, collection.count()),
            }
            if where_filter:
                query_kwargs["where"] = where_filter

            results = collection.query(**query_kwargs)
        except Exception as e:
            logger.warning(f"Filtered vector query failed: {e}. Trying fallback search without where clause.")
            try:
                results = collection.query(
                    query_texts=[query],
                    n_results=min(top_k, collection.count())
                )
            except Exception as e_inner:
                logger.error(f"Fallback vector search failed: {e_inner}")
                return []

        formatted_results = []
        if results and "documents" in results and results["documents"]:
            docs = results["documents"][0]
            metadatas = results["metadatas"][0] if "metadatas" in results else [{}] * len(docs)
            distances = results["distances"][0] if "distances" in results else [0.0] * len(docs)

            for doc_text, meta, dist in zip(docs, metadatas, distances):
                similarity = max(0.0, 1.0 - float(dist)) if dist is not None else 0.85
                formatted_results.append({
                    "content": doc_text,
                    "document_name": meta.get("document_name", "Unknown Document"),
                    "page_number": int(meta.get("page_number", 1)),
                    "section": meta.get("section", "General"),
                    "similarity_score": round(similarity, 4)
                })

        formatted_results.sort(key=lambda x: x["similarity_score"], reverse=True)
        return formatted_results

vector_store = VectorStore()
