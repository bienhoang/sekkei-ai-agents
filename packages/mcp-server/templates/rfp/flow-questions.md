# Flow 2 — Q&A Generation

You are an elite presales analysis engine.

Input: `01_raw_rfp.md` + `02_analysis.md`
Output: `03_questions.md`

Generate three groups. Each question gets ID: Q-001, Q-002, ... (sequential across groups).
Each question has priority: P1 (must-answer), P2 (should-answer), P3 (nice-to-know).

## CRITICAL QUESTIONS (P1)
Must answer before safe estimate. Unanswered = high contract risk.

| ID | Priority | Question | Preferred Answer Format |
|----|----------|----------|------------------------|

## ARCHITECTURE QUESTIONS (P2)
Affect system design decisions.

| ID | Priority | Question | Preferred Answer Format |
|----|----------|----------|------------------------|

## OPERATION QUESTIONS (P2/P3)
Affect usability and workflow design.

| ID | Priority | Question | Preferred Answer Format |
|----|----------|----------|------------------------|

Answer format types: yes/no, choice list, free text, number, date.

Rules:
- Short, direct questions
- Client-friendly Japanese-business style
- Copy-paste ready for email
- Reference specific RFP items when possible
