# Phase 1 — State Machine Enhancements

## Context Links

- State machine: `sekkei/packages/mcp-server/src/lib/rfp-state-machine.ts`
- Tool handler: `sekkei/packages/mcp-server/src/tools/rfp-workspace.ts`
- Types: `sekkei/packages/mcp-server/src/types/documents.ts`
- Manager spec: `sekkei/packages/skills/content/references/rfp-manager.md`

## Overview

- **Priority:** P1
- **Status:** complete
- **Description:** Add backward transitions, multi-round Q&A loop, and automatic decision logging to the RFP state machine

## Key Insights

1. **Forward-only is too rigid.** Current `ALLOWED_TRANSITIONS` map has no backward edges. User cannot re-analyze after receiving client answers that change scope significantly, or regenerate questions after updating analysis.
2. **Multi-round Q&A is common.** Real presales involves 2-5 Q&A rounds. Current model supports one round only (`WAITING_CLIENT` -> `CLIENT_ANSWERED` -> `PROPOSAL_UPDATE`). Need a loop back to `QNA_GENERATION`.
3. **`07_decisions.md` is never written.** No flow writes to it. Decision logging should be automatic on phase transitions.
4. **Status file lacks history.** Only stores current phase. No audit trail of when phases were entered/exited.

## Requirements

### Functional

- FR1: Allow backward transitions for re-analysis (`CLIENT_ANSWERED` -> `ANALYZING`)
- FR2: Allow re-entering Q&A loop (`CLIENT_ANSWERED` -> `QNA_GENERATION` or `PROPOSAL_UPDATE` -> `QNA_GENERATION`)
- FR3: Track Q&A round number in `00_status.md`
- FR4: Auto-append decision entries to `07_decisions.md` on each phase transition
- FR5: Add `history` action to `manage_rfp_workspace` tool that returns phase transition log
- FR6: Add `back` action that transitions to previous phase (with guardrails)

### Non-Functional

- NF1: No breaking changes to existing valid transitions
- NF2: Backward transitions require explicit `force: true` flag to prevent accidental regression
- NF3: Decision log entries are idempotent (re-entering same phase does not duplicate)

## Architecture

### Extended Transition Graph

```
RFP_RECEIVED -> ANALYZING
ANALYZING -> QNA_GENERATION
QNA_GENERATION -> WAITING_CLIENT
WAITING_CLIENT -> DRAFTING | CLIENT_ANSWERED
DRAFTING -> PROPOSAL_UPDATE
CLIENT_ANSWERED -> PROPOSAL_UPDATE | ANALYZING (backward) | QNA_GENERATION (backward)
PROPOSAL_UPDATE -> SCOPE_FREEZE | QNA_GENERATION (backward)
SCOPE_FREEZE -> (terminal)
```

### Extended RfpStatus Type

```typescript
export interface RfpStatus {
  project: string;
  phase: RfpPhase;
  last_update: string;
  next_action: string;
  blocking_issues: string[];
  assumptions: string[];
  // NEW fields:
  qna_round: number;           // starts at 0, incremented on each QNA_GENERATION entry
  phase_history: PhaseEntry[];  // ordered list of phase transitions
}

interface PhaseEntry {
  phase: RfpPhase;
  entered: string;  // ISO date
  reason?: string;  // why transitioned
}
```

### Decision Log Auto-Write

On every `transition` action, append to `07_decisions.md`:

```markdown
## YYYY-MM-DD — Phase: FROM -> TO
- **Decision:** {transition reason or "Phase progression"}
- **Impact:** {any noted impact}
```

## Related Code Files

| Action | File |
|--------|------|
| Modify | `src/lib/rfp-state-machine.ts` — add backward transitions to ALLOWED_TRANSITIONS, add history tracking, add decision auto-log |
| Modify | `src/tools/rfp-workspace.ts` — add `history` and `back` actions, extend input schema |
| Modify | `src/types/documents.ts` — extend RfpStatus with qna_round, phase_history |
| Modify | `skills/content/references/rfp-manager.md` — document new transitions and actions |

## Implementation Steps

1. Extend `RfpStatus` interface in `documents.ts` with `qna_round` (default 0) and `phase_history` (default [])
2. Update `ALLOWED_TRANSITIONS` map: add backward edges from `CLIENT_ANSWERED` and `PROPOSAL_UPDATE`
3. Add `BACKWARD_TRANSITIONS` set to distinguish forward vs backward moves
4. Update `serializeStatusYaml` / `parseStatusYaml` to handle new fields
5. Add `appendDecision(wsPath, from, to, reason?)` function in state machine
6. Hook `appendDecision` into the `transition` case of `handleRfpWorkspace`
7. Add `history` action: reads `00_status.md`, returns `phase_history` array
8. Add `back` action: reads current phase, finds previous phase from history, validates and transitions
9. Increment `qna_round` when transitioning TO `QNA_GENERATION`
10. Update `RFP_ACTIONS` const to include `"history"` and `"back"`
11. Update Zod input schema for new actions

## Todo List

- [x] Extend RfpStatus type with qna_round and phase_history
- [x] Add backward transition edges to ALLOWED_TRANSITIONS
- [x] Update YAML serializer/parser for new fields
- [x] Implement appendDecision helper
- [x] Add history action handler
- [x] Add back action handler with force flag
- [x] Increment qna_round on QNA_GENERATION entry
- [x] Update rfp-manager.md skill doc
- [x] Backward-compatible: old status files without new fields parse safely

## Success Criteria

- Existing forward transitions still work unchanged
- Can transition CLIENT_ANSWERED -> ANALYZING for re-analysis
- Can loop PROPOSAL_UPDATE -> QNA_GENERATION for multi-round Q&A
- `07_decisions.md` gets entries on every transition
- `history` action returns full phase log
- `back` action requires explicit intent, not accidental

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Backward transitions cause infinite loops | Medium | Limit backward count per session; log warnings |
| Old workspaces missing new fields | Low | Default qna_round=0, phase_history=[] in parser |
| Decision log grows large | Low | Append-only is fine; each entry is ~3 lines |

## Security Considerations

- No new external inputs beyond existing Zod validation
- `back` action uses `force` boolean, not arbitrary phase selection
- Path traversal prevention already handled by workspace_path validation

## Next Steps

- Phase 3 (UX) will expose these transitions via clearer prompts
- Phase 5 (Tests) will add unit tests for backward transitions
