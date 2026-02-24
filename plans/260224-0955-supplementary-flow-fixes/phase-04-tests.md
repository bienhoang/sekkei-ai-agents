# Phase 4 — Tests

**Covers:** All issues from Phase 1-3
**Files:** `cross-ref-linker.test.ts`, `validator.test.ts`, `resolve-output-path.test.ts` (if exists)

## 4.1 cross-ref-linker.test.ts

**Path:** `sekkei/packages/mcp-server/tests/unit/cross-ref-linker.test.ts`

### New chain pair tests

```ts
describe("supplementary chain pairs", () => {
  test("CHAIN_PAIRS includes nfr → operation-design", () => {
    expect(CHAIN_PAIRS).toContainEqual(["nfr", "operation-design"]);
  });

  test("CHAIN_PAIRS includes requirements → migration-design", () => {
    expect(CHAIN_PAIRS).toContainEqual(["requirements", "migration-design"]);
  });

  test("CHAIN_PAIRS includes operation-design → migration-design", () => {
    expect(CHAIN_PAIRS).toContainEqual(["operation-design", "migration-design"]);
  });

  test("CHAIN_PAIRS includes functions-list → crud-matrix", () => {
    expect(CHAIN_PAIRS).toContainEqual(["functions-list", "crud-matrix"]);
  });

  test("CHAIN_PAIRS includes basic-design → crud-matrix", () => {
    expect(CHAIN_PAIRS).toContainEqual(["basic-design", "crud-matrix"]);
  });

  test("CHAIN_PAIRS includes requirements → traceability-matrix", () => {
    expect(CHAIN_PAIRS).toContainEqual(["requirements", "traceability-matrix"]);
  });

  test("CHAIN_PAIRS includes functions-list → sitemap", () => {
    expect(CHAIN_PAIRS).toContainEqual(["functions-list", "sitemap"]);
  });
});
```

### analyzeGraph tests for new pairs

Test that orphaned/missing ID detection works for:
- NFR-xxx orphaned in nfr but not in operation-design
- REQ-xxx missing in migration-design but not defined in requirements
- F-xxx orphaned in functions-list but not in crud-matrix

## 4.2 Completeness rules tests

Add test cases in validator.test.ts for:
- operation-design: content with OP-001, OP-002, OP-003 → passes
- operation-design: content with only OP-001 → fails
- migration-design: MIG-xxx ≥3 passes
- crud-matrix: content with F-xxx + TBL-xxx → passes
- traceability-matrix: content with REQ-xxx → passes
- sitemap: content with PG-xxx ≥3 → passes

## 4.3 resolve-output-path tests

Verify:
- `resolveOutputPath("sitemap")` returns `"03-system/sitemap.md"`
- `resolveOutputPath("operation-design")` returns `"07-operations/operation-design.md"`
- `resolveOutputPath("migration-design")` returns `"06-data/migration-design.md"`

## 4.4 Run all tests

```bash
cd sekkei/packages/mcp-server
npm run lint
npm test
```

## Checklist
- [ ] Chain pair tests for S2, S3, IMP-5
- [ ] analyzeGraph tests for new pairs
- [ ] Completeness rule tests for IMP-2
- [ ] resolve-output-path tests for S1, S4, S5
- [ ] Required table column tests for IMP-6
- [ ] All tests pass
- [ ] Build passes
