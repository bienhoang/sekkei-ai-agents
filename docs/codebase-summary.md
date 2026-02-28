# Sekkei Codebase Summary

## Repository Overview

**Sekkei (設計)** v2.7.1 is a monorepo containing:
- **@bienhoang/sekkei-mcp-server** (TypeScript/194 source files/~10,000+ LOC) — IPA V-Model compliant specification generation with 27 doc types + 5 quality-scoring libs + Phase A SIer features
- **@bienhoang/sekkei-preview** (Express + React + Tiptap v3) — Live preview with WYSIWYG editor
- **@bienhoang/sekkei-dashboard** (React + Express + Recharts) — Analytics dashboard with quality metrics, traceability graphs, snapshots
- **@bienhoang/sekkei-skills** (Claude Code SKILL.md with 40+ sub-commands) — Claude Code skill definition + reference docs for all 27 doc types + workflow commands
- **Python Layer** (7 files) — Export & NLP utilities (Excel/PDF/DOCX/matrix)
- **Templates** (27 MD IPA-compliant + 15 YAML glossaries + 9 wireframe CSS) — Japanese specification templates per IPA V-Model with review metadata
- **Adapters** — Cursor (mcp.json), Copilot (copilot-instructions.md), Claude Code integration
- **Plans & Docs** — Implementation plans, research reports, documentation

## Project Structure

```
sekkei/
├── packages/
│   ├── mcp-server/                    # @bienhoang/sekkei-mcp-server (MCP Server, TypeScript, 93 TS files)
│   │   ├── src/
│   │   │   ├── server.ts              # McpServer instance, 15 tool registration
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
│   │   │   │   └── upstream-extractor.ts # Extract IDs from upstream docs (server-side, 5-min cache, 139 LOC)
│   │   │   ├── tools/                 # MCP Tool Handlers (12 tools)
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
│   ├── preview/                       # @bienhoang/sekkei-preview (Express + React + Tiptap, 9 TS+TSX files)
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
│   └── skills/                        # @bienhoang/sekkei-skills (Claude Code Skill)
│       └── sekkei/
│           ├── SKILL.md               # Skill definition (40+ sub-commands for all doc types)
│           ├── content/               # Skill definition files
│           └── references/ (8+ files)
│               ├── phase-requirements.md, phase-design.md, phase-test.md
│               ├── doc-standards.md, v-model-guide.md
│               ├── plan-orchestrator.md, rfp-manager.md, rfp-command.md
├── templates/                     # IPA V-Model Compliant Templates (27 MD + 15 YAML)
│   ├── ja/                        # Japanese templates (27 IPA-compliant files)
│   │   ├── architecture-design.md # 方式設計書 (IPA architectural layer, ARC-)
│   │   ├── basic-design.md        # 基本設計書 (split, SCR-/TBL-)
│   │   ├── batch-design.md        # バッチ処理設計書 (IPA operational, BATCH-)
│   │   ├── crud-matrix.md         # CRUD matrix
│   │   ├── db-design.md           # データベース設計書 (IPA layer, DB-)
│   │   ├── decision-record.md     # 設計決定記録 ADRs (ADR-)
│   │   ├── detail-design.md       # 詳細設計書 (split by feature, API-/CLS-)
│   │   ├── functions-list.md      # 機能一覧 (F-)
│   │   ├── interface-spec.md      # IF仕様書 (IF-)
│   │   ├── it-spec.md             # 結合テスト仕様書 (IT-)
│   │   ├── meeting-minutes.md     # 議事録 (MTG-)
│   │   ├── migration-design.md    # 移行設計書 (MIG-)
│   │   ├── nfr.md                 # 非機能要件定義書 (NFR-, IPA grades + 検印欄)
│   │   ├── operation-design.md    # 運用設計書 (OP-)
│   │   ├── project-plan.md        # プロジェクト計画書
│   │   ├── report-design.md       # 帳票仕様書 (IPA operational, RPT-)
│   │   ├── requirements.md        # 要件定義書 (REQ-)
│   │   ├── screen-design.md       # 画面設計書 (SCN-)
│   │   ├── security-design.md     # セキュリティ設計書 (SEC-)
│   │   ├── sitemap.md             # サイトマップ
│   │   ├── st-spec.md             # システムテスト仕様書 (ST-)
│   │   ├── test-evidence.md       # テストエビデンス (EV-)
│   │   ├── test-plan.md           # テスト計画書 (TST-)
│   │   ├── test-result-report.md  # テスト結果報告書 (IPA layer, TR-)
│   │   ├── traceability-matrix.md # トレーサビリティマトリックス
│   │   ├── uat-spec.md            # 受入テスト仕様書 (UAT-)
│   │   └── ut-spec.md             # 単体テスト仕様書 (UT-)
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

## Key Files & Modules

See [codebase-detail.md](./codebase-detail.md) for detailed module documentation, including Phase 3 intelligence layers, key file descriptions, type system, data flow, configuration details, and build/test infrastructure.
