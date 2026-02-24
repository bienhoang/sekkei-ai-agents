---
title: "Phase 02: Excel Template System (D2)"
status: complete
priority: P2
effort: 1d
---

# Phase 02: Excel Template System (D2)

## Context Links
- Work context: `sekkei/packages/mcp-server/`
- Existing exporter: `src/lib/excel-exporter.ts` (ExcelJS, creates from scratch)
- Export tool: `src/tools/export.ts` — input schema has `template_path` field stub
- Config: `sekkei.config.yaml` → `export.excel_template` key (to be added)
- ExcelExportInput already has `template_path?: string` field

## Overview
- **Priority:** P2
- **Status:** pending; independent of other phases
- **Goal:** Fill an existing company `.xlsx` template (named ranges / placeholder cells) instead of generating from scratch

## Key Insights
- ExcelJS supports `readFile()` to open existing `.xlsx` — preserves formatting, styles, merged cells
- Named ranges are the cleanest placeholder mechanism; fallback to `{{PLACEHOLDER}}` text scan
- xlsx-populate is NOT needed if ExcelJS `readFile` preserves formatting adequately — evaluate first, add xlsx-populate only if cell style corruption occurs
- Template path must be path-contained validated (no `../` traversal)
- `template_path` already exists in `ExcelExportInput` type but is ignored — just implement the fill logic

## Requirements
- **Functional:**
  - `export_document` tool accepts `template_path` param pointing to `.xlsx`
  - Template placeholders: `{{PROJECT_NAME}}`, `{{DOC_TYPE}}`, `{{DATE}}`, `{{CONTENT_*}}`
  - Fill named cells/ranges while preserving all other formatting
  - Config: `sekkei.config.yaml` → `export.excel_template: "./templates/company.xlsx"`
  - CLI: `sekkei export --format xlsx --template ./company.xlsx`
- **Non-functional:** template file validated at startup (readable, valid xlsx); error if named range missing

## Architecture

```
export.ts
  └─ exportToExcel({ template_path })
       ├─ if template_path → excel-template-filler.ts
       └─ else → existing excel-exporter.ts (unchanged)

lib/excel-template-filler.ts
  ├─ loadTemplate(path): ExcelJS.Workbook
  ├─ fillNamedRanges(wb, data): void
  ├─ fillPlaceholders(wb, data): void   ← {{PLACEHOLDER}} text scan
  └─ saveWorkbook(wb, output_path): ExcelExportResult
```

Placeholder data object:
```ts
interface TemplateData {
  PROJECT_NAME: string;
  DOC_TYPE: string;
  DATE: string;        // YYYY-MM-DD
  VERSION: string;
  CONTENT: string;     // raw markdown (for text-dump fallback)
  tables: MarkdownTable[];
}
```

## Related Code Files

**Modify:**
- `src/lib/excel-exporter.ts` — pass `template_path` to filler branch
- `src/tools/export.ts` — expose `template_path` param in Zod schema (already partially wired)

**Create:**
- `src/lib/excel-template-filler.ts` — core template fill logic (~180 lines)

**Config change:**
- `sekkei.config.example.yaml` — add `export.excel_template` example entry

## Implementation Steps

1. Create `src/lib/excel-template-filler.ts`:
   - `loadTemplate(path)` — `ExcelJS.Workbook.xlsx.readFile(path)`
   - `fillNamedRanges(wb, data)` — iterate `wb.definedNames`, fill cell values
   - `fillPlaceholders(wb, data)` — scan all cells for `{{...}}`, replace text
   - `saveWorkbook(wb, outputPath)` — `wb.xlsx.writeFile(outputPath)`, return size
2. Add path-containment check: template_path must not contain `..`
3. Modify `excel-exporter.ts` `exportToExcel()`: if `template_path` → call filler, else existing flow
4. Add `template_path` Zod validation in `export.ts` inputSchema (`.refine` for `.xlsx` extension)
5. Add `export.excel_template` to `sekkei.config.example.yaml`
6. Write unit tests: `tests/unit/excel-template-filler.test.ts` with fixture `.xlsx`

## Todo List

- [x] Create `src/lib/excel-template-filler.ts`
- [x] Implement `loadTemplate`, `fillNamedRanges`, `fillPlaceholders`, `saveWorkbook`
- [x] Add path-containment validation
- [x] Modify `excel-exporter.ts` to branch on `template_path`
- [x] Update Zod schema in `export.ts`
- [x] Update `sekkei.config.example.yaml`
- [x] Create fixture `.xlsx` for tests
- [x] Write unit tests
- [x] `npm run lint` — no errors
- [x] `npm test` — 154 pass

## Success Criteria
- `export_document` with `template_path` fills named ranges and `{{PLACEHOLDER}}` cells
- Company formatting (colors, merged cells, fonts) preserved in output
- Invalid template path → `SekkeiError("VALIDATION_FAILED")`
- Unit tests cover: fill named ranges, fill placeholders, path traversal rejection

## Risk Assessment
- **ExcelJS readFile loses cell styles** — mitigate: test with real template first; if broken, add xlsx-populate
- **Named range API differences across xlsx versions** — mitigate: fallback to placeholder text scan always available
- **Large template files slow export** — mitigate: no streaming needed for spec docs (≤5MB typical)

## Security Considerations
- Template path: `resolve()` + check `startsWith(allowedBase)` — same pattern as template override dir
- No shell execution; ExcelJS is pure Node.js
- Output path validated by existing Zod regex in export.ts

## Next Steps
- Phase 01 CLI `export` command will expose `--template` flag using this feature
