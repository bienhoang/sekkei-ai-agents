# Phase 3: Backend fixes (cross-ref-linker.ts)

**File:** `sekkei/packages/mcp-server/src/lib/cross-ref-linker.ts`
**Fixes:** B2, B4

## Change 1: Add chain pairs test-plan → test specs (B4)

Add 4 new pairs to `CHAIN_PAIRS` array:

```ts
// After existing test-phase pairs:
["test-plan", "ut-spec"],
["test-plan", "it-spec"],
["test-plan", "st-spec"],
["test-plan", "uat-spec"],
```

This enables:
- Cross-reference validation TP-xxx ↔ UT/IT/ST/UAT-xxx
- Traceability matrix shows test-plan → test spec relationships

## Change 2: Add split support for ut-spec/it-spec in loadChainDocs (B2)

In `loadChainDocs` function, add split handling for ut-spec and it-spec (same pattern as basic-design/detail-design):

```ts
// Current (single-file only):
["ut-spec", chain.ut_spec],
["it-spec", chain.it_spec],

// New — handle both formats:
// If chain.ut_spec has system_output/features_output → load split
// Else → load single file (backward compatible)
```

Pattern to follow from existing basic-design split code:
1. Check if `chain.ut_spec` is object with `system_output`/`features_output` keys
2. If yes: read system_output file + glob features_output directory
3. If no: read single file path (existing behavior)
4. Same for it-spec

## Checklist

- [ ] Add 4 chain pairs to CHAIN_PAIRS
- [ ] Add split handling for ut-spec in loadChainDocs
- [ ] Add split handling for it-spec in loadChainDocs
- [ ] Verify buildTraceabilityMatrix includes new pairs
