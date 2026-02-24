---
phase: 1
status: complete
---

# Phase 1: Canonical Names

## Unified Phase Enum

| Phase | Trigger | Analysis Flow | Output File |
|-------|---------|---------------|-------------|
| `RFP_RECEIVED` | User pastes/provides RFP | Flow 1: RFP_INITIAL | `01_raw_rfp.md` |
| `ANALYZING` | Raw RFP saved | Flow 1: Problem Reconstruction, Complexity Radar, Risk | `02_analysis.md` |
| `QNA_GENERATION` | Analysis complete | Flow 2: Critical/Arch/Operation questions | `03_questions.md` |
| `WAITING_CLIENT` | Questions sent | Flow 3: Wait or Draft decision | — |
| `DRAFTING` | User chose "build now" (no answers) | Flow 3 → safe assumptions | `05_proposal.md` (with assumptions) |
| `CLIENT_ANSWERED` | User pastes client reply | Flow 4: Answer Impact Analysis | `04_client_answers.md` |
| `PROPOSAL_UPDATE` | Answers analyzed OR draft needs revision | Flow 5: Scope + MVP update | `05_proposal.md` (rewrite) |
| `SCOPE_FREEZE` | Proposal stable | Flow 6: Freeze checklist, confidence level | `06_scope_freeze.md` |

Note: `07_decisions.md` is append-only across ALL phases. No phase owns it exclusively.

## Unified File Scheme

```
rfp/<project-name>/
  00_status.md          # Phase tracking, blocking issues, assumptions
  01_raw_rfp.md         # Original RFP (append-only, never rewrite)
  02_analysis.md        # Problem reconstruction, complexity radar, risks
  03_questions.md       # Grouped Q&A for client (full rewrite each round)
  04_client_answers.md  # Client replies (append-only, round-based)
  05_proposal.md        # Scope, architecture suggestion, phases (full rewrite)
  06_scope_freeze.md    # Freeze checklist, contract dangers, confidence
  07_decisions.md       # Engineering decision log (append-only)
```

## Flow-to-File Mapping

| rfp-loop.md Flow | Reads | Writes |
|------------------|-------|--------|
| Flow 1: RFP_INITIAL | `01_raw_rfp.md` | `02_analysis.md` |
| Flow 2: QNA_GENERATION | `01_raw_rfp.md`, `02_analysis.md` | `03_questions.md` |
| Flow 3: WAITING_OR_DRAFTING | `02_analysis.md`, `03_questions.md` | `05_proposal.md` (if drafting) |
| Flow 4: CLIENT_RESPONSE | `04_client_answers.md`, `02_analysis.md` | `02_analysis.md` (updated) |
| Flow 5: PROPOSAL_UPDATE | `01`, `02`, `03`, `04` | `05_proposal.md` |
| Flow 6: SCOPE_STABILIZATION | `05_proposal.md`, `02_analysis.md` | `06_scope_freeze.md` |

## Sekkei Chain Handoff

When `SCOPE_FREEZE` complete with confidence HIGH or MEDIUM:
- `05_proposal.md` → input for `/sekkei:functions-list`
- `02_analysis.md` → supplementary context
- `rfp/<project>/` stays separate from `sekkei-docs/` (presales ≠ specs)

## Decisions (locked)

- **Workspace path**: `sekkei-docs/rfp/<project-name>/` (co-located with Sekkei output)
- **mockups.md**: Dropped. Screen flow handled by `/sekkei:sitemap` later in chain.
- **File structure**: 3 separate files (command.md, manager.md, rfp-loop.md), each under 200 lines.
