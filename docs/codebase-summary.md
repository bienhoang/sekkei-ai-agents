# Sekkei Codebase Summary

## Repository Overview

**Sekkei (設計)** v2.0 is a monorepo containing:
- **MCP Server** (TypeScript/40+ files/8,200+ LOC) — AI specification document generation with V-model chain restructure + Phase A + v3 extensions
- **Python Layer** (7 files in cli.py, rest in .venv) — Export & NLP utilities (Excel/PDF/DOCX/matrix)
- **Templates** (22 MD + 15 YAML glossaries) — Japanese specification templates with industry terminology
- **Skills & Adapters** — Claude Code SKILL.md (30+ sub-commands), Cursor, Copilot integration
- **Plans & Docs** — Implementation plans, research reports, documentation

## Project Structure

```
sekkei/
├── packages/
│   ├── mcp-server/                    # Main MCP Server (TypeScript)
│   │   ├── src/
│   │   │   ├── server.ts              # McpServer instance, tool registration
│   │   │   ├── config.ts              # Env var loading
│   │   │   ├── index.ts               # CLI exports
│   │   │   ├── lib/                   # Core business logic
│   │   │   │   ├── errors.ts          # SekkeiError class (typed errors + v3 codes)
│   │   │   │   ├── logger.ts          # Pino structured logging
│   │   │   │   ├── validator.ts       # Document validation (content, cross-refs, v3 structure rules)
│   │   │   │   ├── manifest-manager.ts # Manifest CRUD (_index.yaml)
│   │   │   │   ├── merge-documents.ts # Assemble split docs for export
│   │   │   │   ├── template-loader.ts # Load templates from disk
│   │   │   │   ├── template-resolver.ts # Override dir logic
│   │   │   │   ├── python-bridge.ts   # Execute Python CLI via execFile (7 whitelisted actions)
│   │   │   │   ├── resolve-output-path.ts # Doc type → numbered path mapping
│   │   │   │   ├── structure-validator.ts # Validate numbered directories
│   │   │   │   ├── id-extractor.ts    # Extract F-xxx, REQ-xxx IDs (19 prefixes)
│   │   │   │   ├── generation-instructions.ts # Build AI prompts
│   │   │   │   ├── screen-design-instructions.ts # Screen mockup specifics
│   │   │   │   ├── code-analyzer.ts   # TypeScript AST analysis (v3, 225 LOC)
│   │   │   │   ├── code-context-formatter.ts # Format CodeContext to markdown (v3)
│   │   │   │   ├── staleness-detector.ts # Git diff + scoring (v3, 241 LOC)
│   │   │   │   ├── staleness-formatter.ts # Format staleness report (v3)
│   │   │   │   ├── structure-rules.ts # Anti-chaos rules validation (v3, 271 LOC, 7 rules, 3 presets)
│   │   │   │   ├── google-auth.ts     # Service account auth (v3)
│   │   │   │   ├── google-sheets-exporter.ts # Sheets API export (v3, 186 LOC)
│   │   │   │   ├── rfp-state-machine.ts # RFP state machine, transitions, file rules, workspace CRUD, phase recovery
│   │   │   │   ├── glossary-native.ts # In-process glossary management (Phase A, 153 LOC)
│   │   │   │   ├── confidence-extractor.ts # Extract confidence annotations (Phase A, 59 LOC)
│   │   │   │   ├── traceability-extractor.ts # Extract source traceability (Phase A, 69 LOC)
│   │   │   │   ├── impact-analyzer.ts # Spec change impact analysis (Phase A, 114 LOC)
│   │   │   │   ├── content-sanitizer.ts # Strip internal metadata (Phase A, 29 LOC)
│   │   │   │   ├── mockup-parser.ts   # HTML mockup parsing (Phase A, 85 LOC)
│   │   │   │   ├── mockup-schema.ts   # Mockup schema validation (Phase A, 64 LOC)
│   │   │   │   ├── mockup-html-builder.ts # Convert MD to HTML mockup (Phase A, 89 LOC)
│   │   │   │   ├── mockup-renderer.ts # Render mockup with styling (Phase A, 122 LOC)
│   │   │   │   ├── excel-template-filler.ts # Named-range Excel filling (Phase A, 168 LOC)
│   │   │   │   ├── font-manager.ts    # PDF CJK font support (Phase A, 53 LOC)
│   │   │   │   ├── cross-ref-linker.ts # V-model CHAIN_PAIRS (57 edges), ID extraction, deriveUpstreamIdTypes (v2.1 audit fixes)
│   │   │   │   ├── completeness-rules.ts # Document completeness checks (71 LOC)
│   │   │   │   ├── keigo-validator.ts # Japanese politeness validation (199 LOC)
│   │   │   │   ├── cr-state-machine.ts # CR state machine, YAML persistence, CRUD (180 LOC)
│   │   │   │   ├── cr-propagation.ts  # CR propagation order (upstream + downstream BFS) (55 LOC)
│   │   │   │   ├── cr-backfill.ts     # Upstream backfill suggestion generator (65 LOC)
│   │   │   │   ├── cr-conflict-detector.ts # Parallel CR conflict detection (50 LOC)
│   │   │   │   └── git-committer.ts   # Git commit helper (58 LOC)
│   │   │   ├── tools/                 # MCP Tool Handlers (12 tools)
│   │   │   │   ├── generate.ts        # generate_document tool (+ v3 source_code_path, Phase A confidence/traceability)
│   │   │   │   ├── validate.ts        # validate_document tool (4 modes + v3 structure rules)
│   │   │   │   ├── chain-status.ts    # get_chain_status tool
│   │   │   │   ├── export.ts          # export_document tool (+ v3 gsheet, Phase A read_only mode)
│   │   │   │   ├── get-template.ts    # get_template tool
│   │   │   │   ├── translate.ts       # translate_document tool
│   │   │   │   ├── glossary.ts        # manage_glossary tool (+ native glossary-native.ts)
│   │   │   │   ├── update.ts          # analyze_update tool (+ v3 staleness, Phase A enhanced diff)
│   │   │   │   ├── simulate-impact.ts # simulate_change_impact tool (Phase A)
│   │   │   │   ├── import-document.ts # import_document tool (Phase A)
│   │   │   │   ├── validate-chain.ts  # validate_chain tool (Phase A)
│   │   │   │   ├── rfp-workspace.ts   # manage_rfp_workspace tool (RFP MCP migration)
│   │   │   │   ├── change-request.ts  # manage_change_request tool (schema + dispatch)
│   │   │   │   ├── cr-actions.ts      # CR action handlers (9 actions)
│   │   │   │   └── index.ts           # Tool registration
│   │   │   ├── types/                 # Type Definitions
│   │   │   │   ├── documents.ts       # Core domain types (DocType, ProjectConfig, etc.)
│   │   │   │   ├── change-request.ts  # CR entity types, status enum, propagation types
│   │   │   │   └── manifest-schemas.ts # Zod validation schemas
│   │   │   ├── cli/                   # CLI Commands
│   │   │   │   ├── commands/
│   │   │   │   │   ├── generate.ts    # generate subcommand (+ v3 --source-code arg)
│   │   │   │   │   ├── validate.ts    # validate subcommand (+ v3 --structure-rules)
│   │   │   │   │   ├── export-cmd.ts  # export subcommand (+ v3 gsheet format)
│   │   │   │   │   └── watch.ts       # watch subcommand (NEW v3)
│   │   │   │   └── main.ts            # CLI entry & registration
│   │   │   └── resources/             # MCP Resource Handlers
│   │   │       ├── templates.ts       # Template URI resolution
│   │   │       ├── rfp-instructions.ts # rfp://instructions/{flow} resource (7 flows)
│   │   │       └── index.ts           # Resource registration
│   │   ├── tests/
│   │   │   ├── unit/                  # Unit tests (Jest)
│   │   │   │   ├── validator.test.ts
│   │   │   │   ├── id-extractor.test.ts
│   │   │   │   ├── manifest-manager.test.ts
│   │   │   │   ├── resolve-output-path.test.ts
│   │   │   │   ├── structure-validator.test.ts
│   │   │   │   ├── template-loader.test.ts
│   │   │   │   ├── template-resolver.test.ts
│   │   │   │   ├── validate-tool.test.ts
│   │   │   │   ├── chain-status-tool.test.ts
│   │   │   │   ├── merge-documents.test.ts
│   │   │   │   ├── resources.test.ts
│   │   │   │   ├── tools.test.ts
│   │   │   │   ├── rfp-state-machine.test.ts, rfp-workspace-tool.test.ts (RFP MCP migration)
│   │   │   │   ├── cr-state-machine.test.ts, cr-propagation.test.ts, cr-backfill.test.ts (CR)
│   │   │   │   ├── cr-conflict-detector.test.ts, change-request-tool.test.ts (CR)
│   │   │   │   ├── code-analyzer.test.ts (NEW v3)
│   │   │   │   ├── code-context-formatter.test.ts (NEW v3)
│   │   │   │   ├── staleness-detector.test.ts (NEW v3)
│   │   │   │   ├── staleness-formatter.test.ts (NEW v3)
│   │   │   │   ├── structure-rules.test.ts (NEW v3)
│   │   │   │   └── google-sheets-exporter.test.ts (NEW v3)
│   │   │   ├── fixtures/               # Test data (NEW v3)
│   │   │   │   └── sample-project/     # TypeScript project fixture
│   │   │   │       ├── src/
│   │   │   │       ├── tsconfig.json
│   │   │   │       └── package.json
│   │   │   └── tmp/                   # Temporary test files (auto-cleaned)
│   │   ├── dist/                      # Compiled output (tsc)
│   │   ├── adapters/
│   │   │   ├── claude-code/
│   │   │   │   └── SKILL.md           # Claude Code skill definition
│   │   │   ├── cursor/
│   │   │   │   ├── mcp.json           # Cursor MCP server config
│   │   │   │   └── cursorrules.md     # Cursor-specific instructions
│   │   │   └── copilot/
│   │   │       └── copilot-instructions.md # Copilot-specific instructions
│   │   ├── bin/
│   │   │   ├── init.js                # Interactive project setup (auto-installs deps)
│   │   │   └── setup.js               # Setup script for adapters
│   │   ├── python/                    # Export & NLP Layer (Python)
│   │   │   ├── cli.py                 # Entry point (SEKKEI_INPUT env var)
│   │   │   ├── export/
│   │   │   │   ├── excel_exporter.py  # openpyxl-based Excel generation
│   │   │   │   ├── pdf_exporter.py    # WeasyPrint-based PDF generation
│   │   │   │   ├── docx_exporter.py   # DOCX export (optional)
│   │   │   │   ├── matrix_exporter.py # Matrix table styling
│   │   │   │   ├── shared_styles.py   # Common styling
│   │   │   │   └── __init__.py
│   │   │   ├── nlp/
│   │   │   │   ├── diff_analyzer.py   # Version comparison (enhanced with line-level diffs)
│   │   │   │   └── __init__.py
│   │   │   ├── templates/
│   │   │   │   └── __init__.py
│   │   │   ├── requirements.txt       # Dependencies: openpyxl, weasyprint, mistune, pyyaml
│   │   │   └── __init__.py
│   │   ├── package.json               # npm dependencies
│   │   ├── tsconfig.json              # TypeScript config
│   │   ├── jest.config.cjs            # Jest test config (ESM)
│   │   └── CLAUDE.md                  # Development guidelines
│   └── skills/
│       └── sekkei/                    # Claude Code Skill
│           ├── SKILL.md               # Skill definition (30+ sub-commands)
│           └── references/ (6 files)
│               ├── doc-standards.md, v-model-guide.md
│               ├── rfp-loop.md, plan-orchestrator.md, rfp-manager.md, rfp-command.md
├── templates/                     # Specification Templates (22 MD + 15 YAML)
│   ├── ja/                        # Japanese templates (22 files)
│   │   ├── basic-design.md        # Basic design (split)
│   │   ├── crud-matrix.md         # CRUD matrix
│   │   ├── decision-record.md     # 設計決定記録 ADRs (Phase A)
│   │   ├── detail-design.md       # Detail design (split by feature)
│   │   ├── functions-list.md      # Feature/function catalog
│   │   ├── interface-spec.md      # インターフェース仕様書 (Phase A)
│   │   ├── it-spec.md             # Integration test specification (v2.0)
│   │   ├── meeting-minutes.md     # 議事録 meeting records (Phase A)
│   │   ├── migration-design.md    # Data/migration design
│   │   ├── nfr.md                 # Non-functional requirements (v2.0)
│   │   ├── operation-design.md    # Operation procedures
│   │   ├── project-plan.md        # Project plan (v2.0)
│   │   ├── requirements.md        # Requirements specification
│   │   ├── screen-design.md       # Screen design/mockups
│   │   ├── security-design.md     # Security design (v2.0)
│   │   ├── sitemap.md             # Site map (v2.0)
│   │   ├── st-spec.md             # System test specification (v2.0)
│   │   ├── test-evidence.md       # Test evidence collection (Phase A)
│   │   ├── test-plan.md           # Test plan (v2.0)
│   │   ├── traceability-matrix.md # Traceability matrix
│   │   ├── uat-spec.md            # UAT specification (v2.0)
│   │   └── ut-spec.md             # Unit test specification (v2.0)
│   ├── shared/                    # Language-neutral templates (4 files)
│   │   ├── cover-page.md          # Cover page
│   │   ├── feature-index.md       # Feature index
│   │   ├── section-index.md       # Section index / table of contents
│   │   └── update-history.md      # Update history
│   ├── rfp/                       # RFP instruction templates (7 MD: flow-analyze, flow-questions, flow-draft, flow-impact, flow-proposal, flow-freeze, routing)
│   └── glossaries/                # Domain-specific glossaries (15 YAML)
│       ├── finance.yaml, manufacturing.yaml, medical.yaml, real-estate.yaml
│       ├── logistics.yaml, retail.yaml, construction.yaml, education.yaml
│       ├── government.yaml, telecom.yaml, insurance.yaml, energy.yaml
│       ├── automotive.yaml, food-service.yaml, common.yaml
├── CLAUDE.md                      # Monorepo project guidelines
├── ROADMAP.md                     # Project roadmap
├── README.md                      # Main documentation
├── refactor-1.md                  # Refactor notes (v2 numbered structure)
└── sekkei.config.example.yaml     # Example project config
```

## Phase 3: Intelligence Layer Modules (NEW v3)

### Code-Aware Generation

#### `src/lib/code-analyzer.ts` (225 lines)
TypeScript AST analysis via ts-morph (dynamic import, optional peer dep):
- Extracts classes, interfaces, functions, endpoints (decorators), entities
- `MAX_FILES=100`, `10s timeout`, handles large codebases safely
- Output: CodeContext with structured metadata for AI generation

#### `src/lib/code-context-formatter.ts` (90 lines)
Formats CodeContext to markdown tables for prompt injection:
- Converts code metadata to readable tables
- Useful for AI guidance in detail-design/test-spec generation

### Specification Health

#### `src/lib/staleness-detector.ts` (241 lines)
Git-based staleness scoring:
- Analyzes commits against `feature_file_map` in config
- Scoring: `clamp(daysSince/90)*40 + clamp(files/10)*30 + clamp(lines/500)*30`
- Output: StalenessReport with STALE/WARN/OK status per feature

#### `src/lib/staleness-formatter.ts` (49 lines)
Markdown table output for staleness reports with status labels.

### Anti-Chaos Validation

#### `src/lib/structure-rules.ts` (271 lines)
Structural validation with 7 built-in rules & 3 presets:
1. Max nesting depth (enterprise: 4, standard: 6, agile: 8)
2. Max files per directory
3. Required section presence
4. File naming consistency
5. Cross-reference completeness
6. Code metrics (lines per function, cyclomatic complexity)
7. Documentation coverage

#### Google Sheets Export

#### `src/lib/google-sheets-exporter.ts` (186 lines)
Export markdown tables to Google Sheets:
- `parseMarkdownTables()` — Extract table data
- `exportToGoogleSheets()` — Write via Sheets API
- Formatting: bold headers, auto-resized columns, folder move

#### `src/lib/google-auth.ts` (41 lines)
Service account authentication (dynamic google-auth-library import).

### CLI Commands

#### `src/cli/commands/watch.ts` (48 lines — v3)
`sekkei watch` command for continuous monitoring:
- Flags: `--config`, `--since`, `--threshold`, `--ci`
- Polls for git changes, detects staleness, validates structure rules
- Supports CI mode (exit codes on violations)

#### `src/cli/commands/version.ts` (28 lines — NEW)
`sekkei version` command with health check:
- Shows package version + detailed environment report
- Checks: Node.js, Python, Playwright, templates, config, venv, skill, MCP, commands
- Flag: `--json` outputs structured report
- Exit code 1 if any check fails

#### `src/cli/commands/uninstall.ts` (82 lines — NEW)
`sekkei uninstall` removes all Claude Code integration:
- Removes skill directory, command symlinks, command stubs, MCP entry
- Prompts for confirmation (skip with `--force`)
- Safe: keeps package, build artifacts, Python venv

#### `src/cli/commands/update.ts` (154 lines — NEW)
`sekkei update` rebuilds and reinstalls:
- (1) npm build (unless `--skip-build`)
- (2) Copy skill files from `packages/skills/content`
- (3) Regenerate 20 sub-command stubs in `~/.claude/commands/sekkei/`
- (4) Update MCP entry in `~/.claude/settings.json`
- (5) Run health check

#### `src/cli/commands/health-check.ts` (212 lines — NEW)
Shared health check module (used by version + update commands):
- `checkHealth()` — returns structured report
- `formatHealthReport()` — formats for human output
- 9 checks: Node.js, Python, Playwright, templates, config, venv, skill, MCP, commands

#### `bin/init.js` & `init/` Submodules (Interactive Setup)
`npx sekkei init` wizard (replaces old `/sekkei:init` skill command):
- Entry: bin/init.js (187 LOC)
- Submodules: init/i18n.js (214 LOC), init/prompts.js (193 LOC), init/options.js (169 LOC), init/deps.js (92 LOC)
- Multi-language wizard (en/ja/vi), auto-installs Python venv + Playwright, generates `sekkei.config.yaml`
- Supports `--preset` and `--skip-deps` flags

#### `src/cli/commands/migrate.ts` (NEW v2.1)
`sekkei migrate` CLI command for config schema migration:
- Migrates YAML config underscore keys (functions_list, test_spec) to hyphen format (functions-list, test-spec)
- Removes old underscore keys after migration (key cleanup)
- Warns user about YAML comment loss during round-trip
- Manual invocation only (not auto-run during init/update)

## Phase 2.1: V-Model Chain Audit Fixes (NEW)

**Date:** 2026-02-24 | **Status:** Complete | **Test Suite:** 556/556 pass

### Chain Topology Improvements

**New CHAIN_PAIRS (57 total, +4 from v2.0):**
- `["nfr", "basic-design"]` — NFR requirements shape system architecture
- `["basic-design", "screen-design"]` — Screen design is downstream of basic design
- `["basic-design", "interface-spec"]` — Interface spec depends on basic design
- `["requirements", "interface-spec"]` — Interface spec also depends on requirements
- `["functions-list", "test-plan"]` — Function inventory feeds test scope estimation

**Note:** Removed self-referential `["screen-design", "screen-design"]` to maintain DAG correctness.

**Updated CHAIN_DISPLAY_ORDER:**
- Added `test_evidence`, `meeting_minutes`, `decision_record` to supplementary group
- These doc types now visible in `chain_status` tool output

### ID System Unification

**`deriveUpstreamIdTypes` function (NEW):**
- Replaces hand-maintained `UPSTREAM_ID_TYPES` constant
- Derives upstream ID prefixes directly from `CHAIN_PAIRS`
- Automatically adds 17 new cross-ref validation rules for test specs and supplementary docs

**Unified ID extraction:**
- `extractIds()` — standard ID patterns (F-, REQ-, API-, etc.)
- `extractAllIds()` — includes custom ID prefixes via CUSTOM_ID_PATTERN
- Both used consistently across validator, CR propagation, and staleness detection

### Plan Management & CR Propagation Fixes

**Plan action improvements:**
- Fixed `handleList` plan_id generation (uses directory names, not timestamp-based IDs)
- Fixed `handlePlanAction` undefined phase_key edge case
- Added phase sorting for deterministic plan iteration

**CR propagation safety:**
- Added `MAX_PROPAGATION_STEPS=20` guard to prevent runaway propagation
- Fixed `propagate_next` bounds check before array access

### Staleness Detection Enhancement

**Split-document staleness fix:**
- `checkDocStaleness` now detects split-mode docs via `features_output` presence
- Correctly identifies stale basic-design and detail-design variants
- Applied to both `checkChainStaleness` and `checkDocStaleness` paths

### Configuration Management

**Auto-validate option (NEW):**
- `autoValidate` config flag triggers staleness advisory after generation
- Lightweight non-blocking validation (staleness only, not full content validation)
- Prevents chain inconsistencies without circular tool invocation

**Config migration (`migrateConfigKeys`):**
- Handles underscore→hyphen key transitions in YAML configs
- Cleans up old underscore keys after migration
- Called via `sekkei migrate` CLI command (manual, explicit)

## Key Files & Modules

### Core TypeScript Files

#### `src/server.ts` (Main Entry)
- Initializes McpServer with STDIO transport
- Registers all 13 MCP tools (8 core + 2 Phase A + 1 v3 + 1 RFP + 1 CR)
- Registers resource handlers (template URIs + rfp://instructions/{flow})
- Configures logging to stderr

#### `src/lib/manifest-manager.ts`
Manages split document metadata in `_index.yaml`:
- `readManifest()` — Parse and validate manifest
- `writeManifest()` — Write manifest to disk
- `addDocument()` — Add/update document entry
- `addFeature()` — Add feature to split document
- `getMergeOrder()` — Get ordered file list for export
- `createTranslationManifest()` — Create translation variant

#### `src/lib/validator.ts`
Document validation engine:
- `validateDocument()` — Content validation (sections, IDs, tables)
- `validateSplitDocument()` — Manifest-based validation (per-file + aggregate)
- `extractIds()` — Extract cross-reference IDs
- Validation modes: content, manifest, structure

#### `src/lib/structure-validator.ts`
Checks numbered directory layout:
- Requires files: `04-functions-list.md`, `10-glossary.md`
- Requires dirs: `01-rfp/`, `02-requirements/`, `03-system/`, `05-features/`, `06-data/`, `07-operations/`, `08-test/`, `09-ui/`
- Validates feature folders use kebab-case
- Rejects version suffixes (old, copy, v1) and non-ASCII names

#### `src/lib/resolve-output-path.ts`
Pure function mapping doc types to numbered paths:
```
requirements → 02-requirements/requirements.md
basic-design + shared → 03-system/
basic-design + feature=sales → 05-features/sales-management/basic-design.md
```

#### `src/lib/template-resolver.ts`
Template resolution logic:
1. Check `SEKKEI_TEMPLATE_OVERRIDE_DIR` (with validation)
2. Fall back to default `templates/{lang}/{doc-type}.md`
3. Return `TemplateData` (metadata + content)

#### `src/lib/python-bridge.ts`
Execute Python CLI via Node.js:
```typescript
execFile(pythonPath, ["cli.py"], {
  env: { SEKKEI_INPUT: JSON.stringify(payload) },
  maxBuffer: 100 * 1024 * 1024,
})
```
7 actions whitelisted: `export-excel`, `export-pdf`, `export-docx`, `export-matrix`, `glossary`, `diff`, `import-excel`.

#### `src/lib/id-extractor.ts`
Extract cross-reference IDs by pattern:
- F-xxx (functions-list)
- REQ-xxx (requirements)
- SCR-xxx (screens), TBL-xxx (tables)
- API-xxx (APIs), CLS-xxx (classes)
- UT/IT/ST/UAT-xxx (test specs)

#### `src/tools/generate.ts`
Generate document tool:
- Input: doc_type, input_content, project_name, language
- Load template via resolver
- Build AI instructions with context
- Suggest output path via `resolveOutputPath()`
- Return template + instructions

#### `src/tools/validate.ts`
Validate document tool:
- **Content mode:** `validate_document(content, doc_type, upstream_content)`
- **Manifest mode:** `validate_document(manifest_path, doc_type)`
- **Structure mode:** `validate_document(structure_path)` — validates numbered dirs
- Return detailed issue report

#### `src/tools/chain-status.ts`
Get document chain progress:
- Reads `sekkei.config.yaml`
- Returns markdown table with status
- Shows per-feature status if features defined
- Icons: ✅ complete, 🔄 in-progress, ⏳ pending, 📄 provided

#### `src/tools/export.ts`
Export document tool:
- Input: manifest_path, format (excel/pdf), output_path
- Validate manifest and files exist
- Get merge order from manifest
- Read files from disk
- Call Python bridge
- Return export result

### Config Migration (`src/lib/config-migrator.ts`)

Pure function to migrate v1 configs to v2.0 format:
- Removes deprecated `overview` from chain
- Splits `test_spec` into `ut_spec`, `it_spec`, `st_spec`, `uat_spec`
- Adds new entries: `nfr`, `project_plan`, `security_design`, `test_plan`
- Migrates requirement paths: `02-requirements.md` → `02-requirements/requirements.md`
- Idempotent: safe to run multiple times
- Called automatically during config load if needed

### Python Files

#### `python/cli.py`
Entry point for Python utilities:
- Validates `SEKKEI_INPUT` env var (JSON)
- Routes to appropriate exporter/analyzer
- Whitelisted actions: `export-excel`, `export-pdf`, `export-docx`, `export-matrix`, `glossary`, `diff`, `import-excel`
- Error handling with structured output

#### `python/export/excel_exporter.py`
Generate Excel workbooks:
- openpyxl-based implementation
- Table formatting (headers, alternating row colors)
- Hyperlink support (cross-references)
- Multi-sheet layout

#### `python/export/pdf_exporter.py`
Generate PDF documents:
- WeasyPrint-based implementation
- CSS styling support
- Page breaks at section boundaries
- Header/footer with project info

#### `python/nlp/diff_analyzer.py`
Version comparison:
- Identify added/removed/modified sections
- Cross-reference change impact
- Generate changelog

### Template Files

#### `templates/ja/basic-design.md`
System architecture & design:
- System architecture diagram
- Database design (ER diagram)
- External interface specifications
- Non-functional requirements
- Technology rationale

#### `templates/shared/feature-index.md`
Feature listing for per-feature specs (new in v2):
- Feature overview table
- Navigation to per-feature sections
- Status indicators

#### `templates/shared/section-index.md`
Table of contents template (new in v2):
- Document index with links
- Navigation structure

## Type System

### Core Types (`types/documents.ts`)

```typescript
// Document types
export const DOC_TYPES = [
  // Requirements phase
  "requirements", "nfr", "functions-list", "project-plan",
  // Design phase
  "basic-design", "security-design", "detail-design",
  // Test phase
  "test-plan", "ut-spec", "it-spec", "st-spec", "uat-spec",
  // Supplementary
  "crud-matrix", "traceability-matrix", "operation-design", "migration-design",
  "sitemap", "test-evidence", "meeting-minutes", "decision-record",
  "interface-spec", "screen-design",
] as const;

// Feature configuration
export interface FeatureConfig {
  id: string;           // "SAL"
  name: string;         // "sales-management" (kebab-case)
  display: string;      // "販売管理" (human label)
}

// Project configuration
export interface ProjectConfig {
  project: { name, type, stack, team_size, language, keigo, industry? };
  output: { directory };
  chain: {
    rfp: string;
    functions_list: ChainEntry;
    requirements: ChainEntry;
    nfr: ChainEntry;
    project_plan: ChainEntry;
    basic_design: SplitChainEntry;
    security_design: ChainEntry;
    detail_design: SplitChainEntry;
    test_plan: ChainEntry;
    ut_spec?: ChainEntry;
    it_spec?: ChainEntry;
    st_spec: ChainEntry;
    uat_spec: ChainEntry;
    operation_design?: ChainEntry;
    migration_design?: ChainEntry;
    glossary?: ChainEntry;
  };
  features?: FeatureConfig[];
}

// Document manifests
export interface ManifestFeatureEntry {
  name: string;    // kebab-case folder name
  display: string; // human label
  file: string;    // path to generated file
}

export interface SplitDocument {
  type: "split";
  status: "pending" | "in-progress" | "complete";
  shared: ManifestSharedEntry[];
  features: ManifestFeatureEntry[];
  merge_order: ("shared" | "features")[];
}
```

## Data Flow

### Document Generation Pipeline

```
Client Request
  ↓
generate_document(doc_type, input_content, project_name, language)
  ↓
Server: Load Template
  ├─ Template Resolver
  │  ├─ Check SEKKEI_TEMPLATE_OVERRIDE_DIR
  │  └─ Fall back to templates/{lang}/{doc-type}.md
  └─ Load TemplateData (metadata + content)
  ↓
Server: Resolve Output Path
  └─ resolveOutputPath(doc_type, scope, featureName)
     ├─ 02-requirements/
     ├─ 03-system/
     ├─ 05-features/{name}/
     └─ etc.
  ↓
Server: Build Generation Instructions
  ├─ Template structure
  ├─ Upstream document context
  ├─ Cross-reference patterns
  └─ Output path hint
  ↓
Response to Client
  ├─ Template content
  ├─ Generation instructions
  └─ Suggested output path
```

### Document Validation Pipeline

**Content Mode:**
```
Input: Markdown content + doc_type
  ↓
Extract required sections
  ↓
Extract cross-reference IDs
  ↓
Validate against upstream (if provided)
  ↓
Report: issues, missing IDs, orphaned IDs
```

**Manifest Mode:**
```
Input: manifest_path + doc_type
  ↓
Read & validate manifest YAML
  ↓
For each shared/feature file:
  └─ Read file, validate content
  ↓
Check per-file + aggregate issues
  ↓
Validate cross-references across files
  ↓
Report: detailed issues per file
```

**Structure Mode:**
```
Input: output directory path
  ↓
Check required files exist (04-, 10-)
  ↓
Check required directories exist (03-system, 05-features, etc.)
  ↓
Check feature folders are kebab-case
  ↓
Check for version suffixes (old, copy, v1)
  ↓
Report: errors + warnings
```

## Configuration

### Project Config (`sekkei.config.yaml`)

```yaml
project:
  name: "Project Name"
  type: web                           # web, mobile, api, desktop, saas, batch
  stack: [TypeScript, React, Node.js]
  team_size: 5
  language: ja                        # ja, en, vi
  keigo: 丁寧語                        # 丁寧語, 謙譲語, simple
  industry: "Manufacturing"

output:
  directory: ./output

chain:
  rfp: rfp.md                         # Input RFP file
  functions_list: { status: pending }
  requirements: { status: pending }
  nfr: { status: pending }
  project_plan: { status: pending }
  basic_design:
    status: pending
    system_output: "03-system/"
    features_output: "05-features/"
  security_design: { status: pending }
  detail_design:
    status: pending
    features_output: "05-features/"
  test_plan: { status: pending }
  ut_spec:
    status: pending
    global_output: "08-test/"
    features_output: "05-features/"
  it_spec:
    status: pending
    global_output: "08-test/"
    features_output: "05-features/"
  st_spec: { status: pending }
  uat_spec: { status: pending }
  glossary: { status: pending }

features:
  - id: SAL
    name: sales-management
    display: "販売管理"
  - id: INV
    name: inventory-management
    display: "在庫管理"

# NEW (Phase A): SIer Psychology Configuration
approval_chain:
  basic_design:
    - reviewer: "Design Lead"
    - approver: "Project Manager"
  test_spec:
    - reviewer: "QA Lead"

ui_mode: "power"                 # simple (Excel-like) or power (markdown + automation)
learning_mode: true              # annotate docs with standard explanations
```

## Build & Test

### Build Commands

```bash
npm run build        # tsc (compile TypeScript)
npm run lint         # tsc --noEmit (type check)
npm run dev          # tsx (hot reload)
npm test             # Jest with ESM support
npm run test:unit    # Unit tests only
```

### Dependencies

**TypeScript:**
- @modelcontextprotocol/sdk
- zod
- yaml
- pino
- marked

**Python:**
- openpyxl (Excel)
- weasyprint (PDF)
- mistune (Markdown)
- pyyaml
- jinja2 (optional)

## Recent Changes (v2.0 — V-Model Chain Restructure + v2.1 Audit Fixes)

### DOC_TYPES Changes (22 types)

**Removed:** `overview`, `test-spec`
**Added:** `nfr`, `security-design`, `project-plan`, `test-plan`, `ut-spec`, `it-spec`, `st-spec`, `uat-spec`

**v2.1 Status:** All 22 types now fully integrated into CHAIN_PAIRS and CHAIN_DISPLAY_ORDER (screen-design, interface-spec, and meta-docs now visible in chain validation)

```typescript
// v2.0 DOC_TYPES
"requirements", "nfr", "functions-list", "project-plan",
"basic-design", "security-design", "detail-design",
"test-plan", "ut-spec", "it-spec", "st-spec", "uat-spec",
"crud-matrix", "traceability-matrix", "operation-design", "migration-design",
"sitemap", "test-evidence", "meeting-minutes", "decision-record",
"interface-spec", "screen-design"
```

### Phase Grouping (NEW)

Four phases organizing document types:
- **requirements** — requirements, nfr, functions-list, project-plan
- **design** — basic-design, security-design, detail-design
- **test** — test-plan, ut-spec, it-spec, st-spec, uat-spec
- **supplementary** — all others (matrices, evidence, decisions, etc.)

**Types:** `PHASES`, `Phase`, `PHASE_MAP`, `PHASE_LABELS`

### V-Model Chain Structure (v2.0 + v2.1 Audit Fixes)

```
RFP → requirements → nfr/functions-list/project-plan/interface-spec
  → basic-design ← nfr
    → security-design/detail-design/screen-design/interface-spec
  → test-plan ← functions-list
    → ut-spec/it-spec/st-spec/uat-spec
```

**v2.1 improvements:**
- Added `nfr → basic-design` (NFR shapes system architecture)
- Added `basic-design → screen-design`, `basic-design → interface-spec` (supplementary doc integration)
- Added `requirements → interface-spec` (interface spec depends on requirements too)
- Added `functions-list → test-plan` (function inventory feeds test scope)
- Total CHAIN_PAIRS: 57 edges (was 53)
- Branching after requirements (4 parallel paths) and design (3 parallel)

### Output Directory Structure (UPDATED)

```
01-rfp/                          # RFP workspace (optional)
  └── <project-name>/
      ├── 00_status.md           # Phase status (YAML)
      ├── 01_raw_rfp.md          # Original RFP (append-only)
      ├── 02_analysis.md         # Analysis output
      ├── 03_questions.md        # Q&A for client
      ├── 04_client_answers.md   # Client responses (append-only)
      ├── 05_proposal.md         # Proposal draft
      ├── 06_scope_freeze.md     # Scope freeze checklist
      └── 07_decisions.md        # Decision log (append-only)
02-requirements/
  ├── requirements.md (requirements)
  ├── nfr.md (nfr)
  └── project-plan.md (project-plan)
03-system/
  ├── basic-design.md (basic-design shared)
  ├── security-design.md (security-design)
  └── [other system docs]
05-features/
  └── {feature}/
      ├── basic-design.md
      ├── detail-design.md
      └── [other feature docs]
08-test/
  ├── test-plan.md (test-plan)
  ├── ut-spec.md (ut-spec)
  ├── it-spec.md (it-spec)
  ├── st-spec.md (st-spec)
  ├── uat-spec.md (uat-spec)
  └── [other test docs]
04-functions-list.md (functions-list — standalone)
10-glossary.md (glossary — standalone)
```

### Split Document Types (UPDATED)

Only `basic-design` and `detail-design` are split (feature-based).
Other doc types are single-file (may be grouped in directories).

### Cross-Reference ID Validation (UPDATED)

V-model symmetric: test specs validate against upstream test-plan, which validates against design specs.

**New test-level IDs:**
- `UT-xxx` (unit tests) — symmetric to `detail-design`
- `IT-xxx` (integration tests) — symmetric to `detail-design`
- `ST-xxx` (system tests) — symmetric to `basic-design` + `detail-design`
- `UAT-xxx` (acceptance tests) — symmetric to `requirements`

### Config Migration Tool (`config-migrator.ts`)

Auto-migrate v1 configs to v2.0:
```bash
# Automatic during config load if needed
# Or manual: use exported migrateConfig() function
```

**Changes applied:**
- Removes `overview`
- Splits `test_spec` into 4 test specs
- Adds new requirements doc entries
- Adds security-design, test-plan
- Normalizes paths to v2.0 structure

## Phase A: SIer Psychology-Driven Features (NEW)

### New Document Types (5 types + 5 ID prefixes)

1. **test-evidence** (EV-xxx) — テストエビデンス
   - Template: `templates/ja/test-evidence.md`
   - Tool: generate_document with `doc_type: "test-evidence"`
   - Output path: `08-test/evidence/`

2. **meeting-minutes** (MTG-xxx) — 議事録 (meeting minutes/decisions)
   - Template: `templates/ja/meeting-minutes.md`
   - Supports: decision tracking, linking to affected documents
   - Output path: `meeting-minutes.md`

3. **decision-record** (ADR-xxx) — 設計決定記録 (Architecture Decision Records)
   - Template: `templates/ja/decision-record.md`
   - Combats 属人化 (knowledge silos) with structured context, options, consequences
   - Output path: `decision-records.md`

4. **interface-spec** (IF-xxx) — インターフェース仕様書 (Interface Specifications)
   - Template: `templates/ja/interface-spec.md`
   - Multi-vendor coordination support
   - Output path: `interface-spec.md`

5. **screen-design** (PG-xxx) — 画面設計書 (Screen Design/Mockups)
   - Template: `templates/ja/screen-design.md`
   - Reduces Excel方眼紙 formatting time
   - Output path: `09-ui/screen-design.md`

### New MCP Tools (2 tools)

1. **simulate_change_impact** (tools/simulate-impact.ts)
   - Impact graph visualization for specification changes
   - Cascade analysis: what breaks when one doc changes?
   - Input: doc ID, change type (section added/removed/modified)
   - Output: ImpactGraph with affected docs, priority, risk

2. **import_document** (tools/import-document.ts)
   - Reverse migration: Excel/Markdown → Sekkei
   - Auto-detection of document structure
   - Python bridge: `python/cli.py` (import-excel action)

### Enhanced Tool Parameters

- **generate_document**:
  - `include_confidence` — add AI confidence scores (高/中/低)
  - `include_traceability` — add source citations ("この記述は{DOC}-{ID}に基づく")
  - `ticket_ids` — link to change request IDs

- **export_document**:
  - `read_only` param — strip internal metadata for client-safe exports via `content-sanitizer.ts`

### New Core Libraries (4 modules)

1. **confidence-extractor.ts** — Extract AI confidence scores per section
   - Function: `extractConfidenceScores(content: string): SectionConfidence[]`
   - Levels: high (信頼度高), medium (信頼度中), low (信頼度低)

2. **traceability-extractor.ts** — Generate source traceability
   - Function: `generateTraceability(content: string, context: TraceabilityContext): TraceabilityMap`
   - Format: "この記述は{DOC_TYPE}-{ID}に基づく"

3. **content-sanitizer.ts** — Strip internal metadata
   - Function: `sanitizeForClient(content: string): string`
   - Removes: confidence scores, internal notes, AI markers
   - Preserves: cross-references, structure, technical content

4. **impact-analyzer.ts** — Spec change cascade analysis
   - Function: `simulateChangeImpact(config: ProjectConfig, change: DocChange): ImpactGraph`
   - Output: affected documents, dependency levels, update priority

### New Configuration Fields (Phase A)

```yaml
approval_chain:                  # Approval workflows per doc type
ui_mode: "power"                # "simple" or "power" (markdown + automation)
learning_mode: true             # Annotate docs with standard explanations
```

### Enhanced diff_analyzer.py (Phase A)
- Granular line-by-line change tracking
- 朱書き (red character) marks for visual diffs

## Summary Statistics

- **Total Files:** 140+ files (38+ TS src, Python, 26+ templates, 15 glossaries, adapters, skills, docs)
- **TypeScript Files:** 38+ source files in src/ — MCP server, tools, libraries
- **Templates:** ja/22 + shared/4 + rfp/7 + 15 YAML glossaries + 3 presets
- **Tests:** 22+ unit test files | **Adapters:** SKILL.md, Cursor, Copilot
- **MCP Tools:** 13 (8 core + 2 Phase A + 1 v3 + 1 RFP + 1 CR)
- **MCP Resources:** template:// URIs + rfp://instructions/{flow} (7 flows)

## Development & Deployment

**Workflow:** `npm run dev` (hot reload), `npm run lint` (type check), `npm run build` (compile), `npm test` (Jest)

**Runtime:** Node.js 20+ (ESM), Python 3.8+, STDIO transport (JSON-RPC 2.0 on stdout, logs on stderr)

**Setup:** `npm install`, `pip install -r python/requirements.txt`, `npx sekkei init` (auto-installs adapters)
