# Phase 4: Tests

**File:** `sekkei/packages/mcp-server/tests/unit/cross-ref-linker.test.ts`
**Validates:** Phase 3 changes (B2, B4)

## Test 1: New chain pairs (B4)

Verify CHAIN_PAIRS includes test-plan → test spec relationships:

```ts
it("should include test-plan → test-spec chain pairs", () => {
  const expected = [
    ["test-plan", "ut-spec"],
    ["test-plan", "it-spec"],
    ["test-plan", "st-spec"],
    ["test-plan", "uat-spec"],
  ];
  for (const [from, to] of expected) {
    expect(CHAIN_PAIRS).toContainEqual([from, to]);
  }
});
```

## Test 2: loadChainDocs split ut-spec (B2)

Verify loadChainDocs handles split format for ut-spec:

```ts
it("should load split ut-spec (system_output + features_output)", () => {
  // Setup: config with ut_spec having system_output and features_output
  // Assert: both system and feature files are loaded
});
```

## Test 3: loadChainDocs backward compat

Verify single-file ut-spec/it-spec still works:

```ts
it("should load single-file ut-spec (backward compatible)", () => {
  // Setup: config with ut_spec as simple string path
  // Assert: single file loaded correctly
});
```

## Checklist

- [ ] Test new chain pairs present
- [ ] Test split ut-spec loading
- [ ] Test split it-spec loading
- [ ] Test backward compat single-file loading
- [ ] Run full test suite: `npm test` from mcp-server/
