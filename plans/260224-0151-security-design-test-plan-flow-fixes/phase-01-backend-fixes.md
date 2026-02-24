# Phase 1: Backend Fixes

**Parent:** [plan.md](./plan.md)
**Brainstorm:** `plans/reports/brainstorm-260224-0151-security-design-test-plan-flow-review.md`

## Overview
- **Priority:** P1
- **Status:** complete
- **Description:** Fix CHAIN_PAIRS, UPSTREAM_ID_TYPES, and completeness rules

## Related Code Files

| File | Action |
|------|--------|
| `sekkei/packages/mcp-server/src/lib/cross-ref-linker.ts` | Edit CHAIN_PAIRS (L13-32) |
| `sekkei/packages/mcp-server/src/lib/validator.ts` | Edit UPSTREAM_ID_TYPES (L126) |
| `sekkei/packages/mcp-server/src/lib/completeness-rules.ts` | Add test-plan entry (after L98) |

## Implementation Steps

### FIX-1 + FIX-2: cross-ref-linker.ts CHAIN_PAIRS

Add 5 new entries to CHAIN_PAIRS array. Insert in correct sections:

```typescript
// In "Design phase" section, add before ["basic-design", "detail-design"]:
["requirements", "security-design"],
["nfr", "security-design"],
// keep existing: ["basic-design", "security-design"],

// In "Test phase" section, add before ["detail-design", "ut-spec"]:
["requirements", "test-plan"],
["nfr", "test-plan"],
["basic-design", "test-plan"],
```

**Final CHAIN_PAIRS should be:**
```typescript
export const CHAIN_PAIRS: [string, string][] = [
  // Requirements phase (linear)
  ["requirements", "nfr"],
  ["requirements", "functions-list"],
  ["requirements", "project-plan"],
  ["functions-list", "project-plan"],
  // Design phase
  ["requirements", "basic-design"],
  ["functions-list", "basic-design"],
  ["requirements", "security-design"],
  ["nfr", "security-design"],
  ["basic-design", "security-design"],
  ["basic-design", "detail-design"],
  // Test phase (V-model symmetric — branching)
  ["requirements", "test-plan"],
  ["nfr", "test-plan"],
  ["basic-design", "test-plan"],
  ["detail-design", "ut-spec"],
  ["basic-design", "it-spec"],
  ["basic-design", "st-spec"],
  ["requirements", "uat-spec"],
  // Supplementary
  ["requirements", "operation-design"],
  ["basic-design", "migration-design"],
];
```

### FIX-3: validator.ts UPSTREAM_ID_TYPES

Change line 126:
```typescript
// FROM:
"security-design": ["REQ", "NFR"],
// TO:
"security-design": ["REQ", "NFR", "API", "SCR", "TBL"],
```

**Rationale:** security-design references both requirements-level IDs (REQ, NFR) AND basic-design IDs (API, SCR, TBL). The validator should accept all.

### FIX-10: completeness-rules.ts

Add after project-plan entry (after line 98):
```typescript
"test-plan": [
  {
    check: "TP entries",
    test: (c: string) => (c.match(/TP-\d{3}/g) || []).length >= 3,
    message: "テスト計画書: テスト戦略にTP-xxxが3つ以上必要です",
  },
],
```

## Todo

- [ ] FIX-1: Add 3 CHAIN_PAIRS for test-plan
- [ ] FIX-2: Add 2 CHAIN_PAIRS for security-design
- [ ] FIX-3: Fix UPSTREAM_ID_TYPES for security-design
- [ ] FIX-10: Add completeness rule for test-plan
- [ ] Run `npm run lint` to verify no type errors

## Success Criteria
- `npm run lint` passes
- No existing test breaks (verify in Phase 4)
- CHAIN_PAIRS has 20 entries (was 15)

## Risk Assessment
- **Low:** Adding CHAIN_PAIRS won't break existing tests — new pairs only activate when both docs exist in chain
- Partial chain test (L248-262) still expects 1 link with requirements+functions-list fixture (new pairs don't match those docs)
