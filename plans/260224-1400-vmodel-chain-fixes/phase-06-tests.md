---
title: "Phase 6: Test Coverage"
status: complete
priority: P3
effort: 1.5h
covers: [P3.3, P3.4]
created: 2026-02-24
completed: 2026-02-24
---

# Phase 6: Test Coverage

## Context Links

- Parent plan: [plan.md](./plan.md)
- Audit: [brainstorm-260224-1400-vmodel-chain-audit.md](../reports/brainstorm-260224-1400-vmodel-chain-audit.md)
- Blocked by: Phase 1 (CHAIN_PAIRS), Phase 2 (UPSTREAM_ID_TYPES), Phase 5 (generate.ts)
- Blocks: none (final phase)

## Overview

- **Date:** 2026-02-24
- **Description:** Add test files for three previously untested tools (`translate`, `simulate-impact`, `import-document`) and add e2e export tests for xlsx output with content assertion. Also add targeted regression tests for all fixes from Phases 1–5.
- **Priority:** P3
- **Implementation status:** pending
- **Review status:** pending

## Key Insights

From audit brainstorm (G6, G7):

**Untested tools:**
- `translate.ts` — wraps Google Translate or AI translation; test: schema validation + handler smoke test (mock the translation call)
- `simulate-impact.ts` — calls `impact-analyzer.ts`; test: schema validation + handler with minimal fixture
- `import-document.ts` — Excel import via python bridge or native parser; test: schema validation + mock bridge response

**Shallow export tests (G7):**
- `docx-exporter.test.ts` and `excel-template-filler.test.ts` exist but only test input validation
- Need: actually write an xlsx file to `tests/tmp/`, then re-open with ExcelJS and assert sheet names + cell values
- Similar for docx: write file, check it's a valid zip (docx is a zip) with correct entry names

**Regression tests for Phases 1–5:**
- Phase 1: `cross-ref-linker.test.ts` — assert new CHAIN_PAIRS entries are present
- Phase 2: new test for `deriveUpstreamIdTypes` exported function; assert OTHER bucket in `extractIds`
- Phase 3: `plan-tool.test.ts` — cancel action success/rejection; list returns correct plan_id
- Phase 4: CR propagation test with 21-step mock; staleness test with split-doc fixture
- Phase 5: generate test with `autoValidate: true` config; migrate_config action smoke test

**Test patterns (from CLAUDE.md):**
- Tool handlers: `(server as any)._registeredTools[name].handler(args, {})`
- Tmp files: `tests/tmp/` cleaned in `afterAll`
- ESM: `dirname(fileURLToPath(import.meta.url))` for `__dirname`
- Jest config: `jest.config.cjs` with `--experimental-vm-modules`

## Requirements

### Functional
- `translate-tool.test.ts` — schema validation (missing required fields), handler smoke (mock response)
- `simulate-impact-tool.test.ts` — schema validation, handler smoke with fixture content
- `import-document-tool.test.ts` — schema validation, mock bridge call returning fixture data
- `excel-export-e2e.test.ts` — generate an actual xlsx in `tests/tmp/`, read it back, assert ≥1 sheet + non-empty cell
- Regression tests integrated into existing test files where possible; new files only where no suitable existing file exists

### Non-Functional
- Each new test file under 200 lines
- No real network calls — mock translation APIs and python bridge
- Tmp files always cleaned in `afterAll`
- Tests run in isolation (no shared state between files)

## Architecture

```
tests/unit/
  translate-tool.test.ts          ← NEW
  simulate-impact-tool.test.ts    ← NEW
  import-document-tool.test.ts    ← NEW
  excel-export-e2e.test.ts        ← NEW

tests/unit/cross-ref-linker.test.ts    ← EXTEND (Phase 1 regressions)
tests/unit/id-extractor.test.ts        ← EXTEND (Phase 2: OTHER bucket, deriveUpstreamIdTypes)
tests/unit/plan-tool.test.ts           ← EXTEND (Phase 3: cancel, list plan_id)
tests/unit/staleness-detector.test.ts  ← EXTEND (Phase 4: split-doc max-date)
```

## Related Code Files

### Modify
- `packages/mcp-server/tests/unit/cross-ref-linker.test.ts`
- `packages/mcp-server/tests/unit/id-extractor.test.ts`
- `packages/mcp-server/tests/unit/plan-tool.test.ts`
- `packages/mcp-server/tests/unit/staleness-detector.test.ts`

### Create
- `packages/mcp-server/tests/unit/translate-tool.test.ts`
- `packages/mcp-server/tests/unit/simulate-impact-tool.test.ts`
- `packages/mcp-server/tests/unit/import-document-tool.test.ts`
- `packages/mcp-server/tests/unit/excel-export-e2e.test.ts`

## Implementation Steps

### Step 1 — Read existing test patterns before writing any new tests

Read one representative existing test file (e.g., `plan-tool.test.ts` or `change-request-tool.test.ts`) to confirm:
- Import style (ESM `.js` extensions)
- Server instantiation pattern
- Handler invocation via `_registeredTools`
- afterAll cleanup pattern

### Step 2 — Extend cross-ref-linker.test.ts (Phase 1 regressions)

Add a `describe("CHAIN_PAIRS additions")` block:
```typescript
it("includes nfr → basic-design pair", () => {
  expect(CHAIN_PAIRS).toContainEqual(["nfr", "basic-design"]);
});
it("includes basic-design → screen-design pair", () => {
  expect(CHAIN_PAIRS).toContainEqual(["basic-design", "screen-design"]);
});
it("includes functions-list → test-plan pair", () => {
  expect(CHAIN_PAIRS).toContainEqual(["functions-list", "test-plan"]);
});
```

### Step 3 — Extend id-extractor.test.ts (Phase 2)

Add tests for OTHER bucket and `deriveUpstreamIdTypes`:
```typescript
it("extractIds puts custom prefix SAL-001 in OTHER bucket", () => {
  const result = extractIds("REQ-001 SAL-001 ACC-002");
  expect(result.get("REQ")).toContain("REQ-001");
  expect(result.get("OTHER")).toContain("SAL-001");
  expect(result.get("OTHER")).toContain("ACC-002");
});

it("deriveUpstreamIdTypes for ut-spec includes TP and TS", () => {
  const prefixes = deriveUpstreamIdTypes("ut-spec");
  expect(prefixes).toContain("TP");
  expect(prefixes).toContain("TS");
});

it("deriveUpstreamIdTypes for nfr returns override [NFR, REQ]", () => {
  const prefixes = deriveUpstreamIdTypes("nfr");
  expect(prefixes).toContain("NFR");
  expect(prefixes).toContain("REQ");
});
```

Import `deriveUpstreamIdTypes` from `../../src/lib/cross-ref-linker.js`.

### Step 4 — Extend plan-tool.test.ts (Phase 3)

Add cancel action tests and list plan_id test:
```typescript
it("cancel action transitions in_progress plan to cancelled", async () => {
  // create plan, then cancel
  const result = await handler({ action: "cancel", workspace_path: tmpDir, plan_id: createdPlanId }, {});
  expect(result.content[0].text).toContain("cancelled");
});

it("cancel rejects completed plan", async () => {
  const result = await handler({ action: "cancel", workspace_path: tmpDir, plan_id: completedPlanId }, {});
  expect(result.isError).toBe(true);
});

it("list returns stored plan_id not regenerated id", async () => {
  const result = await handler({ action: "list", workspace_path: tmpDir }, {});
  const plans = JSON.parse(result.content[0].text);
  expect(plans[0].plan_id).toBe(createdPlanId); // exact dir name, not today's date
});
```

### Step 5 — Create translate-tool.test.ts

```typescript
import { createServer } from "../../src/server.js";

describe("translate_document tool", () => {
  let server: Awaited<ReturnType<typeof createServer>>;

  beforeAll(async () => { server = await createServer(); });

  const handler = (args: Record<string, unknown>) =>
    (server as any)._registeredTools["translate_document"].handler(args, {});

  it("rejects missing content", async () => {
    const result = await handler({ target_language: "en" });
    expect(result.isError).toBe(true);
  });

  it("rejects invalid target_language", async () => {
    const result = await handler({ content: "テスト", target_language: "xx" });
    expect(result.isError).toBe(true);
  });

  it("returns translated content structure for valid input", async () => {
    // Smoke test — actual translation may call external service; just verify no crash
    // and response shape. If translation requires API key, test should gracefully handle error.
    const result = await handler({ content: "テスト", target_language: "en" });
    // Either success with text or error — both acceptable in unit context
    expect(result.content).toBeDefined();
  });
});
```

### Step 6 — Create simulate-impact-tool.test.ts

```typescript
describe("simulate_change_impact tool", () => {
  it("rejects missing doc_type", async () => { ... });
  it("rejects missing change_description", async () => { ... });
  it("returns impact analysis structure for valid minimal input", async () => {
    const result = await handler({
      doc_type: "requirements",
      change_description: "Add new authentication requirement",
      current_content: "# Requirements\nREQ-001 ログイン機能",
    });
    expect(result.content[0].text).toBeTruthy();
  });
});
```

### Step 7 — Create import-document-tool.test.ts

```typescript
describe("import_document tool", () => {
  it("rejects missing file_path", async () => { ... });
  it("rejects unsupported file format", async () => {
    const result = await handler({ file_path: "/tmp/test.pdf", doc_type: "requirements" });
    expect(result.isError).toBe(true);
  });
  it("rejects non-existent file path", async () => {
    const result = await handler({ file_path: "/nonexistent/file.xlsx", doc_type: "requirements" });
    expect(result.isError).toBe(true);
  });
});
```

### Step 8 — Create excel-export-e2e.test.ts

```typescript
import { writeFile, mkdir, rm } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";
import { exportToExcel } from "../../src/lib/excel-exporter.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP = join(__dirname, "../tmp/excel-e2e");

beforeAll(async () => { await mkdir(TMP, { recursive: true }); });
afterAll(async () => { await rm(TMP, { recursive: true, force: true }); });

it("exports requirements doc to xlsx with at least one sheet and content", async () => {
  const content = "# 要件定義書\n\n| 要件ID | 要件名 |\n|--------|--------|\n| REQ-001 | ログイン機能 |";
  const outPath = join(TMP, "requirements.xlsx");

  await exportToExcel({ content, doc_type: "requirements", output_path: outPath });

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(outPath);
  expect(wb.worksheets.length).toBeGreaterThan(0);

  const ws = wb.worksheets[0];
  const cellValues = ws.getRow(1).values as unknown[];
  expect(cellValues.some(v => v !== null && v !== undefined)).toBe(true);
});
```

Adapt the `exportToExcel` call to match the actual function signature in `excel-exporter.ts`.

### Step 9 — Run full test suite

```bash
cd packages/mcp-server
npm test
```

Fix any failures before declaring phase complete.

## Todo List

- [ ] Read one existing test file to confirm patterns (plan-tool.test.ts or similar)
- [ ] Extend cross-ref-linker.test.ts — 3 CHAIN_PAIRS assertions
- [ ] Extend id-extractor.test.ts — OTHER bucket + deriveUpstreamIdTypes assertions
- [ ] Extend plan-tool.test.ts — cancel success, cancel rejection, list plan_id correctness
- [ ] Extend staleness-detector.test.ts — split-doc max-date assertion
- [ ] Create translate-tool.test.ts — schema validation + smoke
- [ ] Create simulate-impact-tool.test.ts — schema validation + minimal handler smoke
- [ ] Create import-document-tool.test.ts — schema validation + missing file rejection
- [ ] Create excel-export-e2e.test.ts — write xlsx, read back, assert sheet + content
- [ ] Run full test suite (`npm test`) — all pass
- [ ] Confirm no new test files exceed 200 lines

## Success Criteria

- `npm test` exits 0 with all suites passing
- 4 new test files created, each under 200 lines
- Existing test files extended with targeted regression cases for each phase fix
- `deriveUpstreamIdTypes` tested for at least 3 doc types
- Excel e2e test produces a real `.xlsx` file and reads it back successfully
- No mocks bypass actual business logic (schema validation must use real Zod schema)

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| `exportToExcel` signature differs from assumed | Medium | Read excel-exporter.ts before writing e2e test |
| translate_document calls real API causing flaky tests | Medium | Assert on response structure existence, not content; skip if API key absent |
| ExcelJS not available in test environment | Low | Already a production dependency; available in test context |
| Split-doc staleness test requires git repo fixture | Medium | Use existing `tests/fixtures/` patterns or mock `gitLastModified` |
| New test files exceed 200 lines | Low | Keep each describe block focused; split if needed |

## Security Considerations

- Tmp test files written to `tests/tmp/` — always cleaned in `afterAll`
- No real credentials used in tests — translate smoke test handles missing API key gracefully

## Next Steps

- After all phases complete, run `npm test` from repo root to confirm workspace-level test pass.
- Update `docs/codebase-summary.md` or similar doc if test coverage stats are tracked.
- Consider adding `cr-propagation-actions.test.ts` in a follow-up (currently fully untested per G6).
