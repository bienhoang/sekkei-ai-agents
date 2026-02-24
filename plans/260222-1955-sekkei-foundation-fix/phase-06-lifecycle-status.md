# Phase 06: Document Lifecycle Status

## Context Links

- Research: [researcher-02-jp-si-standards.md](./research/researcher-02-jp-si-standards.md) §3
- Brainstorm: [brainstorm-260222-1955-sekkei-improvements.md](../reports/brainstorm-260222-1955-sekkei-improvements.md) §C1
- Phase 04: [phase-04-template-presets.md](./phase-04-template-presets.md) — preset `version_scheme` (alphabetic/numeric) informs default version in frontmatter
- Existing chain-status tool: `sekkei/packages/mcp-server/src/tools/chain-status.ts`
- Existing types: `sekkei/packages/mcp-server/src/types/documents.ts` (`ChainEntry`, `ProjectConfig`)
- Existing templates: `sekkei/packages/mcp-server/templates/ja/` (11 files — need frontmatter update)
- VitePress preview: `sekkei/packages/preview/` (badge integration — note only, not implemented here)

---

## Overview

- **Priority:** P1 — enterprise adoption requires lifecycle tracking; Google Docs has this natively; Sekkei needs parity
- **Status:** pending
- **Description:** Add `status` and `version` fields to YAML frontmatter of generated documents. Update `chain-status.ts` to read and display lifecycle state per document. Update `types/documents.ts` with `LifecycleStatus` type. Update all 11 Japanese templates to include lifecycle frontmatter fields.

---

## Key Insights

From researcher-02 (JP SI Standards §3):
- Standard 3-role review chain: 作成者 → レビュアー → 承認者
- Status labels used across SI firms: ドラフト | レビュー中 | 修正中 | 承認済み | 改版 | 廃版
- Two version numbering conventions: numeric (`0.x`/`1.x`) for mid-tier SI; alphabetic (`A版`/`B版`) for large SI/government
- `0.x` = draft; `1.0` = first approval; `A版` = first formal issue

Existing `ChainEntry.status` in `types/documents.ts` tracks chain progress (`pending|in-progress|complete`) — separate concern from lifecycle status. Lifecycle status lives in the document's own YAML frontmatter, not in `sekkei.config.yaml`.

`chain-status.ts` currently only reads `sekkei.config.yaml` chain entries. Enhancement: also read frontmatter `status` from actual output files to show lifecycle state alongside chain progress.

Scope constraint: VitePress badge integration is noted but NOT implemented in this phase (avoids scope creep; VitePress is a separate package). Chain-status MCP tool output is the delivery target.

---

## Requirements

### Functional
- New `LifecycleStatus` type: `"draft" | "review" | "approved" | "revised" | "obsolete"`
- Japanese label map for each status (for display in MCP tool output)
- Each document template includes lifecycle frontmatter:
  ```yaml
  ---
  status: draft
  version: "0.1"
  author: ""
  reviewer: ""
  approver: ""
  ---
  ```
- `chain-status.ts` enhancement:
  - When output file path exists, read its YAML frontmatter
  - Display `lifecycle_status` and `version` columns in chain status table
- `validate_document` tool: warn if `status` field missing from frontmatter
- `DocumentMeta` type in `types/documents.ts`: add `status`, `version`, `author`, `reviewer`, `approver` optional fields
- No enforcement of status transitions (manual workflow; BrSE/PM updates YAML manually)

### Non-functional
- Frontmatter parsing reuses existing `yaml` package (already dep)
- Reading frontmatter from output files: graceful failure if file not found or malformed (show `-` in table)
- No new dependencies

---

## Architecture

```
types/documents.ts
  ├── LifecycleStatus (NEW type)
  ├── LIFECYCLE_STATUSES (NEW const)
  ├── LIFECYCLE_LABELS (NEW map: LifecycleStatus → Japanese label)
  └── DocumentMeta (MODIFY: add status, version, author, reviewer, approver)

src/tools/chain-status.ts        (MODIFY)
  └── for each chain entry with output path:
        readFrontmatter(outputPath) → LifecycleStatus + version
        display in status table

templates/ja/*.md                (MODIFY all 11 files)
  └── add lifecycle fields to YAML frontmatter block

src/lib/frontmatter-reader.ts    (NEW: <80 lines)
  └── readDocumentFrontmatter(filePath): Promise<Partial<DocumentMeta>>
```

### YAML Frontmatter Schema (added to all templates)

```yaml
---
doc_type: requirements          # existing field
version: "0.1"                  # NEW — "0.1" draft default
status: draft                   # NEW — LifecycleStatus
author: ""                      # NEW — 作成者
reviewer: ""                    # NEW — レビュアー
approver: ""                    # NEW — 承認者
language: ja                    # existing field
sections: [...]                 # existing field
---
```

### LifecycleStatus Type

```ts
export const LIFECYCLE_STATUSES = ["draft", "review", "approved", "revised", "obsolete"] as const;
export type LifecycleStatus = typeof LIFECYCLE_STATUSES[number];

export const LIFECYCLE_LABELS: Record<LifecycleStatus, string> = {
  draft:    "ドラフト",
  review:   "レビュー中",
  approved: "承認済み",
  revised:  "改版",
  obsolete: "廃版",
};
```

### Chain Status Table (enhanced output)

Current output:
```
| Document | Status | Output |
```

Enhanced output:
```
| Document | Chain Status | Lifecycle | Version | Output |
|----------|-------------|-----------|---------|--------|
| requirements | ✅ complete | 承認済み | 1.0 | output/requirements.md |
| basic-design | 🔄 in-progress | レビュー中 | 0.3 | output/basic-design.md |
| detail-design | ⏳ pending | - | - | - |
```

---

## Related Code Files

### Modify
- `sekkei/packages/mcp-server/src/types/documents.ts` — add `LifecycleStatus`, `LIFECYCLE_STATUSES`, `LIFECYCLE_LABELS`; update `DocumentMeta` with new optional fields
- `sekkei/packages/mcp-server/src/tools/chain-status.ts` — read frontmatter from output files; add Lifecycle + Version columns to output table
- `sekkei/packages/mcp-server/src/lib/validator.ts` — add warning if `status` field missing from YAML frontmatter (new `ValidationIssue` type: `"missing_frontmatter_field"` or reuse `"missing_section"` with custom message)
- All 11 templates in `sekkei/packages/mcp-server/templates/ja/`:
  - `basic-design.md`, `detail-design.md`, `requirements.md`, `test-spec.md`, `functions-list.md`, `overview.md`, `crud-matrix.md`, `traceability-matrix.md`, `operation-design.md`, `migration-design.md`, `screen-design.md`

### Create
- `sekkei/packages/mcp-server/src/lib/frontmatter-reader.ts` — reads YAML frontmatter from `.md` files (≤80 lines)

### Tests to Create
- `sekkei/packages/mcp-server/tests/unit/frontmatter-reader.test.ts`

---

## Implementation Steps

1. **Update `types/documents.ts`:**
   - Add `LIFECYCLE_STATUSES`, `LifecycleStatus`, `LIFECYCLE_LABELS`
   - Add to `DocumentMeta`: `status?: LifecycleStatus`, `version?: string`, `author?: string`, `reviewer?: string`, `approver?: string`

2. **Create `src/lib/frontmatter-reader.ts`:**
   ```ts
   import { readFile } from "node:fs/promises";
   import { parse as parseYaml } from "yaml";
   import type { DocumentMeta } from "../types/documents.js";

   /** Extract YAML frontmatter from markdown file. Returns {} on any error. */
   export async function readDocumentFrontmatter(filePath: string): Promise<Partial<DocumentMeta>> {
     try {
       const content = await readFile(filePath, "utf-8");
       const match = content.match(/^---\n([\s\S]*?)\n---/);
       if (!match) return {};
       return parseYaml(match[1]) ?? {};
     } catch {
       return {};
     }
   }
   ```

3. **Update `src/tools/chain-status.ts`:**
   - Import `readDocumentFrontmatter` and `LIFECYCLE_LABELS`
   - For each chain entry where `output` path exists: call `readDocumentFrontmatter(resolvedOutputPath)`
   - Update table header to include `Lifecycle` and `Version` columns
   - In each row: show `LIFECYCLE_LABELS[meta.status] ?? "-"` and `meta.version ?? "-"`
   - Keep existing chain status icon logic unchanged

4. **Update all 11 templates** — add lifecycle frontmatter fields to existing `---` block:
   - Add `version: "0.1"` after existing `version` field (or introduce if absent)
   - Add `status: draft`
   - Add `author: ""`
   - Add `reviewer: ""`
   - Add `approver: ""`

5. **Update `src/lib/validator.ts`:**
   - In frontmatter parsing section: check for `status` field presence
   - If absent: push `{ type: "missing_section", message: "YAMLフロントマターに status フィールドが必要です", severity: "warning" }`

6. **Write tests `tests/unit/frontmatter-reader.test.ts`:**
   - Parses valid frontmatter → returns correct fields
   - Missing frontmatter block → returns `{}`
   - Malformed YAML → returns `{}`
   - Non-existent file → returns `{}`

7. **`npm run lint`** — no TS errors
8. **`npm test`** — 142 existing + new tests pass

---

## Todo List

- [ ] Update `types/documents.ts` — add `LifecycleStatus`, `LIFECYCLE_STATUSES`, `LIFECYCLE_LABELS`, update `DocumentMeta`
- [ ] Create `src/lib/frontmatter-reader.ts`
- [ ] Update `src/tools/chain-status.ts` — read frontmatter + enhanced table columns
- [ ] Update all 11 templates in `templates/ja/` — add lifecycle frontmatter fields
  - [ ] `basic-design.md`
  - [ ] `detail-design.md`
  - [ ] `requirements.md`
  - [ ] `test-spec.md`
  - [ ] `functions-list.md`
  - [ ] `overview.md`
  - [ ] `crud-matrix.md`
  - [ ] `traceability-matrix.md`
  - [ ] `operation-design.md`
  - [ ] `migration-design.md`
  - [ ] `screen-design.md`
- [ ] Update `src/lib/validator.ts` — warn on missing `status` field
- [ ] Write `tests/unit/frontmatter-reader.test.ts`
- [ ] `npm run lint` passes
- [ ] `npm test` — all tests pass

---

## Success Criteria

- `get_chain_status` output table includes Lifecycle and Version columns
- Document file with `status: approved` shows "承認済み" in chain status output
- Document file not found or missing `status` field shows "-" gracefully (no crash)
- All 11 templates have `status: draft` and `version: "0.1"` in frontmatter
- `validate_document` warns when frontmatter missing `status` field
- New frontmatter fields don't break existing `template-loader.test.ts` or `validator.test.ts`
- `npm test` — all 142 existing tests pass

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Updating 11 template frontmatter blocks breaks `template-loader.test.ts` (tests check exact frontmatter fields) | Medium | Read `template-loader.test.ts` before editing templates; new fields are optional in `DocumentMeta` so parser should handle gracefully |
| `chain-status.ts` reads output file paths that are relative → wrong resolve | Low | Use `join(dirname(config_path), outputPath)` — same pattern already used in chain-status for `featuresDir` |
| `chain-status.ts` grows beyond 200 lines after enhancement | Medium | Extract `readLifecycleInfo()` helper function; keep main handler lean |
| Template frontmatter `version` field conflicts with existing `version` in `DocumentMeta` | Low | `DocumentMeta.version` is already `string` — no type conflict; just ensure templates use string `"0.1"` not numeric `0.1` |

---

## Security Considerations

- `readDocumentFrontmatter` reads only from output file paths already resolved via `config_path` context — no arbitrary user-controlled paths
- YAML parsing uses existing `yaml` package with no `eval` risk
- `status` field validated against `LIFECYCLE_STATUSES` enum if used in logic (no free-form string injection)

---

## Next Steps

- Phase 04 (presets): `version_scheme: alphabetic` preset → templates default to `version: "A-1"` instead of `"0.1"` — implement as follow-up tweak to template defaults
- VitePress preview (`sekkei/packages/preview/`): add status badge component reading frontmatter `status` — separate task in Phase 2
- Git-based versioning (Brainstorm C2): `sekkei diff` + 朱書き output — builds on lifecycle `status: revised` marker; Phase 2 roadmap
