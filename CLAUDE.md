# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

Monorepo for **Sekkei (設計)** — an AI Documentation Agent that generates Japanese software specification documents following the V-model hierarchy. The core is an MCP Server (TypeScript) + Claude Code Skills + Python export layer.

## Project Layout

- `sekkei/packages/mcp-server/` — TypeScript MCP server (the main codebase, has its own CLAUDE.md)
- `sekkei/packages/preview/` — VitePress preview + WYSIWYG editor
- `sekkei/packages/mcp-server/python/` — Python export layer (Excel via openpyxl, PDF via WeasyPrint, glossary, diff)
- `sekkei/packages/mcp-server/templates/` — Markdown templates with YAML frontmatter (`ja/` for Japanese)
- `sekkei/skills/sekkei/` — Claude Code SKILL.md with 12 sub-commands
- `plans/` — Implementation plans and research reports
- `plans/reports/` — Research reports (JP doc standards, MCP patterns, export strategies)

## Build & Test (MCP Server)

All commands run from `sekkei/packages/mcp-server/`:

```bash
npm run build        # tsc compile
npm run lint         # tsc --noEmit (type check)
npm test             # Jest with ESM (--experimental-vm-modules)
npm run test:unit    # Unit tests only
# Single test:
node --experimental-vm-modules node_modules/.bin/jest --config jest.config.cjs tests/unit/validator.test.ts
```

## Architecture

### Chain-of-Documents (V-Model)

```
RFP → requirements (要件定義書) → { functions-list (機能一覧), nfr, project-plan } → basic-design (基本設計書)
  → detail-design (詳細設計書) → test-plan + ut-spec/it-spec/st-spec/uat-spec (テスト仕様書)
```

Each document's output becomes the next document's input. Cross-reference IDs (F-xxx, REQ-xxx, SCR-xxx, TBL-xxx, API-xxx, CLS-xxx, UT/IT/ST/UAT-xxx) link documents together.

### MCP Server (TypeScript)

STDIO transport — **stdout is reserved for JSON-RPC only; all logs go to stderr (fd 2)**. 13 MCP tools: `generate_document`, `get_template`, `validate_document`, `get_chain_status`, `export_document`, `translate_document`, `manage_glossary`, `analyze_update`, `validate_chain`, `simulate_change_impact`, `import_document`, `manage_rfp_workspace`, `manage_change_request`.

### TS → Python Bridge

`lib/python-bridge.ts` calls `python/cli.py` via `execFile` (not `exec`). Input passed as JSON in `SEKKEI_INPUT` env var. 7 whitelisted actions: `export-excel`, `export-pdf`, `export-docx`, `export-matrix`, `glossary`, `diff`, `import-excel`.

### Template System

Templates at `sekkei/templates/{lang}/{doc-type}.md` with YAML frontmatter. Override support via `SEKKEI_TEMPLATE_OVERRIDE_DIR` env var with path containment validation.

### Cross-Platform

Adapters in `sekkei/mcp-server/adapters/` for Cursor (mcp.json + cursorrules), Copilot (copilot-instructions.md), and Claude Code (SKILL.md). Setup script: `bin/setup.js`.

## Key Conventions

- All MCP tool inputs use Zod schemas with enums to constrain values
- `SekkeiError` with typed codes — `toClientMessage()` for client-safe output
- ESM throughout — import paths use `.js` extensions
- Python layer requires: `openpyxl`, `weasyprint`, `mistune`, `pyyaml`
- Tests access tool handlers via `(server as any)._registeredTools[name].handler(args, {})`
- `dirname(fileURLToPath(import.meta.url))` for `__dirname` in ESM test files

## Config

- `sekkei.config.yaml` — per-project config (chain status, output dir, keigo level)
- `sekkei.config.example.yaml` — template for new projects
- See `sekkei/mcp-server/CLAUDE.md` for env var reference
