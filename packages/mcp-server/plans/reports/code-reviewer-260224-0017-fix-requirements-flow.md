# Code Review: Fix Requirements Flow

**Plan:** 260224-0002-fix-requirements-flow
**Date:** 2026-02-24
**Files reviewed:** 6

---

## Scope

- `src/lib/completeness-rules.ts` — regex + message fix (line 34)
- `src/lib/generation-instructions.ts` — requirements + functions-list instruction blocks
- `templates/ja/requirements.md` — table schema + AI comments (lines 100-113)
- `CLAUDE.md` (project root) — chain diagram
- `sekkei/packages/skills/content/references/phase-requirements.md` — skill phase doc
- `tests/unit/completeness-checker.test.ts` — updated test data

**LOC changed:** ~40 lines across 6 files. All low-risk surgical edits.
**Test baseline:** 29 suites, 356 tests, all pass. TypeScript: 0 errors.

---

## Overall Assessment

The change correctly fixes a logical error where `requirements` completeness was checking for `F-xxx` IDs that cannot exist at that point in the V-model chain. The fix is minimal, consistent across layers (runtime rule, AI instruction, template, skill doc, test), and all tests pass. No regressions introduced.

---

## Critical Issues

None.

---

## High Priority

### H1 — `project-plan` and `test-plan` instructions still reference F-xxx as upstream cross-reference

**File:** `src/lib/generation-instructions.ts` lines 80, 89

```
"Cross-reference REQ-xxx, F-xxx IDs from upstream."        // project-plan
"Cross-reference REQ-xxx, F-xxx, NFR-xxx IDs from upstream." // test-plan
```

`project-plan` is generated in parallel with `functions-list` after `requirements` (per the CLAUDE.md chain). At the time `project-plan` is generated, `functions-list` may not exist yet. The skill doc (`phase-requirements.md` line 127) correctly says "Cross-reference REQ-xxx, F-xxx IDs from upstream" for project-plan and acknowledges that 機能一覧 may only be available later.

`test-plan` is generated from `requirements + basic-design` (line 84), where F-xxx does exist by then. The F-xxx reference in test-plan is correct.

For `project-plan` specifically, the instruction should acknowledge conditionality:

```ts
// current
"Cross-reference REQ-xxx, F-xxx IDs from upstream.",

// suggested
"Cross-reference REQ-xxx IDs from upstream 要件定義書. Cross-reference F-xxx IDs from 機能一覧 if available.",
```

This is not a crash-risk but will cause AI hallucination of F-xxx IDs when `functions-list` hasn't been generated yet.

---

## Medium Priority

### M1 — `functions-list` output path in skill doc is inconsistent

**File:** `sekkei/packages/skills/content/references/phase-requirements.md` line 61

```
6. Save output to `./sekkei-docs/functions-list.md`
```

All other documents in the same file use `{output.directory}/{folder}/{file}.md` pattern:
- `requirements` → `{output.directory}/02-requirements/requirements.md`
- `nfr` → `{output.directory}/02-requirements/nfr.md`
- `project-plan` → `{output.directory}/02-requirements/project-plan.md`

`functions-list` is the only one still using the old hardcoded `./sekkei-docs/` path. This was apparently outside the scope of the current fix (the issue description says the path fix was only for `requirements`), but it should be addressed:

```
6. Save output to `{output.directory}/02-requirements/functions-list.md`
```

### M2 — NFR IPA category names are inconsistent between `generation-instructions.ts` and `phase-requirements.md`

**File:** `generation-instructions.ts` line 57 vs `phase-requirements.md` line 107

`generation-instructions.ts`:
```
可用性, 性能・拡張性, 運用・保守性, 移行性, セキュリティ, システム環境・エコロジー
```

`phase-requirements.md` (nfr block):
```
可用性, 性能効率性, セキュリティ, 保守性, 移植性, 信頼性
```

These are different — the skill doc uses IPA NFUG v2-style terms while the generation instructions use the v1-style terms also present in `requirements.md` template (line 122). Whichever set is authoritative should be used consistently everywhere. This inconsistency predates the current fix but was not corrected.

---

## Low Priority

### L1 — `check` field description is "functional requirements" but it now verifies REQ-xxx presence

**File:** `src/lib/completeness-rules.ts` line 33

```ts
check: "functional requirements",
```

This string is user-facing in validation output. It accurately describes what's being checked, so it doesn't need changing, but `"REQ-xxx count"` would be more precise if the `check` field ever surfaces in UI.

### L2 — Template has duplicate `glossary` entry in YAML frontmatter sections list

**File:** `templates/ja/requirements.md` lines 9 and 17

```yaml
sections:
  - revision-history
  - ...
  - glossary          # line 9
  - ...
  - glossary          # line 17
```

Predates this fix. The duplicate does not cause a runtime error but is a data quality issue.

---

## Edge Cases Found

1. **Partial-chain generation:** If a user passes an existing requirements doc that happens to contain F-xxx IDs (from a legacy project or manual edits), the completeness check will no longer count them toward the 3-minimum. This is correct behavior but may surprise users migrating from v1 docs. No mitigation needed — the updated error message guides them to REQ-xxx.

2. **`project-plan` generated before `functions-list` completes:** See H1. The AI instruction currently asks it to cross-reference F-xxx IDs which don't exist in that scenario.

3. **`test-plan` F-xxx reference is legitimate** — test-plan takes `requirements + basic-design` as input, and basic-design is downstream of functions-list, so F-xxx will exist. The F-xxx reference on line 89 is correct and should not be removed.

---

## Positive Observations

- The fix is correctly applied at all three consistency layers: runtime rule, AI generation instruction, and Markdown template. This is the right approach — a single-layer fix would cause divergence.
- Test descriptions were updated to match the new expected behavior (not just the test data), making intent clear.
- The CLAUDE.md chain diagram now accurately reflects the parallel fan-out: `{ functions-list, nfr, project-plan }` after requirements.
- The skill doc's pre-check with auto-load of RFP workspace content is a good UX improvement — reduces user friction when the workspace exists.
- The `関連RFP項目` column is a better design than the old `機能ID`/`関連画面` columns at this chain stage, since it provides actual traceability back to the source rather than forward to docs that don't exist yet.

---

## Recommended Actions

1. **(High)** Fix `project-plan` generation instruction to make F-xxx conditional: `Cross-reference REQ-xxx IDs from upstream 要件定義書. F-xxx from 機能一覧 if available.`
2. **(Medium)** Fix `functions-list` output path in `phase-requirements.md` line 61: `./sekkei-docs/` → `{output.directory}/02-requirements/`
3. **(Medium)** Align NFR category names between `generation-instructions.ts` and `phase-requirements.md` (choose one authoritative set)

---

## Metrics

- Type coverage: 100% (tsc --noEmit passes)
- Test coverage: all 356 tests pass, requirements-specific tests updated
- Linting issues: 0

---

## Unresolved Questions

- Should `functions-list.md` live under `02-requirements/` or a dedicated `03-functions/` folder given it's conceptually parallel to nfr and project-plan?
- Are the IPA NFUG category names in `phase-requirements.md` intentionally a different standard version, or is this drift?
