# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run build        # Compile TypeScript (tsc)
npm run dev          # Run with tsx (hot reload)
npm run lint         # Type check only (tsc --noEmit)
npm test             # Run all tests (Jest + ESM)
npm run test:unit    # Unit tests only
# Single test file:
node --experimental-vm-modules node_modules/.bin/jest --config jest.config.cjs tests/unit/validator.test.ts
```

Jest requires `--experimental-vm-modules` flag for ESM support. Tests use `ts-jest/presets/default-esm`. Import paths in test files must use `.js` extensions (ESM convention).

## Architecture

Sekkei is an MCP server that generates Japanese software specification documents (設計書) following the V-model. It uses STDIO transport — **only JSON-RPC may go to stdout; all logging goes to stderr (fd 2) via pino**.

### Data Flow

```
MCP Client (Claude/Cursor/Copilot)
  → STDIO transport
    → McpServer (server.ts)
      → Tools (12 handlers in tools/)
      → Resources (template URIs in resources/)
        → Template Loader (lib/template-loader.ts)
          → Template Resolver (lib/template-resolver.ts) — override dir → default fallback
        → Python Bridge (lib/python-bridge.ts)
          → Python CLI (../../python/cli.py) via execFile with JSON env var
```

### Key Invariants

- **Stdout is sacred**: Logger writes to fd 2 only. Never `console.log` in server code.
- **Python bridge**: TS calls Python via `execFile` (not `exec` — prevents shell injection). Input passed via `SEKKEI_INPUT` env var as JSON. 7 actions whitelisted: `export-excel`, `export-pdf`, `export-docx`, `export-matrix`, `glossary`, `diff`, `import-excel`.
- **Template override**: `resolveTemplatePath()` checks override dir first with path containment validation, falls back to default `templates/{lang}/{doc-type}.md`.
- **Zod schemas on all tool inputs**: Enums constrain `doc_type` and `language` to valid values. All paths validated with regex refinements.
- **SekkeiError**: All errors use typed codes and `toClientMessage()` for client-safe output (no stack traces leaked).

### Document Chain (V-Model)

```
RFP → requirements → nfr/functions-list/project-plan
  → basic-design → security-design/detail-design
  → test-plan → ut-spec/it-spec/st-spec/uat-spec
```

Each document type has: a Markdown template (`templates/ja/`), generation instructions (in `generate.ts`), validation rules (in `validator.ts`), and cross-reference ID patterns (in `id-extractor.ts`).

### Config

Environment variables (see `config.ts`):
- `SEKKEI_TEMPLATE_DIR` — template directory (default: `../../templates` relative to dist)
- `SEKKEI_TEMPLATE_OVERRIDE_DIR` — company-specific template overrides
- `SEKKEI_PYTHON` — Python executable path (default: `.venv/bin/python3`)
- `LOG_LEVEL` — pino log level

### Testing Pattern

Tools are tested by accessing internal handlers: `(server as any)._registeredTools[name].handler(args, {})`. Test tmp files go in `tests/tmp/` and are cleaned up in `afterAll`. Use `dirname(fileURLToPath(import.meta.url))` for `__dirname` equivalent in ESM tests.

### Python Layer

Located at `../../python/` relative to mcp-server. Entry point: `cli.py` dispatches to `export/excel_exporter.py`, `export/pdf_exporter.py`, `nlp/glossary.py`, `nlp/diff_analyzer.py`. Requires `openpyxl`, `weasyprint`, `mistune`, `pyyaml` (see `requirements.txt`).
