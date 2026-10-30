import re
import json
import random
import logging
import uuid
from typing import List, Dict, Any, Optional, Tuple
from app.ai.tutor import call_openrouter

logger = logging.getLogger(__name__)

# Transparent Mastery Configuration
DIFFICULTY_WEIGHTS = {
    "BEGINNER": 1.0,
    "INTERMEDIATE": 1.25,
    "ADVANCED": 1.5,
}

BASE_CORRECT_DELTA = 7.0
BASE_INCORRECT_DELTA = 5.0

def calculate_updated_mastery(
    current_mastery: float,
    current_attempts: int,
    current_correct: int,
    current_incorrect: int,
    is_correct: bool,
    difficulty: str = "INTERMEDIATE",
    confidence: float = 0.5
) -> Tuple[float, float, str]:
    """
    Transparent Mastery Calculation Algorithm:
    - Factors correctness, question difficulty weight, and performance history.
    - Correct: increases mastery proportionally to difficulty weight + small accuracy momentum.
    - Incorrect: decreases mastery slightly, with harder questions penalizing less.
    - Evaluates updated status: NOT_STARTED, LEARNING, IMPROVING, MASTERED, STRUGGLING, INTERVENTION_REQUIRED.

    Returns:
        (updated_mastery, updated_confidence, updated_status)
    """
    diff_key = difficulty.upper() if difficulty else "INTERMEDIATE"
    weight = DIFFICULTY_WEIGHTS.get(diff_key, 1.2)

    new_attempts = current_attempts + 1
    new_correct = current_correct + (1 if is_correct else 0)
    new_incorrect = current_incorrect + (0 if is_correct else 1)

    if is_correct:
        # Boost mastery: Beginner = +7.0, Intermediate = +8.75, Advanced = +10.5
        delta = BASE_CORRECT_DELTA * weight
        # Momentum adjustment if accuracy is high
        accuracy_ratio = new_correct / new_attempts
        delta += accuracy_ratio * 1.5
        new_mastery = min(100.0, current_mastery + delta)
        new_confidence = min(1.0, confidence + 0.05)
    else:
        # Penalize mastery: Harder questions penalize less
        delta = BASE_INCORRECT_DELTA / weight
        new_mastery = max(0.0, current_mastery - delta)
        new_confidence = max(0.1, confidence - 0.08)

    # Determine status progression
    if new_mastery >= 80.0 and new_attempts >= 3:
        status = "MASTERED"
    elif new_mastery >= 50.0 and new_attempts >= 3:
        status = "IMPROVING"
    elif new_mastery < 50.0 and new_attempts >= 3 and (new_incorrect > new_correct or new_mastery < 40.0):
        if new_attempts >= 6 and new_mastery < 40.0:
            status = "INTERVENTION_REQUIRED"
        else:
            status = "STRUGGLING"
    elif new_attempts > 0:
        status = "LEARNING"
    else:
        status = "NOT_STARTED"

    return round(new_mastery, 1), round(new_confidence, 2), status


# Curated Grounded Question Bank for Syllabus Topics
TOPIC_QUESTION_BANKS: Dict[str, Dict[str, List[Dict[str, Any]]]] = {
    "Embeddings": {
        "MCQ": [
            {
                "question": "In {topic}, how are semantically similar concepts represented in high-dimensional vector space?",
                "options": [
                    "A) They point in completely opposite directions with negative cosine similarity",
                    "B) Vectors of similar concepts form small angular distances (high cosine similarity)",
                    "C) They are assigned identical random numbers without geometric relation",
                    "D) They are sorted alphabetically by word length"
                ],
                "correct": "B",
                "explanation": "In embedding space, semantically related concepts cluster together and form small angular separation, yielding high cosine similarity."
            },
            {
                "question": "What is the primary role of high-dimensional {topic} in modern search and retrieval?",
                "options": [
                    "A) They compress text by deleting all punctuation marks",
                    "B) They capture latent semantic meanings and conceptual relationships beyond exact lexical keyword matches",
                    "C) They encrypt database credentials for secure network transfer",
                    "D) They replace all relational database primary keys"
                ],
                "correct": "B",
                "explanation": "Embeddings project language into continuous dense geometric spaces where semantic intent is preserved, enabling semantic search."
            }
        ],
        "CONCEPTUAL": [
            "In your own words, explain the core geometric idea behind {topic} and describe how cosine similarity evaluates proximity.",
            "Describe the difference between exact keyword matching and dense semantic representations in {topic}.",
            "How do pre-trained embedding models learn continuous mathematical representations from massive text corpora in {topic}?"
        ],
        "SHORT_ANSWER": [
            "Define {topic} in one or two sentences and name one standard metric used to measure vector closeness.",
            "State two advantages of dense {topic} over sparse one-hot encoded or bag-of-words representations."
        ],
        "APPLICATION": [
            "Imagine an e-commerce catalog search. How would you apply {topic} to retrieve relevant winter clothing when customers search for 'freezing weather gear'?",
            "How would you use {topic} to cluster incoming academic research papers into relevant domain categories?"
        ],
        "SCENARIO": [
            "Scenario: A search model frequently returns completely unrelated results for homonyms (e.g. 'Apple' company vs 'apple' fruit). How can contextualized {topic} solve this failure mode?",
            "Scenario: An enterprise customer database contains 500,000 queries with typos and synonyms. Explain how {topic} enables accurate customer intent matching."
        ]
    },
    "Transformers": {
        "MCQ": [
            {
                "question": "What is the primary architectural innovation introduced by {topic} over traditional sequential RNNs and LSTMs?",
                "options": [
                    "A) Processing text strictly one token at a time in a single sequential thread",
                    "B) Multi-Head Self-Attention mechanisms that process tokens in parallel and capture long-range contextual dependencies",
                    "C) Replacing all matrix multiplications with simple binary logic gates",
                    "D) Restricting inputs to a maximum of 128 characters"
                ],
                "correct": "B",
                "explanation": "Self-attention computes dynamic attention weights between every pair of tokens simultaneously in parallel, overcoming recurrence bottlenecks."
            },
            {
                "question": "In the {topic} architecture, what is the specific role of Positional Encodings?",
                "options": [
                    "A) Encrypting token embeddings before transmission",
                    "B) Injecting word order and sequence position into embeddings since self-attention is permutation-invariant",
                    "C) Compressing the model weights onto smaller GPU hardware",
                    "D) Randomizing the layer outputs during backpropagation"
                ],
                "correct": "B",
                "explanation": "Because self-attention processes all tokens in parallel without an inherent sequence order, positional encodings provide essential positional signals."
            }
        ],
        "CONCEPTUAL": [
            "Explain how the Query, Key, and Value (Q, K, V) mechanism in {topic} calculates dynamic attention weights.",
            "What is the function of Multi-Head Attention in {topic}, and why is it superior to single-head attention?",
            "How do {topic} decoders use causal masking to prevent the model from looking ahead during autoregressive token generation?"
        ],
        "SHORT_ANSWER": [
            "Name the three core vectors computed for each token in {topic} self-attention and define one of them.",
            "State two reasons why {topic} models scale much better with GPU compute than recurrent architectures."
        ],
        "APPLICATION": [
            "How would you utilize {topic} to perform abstractive multi-document summarization across long research papers?",
            "Explain how cross-attention in an encoder-decoder {topic} connects source language input to target language translation."
        ],
        "SCENARIO": [
            "Scenario: A document contains 10,000 tokens. Why does standard full self-attention in {topic} face quadratic computational complexity O(N^2), and how can chunking help?",
            "Scenario: A chatbot loses context when the conversation exceeds its context window. How does context length in {topic} architectures govern memory?"
        ]
    },
    "Chunking": {
        "MCQ": [
            {
                "question": "In RAG pipelines, what is the primary purpose of introducing chunk overlap during document {topic}?",
                "options": [
                    "A) To double the size of the database storage unnecessarily",
                    "B) To preserve semantic continuity and prevent splitting critical ideas or sentences across arbitrary boundaries",
                    "C) To convert PDF documents into raster image formats",
                    "D) To bypass vector embedding limits"
                ],
                "correct": "B",
                "explanation": "Chunk overlap ensures that concepts spanning split boundaries remain intact in at least one retrieved chunk, preserving context."
            },
            {
                "question": "What is the primary tradeoff between very small chunks versus very large chunks in {topic}?",
                "options": [
                    "A) Small chunks have high noise, while large chunks cannot be indexed",
                    "B) Small chunks provide pinpoint semantic precision but may lack surrounding context; large chunks preserve context but dilute embedding specificity",
                    "C) Small chunks cannot be embedded by modern transformer models",
                    "D) Chunk size has no measurable impact on retrieval accuracy"
                ],
                "correct": "B",
                "explanation": "Balancing chunk size is a foundational optimization in RAG: balancing embedding specificity against adequate contextual context."
            }
        ],
        "CONCEPTUAL": [
            "Explain the difference between fixed-size character {topic} and semantic or recursive document {topic}.",
            "Why is sentence-aware or paragraph-aware {topic} usually superior to splitting text at arbitrary token counts?",
            "How does parent-document {topic} allow retrieving smaller focused chunks while feeding larger contextual blocks to the LLM?"
        ],
        "SHORT_ANSWER": [
            "Define chunk overlap in {topic} and state why it is commonly set between 10% and 20%.",
            "Give two document formats (e.g., Markdown, Code, Legal Contracts) where structural {topic} is essential."
        ],
        "APPLICATION": [
            "How would you design a {topic} strategy for a 200-page academic textbook containing nested headers, tables, and exercises?",
            "In a code-search assistant, how should function and class boundaries influence your {topic} strategy?"
        ],
        "SCENARIO": [
            "Scenario: A RAG system frequently retrieves answers that cut off half-way through a crucial explanation. How would modifying {topic} parameters fix this?",
            "Scenario: Customer queries return paragraphs that discuss two completely unrelated topics. How does reducing chunk size alleviate topic dilution in {topic}?"
        ]
    },
    "Vector Databases": {
        "MCQ": [
            {
                "question": "Why do modern {topic} rely on Approximate Nearest Neighbor (ANN) algorithms like HNSW rather than brute-force linear search?",
                "options": [
                    "A) Linear search requires too little memory",
                    "B) ANN algorithms scale sub-linearly O(log N) across millions of vectors, avoiding slow O(N) full-table scans",
                    "C) Linear search is mathematically incapable of computing dot products",
                    "D) ANN algorithms only operate on binary data"
                ],
                "correct": "B",
                "explanation": "ANN indexes like Hierarchical Navigable Small World (HNSW) enable millisecond similarity lookups over millions of dense vectors."
            },
            {
                "question": "In {topic}, what is metadata filtering and when is it applied?",
                "options": [
                    "A) Deleting corrupt vectors from the database",
                    "B) Filtering candidate search results based on structured attributes (e.g. subject_id, date, author) alongside vector similarity",
                    "C) Compressing text files into zip format",
                    "D) Validating user passwords during authentication"
                ],
                "correct": "B",
                "explanation": "Metadata filtering allows combining dense similarity search with relational filters (e.g., searching only documents belonging to a specific course)."
            }
        ],
        "CONCEPTUAL": [
            "Describe the architecture of an Approximate Nearest Neighbor index such as HNSW in {topic}.",
            "How do {topic} handle both dense vector similarity and structured relational metadata queries simultaneously?",
            "What is the difference between Cosine Similarity, Dot Product, and Euclidean Distance metrics in {topic}?"
        ],
        "SHORT_ANSWER": [
            "Name two widely used {topic} or vector index libraries in modern AI systems.",
            "Define the indexing phase versus the query phase in {topic}."
        ],
        "APPLICATION": [
            "How would you partition or namespace vector collections in {topic} to serve hundreds of different university courses securely?",
            "Describe how to implement hybrid search combining BM25 keyword search and dense similarity in a {topic}."
        ],
        "SCENARIO": [
            "Scenario: A vector index with 10 million embeddings takes 3 seconds per query. What indexing optimizations in {topic} can reduce latency below 50ms?",
            "Scenario: A user queries for materials uploaded only in the last 7 days. How does pre-filtering versus post-filtering operate in {topic}?"
        ]
    },
    "RAG": {
        "MCQ": [
            {
                "question": "What is the primary advantage of Retrieval-Augmented Generation ({topic}) over relying solely on a pre-trained LLM?",
                "options": [
                    "A) It eliminates the need for an LLM completely",
                    "B) It grounds generations in authoritative external documents, reducing hallucinations and enabling live knowledge updates without retraining",
                    "C) It guarantees 100% loss-free compression of text",
                    "D) It only functions when the model is offline without internet access"
                ],
                "correct": "B",
                "explanation": "RAG dynamically fetches relevant context passages from curated knowledge bases, injecting verifiable ground truth into the model prompt."
            },
            {
                "question": "In a production {topic} pipeline, what is the role of a Re-ranker (cross-encoder)?",
                "options": [
                    "A) Translating text into different human languages",
                    "B) Scoring retrieved candidate chunks against the original query with deep cross-attention to prioritize the most relevant context",
                    "C) Generating summary diagrams of the database",
                    "D) Encrypting user tokens during transmission"
                ],
                "correct": "B",
                "explanation": "Re-rankers evaluate query-document pairs jointly with high precision to rank the top candidate chunks before passing them to the generator."
            }
        ],
        "CONCEPTUAL": [
            "Walk through the complete lifecycle of a {topic} request: from user query to embedding, vector search, context injection, and synthesized output.",
            "How does {topic} address the fundamental problem of LLM hallucinations and knowledge staleness?",
            "Explain the difference between naive {topic}, modular {topic}, and advanced {topic} architectures."
        ],
        "SHORT_ANSWER": [
            "Define context injection in {topic} and explain how the system prompt incorporates retrieved chunks.",
            "State two metrics commonly used to evaluate {topic} quality (e.g. faithfulness, answer relevance)."
        ],
        "APPLICATION": [
            "Design a {topic} architecture for a university course where students can query faculty lecture slides, readings, and syllabi.",
            "How would you integrate source attribution and clickable citations into a {topic} response interface?"
        ],
        "SCENARIO": [
            "Scenario: An LLM answers a query by making up plausible-sounding false citations. How does strict grounding in {topic} eliminate this?",
            "Scenario: The retrieved chunks contain contradictory information from two different source documents. How should a robust {topic} system handle this?"
        ]
    },
    "Agentic RAG": {
        "MCQ": [
            {
                "question": "How does {topic} differ fundamentally from traditional, single-hop naive RAG pipelines?",
                "options": [
                    "A) It disables all retrieval tools and relies purely on static model memory",
                    "B) It incorporates dynamic decision-making, iterative query reformulation, autonomous routing, and self-reflection loops",
                    "C) It cannot read or process unstructured documents",
                    "D) It requires human intervention for every intermediate reasoning step"
                ],
                "correct": "B",
                "explanation": "Agentic RAG uses an autonomous reasoning agent to evaluate evidence sufficiency, reformulate sub-queries, and route across multiple data sources."
            },
            {
                "question": "What is the purpose of the 'Corrective' or 'Self-RAG' reflection step in {topic}?",
                "options": [
                    "A) Backing up the database onto an external hard drive",
                    "B) Having the agent assess whether retrieved documents are actually relevant before attempting to generate an answer",
                    "C) Converting all numbers into Roman numerals",
                    "D) Shutting down the model after 5 minutes"
                ],
                "correct": "B",
                "explanation": "Self-reflection evaluates retrieved document relevance: if chunks are irrelevant or insufficient, the agent rewrites the query or fetches additional sources."
            }
        ],
        "CONCEPTUAL": [
            "Explain how an autonomous reasoning loop (Think -> Act -> Observe) functions in {topic}.",
            "What is multi-query decomposition in {topic}, and why is it necessary for complex, multi-faceted research questions?",
            "How does an agent determine when it has gathered sufficient evidence versus when it needs to perform another retrieval cycle in {topic}?"
        ],
        "SHORT_ANSWER": [
            "Define tool routing in {topic} and give two examples of tools an agent might select between.",
            "State two advantages of {topic} when answering complex multi-step comparison queries."
        ],
        "APPLICATION": [
            "Design a multi-agent {topic} workflow with a research agent, a verification critic agent, and a synthesis agent.",
            "How would you implement an automated query rewriting loop in {topic} when initial retrieval returns zero high-similarity matches?"
        ],
        "SCENARIO": [
            "Scenario: A user asks 'Compare the memory efficiency of Transformers and Mamba models on 100k token contexts.' How does {topic} break this down into sub-queries?",
            "Scenario: Initial retrieval returns outdated documentation. How does {topic} recognize knowledge inadequacy and execute alternative retrieval paths?"
        ]
    },
    "Introduction to Generative AI": {
        "MCQ": [
            {
                "question": "Which of the following statements best describes the primary function of {topic}?",
                "options": [
                    "A) It replaces all relational databases with plain text files",
                    "B) It generates, transforms, or synthesizes new content using learned statistical patterns",
                    "C) It only works on deterministic tabular spreadsheets",
                    "D) It requires manually written boolean rules for every decision"
                ],
                "correct": "B",
                "explanation": "Generative AI systems learn underlying probabilistic distributions from training data to generate novel, context-appropriate content."
            },
            {
                "question": "What is the foundational difference between discriminative AI models and {topic} models?",
                "options": [
                    "A) Discriminative models generate new text, while generative models classify labels",
                    "B) Discriminative models predict category boundaries P(Y|X), while generative models learn data distributions P(X) to produce new instances",
                    "C) Generative models cannot process natural language",
                    "D) Discriminative models never require labeled data"
                ],
                "correct": "B",
                "explanation": "Discriminative models focus on separating data points into predefined classes, whereas generative models model the generation process of data."
            }
        ],
        "CONCEPTUAL": [
            "In your own words, explain the core idea behind {topic} and describe one real-world application where it plays a critical role.",
            "What is the fundamental difference between traditional rule-based AI approaches and the probabilistic approach used in {topic}?",
            "Explain how training data scale and compute power transformed {topic} over the past decade."
        ],
        "SHORT_ANSWER": [
            "Define {topic} in one or two sentences and name one major model architecture used in it.",
            "State two ethical or technical challenges associated with deploying {topic} in production systems."
        ],
        "APPLICATION": [
            "How can {topic} be applied in higher education to create personalized, adaptive learning paths for students?",
            "Describe how {topic} models assist software engineers in automated code generation and test suite authoring."
        ],
        "SCENARIO": [
            "Scenario: A company wants to use {topic} for customer support. How should they balance creativity versus factual accuracy?",
            "Scenario: A generative model outputs biased or toxic content. What safety alignment techniques can mitigate this in {topic}?"
        ]
    },
    "LLM Fundamentals": {
        "MCQ": [
            {
                "question": "In {topic}, what is the role of tokenization during text processing?",
                "options": [
                    "A) Encrypting text for network safety",
                    "B) Segmenting raw character strings into discrete subword units for numerical embedding and model input",
                    "C) Checking grammatical syntax using dictionary rules",
                    "D) Compressing database files into zip format"
                ],
                "correct": "B",
                "explanation": "Tokenization converts raw language text into integer token IDs that map into vector lookup tables."
            },
            {
                "question": "In {topic}, how does the 'temperature' hyperparameter influence token sampling during generation?",
                "options": [
                    "A) It controls GPU hardware thermal throttling",
                    "B) Lower temperature concentrates probability on the top tokens (deterministic); higher temperature flattens distribution (creative/diverse)",
                    "C) It sets the maximum number of training epochs",
                    "D) It specifies the embedding vector dimension"
                ],
                "correct": "B",
                "explanation": "Temperature divides logits before softmax: low temperature yields predictable responses, while higher values increase sampling variety."
            }
        ],
        "CONCEPTUAL": [
            "Explain the training pipeline of modern models in {topic}: pre-training, supervised fine-tuning (SFT), and preference alignment (RLHF/DPO).",
            "What is next-token prediction, and how does cross-entropy loss guide model learning in {topic}?",
            "Explain the concept of 'in-context learning' and how prompt structure influences model reasoning in {topic}."
        ],
        "SHORT_ANSWER": [
            "Define the context window in {topic} and explain what happens when an input exceeds it.",
            "What is top-p (nucleus) sampling in {topic}, and how does it differ from top-k sampling?"
        ],
        "APPLICATION": [
            "How would you apply chain-of-thought (CoT) prompting in {topic} to improve multi-step mathematical problem solving?",
            "Describe how to fine-tune a base model in {topic} on domain-specific medical questions using LoRA or parameter-efficient fine-tuning."
        ],
        "SCENARIO": [
            "Scenario: A model repeats itself in an infinite loop during generation. What sampling parameter in {topic} can prevent repetitive loops?",
            "Scenario: A 7B parameter model is deployed on an edge device with limited VRAM. What quantization techniques in {topic} make this feasible?"
        ]
    }
}

# Generic fallback templates if an unknown topic name is provided
GENERIC_TEMPLATES = {
    "CONCEPTUAL": [
        "In your own words, explain the core conceptual foundation of {topic} and describe how it contributes to modern AI systems.",
        "What is the fundamental difference between traditional approaches and the methodology employed in {topic}?",
        "Describe the essential components of {topic} and explain how they interact to produce reliable results."
    ],
    "SHORT_ANSWER": [
        "Define {topic} in one or two clear sentences and name one specific technique or algorithm central to it.",
        "State two practical advantages of {topic} over earlier methods in the same problem domain."
    ],
    "MCQ": [
        {
            "question": "Which of the following statements best describes the primary objective of {topic}?",
            "options": [
                "A) Replacing all structured databases with plain text files",
                "B) Generating, transforming, or optimizing representations using learned statistical patterns",
                "C) Executing only static hardcoded rules without adapting to data",
                "D) Bypassing the need for computational resources"
            ],
            "correct": "B",
            "explanation": "{topic} utilizes learned patterns to model, process, and synthesize information effectively."
        },
        {
            "question": "A key engineering consideration when implementing {topic} in production is:",
            "options": [
                "A) The complete inability to process text or numbers",
                "B) Balancing computational efficiency, latency, accuracy, and knowledge grounding",
                "C) Requiring manual rules for every individual prediction",
                "D) Incompatibility with modern cloud infrastructure"
            ],
            "correct": "B",
            "explanation": "Production deployment of {topic} requires careful engineering around throughput, latency, and reliability."
        }
    ],
    "APPLICATION": [
        "Imagine an enterprise intelligent search application. How would you apply {topic} to solve a challenging customer workflow?",
        "How can {topic} be combined with retrieval pipelines to improve accuracy and domain coverage?"
    ],
    "SCENARIO": [
        "Scenario: A machine learning pipeline encounters noisy, unstructured inputs. How can {topic} be applied to extract reliable signal?",
        "Scenario: System latency spikes under high query load. Describe architectural strategies in {topic} to maintain responsive performance."
    ]
}


def _find_matching_topic_bank(topic_name: str) -> Optional[Dict[str, List[Any]]]:
    """Finds matching curated question bank for a topic name."""
    t_clean = topic_name.strip().lower()
    for key, bank in TOPIC_QUESTION_BANKS.items():
        k_clean = key.lower()
        if k_clean in t_clean or t_clean in k_clean:
            return bank
    return None


def generate_assessment_question(
    topic_name: str,
    difficulty: str = "INTERMEDIATE",
    question_type: Optional[str] = None,
    rag_chunks: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Generates a pedagogically grounded assessment question spanning multiple formats.
    Ensures question variety so clicking 'Try Another Question' returns different questions.
    """
    q_type = question_type.upper() if question_type else "CONCEPTUAL"
    valid_types = ["CONCEPTUAL", "SHORT_ANSWER", "MCQ", "APPLICATION", "SCENARIO"]
    if q_type not in valid_types:
        q_type = "CONCEPTUAL"

    bank = _find_matching_topic_bank(topic_name)

    if q_type == "MCQ":
        mcq_items = (bank.get("MCQ") if bank else None) or GENERIC_TEMPLATES["MCQ"]
        # Select randomly for variety on retries
        selected_item = random.choice(mcq_items)
        raw_q = selected_item["question"].format(topic=topic_name)
        # Ensure question text contains topic name for consistency and test verification
        if topic_name.lower() not in raw_q.lower():
            raw_q = f"In {topic_name}: {raw_q}"

        options = [opt.format(topic=topic_name) for opt in selected_item["options"]]
        hint = f"Focus on how {topic_name} handles contextual information compared to naive alternatives."

        return {
            "question_id": str(uuid.uuid4()),
            "question_text": raw_q,
            "question_type": "MCQ",
            "difficulty": difficulty.upper(),
            "options": options,
            "hint": hint
        }
    else:
        text_templates = (bank.get(q_type) if bank else None) or GENERIC_TEMPLATES.get(q_type, GENERIC_TEMPLATES["CONCEPTUAL"])
        selected_tmpl = random.choice(text_templates)
        question_text = selected_tmpl.format(topic=topic_name)
        if topic_name.lower() not in question_text.lower():
            question_text = f"Regarding {topic_name}: {question_text}"

        hint = f"Explain the core mechanisms of {topic_name} with concrete technical details or examples."

        return {
            "question_id": str(uuid.uuid4()),
            "question_text": question_text,
            "question_type": q_type,
            "difficulty": difficulty.upper(),
            "options": None,
            "hint": hint
        }


def evaluate_student_answer(
    question_text: str,
    question_type: str,
    student_answer: str,
    topic_name: str
) -> Dict[str, Any]:
    """
    Evaluates student response:
    - Checks correctness (0.0 to 1.0)
    - Isolates specific misconceptions
    - Provides pedagogically constructive, topic-accurate feedback
    """
    ans_lower = student_answer.lower().strip()
    misconceptions = []
    is_correct = False
    score = 0.0
    feedback = ""

    # 1. Topic-specific misconception detection
    if "opposite" in ans_lower and ("similar" in ans_lower or "negative" in ans_lower or "direction" in ans_lower):
        misconceptions.append("Confusing vector cosine similarity: semantically similar concepts have small angles and high cosine similarity, not opposite directions.")
    if "lexical" in ans_lower and "only" in ans_lower:
        misconceptions.append("Assuming embeddings perform exact word spelling checks rather than dense semantic representation.")
    if "exact size" in ans_lower or "matches length of text" in ans_lower:
        misconceptions.append("Believing vector dimensions vary with sentence length rather than conforming to fixed model dimensionality.")
    if "sequential" in ans_lower and "transformer" in topic_name.lower() and "parallel" not in ans_lower:
        misconceptions.append("Believing Transformers process sequence tokens one-by-one sequentially like RNNs rather than in parallel via self-attention.")
    if "no overlap" in ans_lower and "chunk" in topic_name.lower():
        misconceptions.append("Assuming chunks should have zero overlap, which risks truncating context across sentence boundaries.")

    # 2. Evaluation for MCQ
    if question_type == "MCQ":
        # Check selected option letter cleanly without false positives from regular words like 'databases'
        selected_letter = None
        match = re.search(r"^\s*([A-Da-d])[\)\.\:\s]", student_answer)
        if match:
            selected_letter = match.group(1).upper()
        else:
            # Check if answer starts with or specifically indicates an option
            if ans_lower.startswith("a") or ans_lower.startswith("option a"):
                selected_letter = "A"
            elif ans_lower.startswith("b") or ans_lower.startswith("option b"):
                selected_letter = "B"
            elif ans_lower.startswith("c") or ans_lower.startswith("option c"):
                selected_letter = "C"
            elif ans_lower.startswith("d") or ans_lower.startswith("option d"):
                selected_letter = "D"

        # Determine expected correct letter from matching bank
        correct_letter = "B"
        bank = _find_matching_topic_bank(topic_name)
        if bank and "MCQ" in bank:
            for item in bank["MCQ"]:
                if item["question"][:30].lower() in question_text.lower():
                    correct_letter = item.get("correct", "B")
                    break

        # Also support matching by correct semantic phrases
        high_confidence_correct_markers = [
            "small angular distances", "high cosine similarity", "learned statistical patterns",
            "multi-head self-attention", "parallel", "subword units", "preserve semantic continuity",
            "approximate nearest neighbor", "grounds generations", "autonomous routing"
        ]
        has_correct_marker = any(m in ans_lower for m in high_confidence_correct_markers)

        if selected_letter == correct_letter or (selected_letter is None and has_correct_marker):
            is_correct = True
            score = 1.0
            feedback = f"Correct! Option {correct_letter} is the right answer. In {topic_name}, this principle accurately captures the core technical mechanism."
        else:
            is_correct = False
            score = 0.0
            feedback = f"Incorrect. You selected {selected_letter or 'an incorrect option'}. The correct answer is Option {correct_letter}, which accurately represents {topic_name}."

    # 3. Evaluation for Free-Response (CONCEPTUAL, SHORT_ANSWER, APPLICATION, SCENARIO)
    else:
        if misconceptions:
            is_correct = False
            score = 0.25
            feedback = f"Your answer reflects a common misconception: {misconceptions[0]} Review the foundational concept in {topic_name} to strengthen your understanding."
        else:
            # Broad positive conceptual markers
            domain_cues = [
                "cosine", "similarity", "angle", "dense", "geometric", "semantic",
                "high-dimensional", "continuous", "vector", "distance", "synonym",
                "cluster", "proximity", "hnsw", "approximate nearest neighbor",
                "generative", "generation", "generate", "language model", "llm",
                "transformer", "attention", "self-attention", "multi-head", "query", "key", "value",
                "neural", "deep learning", "pre-trained", "fine-tuning", "prompt", "token",
                "tokenization", "inference", "context", "context window",
                "retrieval", "augmented", "rag", "knowledge base", "grounding", "chunk",
                "chunking", "overlap", "indexed", "retrieved", "agent", "agentic", "routing",
                "multi-step", "reasoning", "reflection", "re-ranker", "cross-encoder",
                "pattern", "learned", "training", "dataset", "model", "output",
                "architecture", "encoder", "decoder", "embedding", "representation",
                "probabilistic", "distribution",
                topic_name.lower()
            ]
            matches = sum(1 for cue in domain_cues if cue in ans_lower)

            if len(ans_lower) >= 15 and matches >= 2:
                is_correct = True
                score = 1.0
                feedback = f"Excellent explanation! You accurately articulated key concepts and mechanisms in {topic_name}."
            elif matches >= 1 or len(ans_lower) >= 30:
                is_correct = True
                score = 0.75
                feedback = f"Good understanding of {topic_name}. You captured the core ideas — consider including more specific technical algorithms or practical examples."
            else:
                is_correct = False
                score = 0.25
                feedback = f"Your answer missed foundational principles in {topic_name}. Try explaining specific components, how the model operates, or practical use cases."

    identified_misconception = misconceptions[0] if misconceptions else None

    return {
        "is_correct": is_correct,
        "score": score,
        "feedback": feedback,
        "identified_misconception": identified_misconception
    }
