# MCP Server Architecture — Research Report
Date: 2026-02-23 | Researcher: 01

## 1. Tool Registration Pattern

**Entry points:**
- `src/server.ts` → `createServer(templateDir, overrideDir?)` calls `registerAllTools()` + `registerAllResources()`
- `src/tools/index.ts` → `registerAllTools()` imports and calls each `register*Tool()` function
- Each tool file exports two things: a `handle*()` async function + a `register*Tool(server, templateDir, overrideDir?)` function

**Pattern to add a new tool:**
```ts
// 1. Create src/tools/my-tool.ts
export async function handleMyTool(args: MyToolArgs): Promise<{ content: [{type:"text"; text:string}]; isError?:boolean }> { ... }

export function registerMyTool(server: McpServer): void {
  server.tool("my_tool", "description", inputSchema, async (args) => handleMyTool(args));
}

// 2. Add to src/tools/index.ts
import { registerMyTool } from "./my-tool.js";
export function registerAllTools(...) {
  // existing registrations...
  registerMyTool(server);
}
```

**All inputs use Zod schemas** with enums. Paths validated with regex refinements. No path traversal (`..` blocked).

## 2. Config System

`src/config.ts` — env-var-only config (server startup):
- `SEKKEI_TEMPLATE_DIR` → template directory (default: `../../templates`)
- `SEKKEI_TEMPLATE_OVERRIDE_DIR` → company override dir with containment check
- `SEKKEI_EXPORT_ENGINE` → `"python"` | `"node"` (default: node)
- `SEKKEI_PYTHON` → python executable path

`sekkei.config.yaml` (project-level, parsed at runtime via `config_path` arg):
- `project.{name, type, language, keigo, preset, industry}`
- `output.directory`
- `autoCommit: bool`
- `chain.{rfp, overview, functions_list, requirements, basic_design, detail_design, test_spec}`
- `google.{credentials_path, auth_type, folder_id}`
- `backlog.{space_key, project_key, api_key_env, sync_mode}`

`ProjectConfig` interface in `src/types/documents.ts` is the authoritative schema.

## 3. Document Types & Enums

`src/types/documents.ts`:
```ts
DOC_TYPES = ["overview","functions-list","requirements","basic-design","detail-design",
             "test-spec","crud-matrix","traceability-matrix","operation-design","migration-design","sitemap"]
LANGUAGES = ["ja","en","vi"]
KEIGO_LEVELS = ["丁寧語","謙譲語","simple"]
PROJECT_TYPES = ["web","mobile","api","desktop","lp","internal-system","saas","batch"]
PRESETS = ["enterprise","standard","agile"]
LIFECYCLE_STATUSES = ["draft","review","approved","revised","obsolete"]
```
To add a new doc type: add to `DOC_TYPES`, add template at `templates/ja/{type}.md`, add generation instructions in `lib/generation-instructions.ts`, add validation rules in `lib/validator.ts`.

## 4. Template System

- Templates at `templates/ja/{doc-type}.md` with YAML frontmatter
- `lib/template-loader.ts` calls `lib/template-resolver.ts`: checks override dir first → falls back to default
- Path containment validation prevents directory traversal
- Frontmatter fields: `doc_type`, `version`, `language`, `sections[]`, optional lifecycle fields

## 5. Validation & ID Extraction

`lib/validator.ts` — validates: required sections, cross-reference IDs, table structure
`lib/id-extractor.ts` — extracts IDs (F-xxx, REQ-xxx, SCR-xxx, TBL-xxx, API-xxx, CLS-xxx, UT/IT/ST/UAT-xxx) via regex
`lib/structure-validator.ts` — validates numbered directory structure
`lib/structure-rules.ts` — checks section ordering, required fields against template rules
`lib/completeness-rules.ts` — per-doc-type required ID patterns and table row minimums
`lib/preset-resolver.ts` — maps preset (enterprise/standard/agile) to strictness settings

## 6. Python Bridge

`lib/python-bridge.ts`:
- `callPython(action, input)` → `execFile(python, [cli.py, action], { env: { SEKKEI_INPUT: JSON } })`
- Whitelisted actions: `["export-excel","export-pdf","export-docx","glossary","diff","export-matrix"]`
- Input: JSON in `SEKKEI_INPUT` env var; Output: JSON on stdout; Errors: JSON on stderr
- Python path: `SEKKEI_PYTHON` env var or `.venv/bin/python3` in `python/` dir
- Timeout: 5min, MaxBuffer: 10MB

To add a new Python action: add to `VALID_ACTIONS` array in `python-bridge.ts` + implement in `python/cli.py`.

## 7. Key Libraries in src/lib/

| File | Purpose |
|------|---------|
| `generation-instructions.ts` | Per-doc-type AI prompts, keigo rules, bilingual instructions |
| `staleness-detector.ts` | Detects stale docs via `feature_file_map` in config |
| `cross-ref-linker.ts` | Links IDs across chain documents |
| `manifest-manager.ts` | Reads/writes `_index.yaml` for split documents |
| `git-committer.ts` | Auto-commits via `autoCommit` config flag |
| `mockup-*.ts` | Screen mockup rendering (HTML builder, parser, renderer) |
| `google-*.ts` | Google Sheets/Workspace export |
| `excel-*.ts` | Node-side Excel export (fallback to python bridge) |

## 8. Existing Tools (9 total)

| Tool | Handler | Notes |
|------|---------|-------|
| `generate_document` | `generate.ts` | Main doc gen, supports split mode, code analysis |
| `get_template` | `get-template.ts` | Raw template retrieval |
| `validate_document` | `validate.ts` | Completeness, cross-refs, structure |
| `get_chain_status` | `chain-status.ts` | Reads sekkei.config.yaml chain state |
| `export_document` | `export.ts` | Excel/PDF/DOCX export |
| `translate_document` | `translate.ts` | Language translation |
| `manage_glossary` | `glossary.ts` | CRUD on project glossary |
| `analyze_update` | `update.ts` | Staleness detection |
| `validate_chain` | `validate-chain.ts` | Full chain cross-ref validation |

## Unresolved Questions

1. What specific "SIER psychology improvements" are targeted? (task description not seen — need clarification from planner)
2. Are there planned new doc types or just behavioral/instruction changes?
3. Does the improvement touch only `generation-instructions.ts` or also validator/templates?
