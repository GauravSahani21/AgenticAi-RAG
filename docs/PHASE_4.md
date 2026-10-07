# Phase 4: Agentic Tutoring (Adaptive Pedagogical Loop)

## 1. Objectives Completed
- Implemented core agent actions: `EXPLAIN`, `SIMPLIFY`, `EXAMPLE`, `HINT`, `ASK_QUESTION`, `PRACTICE`, `QUIZ`, `REVISE`, `PREREQUISITE`, and `DEEPER_CONCEPT`.
- Built the Agentic Decision Loop (`app/ai/agent_loop.py`):
  1. Student input analysis & intent detection
  2. Comprehension level classification (`UNDERSTANDS`, `PARTIALLY_UNDERSTANDS`, `STRUGGLES`, `REPEATEDLY_STRUGGLES`)
  3. Dynamic teaching strategy selection
  4. Structured pedagogical response synthesis grounded in ChromaDB course chunks
  5. Session persistence of student turns, agent actions, and strategy labels
- Applied database schema migration adding `strategy_label` to `interactions`.
- Added visible `Teaching Strategy: <Strategy Label>` badges in `TutorChat.tsx` without exposing internal chain-of-thought.
- Verified differentiated behavior for high-mastery vs. low-mastery students across automated pytest suites and live demonstrations.

---

## 2. Decision Loop Architecture

```text
[ Student Message ]
         │
         ▼
[ analyze_student_input() ]
         ├── Linguistic cues (confusion vs. inquiry vs. advanced tradeoffs)
         ├── Historical turns & repeated struggles
         └── Proficiency hint / Topic mastery
         │
         ▼
[ select_teaching_strategy() ]
         ├── UNDERSTANDS           ──> DEEPER_CONCEPT / PRACTICE / QUIZ
         ├── PARTIALLY_UNDERSTANDS ──> EXAMPLE / ASK_QUESTION / SIMPLIFY
         ├── STRUGGLES             ──> SIMPLIFY / HINT / PREREQUISITE
         └── REPEATEDLY_STRUGGLES  ──> PREREQUISITE / REMEDIAL EXPLANATION
         │
         ▼
[ Academic Context Grounding (ChromaDB) ]
         │
         ▼
[ Response Generation (OpenRouter / Structured Fallback) ]
         │
         ▼
[ Persistence & UI Delivery ]
         ├── action: "DEEPER_CONCEPT" | "PREREQUISITE" | "ASK_QUESTION" ...
         ├── strategy_label: "Foundational Prerequisite Scaffolding" ...
         └── UI Badge: "Teaching Strategy: <Strategy Label>"
```

---

## 3. Verified Student Behaviors

### Student A: High Mastery Profile
- **Prompt**: *"How does vector dimensionality affect computational complexity and indexing tradeoffs?"*
- **Action**: `DEEPER_CONCEPT`
- **Strategy Label**: `Deep Technical & Architectural Exploration`
- **Behavior**: Challenges the student with asymptotic time complexity (\(O(N)\) vs \(O(\log N)\)), HNSW graph indexing, and recall-latency tradeoffs in high-dimensional vector spaces.

### Student B: Struggling / Low Mastery Profile
- **Prompt**: *"I don't understand embeddings at all, it feels too complex and confusing."*
- **Action**: `PREREQUISITE`
- **Strategy Label**: `Foundational Prerequisite Scaffolding`
- **Behavior**: Steps back to simpler foundations (ordered lists of numbers, mapping coordinates) before connecting back to dense vector embeddings.
