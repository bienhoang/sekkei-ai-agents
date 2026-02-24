# Phase 6: Tests

## Context Links

- All prior phases in this plan
- Test directory: `sekkei/packages/mcp-server/tests/unit/`
- Test runner: `node --experimental-vm-modules node_modules/.bin/jest --config jest.config.cjs`

## Overview

- **Date:** 2026-02-24
- **Priority:** P1
- **Status:** complete
- **Review status:** not started
- **Description:** Update existing tests and create new test file for all changes in Phases 1-5

## Key Insights

- Existing test files use `@jest/globals` imports, ESM `.js` extensions
- Tool tests use `(server as any)._registeredTools[name].handler(args, {})` pattern
- Temp files in `tests/tmp/`, cleaned in `afterAll`
- `cross-ref-linker.test.ts` uses inline fixture strings, not file I/O

## Requirements

**Functional:**
- All existing tests still pass
- New tests cover every changed behavior
- Coverage for error paths in new tool

**Non-functional:**
- Consistent with existing test patterns (ESM, @jest/globals)
- No flaky tests (deterministic fixtures)

## Architecture

### Test Updates Matrix

| Phase | Test File | Changes |
|-------|-----------|---------|
| 1 (#1) | `validator.test.ts` | Verify `requirements` has no upstream ID types checked |
| 1 (#2) | `cross-ref-linker.test.ts` | NFR-xxx in requirements not orphaned; array origin |
| 2 (#5) | `tools.test.ts` | Scope rejection for non-split doc types |
| 3 (#4) | `resolve-output-path.test.ts` | Update expected functions-list path |
| 4 (#6) | `update-chain-status-tool.test.ts` (NEW) | Full CRUD, error paths |

No test changes for Phases 2/#3 (skill text) or Phase 5 (skill text).

## Related Code Files

**Modify:**
- `sekkei/packages/mcp-server/tests/unit/validator.test.ts`
- `sekkei/packages/mcp-server/tests/unit/cross-ref-linker.test.ts`
- `sekkei/packages/mcp-server/tests/unit/tools.test.ts`
- `sekkei/packages/mcp-server/tests/unit/resolve-output-path.test.ts`

**Create:**
- `sekkei/packages/mcp-server/tests/unit/update-chain-status-tool.test.ts`

## Implementation Steps

### Step 1: Update validator.test.ts — Phase 1 #1

Add test verifying requirements has empty upstream ID types:

```typescript
it("requirements has no upstream ID types to validate", () => {
  // Requirements with no F-xxx references should still pass
  const content = STRUCTURAL + "# 要件定義書\n## 概要\n## 機能要件\n- REQ-001\n## 非機能要件\n- NFR-001\n";
  const issues = validateCrossRefs(content, "requirements");
  // No upstream IDs expected — should produce no "missing upstream" issues
  expect(issues.filter(i => i.message.includes("upstream"))).toHaveLength(0);
});
```

### Step 2: Update cross-ref-linker.test.ts — Phase 1 #2

Add test for NFR-xxx in requirements not flagged orphaned:

```typescript
describe("NFR origin from requirements", () => {
  it("does not flag NFR-xxx in requirements as orphaned", () => {
    const docs = new Map([
      ["requirements", "## 非機能要件\n- NFR-001 可用性\n- NFR-002 性能\n- REQ-001 ログイン"],
      ["nfr", "## 詳細\n- NFR-001 99.9% uptime\n"],
    ]);
    const graph = buildIdGraph(docs);
    const report = analyzeGraph(graph, docs);
    // NFR-001 defined in requirements — should NOT appear in orphaned_ids
    const orphanedNfr = report.orphaned_ids.filter(o => o.id.startsWith("NFR-"));
    expect(orphanedNfr).toHaveLength(0);
  });

  it("includes NFR-xxx from requirements in traceability matrix", () => {
    const docs = new Map([
      ["requirements", "## 非機能要件\n- NFR-001 可用性\n- REQ-001 ログイン"],
      ["basic-design", "## 設計\nNFR-001 based design\n"],
    ]);
    const matrix = buildTraceabilityMatrix(docs);
    const nfrEntry = matrix.find(e => e.id === "NFR-001");
    expect(nfrEntry).toBeDefined();
    expect(nfrEntry!.doc_type).toBe("requirements");
  });
});
```

### Step 3: Update resolve-output-path.test.ts — Phase 3 #4

Change expected value on line 19:

```typescript
// Before
it("returns 04-functions-list.md for functions-list", () => {
  expect(resolveOutputPath("functions-list")).toBe("04-functions-list.md");
});

// After
it("returns 04-functions-list/functions-list.md for functions-list", () => {
  expect(resolveOutputPath("functions-list")).toBe("04-functions-list/functions-list.md");
});
```

### Step 4: Update tools.test.ts — Phase 2 #5

Add scope rejection test. Register `generate_document` tool and test:

```typescript
describe("generate_document split mode guard", () => {
  let server: McpServer;

  beforeAll(() => {
    server = new McpServer({ name: "test", version: "0.0.1" });
    registerGenerateDocumentTool(server, TEMPLATE_DIR);
  });

  it("rejects scope param for requirements doc type", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "requirements",
      input_content: "test input",
      scope: "shared",
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("not supported");
  });

  it("accepts scope param for basic-design doc type", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "basic-design",
      input_content: "test input",
      scope: "shared",
    });
    expect(result.isError).toBeUndefined();
  });
});
```

### Step 5: Create update-chain-status-tool.test.ts — Phase 4 #6

New file: `sekkei/packages/mcp-server/tests/unit/update-chain-status-tool.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { mkdtemp, rm, writeFile, readFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { stringify as stringifyYaml, parse as parseYaml } from "yaml";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerUpdateChainStatusTool, handleUpdateChainStatus }
  from "../../src/tools/update-chain-status.js";

// Test cases:
// 1. Updates status for existing chain entry
// 2. Updates status + output for existing chain entry
// 3. Returns error for missing config file
// 4. Returns error for missing chain section
// 5. Returns error for unknown doc_type
// 6. Returns error for oversized config
// 7. Tool registers on server
```

Test structure:
- `beforeAll`: create temp dir, write sample `sekkei.config.yaml`
- `afterAll`: rm temp dir
- Fixture config: minimal YAML with `chain.requirements: { status: "pending" }`
- Test each success + error path

### Step 6: Run full test suite

```bash
cd sekkei/packages/mcp-server && npm test
```

## Todo

- [ ] Update `validator.test.ts` — requirements upstream ID test
- [ ] Update `cross-ref-linker.test.ts` — NFR origin array tests
- [ ] Update `resolve-output-path.test.ts` — functions-list path
- [ ] Update `tools.test.ts` — scope rejection test
- [ ] Create `update-chain-status-tool.test.ts` — 7 test cases
- [ ] Run `npm test` — all tests pass
- [ ] Run `npm run lint` — no type errors

## Success Criteria

- `npm test` — all tests pass (0 failures)
- `npm run lint` — no type errors
- New test file covers: success path, error paths (5+), tool registration
- No mocks for file system — use real temp files (consistent with existing pattern)

## Risk Assessment

- **Risk: LOW** — test changes only, no production code in this phase
- If cross-ref-linker tests fail after Phase 1 changes, fix test fixtures first

## Security Considerations

- Temp files created in OS tmpdir, cleaned up in `afterAll`
- No sensitive data in test fixtures

## Next Steps

- After all tests pass: `npm run build` for final compile check
- Ready for code review
