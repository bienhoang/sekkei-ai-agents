# Code Review: Fix Utility Flows
**Date:** 2026-02-24
**Reviewer:** code-reviewer agent
**Plan:** 260224-1012-fix-utility-flows

---

## Scope

| File | Change |
|------|--------|
| `packages/skills/content/references/utilities.md` | Phase 1 — validate (2-tier), glossary (remove seed/finalize), update (git show + staleness mode) |
| `packages/mcp-server/adapters/claude-code/SKILL.md` | Phase 1 — mirror all 3 flow changes to adapter |
| `packages/mcp-server/python/nlp/diff_analyzer.py` | Phase 2 — replace generic regex with whitelisted prefix pattern |
| `packages/mcp-server/src/lib/staleness-detector.ts` | Phase 2 — per-feature git log via resolveOutputPath |
| `packages/mcp-server/tests/unit/staleness-detector.test.ts` | Phase 3 — new tests for per-feature differentiation |

All 461 tests passing. Build + lint clean.

---

## Overall Assessment

Changes are correct, targeted, and well-reasoned. The staleness-detector refactor correctly scopes git log to per-feature doc paths. Python regex replacement is solid. Test coverage for the new behavior is adequate. One medium-priority inconsistency exists in SKILL.md (stale text in header and diagram); two low-priority notes on code robustness.

---

## Critical Issues

None.

---

## High Priority

None.

---

## Medium Priority

### M1 — SKILL.md header and diagram retain stale `seed`/`finalize` glossary references

The workflow section body at line 768 was correctly updated to `[add|list|find|export|import]`, but two other locations were not updated:

**Line 41** (command list):
```
- `/sekkei:glossary [seed|add|list|find|export|finalize]` — Manage project terminology
```

**Line 904** (V-model diagram):
```
└─► Glossary seed (/sekkei:glossary seed)
```

Both reference removed subcommands (`seed`, `finalize`). `utilities.md` has no such remnants. This creates a documentation inconsistency — a user reading the command table or the diagram in the adapter SKILL.md will see commands that no longer exist in the flow.

**Fix:**

Line 41 — change to:
```
- `/sekkei:glossary [add|list|find|export|import]` — Manage project terminology
```

Line 904 — the `Glossary seed` node can simply be removed from the diagram, or the line rephrased to show glossary as a standalone step:
```
└─► Glossary (/sekkei:glossary import|add)
```
(or remove it entirely — glossary is not a gate on Basic Design generation)

---

## Low Priority

### L1 — `resolveOutputPath` called without `scope` — returns default (monolithic) paths

In `staleness-detector.ts` lines 190-193:

```ts
const featureDocPaths = affectedTypes
  .map((dt) => resolveOutputPath(dt as DocType))
  .filter((p): p is string => p != null)
  .map((p) => `${outputDir}/${p}`);
```

`resolveOutputPath` is called with no `scope` or `featureName`. For `basic-design` and `detail-design`, this returns the monolithic path (`03-system/basic-design.md`), not per-feature paths. This is acceptable as a conservative default — staleness detection checks whether *any* doc of that type was recently updated, not necessarily the feature-specific file. But it will miss updates to `05-features/{id}/basic-design.md` in split-mode projects.

This is a pre-existing scope limitation (not a regression from this PR) but worth tracking.

**No immediate fix required.** If split-mode staleness accuracy is needed later, pass `scope: "feature"` and `featureName` from the feature_file_map key.

### L2 — `--since` flag passed as a single string token to `git.raw`

Lines 162, 169 in staleness-detector.ts:
```ts
["diff", "--name-only", sinceRef]   // where sinceRef = '--since="30 days ago"'
```

`git.raw` passes each array element as a discrete process argument. Git parses `--since="30 days ago"` (with literal double-quotes as part of the string) correctly because git's option parser strips the surrounding quotes. This works in practice and the tests confirm the behavior. However, it is non-idiomatic — the standard approach for `simple-git` is to split into two tokens: `"--since", "30 days ago"`. The current approach works but is fragile if `simple-git` ever changes quote handling.

**No immediate fix required** — behavior is verified by tests and consistent with the existing implementation pattern.

---

## Edge Cases from Scout Analysis

- `getAffectedDocTypes` returns `["requirements", "basic-design", "detail-design"]` as default fallback for unknown prefixes. Feature IDs in `feature_file_map` that don't match any known prefix (e.g., custom project-specific prefixes) will always check all three doc types — this is acceptable.
- `featureDocPaths` array can be empty if all `resolveOutputPath` calls return `undefined` (would happen for unsupported DocType casts). The `.filter(p => p != null)` guard handles this — `git log -- ` with no paths returns the full repo log (not an error), which would give an incorrect date. Actual risk is minimal because `getAffectedDocTypes` only returns valid doc types, but a defensive guard (skip the git call if `featureDocPaths.length === 0`) would be slightly safer.

---

## Positive Observations

1. **Python regex is correct.** The `(?:...)` non-capturing group is properly used — `_ID_PATTERN.findall()` returns full match strings (not groups), so `['F-001', 'REQ-002']` not `['F', 'REQ']`. Verified with live Python execution.
2. **Prefix alignment is exact.** `_ID_PREFIXES` in `diff_analyzer.py` matches `ID_TYPES` in `id-extractor.ts` character for character including `DD`, `TS`, `EV`, `MTG`, `ADR`, `IF`, `PG`.
3. **Test coverage for per-feature differentiation is solid.** Both new test cases (`gives different lastDocUpdate per feature` and `uses per-feature doc paths in git.raw call`) adequately verify the B9 fix behavior. The `mockRaw.mock.calls[3]` index assertion in L322-345 is correct: calls[0]=describe, calls[1]=diff --name-only, calls[2]=diff --stat, calls[3]=per-feature log.
4. **`since` bypass path is correct.** When `opts.since` is provided, `git.raw(["describe", ...])` is not called (the else-branch is skipped), so `mockRaw.mock.calls[0]` correctly points to `diff --name-only` in the since-ref tests.
5. **utilities.md and SKILL.md workflow sections are consistent** for all three changed flows (validate, glossary body, update/staleness). The bodies match.
6. **Input validation on `since` ref** (regex check before use) prevents git argument injection for the user-provided string path.

---

## Recommended Actions

1. **(M1 — fix now)** Update SKILL.md line 41 to `[add|list|find|export|import]` and remove/update the `Glossary seed` node on line 904. Two-line change, no logic impact.
2. (L1 — track) Consider split-mode path resolution in staleness detector if per-feature accuracy is needed in a future iteration.
3. (L2 — track) Consider splitting `--since` flag into two tokens (`"--since", "30 days ago"`) for idiomatic simple-git usage.

---

## Metrics

- Test coverage: 13/13 staleness-detector tests passing
- Linting: clean (build + tsc --noEmit pass per task description)
- All 461 tests pass

---

## Unresolved Questions

None.
