# Phase 03: Playwright PDF Exporter (Replace Python WeasyPrint)

## Context Links

- Research: [researcher-01-node-export-and-tooling.md](./research/researcher-01-node-export-and-tooling.md) §2
- Brainstorm: [brainstorm-260222-1955-sekkei-improvements.md](../reports/brainstorm-260222-1955-sekkei-improvements.md) §D5
- Phase 02 plan: [phase-02-excel-exporter.md](./phase-02-excel-exporter.md) (shares engine routing pattern)
- Current bridge: `sekkei/packages/mcp-server/src/lib/python-bridge.ts`
- Current export tool: `sekkei/packages/mcp-server/src/tools/export.ts`
- Python original: `sekkei/packages/mcp-server/python/export/pdf_exporter.py`

---

## Overview

- **Priority:** P1 — eliminates WeasyPrint build pain (libpango, libcairo, etc.)
- **Status:** pending
- **Description:** Create `src/lib/pdf-exporter.ts` using Playwright (already `^1.58.2` in deps) to render Markdown → HTML → PDF. Japanese A4 layout with Noto Sans JP. Route `export_document` tool PDF path to Node.js exporter via `SEKKEI_EXPORT_ENGINE`.

---

## Key Insights

- Playwright `^1.58.2` already in `package.json` — no new dep needed
- Playwright's `page.pdf()` API is nearly identical to Puppeteer's; all existing Puppeteer patterns apply
- Font strategy: **download Noto Sans JP on first use** and cache in `~/.cache/sekkei/fonts/` — keeps npm package small while ensuring reliable CJK rendering
- Must call `await page.evaluate(() => document.fonts.ready)` before `page.pdf()` to prevent CJK glyphs rendering as tofu
- Chromium browser binary: **auto-install on first PDF export** if missing — run `execFile('npx', ['playwright', 'install', 'chromium'])` when browser launch fails; accept ~100MB download for zero-friction UX
<!-- Updated: Validation Session 1 - Font download instead of bundle; Chromium auto-install instead of manual -->
- Japanese A4 margins per standard: top 25mm, bottom 25mm, left 30mm, right 20mm
- `displayHeaderFooter: true` in `page.pdf()` — header shows doc title, footer shows page n / total
- `printBackground: true` — needed for table row fills to appear in PDF
- `page.setContent()` with `{ waitUntil: 'networkidle' }` — ensures all assets loaded before PDF capture
- Noto Sans JP font: bundle in `assets/fonts/NotoSansJP-Regular.otf` + `NotoSansJP-Bold.otf` (~4MB each); reference via absolute path in `@font-face`

---

## Requirements

### Functional
- Convert Markdown → HTML → PDF via Playwright Chromium
- A4 page size, margins: top 25mm, bottom 25mm, left 30mm, right 20mm
- Japanese text rendered with Noto Sans JP (no tofu)
- Page numbers in footer: `n / total` right-aligned
- Document title in header: centered, 9pt
- Company logo support: if `logo_path` provided, embed as `<img>` in header HTML
- Tables: styled with borders, alternating row fill
- Code blocks: monospace font, light gray background
- `SEKKEI_EXPORT_ENGINE=python` falls back to Python WeasyPrint bridge

### Non-functional
- PDF generation ≤30s for typical spec doc (≤50 pages)
- Browser instance launched fresh per call; closed in `finally` block (no leaked processes)
- File under 200 lines; HTML template extracted to separate string constant or helper

---

## Architecture

```
src/tools/export.ts
  └── checks SEKKEI_EXPORT_ENGINE
       ├── "node" (default) → src/lib/pdf-exporter.ts
       │     ├── markdownToHtml()        (internal: markdown → HTML string)
       │     ├── buildHtmlPage()         (internal: wrap with CSS + @font-face)
       │     └── Playwright chromium API
       └── "python" → lib/python-bridge.ts (existing)

~/.cache/sekkei/fonts/            (downloaded on first use)
  ├── NotoSansJP-Regular.otf
  └── NotoSansJP-Bold.otf
```

### HTML Page Structure

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <style>
    @font-face {
      font-family: 'Noto Sans JP';
      src: url('file:///abs/path/to/NotoSansJP-Regular.otf');
    }
    @font-face {
      font-family: 'Noto Sans JP';
      font-weight: bold;
      src: url('file:///abs/path/to/NotoSansJP-Bold.otf');
    }
    body { font-family: 'Noto Sans JP', sans-serif; font-size: 10pt; line-height: 1.6; }
    h1 { font-size: 16pt; border-bottom: 2px solid #333; }
    h2 { font-size: 13pt; border-bottom: 1px solid #888; }
    table { border-collapse: collapse; width: 100%; }
    th { background: #dde; font-weight: bold; padding: 4px 8px; border: 1px solid #999; }
    td { padding: 4px 8px; border: 1px solid #ccc; }
    tr:nth-child(even) { background: #f5f5f5; }
    code { background: #f0f0f0; font-family: monospace; padding: 2px 4px; }
    pre  { background: #f0f0f0; padding: 8px; overflow-wrap: break-word; }
  </style>
</head>
<body><!-- converted markdown HTML --></body>
</html>
```

### Playwright PDF Options

```ts
await page.pdf({
  format: 'A4',
  margin: { top: '25mm', bottom: '25mm', left: '30mm', right: '20mm' },
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: `<div style="font-size:9px;width:100%;text-align:center;color:#555">{title}</div>`,
  footerTemplate: `<div style="font-size:9px;width:100%;text-align:right;padding-right:12mm;color:#555">
    <span class="pageNumber"></span> / <span class="totalPages"></span>
  </div>`,
});
```

---

## Related Code Files

### Modify
- `sekkei/packages/mcp-server/src/tools/export.ts` — add `format === "pdf"` routing to Node.js exporter when engine=node
- `sekkei/packages/mcp-server/src/config.ts` — `exportEngine` field (added in Phase 02; reuse here)
- `sekkei/packages/mcp-server/package.json` — add `"assets/fonts/"` to `"files"` array for npm publish

### Create
- `sekkei/packages/mcp-server/src/lib/pdf-exporter.ts` — main exporter (≤200 lines)
- `sekkei/packages/mcp-server/assets/fonts/NotoSansJP-Regular.otf` — bundled font
- `sekkei/packages/mcp-server/assets/fonts/NotoSansJP-Bold.otf` — bundled font

---

## Implementation Steps

1. **Implement font download + cache:** Create `src/lib/font-manager.ts` (~60 lines) that downloads Noto Sans JP OTF from Google Fonts CDN to `~/.cache/sekkei/fonts/` on first use. Check cache before downloading. Return absolute font path for `@font-face`.
<!-- Updated: Validation Session 1 - Download on first run instead of bundling -->
2. **Create `src/lib/pdf-exporter.ts`:**
   ```ts
   // Exports:
   export interface PdfExportInput {
     content: string;        // Markdown
     doc_type: string;
     output_path: string;
     project_name?: string;
     logo_path?: string;     // optional company logo
   }
   export interface PdfExportResult {
     file_path: string;
     file_size: number;
   }
   export async function exportToPdf(input: PdfExportInput): Promise<PdfExportResult>
   ```
   - Convert Markdown to HTML: use `marked` package (already a dep) for proper GFM parsing — handles nested lists, tables, blockquotes correctly
   <!-- Updated: Validation Session 1 - Use marked instead of custom regex -->
   - Build full HTML page string with `@font-face` using `fileURLToPath` + `dirname` to get absolute font path
   - `const browser = await chromium.launch({ headless: true })`
   - `const page = await browser.newPage()`
   - `await page.setContent(html, { waitUntil: 'networkidle' })`
   - `await page.evaluate(() => document.fonts.ready)` — wait for CJK font load
   - `const pdf = await page.pdf({ format: 'A4', margin: {...}, ... })`
   - `await writeFile(output_path, pdf)` — `output_path` already validated by Zod in export.ts
   - `await browser.close()`
   - Wrap in `try/finally` to ensure `browser.close()` always called
   - Return `{ file_path: output_path, file_size: pdf.byteLength }`
3. **Update `src/tools/export.ts`:**
   - Import `exportToPdf` from `../lib/pdf-exporter.js`
   - In format routing: `format === "pdf"` → `exportToPdf()` when `engine === "node"`
4. **Update `package.json` files array:** add `"assets/"` to ensure fonts published with npm package
5. **Verify build:** `npm run lint`
6. **Manual test:** export a requirements doc to PDF; open in Preview/Acrobat to verify Japanese rendering, page numbers, A4 margins

---

## Todo List

- [ ] Download NotoSansJP-Regular.otf + NotoSansJP-Bold.otf to `assets/fonts/`
- [ ] Create `src/lib/pdf-exporter.ts`
  - [ ] Markdown → HTML conversion (headings, bold, italic, tables, code)
  - [ ] `@font-face` CSS with absolute font path
  - [ ] Full HTML page builder with print CSS
  - [ ] Playwright chromium launch + `page.setContent()`
  - [ ] `document.fonts.ready` wait
  - [ ] `page.pdf()` with A4 margins + header/footer
  - [ ] `try/finally` browser close
  - [ ] Return `PdfExportResult`
- [ ] Update `src/tools/export.ts` — PDF routing to Node.js
- [ ] Add `"assets/"` to `package.json` files array
- [ ] `npm run lint` passes
- [ ] `npm test` — 142 tests still pass
- [ ] Manual PDF smoke test (Japanese text + tables)

---

## Success Criteria

- `export_document` with `format: "pdf"` produces valid PDF without Python
- Japanese characters rendered correctly (no tofu boxes)
- A4 size confirmed; margins correct (verify with ruler in PDF viewer)
- Page numbers appear in footer
- `SEKKEI_EXPORT_ENGINE=python` still routes to Python WeasyPrint
- No leaked browser processes after export
- `npm run lint` + `npm test` pass

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Chromium not installed → launch fails | High | Auto-install: catch launch error, run `execFile('npx', ['playwright', 'install', 'chromium'])`, retry once. Log progress to stderr. |
<!-- Updated: Validation Session 1 - Auto-install Chromium instead of manual hint -->
| Font files too large for npm package (~8MB total) | Medium | Accept for now; add `.gitattributes` LFS note; revisit if package size complaints arise |
| Playwright chromium headless mode unavailable in some Docker images | Medium | Document env requirement; `PLAYWRIGHT_BROWSERS_PATH` env var for custom install location |
| Markdown → HTML conversion misses edge cases (nested lists, etc.) | Low | Cover common cases; complex markdown falls back gracefully to plain text paragraphs |
| `file://` URL for fonts rejected by Playwright content security | Low | Test early; fallback: base64-encode fonts inline in `<style>` |

---

## Security Considerations

- `output_path` validated by Zod regex in `export.ts` (`.pdf` extension)
- No user-provided HTML rendered — only internally generated HTML from validated markdown
- `logo_path` if implemented: validate path containment (no `..`) before embedding
- Browser launched headless with no network access (`page.setContent()` not `page.goto()`)

---

## Next Steps

- Phase 01 (init wizard): after this phase, update post-setup instructions to show `npx playwright install chromium`
- Shared markdown parser between Phase 02 and 03: consider extracting `src/lib/markdown-utils.ts` to avoid duplication (DRY)
- Future: support `.docx` export via `docx` npm package (Phase 2 roadmap item D3)
