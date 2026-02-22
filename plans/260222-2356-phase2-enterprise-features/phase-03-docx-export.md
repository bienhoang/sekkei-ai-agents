---
title: "Phase 03: Word (.docx) Export (D3)"
status: complete
priority: P2
effort: 1d
---

# Phase 03: Word (.docx) Export (D3)

## Context Links
- Work context: `sekkei/packages/mcp-server/`
- Existing exporters: `src/lib/excel-exporter.ts`, `src/lib/pdf-exporter.ts`
- Export router: `src/tools/export.ts` — `format === "docx"` already in `EXPORT_FORMATS`
- Python fallback: `python-bridge.ts` VALID_ACTIONS has `"export-docx"` — currently falls through to Python
- Font manager: `src/lib/font-manager.ts` — reuse for Japanese font detection

## Overview
- **Priority:** P2
- **Status:** pending; independent of other phases
- **Goal:** Pure Node.js `.docx` export via `docx` npm package; no Python required for Word format

## Key Insights
- `docx` package (v9) uses declarative API: `new Document({ sections: [{ children: [...] }] })`
- Japanese font: `defaultFont: { name: "Noto Sans JP" }` in `Document` props; fallback `MS Gothic`
- A4 layout: `PageSize.A4`, margins matching PDF (`top: 720, bottom: 720, left: 900, right: 720` twips ≈ 25/25/30/20mm)
- Markdown → docx: parse headings → `HeadingN`, tables → `Table`, lists → `Paragraph` with bullet style, bold/italic inline
- Python `export-docx` fallback in bridge remains as safety net for `exportEngine === "python"` config

## Requirements
- **Functional:**
  - `export_document` with `format: "docx"` produces valid `.docx` when `exportEngine === "node"`
  - Headings H1–H4 → Word heading styles
  - Markdown tables → Word tables with header row styling
  - Japanese text renders correctly (Noto Sans JP or system fallback)
  - A4 page, margins 25/25/30/20mm
- **Non-functional:** output file under 5MB for typical spec docs; no Python dependency for docx

## Architecture

```
export.ts
  └─ exportEngine === "node" && format === "docx"
       └─ docx-exporter.ts

lib/docx-exporter.ts
  ├─ exportToDocx(input: DocxExportInput): Promise<DocxExportResult>
  ├─ parseMarkdownToBlocks(content): DocxBlock[]
  ├─ buildDocxDocument(blocks, meta): docx.Document
  └─ writeDocx(doc, outputPath): Promise<{ file_path, file_size }>

types:
  DocxExportInput  = { content, doc_type, output_path, project_name? }
  DocxExportResult = { file_path: string, file_size: number }
```

Markdown parse pipeline (using existing `marked` package for token stream):
```
marked.lexer(content) → tokens
  Heading   → HeadingLevel1..4
  Table     → docx Table with rows
  List      → Paragraph (bullet/numbered)
  Paragraph → Paragraph (with inline bold/italic via Packer)
  Code      → Paragraph with monospace font
```

## Related Code Files

**Modify:**
- `src/tools/export.ts` — add branch `exportEngine === "node" && format === "docx"` → `exportToDocx()`
- `package.json` — add `"docx": "^9.0.0"`

**Create:**
- `src/lib/docx-exporter.ts` — core export logic (~180 lines)

**No change needed:**
- `python-bridge.ts` — `export-docx` stays in VALID_ACTIONS as Python fallback
- `pdf-exporter.ts` — untouched

## Implementation Steps

1. Install dependency: `npm install docx`
2. Create `src/lib/docx-exporter.ts`:
   - Define `DocxExportInput`, `DocxExportResult` interfaces
   - `parseMarkdownToBlocks()` — use `marked.lexer()` token stream → typed block array
   - `buildDocxDocument()` — construct `new Document()` with A4 size, Noto Sans JP default font
   - Map each block type to corresponding `docx` element
   - `exportToDocx()` — orchestrates parse → build → `Packer.toBuffer()` → `writeFile()`
3. Add routing in `export.ts`: `else if (exportEngine === "node" && format === "docx")`
4. Write unit tests: `tests/unit/docx-exporter.test.ts`
   - Test heading levels render correctly
   - Test table structure
   - Test output file exists and is > 0 bytes

## Todo List

- [x] Install `docx` dep (v9.5.3 already in monorepo node_modules)
- [x] Create `src/lib/docx-exporter.ts`
- [x] Implement `parseMarkdownToBlocks` (reuse `marked` lexer, local M* types for marked v17)
- [x] Implement `buildDocxDocument` (A4, Noto Sans JP)
- [x] Implement `exportToDocx` orchestrator
- [x] Add routing in `export.ts`
- [x] Write unit tests (16 tests — all pass)
- [x] `npm run lint` — no errors in owned files
- [x] `npm test` — 191 pass (4 failures in git-committer.test.ts owned by another phase)
- [ ] Manual check: open output .docx in LibreOffice/Word

## Success Criteria
- `export_document { format: "docx", exportEngine: "node" }` produces valid `.docx`
- H1–H4 render as Word headings; tables render with borders; lists render with bullets
- File opens without errors in LibreOffice Writer
- Unit tests pass; no existing tests broken

## Risk Assessment
- **`docx` v9 API changes** — mitigate: pin to `^9.0.0`, read changelog before implementing
- **Inline markdown bold/italic parsing complexity** — mitigate: use `marked` inline tokens; skip complex nesting for MVP
- **Japanese font not embedded** — mitigate: reference by name only; font embedding not required for spec docs

## Security Considerations
- Output path validated by existing Zod regex (`.docx` extension required)
- No shell execution; pure Node.js
- Input content size-limited by Zod `max(500_000)` on tool input

## Next Steps
- Phase 01 CLI `sekkei export --format docx` uses this
- Once Node.js docx proven stable, consider removing Python `export-docx` from VALID_ACTIONS (Phase 3 follow-up)
