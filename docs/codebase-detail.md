# Sekkei Codebase - Detailed Modules & Architecture

Cross-reference: See [codebase-summary.md](./codebase-summary.md) for repository overview and project structure.

## Generation Optimization (NEW v2.8.0)

### Token Budget Estimation

**File:** `src/lib/token-budget-estimator.ts` (119 LOC)

Predicts output token count from entity counts and recommends generation strategy before execution:

**Estimation Model:**
```
estimated_tokens = base_tokens + Σ(entity_count × per_entity_weight)
```

**Calibration by Document Type:**
- `requirements`: base 2000, F=500, REQ=300
- `functions-list`: base 1500, F=300, SCR=150
- `basic-design`: base 3000, SCR=800, TBL=600, API=500
- `detail-design`: base 2000, TBL=400, API=1200, CLS=800
- `test-specs`: base 1500-2000, with per-spec calibration

**Generation Strategies:**
- `single-call` (<16K tokens): Single-call generation, fast iteration
- `progressive` (16K-24K tokens): Multi-stage generation for medium-large docs
- `plan_required` (>24K tokens): Per-feature generation mandatory (automatic when functions-list exists)

**Used by:** `generate.ts` (advisory display), `plan-actions.ts` (strategy selection)

### Smart Upstream Content Filtering

**File:** `src/lib/upstream-filter.ts` (140 LOC)

Reduces context size by extracting only feature-relevant upstream content:

**2-Stage Algorithm:**
1. **Heading-based matching:** Splits markdown by h2 headings, matches against feature ID/name
2. **ID-based fallback:** Scans for feature-specific F-xxx IDs if no heading matches

**Reduction metrics:** Typically 60-75% context reduction per feature.

**Session Recovery:** Enhanced plan YAML with section-level status:
```yaml
phases:
  - phase_number: 2
    sections:
      - section_key: "basic-design-sales"
        status: "completed"
        checkpoint: {...}
```

Allows resuming interrupted generations from section-level granularity.

## Phase 3: Intelligence Layer Modules (v3)

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

#### `src/cli/commands/init.ts` (35 lines)
`sekkei init` — delegates to interactive init wizard (`bin/init.js`):
- Flags: `--skip-deps`, `--preset`

#### `src/cli/commands/version.ts` (28 lines)
`sekkei version` (shortcut: `sekkei -v`) command with health check:
- Shows package version + environment report (Packages, Environment, Claude Code sections)
- Flag: `--json` outputs full structured report including paths
- Exit code 1 if any check fails

#### `src/cli/commands/uninstall.ts` (82 lines — NEW)
`sekkei uninstall` removes all Claude Code integration:
- Removes skill directory, command symlinks, command stubs, MCP entry
- Prompts for confirmation (skip with `--force`)
- Safe: keeps package, build artifacts, Python venv

#### `src/cli/commands/update.ts`
`sekkei update` (shortcut: `sekkei -u`) rebuilds and reinstalls:
- (1) npm build (unless `--skip-build`)
- (2) Copy skill files from `packages/skills/content`
- (3) Regenerate sub-command stubs in `~/.claude/commands/sekkei/`
- (4) Update MCP entry via `claude mcp add-json -s user`
- (5) Run health check

#### `src/cli/commands/health-check.ts` (212 lines — NEW)
Shared health check module (used by version + update commands):
- `checkHealth()` — returns structured report
- `formatHealthReport()` — formats for human output
- 9 checks: Node.js, Python, Playwright, templates, config, venv, skill, MCP, commands

#### `bin/init.js` & `init/` Submodules (Interactive Setup)
`npx sekkei init` interactive wizard:
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

**Per-feature document staleness fix:**
- `checkDocStaleness` now detects per-feature docs via `features_output` presence
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

## Core TypeScript Files

### `src/server.ts` (Main Entry)
- Initializes McpServer with STDIO transport
- Registers all 13 MCP tools (8 core + 2 Phase A + 1 v3 + 1 RFP + 1 CR)
- Registers resource handlers (template URIs + rfp://instructions/{flow})
- Configures logging to stderr

### `src/lib/manifest-manager.ts`
Manages per-feature document metadata in `_index.yaml`:
- `readManifest()` — Parse and validate manifest
- `writeManifest()` — Write manifest to disk
- `addDocument()` — Add/update document entry
- `addFeature()` — Add feature to per-feature document
- `getMergeOrder()` — Get ordered file list for export
- `createTranslationManifest()` — Create translation variant

### `src/lib/validator.ts`
Document validation engine:
- `validateDocument()` — Content validation (sections, IDs, tables)
- `validatePerFeatureDocument()` — Manifest-based validation (per-file + aggregate)
- `extractIds()` — Extract cross-reference IDs
- Validation modes: content, manifest, structure

### `src/lib/structure-validator.ts`
Checks numbered directory layout:
- Requires files: `04-functions-list.md`, `10-glossary.md`
- Requires dirs: `01-rfp/`, `02-requirements/`, `03-system/`, `05-features/`, `06-data/`, `07-operations/`, `08-test/`, `09-ui/`
- Validates feature folders use kebab-case
- Rejects version suffixes (old, copy, v1) and non-ASCII names

### `src/lib/resolve-output-path.ts`
Pure function mapping doc types to numbered paths:
```
requirements → 02-requirements/requirements.md
basic-design + shared → 03-system/
basic-design + feature=sales → 05-features/sales-management/basic-design.md
```

### `src/lib/template-resolver.ts`
Template resolution logic:
1. Check `SEKKEI_TEMPLATE_OVERRIDE_DIR` (with validation)
2. Fall back to default `templates/{lang}/{doc-type}.md`
3. Return `TemplateData` (metadata + content)

### `src/lib/python-bridge.ts`
Execute Python CLI via Node.js:
```typescript
execFile(pythonPath, ["cli.py"], {
  env: { SEKKEI_INPUT: JSON.stringify(payload) },
  maxBuffer: 100 * 1024 * 1024,
})
```
7 actions whitelisted: `export-excel`, `export-pdf`, `export-docx`, `export-matrix`, `glossary`, `diff`, `import-excel`.

### `src/lib/id-extractor.ts`
Extract cross-reference IDs by pattern:
- F-xxx (functions-list)
- REQ-xxx (requirements)
- SCR-xxx (screens), TBL-xxx (tables)
- API-xxx (APIs), CLS-xxx (classes)
- UT/IT/ST/UAT-xxx (test specs)

### `src/tools/generate.ts`
Generate document tool:
- Input: doc_type, input_content, project_name, language
- Load template via resolver
- Build AI instructions with context
- Suggest output path via `resolveOutputPath()`
- Return template + instructions

### `src/tools/validate.ts`
Validate document tool:
- **Content mode:** `validate_document(content, doc_type, upstream_content)`
- **Manifest mode:** `validate_document(manifest_path, doc_type)`
- **Structure mode:** `validate_document(structure_path)` — validates numbered dirs
- Return detailed issue report

### `src/tools/chain-status.ts`
Get document chain progress:
- Reads `sekkei.config.yaml`
- Returns markdown table with status
- Shows per-feature status if features defined
- Icons: ✅ complete, 🔄 in-progress, ⏳ pending, 📄 provided

### `src/tools/export.ts`
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

## Python Files

### `python/cli.py`
Entry point for Python utilities:
- Validates `SEKKEI_INPUT` env var (JSON)
- Routes to appropriate exporter/analyzer
- Whitelisted actions: `export-excel`, `export-pdf`, `export-docx`, `export-matrix`, `glossary`, `diff`, `import-excel`
- Error handling with structured output

### `python/export/excel_exporter.py`
Generate Excel workbooks:
- openpyxl-based implementation
- Table formatting (headers, alternating row colors)
- Hyperlink support (cross-references)
- Multi-sheet layout

### `python/export/pdf_exporter.py`
Generate PDF documents:
- WeasyPrint-based implementation
- CSS styling support
- Page breaks at section boundaries
- Header/footer with project info

### `python/nlp/diff_analyzer.py`
Version comparison:
- Identify added/removed/modified sections
- Cross-reference change impact
- Generate changelog

## Template Files

### `templates/ja/basic-design.md`
System architecture & design:
- System architecture diagram
- Database design (ER diagram)
- External interface specifications
- Non-functional requirements
- Technology rationale

### `templates/shared/feature-index.md`
Feature listing for per-feature specs (new in v2):
- Feature overview table
- Navigation to per-feature sections
- Status indicators

### `templates/shared/section-index.md`
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
    basic_design: PerFeatureChainEntry;
    security_design: ChainEntry;
    detail_design: PerFeatureChainEntry;
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

export interface PerFeatureDocument {
  type: "per-feature";
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

## Build & Test (Turborepo)

The project uses **Turborepo** for efficient build and test orchestration with shared caching in `.turbo/` (gitignored).

### Build Commands

From repo root (all packages via turbo):
```bash
npm run build        # turbo run build (caches output)
npm run lint         # turbo run lint
npm test             # turbo run test
```

From packages/mcp-server/ (direct npm):
```bash
npm run build        # tsc (compile TypeScript)
npm run lint         # tsc --noEmit (type check)
npm run dev          # tsx (hot reload)
npm test             # Jest with ESM support
npm run test:unit    # Unit tests only
```

### Configuration

**turbo.json:**
- `tasks.build.outputs: ["dist/**"]` — caches compiled output
- `packageManager: "npm@10.7.0"` — enforces npm version

### Changesets Workflow (Release Management)

Located in `.changeset/`:
- `config.json` — configured for GitHub Packages
- Interactive: `npx changeset` → creates `.changeset/{id}.md`
- Automated: GitHub Actions (`release.yml`) runs on version PR merge
  - Publishes to npm + GitHub Packages (`npm.pkg.github.com`)
  - All 3 packages: @bienhoang/sekkei-{mcp-server,preview,skills}

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

## Version History & Changes

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

### Per-Feature Document Types (UPDATED)

Only `basic-design` and `detail-design` use per-feature generation (feature-based).
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

### 5 New Document Types + Libraries

- **test-evidence** (EV-xxx), **meeting-minutes** (MTG-xxx), **decision-record** (ADR-xxx), **interface-spec** (IF-xxx), **screen-design** (PG-xxx)
- **Core libraries:** confidence-extractor, traceability-extractor, content-sanitizer, impact-analyzer
- **Tools:** simulate_change_impact, import_document (Excel→Markdown reverse migration)
- **Config:** approval_chain, ui_mode, learning_mode support

## Phase B: Quality Metrics Libraries (NEW v2.6.3)

### Dashboard Quality Scorers

1. **coverage-metrics.ts** — Traceability matrix coverage
   - `calculateCoverage()` — REQ→design %, REQ→test %
   - Returns CoverageMetrics with required/traced counts

2. **health-scorer.ts** — Document health scoring
   - Formula: 100 - 10*error_count - 3*warning_count
   - Returns HealthScore with grade (A/B/C/D/F)

3. **risk-scorer.ts** — Multi-dimension risk assessment
   - 5 dimensions: 30% traceability + 20% NFR + 20% test + 15% freshness + 15% health
   - Returns RiskScore with grade (green/yellow/red)

4. **batch-validator.ts** — Config-driven batch validation
   - Validates multiple docs per chain configuration
   - Returns BatchValidationResult with error counts

5. **nfr-classifier.ts** — IPA NFUG category classification
   - Categories: Availability, Performance, Operability, Migration, Security, Environment
   - Returns ClassificationResult with category distribution

### Dashboard Components (@sekkei-dashboard)

- **5 Pages:** Overview, Chain-Status, Analytics, Changes, Features
- **Charts:** Traceability DAG (Recharts + @xyflow/react), risk/health/NFR radars, trend lines
- **Services:** cached-mcp-service, snapshot-service, workspace-scanner, changelog-parser
- **CLI:** `sekkei-dashboard` command for local development

## Summary Statistics

- **Total Source Files:** 194+ files (src + templates + adapters + dashboard)
- **TypeScript Files:** 100+ source files — MCP (57 lib modules), tools, dashboard
- **Templates:** ja/22 + shared/4 + rfp/7 + wireframe/9 CSS + 15 YAML glossaries + 3 presets
- **Tests:** 22+ unit + integration test files | **Adapters:** SKILL.md, Cursor, Copilot, Dashboard
- **MCP Tools:** 15 (8 core + 3 Phase A + 2 v3 + 1 RFP + 1 CR/Plan)
- **MCP Resources:** template:// URIs + rfp://instructions/{flow} (7 flows)

## Development & Deployment

**Workflow:** `npm run build` (compile), `npm test` (Jest), `npm run lint` (type check)

**Runtime:** Node.js 20+ (ESM), Python 3.8+, STDIO (JSON-RPC 2.0 stdout, logs stderr)

**Setup:** `npm install && npx sekkei init` (auto-installs adapters + Python deps)
