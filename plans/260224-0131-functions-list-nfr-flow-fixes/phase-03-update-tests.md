# Phase 3: Update Affected Tests

## Context
- **Plan:** [plan.md](plan.md)
- **Phase 2:** [phase-02-validator-upstream-types.md](phase-02-validator-upstream-types.md)

## Overview
- **Priority:** P2
- **Status:** pending
- **Description:** Update tests broken by UPSTREAM_ID_TYPES and template column changes

## Key Insights

### Tests that MUST change

1. **`validator.test.ts:72-75`** — "returns 100% coverage when no upstream types expected"
   - Uses `functions-list` to test empty upstream. Now functions-list has `["REQ"]`.
   - **Fix:** Change doc type to `requirements` (which still has `[]`) or `meeting-minutes`/`decision-record`.

2. **`validator.test.ts:95-98`** — "passes when required columns present"
   - Table content doesn't include `関連要件ID` column.
   - **Fix:** Add `関連要件ID` to the test table content.

3. **`validator.test.ts:115-131`** — "returns valid for well-formed functions-list"
   - Uses `SAL-001` as function ID. Should use `F-001`.
   - Table lacks `関連要件ID` column.
   - **Fix:** Replace `SAL-001` → `F-001`, add `関連要件ID` column.

4. **`completeness-checker.test.ts:100-112`** — `VALID_FUNCTIONS_LIST` constant
   - Uses `SAL-001`. Should use `F-001`.
   - Table lacks `関連要件ID` column.
   - **Fix:** Update the constant and table header.

### Tests that should remain UNCHANGED (verify they pass)

- **`cross-ref-linker.test.ts`** — Already uses `F-xxx` format. Should pass as-is.
- **`completeness-checker.test.ts:69-80`** — Tests `F-xxx` detection. Already correct.

## Related Code Files

### Modify
1. `sekkei/packages/mcp-server/tests/unit/validator.test.ts`
2. `sekkei/packages/mcp-server/tests/unit/completeness-checker.test.ts`

### Verify (no changes expected)
3. `sekkei/packages/mcp-server/tests/unit/cross-ref-linker.test.ts`

## Implementation Steps

### 1. Fix validator.test.ts

**Line 72-75** — Change doc type for "no upstream types" test:
```typescript
// BEFORE
it("returns 100% coverage when no upstream types expected", () => {
  const report = validateCrossRefs("content", "upstream", "functions-list");
  expect(report.coverage).toBe(100);
});

// AFTER
it("returns 100% coverage when no upstream types expected", () => {
  const report = validateCrossRefs("content", "upstream", "meeting-minutes");
  expect(report.coverage).toBe(100);
});
```

**Line 95** — Add `関連要件ID` to column check test:
```typescript
// BEFORE
const content = "| 版数 | 日付 | 変更内容 | 変更者 |\n| 大分類 | 中分類 | 機能ID | 機能名 | 処理分類 |";

// AFTER
const content = "| 版数 | 日付 | 変更内容 | 変更者 |\n| 大分類 | 中分類 | 機能ID | 機能名 | 関連要件ID | 処理分類 |";
```

**Lines 115-131** — Update well-formed functions-list test:
- Replace `SAL-001` with `F-001`
- Add `関連要件ID` column to table header and data row
- Add `REQ-001` in the 関連要件ID cell

### 2. Fix completeness-checker.test.ts

**Lines 100-112** — Update `VALID_FUNCTIONS_LIST` constant:
- Replace `SAL-001` with `F-001` (or keep SAL-001 since it's testing section/table checks not completeness)
- Add `関連要件ID` to table header

Wait — actually `VALID_FUNCTIONS_LIST` is used in tests that check completeness warnings for *missing* F-xxx rows. The constant already uses `SAL-001` which would NOT match `F-\d{3}`. Looking at the test logic:
- Test at line 129-134: expects completeness WARNING when check_completeness=true → `SAL-001` triggers this (correct behavior)
- Test at line 143-150: replaces `SAL-001` with `F-001` to show passing case

So `VALID_FUNCTIONS_LIST` using `SAL-001` is actually intentional for the negative test case. BUT we should still add `関連要件ID` to the table header to match new REQUIRED_COLUMNS.

**Update `VALID_FUNCTIONS_LIST`:**
- Add `関連要件ID` to table header row
- Add corresponding cell in data row
- Keep `SAL-001` for the negative completeness test (it correctly fails F-xxx check)

### 3. Verify cross-ref-linker.test.ts

Run and confirm all tests pass without changes.

## Todo List
- [ ] Update validator.test.ts "no upstream types" test to use `meeting-minutes`
- [ ] Update validator.test.ts table column test to include `関連要件ID`
- [ ] Update validator.test.ts well-formed functions-list test (F-001 + 関連要件ID)
- [ ] Update completeness-checker.test.ts VALID_FUNCTIONS_LIST table header
- [ ] Run `npm test` and verify all tests pass
- [ ] Verify cross-ref-linker.test.ts passes unchanged

## Success Criteria
- All `npm test` tests pass
- No test uses `[PREFIX]-001` format where `F-xxx` is expected
- All functions-list test tables include `関連要件ID` column

## Risk Assessment
- **Low risk:** Test-only changes, no production code impact beyond phase 1-2
- **Caveat:** If other test files reference functions-list table format, they may also need updating. Grep for `SAL-001` and `PREFIX-001` across test directory to catch all.
