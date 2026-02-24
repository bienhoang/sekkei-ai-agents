# Sekkei MCP Tools & Document Chain — Research Report
Date: 2026-02-23 | Researcher: researcher-02

---

## 1. All MCP Tools (9 total)

| Tool | File | Purpose |
|------|------|---------|
| `get_template` | get-template.ts | Returns raw MD template for a doc type |
| `generate_document` | generate.ts | Assembles template + AI instructions + input → returns context block for skill layer to generate |
| `validate_document` | validate.ts | Completeness, cross-refs, table structure, structure rules; supports manifest + directory modes |
| `get_chain_status` | chain-status.ts | Reads `sekkei.config.yaml`, returns doc chain progress + lifecycle status |
| `export_document` | export.ts | Converts MD → xlsx/pdf/docx/gsheet via Python bridge or TS exporters |
| `translate_document` | translate.ts | Returns content + glossary context block; actual translation done by skill layer |
| `manage_glossary` | glossary.ts | CRUD on `glossary.yaml` via Python bridge (add/list/find/export/import) |
| `analyze_update` | update.ts | Two modes: (a) diff upstream_old→new + find downstream impacts, (b) check_staleness via git diff |
| `validate_chain` | validate-chain.ts | Cross-validates IDs across whole chain via `cross-ref-linker.ts` |

### Key input patterns
- All paths validated with Zod regex refinements (no `..`, must match extension)
- Max content: 500,000 chars per field
- `doc_type` always an enum from `DOC_TYPES`

---

## 2. Document Chain Flow

### V-Model Chain Order
```
RFP → overview → functions-list → requirements → basic-design → detail-design → test-spec
```
Plus supplementary types: `crud-matrix`, `traceability-matrix`, `operation-design`, `migration-design`, `sitemap`

### Generation cycle
1. **generate_document**: loads template + GENERATION_INSTRUCTIONS + upstream_content → extracts IDs via `extractAllIds()` → injects `## Available Upstream IDs` block constraining AI to use only those IDs
2. **validate_document**: checks completeness rules, cross-references, optional structure rules; preset: enterprise/standard/agile
3. **export_document**: MD → xlsx (via excel-exporter.ts) | pdf (pdf-exporter.ts) | docx (docx-exporter.ts) | gsheet (google-sheets-exporter.ts); diff_mode=true enables 朱書き redline highlighting
4. **translate_document**: wraps content + glossary for skill-layer AI translation
5. **analyze_update**: diffs old→new upstream, maps changed IDs to impacted downstream sections; OR runs git-diff staleness scoring

### Lifecycle statuses (in doc frontmatter)
`draft` → `review` → `approved` → `revised` → `obsolete`

### Split generation mode
`generate_document` supports `scope: "shared" | "feature"` + `feature_name` for splitting large designs into `03-system/` (shared) and `05-features/{name}/` (feature-specific) directories.

---

## 3. Cross-Reference ID System

### Standard prefixes (`id-extractor.ts`)
| Prefix | Meaning | Chain position |
|--------|---------|---------------|
| F-NNN | Function | functions-list |
| REQ-NNN | Requirement | requirements |
| NFR-NNN | Non-functional req | requirements |
| SCR-NNN | Screen | basic-design |
| TBL-NNN | Table/DB | basic-design |
| API-NNN | API endpoint | basic-design |
| CLS-NNN | Class | detail-design |
| DD-NNN | Data dictionary | detail-design |
| TS-NNN | Test scenario | test-spec |
| UT/IT/ST/UAT-NNN | Test cases by level | test-spec |
| OP-NNN | Operation | operation-design |
| MIG-NNN | Migration | migration-design |

### Extraction logic
- `extractAllIds(content)` — regex `[A-Z]{2,5}-\d{1,4}` catches ALL prefixes including custom (SAL-001, ACC-001)
- `extractIds(content)` — only standard prefixes, grouped by type
- `extractIdsByType(content, type)` — single type lookup

### Constraint injection
`generate_document` calls `buildUpstreamIdsBlock()` which extracts IDs from `upstream_content` and injects "MUST reference ONLY these IDs" instruction block into the AI context.

---

## 4. `analyze_update` — Diff/Staleness

### Mode A: Document diff
- Delegates to `callPython("diff", {upstream_old, upstream_new, downstream, revision_mode})`
- Python `diff_analyzer.py` returns: `diff.added_sections`, `diff.removed_sections`, `diff.modified_sections`, `changed_ids`, `impacts[]` (section → referenced_ids)
- `revision_mode=true` also returns suggested 改訂履歴 table row

### Mode B: Staleness check (`check_staleness=true`)
- Uses `simple-git` to run git diff from `since` ref
- Maps changed files to features via glob patterns in `sekkei.config.yaml`
- Scores each feature: `score = days_since_doc_update(40%) + num_files_changed(30%) + lines_changed(30%)`
- `getAffectedDocTypes(featureId)` maps ID prefix to doc types that need regeneration (e.g., F- → functions-list + requirements)

---

## 5. SKILL.md → MCP Tool Mapping

SKILL.md file not found at `sekkei/skills/sekkei/SKILL.md` (empty output). Sub-command mapping inferred from CLAUDE.md + tool names:

| Skill sub-command (inferred) | MCP Tool called |
|------------------------------|----------------|
| `/sekkei generate <doc_type>` | `generate_document` |
| `/sekkei validate` | `validate_document` |
| `/sekkei export` | `export_document` |
| `/sekkei translate` | `translate_document` |
| `/sekkei status` | `get_chain_status` |
| `/sekkei update` | `analyze_update` |
| `/sekkei glossary` | `manage_glossary` |
| `/sekkei chain` | `validate_chain` |
| `/sekkei template` | `get_template` |

The generate + translate tools intentionally return **context blocks** (not final docs) — the skill layer is responsible for calling the AI with the returned context to produce actual content.

---

## 6. Key Extension Points

1. **New doc type**: add to `DOC_TYPES` enum, add template in `templates/ja/`, add entry to `GENERATION_INSTRUCTIONS` in `generation-instructions.ts`, add validation rules in `validator.ts`
2. **New ID prefix**: add to `ID_TYPES` and `ID_PATTERN` regex in `id-extractor.ts`
3. **New export format**: add to `EXPORT_FORMATS` enum in `export.ts`, implement exporter in `lib/`
4. **New project type**: add to `PROJECT_TYPES`, add `PROJECT_TYPE_INSTRUCTIONS` entry in `generate.ts`
5. **Staleness feature mapping**: configured in `sekkei.config.yaml` — no code change needed

---

## Unresolved Questions

1. SKILL.md was not found — exact sub-command names and parameter signatures unknown; need to locate actual skill file
2. Python `diff_analyzer.py` internal diff algorithm unknown (section-level or line-level?)
3. `validate_chain` reads doc paths from `sekkei.config.yaml` chain entries — format of those entries not confirmed
4. `cross-ref-linker.ts` orphan/missing detection algorithm not reviewed
