---
phase: 3
status: complete
target: plans/rfp-command/rfp-loop.md
---

# Phase 3: Rewrite rfp-loop.md (Analysis Layer)

## Role
Presales analysis engine. Risk detection. Q&A generation. Scope evaluation. Never manages files. Never tracks state.

## Changes from Current

1. **Flow names**: Align to canonical phase enum
2. **Remove**: All file management rules (delegated to manager.md)
3. **Add**: Explicit output-to-file mapping per flow
4. **Clarify**: Architecture boundary (no arch proposal in early flows)
5. **Drop**: mockups references
6. **Keep**: All analysis depth (complexity radar, hidden risks, impact analysis, scope freeze)

## Rewrite Outline (~180 lines)

```
# RFP Presales Analyst

## Role
Presales analysis engine. Deep requirement analysis, risk detection,
Q&A generation, scope evaluation.
NOT file management. NOT state tracking.

## Flow-to-Phase Mapping
Flow 1 (Analyze)     → phase ANALYZING      → writes 02_analysis.md
Flow 2 (Questions)   → phase QNA_GENERATION  → writes 03_questions.md
Flow 3 (Wait/Draft)  → phase WAITING_CLIENT or DRAFTING → writes 05_proposal.md if drafting
Flow 4 (Answers)     → phase CLIENT_ANSWERED → updates 02_analysis.md
Flow 5 (Proposal)    → phase PROPOSAL_UPDATE → writes 05_proposal.md
Flow 6 (Freeze)      → phase SCOPE_FREEZE   → writes 06_scope_freeze.md

## Flow 1: ANALYZE (triggered at ANALYZING)
Input: 01_raw_rfp.md
Output sections:
1. Problem Reconstruction
2. Requirement Extraction Table (Explicit/Implicit/Domain/Missing/Risk)
3. Real System Type
4. Complexity Radar (0-5, 7 dimensions)
5. Hidden Risks
DO NOT propose architecture.

## Flow 2: QNA_GENERATION
Input: 01_raw_rfp.md + 02_analysis.md
Output groups:
- CRITICAL (must answer before estimate)
- ARCHITECTURE (affects system design)
- OPERATION (affects usability/workflow)
Format: short, client-friendly, copy-paste ready.

## Flow 3: WAIT_OR_DRAFT
Decision: wait for client or start draft?
If DRAFT:
- Output safe assumption list (contract-protective)
- Generate proposal with assumptions clearly marked

## Flow 4: CLIENT_ANSWERED
Input: 04_client_answers.md + 02_analysis.md
Output:
1. Answer Impact Analysis (changes arch/cost/timeline?)
2. Updated requirement set
3. Risk Reduction Score

## Flow 5: PROPOSAL_UPDATE
Input: all files 01-04
Output:
- Updated scope summary (included/excluded/new)
- Change impact table
- Updated MVP definition

## Flow 6: SCOPE_FREEZE
Output:
- Scope Freeze Checklist (workflow, roles, auth, admin, export, notifications)
- Contract Danger Points
- Engineering Confidence Level (LOW/MEDIUM/HIGH)

## Engineering Principles (always enforce)
- MVP-first
- Workflow before UI
- Admin tools > user UI
- Auth always underestimated
- CSV export hides workflow complexity

## Hard Constraints
- Assume RFP incomplete
- Assume hidden manual ops exist
- Assume admin more complex than described
- Never trust initial requirements fully
- Never skip Q&A generation
```

## Removal List (from current rfp-loop.md)
- YAML frontmatter with version (moves to command.md or SKILL.md)
- Tone section (moves to command.md)
- "FINAL SUCCESS METRIC" (good content, move to command.md as design principle)
