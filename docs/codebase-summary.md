# Sekkei Codebase Summary

## Repository Overview

**Sekkei (設計)** v2.0 is a monorepo containing:
- **@bienhoang/sekkei-mcp-server** (TypeScript/93 files/8,200+ LOC) — AI specification document generation with V-model chain restructure + Phase A + v3 extensions
- **@bienhoang/sekkei-preview** (Express + React + Tiptap v3/9 TS+TSX files) — Express server + React SPA + Tiptap v3 WYSIWYG editor
- **@bienhoang/sekkei-skills** (Claude Code SKILL.md with 30+ sub-commands) — Claude Code skill definition + reference docs
- **Python Layer** (7 files in cli.py, rest in .venv) — Export & NLP utilities (Excel/PDF/DOCX/matrix)
- **Templates** (22 MD + 15 YAML glossaries) — Japanese specification templates with industry terminology
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
│           ├── SKILL.md               # Skill definition (30+ sub-commands)
│           ├── content/               # Skill definition files
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

## Key Files & Modules

See [codebase-detail.md](./codebase-detail.md) for detailed module documentation, including Phase 3 intelligence layers, key file descriptions, type system, data flow, configuration details, and build/test infrastructure.
