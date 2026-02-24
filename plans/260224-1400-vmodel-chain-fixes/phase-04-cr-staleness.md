---
title: "Phase 4: CR & Staleness Fixes"
status: complete
priority: P2
effort: 1h
covers: [P2.4, P3.2]
created: 2026-02-24
completed: 2026-02-24
---

# Phase 4: CR & Staleness Fixes

## Context Links

- Parent plan: [plan.md](./plan.md)
- Research: [researcher-02-plan-cr-staleness.md](./research/researcher-02-plan-cr-staleness.md)
- Blocked by: none (independent)
- Blocks: none

## Overview

- **Date:** 2026-02-24
- **Description:** Add a max-steps guard to `propagate_next` to prevent runaway propagation loops; fix split-doc staleness to take `max(system_output, features_output)` git timestamps instead of only checking `system_output`.
- **Priority:** P2
- **Implementation status:** pending
- **Review status:** pending

## Key Insights

From researcher-02:

**CR max-steps guard (P2.4):**
- `propagate_next` in `cr-propagation-actions.ts` already exits when `idx >= propagation_steps.length` (line 96), so infinite loops can't happen if the array is static. The risk is a malformed or corrupted CR where `propagation_steps` is extremely large (e.g., BFS traversal over a cycle produces 100+ steps).
- Guard placement: after line 96 (all_steps_complete check), before accessing `propagation_steps[idx]`.
- Use a constant `MAX_PROPAGATION_STEPS = 20` (hardcoded — configurable via `sekkei.config.yaml` is P4 scope, YAGNI for now).
- Return a typed `SekkeiError` (code `"CR_ERROR"`) so the client gets a structured message.

**Split-doc staleness (P3.2):**
- `doc-staleness.ts` lines 54–62: for split-mode docs, only `system_output` directory is used as the representative path for `gitLastModified`.
- `features_output` dir may have been modified more recently (e.g., a feature doc was updated but the shared system doc was not). This causes under-reporting of staleness.
- Fix: for each split-mode doc, call `gitLastModified` for both dirs and take the later timestamp.
- Concern from research: `features_output` field may not be typed on the dual-entry type. Confirm the `ProjectConfig` chain entry shape before casting.

## Requirements

### Functional
- `propagate_next` guard: if `propagation_steps.length > MAX_PROPAGATION_STEPS`, return `SekkeiError("CR_ERROR", ...)` before processing any step
- `doc-staleness.ts`: for split entries (has `system_output` but no `output`), compute `max(gitLastModified(system_output_dir), gitLastModified(features_output_dir))` — handle null/undefined `features_output` gracefully

### Non-Functional
- `MAX_PROPAGATION_STEPS = 20` as named constant (not magic number inline)
- Staleness fix must not break projects that have only `system_output` (no `features_output` in config)
- No changes to CR state machine or staleness public API surface

## Architecture

**CR guard:** Single check inserted in `cr-propagation-actions.ts`. The check reads `current.propagation_steps.length` which is already available at that point in the flow.

**Staleness fix:** `loadChainDocPaths` in `doc-staleness.ts` builds a `Map<docType, filePath>`. For split-mode docs, instead of storing one path, compute the max-date inline during path loading. Alternative: store both paths as a tuple and resolve max in `getDate()`. The inline approach (compute at load time) is simpler — preferred per KISS.

```
doc-staleness.ts
  loadChainDocPaths()
    split entry:
      sysDate = await gitLastModified(system_output)
      featDate = features_output
                   ? await gitLastModified(features_output)
                   : null
      representative = max(sysDate, featDate)
      dateCache.set(docType, representative)   ← skip paths.set(), set dateCache directly
```

This requires understanding whether `loadChainDocPaths` currently returns paths or dates. From research: it returns `Map<docType, filePath>` and `getDate()` calls `gitLastModified` lazily. Refactor: for split-mode docs, pre-populate `dateCache` instead of `paths`, so `getDate()` hits cache first and skips `gitLastModified` call for those entries.

## Related Code Files

### Modify
- `packages/mcp-server/src/tools/cr-propagation-actions.ts` — add MAX_PROPAGATION_STEPS guard after line 96
- `packages/mcp-server/src/lib/doc-staleness.ts` — fix split-doc timestamp to use max of both dirs

### Create
- none

## Implementation Steps

### Step 1 — Read exact code structure of doc-staleness.ts

Before editing, read lines 40–140 of `doc-staleness.ts` to confirm: (a) how `dateCache` and `paths` are structured, (b) whether `features_output` is on the chain config type.

### Step 2 — Add MAX_PROPAGATION_STEPS guard (cr-propagation-actions.ts)

Locate the `all_steps_complete` early-exit around line 96:
```typescript
if (idx >= propagation_steps.length) {
  return ok(JSON.stringify({ all_steps_complete: true }, null, 2));
}
```

Add the guard immediately after:
```typescript
const MAX_PROPAGATION_STEPS = 20;
if (current.propagation_steps.length > MAX_PROPAGATION_STEPS) {
  throw new SekkeiError(
    "CR_ERROR",
    `propagation_steps count (${current.propagation_steps.length}) exceeds maximum of ${MAX_PROPAGATION_STEPS}. CR may be corrupted.`
  );
}
```

Verify `SekkeiError` is already imported in this file (it is, from `../lib/errors.js`).

### Step 3 — Fix split-doc staleness (doc-staleness.ts)

Locate the split-mode branch (lines ~59–62):
```typescript
} else if (entry.system_output) {
  paths.set(docType, resolve(base, entry.system_output));
}
```

Replace with:
```typescript
} else if (entry.system_output) {
  const sysPath = resolve(base, entry.system_output);
  const featPath = (entry as { features_output?: string }).features_output
    ? resolve(base, (entry as { features_output?: string }).features_output!)
    : null;

  // Pre-populate dateCache with max of both dirs rather than storing one path
  const sysDate = await gitLastModified(repoRoot, sysPath);
  const featDate = featPath ? await gitLastModified(repoRoot, featPath) : null;

  const best = !sysDate ? featDate
    : !featDate ? sysDate
    : new Date(sysDate) >= new Date(featDate) ? sysDate : featDate;

  if (best) dateCache.set(docType, best);
  // Do NOT set paths.set() for split docs — dateCache takes priority in getDate()
}
```

Verify that `getDate()` checks `dateCache` before calling `gitLastModified(repoRoot, paths.get(docType))`. If it does, the split-doc entries will use the pre-computed max date. If the cache check is absent, add it.

### Step 4 — Confirm getDate() cache-first logic

Read `getDate()` implementation. If it looks like:
```typescript
async function getDate(docType: string): Promise<string | null> {
  if (dateCache.has(docType)) return dateCache.get(docType)!;
  const p = paths.get(docType);
  if (!p) return null;
  const d = await gitLastModified(repoRoot, p);
  if (d) dateCache.set(docType, d);
  return d ?? null;
}
```
— no change needed. If cache check is missing, add `if (dateCache.has(docType)) return dateCache.get(docType)!;` as first line.

### Step 5 — Type-check and test

```bash
cd packages/mcp-server
npm run lint
node --experimental-vm-modules node_modules/.bin/jest --config jest.config.cjs \
  tests/unit/staleness-detector.test.ts \
  tests/unit/staleness-formatter.test.ts
```

## Todo List

- [ ] Read doc-staleness.ts lines 40–140 to confirm dateCache / paths structure
- [ ] Read cr-propagation-actions.ts lines 90–100 for exact guard insertion point
- [ ] Add `MAX_PROPAGATION_STEPS` constant and guard in cr-propagation-actions.ts
- [ ] Replace split-doc path assignment with pre-computed max-date in doc-staleness.ts
- [ ] Confirm `getDate()` is cache-first; add cache check if missing
- [ ] Run lint — no errors
- [ ] Run staleness tests — pass

## Success Criteria

- A CR with 21+ propagation_steps triggers SekkeiError before processing any step
- A project where `features_output` dir has a newer commit than `system_output` dir correctly reports the later date as the doc's modification time
- Projects with only `system_output` (no `features_output`) behave identically to before
- All existing staleness tests pass

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| `features_output` field not on runtime type → TS error | Medium | Use `as { features_output?: string }` cast; confirm field in config YAML schema |
| `gitLastModified` on directory path unreliable in simple-git | Low | Existing code already uses dir paths for system_output — same mechanism |
| dateCache pre-population conflicts with lazy-load in getDate() | Low | Confirm cache-first check exists; add if missing (Step 4) |
| MAX_PROPAGATION_STEPS = 20 too low for large projects | Low | Typical V-model has ~15 doc types; 20 is generous. Can be raised without API change |

## Security Considerations

- `resolve(base, entry.features_output)` — `features_output` comes from YAML config file, not user input. Path containment validation should already exist in the config loader. No additional validation needed here.

## Next Steps

- Phase 6 (tests): add unit test for propagation guard using a mock CR with 21 steps.
- If `features_output` field needs to be added to the `ProjectConfig` type in `types/documents.ts`, do so in this phase before the cast.
