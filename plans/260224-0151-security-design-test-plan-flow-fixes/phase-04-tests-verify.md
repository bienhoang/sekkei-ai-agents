# Phase 4: Tests & Build Verification

**Parent:** [plan.md](./plan.md)
**Depends on:** Phase 1 (backend changes must be done first)

## Overview
- **Priority:** P1
- **Status:** complete
- **Description:** Add tests for new CHAIN_PAIRS, updated UPSTREAM_ID_TYPES, completeness rule; verify build

## Related Code Files

| File | Action |
|------|--------|
| `sekkei/packages/mcp-server/tests/unit/cross-ref-linker.test.ts` | Add tests for new chain pairs |
| `sekkei/packages/mcp-server/tests/unit/completeness-checker.test.ts` | Add test-plan completeness test |

## Implementation Steps

### 1. cross-ref-linker.test.ts — New chain pair tests

Add test fixtures:
```typescript
const SECURITY_DESIGN = `
## セキュリティ設計
| SEC-001 | 認証セキュリティ | REQ-001, NFR-001, API-001 |
| SEC-002 | データ保護 | TBL-001, SCR-001 |
`;

const TEST_PLAN = `
## テスト戦略
| TP-001 | 単体テスト | REQ-001, F-001 |
| TP-002 | 結合テスト | REQ-002, F-002 |
| TP-003 | NFR検証 | NFR-001 |
`;

const NFR = `
## 非機能要件
- NFR-001 可用性 99.9%
- NFR-002 性能 response <200ms
`;
```

Add test cases:

**a. requirements → security-design chain pair:**
```typescript
describe("analyzeGraph — requirements → security-design chain pair", () => {
  it("detects orphaned REQ-xxx not referenced in security-design", () => {
    // REQ-003 defined in requirements but not in security-design
    // REQ-001 referenced in security-design → not orphaned
  });
});
```

**b. nfr → security-design chain pair:**
```typescript
describe("analyzeGraph — nfr → security-design chain pair", () => {
  it("detects orphaned NFR-xxx not referenced in security-design", () => {
    // NFR-002 in nfr but not in security-design → orphaned
  });
});
```

**c. requirements → test-plan chain pair:**
```typescript
describe("analyzeGraph — requirements → test-plan chain pair", () => {
  it("detects orphaned REQ-xxx not referenced in test-plan", () => {
    // REQ-003 in requirements but not in test-plan → orphaned
  });
});
```

**d. basic-design → test-plan chain pair:**
```typescript
describe("analyzeGraph — basic-design → test-plan chain pair", () => {
  it("links exist when both docs present", () => {
    // basic-design → test-plan pair analyzed
  });
});
```

**e. Verify partial chain test still passes:**
- Existing test at L248-262 should still pass (only requirements + functions-list → 1 link)
- New pairs don't match because security-design/test-plan docs not in fixture

### 2. completeness-checker.test.ts — test-plan rule

```typescript
describe("validateContentDepth — test-plan", () => {
  it("warns when fewer than 3 TP-xxx IDs present", () => {
    const content = "## テスト戦略\nTP-001 単体テスト\nTP-002 結合テスト";
    const issues = validateContentDepth(content, "test-plan");
    expect(issues.some((i) => i.message.includes("TP-xxx"))).toBe(true);
  });

  it("returns no issues with 3+ TP-xxx IDs", () => {
    const content = "TP-001 単体テスト\nTP-002 結合テスト\nTP-003 システムテスト";
    const issues = validateContentDepth(content, "test-plan");
    expect(issues).toHaveLength(0);
  });
});
```

### 3. Build verification

```bash
cd sekkei/packages/mcp-server
npm run lint          # type check
npm test              # all tests
```

## Todo

- [ ] Add security-design + test-plan + nfr fixture strings
- [ ] Add requirements → security-design chain pair test
- [ ] Add nfr → security-design chain pair test
- [ ] Add requirements → test-plan chain pair test
- [ ] Add basic-design → test-plan chain pair test
- [ ] Add test-plan completeness test
- [ ] Verify existing partial chain test still passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes (all tests green)

## Success Criteria
- All new tests pass
- All existing tests pass (no regressions)
- `npm run lint` clean
- `npm test` all green
