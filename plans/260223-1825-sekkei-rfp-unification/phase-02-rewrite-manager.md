---
phase: 2
status: complete
target: plans/rfp-command/manager.md
---

# Phase 2: Rewrite manager.md (State Layer)

## Role
Workspace state controller. Manages files, phases, persistence, resume. Never analyzes. Never advises.

## Changes from Current

1. **Workspace path**: `rfp/` → `sekkei-docs/rfp/<project-name>/`
2. **Phase enum**: Align to canonical (8 phases from Phase 1)
3. **Drop**: mockups references
4. **Add**: Flow-to-file mapping table (so entrypoint knows which file each analysis flow writes)
5. **Add**: Sekkei chain handoff rule (when SCOPE_FREEZE → notify user about `/sekkei:functions-list`)

## Rewrite Outline (~150 lines)

```
# RFP Workspace Manager

## Role
State controller. File persistence. Phase tracking. Resume.
NOT analysis. NOT architecture.

## Workspace
sekkei-docs/rfp/<project-name>/
  00_status.md
  01_raw_rfp.md
  02_analysis.md
  03_questions.md
  04_client_answers.md
  05_proposal.md
  06_scope_freeze.md
  07_decisions.md

## Status File Schema (00_status.md)
project: <name>
phase: <enum>
last_update: YYYY-MM-DD
next_action: <instruction>
blocking_issues: []
assumptions: []

## Phase Enum
RFP_RECEIVED → ANALYZING → QNA_GENERATION → WAITING_CLIENT →
DRAFTING | CLIENT_ANSWERED → PROPOSAL_UPDATE → SCOPE_FREEZE

## Phase Transition Rules
Only change phase AFTER successful file write.
- RFP_RECEIVED: when 01_raw_rfp.md created
- ANALYZING: when 02_analysis.md created
- QNA_GENERATION: when 03_questions.md created
- WAITING_CLIENT: after questions delivered
- DRAFTING: user chose build-now (no client answers)
- CLIENT_ANSWERED: when 04_client_answers.md appended
- PROPOSAL_UPDATE: when 05_proposal.md written/rewritten
- SCOPE_FREEZE: when 06_scope_freeze.md complete

## File Write Rules
01_raw_rfp.md     → append-only
02_analysis.md    → full rewrite
03_questions.md   → full rewrite
04_client_answers.md → append-only (round-based)
05_proposal.md    → full rewrite
06_scope_freeze.md → checklist, never remove fields
07_decisions.md   → append-only

## Startup Behavior
1. Check workspace exists
2. Load 00_status.md
3. Verify required files for current phase exist
4. Report: phase, next_action, any inconsistencies

## Recovery
If file missing for current phase:
→ Report inconsistency, block until resolved

## Sekkei Chain Handoff
When SCOPE_FREEZE reached + confidence HIGH/MEDIUM:
→ Prompt user: "Ready for /sekkei:functions-list. Input: 05_proposal.md"
```

## Removal List (from current manager.md)
- User commands section (moves to command.md)
- Tone section (moves to command.md)
