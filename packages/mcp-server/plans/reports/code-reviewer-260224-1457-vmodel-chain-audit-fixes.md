# Code Review: V-Model Chain Audit Fixes (6 Phases)

**Date:** 2026-02-24 | **Reviewer:** code-reviewer | **Score: 8/10**

---

## Scope

- **Files reviewed:** 18 source files + 4 new test files + extensions to 3 existing test files
- **LOC changed:** ~500 lines of source (excluding coverage artifacts, docs, plans)
- **Build:** `tsc --noEmit` PASSES
- **Tests:** 562/562 PASS (43 suites)
- **Focus:** All 6 phases of the V-Model Chain Audit Fixes plan

---

## Overall Assessment

Solid, well-structured implementation that correctly addresses the audit findings. Changes follow existing codebase patterns (ESM, SekkeiError, Zod schemas, YAML persistence). The `deriveUpstreamIdTypes` function eliminates dual-maintenance risk (the biggest architectural improvement). Test coverage is meaningful, not perfunctory. A few medium-priority issues noted below.

---

## Critical Issues

**None.**

No security vulnerabilities, no data loss risks, no breaking changes introduced.

---

## High Priority

### H1. `migrateConfigKeys` does not delete old underscore keys after migration

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/packages/mcp-server/src/lib/config-migrator.ts` (lines 99-113)

The migration loop copies `chain[key]` to `chain[hyphenKey]` but never deletes the original underscore key. After migration, the config will contain BOTH `functions_list` and `functions-list`, doubling every migrated entry.

```typescript
// Current: copies but doesn't delete
chain[hyphenKey] = chain[key];
migrated.push(`${key} → ${hyphenKey}`);

// Missing: delete chain[key];
```

**Impact:** Config file bloat, potential confusion, and idempotency claim is wrong (second run would skip all keys since hyphen versions already exist, leaving orphan underscore keys permanently).

**Fix:** Add `delete chain[key];` after the copy, or collect keys to delete after the loop to avoid modifying during iteration:

```typescript
const keysToDelete: string[] = [];
for (const key of Object.keys(chain)) {
  if (key.includes("_")) {
    const hyphenKey = key.replace(/_/g, "-");
    if (chain[hyphenKey] !== undefined) {
      skipped.push(key);
    } else {
      chain[hyphenKey] = chain[key];
      keysToDelete.push(key);
      migrated.push(`${key} → ${hyphenKey}`);
    }
  }
}
for (const key of keysToDelete) delete chain[key];
```

### H2. `checkDocStaleness` does not consider `features_output` for downstream doc

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/packages/mcp-server/src/lib/doc-staleness.ts` (lines 141-178)

The `checkChainStaleness` function (line 87) correctly takes `max(system_output, features_output)` via the `:features` keyed path + date cache. But `checkDocStaleness` (line 141) calls `gitLastModified(repoRoot, downPath)` using only `docPaths.get(docType)` -- it does NOT check `docPaths.get(\`${docType}:features\`)`. For split-mode docs as the downstream target, staleness is calculated against system_output only, missing the features_output timestamp.

**Impact:** Staleness advisory in `generate.ts` may produce false warnings for split-mode documents.

**Fix:** Apply the same max-timestamp logic used in `checkChainStaleness`:

```typescript
let downDate = await gitLastModified(repoRoot, downPath);
const featPath = docPaths.get(`${docType}:features`);
if (featPath) {
  const featDate = await gitLastModified(repoRoot, featPath);
  if (featDate && (!downDate || new Date(featDate) > new Date(downDate))) {
    downDate = featDate;
  }
}
if (!downDate) return [];
```

### H3. MAX_PROPAGATION_STEPS guard placed after step index bounds check

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/packages/mcp-server/src/tools/cr-propagation-actions.ts` (lines 97-107)

The guard checks `current.propagation_steps.length > MAX_PROPAGATION_STEPS` but this check runs AFTER the index bounds check at line 97 (`idx >= current.propagation_steps.length`). If `propagation_steps.length` is 25, the agent can successfully process 20 steps before the guard ever triggers on step 21. The guard should fire before any step processing.

Additionally, the guard `throw`s a `SekkeiError` directly, but the calling function does not wrap this in a try-catch. The MCP error response will be an unhandled throw. Looking at the calling chain: `handlePropagateNext` is called from `handleChangeRequestAction` which has a catch for `SekkeiError`, so this is actually OK. But the guard would be more effective at the top of the function, before line 97.

**Impact:** Degraded protection -- corrupt CRs can process up to MAX_PROPAGATION_STEPS before being caught. Not a security issue, but a correctness issue.

**Fix:** Move the guard to before the index check:

```typescript
const MAX_PROPAGATION_STEPS = 20;
if (current.propagation_steps.length > MAX_PROPAGATION_STEPS) {
  throw new SekkeiError(/* ... */);
}

const idx = current.propagation_index;
if (idx >= current.propagation_steps.length) {
  return ok(JSON.stringify({ all_steps_complete: true, ... }));
}
```

---

## Medium Priority

### M1. Duplicate `functions-list -> test-plan` chain pair possible

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/packages/mcp-server/src/lib/cross-ref-linker.ts` (lines 30, 59)

The pair `["requirements", "test-plan"]` appears at line 30, `["nfr", "test-plan"]` at line 31, `["basic-design", "test-plan"]` at line 32. Then `["functions-list", "test-plan"]` is added at line 59. There is no deduplication check on CHAIN_PAIRS. While a duplicate pair would cause double-processing in `analyzeGraph` (duplicate link reports), it would not break correctness. Current code has no duplicates, but the pattern of appending at the end of a long array without a proximity check is fragile.

**Recommendation:** Add a runtime uniqueness assertion or static comment noting this is the single location.

### M2. `deriveUpstreamIdTypes` computed at module load -- cold start cost

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/packages/mcp-server/src/lib/validator.ts` (lines 132-137)

```typescript
const UPSTREAM_ID_TYPES: Record<DocType, string[]> = Object.fromEntries(
  (DOC_TYPES as readonly string[]).map(dt => [
    dt,
    deriveUpstreamIdTypes(dt, UPSTREAM_OVERRIDES as Record<string, string[]>),
  ])
) as Record<DocType, string[]>;
```

This iterates all 22 doc types at import time, each scanning 57 CHAIN_PAIRS entries. Total: ~1,254 iterations. Negligible cost, but if CHAIN_PAIRS grows, this cold-start impact scales linearly.

**Verdict:** Acceptable for now. The benefit of eliminating dual-maintenance far outweighs the trivial compute cost.

### M3. `migrateCommand` missing path traversal validation on `--config` arg

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/packages/mcp-server/src/cli/commands/migrate.ts` (line 14)

The CLI `migrate` command resolves `args.config` with `resolve()` but does not validate against path traversal. While this is a CLI tool (not MCP), the `migrateConfigKeys` function does `readFile` + `writeFile` on the resolved path. A user could pass `--config ../../etc/something` and the function would attempt to read/write it.

**Verdict:** Low risk since this is CLI (user-initiated), but adding `.includes("..")` rejection would be consistent with other tools.

### M4. No unit tests for `config-migrator.ts`

The `migrateConfigKeys` function has the H1 bug above and no test coverage. The `migrateConfig` function (v1->v2 migration) also has no tests. Given the data-destructive nature of config migration (YAML comment loss, key renaming, file overwrite), this is a gap.

### M5. `autoValidate` config option not validated by Zod schema in generate tool

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/packages/mcp-server/src/tools/generate.ts` (line 437)

The `autoValidate` flag is read from `sekkei.config.yaml` via `parseYaml`, not from the MCP tool input schema. This is correct behavior (config-driven, not user-driven), but the TypeScript type relies on `as ProjectConfig` cast (line 436). If the config has `autoValidate: "yes"` instead of `true`, the truthy check passes silently.

**Verdict:** Minor -- YAML `true`/`false` parsing is reliable. Non-issue in practice.

### M6. `screen-design` and `interface-spec` added to CHAIN_PAIRS but missing from `loadChainDocPaths`/`loadChainDocs`

**Files:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/packages/mcp-server/src/lib/doc-staleness.ts`, `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/packages/mcp-server/src/lib/cross-ref-linker.ts`

The chain pairs `["basic-design", "screen-design"]`, `["basic-design", "interface-spec"]`, `["requirements", "interface-spec"]` are now in CHAIN_PAIRS (Phase 1 goal). But `loadChainDocPaths()` and `loadChainDocs()` do not have entries for `screen-design` or `interface-spec` in their `singleEntries` or `dualEntries` arrays.

This means:
- `checkChainStaleness` skips these pairs (no paths loaded)
- `validateChain` skips these pairs (no content loaded)
- CR propagation BFS will include them in steps but content won't load

The `ProjectConfig.chain` type in `documents.ts` does not have `screen_design` or `interface_spec` fields.

**Impact:** The chain pairs exist but are inert -- they will never be analyzed. Partial fix: the chain topology is correct for future use, but full integration requires config + loader updates.

---

## Low Priority

### L1. `plan_id` field is optional with `?` but test asserts it is not `"unknown"`

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/packages/mcp-server/src/types/plan.ts` (line 32)

`plan_id?: string` allows undefined. In `handleList`, the fallback is `p.plan_id ?? "unknown"`. The test (line 250) asserts `plan_id` is not `"unknown"`, verifying the fix works. Good.

### L2. `handleCancel` does not check if plan is `in_progress` with active phases

A plan that is `in_progress` can be cancelled, which is correct behavior. But phase files will retain `in_progress` status in their frontmatter. No downstream bug, just informational inconsistency.

### L3. Phase 6 test files: `translate-tool.test.ts`, `simulate-impact-tool.test.ts`, `import-document-tool.test.ts` are shallow

These tests verify registration, basic happy path, and error handling. They don't test tool-specific logic deeply (e.g., glossary injection in translate, BFS propagation in simulate-impact). Acceptable for this plan scope per the validation log (Q5: "Keep 3+1 scope").

### L4. `generateSuggestions` could accumulate large arrays

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/packages/mcp-server/src/lib/cross-ref-linker.ts` (lines 351-359)

If a project has many orphaned/missing IDs, suggestions array grows unbounded. Low risk for real projects.

---

## Positive Observations

1. **`deriveUpstreamIdTypes` eliminates dual-maintenance** -- this is the single most valuable change. CHAIN_PAIRS + ID_ORIGIN is now the only source of truth for cross-ref validation rules.

2. **UPSTREAM_OVERRIDES pattern** is clean -- edge cases (nfr self-referential NFR prefix, security-design SEC prefix) are explicitly overridden without polluting the general derivation logic.

3. **Plan `cancel` action** follows existing patterns perfectly -- status guard, date update, writePlan, consistent error messages.

4. **MAX_PROPAGATION_STEPS guard** addresses a real infinite-loop risk. The constant (20) is reasonable given the chain DAG has ~57 edges.

5. **Excel E2E test** actually reads back the xlsx and verifies cell content -- genuine end-to-end verification.

6. **`plan_id` persistence fix** is simple and correct -- store the directory name in YAML frontmatter, read it back in `handleList` instead of regenerating.

7. **Comment-loss warning** in `migrateConfigKeys` -- good UX decision per the validation log.

8. **Staleness advisory is non-blocking** -- wrapped in try-catch, won't crash generation.

9. **Validation log** in plan.md documents 7 design decisions with rationale -- excellent traceability.

---

## Metrics

| Metric | Value |
|--------|-------|
| Type Coverage | 100% (tsc --noEmit passes clean) |
| Test Suites | 43 pass / 0 fail |
| Tests | 562 pass / 0 fail |
| Linting Issues | 0 |
| New Source Files | 2 (`config-migrator.ts`, `cli/commands/migrate.ts`) |
| New Test Files | 4 (`translate-tool`, `simulate-impact-tool`, `import-document-tool`, `excel-export-e2e`) |

---

## Recommended Actions (Priority Order)

1. **[H1] Fix `migrateConfigKeys` to delete old underscore keys** -- bug, simple fix
2. **[H2] Fix `checkDocStaleness` to consider `features_output`** for split-mode downstream docs
3. **[H3] Move MAX_PROPAGATION_STEPS guard before index bounds check** in `handlePropagateNext`
4. **[M4] Add unit tests for `config-migrator.ts`** -- both `migrateConfig` and `migrateConfigKeys`
5. **[M6] Add `screen_design`/`interface_spec` to `ProjectConfig.chain` type and loaders** -- or document as intentional partial integration
6. **[M1] Add uniqueness assertion for CHAIN_PAIRS** -- defensive

---

## Phase Completeness Check

| Phase | Goal | Status | Notes |
|-------|------|--------|-------|
| 1 Chain Topology | Add 5 CHAIN_PAIRS + 3 meta-docs to display | DONE (4 pairs per validation log, self-ref removed) | Correct |
| 2 ID System | Derive UPSTREAM_ID_TYPES, OTHER bucket | DONE | Clean implementation |
| 3 Plan Management | plan_id fix, cancel action | DONE | Well tested |
| 4 CR & Staleness | MAX_PROPAGATION_STEPS, split-doc staleness | PARTIAL | H2 bug in checkDocStaleness, H3 guard ordering |
| 5 Generation | autoValidate config, migrate CLI | DONE | H1 bug in migrateConfigKeys |
| 6 Tests | 4 new test files + extensions | DONE | Shallow but acceptable per scope |

---

## Unresolved Questions

1. Should `screen-design` and `interface-spec` be added to `ProjectConfig.chain` type and the doc loaders now, or is the CHAIN_PAIRS-only integration intentional for this plan?
2. Is the `migrateConfigKeys` underscore key deletion omission intentional (keeping both formats for backward compat) or a bug?
3. The `migrateConfig` function (v1->v2) imports `readFile`/`writeFile` but the function is pure (takes string, returns string). The imports are only used by `migrateConfigKeys`. Consider splitting into separate files or removing unused imports from the pure function's perspective.
