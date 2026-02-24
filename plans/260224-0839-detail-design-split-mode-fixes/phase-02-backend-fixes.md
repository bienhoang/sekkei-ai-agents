# Phase 2: Backend Fixes — Path Resolution, Completeness Rules, Chain Pairs

**Parent:** [plan.md](./plan.md)
**Brainstorm:** [brainstorm report](../reports/brainstorm-260224-0839-detail-design-split-mode-review.md)

## Overview

- **Priority:** P2
- **Status:** Complete
- **Covers:** BUG-4, BUG-7, IMP-4, IMP-5

## Key Insights

- resolve-output-path: basic-design has `shared` scope → detail-design must match
- completeness-rules: detail-design only checks CLS-xxx, should also check upstream refs
- cross-ref-linker: optional chain pairs for better traceability matrix

## Related Code Files

**Modify:**
1. `sekkei/packages/mcp-server/src/lib/resolve-output-path.ts` — line 25-28
2. `sekkei/packages/mcp-server/src/lib/completeness-rules.ts` — line 57-63
3. `sekkei/packages/mcp-server/src/lib/cross-ref-linker.ts` — line 25 (insert after)

**Tests:**
4. `sekkei/packages/mcp-server/tests/unit/resolve-output-path.test.ts` — add shared scope test
5. `sekkei/packages/mcp-server/tests/unit/cross-ref-linker.test.ts` — add chain pair tests

## Implementation Steps

### Step 1: Fix resolve-output-path (BUG-4)

**File:** `resolve-output-path.ts:25-28`

**Current:**
```typescript
if (docType === "detail-design") {
  if (scope === "feature" && featureName) return `05-features/${featureName}/detail-design.md`;
  return "03-system/detail-design.md";
}
```

**Target:**
```typescript
if (docType === "detail-design") {
  if (scope === "shared")  return "03-system/";
  if (scope === "feature" && featureName) return `05-features/${featureName}/detail-design.md`;
  return "03-system/detail-design.md";
}
```

**Test to add** in `resolve-output-path.test.ts`:
```typescript
it("returns 03-system/ for detail-design shared", () => {
  expect(resolveOutputPath("detail-design", "shared")).toBe("03-system/");
});
```

### Step 2: Enhance completeness rules (BUG-7, IMP-5)

**File:** `completeness-rules.ts:57-63`

**Current:**
```typescript
"detail-design": [
  {
    check: "class table",
    test: (c: string) => /\|\s*CLS-\d+/.test(c),
    message: "詳細設計書: クラス一覧テーブルにCLS-xxxが必要です",
  },
],
```

**Target:**
```typescript
"detail-design": [
  {
    check: "class table",
    test: (c: string) => /\|\s*CLS-\d+/.test(c),
    message: "詳細設計書: クラス一覧テーブルにCLS-xxxが必要です",
  },
  {
    check: "screen reference",
    test: (c: string) => /SCR-\d+/.test(c),
    message: "詳細設計書: 画面設計詳細にSCR-xxx参照が必要です",
  },
  {
    check: "table reference",
    test: (c: string) => /TBL-\d+/.test(c),
    message: "詳細設計書: DB詳細設計にTBL-xxx参照が必要です",
  },
  {
    check: "API reference",
    test: (c: string) => /API-\d+/.test(c),
    message: "詳細設計書: API詳細仕様にAPI-xxx参照が必要です",
  },
],
```

**Note:** Sequence diagram check (`/sequenceDiagram/`) omitted — may be too strict for minimal documents.

### Step 3: Add chain pairs (IMP-4)

**File:** `cross-ref-linker.ts:25` — insert after `["basic-design", "detail-design"]`

**Add:**
```typescript
["functions-list", "detail-design"],
["requirements", "detail-design"],
```

**Impact:** Traceability matrix tracks F-xxx and REQ-xxx flow into detail-design. Validation won't flag these as errors since UPSTREAM_ID_TYPES for detail-design only expects SCR/TBL/API — chain pair just enables traceability tracking.

**Test to add** in `cross-ref-linker.test.ts`:
- Verify new chain pairs exist in CHAIN_PAIRS array
- Verify traceability matrix includes F-xxx → detail-design links

### Step 4: Run build + tests

```bash
cd sekkei/packages/mcp-server
npm run lint       # type check
npm run test:unit  # all unit tests
```

## Todo

- [x] Add `shared` scope to resolve-output-path for detail-design
- [x] Add test for detail-design shared scope
- [x] Add SCR/TBL/API reference checks to completeness rules
- [x] Add functions-list/requirements → detail-design chain pairs
- [x] Add chain pair tests
- [x] Run build + all unit tests pass

## Success Criteria

- `resolveOutputPath("detail-design", "shared")` returns `"03-system/"`
- Completeness validation checks SCR/TBL/API references in detail-design
- Chain pairs include functions-list → detail-design and requirements → detail-design
- `npm run lint` passes (no type errors)
- `npm run test:unit` all green

## Risk Assessment

- **LOW:** resolve-output-path change is additive (new branch, existing branches unchanged)
- **LOW:** completeness rules are additive (existing CLS check preserved)
- **LOW:** chain pairs are additive (existing pairs unchanged)
