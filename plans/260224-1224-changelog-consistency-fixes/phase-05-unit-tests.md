# Phase 5: Unit Tests

## Context Links
- Parent: [plan.md](plan.md)
- Depends on: Phase 1-3 (all new functions)

## Overview
- **Priority:** P1
- **Status:** completed
- **Description:** Unit tests for `validateChangelogPreservation()`, `incrementVersion()`, hardened `extractVersionFromContent()`, and `insertChangelogRow()`.

## Related Code Files
- **Modify:** `sekkei/packages/mcp-server/tests/unit/validator.test.ts` (extend)
- **Create:** `sekkei/packages/mcp-server/tests/unit/changelog-manager.test.ts`

## Implementation Steps

### 1. Extend validator.test.ts

Add `describe("validateChangelogPreservation")` block:

```typescript
describe("validateChangelogPreservation", () => {
  const makeDoc = (rows: string[]) =>
    `# Doc\n## 改訂履歴\n| 版数 | 日付 | 変更内容 | 変更者 |\n|------|------|----------|--------|\n${rows.join("\n")}\n## 承認欄\n`;

  it("returns no issues when all rows preserved + 1 new", () => {
    const prev = makeDoc(["| 1.0 | 2026-01-01 | Initial | Author |"]);
    const next = makeDoc([
      "| 1.0 | 2026-01-01 | Initial | Author |",
      "| 1.1 | 2026-02-24 | Updated | |",
    ]);
    const issues = validateChangelogPreservation(prev, next);
    expect(issues).toHaveLength(0);
  });

  it("returns error when rows missing", () => {
    const prev = makeDoc([
      "| 1.0 | 2026-01-01 | Initial | Author |",
      "| 1.1 | 2026-01-15 | Update | Author |",
    ]);
    const next = makeDoc(["| 1.1 | 2026-01-15 | Update | Author |"]);
    const issues = validateChangelogPreservation(prev, next);
    expect(issues.some(i => i.severity === "error")).toBe(true);
  });

  it("returns error when row count decreased", () => {
    const prev = makeDoc([
      "| 1.0 | 2026-01-01 | A | X |",
      "| 1.1 | 2026-01-15 | B | Y |",
    ]);
    const next = makeDoc(["| 1.2 | 2026-02-24 | C | Z |"]);
    const issues = validateChangelogPreservation(prev, next);
    expect(issues.some(i => i.message.includes("decreased"))).toBe(true);
  });

  it("returns empty when previous has no changelog", () => {
    const prev = "# Doc\n## 承認欄\n";
    const next = makeDoc(["| 1.0 | 2026-02-24 | New | |"]);
    expect(validateChangelogPreservation(prev, next)).toHaveLength(0);
  });

  it("returns warning when more than 1 new row", () => {
    const prev = makeDoc(["| 1.0 | 2026-01-01 | A | X |"]);
    const next = makeDoc([
      "| 1.0 | 2026-01-01 | A | X |",
      "| 1.1 | 2026-02-01 | B | Y |",
      "| 1.2 | 2026-02-24 | C | Z |",
    ]);
    const issues = validateChangelogPreservation(prev, next);
    expect(issues.some(i => i.severity === "warning")).toBe(true);
  });

  it("handles whitespace differences gracefully", () => {
    const prev = makeDoc(["| 1.0 | 2026-01-01 | Initial | Author |"]);
    const next = makeDoc([
      "|  1.0  |  2026-01-01  |  Initial  |  Author  |",
      "| 1.1 | 2026-02-24 | Updated | |",
    ]);
    const issues = validateChangelogPreservation(prev, next);
    expect(issues.filter(i => i.severity === "error")).toHaveLength(0);
  });
});
```

### 2. Create changelog-manager.test.ts

```typescript
describe("extractVersionFromContent", () => {
  it("extracts standard format | 1.0 |", ...);
  it("extracts v-prefix format | v1.0 |", ...);
  it("returns last version from multiple rows", ...);
  it("returns empty string for no 改訂履歴", ...);
  it("returns empty string for malformed table", ...);
});

describe("incrementVersion", () => {
  it("increments 1.0 → 1.1", ...);
  it("increments 1.9 → 2.0", ...);
  it("increments 9.9 → 10.0", ...);
  it("returns 1.0 for empty string", ...);
});
```

### 3. Run full test suite

```bash
cd sekkei/packages/mcp-server && npm test
```

## Todo
- [ ] Add `validateChangelogPreservation` tests to validator.test.ts
- [ ] Create changelog-manager.test.ts with `extractVersionFromContent` + `incrementVersion` tests
- [ ] All tests pass
- [ ] No regressions in existing tests

## Success Criteria
- 6+ test cases for `validateChangelogPreservation`
- 5+ test cases for `extractVersionFromContent`
- 4+ test cases for `incrementVersion`
- Full `npm test` passes with zero failures
