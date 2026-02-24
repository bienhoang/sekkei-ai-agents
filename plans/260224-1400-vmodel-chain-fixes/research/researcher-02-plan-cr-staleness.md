# Research: Plan Management, CR Propagation & Staleness Detection

**Date:** 2026-02-24 | **Files read:** 5

---

## 1. plan-actions.ts — Key Locations

| Symbol | Lines | Notes |
|--------|-------|-------|
| `PLAN_ACTIONS` dispatch | 409–419 | `switch (args.action)` in `handlePlanAction` |
| `handleCreate` | 122–186 | |
| `handleStatus` | 188–202 | |
| `handleList` | 204–221 | **BUG HERE** |
| `handleDetect` | 223–276 | |
| `handleUpdate` | 278–299 | |
| `handleExecute` | 301–405 | |

---

## 2. plan_id Bug in `handleList` (line 211)

### Problematic code (lines 208–218)

```ts
const summary = plans.map(p => {
  const completed = p.phases.filter(ph => ph.status === "completed" || ph.status === "skipped").length;
  return {
    plan_id: generatePlanId(p.doc_type), // reconstruct from created date + doc_type
    // ...
  };
});
```

**Problem:** `generatePlanId(doc_type)` is called at list-time, generating a **new** ID with `Date.now()` rather than the stored ID. The comment itself says "reconstruct from created date + doc_type" but `generatePlanId` uses current timestamp, not `p.created`.

The actual plan directory name is the canonical `plan_id` — it is set once in `handleCreate` (line 142):
```ts
const planId = generatePlanId(doc_type);  // called at create time
const planDir = join(plansDir, planId);
```

### Proposed fix

`listPlans()` in `lib/plan-state.ts` must return the directory name alongside the plan data. Then `handleList` uses that:

```ts
// Option A — if listPlans returns {plan, dirName}[]
plan_id: entry.dirName,

// Option B — store plan_id inside plan.md YAML and read it back
plan_id: p.plan_id,   // persisted field
```

Option B is self-contained. Add `plan_id` field to `GenerationPlan` type and write it during `handleCreate`. Read it back in `handleList`.

---

## 3. cr-propagation-actions.ts — `propagate_next` Flow

**File:** `src/tools/cr-propagation-actions.ts`, lines 64–150

### Flow summary

1. **Line 69** — guard: requires `APPROVED` or `PROPAGATING` status
2. **Lines 74–91** — if status is `APPROVED`: create git checkpoint, then `transitionCR → PROPAGATING`
3. **Line 93** — re-read CR (after state write)
4. **Line 94** — `idx = current.propagation_index`
5. **Lines 96–98** — exit if `idx >= propagation_steps.length` → returns `{all_steps_complete: true}`
6. **Line 100** — `step = propagation_steps[idx]`
7. **Lines 103–107** — build `instruction` string based on `step.direction`
8. **Lines 109–128** — optional `suggest_content` for upstream steps
9. **Lines 130–133** — mark step `done`, increment `propagation_index`, `writeCR`
10. **Lines 135–148** — build response with `all_steps_complete: idx + 1 >= total`

### Step count / guard analysis

- `total = current.propagation_steps.length` is reported in the response but **not enforced as a cap** beyond the `idx >= length` check (line 96)
- Steps are populated by `computePropagationOrder(cr.origin_doc)` during `handleAnalyze` (line 32)
- **No max-steps guard** exists — if `propagation_steps` array is large, calls continue indefinitely

### Where to insert max-steps guard

After line 96 (or combined with it):

```ts
// After the all_steps_complete check (line 98)
const MAX_PROPAGATION_STEPS = 20;
if (current.propagation_steps.length > MAX_PROPAGATION_STEPS) {
  return err(`propagation_steps count (${current.propagation_steps.length}) exceeds limit of ${MAX_PROPAGATION_STEPS}`);
}
```

Or a configurable limit via `args.max_steps`.

---

## 4. doc-staleness.ts — Split-Doc Timestamp Resolution

**File:** `src/lib/doc-staleness.ts`, lines 47–63

### Current behavior (lines 54–62)

```ts
for (const [docType, entry] of dualEntries) {
  if (!entry) continue;
  if (entry.output) {
    paths.set(docType, resolve(base, entry.output));    // single-file: exact path
  } else if (entry.system_output) {
    // Use system_output dir as representative path for split docs
    paths.set(docType, resolve(base, entry.system_output));
  }
}
```

**Problem:** For split-mode docs (no `output`, only `system_output` + `features_output`), only `system_output` is used as the representative. Git log on a **directory** path returns the latest commit touching any file in that directory — this works but is a heuristic.

**What needs to change:**
- `gitLastModified` (line 68) is called with `system_output` dir path — `simple-git log({file: dirPath})` returns the most recent commit for files under that dir, which is acceptable
- However `features_output` dir is **never consulted** — if features were updated more recently than system, the downstream staleness check will under-report
- Fix: for split docs, take `max(gitLastModified(system_output), gitLastModified(features_output))` as the representative timestamp

### Proposed change (lines 59–62)

```ts
} else if (entry.system_output) {
  const sysDate = await gitLastModified(repoRoot, resolve(base, entry.system_output));
  const featDir = (entry as { features_output?: string }).features_output;
  const featDate = featDir ? await gitLastModified(repoRoot, resolve(base, featDir)) : null;
  // take the later of the two
  const best = (!sysDate) ? featDate
    : (!featDate) ? sysDate
    : (new Date(sysDate) > new Date(featDate) ? sysDate : featDate);
  if (best) dateCache.set(docType, best);
}
```

This requires refactoring `loadChainDocPaths` to return both paths, or handling the max-date logic inside `getDate()`.

---

## 5. generate.ts — Auto-Validate Insertion Point

**File:** `src/tools/generate.ts`

Handler: `handleGenerateDocument`, lines 199–443.

Return statement (success path): **lines 431–433**

```ts
return {
  content: [{ type: "text", text: finalOutput }],
};
```

**Auto-validate hook should go before this return**, after the git auto-commit block (lines 401–411) and changelog append (lines 413–429). Suggested position: ~line 430.

```ts
// After changelog append, before return:
if (config_path && output_path) {
  try {
    const { checkDocStaleness } = await import("../lib/doc-staleness.js");
    const warnings = await checkDocStaleness(config_path, doc_type);
    // append warnings summary to finalOutput or log via logger
  } catch { /* non-blocking */ }
}
```

---

## 6. chain-status.ts — CHAIN_DISPLAY_ORDER

**File:** `src/tools/chain-status.ts`, **lines 77–82**

```ts
const CHAIN_DISPLAY_ORDER: { phase: Phase; label: string; keys: string[] }[] = [
  { phase: "requirements", label: "要件定義", keys: ["requirements", "nfr", "functions_list", "project_plan"] },
  { phase: "design",       label: "設計",     keys: ["basic_design", "security_design", "detail_design"] },
  { phase: "test",         label: "テスト",   keys: ["test_plan", "ut_spec", "it_spec", "st_spec", "uat_spec"] },
  { phase: "supplementary",label: "補足",     keys: ["operation_design", "migration_design", "glossary"] },
];
```

Note: keys use `snake_case` (matching YAML config keys), but `doc_type` output on line 108 converts via `.replace(/_/g, "-")`.

---

## Summary of Required Fixes

| # | File | Issue | Fix |
|---|------|-------|-----|
| 1 | `plan-actions.ts:211` | `plan_id` regenerated on list (wrong timestamp) | Persist `plan_id` in `plan.md` or return `dirName` from `listPlans` |
| 2 | `cr-propagation-actions.ts:96` | No max-steps guard on `propagate_next` | Add cap check after all_steps_complete guard |
| 3 | `doc-staleness.ts:59–62` | Split docs only check `system_output`; `features_output` ignored | Take max of both dirs' git timestamps |
| 4 | `generate.ts:430` | No post-generate staleness re-check | Insert `checkDocStaleness` advisory after changelog block |

---

## Unresolved Questions

1. Does `listPlans()` in `lib/plan-state.ts` currently return directory names? If not, Option B (persist `plan_id` in YAML) is cleaner.
2. Is `gitLastModified` with a directory path (not a file) reliably supported by `simple-git`? Needs test.
3. What is the intended `MAX_PROPAGATION_STEPS` limit — hardcoded or configurable in `sekkei.config.yaml`?
4. For `features_output`, the field type in `ProjectConfig` may not expose it on the dual-entry type — confirm schema definition in `types/documents.ts`.
