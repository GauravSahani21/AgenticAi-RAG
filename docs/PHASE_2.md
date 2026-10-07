# Phase 2 Summary — Academic Content and RAG

## Objectives Achieved
1. **Multi-Format Document Ingestion Engine**:
   - Supported file formats: `PDF`, `DOCX`, `PPTX`, `TXT`.
   - File validation: 25MB file size limit, format whitelist, empty file guard.
   - Text extraction with page-number and section tracking:
     - PDF: `pypdf` page reader.
     - DOCX: `python-docx` structured heading/paragraph reader.
     - PPTX: `python-pptx` slide text extractor.
     - TXT: Normalized multi-encoding extractor.
2. **Chunking & Preprocessing Pipeline**:
   - Overlapping character/word-boundary chunking (`split_text_into_chunks`).
   - Unique deterministic chunk IDs formatted as `{doc_id}_chunk_{i}`.
   - Strict metadata injection: `subject_id`, `topic_id`, `module`, `document_name`, `page_number`, `section`, `uploaded_by`, `chunk_id`.
3. **ChromaDB Vector Store**:
   - Persistent ChromaDB collection: `adaptivelearn_academic_docs`.
   - Cosine similarity metric index (`hnsw:space: cosine`).
   - `AdaptiveSemanticEmbeddingFunction`: 384-dimensional normalized dense vectors.
   - Search API (`POST /api/rag/search`) supporting course/topic filtering and cosine similarity ranking.
   - Full purge on document deletion from both DB and vector store.
4. **Faculty & Testing UI**:
   - `DocumentUploadModal`: File picker, course and topic selectors, upload status feedback.
   - Knowledge base management table in Faculty Dashboard with chunk counts and delete actions.
   - `RAGSearchTester`: Live interactive search console showing retrieved text chunks, source filenames, page numbers, and similarity match percentages.
