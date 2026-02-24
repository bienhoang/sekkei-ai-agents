# Phase 02: Node.js Excel Exporter (Replace Python openpyxl)

## Context Links

- Research: [researcher-01-node-export-and-tooling.md](./research/researcher-01-node-export-and-tooling.md) §1
- Brainstorm: [brainstorm-260222-1955-sekkei-improvements.md](../reports/brainstorm-260222-1955-sekkei-improvements.md) §Approach A2, D2
- Current bridge: `sekkei/packages/mcp-server/src/lib/python-bridge.ts`
- Current export tool: `sekkei/packages/mcp-server/src/tools/export.ts`
- Python original: `sekkei/packages/mcp-server/python/export/excel_exporter.py`

---

## Overview

- **Priority:** P1 — eliminates #1 user friction (Python + openpyxl setup)
- **Status:** pending
- **Description:** Create `src/lib/excel-exporter.ts` using ExcelJS to convert Markdown → `.xlsx`. Route `export_document` tool to Node.js exporter by default via `SEKKEI_EXPORT_ENGINE` env var. Python bridge retained for `glossary` and `diff` only.

---

## Key Insights

- ExcelJS v4.4 has full UTF-8/CJK support natively (xlsx format stores Unicode); no encoding flags needed
- Merged cells: style must be applied to top-left cell only (ExcelJS issue #1526); plan accordingly
- Template fill pattern: `readFile()` → mutate cells → `writeFile()` — preserves charts/existing styles
- ExcelJS beats xlsx-populate for active maintenance (1.2M weekly DLs vs 150K; last xlsx-populate commit 2023)
- `SEKKEI_EXPORT_ENGINE=node|python` feature flag: default `node`; Python still callable for fallback
- `export-excel` and `export-matrix` actions both need Node.js equivalents; `glossary` and `diff` stay Python-only
- VALID_ACTIONS in `python-bridge.ts` currently includes `export-excel`, `export-pdf`, `export-docx`, `export-matrix` — after this phase, these 4 are routed to Node.js; only `glossary` and `diff` remain Python

---

## Requirements

### Functional
- Convert Markdown content to structured `.xlsx` with:
  - Cover sheet: doc title, project name, version, date (from YAML frontmatter if present)
  - Content sheets: one sheet per H1/H2 section
  - Tables: parsed from Markdown `|...|` syntax → Excel rows with header row styled (bold, gray fill)
  - Japanese UTF-8 text preserved in all cells
  - Column auto-width based on content length (max 60 chars)
- Company template fill mode: if `template_path` provided, `readFile()` template → fill named cells → `writeFile()`
- `SEKKEI_EXPORT_ENGINE=python` falls back to Python bridge (backward compat)
- `export-matrix` (crud-matrix, traceability-matrix) also routed to Node.js exporter

### Non-functional
- Output file size reasonable (≤5MB for typical spec doc)
- No Python dependency at runtime for Excel export
- File under 200 lines; split into helpers if needed

---

## Architecture

```
src/tools/export.ts
  └── checks SEKKEI_EXPORT_ENGINE
       ├── "node" (default) → src/lib/excel-exporter.ts
       │     ├── parseMarkdownToSections()   (internal)
       │     ├── parseMarkdownTables()       (internal)
       │     └── ExcelJS Workbook API
       └── "python" → lib/python-bridge.ts (existing)
```

### Markdown → Excel Mapping

| Markdown element | Excel output |
|---|---|
| YAML frontmatter | Cover sheet cells (title, version, date) |
| `# H1` | New sheet tab named after heading |
| `## H2` | Bold row within sheet, light blue fill |
| `\|table\|` | Rows; header row bold + gray fill |
| Plain paragraph | Single cell in column A |
| Code block ` ``` ` | Monospace font cell, light yellow fill |

---

## Related Code Files

### Modify
- `sekkei/packages/mcp-server/package.json` — add `"exceljs": "^4.4.0"` to `dependencies`
- `sekkei/packages/mcp-server/src/tools/export.ts` — add engine check; route xlsx/matrix to Node.js exporter
- `sekkei/packages/mcp-server/src/lib/python-bridge.ts` — remove `export-excel`, `export-pdf`, `export-docx`, `export-matrix` from `VALID_ACTIONS`; keep only `glossary`, `diff`
- `sekkei/packages/mcp-server/src/config.ts` — add `exportEngine: "node" | "python"` field, read from `SEKKEI_EXPORT_ENGINE`

### Create
- `sekkei/packages/mcp-server/src/lib/excel-exporter.ts` — main exporter (≤200 lines)

---

## Implementation Steps

1. **Add dependency:** `npm install exceljs` in `sekkei/packages/mcp-server/`
2. **Update `config.ts`:** add `exportEngine: process.env.SEKKEI_EXPORT_ENGINE === "python" ? "python" : "node"` to `ServerConfig` and `loadConfig()`
3. **Create `src/lib/excel-exporter.ts`:**
   ```ts
   // Exports:
   export interface ExcelExportInput {
     content: string;        // Markdown
     doc_type: string;
     output_path: string;
     project_name?: string;
     template_path?: string; // optional company .xlsx template
   }
   export interface ExcelExportResult {
     file_path: string;
     file_size: number;
   }
   export async function exportToExcel(input: ExcelExportInput): Promise<ExcelExportResult>
   ```
   - Parse YAML frontmatter from `content` using `yaml` package (already a dep)
   - Split content into sections by `# ` headings
   - Create `ExcelJS.Workbook`; add cover sheet; add one sheet per section
   - Parse Markdown tables via regex: `/\|(.+)\|/g` per line; detect header separator `|---|`
   - Apply styles: header row bold + fill `FFBFBFBF`, merged H2 rows fill `FFD0E4F7`
   - Set column widths: `Math.min(Math.max(...cells.map(c => c.length)), 60)`
   - Write to `output_path` via `wb.xlsx.writeFile(output_path)`
   - Return `{ file_path: output_path, file_size: (await stat(output_path)).size }`
4. **Update `src/tools/export.ts`:**
   - Import `loadConfig` and `exportToExcel`
   - After resolving `exportContent`, check `loadConfig().exportEngine`
   - If `"node"` and format is `"xlsx"` or `isMatrix`: call `exportToExcel()` instead of `callPython()`
   - Keep Python path for `format === "pdf"` and `format === "docx"` until Phase 03
5. **Update `python-bridge.ts`:** narrow `VALID_ACTIONS` to `["export-docx", "glossary", "diff"] as const` (keep `export-docx` until Phase 2 DOCX migration)
<!-- Updated: Validation Session 1 - DOCX stays on Python bridge; matrix uses shared exportToExcel with isMatrix flag -->
6. **Verify build:** `npm run lint` (tsc --noEmit)
7. **Manual test:** generate a `requirements` doc and export to xlsx; open in Excel/LibreOffice to verify Japanese text

---

## Todo List

- [ ] Add `exceljs` to `package.json` dependencies
- [ ] Update `config.ts` with `exportEngine` field + `SEKKEI_EXPORT_ENGINE` env var
- [ ] Create `src/lib/excel-exporter.ts`
  - [ ] YAML frontmatter extraction
  - [ ] Section splitting by H1 headings
  - [ ] Sheet creation per section
  - [ ] Markdown table parser → Excel rows
  - [ ] Cell styling (header bold/gray, H2 blue, code yellow)
  - [ ] Column auto-width
  - [ ] Cover sheet with project metadata
  - [ ] Company template fill mode (template_path)
- [ ] Update `src/tools/export.ts` — engine routing
- [ ] Narrow `VALID_ACTIONS` in `python-bridge.ts`
- [ ] `npm run lint` passes
- [ ] Manual export smoke test with Japanese content

---

## Success Criteria

- `export_document` with `format: "xlsx"` produces valid `.xlsx` without Python
- Japanese text (UTF-8) preserved correctly in all cells
- Tables render with bold header row
- `SEKKEI_EXPORT_ENGINE=python` still routes to Python bridge (backward compat)
- `npm run lint` passes (no TS errors)
- Existing 142 tests still pass (`npm test`)

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| ExcelJS merged-cell style silently ignored (issue #1526) | Low | Apply styles only to top-left cell; document in code comment |
| Large markdown content → many sheets → slow write | Low | Cap at 20 sheets; log warning if exceeded |
| `export-matrix` logic differs from regular export | Medium | Use shared `exportToExcel(input, { isMatrix: true })` with matrix-specific rendering path inside same function |
<!-- Updated: Validation Session 1 - Shared function with isMatrix flag per user decision -->
| ExcelJS ESM import issues | Low | Use `import ExcelJS from 'exceljs'` — ESM compatible in v4.4 |

---

## Security Considerations

- `output_path` already validated with regex in `export.ts` Zod schema (`.xlsx` extension check)
- `template_path` if added: validate path containment (no `..` traversal) same pattern as `template-resolver.ts`
- No shell exec — pure Node.js file I/O only

---

## Next Steps

- Phase 03 (PDF exporter) follows same pattern; reuses markdown parser from this phase
- Phase 01 (init wizard) can now skip Python requirement for Excel
- After both Phase 02+03: update `bin/setup.js` `checkPython()` message to indicate Python is optional
