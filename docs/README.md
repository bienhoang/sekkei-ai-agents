# Sekkei Documentation

Welcome to the Sekkei documentation suite. This directory contains comprehensive documentation for the Sekkei AI specification generation system.

## Quick Navigation

### For Different Audiences

**Project Managers & Decision Makers**
- Start with: [`project-overview-pdr.md`](./project-overview-pdr.md)
- Read: Vision, features, roadmap, success criteria

**Software Architects & Technical Leads**
- Start with: [`system-architecture.md`](./system-architecture.md)
- Then read: [`codebase-summary.md`](./codebase-summary.md)
- For details: [`codebase-detail.md`](./codebase-detail.md)
- Understand: Component interactions, data flows, design patterns

**Developers (New & Existing)**
- Start with: [`code-standards.md`](./code-standards.md)
- Then read: [`codebase-summary.md`](./codebase-summary.md)
- For advanced patterns: [`code-practices.md`](./code-practices.md)
- For implementation details: [`codebase-detail.md`](./codebase-detail.md)
- Then dive into: [`system-architecture.md`](./system-architecture.md)

**DevOps & Operations**
- Read: [`system-architecture.md`](./system-architecture.md) - "Deployment Notes" section
- Read: [`codebase-summary.md`](./codebase-summary.md) - "Build & Test" section

## Document Overview

### 1. System Architecture (`system-architecture.md`)
**Purpose:** Technical deep-dive into how Sekkei works

**Includes:**
- Architecture diagrams (MCP server, document chain, output structure)
- V-model document chain with split document support
- Numbered output structure rules (01-rfp through 10-glossary)
- 15 MCP tools and their responsibilities
- Dashboard architecture (5 pages, 7 routes, quality metrics pipeline)
- Phase 3 Intelligence Layer: code-analyzer, staleness-detector, structure-rules, google-sheets-exporter
- CLI commands including new `watch` command for continuous monitoring
- Core libraries (validator, resolver, manifest-manager, python-bridge, etc.)
- Manifest structure for split documents
- Cross-reference ID patterns and validation
- Data flow diagrams for generation, validation, and export
- Security constraints and input limits
- Testing patterns and deployment notes

**Best for:** Understanding the big picture, architecture decisions, data flows

---

### 2. Code Standards (`code-standards.md`)
**Purpose:** Development conventions and core implementation guidelines

**Includes:**
- TypeScript file organization (kebab-case, src/ structure)
- ESM import conventions (.js extensions)
- Naming conventions (camelCase, UPPER_SNAKE_CASE, PascalCase, kebab-case)
- Design patterns (handler extraction, dynamic imports, config extensions, git argument validation)
- Error handling with SekkeiError (typed codes, safe client output)
- Logging standards (Pino, structured logs to stderr only)
- Comments and documentation practices

**See also:** [`code-practices.md`](./code-practices.md) for state machines, schema validation, document types, configuration, testing, and code quality details.

**Best for:** Writing code, understanding conventions, quick reference during development

---

### 3. Project Overview & PDR (`project-overview-pdr.md`)
**Purpose:** Project vision, features, and Product Development Requirements

**Includes:**
- Vision & mission (AI-powered specification automation)
- Core value propositions (V-model chain, traceability, split documents, code-awareness, staleness detection)
- V-model document sequence (RFP → Requirements → ... → Glossary)
- Numbered output directory structure (01-rfp through 10-glossary)
- 15 MCP tools with descriptions (8 core + 3 Phase A + 1 RFP + 3 CR/Plan)
- **Phase 3 features:** Code-aware generation, staleness detection, anti-chaos rules, Google Sheets export, CLI watch command
- **Distribution:** GitHub Packages (@bienhoang scope, restricted access)
- Template system (ja/, en/, shared/ with overrides)
- Validation modes (content, manifest, structure, structure-rules)
- Architecture overview
- 17 functional requirements (FR-001 to FR-017, +5 in Phase 3)
- 8+ non-functional requirements with v3 metrics
- Project structure & tech stack (+4 new Phase 3 packages)
- Metrics & success criteria (306+ tests, code analysis, staleness scoring)
- 5-phase roadmap with Phase 3 complete, Phase 4 in progress
- Dependencies and open questions

**Best for:** Understanding what Sekkei does, project planning, requirements tracking

---

### 4. Codebase Summary (`codebase-summary.md`)
**Purpose:** Repository structure overview and high-level module organization

**Includes:**
- Complete repository structure (Turborepo monorepo organization)
- File tree with descriptions (4 scoped packages: @bienhoang/sekkei-{mcp-server,preview,skills,dashboard})
- **@bienhoang/sekkei-mcp-server:** 93 TypeScript files overview
- **@bienhoang/sekkei-preview:** VitePress + Milkdown (9 TS+Vue files)
- **@bienhoang/sekkei-skills:** Claude Code SKILL.md (44 sub-commands)
- Phase grouping (requirements, design, test, supplementary)
- V-Model chain structure with 57 edges
- Summary statistics

**See also:** [`codebase-detail.md`](./codebase-detail.md) for detailed module documentation, Phase 3 intelligence layers, type system, data flows, configuration, build infrastructure, and recent changes.

**Best for:** Finding files, understanding overall repository organization, onboarding new developers

---

### 5. Codebase Detail (`codebase-detail.md`)
**Purpose:** Detailed module reference and architectural deep-dive

**Includes:**
- Phase 3 Intelligence Layer (code-analyzer, staleness-detector, structure-rules, google-sheets-exporter)
- CLI commands (watch, version, uninstall, update, health-check, migrate)
- Phase 2.1 V-Model Chain Audit Fixes (57 CHAIN_PAIRS, ID system unification, staleness fixes)
- Core TypeScript files (manifest-manager, validator, resolver, python-bridge, etc.)
- Python layer files (exporters, diff analyzer)
- Template system organization
- Type system (DocType, ProjectConfig, FeatureConfig, ManifestFeatureEntry, etc.)
- Data flow diagrams (generation, validation, export pipelines)
- Configuration structure detailed (sekkei.config.yaml, ChainEntry types)
- Build & test infrastructure (Turborepo, Changesets, dependencies)
- Recent changes and Phase A features
- Development & deployment workflow

**Best for:** Detailed implementation reference, understanding module interactions, advanced feature development

---

## Key Concepts

### V-Model Document Chain
Documents are generated sequentially, each building on previous:
```
RFP → Requirements → NFR/Functions List/Project Plan → Basic Design
  → Detail Design → Test Plan → UT/IT/ST/UAT Spec → [Optional] Operations/Migration → Glossary
```

### Numbered Output Structure
Documents are organized with numbered prefixes (01-10) for clarity:
```
01-overview.md              (project overview)
02-requirements.md          (requirements spec)
03-system/                  (system design)
04-functions-list.md        (feature list)
05-features/                (per-feature specs)
  └── sales-management/     (feature folder, kebab-case)
06-data/                    (data/migration)
07-operations/              (operation procedures)
08-test/                    (test specs)
09-ui/                      (screen design)
10-glossary.md              (terminology)
```

### Split Documents
Large documents are split into:
- **Shared sections** (system-wide architecture, database design)
- **Feature sections** (one per feature in 05-features/)

Tracked via manifest file (`_index.yaml`) with merge order.

### Feature Folders
Features use kebab-case naming:
- ✅ `sales-management`, `inventory-management` (kebab-case)
- ❌ `SalesManagement`, `SALES_MANAGEMENT`, `Sales Management`

### Cross-Reference IDs
Documents link together via ID patterns:
- F-xxx (functions-list)
- REQ-xxx (requirements)
- SCR-xxx, TBL-xxx (basic-design)
- API-xxx, CLS-xxx (detail-design)
- UT/IT/ST/UAT-xxx (test-spec)

### Validation Modes
The validate tool supports 4 modes (Phase 3+):
- **Content**: Check sections, IDs, tables in a single file
- **Manifest**: Validate split documents via _index.yaml
- **Structure**: Check numbered directory layout
- **Structure Rules** (v3): Anti-chaos validation with 7 rules, 3 presets (enterprise/standard/agile)

---

## Technology Stack

### Build & Release
- **Turborepo** — Monorepo orchestration with caching in `.turbo/`
- **Changesets** — Version management for GitHub Packages publish
- **GitHub Actions** — CI/CD: `ci.yml` (PR+push lint→build→test), `release.yml` (auto-version + publish)

### MCP Server (TypeScript)
- **Core:** @modelcontextprotocol/sdk, Zod, yaml, pino (logging), TypeScript compiler
- **Test:** Jest with ESM support, ts-node for development
- **Package:** @bienhoang/sekkei-mcp-server (GitHub Packages)
- **Phase 3 Packages:**
  - **ts-morph** (^21.0) — TypeScript AST analysis for code-aware generation
  - **simple-git** (^3.20) — Git operations for staleness detection
  - **googleapis** (^118.0) — Google Sheets API for cloud export
  - **google-auth-library** (^9.4) — OAuth2/service account auth

### Preview Server (Express + React + Tiptap)
- **Package:** @bienhoang/sekkei-preview (GitHub Packages)
- **Backend:** Express.js server on port 4983 (default)
- **Frontend:** React SPA with Tailwind v4 styling
- **Editor:** Tiptap v3 WYSIWYG editor
- **Features:** Full-text search, Mermaid rendering, live editing
- **CLI Flags:** `--docs`, `--guide`, `--port <number>`, `--no-open`, `--help`

### Python Layer
- **Export:** openpyxl (Excel), WeasyPrint (PDF), python-docx (Word)
- **NLP:** mistune (Markdown), pyyaml
- **Templating:** jinja2 (optional)

### Templates & Content
- 27 document types (requirements, nfr, functions-list, project-plan, architecture/basic/security/detail design, db/report/batch design, test-plan, ut/it/st/uat-spec, test-result-report, CRUD/traceability matrix, operation/migration design, sitemap, test-evidence, meeting-minutes, decision-record, interface-spec, screen-design)
- 15+ industry glossaries (automotive, finance, medical, manufacturing, retail, etc.)
- 3 presets (standard, enterprise, agile) — Phase 3 structure validation
- YAML frontmatter (metadata), Markdown body (content)
- Support for ja/, en/, vi/ languages
- Company template overrides via env var
- **Phase 3:** Feature mapping for staleness, Google Sheets config (optional)

---

## Getting Started

1. **Understand the project:** Read `project-overview-pdr.md` (15 min)
2. **Understand the architecture:** Skim `system-architecture.md` (20 min)
3. **Find the code:** Use `codebase-summary.md` for file locations (5 min)
4. **Write code:** Follow `code-standards.md` for conventions (reference)

---

## Documentation Locations

| File | Purpose | Lines | Size |
|------|---------|-------|------|
| system-architecture.md | Technical design | 600+ | 34 KB |
| code-standards.md | Core development standards | 405 | 12 KB |
| code-practices.md | Advanced practices & patterns | 573 | 16 KB |
| project-overview-pdr.md | Vision & requirements | 550+ | 27 KB |
| codebase-summary.md | Repository overview | 218 | 17 KB |
| codebase-detail.md | Detailed module reference | 794 | 28 KB |
| README.md (this file) | Navigation guide | — | — |

**Total:** 3,140+ lines of documentation (split for maintainability, all files under 800 lines)

---

## Common Questions

**Q: How does the numbered structure work?**
See `system-architecture.md` → "Output Structure (Numbered Format)"

**Q: What files do I need to modify to add a feature?**
See `codebase-summary.md` → "Key Files & Modules"

**Q: How do I validate a specification?**
See `project-overview-pdr.md` → "Key Features" (FR-003)

**Q: What are the naming conventions?**
See `code-standards.md` → "Naming Conventions"

**Q: How is the manifest structured?**
See `code-standards.md` → "Manifest Structure"

**Q: What's the difference between basic-design and detail-design?**
See `system-architecture.md` → "Document Types & Templates"

---

## Contributing

When updating documentation:
1. Verify all code examples against actual implementations
2. Keep line counts under 800 lines per file (split if necessary)
3. Use consistent terminology (see "Key Concepts" above)
4. Update cross-references in this README
5. Add changelog entry with date

---

## Version History

- **v2.8.0** (2026-03-01) — Enhanced Translation & Status Improvements
  - Enhanced translate flow: bidirectional glossary mapping (ja↔en↔vi), post-translation structural validation, SHA-256 incremental tracking
  - `/sekkei:status` shows all 27 doc types with dependency column
  - Auto-create missing chain keys, timeout for staleness git ops
  - Preview editor: fixed table data loss on cells with line breaks
  - Removed `/sekkei:init` and `/sekkei:rebuild` slash commands (CLI `sekkei init` still available)
  - Removed CLI glossary, added shortcuts, hidden paths in health report
- **v2.7.3** (2026-02-28) — MCP Registration Migration
  - Migrated all MCP registration to `claude mcp add-json -s user`
- **v2.7.2** (2026-02-28) — Progressive Generation & Task Tracking
  - Progressive document generation with Claude task tracking for all doc flows
  - Split requirements generation into 4 sequential stages for incremental output
  - Package version summary in doctor/version, build preview/dashboard during install
  - Vietnamese diacritics enforcement in output language instructions
  - MCP tool name mapping to SKILL.md for proper tool discovery
  - Dashboard command stub, CR changelog flow fix, manual edit changelog sync
- **v2.7.1** (2026-02-28) — Windows Support & Bug Fixes
  - Correct PKG_ROOT path in update command
  - Windows install instructions in README and user guide
- **v2.7.0** (2026-02-27) — IPA V-Model Compliance
  - 5 new IPA document types: architecture-design, db-design, report-design, batch-design, test-result-report
  - Review stamps support
  - Updated documentation for IPA compliance
- **v2.6.4** (2026-02-27) — Dashboard Analytics & Quality Metrics
  - NEW: `@bienhoang/sekkei-dashboard` (v0.1.1) — full-stack analytics dashboard
  - 5 quality-scoring libs: coverage-metrics, health-scorer, risk-scorer, batch-validator, nfr-classifier
  - Traceability graph (Recharts + @xyflow/react + dagre), risk/health radars, completion donuts
  - Snapshot system for historical metric tracking
  - Mockup improvements: mobile shell template, multi-layout system (9 templates)
  - Lucide SVG icons replacing emoji across dashboard
  - Architecture optimization: token diet & parallelization
- **v1.1.1** (2026-02-23) — Presales RFP Lifecycle Management
  - New `/sekkei:rfp` command with state machine (RFP_RECEIVED → SCOPE_FREEZE)
  - RFP parsing, requirement extraction, scope definition, budget estimation
  - Presales proposal generation with cost/timeline breakdown
  - Enhanced Phase A libraries: mockup system (4 files, 373 LOC), native glossary (153 LOC), excel-template-filler (168 LOC), font-manager (53 LOC)
  - 11 MCP tools with validate-chain added
  - 8 skills reference guides (SKILL.md + 7 references)
- **v1.1.0** (2026-02-23) — Phase A: SIer Psychology + Lifecycle Commands
  - 5 new document types: test-evidence (EV), meeting-minutes (MTG), decision-record (ADR), interface-spec (IF), screen-design (PG)
  - AI confidence scoring, source traceability, approval workflows
  - Specification change impact simulation, document import (Excel → Sekkei)
  - Lifecycle commands: version, uninstall, update, health-check
- **v1.0** (2026-02-21) — Phase 3: Intelligence Layer
  - Code-aware generation (ts-morph), staleness detection, anti-chaos rules, Google Sheets export
  - CLI watch command
- **v0.9** (2026-02-18) — Phase 2: Numbered structure, split docs
- **v0.1** (2025-11-01) — Phase 1: Core V-model chain

---

**Last Updated:** 2026-03-01 (v2.8.0)
**Documentation Status:** Complete ✅ (Split oversized docs into modular files, all files <800 lines)
