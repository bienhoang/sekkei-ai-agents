# Phase 5 — Tests & Validation

## Context Links

- Existing tests: `sekkei/packages/mcp-server/tests/unit/rfp-state-machine.test.ts`
- Existing tests: `sekkei/packages/mcp-server/tests/unit/rfp-workspace-tool.test.ts`
- Test pattern: `sekkei/packages/mcp-server/CLAUDE.md` (Testing Pattern section)
- Jest config: `sekkei/packages/mcp-server/jest.config.cjs`

## Overview

- **Priority:** P1
- **Status:** complete
- **Description:** Add unit tests for backward transitions, multi-round Q&A, decision logging, generate-config action, and history tracking from Phases 1 and 4

## Key Insights

1. **Existing test files cover happy path.** `rfp-state-machine.test.ts` tests forward transitions, workspace creation, file write rules, phase recovery. `rfp-workspace-tool.test.ts` tests all 5 actions.
2. **No tests for edge cases.** Missing: invalid transitions, status file corruption recovery, concurrent writes, empty workspace handling.
3. **Test pattern established.** Uses Jest + ESM, `(server as any)._registeredTools` pattern, tmp dir cleanup.
4. **New features need coverage:** backward transitions, `history` action, `back` action, `generate-config` action, qna_round increment, decision auto-logging.

## Requirements

### Functional

- FR1: Test all new backward transition edges are valid
- FR2: Test backward transitions are rejected without proper source phase
- FR3: Test qna_round increments on each QNA_GENERATION entry
- FR4: Test decision auto-logging writes to 07_decisions.md
- FR5: Test `history` action returns correct phase log
- FR6: Test `back` action transitions to previous phase
- FR7: Test `generate-config` action produces valid YAML
- FR8: Test old status files (missing new fields) parse with defaults
- FR9: Test phase recovery with multi-round Q&A workspace state

### Non-Functional

- NF1: All tests in existing test files (extend, don't create new files unless >200 lines)
- NF2: Tests use tmp dir pattern, clean up in afterAll
- NF3: Each test case under 20 lines

## Architecture

Extend existing test files. If `rfp-state-machine.test.ts` exceeds 200 lines, split backward transition tests into `rfp-backward-transitions.test.ts`.

### Test Organization

```
rfp-state-machine.test.ts
  ├── existing tests (keep)
  ├── describe("backward transitions")
  │   ├── CLIENT_ANSWERED -> ANALYZING
  │   ├── CLIENT_ANSWERED -> QNA_GENERATION
  │   ├── PROPOSAL_UPDATE -> QNA_GENERATION
  │   ├── invalid backward: RFP_RECEIVED -> SCOPE_FREEZE
  │   └── SCOPE_FREEZE has no backward edges
  ├── describe("qna_round tracking")
  │   ├── increments on QNA_GENERATION entry
  │   ├── does not increment on other transitions
  │   └── persists across status read/write
  ├── describe("decision auto-logging")
  │   ├── appends entry on transition
  │   ├── includes from/to phases and date
  │   └── does not duplicate on same transition
  └── describe("status backward compatibility")
      ├── old format (no qna_round) parses with default 0
      └── old format (no phase_history) parses with default []

rfp-workspace-tool.test.ts
  ├── existing tests (keep)
  ├── describe("history action")
  │   ├── returns empty array for new workspace
  │   └── returns entries after transitions
  ├── describe("back action")
  │   ├── transitions to previous phase
  │   ├── fails on RFP_RECEIVED (no previous)
  │   └── requires workspace to exist
  └── describe("generate-config action")
      ├── generates valid YAML
      ├── maps system type to project.type
      ├── extracts features from proposal
      └── fails if scope freeze not reached
```

## Related Code Files

| Action | File |
|--------|------|
| Modify | `tests/unit/rfp-state-machine.test.ts` — backward transitions, qna_round, decisions, compat |
| Modify | `tests/unit/rfp-workspace-tool.test.ts` — history, back, generate-config actions |
| Create | `tests/unit/rfp-backward-transitions.test.ts` — only if state machine tests exceed 200 lines |

## Implementation Steps

1. Read existing test files to understand current coverage and patterns
2. Add `describe("backward transitions")` block in `rfp-state-machine.test.ts`:
   - Test `validateTransition("CLIENT_ANSWERED", "ANALYZING")` returns true
   - Test `validateTransition("CLIENT_ANSWERED", "QNA_GENERATION")` returns true
   - Test `validateTransition("PROPOSAL_UPDATE", "QNA_GENERATION")` returns true
   - Test `validateTransition("RFP_RECEIVED", "SCOPE_FREEZE")` returns false
   - Test `validateTransition("SCOPE_FREEZE", "ANALYZING")` returns false
3. Add `describe("qna_round tracking")` block:
   - Create workspace, transition to QNA_GENERATION, verify qna_round = 1
   - Transition forward then back to QNA_GENERATION, verify qna_round = 2
   - Read status, verify qna_round persisted
4. Add `describe("decision auto-logging")` block:
   - Transition, read `07_decisions.md`, verify entry exists
   - Verify entry format: date, from, to
5. Add `describe("status backward compatibility")` block:
   - Write old-format status YAML (no qna_round, no phase_history)
   - Call `readStatus()`, verify defaults applied
6. Add `describe("history action")` in `rfp-workspace-tool.test.ts`:
   - New workspace: history is empty
   - After 3 transitions: history has 3 entries
7. Add `describe("back action")`:
   - Transition to ANALYZING, call back, verify RFP_RECEIVED
   - Call back on RFP_RECEIVED, verify error
8. Add `describe("generate-config action")`:
   - Write analysis + proposal with feature table, call generate-config
   - Verify output is valid YAML with project type and features
   - Call generate-config before SCOPE_FREEZE, verify error
9. Run all tests, verify no regressions

## Todo List

- [x] Add backward transition validation tests
- [x] Add qna_round tracking tests
- [x] Add decision auto-logging tests
- [x] Add status backward compatibility tests
- [x] Add history action tests
- [x] Add back action tests
- [x] Add generate-config action tests
- [x] Run full test suite, verify no regressions
- [x] Check file sizes, split if >200 lines

## Success Criteria

- All new tests pass
- Existing tests unbroken
- Coverage for every new ALLOWED_TRANSITIONS edge
- Coverage for backward-compatible status parsing
- `npm test` passes clean

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Tests depend on Phase 1/4 implementation | High | Write tests first (TDD), implement to pass |
| Test files grow too large | Medium | Split at 200-line threshold |
| Flaky tests from tmp dir races | Low | Use unique tmp dirs per describe block |

## Security Considerations

- Tests run in isolated tmp directories
- No network calls, no external dependencies
- Tmp files cleaned in afterAll

## Next Steps

- Tests should be written first (TDD approach) or in parallel with Phase 1/4
- After all tests pass, the feature is ready for code review
