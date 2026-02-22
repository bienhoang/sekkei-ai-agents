# Research: CLI Frameworks, Word/Excel Export — Sekkei Phase 2
Date: 2026-02-22 | Researcher: af95e34

---

## Topic 1: Node.js CLI Frameworks (ESM/TypeScript)

### Candidates

| Library | ESM | TS | Last publish | Downloads/mo | Notes |
|---|---|---|---|---|---|
| **citty** (unjs) | yes | yes | ~2mo ago | millions | Lightest; `defineCommand` + subcommand tree; used by Nuxt/Nitro |
| **commander** | yes | yes | active | ~160M | Most widely adopted; verbose but stable |
| **yargs** | yes | yes | active | ~100M | Heavy; better for many flags/options |
| **oclif** | yes | yes | active | enterprise | Plugin architecture; overkill for sekkei |
| **meow** | ESM-first | limited | active | moderate | Minimal; no subcommand tree |

### Recommendation: citty

- Native ESM, zero config TS, minimal footprint
- `defineCommand({ args, subCommands, run })` maps 1:1 to existing async handler functions
- Subcommand tree: `sekkei generate`, `sekkei export`, `sekkei validate` are trivial

```ts
// Wrapping an existing handler — pattern
import { defineCommand, runMain } from 'citty'
import { generateHandler } from '../lib/handlers.js'

const generate = defineCommand({
  meta: { name: 'generate', description: 'Generate a document' },
  args: { type: { type: 'string', required: true }, lang: { type: 'string', default: 'ja' } },
  run: async ({ args }) => generateHandler(args, {})
})

export default defineCommand({ subCommands: { generate, export: exportCmd, validate: validateCmd } })
```

- Handler reuse: MCP handlers take `(args, extra)` — CLI just passes `{}` for extra. Zero refactoring.

---

## Topic 2: Node.js Word (.docx) Generation

### Candidates

| Library | Approach | Template (.dotx) | Japanese | Maintained |
|---|---|---|---|---|
| **docx** (npm) | Programmatic DSL | No template support | Yes (font names) | Active (v9.5) |
| **officegen** | Programmatic stream | No | Unknown | Dead (5yr) — skip |
| **docxtemplater** | Fill existing .docx template | Yes — `{placeholders}`, loops | Yes | Very active (v3.68, 4d ago) |
| **docx-templates** | JS expressions in .docx | Yes — `+++js` inside Word | Yes | Active |

### Recommendation: docxtemplater for template-based, docx for programmatic

**docxtemplater** is best for sekkei because:
- Author creates `.docx` master template with `{title}`, `{requirements}` etc. once
- Node fills it — formatting/styles/A4 layout preserved in template
- Japanese: embed Japanese fonts in the template itself — docxtemplater preserves them
- Supports loops `{#items}{.}{/items}` for table rows, numbered lists

**docx** is better if building documents 100% programmatically (no template on disk).

**Markdown → docx**: No pure-JS solution with good Japanese support.
- Best approach: **pandoc** via `execFile` (same bridge pattern as python-bridge.ts)
- `pandoc input.md -o output.docx --reference-doc=template.docx` — uses reference .docx for styles
- Requires pandoc installed; add to setup docs as optional dependency
- Alternative: convert MD → HTML → inject into docxtemplater HTML module (paid plugin)

---

## Topic 3: Excel Template System

### ExcelJS vs xlsx-populate

| | ExcelJS | xlsx-populate |
|---|---|---|
| Open existing .xlsx | Yes | Yes |
| Named ranges | Yes (`wb.definedNames`) | Yes |
| Cell fill by ref | Yes (`ws.getCell('B3').value`) | Yes (cleaner API) |
| Preserve formatting | Partial — loses some styles | Designed for this — preserves all |
| Charts preservation | Drops charts | Preserves charts |
| Maintained | Slow (last release 2023) | Less active but stable |
| TypeScript types | Good | Adequate |

### Recommendation: xlsx-populate for template filling

Current sekkei uses Python/openpyxl for Excel. For a Node path:
- **xlsx-populate** wins for template workflows — open `.xlsx` master, fill named cells, save
- Named range pattern:

```ts
import XlsxPopulate from 'xlsx-populate'

const wb = await XlsxPopulate.fromFileAsync('templates/ja/test-spec.xlsx')
wb.sheet('Sheet1').cell('B3').value('テスト仕様書')
wb.namedRange('REQ_TABLE').value(rows)  // if named range defined in template
await wb.toFileAsync('output.xlsx')
```

- ExcelJS is fine if generating from scratch (no existing template to preserve).
- **Keep the Python/openpyxl path** as primary — it's already implemented and openpyxl has better named-range support than any JS lib.

---

## Summary Decisions

1. **CLI**: citty — minimal, ESM-native, trivial handler reuse
2. **Word export**: docxtemplater — template-first, preserves JP fonts/A4 layout
3. **Markdown→docx**: pandoc via execFile (optional dep, document in setup)
4. **Excel (Node path)**: xlsx-populate; keep Python/openpyxl as primary

---

## Unresolved Questions

1. Does sekkei need a standalone CLI binary (via `bin` in package.json) or internal CLI only for testing/dev use?
2. Pandoc availability: should it be a hard or soft dependency? What fallback if absent?
3. Are .docx templates (for docxtemplater) going into `sekkei/templates/` alongside .md templates?
4. Named ranges in Excel templates — need to define the naming convention (e.g., `SEKKEI_TITLE`, `SEKKEI_TABLE_START`) before template authoring.

---

## Sources
- [citty GitHub (unjs)](https://github.com/unjs/citty)
- [citty on UnJS](https://unjs.io/packages/citty/)
- [docxtemplater](https://docxtemplater.com)
- [docx npm](https://www.npmjs.com/package/docx)
- [xlsx-populate npm](https://www.npmjs.com/package/xlsx-populate)
- [ExcelJS GitHub](https://github.com/exceljs/exceljs)
- [node-pandoc](https://github.com/eshinn/node-pandoc)
- [npm-compare: excel libs](https://npm-compare.com/excel4node,exceljs,node-xlsx,xlsx,xlsx-populate)
