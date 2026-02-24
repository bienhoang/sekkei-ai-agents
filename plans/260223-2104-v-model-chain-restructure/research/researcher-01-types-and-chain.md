# Sekkei Type System & Chain Logic Research

**Conducted:** 2026-02-23
**Scope:** READ-ONLY analysis of current MCP server architecture
**Output:** Foundation for V-model restructuring plan

---

## 1. DocType Enum & Chain Entry Types

**Location:** `src/types/documents.ts:6-155`

### Current DocTypes (16 values)
```
overview, functions-list, requirements, basic-design, detail-design, test-spec,
crud-matrix, traceability-matrix, operation-design, migration-design, sitemap,
test-evidence, meeting-minutes, decision-record, interface-spec, screen-design
```

### Chain Entry Types

**ChainEntry** (single-file docs, `documents.ts:91-95`):
- `status`: "pending" | "in-progress" | "complete"
- `input?`: string
- `output?`: string

**SplitChainEntry** (split docs, `documents.ts:98-103`):
- `status`: same
- `system_output?`: path prefix for 03-system/
- `features_output?`: path prefix for 05-features/
- `global_output?`: path prefix for 08-test/ (test-spec only)

### ProjectConfig Chain Schema (lines 144-155)

```yaml
chain:
  rfp: string
  overview: ChainEntry
  functions_list: ChainEntry
  requirements: ChainEntry
  basic_design: SplitChainEntry
  detail_design: SplitChainEntry
  test_spec: SplitChainEntry
  operation_design?: ChainEntry
  migration_design?: ChainEntry
  glossary?: ChainEntry
```

**Key insight:** Only 3 doc types support split mode (basic-design, detail-design, test-spec). All others use single ChainEntry. RFP is not a ChainEntry — it's a bare string path.

---

## 2. Chain Status Display Logic

**Location:** `src/tools/chain-status.ts:35-161`

### Display Sequence (lines 82-87)

Hard-coded order:
```
1. rfp (special case, checks chain.rfp string)
2. overview, functions_list, requirements, basic_design, detail_design, test_spec
3. operation_design, migration_design, glossary (optional)
```

### Phase Grouping

**Currently:** Markdown table with 6 columns:
- Document | Chain Status | Lifecycle | Version | Output

**Feature Status Sub-section** (lines 138-156):
- Reads `{output.directory}/05-features/` and lists per-feature status for basic-design, detail-design, test-spec.
- Displays as separate table: Feature | basic-design | detail-design | test-spec

### Lifecycle Metadata (lines 103-109)

For each doc with an output path:
- Reads document frontmatter to extract `status` (draft/review/approved/revised/obsolete)
- Reads `version` field
- Maps status via `LIFECYCLE_LABELS` (lines 33-39)

**Issue for restructuring:** No explicit phase concept. Chain status is linear document order, not phase-based grouping.

---

## 3. Cross-Reference Validation

**Location:** `src/lib/validator.ts:91-200`

### Upstream ID Type Mapping (lines 92-109)

Each DocType defines required upstream ID patterns:

```
overview:            [] (no upstream)
functions-list:      [] (no upstream)
requirements:        [F] (functions)
basic-design:        [REQ, F] (requirements + functions)
detail-design:       [SCR, TBL, API] (screens, tables, APIs)
test-spec:           [REQ, F] (requirements + functions)
operation-design:    [NFR, REQ] (non-functional + requirements)
migration-design:    [TBL, REQ, OP] (tables, requirements, operations)
test-evidence:       [UT, IT, ST, UAT] (test types)
```

**Key insight:** Links bypass traditional V-model order. Examples:
- detail-design expects SCR/TBL/API (no REQ/F). Assumes basic-design is upstream.
- test-spec expects REQ/F. Does not reference basic-design or detail-design.

### Validation Flow (validateCrossRefs, lines 157-201)

1. Extract upstream ID types for current doc_type from `UPSTREAM_ID_TYPES`
2. Parse upstream content for all IDs matching those types (extractIds via id-extractor.ts)
3. Check if each upstream ID appears in current document content
4. Report missing IDs (upstream IDs not referenced), orphaned IDs (referenced but not in upstream)
5. Calculate coverage % = (referenced / total upstream IDs)

**No support for split docs validation.** validateSplitDocument (lines 328-386) validates file-by-file but merges all content before cross-ref check — does not distinguish between system and feature sections.

---

## 4. Output Path Resolution

**Location:** `src/lib/resolve-output-path.ts:7-32`

Pure function: (docType, scope?, featureName?) → path string

### Path Mappings

**Single-file (non-split) docs:**
```
overview            → "01-overview.md"
functions-list      → "04-functions-list.md"
requirements        → "02-requirements.md"
migration-design    → "06-data/"
operation-design    → "07-operations/"
crud-matrix         → "03-system/crud-matrix.md"
traceability-matrix → "08-test/traceability-matrix.md"
```

**Split docs:**
```
basic-design (shared)   → "03-system/"
basic-design (feature)  → "05-features/{featureName}/basic-design.md"
detail-design (feature) → "05-features/{featureName}/detail-design.md"
test-spec (shared)      → "08-test/"
test-spec (feature)     → "05-features/{featureName}/test-spec.md"
```

**Key gaps:**
- Detail-design has NO shared scope support (only feature scope)
- No explicit support for 09-operation/, 10-migration/ directories
- No scoping for overview, functions-list, requirements

---

## 5. Generate Tool Routing

**Location:** `src/tools/generate.ts:147-322`

### Main Flow (handleGenerateDocument)

1. Load template via `loadTemplate(templateDir, doc_type, language, overrideDir)` (line 158)
2. Determine instructions:
   - If split (scope param): call `buildSplitInstructions()` (lines 100-124)
   - Otherwise: use `GENERATION_INSTRUCTIONS[doc_type]` (line 161)
3. Build keigo block (line 165)
4. Extract upstream IDs block if upstream_content provided (lines 167-169)
5. Optionally analyze source code for detail-design/test-spec (lines 172-182)
6. Apply project-type-specific instructions if provided (lines 184-186)
7. Build bilingual block if input_lang ≠ ja (lines 190-200)
8. Append confidence/traceability annotations if enabled (lines 238-243)
9. Suggest output path via `resolveOutputPath()` (line 281)
10. Auto-commit if config has autoCommit=true (lines 298-308)

### Special Handling per DocType

**Project-type-specific instructions** (lines 79-98):
- SaaS: basic-design, requirements
- internal-system: basic-design, requirements
- mobile: basic-design
- batch: basic-design, detail-design
- lp: basic-design

No special routing — instructions are injected as additional context blocks, not structural changes.

**Code analysis** (lines 172-182):
- Only for detail-design or test-spec
- Calls `analyzeTypeScript()` and `formatCodeContext()`
- Non-fatal if fails (logs warning, proceeds)

---

## Current V-Model Chain Gaps

1. **No phase abstraction.** Chain is document sequence, not phase structure. Phase 1 (analysis) and Phase 2 (design) are implicit.

2. **Inconsistent upstream mapping.**
   - detail-design expects SCR/TBL/API but no clear source for these (assumed basic-design).
   - test-spec expects REQ/F (direct from requirements), not detail-design outputs.
   - No modeling of cross-phase dependencies.

3. **Split doc validation is merged.** Validates system + feature sections as one blob. No separate validation per scope.

4. **Limited path scoping.** overview, functions-list, requirements are always single-file (no split). No 09-operation/ or 10-migration/ directory conventions.

5. **Output path hints are sparse.** resolveOutputPath() returns string, not full path structure. Leaves directory creation to caller.

---

## Recommended Changes for V-Model Restructure

1. **Add Phase enum** to types: Phase1Analysis, Phase2Design, Phase3Test, Phase4Impl
2. **Extend UPSTREAM_ID_TYPES** to reference phase boundaries, not just doc types
3. **Enhance split validation** with per-scope ID extraction (shared vs. feature sections separately)
4. **Standardize path structure** for 09-operation/, 10-migration/ dirs with phase alignment
5. **Refactor ChainStatusDisplay** to group by phase, not just document order

---

## Unresolved Questions

- Should overview/functions-list/requirements support split mode (shared/feature scoping)?
- How should operation-design and migration-design link to previous phases?
- Should test-spec expect detail-design outputs (CLS-xxx, UT-xxx) in addition to requirements?
- What's the expected validation strategy for cross-phase dependencies?
