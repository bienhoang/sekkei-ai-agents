---
phase: 4
status: complete
target: plans/rfp-command/command.md
---

# Phase 4: Rewrite command.md (Entrypoint)

## Role
Slash command entrypoint. Router. UX controller. Delegates to manager.md for state, rfp-loop.md for analysis.

## Changes from Current

1. **Trim**: From 482 lines → ~150 lines
2. **Remove**: All file management rules (in manager.md)
3. **Remove**: All analysis logic (in rfp-loop.md)
4. **Remove**: mockups.md references
5. **Add**: Explicit delegation model
6. **Add**: Sekkei chain context
7. **Align**: Phase names, file names to canonical

## Rewrite Outline (~150 lines)

```
# /sekkei:rfp — Presales RFP Lifecycle Command

## Purpose
End-to-end presales workflow: receive RFP → analyze → Q&A → proposal → scope freeze.
Resumable. Deterministic. File-based state.

## Architecture
3-layer system:
- THIS FILE: routing, UX, delegation
- manager.md: workspace state, files, persistence
- rfp-loop.md: presales analysis, risk, Q&A generation

## Entrypoint Behavior
1. Delegate to MANAGER: load workspace / initialize
2. Read current phase from 00_status.md
3. Route to correct ANALYSIS flow
4. Delegate to MANAGER: save output, update phase
5. Present result to user

## Routing Table
| Current Phase    | Action                          | Delegate To    |
|------------------|---------------------------------|----------------|
| (no workspace)   | Init workspace, ask for RFP     | MANAGER        |
| RFP_RECEIVED     | Run analysis                    | ANALYSIS Flow 1|
| ANALYZING        | Generate Q&A                    | ANALYSIS Flow 2|
| QNA_GENERATION   | Ask: wait or draft?             | UX (this file) |
| WAITING_CLIENT   | Check for client answers         | UX (this file) |
| DRAFTING         | Draft with assumptions          | ANALYSIS Flow 3|
| CLIENT_ANSWERED  | Analyze answers, update reqs    | ANALYSIS Flow 4|
| PROPOSAL_UPDATE  | Update proposal                 | ANALYSIS Flow 5|
| SCOPE_FREEZE     | Finalize + handoff prompt       | ANALYSIS Flow 6|

## User Interaction Patterns
Style: project manager. Short. No explanations.

INIT:
  "Project name?" → create workspace → "Paste RFP."

WAITING_CLIENT:
  "Client replied? Paste answer or type BUILD_NOW."

SCOPE_FREEZE complete:
  "Scope frozen. Confidence: {level}. Run /sekkei:functions-list? [Y/n]"

OVERWRITE CHECK:
  If file exists and phase re-entered:
  "Overwrite {file}? [Y/n]"

## Design Principles
- Success = no surprise during development
- Presales manager + BA + solution architect + workflow engine
- Files are truth, not chat history
- Every step saves state immediately

## Sekkei Integration
- Workspace: sekkei-docs/rfp/<project>/
- Chain handoff: 05_proposal.md → input for /sekkei:functions-list
- 02_analysis.md → supplementary context
- rfp workspace stays separate from spec docs (presales ≠ specifications)
```

## Removal List (from current command.md)
- Entire "FILE CONTENT RULES" section (in manager.md)
- Entire "WORKFLOW STATE MACHINE" details (split: routing here, logic in rfp-loop)
- "FAILURE RECOVERY RULE" (in manager.md)
- "INITIALIZATION LOGIC" details (in manager.md, referenced here)
- Duplicate design principles (keep one copy here)
