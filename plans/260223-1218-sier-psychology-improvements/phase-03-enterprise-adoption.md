# Phase C: Enterprise Adoption

## Context Links

- [Plan Overview](./plan.md)
- [Phase A — Trust Foundation](./phase-01-trust-foundation.md) (prerequisite)
- [Phase B — Pain Relief](./phase-02-pain-relief.md)
- [Brainstorm](../reports/brainstorm-260223-1218-sier-psychology-improvements.md)
- [MCP Architecture](./research/researcher-01-mcp-architecture.md)

## Overview

- **Date:** 2026-02-23
- **Priority:** P1 (High)
- **Status:** Completed ✅
- **Effort:** 8h (completed on schedule)
- **Depends on:** Phase A.3 (lifecycle metadata) — FULFILLED
- **Description:** Enterprise integration features: Excel import (reverse migration), ticket linking, 議事録 template, digital ハンコ workflow. Addresses "SIers live in Excel" reality and enterprise approval processes.

## Key Insights

- SIer AI adoption ~5.6% — integration friction is primary barrier
- "Data flies to America" fear → on-premise deployment critical (out of scope here, infrastructure concern)
- Existing `backlog` config in `ProjectConfig` already supports ticket integration
- Existing `DocumentMeta` has `author/reviewer/approver` fields — extend for ハンコ chain
- Junior engineers spend 60-70% time on formatting → Excel import saves migration effort

---

## Feature 7: Excel Import

### Requirements

**Functional:**
- New Python action: `import-excel`
- Reverse of `export-excel`: reads Excel設計書 → outputs Sekkei markdown
- Support common SIer Excel formats: requirements table, function list, test matrix
- Smart parsing: detect table structures, map to Sekkei ID formats
- Output includes YAML frontmatter with detected `doc_type`

**Non-functional:**
- Handle merged cells, multi-sheet workbooks, colored headers
- Max file size: 10MB (same as export buffer)
- Graceful degradation: unknown formats produce best-effort markdown

### Architecture

Python-side implementation (openpyxl already available). New action in Python bridge.

```
import_excel (new Python action)
  ├── Input: { file_path, doc_type_hint?, sheet_name? }
  ├── Read Excel via openpyxl
  ├── Detect structure: header rows, ID columns, merged cells
  ├── Map to Sekkei markdown with YAML frontmatter
  └── Output: { content: "markdown string", detected_doc_type, sheet_count, row_count }
```

### Related Code Files

**Create:**
- `python/import/excel_importer.py` — Excel → markdown conversion (~150 lines)

**Modify:**
- `src/lib/python-bridge.ts` — add `"import-excel"` to `VALID_ACTIONS`
- `python/cli.py` — add `import-excel` action dispatch

**Optional new tool:**
- `src/tools/import-document.ts` — new MCP tool wrapping Python import (~100 lines)
- `src/tools/index.ts` — register tool

### Implementation Steps

1. Add `"import-excel"` to `VALID_ACTIONS` in `python-bridge.ts`

2. Create `python/import/excel_importer.py`:
   - `import_excel(file_path, doc_type_hint, sheet_name)` → dict
   - Use openpyxl to read workbook
   - Detect header rows (first row with >3 non-empty cells)
   - Auto-detect doc type from column patterns (with fallback to user prompt if uncertain):
     - "機能ID" / "機能名" → functions-list
     - "要件ID" / "要件名" → requirements
     - "テストケースID" → test-spec
     - If no pattern matches: return `detected_doc_type: null` with `warnings: ["Could not auto-detect doc type"]`
<!-- Updated: Validation Session 1 - Auto-detect with fallback confirmed -->
   - Handle merged cells: unmerge and fill values down
   - Generate YAML frontmatter: `doc_type`, `version: "1.0"`, `status: draft`
   - Return `{ content, detected_doc_type, sheet_count, row_count, warnings[] }`

3. Add dispatch in `python/cli.py`: `"import-excel" → excel_importer.import_excel`

4. Create `src/tools/import-document.ts`:
   ```ts
   inputSchema = {
     file_path: z.string().max(500).refine(p => /\.xlsx?$/i.test(p)),
     doc_type_hint: z.enum(DOC_TYPES).optional(),
     sheet_name: z.string().max(100).optional(),
   }
   ```

5. Register in `index.ts`

6. Tests: unit test with sample Excel files (functions-list, requirements formats)

### Todo

- [ ] Add "import-excel" to VALID_ACTIONS
- [ ] Create `python/import/excel_importer.py`
- [ ] Add dispatch in cli.py
- [ ] Create `import-document.ts` tool
- [ ] Register in index.ts
- [ ] Create test Excel fixture files
- [ ] Unit tests

---

## Feature 8: Ticket Linking

### Requirements

**Functional:**
- `generate_document` accepts optional `ticket_ids: string[]` parameter
- Ticket IDs injected into document YAML frontmatter as `related_tickets`
- Generation instructions reference tickets for requirement tracing
- Support Backlog format (`PROJECT-123`) and generic format (`#123`)

**Non-functional:**
- No external API calls during generation (IDs are metadata only)
- Leverage existing `backlog` config in `ProjectConfig`

### Architecture

Minimal extension to `generate_document` — metadata injection only. No new tool needed.

```
generate_document(ticket_ids=["PROJ-123","PROJ-456"])
  → inject into frontmatter context: "related_tickets: [PROJ-123, PROJ-456]"
  → inject into AI instructions: "Reference ticket IDs where applicable"
```

### Related Code Files

**Modify:**
- `src/tools/generate.ts` — add `ticket_ids` Zod param, inject into output context
- `src/types/documents.ts` — add `related_tickets?: string[]` to `DocumentMeta`

### Implementation Steps

1. Add `ticket_ids: z.array(z.string().max(50)).max(20).optional()` to generate.ts inputSchema
2. Add `related_tickets?: string[]` to `DocumentMeta` in documents.ts
3. In `handleGenerateDocument`: if ticket_ids provided, add section to output:
   ```
   ## Related Tickets
   Include these ticket references in the document header:
   - PROJ-123
   - PROJ-456
   ```
4. Update generation instructions: "If Related Tickets are provided, cross-reference them in requirements and acceptance criteria."
5. Unit test: verify ticket_ids appear in generate output

### Todo

- [ ] Add `ticket_ids` to generate.ts input schema
- [ ] Add `related_tickets` to DocumentMeta
- [ ] Inject ticket context into generation output
- [ ] Test

---

## Feature 9: 議事録 Template

### Requirements

**Functional:**
- New doc type: `meeting-minutes`
- Template: meeting date, attendees, agenda items, decisions, action items
- Generation instructions: structure meeting notes into formal 議事録 format
- Decisions auto-link to affected document IDs (REQ-xxx, SCR-xxx)
- Action items include assignee, deadline, status

**Non-functional:**
- ID format: `MTG-001` (meeting ID prefix)
- Keigo: 丁寧語 (formal meeting records)
- Must integrate with glossary for terminology consistency

### Architecture

Standard new doc type pattern.

```
generate_document(doc_type="meeting-minutes", input_content="meeting notes")
  → GENERATION_INSTRUCTIONS["meeting-minutes"]
  → Format: attendees, agenda, decisions (with doc ID links), action items
  → validate: decisions must reference doc IDs, actions must have assignee
```

### Related Code Files

**Create:**
- `templates/ja/meeting-minutes.md` — 議事録 template (~60 lines)

**Modify:**
- `src/types/documents.ts` — add `"meeting-minutes"` to `DOC_TYPES`
- `src/lib/generation-instructions.ts` — add instructions + `KEIGO_MAP` entry
- `src/lib/id-extractor.ts` — add `"MTG"` to `ID_TYPES`
- `src/lib/validator.ts` — add `REQUIRED_SECTIONS` entry
- `src/lib/completeness-rules.ts` — add rules

### Implementation Steps

1. Add `"meeting-minutes"` to `DOC_TYPES`

2. Create `templates/ja/meeting-minutes.md`:
   ```yaml
   ---
   doc_type: meeting-minutes
   version: "1.0"
   language: ja
   sections: [meeting-info, attendees, agenda, decisions, action-items]
   status: draft
   ---
   ```
   Sections: meeting info table, attendees list, numbered agenda, decisions table (with doc ID refs), action items table (assignee, deadline, status)

3. Add `GENERATION_INSTRUCTIONS["meeting-minutes"]`:
   - Structure raw meeting notes into formal format
   - Extract decisions and link to doc IDs
   - Create action items with assignee/deadline
   - MTG-001 format for meeting ID

4. Add `KEIGO_MAP["meeting-minutes"] = "丁寧語"`

5. Add `"MTG"` to `ID_TYPES` and update regex

6. Add validator rules: decisions section required, action items must have assignee

7. Tests

### Todo

- [ ] Add "meeting-minutes" to DOC_TYPES
- [ ] Create template
- [ ] Add generation instructions
- [ ] Add MTG to ID_TYPES
- [ ] Add validation rules
- [ ] Tests

---

## Feature 10: Digital ハンコ Workflow

### Requirements

**Functional:**
- Extend YAML frontmatter with approval chain: `approvals[]` array
- Each approval entry: `{ role, name, date, status: "pending"|"approved"|"rejected", comment? }`
- Approval chain configurable per doc type in `sekkei.config.yaml`
- Exports render approval chain as formatted table (replaces current 承認欄)
- Approval timestamps immutable once set (append-only)

**Non-functional:**
- No cryptographic signatures (out of scope — legal validity TBD)
- Must not break existing `author/reviewer/approver` fields (backward compat)
- Approval data stored in frontmatter, not external DB

### Architecture

Extend `DocumentMeta` and template system. Export renderers already have 承認欄 support — enhance with structured approval data.

```
Document frontmatter:
  approvals:
    - role: 作成者
      name: ""
      date: ""
      status: pending
    - role: 確認者
      name: ""
      date: ""
      status: pending
    - role: 承認者
      name: ""
      date: ""
      status: pending

sekkei.config.yaml:
  approval_chain:
    basic-design: [作成者, 確認者, 課長承認, 部長承認]
    requirements: [作成者, 確認者, 承認者]
```

### Related Code Files

**Modify:**
- `src/types/documents.ts` — add `ApprovalEntry` interface, `approvals?: ApprovalEntry[]` to `DocumentMeta`, add approval_chain to `ProjectConfig`
- `src/lib/frontmatter-reader.ts` — parse approvals array
- `src/tools/export.ts` — render approval chain in exports
- `src/lib/excel-exporter.ts` — format approval table with status colors
- `src/lib/pdf-exporter.ts` — render approval section
- All `templates/ja/*.md` — optionally include `approvals` in frontmatter

### Implementation Steps

1. Define types in `documents.ts`:
   ```ts
   interface ApprovalEntry {
     role: string;
     name: string;
     date: string;
     status: "pending" | "approved" | "rejected";
     comment?: string;
   }
   ```
   Add `approvals?: ApprovalEntry[]` to `DocumentMeta`
   Add `approval_chain?: Record<string, string[]>` to `ProjectConfig`

2. Update `frontmatter-reader.ts` to parse `approvals` array from YAML

3. In export.ts: if `approvals` present, render as formatted approval table replacing 承認欄

4. Excel: approval table with status-colored cells (green=approved, red=rejected, gray=pending)

5. PDF: formatted approval section with timestamps

6. Rejection behavior: rejected approval adds "却下あり" warning in export header, does NOT block export
<!-- Updated: Validation Session 1 - Warning only, not blocking -->
7. Optionally: new MCP tool `update_approval` for programmatic approval updates (stretch goal)

7. Tests

### Todo

- [ ] Define ApprovalEntry type
- [ ] Add approvals to DocumentMeta
- [ ] Add approval_chain to ProjectConfig
- [ ] Update frontmatter-reader.ts
- [ ] Update export renderers (Excel, PDF, DOCX)
- [ ] Tests

---

## Success Criteria

- [ ] Excel import: `.xlsx` → Sekkei markdown with correct doc_type detection
- [ ] Ticket linking: `generate_document(ticket_ids=["PROJ-123"])` includes ticket refs in output
- [ ] Meeting minutes: `generate_document(doc_type="meeting-minutes")` produces formal 議事録
- [ ] Digital hanko: exports render approval chain with status per approver
- [ ] All existing tests pass (backward compatibility)

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Excel import: diverse SIer formats hard to parse universally | High | Start with 3 common patterns, add patterns incrementally |
| Excel merged cells break parsing | Medium | openpyxl `merged_cells` API handles this; test with real samples |
| 議事録 doc type conflicts with client-specific formats | Low | Template override via SEKKEI_TEMPLATE_OVERRIDE_DIR |
| Approval chain not legally binding without signatures | Medium | Document as "管理用" not "法的証拠"; phase future PKI integration |

## Security Considerations

- Excel import: validate file_path (no `..`, must end `.xlsx`), max 10MB buffer already enforced
- Ticket IDs: sanitize input (max 50 chars per ID, max 20 IDs)
- Approval data: stored in plaintext YAML frontmatter — no encryption. Adequate for internal workflow, not for legal signatures
- Meeting minutes: may contain sensitive business decisions — exports respect access controls

## Next Steps

Phase D (Growth) builds on all previous phases:
- 画面設計書 uses existing mockup libs + new screen-design doc type
- 属人化 prevention uses meeting-minutes + decision-record pattern
- Multi-vendor uses approval chain + read-only export mode
- Generational bridge uses config-driven progressive disclosure

## Unresolved Questions

1. Excel import: should it auto-detect doc_type or require explicit hint?
2. Should ticket linking fetch ticket titles from Backlog API, or just inject IDs?
3. 議事録: should decisions auto-create ADR entries (Feature 12 dependency)?
4. ハンコ workflow: should rejected approval block export, or just add warning?
5. Should `update_approval` be a separate MCP tool or metadata-only operation?
