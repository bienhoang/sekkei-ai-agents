# Phase A: Trust Foundation

## Context Links

- [Plan Overview](./plan.md)
- [Brainstorm](../reports/brainstorm-260223-1218-sier-psychology-improvements.md)
- [MCP Architecture](./research/researcher-01-mcp-architecture.md)
- [Tools & Chain](./research/researcher-02-tools-and-chain.md)

## Overview

- **Date:** 2026-02-23
- **Priority:** P1 (Highest)
- **Status:** Completed ✅
- **Effort:** 10h (completed on schedule)
- **Description:** Build trust primitives — confidence scoring, source traceability, approval watermarks, enhanced diff. Without trust, no SIer adopts.

## Key Insights

- SIers need to defend AI output in client review meetings (レビュー会)
- "自動" triggers rejection; "支援" enables adoption
- Secret AI users do full manual re-verification — traceability eliminates this
- Existing lifecycle statuses (`draft/review/approved/revised/obsolete`) and `DocumentMeta.{author,reviewer,approver}` fields already in codebase
- `analyze_update` + `export_document(diff_mode=true)` already supports basic 朱書き

---

## Feature 1: AI Confidence Scoring

### Requirements

**Functional:**
- `generate_document` output includes per-section confidence metadata: `高` (direct mapping from input), `中` (inferred from context), `低` (extrapolated/assumed)
- Confidence annotations appear as HTML comments in generated markdown: `<!-- confidence: 高 | source: REQ-003 -->`
- Summary confidence table at document end

**Non-functional:**
- Zero overhead on generation time (annotation-only, no extra AI calls)
- Backward compatible — existing consumers ignore HTML comments

### Architecture

Extend `generation-instructions.ts` to include confidence annotation rules per doc type. No new tool needed — augments `generate_document` output format.

```
generate_document → GENERATION_INSTRUCTIONS (updated) → AI generates with confidence comments
validate_document → NEW: extract and summarize confidence annotations (optional)
```

### Related Code Files

**Modify:**
- `src/lib/generation-instructions.ts` — add confidence annotation rules to each `GENERATION_INSTRUCTIONS[docType]`
- `src/tools/generate.ts` — add `include_confidence` optional Zod param (default: true)

**Create:**
- `src/lib/confidence-extractor.ts` — extract `<!-- confidence: X -->` comments, build summary table

### Implementation Steps

1. Add confidence annotation instruction block to `generation-instructions.ts`:
   ```
   "## Confidence Annotations\nFor each section, add <!-- confidence: 高|中|低 | source: {ID} --> comment.\n高: directly stated in input. 中: reasonably inferred. 低: assumed/extrapolated."
   ```
2. Add `include_confidence: z.boolean().default(true).optional()` to `generate.ts` inputSchema
<!-- Updated: Validation Session 1 - Default changed from opt-in to always-on (default: true) -->
3. When `include_confidence=true` (default), append confidence instruction block to context output
4. Create `confidence-extractor.ts` (~60 lines): regex-extract comments, count per level, build summary
5. Optionally integrate into `validate_document` as informational output
6. Write unit test for confidence-extractor

### Todo

- [ ] Update GENERATION_INSTRUCTIONS with confidence rules
- [ ] Add `include_confidence` param to generate_document
- [ ] Create `confidence-extractor.ts`
- [ ] Unit test confidence extraction
- [ ] Integration test: generate with confidence, validate output

---

## Feature 2: Source Traceability

### Requirements

**Functional:**
- Every generated statement links to source input paragraph or upstream ID
- Format: `<!-- source: REQ-003 -->` or `<!-- source: input:para:5 -->`
- Traceability report: validate that no section lacks source attribution

**Non-functional:**
- Must not break existing ID extraction (`id-extractor.ts`)
- Comment format parseable by both humans and tooling

### Architecture

Extends the upstream IDs block in `generate.ts`. The AI prompt instructs per-statement attribution. Pairs with Feature 1 (confidence = traceability quality measure).

```
upstream_content → extractAllIds() → buildUpstreamIdsBlock() (already exists)
                                   → NEW: buildSourceTracingInstruction()
```

### Related Code Files

**Modify:**
- `src/lib/generation-instructions.ts` — add source traceability instruction block
- `src/tools/generate.ts` — add `include_traceability` optional param, conditionally inject instruction

**Create:**
- `src/lib/traceability-extractor.ts` — extract `<!-- source: X -->` comments, build coverage report

### Implementation Steps

1. Add traceability instruction to `generation-instructions.ts`:
   ```
   "## Source Traceability\nFor each paragraph, add <!-- source: {ID or input:section:N} -->.\nEvery requirement statement MUST trace to an input source."
   ```
2. Add `include_traceability: z.boolean().default(true).optional()` to generate.ts
<!-- Updated: Validation Session 1 - Default changed from false to true (always-on) -->
3. Create `traceability-extractor.ts` (~80 lines): parse source comments, calculate coverage per section
4. Integrate into `validate_document` as optional check
5. Unit test + integration test

### Todo

- [ ] Add traceability instruction block
- [ ] Add `include_traceability` param
- [ ] Create `traceability-extractor.ts`
- [ ] Integrate into validate_document
- [ ] Tests

---

## Feature 3: Human-Approved Watermark

### Requirements

**Functional:**
- Exports respect lifecycle status from YAML frontmatter (`status: draft|approved`)
- `draft` exports include visual watermark: "AI下書き — 未承認" in header/footer
- `approved` exports show: "承認済み — {approver} — {date}"
- Export tool reads frontmatter `status`, `approver`, `approved_date` fields

**Non-functional:**
- Backward compatible: missing status → treated as `draft`
- Excel, PDF, DOCX all support watermark rendering

### Architecture

Extend `DocumentMeta` in `documents.ts` with `approved_date` field. `export_document` reads frontmatter and passes lifecycle info to export functions.

```
export_document → parse frontmatter → extract status/approver/date
               → pass to exportToExcel/exportToPdf/exportToDocx
               → renderer adds watermark based on status
```

### Related Code Files

**Modify:**
- `src/types/documents.ts` — add `approved_date?: string` to `DocumentMeta`
- `src/tools/export.ts` — extract frontmatter, pass lifecycle metadata to exporters
- `src/lib/excel-exporter.ts` — add watermark row/header based on lifecycle
- `src/lib/pdf-exporter.ts` — add watermark rendering
- `src/lib/docx-exporter.ts` — add watermark rendering
- `src/lib/frontmatter-reader.ts` — ensure lifecycle fields parsed

### Implementation Steps

1. Add `approved_date?: string` to `DocumentMeta` interface
2. In `export.ts`, parse frontmatter from `content` before export
3. Build `LifecycleExportMeta` type: `{ status, approver, approved_date }`
4. Pass `LifecycleExportMeta` to each exporter function signature
5. Excel: add "AI下書き" or "承認済み" as first row with colored background
6. PDF: add watermark text overlay (via WeasyPrint CSS `@page` rules)
7. DOCX: add header/footer with approval status
8. Unit test per exporter with draft/approved states

### Todo

- [ ] Extend DocumentMeta with `approved_date`
- [ ] Update export.ts to parse and pass lifecycle metadata
- [ ] Update excel-exporter.ts watermark logic
- [ ] Update pdf-exporter.ts watermark logic
- [ ] Update docx-exporter.ts watermark logic
- [ ] Tests per exporter (draft + approved states)

---

## Feature 4: 朱書きDiff Enhancement

### Requirements

**Functional:**
- Enhanced diff output: section-level and line-level granularity
- Color-coded changes: green (additions), red+strikethrough (deletions), yellow (modifications)
- Inline diff within modified sections (not just "section changed")
- 改訂履歴 auto-generation from diff results

**Non-functional:**
- Must integrate with existing `analyze_update` + `export_document(diff_mode=true)` flow
- Python diff analyzer improvements backward compatible

### Architecture

Extends existing `diff` Python action. Currently `analyze_update` returns section-level diff; enhance to include line-level within-section diffs.

```
analyze_update(upstream_old, upstream_new) → callPython("diff", ...) → ENHANCED response
export_document(diff_mode=true) → applyDiffHighlighting() → ENHANCED cell-level highlighting
```

### Related Code Files

**Modify:**
- `python/nlp/diff_analyzer.py` — add intra-section line diff, output `line_diffs[]` per section
- `src/tools/update.ts` — render line-level diffs in output markdown
- `src/lib/excel-exporter.ts` — `applyDiffHighlighting()` uses line-level data for cell highlighting

### Implementation Steps

1. In `diff_analyzer.py`: use Python `difflib.SequenceMatcher` for intra-section line diffs
2. Add `line_diffs` field to diff response: `[{section, old_lines, new_lines, diff_type}]`
3. In `update.ts`: render line-level changes with `+`/`-` prefixes in markdown output
4. In `excel-exporter.ts`: use line_diffs for cell-level highlighting (green fill, red strikethrough)
5. Add `revision_summary` auto-generation: concatenate all changed sections into revision row
6. Unit test: diff two versions, verify line-level output
7. Integration test: full flow analyze_update → export with diff_mode

### Todo

- [ ] Enhance `diff_analyzer.py` with line-level diffs
- [ ] Update `update.ts` to render line-level changes
- [ ] Enhance `applyDiffHighlighting()` for cell-level Excel diff
- [ ] Auto-generate revision summary
- [ ] Tests

---

## Success Criteria

- [ ] `generate_document` with `include_confidence=true` produces annotated output
- [ ] `generate_document` with `include_traceability=true` produces source-linked output
- [ ] `export_document` respects `status: approved` vs `status: draft` with visual watermarks
- [ ] `analyze_update` returns line-level diffs, not just section-level
- [ ] All existing tests still pass (backward compatibility)
- [ ] New unit tests for all 4 features with >80% coverage

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| AI ignores confidence/traceability instructions | Medium | Validate output in tests; prompt engineering iteration |
| Watermark breaks existing export consumers | Low | Backward compat: no watermark when status missing |
| Python diff enhancement breaks existing flow | Medium | Version the diff response format, maintain old fields |
| Line-level diff too noisy for large changes | Low | Add threshold: fallback to section-level above N changes |

## Security Considerations

- Confidence/traceability comments are HTML comments — safe in markdown, stripped in exports if needed
- Approval watermarks must NOT be user-editable in exported files (read-only cells in Excel, CSS in PDF)
- Frontmatter parsing: validate against schema, reject unknown fields

## Next Steps

After Phase A, engineers can:
1. Generate docs with confidence indicators → focus review on 低-confidence sections
2. Trace every statement to its source → defend in client meetings
3. Export with approval watermarks → clear draft vs approved distinction
4. See precise diffs → faster review of regenerated documents

Phase B (Impact Cascade Engine) depends on traceability IDs from Feature 2.

## Unresolved Questions

1. Should confidence scoring apply to table rows (per-row) or entire tables?
2. How to handle confidence when input is bilingual (mixed ja/en)?
3. Watermark in Google Sheets export: header row or sheet-level comment?
4. Line-level diff: what granularity threshold triggers section-level fallback?
