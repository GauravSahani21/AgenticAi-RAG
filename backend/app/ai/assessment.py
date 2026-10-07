import re
import json
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
        # Boost mastery
        # e.g., Beginner = +7.0, Intermediate = +8.75, Advanced = +10.5
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
    # Status progression rules:
    if new_mastery >= 80.0 and new_attempts >= 3:
        status = "MASTERED"
    elif new_mastery >= 65.0 and new_attempts >= 3:
        status = "IMPROVING"
    elif new_mastery < 50.0 and new_attempts >= 3 and (new_incorrect > new_correct or new_mastery < 40.0):
        # Struggling or intervention required
        if new_attempts >= 4 and new_mastery < 40.0:
            status = "INTERVENTION_REQUIRED"
        else:
            status = "STRUGGLING"
    elif new_attempts > 0:
        status = "LEARNING"
    else:
        status = "NOT_STARTED"

    return round(new_mastery, 1), round(new_confidence, 2), status

QUESTION_BANK_TEMPLATES = {
    "CONCEPTUAL": [
        "In your own words, explain how {topic} operates and why high-dimensional representations are necessary in modern language models.",
        "What is the fundamental difference between discrete token matching and continuous representations in {topic}?"
    ],
    "SHORT_ANSWER": [
        "Define the primary mathematical formula or distance metric used to evaluate conceptual similarity in {topic}.",
        "State two computational advantages of using dense vectors over sparse bag-of-words representations in {topic}."
    ],
    "MCQ": [
        "Which of the following best describes the geometric behavior of {topic}?\nA) Vectors of similar concepts point in opposite directions\nB) Vectors of similar concepts form small angular distances (high cosine similarity)\nC) Dimension sizes must always match the length of the raw input text\nD) Distance between vectors is invariant to dimensionality",
    ],
    "APPLICATION": [
        "Imagine an e-commerce catalog search system. How would you apply {topic} to retrieve relevant products when customers use vague synonyms?",
        "How can {topic} be utilized to cluster unstructured academic research papers into relevant domain categories?"
    ],
    "SCENARIO": [
        "Scenario: A search model frequently returns completely unrelated results for homonyms (e.g. 'Apple' company vs 'apple' fruit). How can contextualized {topic} solve this failure mode?",
        "Scenario: A database contains 10 million vector records. Exact linear search takes 2 seconds per query. Describe how indexing techniques alleviate this latency in {topic}."
    ]
}

def generate_assessment_question(
    topic_name: str,
    difficulty: str = "INTERMEDIATE",
    question_type: Optional[str] = None,
    rag_chunks: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """Generates an assessment question spanning multiple formats (never only MCQs)."""
    q_type = question_type.upper() if question_type else "CONCEPTUAL"
    valid_types = ["CONCEPTUAL", "SHORT_ANSWER", "MCQ", "APPLICATION", "SCENARIO"]
    if q_type not in valid_types:
        q_type = "CONCEPTUAL"

    templates = QUESTION_BANK_TEMPLATES.get(q_type, QUESTION_BANK_TEMPLATES["CONCEPTUAL"])
    question_text = templates[0].format(topic=topic_name)

    options = None
    if q_type == "MCQ":
        options = [
            "A) Vectors of similar concepts point in opposite directions",
            "B) Vectors of similar concepts form small angular distances (high cosine similarity)",
            "C) Dimension sizes must always match the length of the raw input text",
            "D) Distance between vectors is invariant to dimensionality"
        ]

    hint = f"Focus on how {topic_name} maps conceptual relationships into geometric distances."

    return {
        "question_id": str(uuid.uuid4()),
        "question_text": question_text,
        "question_type": q_type,
        "difficulty": difficulty.upper(),
        "options": options,
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
    - Provides pedagogically constructive feedback
    """
    ans_lower = student_answer.lower().strip()

    # Rule-based / semantic heuristics for robust evaluation
    misconceptions = []
    is_correct = False
    score = 0.0

    # Common misconception patterns
    if "opposite" in ans_lower and "similar" in ans_lower:
        misconceptions.append("Confusing cosine similarity direction: similar concepts have parallel/small angles, not opposite.")
    if "lexical" in ans_lower or "spelling" in ans_lower:
        misconceptions.append("Assuming vector representations evaluate word spelling rather than semantic contextual meaning.")
    if "exact size" in ans_lower or "matches length of text" in ans_lower:
        misconceptions.append("Believing vector dimensionality changes per sentence rather than having fixed model dimensions.")

    # Check for correct understanding markers
    positive_cues = [
        "cosine", "similarity", "angle", "dense", "geometric", "semantic", 
        "high-dimensional", "continuous", "vector", "distance", "synonym", 
        "cluster", "proximity", "hnsw", "approximate nearest neighbor", "b)"
    ]
    matches = sum(1 for cue in positive_cues if cue in ans_lower)

    if question_type == "MCQ":
        if "b" in ans_lower or "high cosine similarity" in ans_lower:
            is_correct = True
            score = 1.0
            feedback = "Correct! In embedding spaces, semantically related concepts yield high cosine similarity (small angular distance)."
        else:
            is_correct = False
            score = 0.0
            feedback = "Incorrect. The correct answer is B. Semantically similar vectors form small angles with high cosine similarity."
    else:
        if misconceptions:

            is_correct = False
            score = 0.25
            feedback = f"Your answer reflects a common misconception: {misconceptions[0]} Remember that in {topic_name}, vectors of similar concepts align closely rather than pointing in opposite directions."
        elif len(ans_lower) > 15 and matches >= 2:
            is_correct = True
            score = 1.0
            feedback = f"Excellent explanation! You accurately articulated the semantic and geometric principles of {topic_name}."
        elif matches >= 1:
            is_correct = True
            score = 0.75
            feedback = f"Good grasp of {topic_name}. You identified key concepts; consider expanding further on how coordinate proximity represents semantic relation."
        else:
            is_correct = False
            score = 0.25
            feedback = f"Your answer missed the core intuition of {topic_name}. Remember that concepts are represented as coordinates where geometric proximity indicates semantic similarity."


    identified_misconception = misconceptions[0] if misconceptions else None

    return {
        "is_correct": is_correct,
        "score": score,
        "feedback": feedback,
        "identified_misconception": identified_misconception
    }
