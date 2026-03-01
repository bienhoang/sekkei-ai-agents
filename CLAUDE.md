# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

Monorepo for **Sekkei (設計)** — an AI Documentation Agent that generates Japanese software specification documents following the V-model hierarchy. Core: MCP Server (TypeScript) + Claude Code Skills + dual export engine (native TS + Python fallback).

## Project Layout

- `packages/mcp-server/` — TypeScript MCP server (the main codebase, has its own CLAUDE.md)
- `packages/preview/` — VitePress preview + Milkdown WYSIWYG editor
- `packages/skills/` — Claude Code SKILL.md with 31 sub-commands + reference docs
- `packages/mcp-server/python/` — Python export fallback (Excel via openpyxl, PDF via WeasyPrint, glossary, diff)
- `packages/mcp-server/templates/` — 22 Markdown templates with YAML frontmatter (`ja/` for Japanese)
- `packages/mcp-server/adapters/` — Platform configs for Claude Code, Cursor, Copilot
- `plans/` — Implementation plans and research reports
- `docs/` — User guide (Vietnamese) at `docs/user-guide/`

## Build & Test

```bash
# From repo root (npm workspaces)
npm run build           # Build all packages
npm test                # Run tests (mcp-server only)

# From packages/mcp-server/
npm run build           # tsc compile
npm run lint            # tsc --noEmit (type check)
npm test                # Jest with ESM (--experimental-vm-modules)
npm run test:unit       # Unit tests only
npm run test:integration
# Single test:
node --experimental-vm-modules node_modules/.bin/jest --config jest.config.cjs tests/unit/validator.test.ts
```

## Architecture

### Chain-of-Documents (V-Model)

```
RFP → requirements (要件定義書) → { functions-list (機能一覧), nfr, project-plan } → basic-design (基本設計書)
  → { security-design, detail-design (詳細設計書) } → test-plan + ut-spec/it-spec/st-spec/uat-spec (テスト仕様書)
```

Each document's output becomes the next document's input. Cross-reference IDs (F-xxx, REQ-xxx, SCR-xxx, TBL-xxx, API-xxx, CLS-xxx, UT/IT/ST/UAT-xxx) link documents together.

### MCP Server (TypeScript)

STDIO transport — **stdout is reserved for JSON-RPC only; all logs go to stderr (fd 2) via pino**. 15 MCP tools registered in `tools/index.ts`: `generate_document`, `get_template`, `validate_document`, `chain_status`, `export_document`, `translate_document`, `manage_glossary`, `analyze_update`, `validate_chain`, `simulate_change_impact`, `import_document`, `manage_rfp_workspace`, `manage_change_request`, `update_chain_status`, `manage_plan`.

### Dual Export Engine

Controlled by `SEKKEI_EXPORT_ENGINE` env var (default: `"node"`):
- **Node (default)**: Native TypeScript exporters — `lib/excel-exporter.ts` (ExcelJS), `lib/pdf-exporter.ts` (Playwright), `lib/docx-exporter.ts` (docx package)
- **Python (fallback)**: `lib/python-bridge.ts` calls `python/cli.py` via `execFile` (not `exec`). Input passed as JSON in `SEKKEI_INPUT` env var. 7 whitelisted actions: `export-excel`, `export-pdf`, `export-docx`, `export-matrix`, `glossary`, `diff`, `import-excel`.

### Template System

Templates at `templates/{lang}/{doc-type}.md` (relative to `packages/mcp-server/`) with YAML frontmatter. 22 Japanese templates. Override support via `SEKKEI_TEMPLATE_OVERRIDE_DIR` env var with path containment validation. Resolution: override dir → default fallback (via `lib/template-resolver.ts`).

### Key Subsystems

- **Change Requests** (`tools/change-request.ts`, `tools/cr-actions.ts`, `lib/cr-state-machine.ts`, `lib/cr-propagation.ts`) — track and propagate specification changes across the document chain
- **Plan Management** (`tools/plan.ts`, `tools/plan-actions.ts`, `lib/plan-state.ts`) — orchestrate multi-phase document generation
- **Staleness Detection** (`lib/staleness-detector.ts`, `lib/doc-staleness.ts`) — detect when downstream docs are outdated relative to upstream changes
- **Translation Pipeline** (`tools/translate.ts`, `lib/translation-validator.ts`, `lib/translation-tracker.ts`) — bidirectional glossary mapping (ja↔en↔vi), post-translation structural validation (ID preservation, table rows, heading count), and SHA-256 hash-based incremental tracking for delta-only retranslation
- **Mockup System** — replaced by AI-gen-HTML via `/sekkei:mockup` skill command; 9 shell CSS files at `templates/wireframe/*-shell.css` (admin, auth, error, onboarding, public, email, print, blank, mobile)
- **Code Analysis** (`lib/code-analyzer.ts`, `lib/code-context-formatter.ts`) — analyze source code for detail-design generation

### Cross-Platform

Adapters in `packages/mcp-server/adapters/` for Cursor (mcp.json + cursorrules), Copilot (copilot-instructions.md), and Claude Code (SKILL.md). Setup script: `bin/setup.js`.

## Key Conventions

- All MCP tool inputs use Zod schemas with enums to constrain values
- `SekkeiError` with typed codes (18 codes in `lib/errors.ts`) — `toClientMessage()` for client-safe output
- ESM throughout — import paths use `.js` extensions
- Tests use `ts-jest/presets/default-esm` — requires `--experimental-vm-modules`
- Tests access tool handlers via `(server as any)._registeredTools[name].handler(args, {})`
- `dirname(fileURLToPath(import.meta.url))` for `__dirname` in ESM test files
- Logger (pino) writes to fd 2 only — never `console.log` in server code

## Config

- `sekkei.config.yaml` — per-project config (chain status, output dir, keigo level)
- `sekkei.config.example.yaml` — template for new projects
- Environment variables (in `src/config.ts`):
  - `SEKKEI_TEMPLATE_DIR` — template directory (default: `../templates` relative to dist)
  - `SEKKEI_TEMPLATE_OVERRIDE_DIR` — company-specific template overrides
  - `SEKKEI_EXPORT_ENGINE` — `"node"` (default) or `"python"`
  - `SEKKEI_PYTHON` — Python executable path (default: `.venv/bin/python3`)
  - `LOG_LEVEL` — pino log level
