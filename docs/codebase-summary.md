# Sekkei Codebase Summary

## Repository Overview

**Sekkei (設計)** v2.7.2 is a monorepo containing:
- **@bienhoang/sekkei-mcp-server** (TypeScript/194 source files/~14,500 LOC src + ~13,800 LOC tests) — IPA V-Model compliant specification generation with 27 doc types + 5 quality-scoring libs + Phase A SIer features + Phase B dashboard
- **@bienhoang/sekkei-preview** (Express + React + Tiptap v3) — Live preview with WYSIWYG editor (1,600+ LOC)
- **@bienhoang/sekkei-dashboard** (React + Express + Recharts + @xyflow/react) — Analytics dashboard with quality metrics, traceability graphs, snapshots (3,600+ LOC, 5 pages)
- **@bienhoang/sekkei-skills** (Claude Code SKILL.md with 44 sub-commands) — Claude Code skill definition + reference docs for all 27 doc types + workflow commands (2,800+ LOC)
- **Python Layer** (7 files) — Export & NLP utilities (Excel/PDF/DOCX/matrix/diff/glossary/import)
- **Templates** (27 MD IPA-compliant + 15 YAML glossaries + 9 wireframe CSS + 7 RFP flows) — Japanese specification templates per IPA V-Model with review metadata
- **Adapters** — Cursor (mcp.json), Copilot (copilot-instructions.md), Claude Code integration
- **Plans & Docs** — Implementation plans, research reports, documentation

## Project Structure

```
sekkei/
├── packages/
│   ├── mcp-server/                    # @bienhoang/sekkei-mcp-server v2.7.2 (MCP Server, TypeScript)
│   │   ├── src/
│   │   │   ├── server.ts              # McpServer instance, 15 MCP tool registration
│   │   │   ├── config.ts              # Env var loading
│   │   │   ├── index.ts               # CLI exports
│   │   │   ├── lib/                   # Core business logic (58 files, 9,182 LOC)
│   │   │   │   ├── errors.ts          # SekkeiError class (18 error codes)
│   │   │   │   ├── logger.ts          # Pino structured logging
│   │   │   │   ├── validator.ts       # Document validation (content, cross-refs, structure rules)
│   │   │   │   ├── manifest-manager.ts # Manifest CRUD (_index.yaml)
│   │   │   │   ├── merge-documents.ts # Assemble split docs for export
│   │   │   │   ├── template-loader.ts # Load templates from disk
│   │   │   │   ├── template-resolver.ts # Override dir logic
│   │   │   │   ├── python-bridge.ts   # Execute Python CLI via execFile (7 whitelisted actions)
│   │   │   │   ├── resolve-output-path.ts # Doc type → numbered path mapping (IPA v-model phases)
│   │   │   │   ├── structure-validator.ts # Validate numbered directories
│   │   │   │   ├── id-extractor.ts    # Extract F-xxx, REQ-xxx IDs (25 prefixes, IPA v2.7)
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
│   │   │   │   ├── excel-template-filler.ts # Named-range Excel filling (Phase A, 168 LOC)
│   │   │   │   ├── font-manager.ts    # PDF CJK font support (Phase A, 53 LOC)
│   │   │   │   ├── cross-ref-linker.ts # V-model CHAIN_PAIRS (68 edges IPA v2.7), ID extraction, deriveUpstreamIdTypes
│   │   │   │   ├── completeness-rules.ts # Document completeness checks (71 LOC)
│   │   │   │   ├── keigo-validator.ts # Japanese politeness validation (199 LOC)
│   │   │   │   ├── cr-state-machine.ts # CR state machine, YAML persistence, CRUD (180 LOC)
│   │   │   │   ├── cr-propagation.ts  # CR propagation order (upstream + downstream BFS) (55 LOC)
│   │   │   │   ├── cr-backfill.ts     # Upstream backfill suggestion generator (65 LOC)
│   │   │   │   ├── cr-conflict-detector.ts # Parallel CR conflict detection (50 LOC)
│   │   │   │   ├── git-committer.ts   # Git commit helper (58 LOC)
│   │   │   │   ├── upstream-extractor.ts # Extract IDs from upstream docs (server-side, 5-min cache, 139 LOC)
│   │   │   │   ├── coverage-metrics.ts # Traceability matrix % (Phase B)
│   │   │   │   ├── health-scorer.ts   # Doc health scoring (Phase B)
│   │   │   │   ├── risk-scorer.ts     # 5-dimension risk assessment (Phase B)
│   │   │   │   ├── batch-validator.ts # Config-driven batch validation (Phase B)
│   │   │   │   ├── nfr-classifier.ts  # IPA NFUG classification (Phase B)
│   │   │   │   ├── platform.ts        # Cross-platform utilities
│   │   │   │   ├── constants.ts       # Shared constants
│   │   │   │   └── [additional lib modules]
│   │   │   ├── tools/                 # MCP Tool Handlers (15 tools, 3,666 LOC)
│   │   │   │   ├── generate.ts        # generate_document tool (+ v3 source_code_path, Phase A confidence/traceability, upstream_paths, post_actions)
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
│   │   │   │   ├── plan.ts            # manage_plan tool (NEW v2.7.0)
│   │   │   │   ├── plan-actions.ts    # Plan action handlers (NEW v2.7.0)
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
│   │   │   │   │   ├── watch.ts       # watch subcommand (NEW v3)
│   │   │   │   │   └── [other CLI commands]
│   │   │   │   └── main.ts            # CLI entry & registration
│   │   │   └── resources/             # MCP Resource Handlers
│   │   │       ├── templates.ts       # Template URI resolution
│   │   │       ├── rfp-instructions.ts # rfp://instructions/{flow} resource (7 flows)
│   │   │       └── index.ts           # Resource registration
│   │   ├── tests/
│   │   │   ├── unit/                  # Unit tests (Jest, 56+ files)
│   │   │   │   ├── validator.test.ts
│   │   │   │   ├── id-extractor.test.ts
│   │   │   │   ├── manifest-manager.test.ts
│   │   │   │   ├── [other unit tests]
│   │   │   │   └── [Phase 3 tests: code-analyzer, staleness-detector, structure-rules, google-sheets-exporter]
│   │   │   ├── integration/           # Integration tests (1 file)
│   │   │   ├── fixtures/              # Test data (NEW v3)
│   │   │   │   └── sample-project/    # TypeScript project fixture
│   │   │   └── tmp/                   # Temporary test files (auto-cleaned)
│   │   ├── dist/                      # Compiled output (tsc)
│   │   ├── adapters/
│   │   │   ├── claude-code/
│   │   │   │   └── SKILL.md           # Claude Code skill definition (44 sub-commands)
│   │   │   ├── cursor/
│   │   │   │   ├── mcp.json           # Cursor MCP server config
│   │   │   │   └── cursorrules.md     # Cursor-specific instructions
│   │   │   └── copilot/
│   │   │       └── copilot-instructions.md # Copilot-specific instructions
│   │   ├── bin/
│   │   │   ├── cli.js                 # CLI entry point
│   │   │   ├── init.js                # Interactive project setup (187 LOC, auto-installs deps)
│   │   │   ├── setup.js               # Setup script for adapters
│   │   │   ├── install.js             # Installation orchestration script
│   │   │   └── [sub-modules: init/*, cli/*]
│   │   ├── python/                    # Export & NLP Layer (Python, 7 files)
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
│   │   │   ├── requirements.txt       # Dependencies: openpyxl, weasyprint, mistune, pyyaml
│   │   │   └── __init__.py
│   │   ├── package.json               # npm dependencies
│   │   ├── tsconfig.json              # TypeScript config
│   │   ├── jest.config.cjs            # Jest test config (ESM)
│   │   └── CLAUDE.md                  # Development guidelines
│   ├── preview/                       # @bienhoang/sekkei-preview v1.3.4 (Express + React + Tiptap, 1,600+ LOC)
│   │   ├── src/
│   │   │   ├── App.tsx                # Main React app component
│   │   │   ├── components/
│   │   │   │   ├── DocumentViewer.tsx # Markdown renderer with Mermaid support
│   │   │   │   ├── Editor.tsx         # Tiptap v3 WYSIWYG editor
│   │   │   │   └── Sidebar.tsx        # Navigation sidebar
│   │   │   ├── server.ts              # Express server entry
│   │   │   └── cli.ts                 # CLI entry for sekkei-preview command
│   │   ├── vite.config.ts             # Vite configuration
│   │   └── package.json
│   ├── dashboard/                     # @bienhoang/sekkei-dashboard v0.1.1 (React + Express, 3,600+ LOC, 5 pages)
│   │   ├── src/
│   │   │   ├── pages/                 # 5 dashboard pages (React)
│   │   │   │   ├── Overview.tsx       # Summary metrics
│   │   │   │   ├── ChainStatus.tsx    # Document chain progress
│   │   │   │   ├── Analytics.tsx      # Quality metrics + charts
│   │   │   │   ├── Changes.tsx        # Change request history
│   │   │   │   └── Features.tsx       # Per-feature status
│   │   │   ├── components/            # Shared components
│   │   │   │   ├── TraceabilityGraph.tsx  # DAG visualization (@xyflow/react + dagre)
│   │   │   │   ├── RiskRadar.tsx      # 5-dimension risk chart (Recharts)
│   │   │   │   ├── HealthScore.tsx    # Health metrics display
│   │   │   │   └── [other components]
│   │   │   ├── services/              # Backend integration
│   │   │   │   ├── mcp-client.ts      # MCP server integration
│   │   │   │   ├── snapshot-service.ts # Historical metric tracking
│   │   │   │   ├── workspace-scanner.ts # Doc inventory
│   │   │   │   ├── cached-mcp-service.ts # 5-min MCP cache
│   │   │   │   └── changelog-parser.ts # Change extraction
│   │   │   ├── server/                # Express backend (7 routes)
│   │   │   │   ├── app.ts             # Express app + routes
│   │   │   │   └── [route handlers]
│   │   │   └── cli.ts                 # CLI command entry
│   │   ├── tailwind.config.ts         # Tailwind CSS config
│   │   └── package.json
│   └── skills/                        # @bienhoang/sekkei-skills v2.7.2 (Claude Code Skill, 2,800+ LOC)
│       └── sekkei/
│           ├── SKILL.md               # Skill definition (44 sub-commands for all doc types + workflow router)
│           ├── content/               # Skill definition files
│           │   └── [sub-command definitions]
│           └── references/            # 8+ reference documents
│               ├── phase-requirements.md
│               ├── phase-design.md
│               ├── phase-test.md
│               ├── doc-standards.md
│               ├── v-model-guide.md
│               ├── plan-orchestrator.md (NEW v2.7.0)
│               ├── rfp-manager.md
│               └── [additional references]
├── packages/mcp-server/templates/     # IPA V-Model Compliant Templates (27 MD + 15 YAML glossaries + 7 RFP flows)
│   ├── ja/                            # Japanese templates (27 IPA-compliant files)
│   │   ├── architecture-design.md     # 方式設計書 (IPA architectural layer, ARC-)
│   │   ├── basic-design.md            # 基本設計書 (split, SCR-/TBL-)
│   │   ├── batch-design.md            # バッチ処理設計書 (IPA operational, BATCH-)
│   │   ├── crud-matrix.md             # CRUD matrix
│   │   ├── db-design.md               # データベース設計書 (IPA layer, DB-)
│   │   ├── decision-record.md         # 設計決定記録 ADRs (ADR-)
│   │   ├── detail-design.md           # 詳細設計書 (split by feature, API-/CLS-)
│   │   ├── functions-list.md          # 機能一覧 (F-)
│   │   ├── interface-spec.md          # IF仕様書 (IF-)
│   │   ├── it-spec.md                 # 結合テスト仕様書 (IT-)
│   │   ├── meeting-minutes.md         # 議事録 (MTG-)
│   │   ├── migration-design.md        # 移行設計書 (MIG-)
│   │   ├── nfr.md                     # 非機能要件定義書 (NFR-, IPA grades + 検印欄)
│   │   ├── operation-design.md        # 運用設計書 (OP-)
│   │   ├── project-plan.md            # プロジェクト計画書
│   │   ├── report-design.md           # 帳票仕様書 (IPA operational, RPT-)
│   │   ├── requirements.md            # 要件定義書 (REQ-)
│   │   ├── screen-design.md           # 画面設計書 (SCN-)
│   │   ├── security-design.md         # セキュリティ設計書 (SEC-)
│   │   ├── sitemap.md                 # サイトマップ
│   │   ├── st-spec.md                 # システムテスト仕様書 (ST-)
│   │   ├── test-evidence.md           # テストエビデンス (EV-)
│   │   ├── test-plan.md               # テスト計画書 (TST-)
│   │   ├── test-result-report.md      # テスト結果報告書 (IPA layer, TR-)
│   │   ├── traceability-matrix.md     # トレーサビリティマトリックス
│   │   ├── uat-spec.md                # 受入テスト仕様書 (UAT-)
│   │   └── ut-spec.md                 # 単体テスト仕様書 (UT-)
│   ├── shared/                        # Language-neutral templates (4 files)
│   │   ├── cover-page.md              # Cover page
│   │   ├── feature-index.md           # Feature index
│   │   ├── section-index.md           # Section index / table of contents
│   │   └── update-history.md          # Update history
│   ├── rfp/                           # RFP instruction templates (7 MD: flow-analyze, flow-questions, flow-draft, flow-impact, flow-proposal, flow-freeze, routing)
│   └── glossaries/                    # Domain-specific glossaries (15 YAML)
│       ├── finance.yaml, manufacturing.yaml, medical.yaml, real-estate.yaml
│       ├── logistics.yaml, retail.yaml, construction.yaml, education.yaml
│       ├── government.yaml, telecom.yaml, insurance.yaml, energy.yaml
│       ├── automotive.yaml, food-service.yaml, common.yaml
├── CLAUDE.md                          # Monorepo project guidelines
├── ROADMAP.md                         # Project roadmap
├── README.md                          # Main documentation
├── refactor-1.md                      # Refactor notes (v2 numbered structure)
└── sekkei.config.example.yaml         # Example project config
```

## MCP Tools (15 Total)

| # | Tool | Category | Status | Features |
|---|------|----------|--------|----------|
| 1 | generate_document | Core | v2.7.2 | AI generation, confidence/traceability (Phase A), code analysis (v3), upstream paths, task tracking (v2.7.0) |
| 2 | get_template | Core | v2.7.2 | Template resolution, override support, all 27 types |
| 3 | validate_document | Core | v2.7.2 | 4 modes: content, manifest, structure, structure-rules (v3) |
| 4 | get_chain_status | Core | v2.7.2 | Progress tracking, phase-based grouping |
| 5 | export_document | Core | v2.7.2 | Excel, PDF, DOCX, Google Sheets (v3), read_only mode (Phase A) |
| 6 | translate_document | Core | v2.7.2 | EN/VI translation with glossary context |
| 7 | manage_glossary | Core | v2.7.2 | CRUD operations, native glossary integration (Phase A) |
| 8 | analyze_update | Core | v2.7.2 | Diff analysis, staleness detection (v3), enhanced diffs (Phase A) |
| 9 | simulate_change_impact | Phase A | v2.7.2 | Spec change cascade analysis |
| 10 | import_document | Phase A | v2.7.2 | Excel/Markdown → sekkei import |
| 11 | validate_chain | Phase A | v2.7.2 | Full chain validation across all docs |
| 12 | manage_rfp_workspace | RFP | v2.7.2 | RFP presales lifecycle (7 flows) |
| 13 | manage_change_request | Phase A | v2.7.2 | CR state machine (8 states), propagation |
| 14 | manage_plan | Phase B | v2.7.0+ | Multi-phase document generation orchestration (NEW) |
| 15 | update_chain_status | Phase B | v2.7.0+ | CR propagation actions, atomic updates |

## Document Types (27 Total)

**Requirements:** requirements, nfr, functions-list, project-plan, interface-spec

**Design:** architecture-design, basic-design, security-design, db-design, detail-design, operation-design, migration-design, screen-design, report-design, batch-design

**Test:** test-plan, ut-spec, it-spec, st-spec, uat-spec, test-result-report, test-evidence

**Supplementary:** meeting-minutes, decision-record, sitemap, crud-matrix, traceability-matrix

## Key Statistics

| Metric | Count | Notes |
|--------|-------|-------|
| MCP Tools | 15 | Core (8) + Phase A (3) + RFP (1) + Phase B (2) + update_chain_status |
| Document Types | 27 | IPA V-Model compliant, all with templates |
| Cross-ref ID Prefixes | 25 | F, REQ, NFR, ARC, DB, SEC, SCR, TBL, API, CLS, OP, MIG, BATCH, RPT, SCN, TST, UT, IT, ST, UAT, TR, EV, MTG, ADR, IF |
| Quality Metrics Scorers | 5 | Coverage, health, risk (5-dimension), batch validator, NFR classifier |
| Error Codes | 18 | Typed SekkeiError with specific codes |
| Dashboard Pages | 5 | Overview, Chain-Status, Analytics, Changes, Features |
| Python Export Actions | 7 | excel, pdf, docx, matrix, glossary, diff, import-excel |
| RFP Flows | 7 | analyze, questions, draft, impact, proposal, freeze, routing |
| CLI Commands | 8+ | init, doctor, version, glossary, update, migrate, uninstall, health-check |

## Key Subsystems

1. **Change Request Engine** — cr-state-machine (8 states), cr-propagation, cr-conflict-detector, cr-backfill
2. **Plan Management** — plan-state, plan-actions, plan-phase-template (NEW v2.7.0)
3. **Quality Metrics** — coverage-metrics, health-scorer, risk-scorer, batch-validator, nfr-classifier (Phase B)
4. **Staleness Detection** — staleness-detector, doc-staleness, staleness-formatter (v3)
5. **Code Analysis** — code-analyzer (ts-morph), code-context-formatter (v3)
6. **Export Engine** — excel-exporter, pdf-exporter (Playwright), docx-exporter, google-sheets-exporter, python-bridge
7. **Template System** — template-resolver (override→fallback), template-loader, frontmatter-reader
8. **Changelog Manager** — changelog-manager with version tracking + CR logging
9. **Keigo Validator** — Japanese honorific validation (199 LOC)
10. **Cross-ref System** — id-extractor (25 ID prefixes), cross-ref-linker, upstream-extractor

## Source Code Metrics

- **MCP Server:** 194 TypeScript files (src + tests)
  - src/: 58 lib files + 19 tool files + 11 CLI files + type definitions + resources = ~93 TS files
  - tests/: 56 unit + 1 integration test files
  - Total LOC: ~14,500 src + ~13,800 tests
- **Preview:** 9 TS+TSX files (~1,600 LOC)
- **Dashboard:** 20+ TS+TSX files (~3,600 LOC)
- **Skills:** 1 main SKILL.md + sub-definitions (~2,800 LOC)
- **Python:** 7 files (~800 LOC)

## Recent Changes (v2.7.2)

- Progressive document generation with task tracking
- Plan management system for multi-phase orchestration (v2.7.0)
- Package version summary to doctor/version command
- Build preview/dashboard during install
- Vietnamese diacritics enforcement in output language instructions
- MCP tool name mapping in SKILL.md

## Dependencies (Key)

| Package | Version | Purpose |
|---------|---------|---------|
| @modelcontextprotocol/sdk | ^1.12.0 | MCP protocol |
| exceljs | ^4.4.0 | Native Excel export |
| playwright | ^1.58.2 | PDF via Playwright |
| docx | ^9.5.3 | Word document generation |
| googleapis | ^171.4.0 | Google Sheets API |
| ts-morph | ^27.0.2 | TypeScript AST parsing |
| simple-git | ^3.32.1 | Git operations |
| yaml | ^2.7.0 | YAML parsing |
| zod | ^3.24.0 | Schema validation |
| pino | ^9.6.0 | Structured logging |
| marked | ^17.0.3 | Markdown parsing |

## See Also

For detailed module documentation, see [codebase-detail.md](./codebase-detail.md).
