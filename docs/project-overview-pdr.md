# Sekkei Project Overview & Product Development Requirements

## Project Overview

### Vision

**Sekkei (設計) v1.1.1** — an AI-powered MCP server that generates comprehensive Japanese software specification documents following the V-model architecture pattern. The system automates the transformation from RFP (Request for Proposal) through a chain of specification documents, each feeding the next, ensuring traceability and consistency across the entire specification hierarchy. Phase A adds SIer psychology-driven features: AI confidence scoring, source traceability, presales RFP lifecycle management, and document import/impact analysis.

### Mission

Enable development teams to rapidly generate, manage, and export specification documents in Japanese with industry-standard formatting, cross-reference tracking, and multilingual support (JP, EN, VI).

### Core Value Propositions

1. **V-Model Chain Automation** — Documents are generated sequentially, each leveraging previous ones as context
2. **Traceability Matrix** — Cross-reference IDs (F-xxx, REQ-xxx, etc.) link all documents together
3. **Split Document Management** — Large documents automatically split into system-wide + per-feature sections
4. **Export Flexibility** — Generate Excel, PDF, and raw Markdown from unified specification
5. **Multilingual Support** — Translate specs to English and Vietnamese while maintaining structure
6. **Keigo Levels** — Configurable politeness levels in Japanese (丁寧語, 謙譲語, simple)

## Document Chain

### V-Model Sequence

```
1. RFP (input)
   ↓
2. Requirements (要件定義書) — detailed requirements
   ├── NFR (非機能要件)
   └── Project Plan (プロジェクト計画)
   ↓
3. Functions List (機能一覧) — feature catalog (from Requirements)
   ↓
4. Basic Design (基本設計書) — architectural design [SPLIT]
   ├── System-wide sections (03-system/)
   ├── Security Design (03-system/security-design.md)
   └── Per-feature sections (05-features/)
   ↓
5. Detail Design (詳細設計書) — implementation details [SPLIT by feature]
   └── Per-feature sections (05-features/)
   ↓
6. Test Plan (テスト計画書)
   ├── UT Spec (単体テスト仕様書) — 08-test/ut-spec.md
   ├── IT Spec (結合テスト仕様書) — 08-test/it-spec.md
   ├── ST Spec (システムテスト仕様書) — 08-test/st-spec.md
   └── UAT Spec (受入テスト仕様書) — 08-test/uat-spec.md
   ↓
7. [Optional] Operation Design, Migration Design
   ↓
8. Glossary (用語集) — terminology reference
```

Each document type has:
- YAML frontmatter (metadata)
- Markdown template with required sections
- Validation rules (required sections, cross-references)
- Cross-reference ID patterns (F-xxx, REQ-xxx, etc.)
- Export support (Excel/PDF/DOCX)

### Output Structure

Generated documents use a numbered directory structure for clarity:

```
output/
├── 01-rfp/                             # RFP workspace (optional)
│   └── <project-name>/
│       ├── 00_status.md                # Phase status (YAML)
│       ├── 01_raw_rfp.md               # Original RFP (append-only)
│       ├── 02_analysis.md              # Analysis output
│       ├── 03_questions.md             # Q&A for client
│       ├── 04_client_answers.md        # Client responses (append-only)
│       ├── 05_proposal.md              # Proposal draft
│       ├── 06_scope_freeze.md          # Scope freeze checklist
│       └── 07_decisions.md             # Decision log (append-only)
├── 02-requirements/                    # Requirements phase
│   ├── requirements.md                 # Requirements specification
│   ├── nfr.md                          # Non-functional requirements
│   └── project-plan.md                 # Project plan
├── 04-functions-list.md                # Feature/function list
├── 10-glossary.md                      # Terminology glossary
├── 03-system/                          # System design (split)
│   ├── index.md                        # Navigation
│   ├── system-architecture.md
│   ├── database-design.md
│   ├── external-interface.md
│   ├── non-functional-design.md
│   ├── technology-rationale.md
│   └── crud-matrix.md
├── 05-features/                        # Per-feature specs (split)
│   ├── index.md                        # Feature list
│   ├── sales-management/               # Feature: kebab-case name
│   │   ├── index.md
│   │   ├── basic-design.md
│   │   ├── detail-design.md
│   │   ├── test-spec.md
│   │   ├── screen-design.md
│   │   └── functions-list.md
│   └── inventory-management/
│       └── [same structure]
├── 06-data/                            # Data & migration
│   └── migration-design.md
├── 07-operations/                      # Operations
│   └── operation-design.md
├── 08-test/                            # Test specs
│   ├── index.md
│   ├── test-plan.md
│   ├── ut-spec.md
│   ├── it-spec.md
│   ├── st-spec.md
│   ├── uat-spec.md
│   └── traceability-matrix.md
├── 09-ui/                              # UI/screen design
│   └── [screen mockups]
└── _index.yaml                         # Manifest (metadata for split docs)
```

## Key Features

### 1. Document Generation

**Tool:** `generate_document`

Generate a specification document given:
- Document type (requirements, functions-list, basic-design, detail-design, test-plan, ut-spec, etc.)
- Input content (RFP or upstream document)
- Project name and language

Output includes:
- Template with YAML metadata
- AI generation instructions (for Claude)
- Suggested output path (based on doc type & scope)

### 2. Template System

**Location:** `sekkei/templates/`

Templates available in multiple languages:
- `ja/` — Japanese templates (primary) — 16 document types including new test-evidence, meeting-minutes, decision-record, interface-spec, screen-design
- `en/` — English templates (optional)
- `shared/` — language-neutral templates (covers, indices, glossaries)

Templates use YAML frontmatter:
```yaml
---
doc_type: basic-design
version: "1.0"
language: ja
sections:
  - system-architecture
  - database-design
  - external-interface
  - non-functional-design
  - technology-rationale
---
```

**Override Support:** Companies can override default templates via `SEKKEI_TEMPLATE_OVERRIDE_DIR` env var.

### 3. Document Validation

**Tool:** `validate_document`

Three validation modes:

**Content Validation:**
- Check all required sections present
- Extract cross-reference IDs (F-xxx, REQ-xxx, etc.)
- Validate table structure (CRUD matrix, traceability)
- Compare with upstream document for missing references

**Manifest Validation:**
- Read `_index.yaml` (manifest file)
- Verify all referenced files exist on disk
- Validate each file independently
- Check aggregate structure

**Structure Validation:**
- Verify numbered directory layout (01-, 02-, etc.)
- Check required files exist (04-functions-list.md, 10-glossary.md)
- Check required directories exist (02-requirements/, 03-system/, 05-features/, 06-data/, 07-operations/, 08-test/, 09-ui/)
- Verify feature folders use kebab-case
- Reject version suffixes (old, copy, v1) and non-ASCII filenames

### 4. Chain Status Tracking

**Tool:** `get_chain_status`

Reads `sekkei.config.yaml` and returns:
- Progress table for all documents in chain
- RFP status (provided vs. missing)
- Feature-by-feature status (basic-design, detail-design, test-spec)
- Output paths for each document

### 5. Export to Excel / PDF

**Tool:** `export_document`

- Merges split document files in correct order
- Exports to Excel (openpyxl) or PDF (WeasyPrint)
- Preserves table structure and cross-references
- Supports batch export (all documents in chain)

### 6. Translation

**Tool:** `translate_document`

- Translate document from JP to EN or VI
- Preserve ID patterns, table structure, and formatting
- Create separate translation manifest

### 7. Glossary Management

**Tool:** `manage_glossary`

- Add/update/delete glossary entries
- Export glossary to Markdown
- Validate glossary references in specs

### 8. Update Analysis

**Tool:** `analyze_update`

- Diff two spec versions
- Identify breaking changes
- Impact analysis (which docs affected)
- Generate changelog entries

### 9. Presales RFP Lifecycle Management (NEW v1.1.1)

**New Skill Command:** `/sekkei:rfp` — Unified RFP management with state machine

**RFP State Workflow:**
1. **RFP_RECEIVED** — Initial RFP intake, auto-parse requirements
2. **REQUIREMENTS_ANALYSIS** — Extract key requirements, validate completeness
3. **SCOPE_DEFINITION** — Define project scope, features, constraints
4. **BUDGET_ESTIMATION** — Calculate effort, estimate costs, timeline
5. **PROPOSAL_DRAFT** — Generate presales proposal document
6. **SCOPE_FREEZE** — Lock scope, prepare for development handoff

**Features:**
- RFP parsing with structured extraction (requirements, scope, constraints)
- Automatic impact analysis: scope changes → budget updates
- Proposal document generation with cost/timeline breakdown
- Handoff to development pipeline (creates sekkei.config.yaml)
- Audit trail: track all RFP state changes with timestamps

### 10. SIer Psychology-Driven Features (Phase A+)

**Trust Architecture:**
- **AI Confidence Scoring** — per-section confidence levels (high/medium/low) enable focused reviewer effort
- **Source Traceability** — statements link to upstream document IDs (e.g., "based on REQ-003")
- **Approval Watermark** — two states: `AI下書き` → `承認済み` for sign-off workflows
- **朱書き Diff View** — color-coded revision diffs showing exact changes during regeneration
- **generate_document enhancements:**
  - `include_confidence` param — adds confidence scores to output
  - `include_traceability` param — adds upstream source citations
  - `ticket_ids` param — links to change request tracking

**Specification Change Impact Analysis:**
- **New Tool:** `simulate_change_impact` — impact graph showing cascade effects before commit
- **New Tool:** `import_document` — reverse import: migrate existing Excel/Markdown specs into Sekkei
- **export_document enhancement:** `read_only` param — strips internal metadata for client exports
- **Configuration additions:**
  - `approval_chain` — define approval workflows per document type
  - `ui_mode` — "simple" (familiar Excel-like) or "power" (markdown + automation)
  - `learning_mode` — annotate docs with explanations of standards

### 11. Five New Document Types (SIer Workflow Support)

**Evidence & Traceability:**
1. **test-evidence** (EV-xxx) — テストエビデンス from test execution. Links to test-spec cases.
2. **meeting-minutes** (MTG-xxx) — 議事録 (meeting minutes) for decisions during development. Auto-links decisions to docs.

**Enterprise Integration:**
3. **decision-record** (ADR-xxx) — Architecture Decision Records. Captures "why" decisions were made (combats 属人化).
4. **interface-spec** (IF-xxx) — インターフェース仕様書 for multi-vendor coordination. Auto-generates from API definitions.
5. **screen-design** (PG-xxx) — 画面設計書 mockups. Reduces Excel方眼紙 formatting time.

**New ID Prefixes:** EV, MTG, ADR, IF, PG (in addition to F, REQ, NFR, SCR, TBL, API, CLS, DD, TS, UT, IT, ST, UAT, OP, MIG)

### 12. Lifecycle Management (CLI Commands)

**New with lifecycle commands:**
- `sekkei version` — Show Sekkei version + environment health check (`--json` flag)
- `sekkei uninstall` — Remove skill, commands, MCP from Claude Code (`--force` to skip confirmation)
- `sekkei update` — Rebuild server, reinstall skill, regenerate stubs, update MCP entry (`--skip-build` to skip compile)

**Project Initialization:**
- `npx sekkei init` — Interactive setup wizard with auto-dependency installation
  - Prompts for project details, tech stack, output directory
  - Generates `sekkei.config.yaml`
  - Auto-installs Python venv, Playwright, Playwright chromium
  - Supports `--skip-deps` to skip dependency installation

## Architecture

### MCP Server (@bienhoang/sekkei-mcp-server)

Sekkei is an **MCP (Model Context Protocol) server** using STDIO transport:
- **Stdin:** JSON-RPC 2.0 requests from client
- **Stdout:** JSON-RPC 2.0 responses only (reserved)
- **Stderr:** Logging via Pino
- **Distribution:** GitHub Packages (npm.pkg.github.com, restricted access via @bienhoang scope)

Implements 15 MCP tools: 8 core (generate, validate, export, chain-status, get-template, translate, glossary, analyze-update) + 3 Phase A (simulate-change-impact, import-document, validate-chain) + 1 RFP (manage-rfp-workspace) + 2 CR/Plan (manage-change-request, manage-plan, update-chain-status).

### Data Layer

**Project Config** (`sekkei.config.yaml`):
```yaml
project:
  name: "販売管理システム"
  type: web
  stack: [TypeScript, React, Node.js]
  team_size: 5
  language: ja
  keigo: 丁寧語

output:
  directory: ./output

chain:
  rfp: rfp.md
  functions_list: { status: pending }
  requirements: { status: pending }
  basic_design: { status: pending, system_output: "03-system/", features_output: "05-features/" }
  # ... etc

features:
  - id: SAL
    name: sales-management
    display: "販売管理"
  - id: INV
    name: inventory-management
    display: "在庫管理"
```

**Manifest** (`_index.yaml`):
Tracks split document structure (shared sections + per-feature files).

### Python Bridge

Exports via Python CLI (openpyxl, WeasyPrint):
- `export-excel` — Excel workbook generation
- `export-pdf` — PDF generation
- `export-docx` — Word document generation
- `export-matrix` — Matrix export (CRUD, traceability)
- `glossary` — Glossary extraction
- `diff` — Version comparison
- `import-excel` — Excel → markdown import

## Requirements

### Functional Requirements

| ID | Requirement | Status |
|---|---|---|
| FR-001 | Generate specification documents from RFP | ✅ Complete |
| FR-002 | Support V-model document chain | ✅ Complete |
| FR-003 | Validate document completeness & structure | ✅ Complete |
| FR-004 | Track cross-reference IDs across documents | ✅ Complete |
| FR-005 | Split large docs (basic-design, detail-design, test-spec) | ✅ Complete |
| FR-006 | Support per-feature specification sections | ✅ Complete |
| FR-007 | Export to Excel and PDF | ✅ Complete |
| FR-008 | Translate specifications to EN / VI | ✅ Complete |
| FR-009 | Manage glossary entries | ✅ Complete |
| FR-010 | Track document chain progress | ✅ Complete |
| FR-011 | Validate numbered directory structure | ✅ Complete (v2) |
| FR-012 | Support template overrides | ✅ Complete |
| FR-013 | Generate code-aware specifications from source | ✅ Complete (v3) |
| FR-014 | Detect specification staleness vs codebase | ✅ Complete (v3) |
| FR-015 | Validate structural anti-chaos rules | ✅ Complete (v3) |
| FR-016 | Export specifications to Google Sheets | ✅ Complete (v3) |
| FR-017 | Monitor specification drift via CLI watch | ✅ Complete (v3) |
| FR-018 | Generate test-evidence documents with traceability | ✅ Complete (Phase A) |
| FR-019 | Support meeting-minutes (議事録) document type | ✅ Complete (Phase A) |
| FR-020 | Generate architecture decision records (ADR) | ✅ Complete (Phase A) |
| FR-021 | Support interface specification (IF) documents | ✅ Complete (Phase A) |
| FR-022 | Generate screen design (PG) mockups | ✅ Complete (Phase A) |
| FR-023 | Simulate specification change impact cascade | ✅ Complete (Phase A) |
| FR-024 | Import existing Excel/Markdown specs into Sekkei | ✅ Complete (Phase A) |
| FR-025 | Extract and display AI confidence scores per section | ✅ Complete (Phase A) |
| FR-026 | Generate source traceability citations in documents | ✅ Complete (Phase A) |
| FR-027 | Support approval workflow with human sign-off | ✅ Complete (Phase A) |
| FR-028 | RFP presales lifecycle management with state machine | ✅ Complete (v1.1.1) |
| FR-029 | Auto-extract requirements and scope from RFP | ✅ Complete (v1.1.1) |
| FR-030 | Generate presales proposal with budget/timeline | ✅ Complete (v1.1.1) |

### Non-Functional Requirements

| ID | Requirement | Acceptance Criteria |
|---|---|---|
| NFR-001 | Performance | Generate doc in < 30 seconds (AI call excluded) |
| NFR-002 | Security | No shell injection (execFile, not exec); path validation |
| NFR-003 | Reliability | All errors use SekkeiError; graceful failures |
| NFR-004 | Scalability | Config max 100KB; manifest max 50KB; content max 500KB |
| NFR-005 | Maintainability | 100% TypeScript; strict type checking; ESM modules |
| NFR-006 | Usability | Clear error messages; MCP help text via `.describe()` |
| NFR-007 | Logging | Structured logs to stderr; Pino logger; configurable levels |
| NFR-008 | Testing | Unit & integration tests; Jest with ESM; coverage tracking |

## Project Structure (Monorepo — Turborepo + Changesets)

```
sekkei/
├── .github/workflows/
│   ├── ci.yml                  # Lint → Build → Test (turbo cache)
│   └── release.yml             # Changesets: version PR + publish to GitHub Packages
├── .changeset/
│   └── config.json             # Changesets config (GitHub Packages)
├── turbo.json                  # Turborepo config (npm@10.7.0)
├── packages/
│   ├── mcp-server/             # @bienhoang/sekkei-mcp-server (93 TS files)
│   │   ├── src/
│   │   │   ├── server.ts       # Main MCP entry, 15 tool registration
│   │   │   ├── lib/            # Core business logic (50 files)
│   │   │   ├── tools/          # MCP tool handlers (19 files)
│   │   │   ├── types/          # Type definitions
│   │   │   └── resources/      # MCP resources (templates, RFP)
│   │   ├── tests/              # Jest tests (22+ files)
│   │   ├── dist/               # Compiled output
│   │   └── package.json
│   ├── preview/                # @bienhoang/sekkei-preview (Express + React + Tiptap)
│   │   ├── src/
│   │   │   ├── App.tsx         # Main React component
│   │   │   ├── components/     # Viewer, Editor, Sidebar (React)
│   │   │   ├── server.ts       # Express server entry
│   │   │   └── cli.ts          # CLI entry
│   │   ├── vite.config.ts      # Vite configuration
│   │   └── package.json
│   ├── skills/                 # @bienhoang/sekkei-skills (Claude Code SKILL.md)
│   │   └── sekkei/
│   │       ├── SKILL.md        # Skill definition (30+ sub-commands)
│   │       ├── content/        # Skill definition files
│   │       └── references/     # 6 reference guides
│   ├── templates/              # Shared templates (ja/ + shared/, 22 + 4 files)
│   │   ├── ja/                 # Japanese templates (22 files)
│   │   ├── shared/             # Language-neutral (4 files)
│   │   ├── rfp/                # RFP instructions (7 files)
│   │   └── glossaries/         # Industry glossaries (15 YAML)
│   └── python/                 # Export layer (Excel/PDF/DOCX, 7 files)
│       ├── cli.py              # Python entry
│       ├── export/
│       ├── nlp/
│       └── requirements.txt
├── plans/                      # Implementation plans + reports
└── docs/                       # Documentation
```

**Distribution:** All 3 packages published to GitHub Packages (`npm.pkg.github.com`) with `@bienhoang` scope. Access is restricted (authentication required).

## Technical Stack

### MCP Server (TypeScript)

- **Runtime:** Node.js (ESM)
- **MCP SDK:** @modelcontextprotocol/sdk
- **Parser:** yaml (YAML), marked (Markdown)
- **Validation:** Zod (schema validation)
- **Logging:** pino (structured logging)
- **Build:** tsc (TypeScript compiler)
- **Test:** Jest + ts-jest (ESM support)

### Python Layer

- **Export:** openpyxl (Excel), WeasyPrint (PDF)
- **NLP:** mistune (Markdown parsing)
- **Config:** pyyaml
- **Templating:** jinja2

### Adapters

- **Cursor:** mcp.json + cursorrules
- **Copilot:** copilot-instructions.md
- **Claude Code:** SKILL.md (Claude Code skill)

## Metrics & Success Criteria

### Delivery Metrics

| Metric | Target | Status | Notes |
|--------|--------|--------|-------|
| Document types | 16 | ✅ Complete | Phase A: +5 SIer doc types (EV, MTG, ADR, IF, PG) |
| Languages | 3 (ja, en, vi) | ✅ Ja complete | en/vi partial |
| MCP tools | 12 | ✅ Complete | Phase A: +3 (simulate-impact, import, validate-chain) + 1 RFP |
| Code analysis | AST-based | ✅ ts-morph | Phase 3 |
| Staleness detection | Git-based | ✅ Score model | Phase 3 |
| Structure validation | 7 anti-chaos rules | ✅ 3 presets | Phase 3 |
| Test coverage | >80% | ✅ 306 tests | Phase 1.1.0 |
| Type safety | 100% strict | ✅ No `any` | TypeScript strict mode |

### Performance Metrics

| Operation | Target | Current |
|-----------|--------|---------|
| Load template | <100ms | ✅ < 50ms |
| Validate doc | <500ms | ✅ < 200ms |
| Read config | <50ms | ✅ < 10ms |
| Export to Excel | <5s (10KB) | ✅ < 2s |

### Adoption Metrics

| Metric | Target | Status |
|--------|--------|--------|
| Spec generation time (manual → tool) | 80% reduction | 🔄 In progress |
| Cross-reference errors | < 2% of docs | 🔄 Tracking |
| User satisfaction | > 4.0/5.0 | 🔄 Feedback pending |

## Roadmap

### Phase 1: Core V-Model (COMPLETE)
- ✅ RFP → Requirements → Functions List
- ✅ Requirements specification (requirements, nfr, project-plan)
- ✅ Basic Design with split support (+ security-design)
- ✅ Detail Design per-feature
- ✅ Test Plan + UT/IT/ST/UAT Spec (5 test doc types)
- ✅ Template system with overrides
- ✅ Cross-reference tracking
- ✅ Validation (content & structure)
- ✅ Export to Excel & PDF

### Phase 2: Enhanced Automation (COMPLETE)
- ✅ Numbered directory structure
- ✅ Structure validation (03-system/, 05-features/ etc.)
- ✅ Manifest-based split doc tracking
- ✅ Per-feature specification index
- ✅ Kebab-case feature folder enforcement
- ✅ Chain status dashboard
- ✅ Keigo level configuration

### Phase 3: Intelligence Layer (COMPLETE)
- ✅ Code-aware document generation via AST analysis (ts-morph)
- ✅ Specification staleness detection (git diff + scoring)
- ✅ Anti-chaos structural rules validation (7 built-in rules, 3 presets)
- ✅ Google Sheets export with formatting
- ✅ CLI watch command for continuous monitoring
- ✅ Handler extraction pattern for code reusability
- ✅ Dynamic imports for optional dependencies (ts-morph, googleapis)

### Phase A: SIer Psychology-Driven Features (COMPLETE)
- ✅ Trust Architecture: confidence scoring, source traceability, approval watermark
- ✅ 5 New Document Types: test-evidence (EV), meeting-minutes (MTG), decision-record (ADR), interface-spec (IF), screen-design (PG)
- ✅ Specification Change Impact Simulation: cascade analyzer for dependency tracking
- ✅ Document Import: reverse migration from Excel/Markdown into Sekkei
- ✅ Enhanced generation parameters: include_confidence, include_traceability, ticket_ids
- ✅ Enhanced export: read_only param for client-safe exports
- ✅ Configuration: approval_chain, ui_mode, learning_mode support
- ✅ Lifecycle commands: version, uninstall, update, health-check
- 🔄 朱書き Diff View (color-coded revisions) — partial, enhanced diff_analyzer.py
- 📅 Digital approval workflows with timestamp tracking (planned Phase B)

### Phase 4: Multilingual & Export (IN PROGRESS)
- 🔄 Full English templates
- 🔄 Vietnamese templates
- ✅ Glossary management
- ✅ Document translation
- 🔄 PDF styling (headers, footers)
- 🔄 Excel template styling

### Phase 5: Advanced Features (PLANNED)
- 📅 Backlog sync (Linear/Jira integration)
- 📅 Approval workflows
- 📅 Real-time collaboration
- 📅 Custom rule engines
- 📅 Screen mockup integration
- 📅 Database schema sync
- 📅 AI model selection (OpenAI, Gemini, etc.)

## Dependencies

### External

| Package | Version | Purpose | Phase |
|---------|---------|---------|-------|
| @modelcontextprotocol/sdk | ^1.0 | MCP protocol | 1 |
| zod | ^3.0 | Schema validation | 1 |
| yaml | ^2.0 | YAML parsing | 1 |
| pino | ^8.0 | Logging | 1 |
| marked | ^13.0 | Markdown parsing | 1 |
| ts-morph | ^21.0 | TypeScript AST parsing | 3 |
| simple-git | ^3.20 | Git operations | 3 |
| googleapis | ^118.0 | Google Sheets API | 3 |
| google-auth-library | ^9.4 | OAuth2/service account auth | 3 |
| openpyxl (Python) | ^3.0 | Excel export | 1 |
| weasyprint (Python) | ^60.0 | PDF export | 1 |

### Internal

- TypeScript strict mode (no `any` allowed)
- ESM modules throughout
- Node.js 18+ (for native fetch support)

## Open Questions & Future Considerations

1. **Multilingual Templates** — Should EN/VI templates be auto-generated from JA via translation, or manually created? Current approach is manual (higher quality).

2. **Version Control** — Should Sekkei integrate with Git for version tracking, or delegate to external tools?

3. **Approval Workflows** — Should there be a sign-off mechanism for specs before export?

4. **Template Inheritance** — Should templates support inheritance/composition to reduce duplication?

5. **Real-time Collaboration** — Should multiple users be able to edit specs simultaneously (requires backend)?

6. **AI Model Selection** — Currently uses Claude; should we support other LLMs (GPT-4, etc.)?

## Conclusion

Sekkei v2.0 with the numbered output structure and structure validation provides a comprehensive, maintainable framework for Japanese software specifications. The V-model chain ensures traceability from RFP through testing, while split documents enable scalability for large projects with many features.

The system is production-ready for:
- Mid-to-large software projects (5-50 person teams)
- Projects requiring detailed Japanese specifications
- Teams following V-model or similar waterfall-style processes
- Organizations needing Excel/PDF spec exports
- Multilingual projects (JP-EN translation support)

