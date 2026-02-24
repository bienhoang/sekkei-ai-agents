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
- Understand: Component interactions, data flows, design patterns

**Developers (New & Existing)**
- Start with: [`code-standards.md`](./code-standards.md)
- Then read: [`codebase-summary.md`](./codebase-summary.md)
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
- Numbered output structure rules (01-overview through 10-glossary)
- 9 MCP tools and their responsibilities (v1-2) + Phase 3 extensions
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
**Purpose:** Development conventions and implementation guidelines

**Includes:**
- TypeScript file organization (kebab-case, src/ structure)
- ESM import conventions (.js extensions)
- Naming conventions (camelCase, UPPER_SNAKE_CASE, PascalCase, kebab-case)
- **Phase 3 patterns:** Handler extraction (MCP tools + CLI), dynamic imports (optional deps), config extensions, git argument validation
- Error handling with SekkeiError (typed codes, safe client output, +5 v3 codes)
- Logging standards (Pino, structured logs to stderr only)
- Zod schema validation patterns
- Document type constants and enums
- Manifest structure and feature configuration
- Output path resolution rules
- Cross-reference ID patterns by document type
- Testing patterns (Jest, tool handler access)
- Code quality, linting, import organization

**Best for:** Writing code, understanding conventions, reviewing pull requests

---

### 3. Project Overview & PDR (`project-overview-pdr.md`)
**Purpose:** Project vision, features, and Product Development Requirements

**Includes:**
- Vision & mission (AI-powered specification automation)
- Core value propositions (V-model chain, traceability, split documents, code-awareness, staleness detection)
- V-model document sequence (RFP → Overview → ... → Glossary)
- Numbered output directory structure
- 9 MCP tools with descriptions + Phase 3 extensions
- **Phase 3 features:** Code-aware generation, staleness detection, anti-chaos rules, Google Sheets export, CLI watch command
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
**Purpose:** Repository structure and implementation inventory

**Includes:**
- Complete repository structure (monorepo organization)
- File tree with descriptions (107+ files, v3 additions)
- **Phase 3 modules:** code-analyzer (225 LOC), staleness-detector (241 LOC), structure-rules (271 LOC), google-sheets-exporter (186 LOC)
- Key TypeScript modules (manifest-manager, validator, resolver, etc.)
- CLI commands including new `watch` command
- Python files (exporters, NLP utilities)
- Template files (ja/ templates, shared templates, glossaries)
- Type system (DocType, ProjectConfig with v3 extensions, CodeContext, StalenessReport, etc.)
- Data flows (generation, validation with 4 modes, export)
- Configuration structure (sekkei.config.yaml + v3 optional sections)
- Build & test commands
- Dependencies (TypeScript & Python packages, +4 Phase 3 packages)
- Phase 3 changes (code analysis, git operations, Google Sheets, structure rules)
- Development workflow
- Summary statistics (107+ files, ~32 TS, ~12 Python, 306+ tests passing)

**Best for:** Finding files, understanding module organization, onboarding new developers

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

### MCP Server (TypeScript)
- **Core:** @modelcontextprotocol/sdk, Zod, yaml, pino (logging), TypeScript compiler
- **Test:** Jest with ESM support, ts-node for development
- **Phase 3 Packages:**
  - **ts-morph** (^21.0) — TypeScript AST analysis for code-aware generation
  - **simple-git** (^3.20) — Git operations for staleness detection
  - **googleapis** (^118.0) — Google Sheets API for cloud export
  - **google-auth-library** (^9.4) — OAuth2/service account auth

### Python Layer
- **Export:** openpyxl (Excel), WeasyPrint (PDF), python-docx (Word)
- **NLP:** mistune (Markdown), pyyaml
- **Templating:** jinja2 (optional)

### Templates & Content
- 16 document types (overview, functions-list, requirements, basic/detail design, test-spec, screen-design, CRUD/traceability matrix, operation/migration design, test-evidence, meeting-minutes, decision-record, interface-spec, glossary)
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
| system-architecture.md | Technical design | 600 | 20 KB |
| code-standards.md | Development standards | 801 | 26 KB |
| project-overview-pdr.md | Vision & requirements | 550 | 18 KB |
| codebase-summary.md | Repository structure | 806 | 27 KB |
| README.md (this file) | Navigation guide | — | — |

**Total:** 2,757 lines of documentation

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

**Last Updated:** 2026-02-23 (v1.1.1)
**Documentation Status:** Complete ✅ (Phase A + RFP docs updated)
