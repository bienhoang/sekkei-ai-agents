# Phase 1: Bug Fixes (#1, #2)

## Context Links

- Brainstorm: `plans/reports/brainstorm-260224-0107-sekkei-requirements-flow-review.md`
- Validator: `sekkei/packages/mcp-server/src/lib/validator.ts`
- Cross-ref linker: `sekkei/packages/mcp-server/src/lib/cross-ref-linker.ts`

## Overview

- **Date:** 2026-02-24
- **Priority:** P1
- **Status:** complete
- **Review status:** not started
- **Description:** Fix two bugs — incorrect upstream ID types for requirements doc, and NFR-xxx origin ambiguity causing false orphan reports

## Key Insights

- Requirements is first doc after RFP. Has no upstream doc defining F-xxx IDs. Current `["F"]` config is wrong — always passes vacuously but semantically incorrect.
- Requirements template Section 3.2 defines NFR-xxx rows. `ID_ORIGIN["NFR"]` only maps to `"nfr"`, so NFR-xxx in requirements.md flagged orphaned by cross-ref linker.
- `ID_ORIGIN` consumed at 3 sites in cross-ref-linker.ts: lines 197, 245, 255. All do `=== upstreamType` comparison.

## Requirements

**Functional:**
- `UPSTREAM_ID_TYPES["requirements"]` must be `[]`
- `ID_ORIGIN["NFR"]` must resolve to both `"nfr"` and `"requirements"`
- Cross-ref linker must not flag NFR-xxx in requirements.md as orphaned

**Non-functional:**
- Zero regression in existing cross-ref tests
- Type safety preserved (no `any` casts)

## Architecture

### Change #1: UPSTREAM_ID_TYPES

Single line change. No architectural impact.

### Change #2: ID_ORIGIN type evolution

```
Before: Record<string, string>         → ID_ORIGIN["NFR"] = "nfr"
After:  Record<string, string | string[]> → ID_ORIGIN["NFR"] = ["nfr", "requirements"]
```

Consumer pattern change at 3 sites:

```typescript
// Before
if (ID_ORIGIN[prefix] !== docType) continue;

// After — helper function
function isOriginOf(prefix: string, docType: string): boolean {
  const origin = ID_ORIGIN[prefix];
  if (Array.isArray(origin)) return origin.includes(docType);
  return origin === docType;
}
if (!isOriginOf(prefix, docType)) continue;
```

## Related Code Files

**Modify:**
- `sekkei/packages/mcp-server/src/lib/validator.ts` — line 122
- `sekkei/packages/mcp-server/src/lib/cross-ref-linker.ts` — lines 32-56 (type), lines 197, 245, 255 (consumers)

**Tests to update (Phase 6):**
- `sekkei/packages/mcp-server/tests/unit/validator.test.ts`
- `sekkei/packages/mcp-server/tests/unit/cross-ref-linker.test.ts`

## Implementation Steps

### Step 1: Fix UPSTREAM_ID_TYPES (validator.ts:122)

```typescript
// Before
requirements: ["F"],

// After
requirements: [],
```

### Step 2: Update ID_ORIGIN type (cross-ref-linker.ts:32)

```typescript
// Before
export const ID_ORIGIN: Record<string, string> = {

// After
export const ID_ORIGIN: Record<string, string | string[]> = {
```

### Step 3: Update NFR entry (cross-ref-linker.ts:35)

```typescript
// Before
NFR: "nfr",

// After
NFR: ["nfr", "requirements"],
```

### Step 4: Add helper function (cross-ref-linker.ts, after ID_ORIGIN)

```typescript
/** Check if a prefix originates from the given doc type */
function isOriginOf(prefix: string, docType: string): boolean {
  const origin = ID_ORIGIN[prefix];
  if (Array.isArray(origin)) return origin.includes(docType);
  return origin === docType;
}
```

### Step 5: Replace 3 consumer sites

- Line 197: `if (ID_ORIGIN[prefix] !== docType) continue;` -> `if (!isOriginOf(prefix, docType)) continue;`
- Line 245: same pattern
- Line 255: same pattern

### Step 6: Compile check

```bash
cd sekkei/packages/mcp-server && npm run lint
```

## Todo

- [ ] Fix `UPSTREAM_ID_TYPES["requirements"]` to `[]`
- [ ] Change `ID_ORIGIN` type to `Record<string, string | string[]>`
- [ ] Set `ID_ORIGIN["NFR"]` to `["nfr", "requirements"]`
- [ ] Add `isOriginOf()` helper
- [ ] Update 3 consumer sites (lines 197, 245, 255)
- [ ] Run `npm run lint` — no type errors
- [ ] Run `npm test` — existing tests pass (update in Phase 6)

## Success Criteria

- `npm run lint` passes with no type errors
- NFR-xxx IDs in requirements.md not flagged as orphaned
- Existing cross-ref tests pass (after Phase 6 updates)
- `UPSTREAM_ID_TYPES["requirements"]` returns `[]`

## Risk Assessment

- **#1 risk: LOW** — single constant change, no logic affected
- **#2 risk: MEDIUM** — type change affects 3 consumer sites. If missed, compiler catches it (type narrowing on `string | string[]` vs `string`)

## Security Considerations

None — internal validation logic only, no user input paths affected.

## Next Steps

- Phase 6: update `validator.test.ts` and `cross-ref-linker.test.ts`
- Run full test suite after Phase 6
