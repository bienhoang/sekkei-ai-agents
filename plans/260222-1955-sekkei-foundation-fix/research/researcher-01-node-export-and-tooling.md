# Research: Node.js Alternatives to Python Export Layer
Date: 2026-02-22 | Author: researcher-01

---

## 1. ExcelJS for Replacing openpyxl

**Verdict: Use ExcelJS. Clear winner.**

### Capabilities
- Full UTF-8 / CJK support — xlsx format natively stores Unicode; no encoding flags needed for Japanese
- Merged cells: `ws.mergeCells('A1:C2')` — styles must be applied to the **top-left cell only**; known quirk (styles on merged non-TL cells are silently ignored, see issue #1526)
- Cell styling: font, fill, border, alignment, number format, column widths all supported
- Template pattern: `readFile()` → mutate cells → `writeFile()` — preserves existing styles, charts, sheets

### Template Fill Pattern
```ts
import ExcelJS from 'exceljs';

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile('templates/sekkei-template.xlsx');
const ws = wb.getWorksheet('要件定義書');

ws.getCell('B3').value = '株式会社サンプル';          // company name
ws.getCell('B4').value = new Date();                  // date
ws.getCell('A7').value = data.title;                  // Japanese UTF-8 fine
ws.getColumn('B').width = 40;                          // column width

await wb.xlsx.writeFile('output/requirements.xlsx');
```

### Comparison: ExcelJS vs xlsx-populate vs SheetJS
| | ExcelJS | xlsx-populate | SheetJS (community) |
|---|---|---|---|
| Template load | `readFile()` | `XlsxPopulate.fromFileAsync()` | `readFile()` |
| Style preservation | Good | Excellent (specifically designed for this) | Limited in free tier |
| Merged cells + style | Top-left cell only | Same limitation | Same |
| TypeScript types | Bundled | `@types/xlsx-populate` | Bundled |
| Maintenance | Active (v4.4) | Last commit 2023, low activity | Active but dual-license |
| npm weekly DLs | ~1.2M | ~150K | ~3M |

**Decision**: ExcelJS for active maintenance + wide adoption. xlsx-populate is better for pure template-filling but stagnant.

---

## 2. Playwright for PDF (Already a Dependency)

**IMPORTANT**: `package.json` already has `playwright: ^1.58.2` — NOT puppeteer. Use Playwright, not Puppeteer.

### Playwright PDF Generation
```ts
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();

// Inject HTML with @font-face
await page.setContent(htmlContent, { waitUntil: 'networkidle' });

// Wait for fonts to load
await page.evaluate(() => document.fonts.ready);

const pdfBuffer = await page.pdf({
  format: 'A4',
  margin: { top: '25mm', bottom: '25mm', left: '30mm', right: '20mm' },
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: `<div style="font-size:9px;width:100%;text-align:center">{title}</div>`,
  footerTemplate: `<div style="font-size:9px;width:100%;text-align:right;padding-right:10mm">
    <span class="pageNumber"></span> / <span class="totalPages"></span>
  </div>`,
});

await browser.close();
```

### Japanese Font Strategy
Two options:
1. **Embed via `@font-face`** (self-contained, reliable):
```css
@font-face {
  font-family: 'Noto Sans JP';
  src: url('file:///path/to/NotoSansJP-Regular.otf');
}
body { font-family: 'Noto Sans JP', sans-serif; }
```
2. **System fonts** (simpler, requires OS has Japanese fonts — risky in Docker/CI):
```css
body { font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif; }
```

**Recommendation**: Embed Noto Sans JP via `@font-face` with absolute path. Bundle font in `assets/fonts/`. Use `page.evaluate(() => document.fonts.ready)` before `page.pdf()`.

### Playwright vs Puppeteer
Playwright is already in the project. No reason to add puppeteer. Playwright's `page.pdf()` API is nearly identical to Puppeteer's.

---

## 3. Keigo Validation Patterns

**No viable npm package exists** for keigo detection. Custom regex is the only practical approach.

### Pattern Approach
```ts
const KEIGO_PATTERNS = {
  // 丁寧語 (Teineigo) — polite
  teineigo: [
    /です[。\n]/g,          // desu
    /ます[。\n\s]/g,         // masu
    /ました[。\n]/g,          // mashita
    /ません[。\n]/g,          // masen
  ],
  // 敬語 (Kenjougo/formal) — humble/respectful
  keigo: [
    /いたします/g,            // itashimasu
    /ございます/g,            // gozaimasu
    /申し上げます/g,           // moushiagemasu
    /拝察/g,                // haisatsu
    /させていただ/g,           // sasete itadaku
  ],
  // 常体 (Joutai) — plain/casual
  joutai: [
    /である[。\n]/g,          // de aru
    /した[。\n]/g,            // shita (verb past plain)
    /する[。\n]/g,            // suru (verb plain)
    /ない[。\n]/g,            // nai (negative plain)
  ],
};

function detectKeigoLevel(text: string): 'teineigo' | 'keigo' | 'joutai' | 'mixed' {
  const counts = {
    teineigo: KEIGO_PATTERNS.teineigo.reduce((n, p) => n + (text.match(p)?.length ?? 0), 0),
    keigo:    KEIGO_PATTERNS.keigo.reduce((n, p) => n + (text.match(p)?.length ?? 0), 0),
    joutai:   KEIGO_PATTERNS.joutai.reduce((n, p) => n + (text.match(p)?.length ?? 0), 0),
  };
  const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  const hasMix = counts.joutai > 0 && (counts.teineigo > 0 || counts.keigo > 0);
  return hasMix ? 'mixed' : dominant as any;
}
```

**Limitations**: Regex alone cannot handle verb conjugation context. False positives exist (e.g., `する。` mid-sentence). Good enough for spec doc validation (formal docs should be uniformly teineigo/keigo).

---

## 4. Interactive CLI Wizard

**Recommendation: `@clack/prompts`**

| | @clack/prompts | @inquirer/prompts | enquirer |
|---|---|---|---|
| Bundle size | ~15KB | ~50KB (modular) | ~50KB (1 dep) |
| Design | Modern, beautiful spinners | Classic | Stylish |
| TypeScript | Native | Native | Via `@types/enquirer` |
| Last update | Feb 2026 (active) | Active | Sporadic 2024 |
| `npx` pattern | Excellent | Good | OK |
| API style | Functional, grouped | Per-prompt functions | Class-based |

### `npx` Setup Wizard Pattern
```ts
#!/usr/bin/env node
import * as p from '@clack/prompts';

async function main() {
  p.intro('Sekkei セットアップ');

  const config = await p.group({
    projectName: () => p.text({ message: 'プロジェクト名', placeholder: 'my-project' }),
    keigoLevel:  () => p.select({
      message: '敬語レベル',
      options: [
        { value: 'teineigo', label: '丁寧語 (です/ます)' },
        { value: 'keigo',    label: '敬語 (いたします/ございます)' },
      ],
    }),
    outputDir: () => p.text({ message: '出力ディレクトリ', initialValue: './output' }),
  });

  // write sekkei.config.yaml
  p.outro('設定完了！');
}

main().catch(console.error);
```

---

## Summary / Recommendations

| Replacement | Python original | Node.js alternative | Effort |
|---|---|---|---|
| Excel export | openpyxl | **exceljs** v4.4 | Low |
| PDF export | WeasyPrint | **Playwright** (already dep) | Low |
| Keigo validation | — | Custom regex (no npm package) | Medium |
| Setup wizard | — | **@clack/prompts** | Low |

Total new deps needed: `exceljs`, `@clack/prompts` (Playwright already present).

---

## Unresolved Questions

1. Does the existing `templates/*.xlsx` file exist, or does it need to be created from scratch with ExcelJS?
2. Are Noto Sans JP font files to be bundled in the repo, or expected on host system? (impacts CI/Docker)
3. For keigo validation: is the current implementation in Python (`nlp/diff_analyzer.py`) doing anything beyond regex? If using NLP/MeCab, that's harder to replace.
4. `playwright` in package.json — does it ship Chromium via `playwright install`? Need to confirm CI setup handles this (not just `npm install`).
5. xlsx-populate warrants a second look if the primary use-case is filling pre-designed company `.xlsx` templates — evaluate if templates already exist.
