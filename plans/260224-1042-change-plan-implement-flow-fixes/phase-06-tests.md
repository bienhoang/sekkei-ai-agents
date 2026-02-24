# Phase 6: Unit Tests

## Context Links
- Test pattern: `sekkei/packages/mcp-server/tests/unit/cr-state-machine.test.ts`
- Test convention: `sekkei/packages/mcp-server/CLAUDE.md` — Testing Pattern section
- MCP server CLAUDE.md: Jest + ESM + `--experimental-vm-modules`

## Overview
- **Priority:** P1 (required)
- **Status:** Pending
- **Scope:** Unit tests for all new backend code from Phases 1-4

## Key Insights
- Follow existing test patterns: `mkdtemp` for tmp dirs, `afterAll` cleanup, ESM imports with `.js` extensions
- Tool handlers tested via `(server as any)._registeredTools[name].handler(args, {})`
- State machine tests: transition validation, CRUD ops, persistence
- Use `dirname(fileURLToPath(import.meta.url))` for `__dirname` in ESM
- Tests run via: `node --experimental-vm-modules node_modules/.bin/jest --config jest.config.cjs`

## Requirements

### Test File: `tests/unit/plan-state.test.ts` (~120 lines)

Test `lib/plan-state.ts` functions:

```typescript
describe("plan-state", () => {
  // Setup: mkdtemp for workspace

  describe("generatePlanId", () => {
    it("returns YYYYMMDD-{docType}-generation format");
  });

  describe("readPlan / writePlan", () => {
    it("round-trips plan through YAML frontmatter");
    it("preserves all fields including survey data");
    it("throws PLAN_ERROR for missing file");
    it("throws PLAN_ERROR for invalid status");
  });

  describe("writePhaseFile / readPhase", () => {
    it("creates phase file with correct YAML frontmatter");
    it("includes feature_id for per-feature phases");
    it("omits feature_id for shared/validation phases");
  });

  describe("findActivePlan", () => {
    it("returns null when no plans exist");
    it("returns null when all plans completed");
    it("returns active plan with pending status");
    it("returns active plan with in_progress status");
    it("filters by doc_type");
  });

  describe("listPlans", () => {
    it("returns empty array when no plans dir");
    it("returns sorted plans");
  });

  describe("updatePhaseStatus", () => {
    it("updates phase status in plan.md");
    it("auto-completes plan when all phases done");
  });

  describe("assembleUpstream", () => {
    it("returns requirements + functions-list for shared phase");
    it("includes feature docs for per-feature detail-design");
    it("handles missing files gracefully");
    it("returns empty string for validation phase type");
  });
});
```

### Test File: `tests/unit/plan-tool.test.ts` (~100 lines)

Test `tools/plan-actions.ts` action handlers:

```typescript
describe("manage_plan tool", () => {
  // Setup: mkdtemp + write sekkei.config.yaml with split config + functions-list.md

  describe("create", () => {
    it("creates plan directory with plan.md and phase files");
    it("rejects unsupported doc_type");
    it("rejects when split config missing");
    it("rejects when active plan already exists");
    it("generates correct phases for basic-design (shared + per-feature + validation)");
    it("generates correct phases for test-spec (no shared, per-feature + validation)");
    it("persists survey_data in plan frontmatter");
  });

  describe("status", () => {
    it("returns full plan JSON for valid plan_id");
    it("errors for non-existent plan");
  });

  describe("list", () => {
    it("returns empty array when no plans");
    it("returns summary of all plans");
  });

  describe("detect", () => {
    it("returns should_trigger=true when all conditions met");
    it("returns should_trigger=false when split config missing");
    it("returns should_trigger=false when feature_count < 3");
    it("returns should_trigger=false when active plan exists");
  });

  describe("execute", () => {
    it("returns generate_document args for shared phase");
    it("returns generate_document args with upstream for per-feature phase");
    it("returns validate_document args for validation phase");
    it("returns already_done for completed phase");
    it("updates phase status to in_progress");
    it("updates plan status to in_progress on first execute");
  });

  describe("update", () => {
    it("updates phase status to completed");
    it("updates phase status to skipped");
    it("auto-completes plan when all phases done");
  });
});
```

### Test File: `tests/unit/change-request-tool.test.ts` (extend existing)

Add tests for new C1-C2 features:

```typescript
describe("rollback action", () => {
  it("rejects when status is not PROPAGATING");
  it("returns error when no git checkpoint found");
  // Note: actual git reset cannot be tested without git repo setup
});

describe("propagate_next with suggest_content", () => {
  it("returns suggested_content when suggest_content=true and config_path provided");
  it("returns normal response when suggest_content not set");
});

describe("validate with partial flag", () => {
  it("skips incomplete-steps check when partial=true");
  it("still runs chain validation when partial=true");
});
```

## Related Code Files

| Action | File |
|--------|------|
| Create | `sekkei/packages/mcp-server/tests/unit/plan-state.test.ts` |
| Create | `sekkei/packages/mcp-server/tests/unit/plan-tool.test.ts` |
| Modify | `sekkei/packages/mcp-server/tests/unit/change-request-tool.test.ts` (add rollback/suggest/partial tests) |

## Implementation Steps

1. Create `tests/unit/plan-state.test.ts` — test persistence layer
2. Create `tests/unit/plan-tool.test.ts` — test action handlers
3. Extend `tests/unit/change-request-tool.test.ts` — add C1/C2/C6 tests
4. Run full test suite: `cd sekkei/packages/mcp-server && npm test`
5. Fix any failures

## Todo List
- [x] Create plan-state.test.ts
- [x] Create plan-tool.test.ts
- [x] Extend change-request-tool.test.ts
- [x] All tests pass

## Success Criteria
- All new tests pass
- All existing tests still pass
- Coverage for: plan CRUD, phase generation, active plan detection, upstream assembly, execute action, detect action
- Test fixtures: minimal sekkei.config.yaml + functions-list.md with 3+ features

## Risk Assessment
- **Test setup complexity:** Need realistic fixtures (config YAML, functions-list with Japanese headers). Mitigate: create minimal fixtures in test setup.
- **ESM import paths:** Must use `.js` extensions in test imports. Mitigate: follow existing test file patterns exactly.
