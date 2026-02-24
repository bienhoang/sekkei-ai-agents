---
title: "Phase 2: ID System Unification"
status: complete
priority: P2
effort: 1.5h
covers: [P2.1, P2.2]
created: 2026-02-24
completed: 2026-02-24
---

# Phase 2: ID System Unification

## Context Links

- Parent plan: [plan.md](./plan.md)
- Research: [researcher-01-chain-topology-ids.md](./research/researcher-01-chain-topology-ids.md)
- Blocked by: Phase 1 (CHAIN_PAIRS must be final before deriving UPSTREAM_ID_TYPES)
- Blocks: Phase 6 (tests validate the new derived UPSTREAM_ID_TYPES)

## Overview

- **Date:** 2026-02-24
- **Description:** Add `OTHER` bucket for custom prefixes in `extractIds`; replace hand-maintained `UPSTREAM_ID_TYPES` with a derived function backed by CHAIN_PAIRS + ID_ORIGIN, with explicit overrides for known edge cases.
- **Priority:** P2
- **Implementation status:** pending
- **Review status:** pending

## Key Insights

From researcher-01:
- `extractIds` (Map<prefix, ids[]>) and `extractAllIds` (Set<string>) answer **different questions** — the divergence is intentional. Do NOT merge them.
- `extractIds` only matches `ID_PATTERN` (23 known prefixes). Custom prefixes like `SAL-001` fall through. Fix: add an `OTHER` bucket using `CUSTOM_ID_PATTERN` for unrecognized matches.
- `UPSTREAM_ID_TYPES` is module-private in `validator.ts` and drifts from CHAIN_PAIRS. Derived table shows gaps: `ut-spec` missing `TP/TS`, `uat-spec` missing `TP/TS`, `detail-design` missing `F/REQ`.
- Pure derivation over-includes self-referential prefixes (`NFR` in nfr doc, `SEC` in security-design). Override map needed for these cases.
- `cr-backfill.ts` has a local `extractIds` shadow (returns `Set<string>`) — do NOT change that file in this phase.

Derived vs current UPSTREAM_ID_TYPES deltas (key ones to fix):

| DocType | Add | Note |
|---------|-----|------|
| `ut-spec` | `TP, TS` | test-plan is upstream |
| `uat-spec` | `TP, TS` | test-plan is upstream |
| `detail-design` | `F, REQ` | functions-list + requirements upstream |
| `nfr` | keep `NFR` override | self-ref, not derivable |
| `security-design` | remove `SEC` from derived | self-origin, not upstream |

## Requirements

### Functional
- `extractIds` adds custom-prefix matches into an `"OTHER"` bucket (key `"OTHER"` in the returned Map)
- `deriveUpstreamIdTypes(docType)` function exported from `cross-ref-linker.ts`; walks CHAIN_PAIRS to find upstreams, maps via ID_ORIGIN to prefixes
- Override map in `validator.ts` corrects edge cases: nfr self-ref, security-design self-ref
- `UPSTREAM_ID_TYPES` replaced by call to `deriveUpstreamIdTypes` at module init time (computed once, stored as const)
- Exported `deriveUpstreamIdTypes` is testable independently

### Non-Functional
- `extractIds` return type stays `Map<string, string[]>` — callers unaffected
- `validateCrossRefs` in validator.ts logic unchanged; only the upstream type map changes
- No change to `extractAllIds` — its `CUSTOM_ID_PATTERN` already covers all prefixes

## Architecture

```
cross-ref-linker.ts
  CHAIN_PAIRS + ID_ORIGIN (already exported)
  + deriveUpstreamIdTypes(docType) → string[]   ← NEW export

id-extractor.ts
  extractIds()  ← adds OTHER bucket
  extractAllIds() (unchanged)

validator.ts
  UPSTREAM_ID_TYPES  ← replaced by computed const
  UPSTREAM_OVERRIDES ← new: edge-case corrections
```

`deriveUpstreamIdTypes` in `cross-ref-linker.ts` is the right home because CHAIN_PAIRS and ID_ORIGIN both live there. Importing into `validator.ts` avoids circular deps (validator doesn't export anything cross-ref-linker needs).

## Related Code Files

### Modify
- `packages/mcp-server/src/lib/id-extractor.ts` — add OTHER bucket to `extractIds`
- `packages/mcp-server/src/lib/cross-ref-linker.ts` — add `deriveUpstreamIdTypes` export
- `packages/mcp-server/src/lib/validator.ts` — replace UPSTREAM_ID_TYPES const with derived computation + override map

### Create
- none

## Implementation Steps

### Step 1 — Add OTHER bucket to `extractIds` (id-extractor.ts)

After the existing `for` loop over `ID_PATTERN` matches (line 36), add:

```typescript
// Capture custom prefixes not in ID_TYPES into OTHER bucket
const knownPrefixes = new Set(ID_TYPES as readonly string[]);
for (const match of content.matchAll(CUSTOM_ID_PATTERN)) {
  const prefix = match[1];
  if (!knownPrefixes.has(prefix)) {
    const existing = result.get("OTHER") ?? [];
    if (!existing.includes(match[0])) existing.push(match[0]);
    result.set("OTHER", existing);
  }
}
```

Note: `CUSTOM_ID_PATTERN` uses global flag — reset index before second use by calling `matchAll` (creates fresh iterator each call, so no index issue).

### Step 2 — Add `deriveUpstreamIdTypes` to cross-ref-linker.ts

Add after the `ID_ORIGIN` const (after line 80):

```typescript
/**
 * Derive upstream ID prefixes for a doc type from CHAIN_PAIRS + ID_ORIGIN.
 * Returns sorted array of prefixes that originate from upstream docs.
 */
export function deriveUpstreamIdTypes(
  docType: string,
  overrides?: Record<string, string[]>
): string[] {
  const upstreams = CHAIN_PAIRS
    .filter(([, down]) => down === docType)
    .map(([up]) => up);

  const prefixes = new Set<string>();
  for (const [prefix, origin] of Object.entries(ID_ORIGIN)) {
    const origins = Array.isArray(origin) ? origin : [origin];
    if (origins.some(o => upstreams.includes(o))) {
      prefixes.add(prefix);
    }
  }

  if (overrides?.[docType]) {
    // Replace derived set with explicit override
    return overrides[docType].slice().sort();
  }
  return [...prefixes].sort();
}
```

### Step 3 — Replace UPSTREAM_ID_TYPES in validator.ts

1. Add import at top of validator.ts:
   ```typescript
   import { deriveUpstreamIdTypes } from "./cross-ref-linker.js";
   ```

2. Replace the `UPSTREAM_ID_TYPES` const (lines 120–143) with:
   ```typescript
   /**
    * Edge-case overrides where pure derivation from CHAIN_PAIRS is wrong:
    * - nfr: NFR prefix is self-referential (requirements doc also defines NFR-xxx rows)
    * - security-design: SEC originates from security-design itself, not from upstream
    * - ut-spec/uat-spec: TP/TS from test-plan must be included (derivation will add them
    *   after Phase 1 adds test-plan as upstream)
    */
   const UPSTREAM_OVERRIDES: Partial<Record<DocType, string[]>> = {
     nfr: ["NFR", "REQ"],           // keep self-ref NFR intentionally
     "security-design": ["API", "NFR", "REQ", "SCR", "TBL"], // exclude SEC (self-origin)
   };

   /** Computed once at module load from CHAIN_PAIRS + ID_ORIGIN */
   const UPSTREAM_ID_TYPES: Record<DocType, string[]> = Object.fromEntries(
     (DOC_TYPES as readonly string[]).map(dt => [
       dt,
       deriveUpstreamIdTypes(dt, UPSTREAM_OVERRIDES as Record<string, string[]>),
     ])
   ) as Record<DocType, string[]>;
   ```

3. Verify `DOC_TYPES` is already imported in validator.ts (it is, from `../types/documents.js`).

### Step 4 — Type-check and test

```bash
cd packages/mcp-server
npm run lint
node --experimental-vm-modules node_modules/.bin/jest --config jest.config.cjs \
  tests/unit/id-extractor.test.ts \
  tests/unit/validator.test.ts \
  tests/unit/cross-ref-linker.test.ts
```

## Todo List

- [ ] Add OTHER bucket logic to `extractIds` in id-extractor.ts
- [ ] Export `deriveUpstreamIdTypes` from cross-ref-linker.ts
- [ ] Add `UPSTREAM_OVERRIDES` map in validator.ts
- [ ] Replace `UPSTREAM_ID_TYPES` const with computed derivation
- [ ] Add import of `deriveUpstreamIdTypes` in validator.ts
- [ ] Run lint — no errors
- [ ] Run id-extractor, validator, cross-ref-linker tests — pass
- [ ] Manually verify derived UPSTREAM_ID_TYPES for ut-spec includes TP, TS
- [ ] Manually verify derived UPSTREAM_ID_TYPES for detail-design includes F, REQ

## Success Criteria

- `extractIds("SAL-001 REQ-001")` returns Map with `OTHER → ["SAL-001"]` and `REQ → ["REQ-001"]`
- `deriveUpstreamIdTypes("ut-spec")` returns array containing `"TP"` and `"TS"`
- `deriveUpstreamIdTypes("nfr")` returns `["NFR","REQ"]` (override applied)
- `deriveUpstreamIdTypes("security-design")` does NOT include `"SEC"`
- All existing validator tests pass (cross-ref validation logic unchanged)

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Derived UPSTREAM_ID_TYPES stricter than current → breaks existing valid docs | Medium | Run full test suite; use overrides to soften if needed |
| `CUSTOM_ID_PATTERN` global flag reuse causing match index issues | Low | `matchAll` creates fresh iterator per call — safe |
| detail-design now requiring F/REQ breaks projects that omit them | Medium | These are cross-ref warnings, not hard errors — acceptable |
| circular import: validator → cross-ref-linker (already imports it?) | Low | Verify no circular dep before merging |

## Security Considerations

None — read-only text analysis, no external IO.

## Next Steps

- Phase 6 (tests) should add a test asserting `deriveUpstreamIdTypes` output for key doc types.
- After this phase, update `tests/unit/validator.test.ts` if any existing cross-ref assertions use the old (under-specified) UPSTREAM_ID_TYPES values.
