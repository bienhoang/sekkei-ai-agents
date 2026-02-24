---
title: "Phase 06: Completeness Checker (ROADMAP 2.1)"
status: complete
priority: P2
effort: 0.75d
---

# Phase 06: Completeness Checker (ROADMAP 2.1)

## Context Links
<!-- Updated: Validation Session 1 - Phase 07 merged into Phase 04; this phase runs solo in G2 -->
- Work context: `sekkei/packages/mcp-server/`
- Core file: `src/lib/validator.ts` — extend `validateCompleteness()` and `ValidationIssue`
- Validate tool: `src/tools/validate.ts` — add `check_completeness` flag
- Types: `src/types/documents.ts` — `DocType`, `ValidationIssue`
- Downstream: Phase 04 (Cross-Ref Linker) depends on this phase

## Overview
- **Priority:** P2
- **Status:** pending; runs independently in G2
- **Goal:** Content depth checks beyond section presence — min row counts, min word counts, table presence per doc type

## Key Insights
- Current `validateCompleteness()` only checks heading presence — not content depth
- New "completeness" checks are additive: add to same `ValidationIssue` type with new `type: "completeness"`
- Per-doc rules are static config (not runtime-configurable) — define as a `CONTENT_DEPTH_RULES` record
- Test-spec case count: scan for `| UT-` or `| IT-` pattern in table rows — count occurrences per feature
- basic-design table presence: check for ≥1 row in `画面ID`, `テーブルID`, `API` columns (REQUIRED_COLUMNS already defines these)
- `check_completeness` flag is optional + default false → backward compat guaranteed

## Requirements
- **Functional:**
  - `validate_document` accepts `check_completeness?: boolean` flag
  - basic-design: ≥1 screen table row (SCR), ≥1 DB table row (TBL), ≥1 API row
  - requirements: ≥3 functional requirements (F-xxx IDs), ≥1 NFR entry
  - test-spec: ≥3 test cases per feature (scan test ID density)
  - functions-list: ≥1 row in 機能一覧 table
  - New `ValidationIssue.type: "completeness"` with `severity: "warning"`
- **Non-functional:** runs after existing section + cross-ref checks; no perf impact (pure regex)

## Architecture

```
validator.ts (extend)
  ├─ ValidationIssue.type += "completeness"
  ├─ CONTENT_DEPTH_RULES: Record<DocType, DepthRule[]>
  ├─ validateContentDepth(content, docType): ValidationIssue[]
  └─ validateDocument() — call validateContentDepth() if check_completeness flag passed

DepthRule = {
  check: string,       // human description
  test: (content: string) => boolean,
  message: string,     // failure message
}

validate.ts (extend)
  └─ inputSchema: add check_completeness?: z.boolean().optional()
```

## Related Code Files

**Modify:**
- `src/lib/validator.ts` — add `"completeness"` to `ValidationIssue` type union; add `CONTENT_DEPTH_RULES`; add `validateContentDepth()` function; call from `validateDocument()` when flag set
- `src/tools/validate.ts` — add `check_completeness` to inputSchema; pass to `validateDocument()`

## Implementation Steps

1. Add `"completeness"` to `ValidationIssue.type` union in `validator.ts`
2. Define `CONTENT_DEPTH_RULES` record in `validator.ts`:
   - `basic-design`: check SCR table has ≥1 data row, TBL table ≥1 data row, API table ≥1 data row
   - `requirements`: check ≥3 F-xxx IDs present, ≥1 NFR-xxx ID present
   - `test-spec`: check ≥3 test case IDs (UT/IT/ST) present
   - `functions-list`: check ≥1 row in table after `機能一覧` heading
3. Implement `validateContentDepth(content, docType)` — run each rule, collect failing rules as issues
4. Update `validateDocument()` signature: add optional `options?: { check_completeness?: boolean }`; call `validateContentDepth` when set
5. Update `validate.ts` inputSchema: `check_completeness: z.boolean().optional()`
6. Pass flag through to `validateDocument()` call
7. Write unit tests: `tests/unit/completeness-checker.test.ts`
   - Test each rule with minimal passing and failing fixtures
   - Test backward compat: existing calls without flag unchanged

## Todo List

- [x] Add `"completeness"` to ValidationIssue type
- [x] Define `CONTENT_DEPTH_RULES` record (4 doc types) — extracted to `src/lib/completeness-rules.ts`
- [x] Implement `validateContentDepth()`
- [x] Update `validateDocument()` signature + call; `valid` now error-only (warnings don't flip it)
- [x] Update `validate.ts` inputSchema
- [x] Write unit tests (30 new tests)
- [x] `npm run lint` — no errors in owned files (pre-existing docx-exporter.ts errors unrelated)
- [x] `npm test` — 172 pass (172 total, up from 142)

## Success Criteria
- `validate_document { check_completeness: true }` returns completeness issues
- basic-design with empty screen table → `"completeness"` warning issued
- Without `check_completeness` flag → behavior identical to current (backward compat)
- Unit tests cover all 4 doc-type rules, both pass and fail cases

## Risk Assessment
- **Rule brittleness with non-standard markdown** — mitigate: rules use simple string/regex tests; prefer presence check over count when ambiguous
- **False positives on partial docs in early chain stages** — mitigate: all completeness issues are `severity: "warning"` not `"error"`; tool result `valid` field still based on errors only

## Security Considerations
- Pure string analysis — no file I/O beyond existing `readFile` calls
- Rule definitions are static code constants — not user-configurable (no injection surface)

## Next Steps
- Phase 04 chain linker calls `validateContentDepth` when building chain report
- Phase 04 (Cross-Ref Linker + Integrity) shares the updated `validateDocument()` signature
