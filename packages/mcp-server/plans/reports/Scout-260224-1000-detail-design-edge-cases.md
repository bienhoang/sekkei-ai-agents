# Scout Report: Detail-Design Split Mode Edge Cases

**Date:** 2026-02-24
**Scope:** Correctness of detail-design flow fixes (BUG-1 through BUG-7, IMP-1 through IMP-5)
**Status:** 7 edge cases identified, 2 require mitigation

## Edge Cases Discovered

### 1. Mode-Aware Upstream Loading: Undefined Read Paths (MEDIUM)

**File:** `phase-design.md` §2, lines 136–148

**Issue:** In split mode, prerequisite check attempts to read `{output.directory}/shared/*.md` without verifying the directory exists. If `shared/` is empty or missing:
- Line 139: `Read ALL {output.directory}/shared/*.md → shared_content` → empty string
- Line 142: `global_upstream = shared_content + "\n\n" + req_content + "\n\n" + fl_content` → leads to spurious leading/trailing `\n\n`

**Data Flow Risk:**
- Per-feature upstream assembly (line 176) will concatenate with empty or malformed `global_upstream`
- AI generation may receive upstream with incomplete context if shared sections weren't generated first

**Severity:** Medium — workflow requires shared sections first, but phase-design.md doesn't enforce ordering check.

**Recommendation:** Add validation in prerequisite check:
```
b-bis. Validate split prerequisites:
  - Check at least one file exists in {output.directory}/shared/
  - If not → ABORT: "Shared sections not found. Run detail-design shared sections first."
```

---

### 2. Per-Feature Upstream Assembly: Undefined Screen-Design (MEDIUM)

**File:** `phase-design.md` §4-d-i, lines 174–176

**Issue:** Line 175 reads `features/{feature-id}/screen-design.md` with `if exists`, but:
- Line 176: `feature_upstream = global_upstream + "\n\n" + feature_bd + "\n\n" + feature_scr`
- If screen-design is missing, `feature_scr = undefined`, concatenation becomes `... + feature_bd + "\n\n" + undefined`

**Data Flow Risk:** Per-feature upstream will contain `undefined` string or malformed context if screen-design missing. This breaks traceability when screen_input references SCR-xxx IDs.

**Severity:** Medium — affects feature docs that depend on screen-design for SCR references.

**Test Coverage Gap:** `completeness-checker.test.ts` (line 104–110) validates detail-design requires SCR-xxx references, but doesn't test the case where feature_scr is missing from upstream.

**Recommendation:**
```
i. Assemble per-feature upstream:
   - Read features/{feature-id}/basic-design.md → feature_bd
   - Read features/{feature-id}/screen-design.md → feature_scr (if exists, else "")
   - feature_upstream = global_upstream + "\n\n" + feature_bd + (feature_scr ? "\n\n" + feature_scr : "")
```

---

### 3. Split-Aware Chain Status: Inconsistent Output Path Handling (HIGH)

**File:** `phase-design.md` line 198, `resolve-output-path.ts` line 26

**Issue:** Inconsistency in path resolution for shared detail-design documents:
- `resolve-output-path.ts` line 26: `if (scope === "shared") return "03-system/";` (returns **directory**, not file)
- `phase-design.md` line 171: `Save to shared/{section-name}.md` (full file path)
- But line 198 for split mode: `system_output: "03-system/"` (directory path, consistent ✓)

**Analysis:** Actually **consistent** — `03-system/` is correct for system_output. However, **potential issue**:

The tool output suggests saving to `shared/{section-name}.md`, but if feature sections also target `03-system/`, there's a collision risk if shared and feature sections have same names.

**Severity:** High — shared sections should nest under `03-system/shared/` or similar to avoid overwriting.

**Test Coverage:** `resolve-output-path.test.ts` (line 36–38) tests the return value but doesn't test the actual save behavior or collision scenarios.

**Recommendation:** Clarify or fix:
- Option A: Return `03-system/shared/` instead of `03-system/`
- Option B: Document that shared section names must be unique across system_output

---

### 4. New Chain Pairs: Potential False Positives in Validation (MEDIUM)

**File:** `cross-ref-linker.ts` lines 25–27

**Issue:** Two new chain pairs added:
```typescript
["functions-list", "detail-design"],
["requirements", "detail-design"],
```

These allow F-xxx and REQ-xxx IDs to flow directly into detail-design **without** passing through basic-design. This is intentional per spec, but it introduces:

**False Positive Risk:**
- If a detail-design document references F-xxx or REQ-xxx IDs that exist in functions-list or requirements, the orphan check in `analyzeGraph()` (lines 260–268) will **not flag them as orphaned**, even if the referenced ID is actually invalid.
- Example: `detail-design.md` contains `F-999` (typo). `F-999` doesn't exist in `functions-list.md`. The chain pair `["functions-list", "detail-design"]` will still mark `F-999` as valid because it's in the `referenced` set but the linker doesn't validate ID existence, only presence.

**Severity:** Medium — false negatives in orphan detection, not validation failures.

**Test Coverage:** `cross-ref-linker.test.ts` (lines 94–110) tests orphan detection with valid IDs, but doesn't test with:
- Invalid IDs that pass the chain pair filter
- IDs that exist in functions-list but aren't SCR/TBL/API referenced by basic-design

**Recommendation:** Add test case:
```typescript
it("detects F-999 as invalid even with new chain pair if not in functions-list", () => {
  const docs = new Map([
    ["functions-list", "| F-001 | Feature 1 |"],
    ["detail-design", "CLS-001 references F-999 (typo)"],
  ]);
  const graph = buildIdGraph(docs);
  const report = analyzeGraph(graph, docs);

  const link = report.links.find(l => l.upstream === "functions-list" && l.downstream === "detail-design");
  expect(link?.missing_ids).toContain("F-999");
});
```

---

### 5. 3-Tier Prerequisite Check: Order Dependency (LOW)

**File:** `phase-design.md` lines 131–135

**Issue:** The 3-tier check for basic-design:
```
a. If sekkei.config.yaml exists → check chain.basic_design.status == "complete"
b. Else if split config active → check at least one features/*/basic-design.md exists
c. Else → check 03-system/basic-design.md exists
```

The check uses `sekkei.config.yaml` existence as primary signal, but:
- If config exists but chain entry is missing/empty, check (a) succeeds vacuously
- The code should check `chain.basic_design?.status === "complete"`, not just existence

**Severity:** Low — unlikely in practice since config is canonical, but defensive programming would help.

**Recommendation:** Tighten check (a):
```
a. If sekkei.config.yaml exists AND chain.basic_design?.status === "complete" → OK
```

---

### 6. Completeness Rules: SCR/TBL/API Reference Without Origin Validation (LOW)

**File:** `completeness-rules.ts` lines 57–78

**Issue:** New detail-design rules require SCR-xxx, TBL-xxx, API-xxx references, but:
- Line 65: `test: (c: string) => /SCR-\d+/.test(c)` — matches any SCR-xxx
- Line 70: `test: (c: string) => /TBL-\d+/.test(c)` — matches any TBL-xxx
- Line 75: `test: (c: string) => /API-\d+/.test(c)` — matches any API-xxx

These don't validate that the referenced SCR/TBL/API actually exist in upstream basic-design. They only check for **presence of the pattern**.

**Severity:** Low — this is a pattern check, not a full cross-reference validation. Cross-ref-linker.ts handles the full validation.

**Test Coverage:** `completeness-checker.test.ts` (line 112–116) tests pattern matching, not upstream validity. ✓ Sufficient for this layer.

**Recommendation:** Document this as a "pattern completeness check" vs "cross-reference validation" in comments.

---

### 7. Mode-Aware Upstream Loading: Monolithic Path State (MEDIUM)

**File:** `phase-design.md` lines 144–148

**Issue:** Monolithic mode prerequisite loads:
```
Read {output.directory}/03-system/basic-design.md → bd_content
Read {output.directory}/02-requirements/requirements.md → req_content (if exists)
Read {output.directory}/04-functions-list/functions-list.md → fl_content (if exists)
upstream_content = bd_content + "\n\n" + req_content + "\n\n" + fl_content
```

But step §5-a (line 183) says `Use upstream_content prepared in prerequisite check above`. However:
- If prerequisites run but upstream_content is not stored in a persistent context, step 5 won't have access to it
- The phase-design.md is a **workflow spec**, not code, so it depends on the skill implementation to store state

**Severity:** Medium — depends on implementation. If skill doesn't cache upstream_content between prerequisite check and generation step, it will re-read files (inefficient but safe).

**Test Coverage:** Integration tests in generate.ts should verify this, but scout cannot see the actual implementation detail.

**Recommendation:** Document expectation:
```
4-bis. Cache upstream_content in skill context for step 5 reuse (if not split)
```

---

## Summary

| # | Edge Case | Severity | Status | Next Action |
|---|-----------|----------|--------|------------|
| 1 | Empty shared/ dir in split mode | MEDIUM | Identified | Add prerequisite validation |
| 2 | Undefined screen-design in per-feature upstream | MEDIUM | Identified | Fix string concatenation |
| 3 | Collision risk in shared section paths | HIGH | Needs clarification | Rename to `03-system/shared/` |
| 4 | False negatives in orphan detection with new chain pairs | MEDIUM | Identified | Add test case |
| 5 | 3-tier check missing config validation | LOW | Identified | Tighten check (a) |
| 6 | Pattern-only completeness for SCR/TBL/API | LOW | Expected | Document as pattern check |
| 7 | Upstream content caching between steps | MEDIUM | Depends on impl | Document context requirement |

## Unresolved Questions

1. How does the skill implementation cache `upstream_content` between prerequisite check and generation step? Code implementation needed.
2. Is the `03-system/shared/` collision scenario tested in integration tests?
3. Should the new chain pairs `["functions-list", "detail-design"]` and `["requirements", "detail-design"]` be bidirectional or only upstream→downstream for orphan detection?

