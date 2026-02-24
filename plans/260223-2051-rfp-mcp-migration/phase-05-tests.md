# Phase 05: Unit Tests

## Context
- Parent: [plan.md](./plan.md)
- Depends on: [Phase 01](./phase-01-state-machine-library.md), [Phase 02](./phase-02-mcp-tool.md), [Phase 03](./phase-03-mcp-resources.md)
- Pattern: Follow existing tests (e.g., `tests/unit/validator.test.ts`, `tests/unit/manifest-manager.test.ts`)

## Overview
- **Priority:** P1
- **Status:** ✅ Complete
- **Description:** Unit tests for state machine, tool handler, and resource registration

## Key Insights
- ESM tests require `--experimental-vm-modules` and `.js` import extensions
- Tool tests use `(server as any)._registeredTools[name].handler(args, {})`
- Temp files in `tests/tmp/`, cleaned in `afterAll`
- `dirname(fileURLToPath(import.meta.url))` for `__dirname`

## Requirements
- State machine: all valid transitions pass, all invalid transitions rejected
- File write rules: append-only enforced, rewrite allowed, checklist merge works
- Workspace creation: all 7 files created with correct initial content
- Phase recovery: correct phase reconstructed from file inventory
- Tool handler: all 5 actions return correct responses
- Resources: all 7 URIs return content

## Related Code Files
- **Create:** `sekkei/packages/mcp-server/tests/unit/rfp-state-machine.test.ts`
- **Create:** `sekkei/packages/mcp-server/tests/unit/rfp-workspace-tool.test.ts`

## Implementation Steps

### Test File 1: `rfp-state-machine.test.ts` (~80 LOC)

1. **Phase transitions:**
   - Test all valid transitions (8 paths): RFP_RECEIVED→ANALYZING, ANALYZING→QNA_GENERATION, etc.
   - Test invalid transitions: RFP_RECEIVED→SCOPE_FREEZE, ANALYZING→DRAFTING, etc.
   - Test branching: WAITING_CLIENT→DRAFTING and WAITING_CLIENT→CLIENT_ANSWERED both valid

2. **File write rules:**
   - Append-only (01, 04, 07): write twice, verify both contents present
   - Rewrite (02, 03, 05): write twice, verify only second content
   - Checklist (06): write with fields, verify fields preserved on update

3. **Workspace creation:**
   - Create workspace in tests/tmp/
   - Verify all 7 files exist
   - Verify 00_status.md has correct initial YAML
   - Verify project_name validation (reject invalid names)

4. **Phase recovery:**
   - Create workspace with only 01_raw_rfp.md → expect RFP_RECEIVED
   - Add 02_analysis.md → expect ANALYZING
   - Add 03_questions.md → expect QNA_GENERATION
   - Add 05_proposal.md (no 04) → expect DRAFTING
   - Add 05_proposal.md + 04_client_answers.md → expect PROPOSAL_UPDATE
   - Add 06_scope_freeze.md → expect SCOPE_FREEZE

5. **Status file:**
   - Write status, read back, verify all fields match
   - Test with blocking_issues and assumptions arrays

### Test File 2: `rfp-workspace-tool.test.ts` (~50 LOC)

1. **Create action:** verify workspace created, status returned
2. **Status action:** verify JSON structure (phase, next_action, files)
3. **Transition action:** verify phase updates, invalid transition rejected
4. **Write action:** verify content saved, append-only enforced
5. **Read action:** verify content returned, missing file returns error
6. **Invalid action:** verify error response

## Todo List
- [ ] Create rfp-state-machine.test.ts
- [ ] Test valid transitions (8 paths)
- [ ] Test invalid transitions (5+ cases)
- [ ] Test file write rules (append, rewrite, checklist)
- [ ] Test workspace creation
- [ ] Test phase recovery (6 scenarios)
- [ ] Test status read/write
- [ ] Create rfp-workspace-tool.test.ts
- [ ] Test all 5 tool actions
- [ ] Test error cases
- [ ] Run `npm test` — all pass
- [ ] Run `npm run lint` — no type errors

## Success Criteria
- All tests pass with `npm test`
- Coverage: every phase transition tested (valid + invalid)
- Coverage: every file write rule tested
- Coverage: every recovery scenario tested
- Under 150 LOC total (both test files)

## Risk Assessment
- **Temp file cleanup:** Use `afterAll` with `fs.rm(tmpDir, { recursive: true })`
- **ESM imports:** Use `.js` extensions in all imports
- **Async file ops:** All file operations use `fs/promises`

## Security Considerations
- Tests use isolated tmp directory — no risk to workspace
- No network calls needed

## Next Steps
→ After all tests pass: `npm run build` + manual verification with each editor
