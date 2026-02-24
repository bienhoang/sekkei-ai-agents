# Phase 5: Tests

## Context Links

- Pattern: `tests/unit/rfp-workspace-tool.test.ts` — tool test via `(server as any)._registeredTools`
- Pattern: `tests/unit/rfp-state-machine.test.ts` — state machine unit tests
- Pattern: `tests/unit/cross-ref-linker.test.ts` — graph/linker tests
- Jest config: `jest.config.cjs` (ESM with --experimental-vm-modules)

## Overview

- **Priority:** P1
- **Status:** pending
- **Description:** Unit tests for CR state machine, propagation engine, backfill, conflict detection, and MCP tool handler

## Key Insights

- Test setup: `mkdtemp` for temp dirs, `afterAll` cleanup with `rm -rf`
- Tool testing: `(server as any)._registeredTools[name].handler(args, {})`
- ESM imports use `.js` extensions
- `__dirname` equivalent: `dirname(fileURLToPath(import.meta.url))`
- All tests must be self-contained (create their own fixtures, no shared state between test files)

## Requirements

### Functional

5 test files covering all Phase 1-3 modules:

| Test File | Module Under Test | Key Scenarios |
|-----------|-------------------|---------------|
| cr-state-machine.test.ts | cr-state-machine.ts | CRUD, transitions, ID generation, YAML round-trip |
| cr-propagation.test.ts | cr-propagation.ts | Upstream/downstream ordering for various origins |
| cr-backfill.test.ts | cr-backfill.ts | New ID detection, upstream suggestion generation |
| cr-conflict-detector.test.ts | cr-conflict-detector.ts | Overlap detection, no-conflict case |
| change-request-tool.test.ts | tools/change-request.ts | All 9 actions via MCP tool handler |

### Non-Functional
- Each test file < 200 LOC
- No mocks for file I/O (use real temp dirs)
- Tests must pass with `npm test`

## Architecture

```
tests/unit/cr-state-machine.test.ts       — ~120 LOC
tests/unit/cr-propagation.test.ts         — ~80 LOC
tests/unit/cr-backfill.test.ts            — ~100 LOC
tests/unit/cr-conflict-detector.test.ts   — ~80 LOC
tests/unit/change-request-tool.test.ts    — ~180 LOC
```

## Related Code Files

### Files to Create
- `sekkei/packages/mcp-server/tests/unit/cr-state-machine.test.ts`
- `sekkei/packages/mcp-server/tests/unit/cr-propagation.test.ts`
- `sekkei/packages/mcp-server/tests/unit/cr-backfill.test.ts`
- `sekkei/packages/mcp-server/tests/unit/cr-conflict-detector.test.ts`
- `sekkei/packages/mcp-server/tests/unit/change-request-tool.test.ts`

## Implementation Steps

### Test 1: cr-state-machine.test.ts

```typescript
describe("CR state machine", () => {
  // Setup: mkdtemp for workspace

  describe("generateCRId", () => {
    it("generates first ID for today: CR-YYMMDD-001");
    it("increments: CR-YYMMDD-002 when 001 exists");
  });

  describe("createCR", () => {
    it("creates CR file with correct YAML frontmatter");
    it("creates change-requests directory if missing");
  });

  describe("readCR / writeCR", () => {
    it("round-trips: write then read returns identical data");
    it("preserves arrays (changed_ids, propagation_steps, history)");
    it("handles special chars in description");
  });

  describe("transitionCR", () => {
    it("INITIATED -> ANALYZING: valid");
    it("INITIATED -> APPROVED: invalid (rejects)");
    it("Any -> CANCELLED: valid (except COMPLETED)");
    it("COMPLETED -> CANCELLED: invalid");
    it("appends to history on each transition");
  });

  describe("listCRs", () => {
    it("returns all CRs in directory");
    it("returns empty array for empty directory");
  });
});
```

### Test 2: cr-propagation.test.ts

```typescript
describe("computePropagationOrder", () => {
  it("requirements: no upstream, full downstream chain");
  it("basic-design: upstream=[requirements], downstream=[security-design, detail-design, it-spec, st-spec, migration-design]");
  it("detail-design: upstream=[basic-design], downstream=[ut-spec]");
  it("ut-spec: upstream=[detail-design], downstream=[]");
  it("all steps have status=pending");
  it("upstream steps have direction=upstream, downstream have direction=downstream");
});
```

### Test 3: cr-backfill.test.ts

```typescript
describe("generateBackfillSuggestions", () => {
  it("detects new F-xxx IDs needing functions-list entry");
  it("detects new REQ-xxx IDs needing requirements entry");
  it("returns empty for no new IDs");
  it("ignores IDs that already exist upstream");
});
```

### Test 4: cr-conflict-detector.test.ts

```typescript
describe("detectConflicts", () => {
  it("detects changed_ids overlap between CRs");
  it("detects propagation doc_type overlap");
  it("ignores CRs that are not APPROVED/PROPAGATING");
  it("returns empty when no conflicts");
});
```

### Test 5: change-request-tool.test.ts

Following rfp-workspace-tool.test.ts pattern:

```typescript
describe("manage_change_request tool", () => {
  // Setup: mkdtemp, McpServer, registerChangeRequestTool

  it("registers on server");

  it("create: returns CR ID and INITIATED status");
  it("create: rejects missing origin_doc");

  it("status: returns full CR data");

  it("list: returns array of CR summaries");

  it("cancel: transitions to CANCELLED");
  it("cancel: rejects if already COMPLETED");

  // analyze, approve, propagate_next, validate, complete
  // require config_path with actual sekkei.config.yaml
  // → create minimal fixture config + docs for these tests
});
```

Note: analyze/approve/propagate_next/validate tests need a minimal 3-doc chain fixture:
- `tests/fixtures/cr-test/config.yaml` — minimal chain: requirements + functions-list + basic-design
- `tests/fixtures/cr-test/requirements.md` — 2-3 REQ-xxx IDs
- `tests/fixtures/cr-test/functions-list.md` — 2-3 F-xxx IDs referencing REQ-xxx
- `tests/fixtures/cr-test/basic-design.md` — 2-3 SCR/TBL-xxx IDs referencing F-xxx
<!-- Updated: Validation Session 1 - Minimal 3-doc chain fixture specification -->

## Todo List

- [ ] Create cr-state-machine.test.ts with CRUD + transition tests
- [ ] Create cr-propagation.test.ts with ordering tests for multiple origin docs
- [ ] Create cr-backfill.test.ts with ID detection tests
- [ ] Create cr-conflict-detector.test.ts with overlap tests
- [ ] Create change-request-tool.test.ts with all 9 action tests
- [ ] Create minimal test fixtures (config + docs) if needed for integration-style tests
- [ ] Verify all tests pass: `npm test`

## Success Criteria

- All 5 test files pass with `npm test`
- Coverage: every exported function from Phases 1-2 has at least one test
- Coverage: every action in Phase 3 tool handler has at least one happy-path + one error-path test
- No flaky tests (deterministic, no timing dependencies)

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Test fixtures for chain docs complex | Medium | Keep minimal: 2-doc chain with 2 IDs |
| analyze action needs real chain docs | Medium | Create small test fixtures in tests/fixtures/ |
| Test file exceeds 200 LOC | High | Split tool tests into describe blocks, extract helpers |

## Security Considerations

- Test temp dirs cleaned up in afterAll
- No real config paths or project data in tests

## Next Steps

Phase 6 verifies build + updates docs.
