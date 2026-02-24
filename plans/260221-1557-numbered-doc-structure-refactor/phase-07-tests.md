# Phase 07 — Tests

## Context Links

- Parent plan: [plan.md](./plan.md)
- Depends on: All previous phases (1-6)
- Files to modify:
  - `sekkei/mcp-server/tests/unit/manifest-manager.test.ts`
  - `sekkei/mcp-server/tests/unit/merge-documents.test.ts`
  - `sekkei/mcp-server/tests/unit/tools.test.ts`
  - `sekkei/mcp-server/tests/unit/validate-tool.test.ts`

## Overview

- **Date:** 2026-02-21
- **Priority:** P1
- **Status:** ✅ complete
- **Effort:** 2h
- **Description:** Update all existing tests for new types/schemas (kebab-case feature names, removed MonolithicDocument, renamed feature_id → feature_name). Add new tests for numbered path routing, init scaffold validation, and structure validation rules.
- **Completed:** 2026-02-21

## Key Insights

- Tests access tool handlers via `(server as any)._registeredTools[name].handler(args, {})` — input schemas must match new Zod definitions
- `ManifestFeatureEntrySchema` regex changed from `^[A-Z]{2,5}$` → `^[a-z][a-z0-9-]{1,49}$` — all test fixtures using uppercase IDs (SAL, USR) must switch to kebab (sales-management, user-management)
- `MonolithicDocumentSchema` removed — tests creating monolithic manifests must be removed or converted to split
- `feature_id` param renamed to `feature_name` in `generate_document` tool — test calls must update param name
- `resolveOutputPath()` is a new pure function — easy to unit test independently
- ESM test setup: `node --experimental-vm-modules`, imports use `.js` extensions

## Requirements

### Functional
- All existing tests pass after schema/type changes
- `resolveOutputPath()` tested for every (doc_type, scope) combination from Phase 3 mapping table
- `ManifestFeatureEntrySchema` rejects uppercase IDs, accepts kebab-case
- Manifest tests use `SplitDocument` only (no `MonolithicDocument`)
- `generate_document` tool accepts `feature_name` param, rejects `feature_id`
- Structure validation tests check: numbered prefix, kebab folder names, index.md presence

### Non-functional
- Test files stay under 200 LOC each — split into focused files if needed
- `npm test` from `sekkei/mcp-server/` passes with zero failures

## Related Code Files

| File | Action | Notes |
|------|--------|-------|
| `tests/unit/manifest-manager.test.ts` | Modify | Replace uppercase IDs with kebab names, remove monolithic tests |
| `tests/unit/merge-documents.test.ts` | Modify | Update feature entry fixtures |
| `tests/unit/tools.test.ts` | Modify | Update `generate_document` calls (feature_id → feature_name) |
| `tests/unit/validate-tool.test.ts` | Modify | Add structure validation tests |
| `tests/unit/resolve-output-path.test.ts` | Create | Unit tests for `lib/resolve-output-path.ts` |
| `tests/unit/structure-validator.test.ts` | Create | Unit tests for `lib/structure-validator.ts` |

## Implementation Steps

### Step 1 — Update manifest-manager.test.ts

Replace all uppercase feature IDs with kebab names:
```ts
// Before:
{ id: "SAL", name: "Sales Management", file: "features/sal/basic-design.md" }

// After:
{ name: "sales-management", display: "販売管理", file: "05-features/sales-management/basic-design.md" }
```

Remove any tests for `MonolithicDocumentSchema` or monolithic manifest creation. Convert monolithic test cases to split equivalents.

### Step 2 — Update merge-documents.test.ts

Update feature entry fixtures to use kebab `name` field instead of uppercase `id`. Update file path references from `features/sal/` to `05-features/sales-management/`.

### Step 3 — Update tools.test.ts

Update `generate_document` tool calls:
```ts
// Before:
{ doc_type: "basic-design", feature_id: "SAL", scope: "feature", ... }

// After:
{ doc_type: "basic-design", feature_name: "sales-management", scope: "feature", ... }
```

Add test case for `doc_type: "overview"` — verify tool accepts it and returns content.

Verify `feature_name: "SAL"` (uppercase) is rejected by Zod schema.

### Step 4 — Create resolve-output-path.test.ts

<!-- Updated: Validation Session 1 - Import from lib/ module directly -->

Import from `lib/resolve-output-path.ts` (extracted per validation decision):

```ts
import { resolveOutputPath } from "../../src/lib/resolve-output-path.js";

describe("resolveOutputPath", () => {
  it("returns 01-overview.md for overview", () => {
    expect(resolveOutputPath("overview")).toBe("01-overview.md");
  });
  it("returns 02-requirements.md for requirements", () => {
    expect(resolveOutputPath("requirements")).toBe("02-requirements.md");
  });
  it("returns 03-system/ for basic-design shared", () => {
    expect(resolveOutputPath("basic-design", "shared")).toBe("03-system/");
  });
  it("returns 05-features/{name}/basic-design.md for basic-design feature", () => {
    expect(resolveOutputPath("basic-design", "feature", "sales-management"))
      .toBe("05-features/sales-management/basic-design.md");
  });
  it("returns 04-functions-list.md for functions-list", () => {
    expect(resolveOutputPath("functions-list")).toBe("04-functions-list.md");
  });
  it("returns 05-features/{name}/detail-design.md for detail-design feature", () => {
    expect(resolveOutputPath("detail-design", "feature", "user-management"))
      .toBe("05-features/user-management/detail-design.md");
  });
  it("returns 08-test/ for test-spec shared", () => {
    expect(resolveOutputPath("test-spec", "shared")).toBe("08-test/");
  });
  it("returns 05-features/{name}/test-spec.md for test-spec feature", () => {
    expect(resolveOutputPath("test-spec", "feature", "sales-management"))
      .toBe("05-features/sales-management/test-spec.md");
  });
  it("returns 06-data/ for migration-design", () => {
    expect(resolveOutputPath("migration-design")).toBe("06-data/");
  });
  it("returns 07-operations/ for operation-design", () => {
    expect(resolveOutputPath("operation-design")).toBe("07-operations/");
  });
  it("returns undefined for unknown doc_type with no scope", () => {
    expect(resolveOutputPath("detail-design")).toBeUndefined();
  });
});
```

### Step 5 — Create structure-validator.test.ts

<!-- Updated: Validation Session 1 - Separate test file for lib/structure-validator.ts -->

Import from `lib/structure-validator.ts`:

```ts
import { validateNumberedStructure } from "../../src/lib/structure-validator.js";

describe("validateNumberedStructure", () => {
  it("accepts valid numbered structure", () => { /* 01- through 10- */ });
  it("rejects non-kebab feature folder names", () => { /* 05-features/SAL/ → error */ });
  it("rejects missing index.md in feature folder", () => { /* 05-features/sales-management/ without index.md */ });
  it("accepts folders with index.md present", () => { /* valid structure */ });
});
```

### Step 6 — Run full test suite

```bash
cd sekkei/mcp-server && npm test
```

Fix any failures. Ensure zero test failures before marking complete.

## Todo

- [ ] Update manifest-manager.test.ts: kebab names, remove monolithic tests
- [ ] Update merge-documents.test.ts: kebab feature entries, numbered paths
- [ ] Update tools.test.ts: feature_name param, add overview test, reject uppercase
- [ ] Create resolve-output-path.test.ts with full mapping coverage
- [ ] Create structure-validator.test.ts for lib/structure-validator.ts
- [ ] Run `npm test` — zero failures
- [ ] Run `npm run lint` — zero TS errors

## Success Criteria

- `npm test` passes with zero failures
- `npm run lint` passes with zero errors
- `resolveOutputPath` has 100% branch coverage
- No test references `MonolithicDocument`, `feature_id`, or uppercase feature IDs
- Structure validation tests cover: valid structure, invalid folder names, missing index.md

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Test count may exceed 200 LOC in some files | Low | Split into focused test files if needed |
| `resolveOutputPath` not exported from generate.ts | Medium | Extract to `lib/resolve-output-path.ts` for testability |
| Some tests may mock filesystem — paths change breaks mocks | Medium | Update mock paths systematically |

## Security Considerations

- Tests run in isolated Jest environment — no security concerns
- Test fixtures must not contain real file paths or secrets

## Next Steps

- After all tests pass: manual end-to-end test of full chain (`/sekkei:init` → overview → functions-list → ... → test-spec)
- Consider adding integration test that creates full numbered scaffold and validates structure
