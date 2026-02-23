# Code Review: SIer Psychology-Driven Features (14 Features, 4 Phases)

## Scope

- **Files changed (diff):** 13 modified/new
- **Lines:** +350 / -17
- **New TypeScript files:** 6 (confidence-extractor, traceability-extractor, content-sanitizer, impact-analyzer, simulate-impact tool, import-document tool)
- **New Python files:** 2 (import_pkg/__init__.py, excel_importer.py)
- **New/enhanced templates:** 5 (test-evidence, meeting-minutes, decision-record, interface-spec, screen-design)
- **Focus:** security, type safety, backward compat, YAGNI/KISS/DRY

## Overall Assessment

Solid implementation. Clean separation of concerns. New features are additive -- existing tools/types extended without breaking changes. All 306 tests pass. TypeScript compiles cleanly. Code follows established patterns (Zod schemas, SekkeiError, pino logging, Python bridge). The major issues are inconsistencies between validator rules and template structures, and a missing ID_PATTERN sync in cross-ref-linker.

---

## Critical Issues

**None found.** No security vulnerabilities, no data loss risks, no breaking changes to existing API contracts.

---

## High Priority

### H1. `cross-ref-linker.ts` ID_PATTERN not updated with new prefixes

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/sekkei/packages/mcp-server/src/lib/cross-ref-linker.ts` (line 41)

The `ID_PATTERN` regex in `cross-ref-linker.ts` is:
```
/\b(F|REQ|NFR|SCR|TBL|API|CLS|DD|TS|UT|IT|ST|UAT|OP|MIG)-(\d{1,4})\b/g
```
It is missing `EV|MTG|ADR|IF|PG` -- the new prefixes added to `id-extractor.ts`.

**Impact:** `simulate_change_impact` tool uses `loadChainDocs` + `buildIdGraph` from cross-ref-linker. When scanning documents for references to new ID types (EV-001, MTG-001, etc.), the linker's `extractStandardIds()` function will miss them entirely. Impact analysis for the 5 new doc types will silently return no results.

**Fix:** Sync the regex with `id-extractor.ts`:
```typescript
const ID_PATTERN = /\b(F|REQ|NFR|SCR|TBL|API|CLS|DD|TS|UT|IT|ST|UAT|OP|MIG|EV|MTG|ADR|IF|PG)-(\d{1,4})\b/g;
```

**Better long-term:** DRY -- import or share the pattern from `id-extractor.ts` to avoid future drift.

### H2. Validator required sections mismatch with templates

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/sekkei/packages/mcp-server/src/lib/validator.ts`

`STRUCTURAL_SECTIONS = ["改訂履歴", "承認欄", "配布先", "用語集"]` is spread into ALL new doc types. But:

| Doc Type | Missing structural sections in template |
|---|---|
| `meeting-minutes` | 承認欄, 配布先, 用語集 |
| `decision-record` | 承認欄, 配布先, 用語集 |
| `screen-design` | 配布先, 用語集 |

Validating these doc types will always produce false-positive "missing_section" errors.

**Fix options:**
1. Add the missing sections to templates (heavyweight)
2. Define per-doc-type structural sections instead of spreading the same 4 into all types (preferred)

Example:
```typescript
const MINIMAL_STRUCTURAL = ["改訂履歴"];
"meeting-minutes": [...MINIMAL_STRUCTURAL, "会議情報", ...],
"decision-record": [...MINIMAL_STRUCTURAL, "コンテキスト", ...],
```

### H3. test-evidence validator requires section heading that doesn't exist in template

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/sekkei/packages/mcp-server/src/lib/validator.ts` (line 69-71)

Validator expects heading "テストエビデンス", but the template uses:
- "単体テスト (UT) エビデンス"
- "結合テスト (IT) エビデンス"
- "テストエビデンスサマリー"

No heading literally matches "テストエビデンス" -- validation will always fail.

**Fix:** Replace with actual headings or use a broader check:
```typescript
"test-evidence": [
  ...STRUCTURAL_SECTIONS,
  "単体テスト (UT) エビデンス",
  "テストエビデンスサマリー",
],
```

### H4. `read_only` sanitization skipped for gsheet exports

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/sekkei/packages/mcp-server/src/tools/export.ts`

The `read_only` flag applies sanitization only in the non-gsheet code path (line 172). Google Sheets exports bypass it entirely, so confidence/traceability/learning annotations leak into shared Google Sheets.

**Fix:** Add sanitization to gsheet path after `exportContent` is assigned (around line 100):
```typescript
if (read_only) {
  const { sanitizeForReadOnly } = await import("../lib/content-sanitizer.js");
  exportContent = sanitizeForReadOnly(exportContent);
}
```

---

## Medium Priority

### M1. Excel importer does not sanitize pipe characters in cell values

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/sekkei/packages/mcp-server/python/import_pkg/excel_importer.py` (line 97)

Cell values are joined with `|` to form markdown tables, but pipe characters within cell content are not escaped. A cell value like `"A|B"` would break the table structure.

**Fix:** Escape pipes in `cell_value()`:
```python
def cell_value(cell) -> str:
    if cell.value is None:
        return ""
    return str(cell.value).strip().replace("|", "\\|")
```

### M2. Excel importer does not sanitize newlines in cell values

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/sekkei/packages/mcp-server/python/import_pkg/excel_importer.py` (line 97)

Multi-line cell values (common in Excel specs) will break markdown table row formatting.

**Fix:** Replace newlines in `cell_value()`:
```python
return str(cell.value).strip().replace("\n", " ").replace("\r", "").replace("|", "\\|")
```

### M3. `simulate_change_impact` passes empty string as `downstream` to Python diff

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/sekkei/packages/mcp-server/src/tools/simulate-impact.ts` (line 46)

When auto-extracting changed IDs from upstream docs, it calls `callPython("diff", { ..., downstream: "" })`. The Python `analyze()` function will call `find_downstream_impacts(all_changed_ids, "")` which works fine (returns empty impacts), but the diff result's `changed_ids` key does not exist in the returned dict -- it returns `all_changed_ids` at the top level.

Looking at `diff_analyzer.py` line 216: the return has `"changed_ids"` key, so this is actually correct. However, the TS code casts `result.changed_ids` (line 48) which could be an empty list if no IDs changed, leading to the tool returning "No changed IDs detected" even when sections changed (without ID changes). This is a semantic edge case worth documenting.

### M4. screen-design template has inconsistent section numbering

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/sekkei/packages/mcp-server/templates/ja/screen-design.md`

Top-level sections (画面一覧, 画面遷移図, コンポーネントカタログ) use `##` without numbers. Inner sections (画面項目定義, バリデーション一覧, etc.) use `## 2.`, `## 3.`, `## 4.` numbering. This inconsistency may confuse the AI generator.

**Fix:** Remove the numbered prefixes or apply consistent numbering throughout.

### M5. confidence/traceability default `true` increases token output for all users

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/sekkei/packages/mcp-server/src/tools/generate.ts` (lines 55-58)

`include_confidence` and `include_traceability` both default to `true`, adding ~200 tokens of instruction to every generation call even for users who don't need them. This increases LLM cost and output size.

**Consideration:** Default to `false` and let users opt-in, or make it config-driven via `sekkei.config.yaml`.

### M6. `confidence-extractor.ts` and `traceability-extractor.ts` are defined but never called

**Files:**
- `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/sekkei/packages/mcp-server/src/lib/confidence-extractor.ts`
- `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/sekkei/packages/mcp-server/src/lib/traceability-extractor.ts`

These extractors are defined but no tool or endpoint calls them. They provide `extractConfidence()` and `extractTraceability()` -- presumably for post-generation analysis. Currently dead code.

**Recommendation:** Either integrate into `validate_document` tool output or defer until actually needed (YAGNI).

---

## Low Priority

### L1. `buildDependencyMermaid` uses emoji in Mermaid node labels

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/sekkei/packages/mcp-server/src/lib/impact-analyzer.ts` (lines 73, 84)

Emoji characters in Mermaid flowchart node labels may not render in all environments.

### L2. `detect_doc_type` in Python importer can be confused by ambiguous headers

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/sekkei/packages/mcp-server/python/import_pkg/excel_importer.py`

If an Excel file has headers matching multiple doc types equally (score ties), the last match wins due to dict iteration order. Python 3.7+ dicts are ordered by insertion, so this is deterministic but not prioritized.

### L3. `content-sanitizer.ts` uses blacklist approach

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/sekkei/packages/mcp-server/src/lib/content-sanitizer.ts`

New annotation patterns added in the future must be manually added to `INTERNAL_PATTERNS`. A whitelist approach (strip ALL HTML comments, then re-add desired ones) would be more resilient. Current approach is pragmatic and appropriate for now.

---

## Positive Observations

1. **Clean backward compatibility** -- 5 new doc types added to `DOC_TYPES` array without modifying existing entries. All `Record<DocType, ...>` maps properly updated in validator, generation-instructions, keigo-map, completeness-rules, cross-ref-linker.

2. **Consistent error handling** -- Both new tools (`simulate-impact`, `import-document`) follow the established `SekkeiError` + `toClientMessage()` pattern with proper pino logging.

3. **Good Zod schema design** -- `import_document` tool validates file extension (`.xlsx?`), path traversal (`..`), and string length (max 500). `simulate_change_impact` validates config path and caps array sizes.

4. **Security-conscious Python bridge** -- `import-excel` properly added to the whitelist. The bridge continues to use `execFile` (not `exec`), preventing shell injection.

5. **Well-structured impact analyzer** -- Clean separation between `findAffectedSections` (data), `scoreSeverity` (logic), `buildDependencyMermaid` (presentation), and `buildImpactReport` (orchestration).

6. **Content sanitizer is thorough** -- Handles confidence, source, learn annotations, internal blocks, and draft watermark replacement.

7. **Templates are well-crafted** -- Professional Japanese SIer document structure with proper 改訂履歴, 承認欄, and domain-specific tables.

8. **All 306 existing tests pass** -- No regressions from the new code.

---

## Recommended Actions (Priority Order)

1. **[H1]** Sync `cross-ref-linker.ts` ID_PATTERN with `id-extractor.ts` (or share the constant)
2. **[H2]** Fix validator structural section requirements for meeting-minutes, decision-record, screen-design
3. **[H3]** Fix test-evidence required section name to match template headings
4. **[H4]** Apply `read_only` sanitization to gsheet export path
5. **[M1+M2]** Sanitize pipe characters and newlines in Excel importer cell values
6. **[M4]** Normalize screen-design template section numbering
7. **[M6]** Consider removing unused extractor files or integrating into validate_document

---

## Metrics

- **Type Coverage:** 100% (tsc --noEmit passes cleanly)
- **Test Coverage:** 306/306 passing (no new test files for new features -- coverage gap)
- **Linting Issues:** 0

---

## Test Coverage Gap

No tests written for:
- `confidence-extractor.ts`
- `traceability-extractor.ts`
- `content-sanitizer.ts`
- `impact-analyzer.ts`
- `simulate-impact.ts` (tool handler)
- `import-document.ts` (tool handler)
- `excel_importer.py`
- `build_line_level_diffs` in `diff_analyzer.py`
- New validator rules for 5 new doc types
- New completeness rules for test-evidence, screen-design

Existing tests pass, but new code has 0% test coverage.

---

## Unresolved Questions

1. Should confidence/traceability annotations default to ON for all generations (current), or should this be opt-in to reduce LLM costs?
2. Are the `confidence-extractor.ts` and `traceability-extractor.ts` files intended for a future tool, or should they be integrated into `validate_document` now?
3. The `ApprovalEntry` interface and `approval_chain` config are defined but no tool implements the digital hanko approval workflow -- is this intentional scaffolding for a future phase?
4. The `ui_mode` config field ("simple" | "power") is defined but never read anywhere. Dead code or planned?
