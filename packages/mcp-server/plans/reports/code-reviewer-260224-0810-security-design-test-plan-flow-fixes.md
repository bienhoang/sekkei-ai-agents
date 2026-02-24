# Code Review: Security-Design & Test-Plan Flow Fixes

**Date:** 2026-02-24
**Commit:** sekkei submodule HEAD (`2f70920`)
**Scope:** 8 changed files, ~13 logical fixes

---

## Scope

| File | Change |
|------|--------|
| `src/lib/cross-ref-linker.ts` | +8 CHAIN_PAIRS, traceabilityMatrix order fix, splitEntries type fix |
| `src/lib/validator.ts` | UPSTREAM_ID_TYPES for security-design expanded |
| `src/lib/completeness-rules.ts` | test-plan + project-plan depth rules added |
| `packages/skills/content/references/phase-design.md` | Prerequisite check + workflow detail for basic-design and security-design |
| `packages/skills/content/references/phase-test.md` | Prerequisite check + F-xxx cross-ref + next-steps for test-plan |
| `adapters/claude-code/SKILL.md` | Mirrored phase-design and phase-test changes |
| `tests/unit/cross-ref-linker.test.ts` | 4 new describe suites for new chain pairs |
| `tests/unit/completeness-checker.test.ts` | test-plan depth tests |

All 429 tests pass. Lint clean.

---

## Overall Assessment

Changes are logically sound and internally consistent. The V-model chain is now correctly wired: security-design receives REQ/NFR upstream from requirements/nfr (not only from basic-design), and test-plan receives REQ/NFR/F upstream from all three relevant documents. The skill workflow docs are well-detailed. One correctness gap and two minor issues noted below.

---

## Issues

### Medium — Correctness

**`SplitChainEntry` does not have `output?` but the inline type in `splitEntries` adds it**

`SplitChainEntry` (defined in `documents.ts`) has only `status`, `system_output?`, and `features_output?`. The fix in `cross-ref-linker.ts` line 153 adds `output?` to the inline intersection type used for `splitEntries`:

```ts
// cross-ref-linker.ts line 153
const splitEntries: [string, { output?: string; system_output?: string; features_output?: string }][] = [
  ["basic-design", chain.basic_design],
  ["detail-design", chain.detail_design],
];
```

`chain.basic_design` is typed as `SplitChainEntry` which does NOT have `output`. The inline type widens it, but the loop only iterates `system_output` and `features_output` (line 161) — so `output` in the intersection type is dead code. This is harmless at runtime but the added `output?` is misleading: it implies a monolithic path would be resolved, but the loop never reads it.

If a future caller sets `chain.basic_design.output` expecting it to be picked up by `loadChainDocs`, it will be silently ignored.

**Recommendation:** Either remove `output?` from the inline type (to match actual loop behaviour), or add a fallback read for `entry.output` in the single-file path, since `SplitChainEntry` doesn't support it anyway. Simplest fix:

```ts
// Option A: remove dead field from inline type
const splitEntries: [string, { system_output?: string; features_output?: string }][] = [
```

---

### Medium — Consistency gap between code and skill docs

**`security-design` prerequisite check in skill docs says "check `chain.basic_design.status`" but code requires basic-design upstream for cross-ref**

`UPSTREAM_ID_TYPES["security-design"]` is now `["REQ", "NFR", "API", "SCR", "TBL"]`. API/SCR/TBL originate from `basic-design`. The skill prerequisite (step 1) correctly aborts if basic-design is missing. Good.

However, the concatenation order in the prerequisite (step 4) is `requirements + nfr + basic-design`, but the cross-ref validator (`validateCrossRefs`) uses the full concatenated `upstream_content` to find all IDs of types REQ/NFR/API/SCR/TBL at once — it does not distinguish which sub-document each ID came from. This is the existing design and is fine. No action needed; noting for awareness.

---

### Low — Test coverage gap for `basic-design → test-plan` chain pair

The new test suite `analyzeGraph — basic-design → test-plan chain pair` only asserts `link` is defined. It does not assert any orphaned/missing ID behaviour:

```ts
// tests/unit/cross-ref-linker.test.ts (new suite)
it("links exist when both docs present", () => {
  ...
  expect(link).toBeDefined();
  // no orphaned/missing assertions
});
```

The BASIC_DESIGN fixture has SCR/TBL/API IDs; none of these are expected in test-plan (test-plan references REQ/F/NFR). So orphaned IDs from this pair would always be 0 for SCR/TBL/API (correct — they're not origin of basic-design in this pair context). But a test asserting that SCR-xxx IDs from basic-design are NOT incorrectly flagged as orphaned when test-plan doesn't reference them would be more useful. Low priority — the chain link existence check is at least a smoke test.

---

### Low — `project-plan` depth rule added without test

`completeness-rules.ts` now has a `project-plan` PP-xxx depth rule, but `completeness-checker.test.ts` does not have a corresponding `validateContentDepth — project-plan` test suite. The test-plan rule was correctly paired with tests; project-plan was not.

---

## Positive Observations

- **CHAIN_PAIRS additions are V-model correct.** requirements/nfr → security-design, requirements/nfr/basic-design → test-plan are proper cross-V links. The existing basic-design → security-design pair is preserved.
- **`UPSTREAM_ID_TYPES["security-design"]` expansion is coherent.** Adding API/SCR/TBL enables security-design to cross-reference the design artifacts it documents security controls for.
- **traceabilityMatrix `docOrder`** correctly adds `project-plan` between `functions-list` and `basic-design`.
- **Skill workflow docs are specific and actionable.** Prerequisite guards with explicit ABORT/WARN messaging, upstream content loading steps, and explicit `validate_document` calls (non-blocking) are good UX patterns.
- **SKILL.md and phase-*.md are kept in sync** — both files received identical changes, reducing divergence risk.
- **Test fixtures are realistic.** NFR, SECURITY_DESIGN, TEST_PLAN fixtures use proper Japanese content and realistic ID patterns.

---

## Recommended Actions

1. **(Medium)** Remove dead `output?` from `splitEntries` inline type in `cross-ref-linker.ts` line 153 — prevents future confusion about whether monolithic-path loading works for split docs.
2. **(Low)** Add `validateContentDepth — project-plan` tests to `completeness-checker.test.ts` to match the new PP-xxx depth rule.
3. **(Low)** Strengthen the `basic-design → test-plan` test to assert no false orphans (e.g., SCR-xxx defined in basic-design should not appear in orphaned list for this pair).

---

## Unresolved Questions

None.
