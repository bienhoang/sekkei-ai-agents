# Sekkei System Architecture

## Overview

Sekkei is an AI-powered MCP server that generates Japanese software specification documents following the V-model (sequential document chain). The system converts RFPs into comprehensive specification documents through a chain of transformations, each document building on the previous one.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      MCP Client Layer                           │
│            (Claude / Cursor / Copilot / 3rd-party)             │
└────────────────┬────────────────────────────────────────────────┘
                 │ STDIO (JSON-RPC 2.0)
                 ↓
┌─────────────────────────────────────────────────────────────────┐
│                    MCP Server (TypeScript)                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ McpServer Instance                                       │  │
│  │  • Handles STDIO transport                              │  │
│  │  • Routes JSON-RPC requests to tool handlers            │  │
│  │  • Manages resources (template URIs)                    │  │
│  │  • Logs to stderr (fd 2) via Pino                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Tool Handlers (16 MCP Tools)               │   │
│  │  1. generate_document      → generates spec docs        │   │
│  │  2. get_template           → returns template content   │   │
│  │  3. validate_document      → checks completeness & refs │   │
│  │  4. get_chain_status       → reads chain progress       │   │
│  │  5. export_document        → formats Excel/PDF/Sheets   │   │
│  │  6. translate_document     → translates to EN/VI        │   │
│  │  7. manage_glossary        → CRUD glossary entries      │   │
│  │  8. analyze_update         → diffs & enhanced 朱書き    │   │
│  │  9. simulate_change_impact → spec impact cascade        │   │
│  │ 10. import_document        → Excel→markdown import      │   │
│  │ 11. validate_chain         → full chain validation      │   │
│  │ 12. manage_rfp_workspace   → RFP presales lifecycle     │   │
│  │ 13. manage_change_request  → CR state machine           │   │
│  │ 14. manage_plan            → multi-phase planning       │   │
│  │ 15. update_chain_status    → CR propagation actions     │   │
│  │ 16. manage_version         → semantic versioning (NEW)  │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │    Quality Metrics Libraries (Phase B Dashboard)        │   │
│  │  • coverage-metrics.ts    → Traceability matrix %       │   │
│  │  • health-scorer.ts       → Doc health (err+warn)       │   │
│  │  • risk-scorer.ts         → 5-dimension risk weighted   │   │
│  │  • batch-validator.ts     → Config-driven batch check   │   │
│  │  • nfr-classifier.ts      → IPA NFUG classification    │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              MCP Resources                             │   │
│  │  • template://{lang}/{doc-type} → template content     │   │
│  │  • rfp://instructions/{flow}    → RFP flow instructions│   │
│  │    (7 flows: analyze, questions, draft, impact,        │   │
│  │     proposal, freeze, routing)                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Core Libraries                             │   │
│  │  • Validator          → schema & cross-reference checks│   │
│  │  • RFP State Machine  → phase transitions, workspace   │   │
│  │  • Template Loader    → loads & resolves overrides     │   │
│  │  • Manifest Manager   → CRUD per-feature doc metadata   │   │
│  │  • Python Bridge      → calls Python CLI (JSON env)    │   │
│  │  • Resolver           → maps doc_type → output paths   │   │
│  │  • Structure Validator → validates numbered directories│   │
│  │  • Code Analyzer      → TypeScript AST analysis (v3)   │   │
│  │  • Staleness Detector → git diff + scoring (v3)        │   │
│  │  • Structure Rules    → anti-chaos validation (v3)     │   │
│  │  • Google Sheets Exporter → markdown→sheets (v3)       │   │
│  │  • Upstream Extractor → parse IDs from upstream docs    │   │
│  │    (server-side 5-min cache, reduces context size)     │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │    Document Generation Optimization (NEW v2.8.0)      │   │
│  │  • Token Budget Estimator → predicts output tokens     │   │
│  │    and recommends generation strategy                 │   │
│  │  • Smart Upstream Filtering → splits markdown by h2   │   │
│  │    headings, keeps feature-relevant sections only     │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │      Version Management Subsystem (NEW v2.9.0)        │   │
│  │  • version-manager.ts → semantic versioning (SemVer)  │   │
│  │  • sekkei.releases.yaml → version + release storage   │   │
│  │  • manage_version tool → 4 actions: bump, query,      │   │
│  │    release, history                                   │   │
│  │  • Git tagging → annotated tags on release            │   │
│  │  • Release notes generation → RELEASE-NOTES-{tag}.md  │   │
│  │  • Export integration → version on PDF/Excel/DOCX     │   │
│  │    (cover page, header, footer)                       │   │
│  └─────────────────────────────────────────────────────────┘   │
└────────────────┬────────────────────────────────────────────────┘
                 │ execFile (Node.js)
                 ↓
┌──────────────────────────────────────────┐
│       Python Export Layer                │
│  ┌──────────────────────────────────────┐│
│  │ cli.py (entry point)                 ││
│  │  • Validates SEKKEI_INPUT env var   ││
│  │  • Routes to specialized exporters  ││
│  └──────────────────────────────────────┘│
│  ┌──────────────────────────────────────┐│
│  │ export/excel_exporter.py             ││
│  │ export/pdf_exporter.py               ││
│  │ export/docx_exporter.py (NEW)        ││
│  │ nlp/glossary.py, diff_analyzer.py    ││
│  │ import/excel_importer.py (NEW)       ││
│  └──────────────────────────────────────┘│
│  Dependencies: openpyxl, weasyprint,    │
│  mistune, pyyaml, jinja2                │
└──────────────────────────────────────────┘
                 ↓
          Output Files
        (Excel, PDF, etc.)
```

## Dashboard Architecture (Phase B)

```
┌──────────────────────────────────────────────────────────┐
│         Dashboard React SPA (@sekkei-dashboard)          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 5 Pages: Overview, Chain-Status, Analytics,        │  │
│  │ Changes, Features                                  │  │
│  ├────────────────────────────────────────────────────┤  │
│  │ Components (Recharts + @xyflow/react + dagre):     │  │
│  │  • Traceability Graph (DAG visualization)          │  │
│  │  • Risk Gauge (5-dimension weighted)               │  │
│  │  • Health Radar (errors + warnings)                │  │
│  │  • NFR Radar (IPA NFUG categories)                 │  │
│  │  • Completion Donut (phase progress %)             │  │
│  │  • Trend Line (historical metrics)                 │  │
│  │  • Score Cards (coverage, health, risk)            │  │
│  └────────────────────────────────────────────────────┘  │
└────────────┬──────────────────────────────────────────────┘
             │ REST API
             ↓
┌──────────────────────────────────────────────────────────┐
│   Dashboard Server (Express + Cached MCP Service)        │
│  • /api/metrics      → quality scores                    │
│  • /api/coverage     → traceability %                    │
│  • /api/risk         → risk assessment                   │
│  • /api/chain-status → doc chain progress                │
│  • /api/snapshots    → historical data                   │
│  • /api/workspace    → doc inventory                     │
│  • POST /api/snapshot → capture metrics                  │
│                                                          │
│  Services:                                               │
│  • cached-mcp-service (5-min cache)                      │
│  • snapshot-service (metrics persistence)                │
│  • workspace-scanner (doc enumeration)                   │
│  • changelog-parser (change extraction)                  │
└────────────┬──────────────────────────────────────────────┘
             │ MCP Client Integration
             ↓
        MCP Server (Quality Metrics)
```

Quality Metrics Libraries (in MCP Server):
- **coverage-metrics.ts** — REQ→design, REQ→test traceability %
- **health-scorer.ts** — Score = 100 - 10*errors - 3*warnings
- **risk-scorer.ts** — 30% trace + 20% nfr + 20% test + 15% freshness + 15% health
- **batch-validator.ts** — Config-driven multi-doc validation
- **nfr-classifier.ts** — IPA NFUG categories (Availability, Performance, etc.)

## Generation Optimization Subsystems (v2.8.0)

### Token Budget Estimation & Smart Filtering

**Token Budget Estimator** (`token-budget-estimator.ts`, 119 LOC):
- Predicts output tokens: `estimated_tokens = base_tokens + Σ(entity_count × weight)`
- Calibration per doc type (requirements, functions-list, basic-design, detail-design, test-specs, db-design)
- Strategies: single-call (<16K), progressive (16K-24K), plan_required (>24K)
- Used by `generate.ts` (advisory) and `plan-actions.ts` (strategy selection)

**Smart Upstream Content Filtering** (`upstream-filter.ts`, 140 LOC):
- 2-stage filtering: H2 heading match, then ID-based fallback
- Reduces context 60-75% per feature in per-feature mode
- Extracts only feature-relevant sections from upstream document
- Session recovery via section-level checkpoints in plan YAML

## Document Chain (V-Model) — v2.7 (IPA Compliant)

### IPA V-Model Chain Structure with Full Compliance

```
RFP (提案依頼書)
  ↓
Requirements Phase (要件定義)
  ├─→ Requirements (要件定義書)
  ├─→ NFR (非機能要件定義書) — IPA grades + review metadata
  ├─→ Functions List (機能一覧)
  ├─→ Project Plan (プロジェクト計画)
  └─→ Interface Spec (インターフェース仕様書)
  ↓
Design Phase (設計)
  ├─→ Architecture Design (アーキテクチャ設計) [IPA v-model layer]
  ├─→ Basic Design (基本設計書) — Per-feature: system + features
  ├─→ Security Design (セキュリティ設計書)
  ├─→ DB Design (データベース設計) [IPA v-model layer]
  ├─→ Detail Design (詳細設計書) — Per-feature generation
  ├─→ Operation Design (運用設計書)
  ├─→ Migration Design (移行設計書)
  └─→ Screen Design (画面設計書)
  ↓
Test Phase (テスト)
  ├─→ Test Plan (テスト計画)
  ├─→ UT Spec (単体テスト仕様書)
  ├─→ IT Spec (結合テスト仕様書)
  ├─→ ST Spec (システムテスト仕様書)
  ├─→ UAT Spec (受入テスト仕様書)
  └─→ Test Result Report (テスト結果報告) [IPA v-model layer]
  ↓
[Supplementary Documents — Parallel]:
  ├─ Batch Design (バッチ処理設計) [IPA v-model]
  ├─ Report Design (帳票仕様書) [IPA v-model]
  ├─ CRUD Matrix (CRUD矩陣)
  ├─ Traceability Matrix (トレーサビリティ矩陣)
  ├─ Test Evidence (テストエビデンス)
  ├─ Meeting Minutes (議事録)
  └─ Architecture Decision Records (設計決定記録)
  ↓
Glossary (用語集)
```

**Key Improvements (v2.7 IPA Compliance):**
- Added `architecture-design` — explicit architectural layer per IPA V-Model
- Added `db-design` — separate database schema documentation per IPA
- Added `test-result-report` — test execution reporting per IPA test phase
- Added `batch-design` and `report-design` — operational/supplementary layers per IPA
- Updated `nfr.md` with IPA NFUG grade tables (6 categories: Availability, Performance, Operability, Migration, Security, Ecology)
- All 27 templates include enterprise review metadata:
  - `review_date`, `approval_date` in frontmatter
  - 検印欄 (review sign-off table) with 3 review stages (第1回, 第2回, 最終承認)
- CHAIN_PAIRS extended to 68 edges supporting new document relationships
- Enterprise preset updated with all new types

### Output Structure (Numbered Format) — v2.0

Generated documents are organized in a numbered directory structure:

```
project-output/
├── 01-rfp/                     # RFP workspace (optional)
│   └── <project-name>/
│       ├── 00_status.md        # Phase status (YAML frontmatter)
│       ├── 01_raw_rfp.md       # Original RFP content (append-only)
│       ├── 02_analysis.md      # Deep analysis output
│       ├── 03_questions.md     # Q&A for client
│       ├── 04_client_answers.md # Client responses (append-only)
│       ├── 05_proposal.md      # Proposal draft
│       ├── 06_scope_freeze.md  # Scope freeze checklist
│       └── 07_decisions.md     # Decision log (append-only)
├── 02-requirements/            # Requirements phase
│   ├── requirements.md         # Requirements specification
│   ├── nfr.md                  # Non-functional requirements
│   └── project-plan.md         # Project plan
├── 03-system/                  # Design phase — system-level
│   ├── index.md
│   ├── basic-design.md         # System-level basic design
│   ├── security-design.md      # Security design (NEW)
│   ├── crud-matrix.md
│   └── [shared sections]...
├── 04-functions-list.md        # Feature/function listing (standalone)
├── 05-features/                # Per-feature design specifications
│   ├── index.md
│   ├── sales-management/
│   │   ├── index.md
│   │   ├── basic-design.md
│   │   ├── detail-design.md
│   │   └── [other feature docs]
│   └── [other-features]/
├── 06-data/                    # Data & migration design
│   ├── index.md
│   └── [migration design docs]
├── 07-operations/              # Operation procedures
│   ├── index.md
│   └── [operation docs]
├── 08-test/                    # Test phase
│   ├── index.md
│   ├── test-plan.md            # Test plan (NEW)
│   ├── ut-spec.md              # Unit test spec (NEW)
│   ├── it-spec.md              # Integration test spec (NEW)
│   ├── st-spec.md              # System test spec (NEW)
│   ├── uat-spec.md             # UAT spec (NEW)
│   ├── traceability-matrix.md
│   └── [test evidence docs]
├── 09-ui/                      # UI/screen design
│   ├── index.md
│   └── [screen design docs]
└── 10-glossary.md              # Terminology glossary
```

**Key Changes:**
- `02-requirements/` is the requirements directory (numbered 02)
- New requirement docs: `nfr.md`, `project-plan.md`
- New design doc: `security-design.md`
- Test phase now has 5 docs: test-plan + 4 test specs (UT/IT/ST/UAT)
- Removed `01-overview.md` — merged into requirements phase

**Key Rules:**
- Files follow `NN-name.md` format (NN = 01-10)
- Feature folders use kebab-case (e.g., `sales-management`, not `SALES`)
- Each numbered directory has `index.md` for navigation
- Per-feature documents reference files via manifest (`_index.yaml`)

## Document Types & Templates — v2.7 (IPA V-Model Compliant)

| Type | File | Phase | Per-Feature? | Output Path | ID Prefix | Scope |
|------|------|-------|--------|-------------|-----------|-------|
| requirements | `ja/requirements.md` | requirements | No | `02-requirements/requirements.md` | REQ- | Project-level |
| nfr | `ja/nfr.md` | requirements | No | `02-requirements/nfr.md` | NFR- | Non-functional (IPA grades) |
| functions-list | `ja/functions-list.md` | requirements | No | `04-functions-list.md` | F- | Feature catalog |
| project-plan | `ja/project-plan.md` | requirements | No | `02-requirements/project-plan.md` | - | Project planning |
| basic-design | `ja/basic-design.md` | design | Yes | `03-system/`, `05-features/{name}/` | SCR-, TBL- | System + per-feature |
| architecture-design | `ja/architecture-design.md` | design | No | `03-system/architecture-design.md` | ARC- | High-level architecture (IPA v-model) |
| security-design | `ja/security-design.md` | design | No | `03-system/security-design.md` | SEC- | Security design |
| db-design | `ja/db-design.md` | design | No | `03-system/db-design.md` | DB- | Database schema (IPA) |
| detail-design | `ja/detail-design.md` | design | Yes | `05-features/{name}/` | API-, CLS- | Per-feature implementation |
| test-plan | `ja/test-plan.md` | test | No | `08-test/test-plan.md` | TST- | Test planning |
| ut-spec | `ja/ut-spec.md` | test | No | `08-test/ut-spec.md` | UT- | Unit tests |
| it-spec | `ja/it-spec.md` | test | No | `08-test/it-spec.md` | IT- | Integration tests |
| st-spec | `ja/st-spec.md` | test | No | `08-test/st-spec.md` | ST- | System tests |
| uat-spec | `ja/uat-spec.md` | test | No | `08-test/uat-spec.md` | UAT- | Acceptance tests |
| test-result-report | `ja/test-result-report.md` | test | No | `08-test/test-result-report.md` | TR- | Test results (IPA) |
| crud-matrix | `ja/crud-matrix.md` | supplementary | No | `03-system/crud-matrix.md` | - | System-level |
| traceability-matrix | `ja/traceability-matrix.md` | supplementary | No | `08-test/traceability-matrix.md` | - | Test-level |
| operation-design | `ja/operation-design.md` | supplementary | No | `07-operations/` | OP- | Operational procedures |
| migration-design | `ja/migration-design.md` | supplementary | No | `06-data/` | MIG- | Data migration |
| batch-design | `ja/batch-design.md` | supplementary | No | `07-operations/batch-design.md` | BATCH- | Batch processing (IPA) |
| report-design | `ja/report-design.md` | supplementary | No | `07-operations/report-design.md` | RPT- | Report specifications (IPA) |
| screen-design | `ja/screen-design.md` | supplementary | No | `09-ui/screen-design.md` | SCN- | UI/screen mockups |
| test-evidence | `ja/test-evidence.md` | supplementary | Yes | `08-test/evidence/` | EV- | Test evidence collection |
| meeting-minutes | `ja/meeting-minutes.md` | supplementary | No | `meeting-minutes.md` | MTG- | Meeting records |
| decision-record | `ja/decision-record.md` | supplementary | No | `decision-records.md` | ADR- | Architecture decisions |
| interface-spec | `ja/interface-spec.md` | supplementary | No | `interface-spec.md` | IF- | Multi-vendor interfaces |
| sitemap | `ja/sitemap.md` | supplementary | No | `sitemap.md` | - | Site structure |

**Per-Feature Document Types:** `basic-design` and `detail-design` support per-feature generation. Others are single-file in directories or standalone.

**IPA Compliance Changes (v2.7):**
- Added `architecture-design` — explicit high-level design phase per IPA V-Model
- Added `db-design` — separate database schema documentation
- Added `test-result-report` — test execution results and evidence reporting
- Added `batch-design` — batch/scheduled processing specifications
- Added `report-design` — report output format specifications
- Updated `nfr.md` template with IPA grade tables (Availability, Performance, Operability, Migration, Security, Ecology)
- All 27 templates include review metadata: `review_date`, `approval_date`, `検印欄` (review sign-off table)

## Core Components

### 1. MCP Server (`src/server.ts`)

- Initializes McpServer with STDIO transport
- Registers all 15 tool handlers (8 core + 3 Phase A + 1 v3 + 1 RFP + 2 CR/Plan)
- Manages resource URIs: template:// and rfp://instructions/{flow}
- Logs all activity to stderr

**Key Invariant:** Stdout is reserved exclusively for JSON-RPC 2.0. All logging and debugging goes to stderr (fd 2).

### 2. Tool Handlers (`src/tools/`) — 15 MCP Tools

#### generate.ts (333 LOC)
- Input: `doc_type`, `input_content`, `project_name`, `language`, optional params (source_code_path, include_confidence, include_traceability, ticket_ids)
- Output: template + AI generation instructions
- Loads template via resolver (override → default fallback)
- Calls `resolveOutputPath()` to suggest file paths per phase
- Updates manifest for per-feature documents
- Dynamically imports code-analyzer for source code analysis
- Phase A: Injects confidence/traceability annotations
- v2.0: Suggests phase-aligned paths; validates doc_type against 22 types

#### validate.ts (238 LOC)
- **Content mode:** Checks document completeness, cross-references
- **Manifest mode:** Validates per-feature document structure
- **Structure mode:** Checks numbered directory layout per v2.0 format
- **Structure rules mode:** Anti-chaos validation with 7 rules, 3 presets
- v2.0: Validates test specs symmetric to upstream (UT/IT→detail-design, ST→basic+detail, UAT→requirements)
- 4 input modes: `content`, `manifest_path`, `structure_path`, `check_structure_rules`

#### chain-status.ts (172 LOC)
- Reads `sekkei.config.yaml`
- Returns markdown table with progress status per phase
- Shows feature-by-feature status if `features` defined
- v2.0: Groups status by phase (requirements, design, test, supplementary)
- Icons: ✅ complete, 🔄 in-progress, ⏳ pending, 📄 provided

#### export.ts (277 LOC)
- Routes to Python bridge for Excel/PDF/DOCX/matrix export
- Validates manifest before export, handles merge order
- Google Sheets export (v3): parseMarkdownTables() + service account auth
- Phase A: Optional `read_only` param strips metadata via content-sanitizer

#### Other Tools
- `get-template.ts` (40 LOC) — returns template content with metadata
- `translate.ts` (75 LOC) — translates via Claude
- `glossary.ts` (74 LOC) — CRUD on glossary.json + native glossary integration
- `update.ts` (124 LOC) — analyzes diffs, generates 朱書き (red character) revision marks
- `simulate-impact.ts` (113 LOC) — Phase A: cascade impact graph visualization
- `import-document.ts` (74 LOC) — Phase A: Excel → markdown import with auto-detection
- `validate-chain.ts` (97 LOC) — Phase A: full chain validation
- `rfp-workspace.ts` — RFP MCP migration: manage_rfp_workspace tool (5 actions)

### 2b. RFP Workspace (`src/tools/rfp-workspace.ts` + `src/lib/rfp-state-machine.ts`)

**MCP Tool:** `manage_rfp_workspace` — 5 actions: `create`, `status`, `transition`, `write`, `read`

**State Machine phases:**
```
RFP_RECEIVED → ANALYZING → QNA_GENERATION → WAITING_CLIENT
  → DRAFTING → PROPOSAL_UPDATE → SCOPE_FREEZE
  WAITING_CLIENT → CLIENT_ANSWERED → PROPOSAL_UPDATE
```

**File write rules** (enforced by `rfp-state-machine.ts`):

| File | Rule |
|------|------|
| `00_status.md` | Status YAML (auto-managed) |
| `01_raw_rfp.md` | append |
| `02_analysis.md` | rewrite |
| `03_questions.md` | rewrite |
| `04_client_answers.md` | append |
| `05_proposal.md` | rewrite |
| `06_scope_freeze.md` | checklist (merge) |
| `07_decisions.md` | append |

**Workspace path:** `{workspace_path}/workspace-docs/01-rfp/{project_name}/`

**MCP Resources:** `rfp://instructions/{flow}` — served from `templates/rfp/flow-{flow}.md` (or `routing.md`). 7 flows: `analyze`, `questions`, `draft`, `impact`, `proposal`, `freeze`, `routing`.

### 3. Phase A: SIer Psychology Libraries (`src/lib/` — Phase A additions)

#### confidence-extractor.ts (Phase A)
Extracts AI confidence levels per section:
- `extractConfidenceScores()` — Parse AI-provided confidence levels from generated content
- Levels: high (信頼度高), medium (信頼度中), low (信頼度低)
- Output: SectionConfidence array with section ID, level, and rationale

#### traceability-extractor.ts (Phase A)
Generates source traceability citations:
- `generateTraceability()` — Link each statement to upstream document ID
- Format: "この記述は{DOC_TYPE}-{ID}に基づく"
- Output: TraceabilityMap with statement → source references

#### content-sanitizer.ts (Phase A)
Strips internal metadata for client-safe exports:
- `sanitizeForClient()` — Remove confidence scores, internal notes, AI markers
- Preserve: cross-references, structure, technical content
- Output: cleaned markdown for `read_only` mode

#### impact-analyzer.ts (Phase A)
Simulates specification change cascade effects:
- `simulateChangeImpact()` — Build dependency graph, trace cascading updates
- Input: changed document ID, change type (section added/removed/modified)
- Output: ImpactGraph with affected docs, update priority, risk assessment

### 4. Phase 3: Intelligence Layer Libraries (`src/lib/` — v3 additions)

#### code-analyzer.ts (v3)
TypeScript AST analysis via ts-morph (dynamic import, optional peer dep):
- `analyzeSourceCode()` — Extract classes, functions, endpoints, entities
- `MAX_FILES=100`, `10s timeout`, memory-safe import
- Output: CodeContext with interfaces, functions, API endpoints, database entities

#### staleness-detector.ts (v3)
Git-based staleness scoring:
- `detectStaleness()` — Diff commits vs feature_file_map
- Scoring: `clamp(daysSince/90)*40 + clamp(files/10)*30 + clamp(lines/500)*30`
- Output: StalenessReport with STALE/WARN/OK labels per feature

#### structure-rules.ts (v3)
Anti-chaos validation with 7 built-in rules:
1. Max nesting depth
2. Max files per directory
3. Required section presence
4. File naming consistency
5. Cross-reference completeness
6. Code metrics (lines per function, cyclomatic complexity)
7. Documentation coverage

Three presets: enterprise/standard/agile

#### google-sheets-exporter.ts (v3)
Export markdown tables to Google Sheets:
- `parseMarkdownTables()` — Extract table data
- `exportToGoogleSheets()` — Write via Sheets API
- Service account auth (dynamic google-auth-library import)

#### google-auth.ts (v3)
OAuth2 service account authentication (dynamic import).

#### glossary-native.ts (Phase A)
In-process glossary management (153 LOC):
- `loadGlossary()` — Load YAML glossary file
- `validateGlossaryReferences()` — Check spec references
- `extractGlossaryTerms()` — Extract undefined terms from content
- Returns: GlossaryEntry[] with term, reading, definition, usage

#### Mockup System (Skill-based Generation)
AI-powered mockup generation via `/sekkei:mockup` skill command:
- Skill command invocation → Claude generates HTML wireframe/mockup directly
- No schema validation pipeline (removed Phase A files)
- CSS styling via `templates/wireframe/admin-shell.css` (shared CSS framework)
- Skill reference: `packages/skills/content/references/mockup-command.md`

#### excel-template-filler.ts (Phase A)
Fill Excel named ranges with markdown content (168 LOC):
- `fillTemplate()` — Map markdown sections to named ranges
- Preserves formatting, merges cells, column widths
- Returns: completed Excel workbook ready for export

#### font-manager.ts (Phase A)
CJK font support for PDF export (53 LOC):
- `loadCJKFonts()` — Register fonts for Japanese/Chinese/Korean
- WeasyPrint font fallback chain
- Handles: MS Gothic, Noto Sans CJK (fallback), monospace

### 5. Existing Core Libraries (`src/lib/`)

#### manifest-manager.ts
Records per-feature document structure in `_index.yaml`:
```yaml
version: "1.0"
project: "ProjectName"
language: "ja"
documents:
  basic-design:
    type: "per-feature"
    status: "in-progress"
    shared:
      - file: "03-system/system-architecture.md"
        section: "system-architecture"
        title: "システムアーキテクチャ"
    features:
      - name: "sales-management"
        display: "販売管理"
        file: "05-features/sales-management/basic-design.md"
    merge_order: ["shared", "features"]
```

#### validator.ts
- Validates document completeness (required sections)
- Extracts & checks cross-reference IDs (F-xxx, REQ-xxx, etc.)
- Reports missing/orphaned references
- Validates table structures (CRUD matrix, traceability)

#### resolve-output-path.ts
Maps `(doc_type, scope, feature_name)` to output path hints per v2.0 phase:
```
requirements → 02-requirements/requirements.md
nfr → 02-requirements/nfr.md
project-plan → 02-requirements/project-plan.md
functions-list → 04-functions-list.md
basic-design + shared → 03-system/basic-design.md
basic-design + feature=sales → 05-features/sales-management/basic-design.md
security-design → 03-system/security-design.md
detail-design + feature=sales → 05-features/sales-management/detail-design.md
test-plan → 08-test/test-plan.md
ut-spec → 08-test/ut-spec.md
it-spec → 08-test/it-spec.md
st-spec → 08-test/st-spec.md
uat-spec → 08-test/uat-spec.md
```

#### structure-validator.ts
Checks numbered directory structure per v2.0 format:
- Requires files: `04-functions-list.md`, `10-glossary.md`
- Requires dirs: `02-requirements`, `03-system`, `05-features`, `06-data`, `07-operations`, `08-test`, `09-ui`, `01-rfp` (optional)
- Each dir must have `index.md`
- Feature folders must use kebab-case
- Within requirements dir: expects `requirements.md`, optionally `nfr.md`, `project-plan.md`
- Within test dir: expects test-spec files (test-plan.md, ut-spec.md, it-spec.md, st-spec.md, uat-spec.md)
- Rejects version suffixes (old, copy, v1, etc.) and non-ASCII filenames

#### template-loader.ts & template-resolver.ts
- `resolveTemplatePath()` checks `SEKKEI_TEMPLATE_OVERRIDE_DIR` first
- Falls back to default `templates/{lang}/{doc-type}.md`
- Validates path containment (no `..` traversal)
- Returns `TemplateData` with metadata + content

#### python-bridge.ts
```typescript
execFile(pythonPath, ["cli.py"], {
  env: { SEKKEI_INPUT: JSON.stringify(payload) },
  maxBuffer: 100 * 1024 * 1024, // 100MB
})
```
7 actions whitelisted: `export-excel`, `export-pdf`, `export-docx`, `export-matrix`, `glossary`, `diff`, `import-excel`.

### 5. CLI Commands (`src/cli/commands/`)

#### Lifecycle Commands

**init.ts** — `sekkei init`
- Delegates to interactive init wizard (`bin/init.js`)
- Flags: `--skip-deps`, `--preset`

**version.ts** — `sekkei version`
- Shows Sekkei version + environment health check
- Flag: `--json` (outputs structured health report)
- Exits code 1 if any health check fails (fail status)
- Checks: Node.js, Python, Playwright, templates, config, venv, skill, MCP, commands

**uninstall.ts** — `sekkei uninstall`
- Removes Sekkei skill, commands, and MCP entry from `~/.claude/`
- Removes: skill directory, command symlinks, command stubs, MCP entry
- Prompts for confirmation (skip with `--force`)
- Leaves package + build artifacts intact

**update.ts** — `sekkei update`
- Rebuilds MCP server, re-copies skill files, regenerates stubs, updates MCP entry
- Flag: `--skip-build` (skips npm build step)
- Steps: (1) build, (2) copy skills, (3) regenerate 20 sub-command stubs, (4) update MCP entry, (5) health check
- Updates MCP entry in `~/.claude/settings.json` with paths to templates & Python venv

### 6. Types (`src/types/`)

#### documents.ts (v3 extensions)
Central type definitions:
- `DocType` enum (functions-list, requirements, nfr, basic-design, detail-design, test-plan, ut-spec, etc.)
- `ProjectConfig` — mirrors sekkei.config.yaml structure
  - **v3 additions:** `feature_file_map` (staleness), `google` (sheets config), `backlog` (future)
- `PerFeatureDocument` — manifest entry for per-feature docs
- `ManifestFeatureEntry` — has `name` (kebab-case), `display` (human label), `file` path
- `ChainEntry` — status + output path for single-file docs
- `PerFeatureChainEntry` — status + separate outputs for system/features/global
- **v3 types:** `CodeContext`, `StalenessReport`, `StructureRuleConfig`, `GoogleSheetsConfig`

#### manifest-schemas.ts
Zod schemas for validating manifest YAML files.

## Configuration

### Project Config (`sekkei.config.yaml`)

Per-project configuration:

```yaml
project:
  name: "販売管理システム"
  type: "web"
  stack: ["TypeScript", "React", "Node.js"]
  team_size: 5
  language: "ja"
  keigo: "丁寧語"
  industry: "小売"

output:
  directory: "./output"

chain:
  rfp: "rfp.md"
  functions_list:
    status: "pending"
  requirements:
    status: "pending"
  basic_design:
    status: "pending"
    system_output: "03-system/"
    features_output: "05-features/"
  detail_design:
    status: "pending"
    features_output: "05-features/"
  test_spec:
    status: "pending"
    global_output: "08-test/"
    features_output: "05-features/"
  glossary:
    status: "pending"

features:
  - id: "SAL"
    name: "sales-management"
    display: "販売管理"
  - id: "INV"
    name: "inventory-management"
    display: "在庫管理"
```

### Environment Variables

- `SEKKEI_TEMPLATE_DIR` — template directory (default: `../../templates` from dist)
- `SEKKEI_TEMPLATE_OVERRIDE_DIR` — company-specific templates (optional)
- `SEKKEI_PYTHON` — Python executable (default: `.venv/bin/python3`)
- `LOG_LEVEL` — Pino log level (default: `info`)
- `GOOGLE_APPLICATION_CREDENTIALS` — service account JSON path (v3, optional)
- `GOOGLE_SHEETS_FOLDER_ID` — Drive folder for exported sheets (v3, optional)

## Data Flow

### Document Generation Flow

1. **Client Request** → `generate_document(doc_type, input_content, project_name, language)`
2. **Server** loads template via resolver (checks override dir first)
3. **Template Resolver** returns `TemplateData` (YAML metadata + markdown content)
4. **resolve-output-path()** suggests file path based on doc_type and scope
5. **Generate Instructions** builds AI prompt with:
   - Template structure
   - Previous document context (if available)
   - Cross-reference ID patterns
   - Output path hint
6. **Response** returned to client with:
   - Template content
   - Generation instructions
   - Suggested output path
7. **Manifest Update** (if per-feature) → adds entry to `_index.yaml`

### Document Validation Flow

**Content Mode:**
1. Parse markdown for required sections
2. Extract cross-reference IDs
3. Compare with upstream document IDs
4. Report missing/orphaned references

**Manifest Mode:**
1. Load `_index.yaml`
2. Read all shared & feature files
3. Validate each file independently
4. Check file references in manifest match disk

**Structure Mode:**
1. Check all required numbered files exist
2. Verify all numbered directories exist with `index.md`
3. Validate feature folders use kebab-case
4. Reject version suffixes and non-ASCII names

### Export Flow

1. Client calls `export_document(manifest_path, format, output_path)`
2. Server validates manifest and files exist
3. Get merge order: `[shared files..., feature files...]`
4. Read all files from disk
5. Call Python bridge with content + format
6. Python creates Excel/PDF using openpyxl/weasyprint
7. Return export result

## Cross-Reference System

**25 ID Prefixes:** F (functions), REQ (requirements), NFR (NFR), ARC (architecture), DB (database), SEC (security), SCR (screen), TBL (table), API (API), CLS (class), OP (operations), MIG (migration), BATCH (batch), RPT (report), SCN (screen design), TST (test-plan), UT/IT/ST/UAT (test-specs), TR (test-result), EV (evidence), MTG (meeting), ADR (decision), IF (interface)

**Validation:** Extract IDs from document, load upstream IDs, check references exist, report missing/orphaned.

## Security & Constraints

### Path Validation
- Template override dir checked with regex: `^[/a-zA-Z0-9._-]+$`
- No `..` allowed in paths
- Output paths validated before I/O

### Input Size Limits
- Config file: max 100 KB
- Manifest file: max 50 KB
- Content validation: max 500 KB
- All validated via Zod schemas

### Python Bridge Safety
- Only 7 actions whitelisted: `export-excel`, `export-pdf`, `export-docx`, `export-matrix`, `glossary`, `diff`, `import-excel`
- Input passed via env var (not shell argument)
- Uses `execFile` not `exec` (prevents shell injection)
- Output size capped at 100 MB

## Testing & Build

**Test Structure:** Jest with ESM, 56 unit + 1 integration test. Tests access tools via internal handler.

**Build:** `npm run build` (tsc), `npm run lint` (type check), `npm test` (Jest ESM).

**Deployment:** ESM module, STDIO transport, stderr for logging, Python 3.8+ required.

## Error Handling

All errors use `SekkeiError` with typed codes:

```typescript
export class SekkeiError extends Error {
  constructor(code: string, message: string) { ... }
  toClientMessage(): string { /* stack traces removed */ }
}
```

Common error codes:
- `TEMPLATE_ERROR` — template not found or invalid
- `CONFIG_ERROR` — config parsing failed
- `VALIDATION_ERROR` — document validation failed
- `MANIFEST_ERROR` — manifest I/O or validation failed
- `PYTHON_BRIDGE_ERROR` — Python export failed
- `INVALID_INPUT` — Zod schema validation failed
